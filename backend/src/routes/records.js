const express = require("express");
const { getDataCol, getMetaCol, cleanForDisplay, ACTIVE } = require("../db");

const router = express.Router();

async function getSchema(sessionId) {
  return getMetaCol().findOne({ _session_id: sessionId }, { sort: { uploaded_at: -1 } });
}

function resolveIdField(schema) {
  const idField = schema.id_column || "_row_id";
  const dtypeMap = {};
  schema.columns.forEach((c) => (dtypeMap[c.name] = c.dtype));
  const isNumericId = idField === "_row_id" || ["integer", "float"].includes(dtypeMap[idField]);
  return { idField, isNumericId };
}

function castIdValue(raw, isNumericId) {
  return isNumericId ? Number(raw) : String(raw).trim();
}

// ── GET /api/records/distinct/:column — distinct values for a column ────────
router.get("/distinct/:column", async (req, res) => {
  const values = await getDataCol().distinct(req.params.column, {
    _session_id: req.sessionId,
    ...ACTIVE,
  });
  res.json(values.filter((v) => v !== null).sort());
});

// ── POST /api/records/search — filtered search ──────────────────────────────
// body: { categorical: {col: [vals]}, numeric: {col: [lo, hi]}, text: {col: term}, limit }
router.post("/search", async (req, res) => {
  const { categorical = {}, numeric = {}, text = {}, limit = 200 } = req.body;
  const query = { _session_id: req.sessionId, ...ACTIVE };

  for (const [col, vals] of Object.entries(categorical)) {
    if (Array.isArray(vals) && vals.length) query[col] = { $in: vals };
  }
  for (const [col, range] of Object.entries(numeric)) {
    if (Array.isArray(range) && range.length === 2) {
      query[col] = { $gte: range[0], $lte: range[1] };
    }
  }
  for (const [col, term] of Object.entries(text)) {
    if (term && String(term).trim()) {
      const escaped = String(term).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query[col] = { $regex: escaped, $options: "i" };
    }
  }

  const dataCol = getDataCol();
  const total = await dataCol.countDocuments(query);
  const docs = await dataCol.find(query).limit(Math.min(limit, 1000)).toArray();
  res.json({ total, records: docs.map(cleanForDisplay) });
});

// ── GET /api/records/find?id=... — search by ID ──────────────────────────────
router.get("/find", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات" });
  const { idField, isNumericId } = resolveIdField(schema);
  const queryVal = castIdValue(req.query.id, isNumericId);
  const doc = await getDataCol().findOne({ _session_id: req.sessionId, [idField]: queryVal });
  if (!doc) return res.status(404).json({ error: `مفيش سجل بالـ ${idField} = ${req.query.id}` });
  res.json({ ...cleanForDisplay(doc), _is_deleted: !!doc._deleted });
});

// ── POST /api/records — add a new record ─────────────────────────────────────
router.post("/", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات" });
  const dataCol = getDataCol();
  const idField = schema.id_column;

  const values = { ...req.body };
  schema.columns.forEach((c) => {
    if (c.dtype === "integer" && values[c.name] != null) values[c.name] = parseInt(values[c.name], 10);
    if (c.dtype === "float" && values[c.name] != null) values[c.name] = parseFloat(values[c.name]);
    if (c.dtype === "datetime" && values[c.name] != null) values[c.name] = new Date(values[c.name]);
  });

  if (idField && (await dataCol.findOne({ _session_id: req.sessionId, [idField]: values[idField] }))) {
    return res.status(409).json({ error: `يوجد سجل بالفعل بنفس ${idField} = ${values[idField]}` });
  }

  const last = await dataCol.findOne({ _session_id: req.sessionId }, { sort: { _row_id: -1 } });
  values._row_id = last ? last._row_id + 1 : 1;
  values._session_id = req.sessionId;
  values._created_at = new Date();

  const result = await dataCol.insertOne(values);
  res.status(201).json({ success: true, insertedId: result.insertedId });
});

// ── PUT /api/records/:idValue — edit an existing record ──────────────────────
router.put("/:idValue", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات" });
  const { idField, isNumericId } = resolveIdField(schema);
  const queryVal = castIdValue(req.params.idValue, isNumericId);

  const dataCol = getDataCol();
  const existing = await dataCol.findOne({ _session_id: req.sessionId, [idField]: queryVal });
  if (!existing) return res.status(404).json({ error: "السجل مش موجود" });

  const update = { ...req.body };
  schema.columns.forEach((c) => {
    if (c.dtype === "integer" && update[c.name] != null) update[c.name] = parseInt(update[c.name], 10);
    if (c.dtype === "float" && update[c.name] != null) update[c.name] = parseFloat(update[c.name]);
    if (c.dtype === "datetime" && update[c.name] != null) update[c.name] = new Date(update[c.name]);
  });
  update._updated_at = new Date();

  await dataCol.updateOne({ _id: existing._id }, { $set: update });
  res.json({ success: true });
});

// ── DELETE /api/records/:idValue?type=soft|hard ──────────────────────────────
router.delete("/:idValue", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات" });
  const { idField, isNumericId } = resolveIdField(schema);
  const queryVal = castIdValue(req.params.idValue, isNumericId);
  const type = req.query.type === "hard" ? "hard" : "soft";

  const dataCol = getDataCol();
  const filter = { _session_id: req.sessionId, [idField]: queryVal };
  if (type === "soft") {
    const result = await dataCol.updateOne(filter, {
      $set: { _deleted: true, _deleted_at: new Date() },
    });
    if (!result.modifiedCount) return res.status(404).json({ error: "السجل مش موجود أو اتحذف بالفعل" });
  } else {
    const result = await dataCol.deleteOne(filter);
    if (!result.deletedCount) return res.status(404).json({ error: "السجل مش موجود" });
  }
  res.json({ success: true, type });
});

// ── POST /api/records/:idValue/restore — undo a soft-delete ──────────────────
router.post("/:idValue/restore", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات" });
  const { idField, isNumericId } = resolveIdField(schema);
  const queryVal = castIdValue(req.params.idValue, isNumericId);

  const result = await getDataCol().updateOne(
    { _session_id: req.sessionId, [idField]: queryVal, _deleted: true },
    { $unset: { _deleted: "", _deleted_at: "" }, $set: { _recovered_at: new Date() } }
  );
  if (!result.modifiedCount) return res.status(404).json({ error: "السجل مش موجود أو أصلًا مش متحذوف" });
  res.json({ success: true });
});

// ── POST /api/records/bulk-delete — soft-delete many by numeric condition ───
// body: { column, operator: "lt"|"lte"|"gt"|"gte", value }
router.post("/bulk-delete", async (req, res) => {
  const { column, operator, value } = req.body;
  const opMap = { lt: "$lt", lte: "$lte", gt: "$gt", gte: "$gte" };
  if (!opMap[operator]) return res.status(400).json({ error: "عملية غير صالحة" });

  const query = {
    _session_id: req.sessionId,
    ...ACTIVE,
    [column]: { [opMap[operator]]: Number(value) },
  };
  const dataCol = getDataCol();
  const matchCount = await dataCol.countDocuments(query);
  const result = await dataCol.updateMany(query, {
    $set: { _deleted: true, _deleted_at: new Date() },
  });
  res.json({ matched: matchCount, modified: result.modifiedCount });
});

module.exports = router;

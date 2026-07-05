const express = require("express");
const multer = require("multer");
const { parse } = require("csv-parse/sync");
const { stringify } = require("csv-stringify/sync");
const {
  getDataCol,
  getMetaCol,
  cleanForDisplay,
  ACTIVE,
} = require("../db");
const { inferSchema, schemaColumnNames, rowToDoc } = require("../schemaInference");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ── GET /api/dataset/schema — schema of the most recently uploaded dataset ──
router.get("/schema", async (req, res) => {
  const meta = await getMetaCol().findOne(
    { _session_id: req.sessionId },
    { sort: { uploaded_at: -1 } }
  );
  res.json(meta || null);
});

// ── POST /api/dataset/upload — analyze + import a CSV file ──────────────────
// multipart/form-data, field name "file". Query param clearExisting=true|false
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "لم يتم رفع أي ملف (field name: file)" });

    const clearExisting = req.query.clearExisting !== "false"; // default true
    const csvText = req.file.buffer.toString("utf-8");
    const records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });

    if (!records.length) return res.status(400).json({ error: "الملف فاضي أو غير صالح" });

    const columnNames = Object.keys(records[0]).map((c) => c.trim());
    const schema = inferSchema(records, columnNames);

    const dataCol = getDataCol();
    const metaCol = getMetaCol();
    const sessionId = req.sessionId;

    if (clearExisting) {
      await dataCol.deleteMany({ _session_id: sessionId });
      await metaCol.deleteMany({ _session_id: sessionId });
    }

    await metaCol.insertOne({ ...schema, _session_id: sessionId });

    const docs = records.map((row, i) => {
      const doc = rowToDoc(row, schema.columns);
      doc._row_id = i + 1;
      doc._session_id = sessionId;
      doc._created_at = new Date();
      return doc;
    });

    const BATCH_SIZE = 5000;
    let totalInserted = 0;
    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = docs.slice(i, i + BATCH_SIZE);
      try {
        const result = await dataCol.insertMany(batch, { ordered: false });
        totalInserted += Object.keys(result.insertedIds).length;
      } catch (e) {
        // BulkWriteError — count what did succeed
        totalInserted += e.result?.nInserted || e.insertedCount || 0;
      }
    }

    await dataCol.createIndex(
      { _session_id: 1, _row_id: 1 },
      { name: "idx_session_row_id", unique: true }
    );
    if (schema.id_column) {
      try {
        await dataCol.createIndex(
          { _session_id: 1, [schema.id_column]: 1 },
          { name: "idx_session_natural_id", unique: true }
        );
      } catch (e) {
        /* natural id not actually unique — skip */
      }
    }

    res.json({
      inserted: totalInserted,
      rows_in_file: records.length,
      columns: schema.columns.length,
      id_column: schema.id_column,
      schema,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/dataset/overview — stats + sample doc + indexes ────────────────
router.get("/overview", async (req, res) => {
  const dataCol = getDataCol();
  const metaCol = getMetaCol();
  const sessionId = req.sessionId;
  const schema = await metaCol.findOne({ _session_id: sessionId }, { sort: { uploaded_at: -1 } });
  if (!schema) return res.json({ hasData: false });

  const sessionFilter = { _session_id: sessionId };
  const activeFilter = { ...sessionFilter, ...ACTIVE };
  const total = await dataCol.countDocuments(sessionFilter);
  const active = await dataCol.countDocuments(activeFilter);
  const sampleDoc = await dataCol.findOne(activeFilter);
  const indexes = await dataCol.indexInformation();

  res.json({
    hasData: true,
    schema,
    total_records: total,
    active_records: active,
    deleted_records: total - active,
    sample_doc: sampleDoc ? cleanForDisplay(sampleDoc) : null,
    indexes,
  });
});

// ── GET /api/dataset/export?includeDeleted=true|false — CSV export ──────────
router.get("/export", async (req, res) => {
  const dataCol = getDataCol();
  const metaCol = getMetaCol();
  const sessionId = req.sessionId;
  const schema = await metaCol.findOne({ _session_id: sessionId }, { sort: { uploaded_at: -1 } });
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات لتصديرها" });

  const includeDeleted = req.query.includeDeleted === "true";
  const query = includeDeleted ? { _session_id: sessionId } : { _session_id: sessionId, ...ACTIVE };

  const docs = await dataCol.find(query).toArray();
  const rows = docs.map(cleanForDisplay);

  const orderedCols = schemaColumnNames(schema);
  const extraCols = rows.length
    ? Object.keys(rows[0]).filter((c) => !orderedCols.includes(c))
    : [];
  const columns = [...orderedCols, ...extraCols];

  const csv = stringify(rows, { header: true, columns });
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="dataset_export_${Date.now()}.csv"`
  );
  res.send(csv);
});

// ── DELETE /api/dataset — Danger Zone: wipe the current session's data only ─
router.delete("/", async (req, res) => {
  await getDataCol().deleteMany({ _session_id: req.sessionId });
  await getMetaCol().deleteMany({ _session_id: req.sessionId });
  res.json({ success: true });
});

module.exports = router;

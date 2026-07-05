const express = require("express");
const { getDataCol, getMetaCol, ACTIVE } = require("../db");

const router = express.Router();

async function getSchema(sessionId) {
  return getMetaCol().findOne({ _session_id: sessionId }, { sort: { uploaded_at: -1 } });
}

// ── GET /api/analytics/columns — numeric/categorical column lists ───────────
router.get("/columns", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.json({ numeric: [], categorical: [] });
  res.json({
    numeric: schema.columns.filter((c) => ["integer", "float"].includes(c.dtype)),
    categorical: schema.columns.filter((c) => c.dtype === "categorical"),
  });
});

// ── GET /api/analytics/summary — describe() equivalent for numeric cols ─────
router.get("/summary", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات" });
  const numericCols = schema.columns.filter((c) => ["integer", "float"].includes(c.dtype));
  if (!numericCols.length) return res.json([]);

  const dataCol = getDataCol();
  const results = [];
  for (const c of numericCols) {
    const pipeline = [
      { $match: { _session_id: req.sessionId, ...ACTIVE, [c.name]: { $ne: null } } },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          mean: { $avg: `$${c.name}` },
          min: { $min: `$${c.name}` },
          max: { $max: `$${c.name}` },
          stdDev: { $stdDevPop: `$${c.name}` },
        },
      },
    ];
    const agg = await dataCol.aggregate(pipeline).toArray();
    if (agg.length) {
      const s = agg[0];
      results.push({
        column: c.name,
        count: s.count,
        mean: round2(s.mean),
        std: round2(s.stdDev),
        min: round2(s.min),
        max: round2(s.max),
      });
    }
  }
  res.json(results);
});

// ── GET /api/analytics/group-by?numeric=X&categorical=Y — avg per group ─────
router.get("/group-by", async (req, res) => {
  const { numeric, categorical } = req.query;
  if (!numeric || !categorical) return res.status(400).json({ error: "معطيات ناقصة" });

  const pipeline = [
    { $match: { _session_id: req.sessionId, ...ACTIVE } },
    {
      $group: {
        _id: `$${categorical}`,
        avg_value: { $avg: `$${numeric}` },
        count: { $sum: 1 },
      },
    },
    { $project: { category: "$_id", avg_value: { $round: ["$avg_value", 2] }, count: 1, _id: 0 } },
    { $sort: { avg_value: -1 } },
  ];
  const docs = await getDataCol().aggregate(pipeline).toArray();
  res.json(docs);
});

// ── GET /api/analytics/histogram?column=X&bins=30 ────────────────────────────
router.get("/histogram", async (req, res) => {
  const column = req.query.column;
  const bins = parseInt(req.query.bins || "30", 10);
  if (!column) return res.status(400).json({ error: "معطيات ناقصة" });

  const dataCol = getDataCol();
  const rangeAgg = await dataCol
    .aggregate([
      { $match: { _session_id: req.sessionId, ...ACTIVE, [column]: { $ne: null } } },
      { $group: { _id: null, mn: { $min: `$${column}` }, mx: { $max: `$${column}` } } },
    ])
    .toArray();

  if (!rangeAgg.length || rangeAgg[0].mn == null) return res.json({ buckets: [] });
  let { mn, mx } = rangeAgg[0];
  if (mn === mx) mx = mn + 1;
  const width = (mx - mn) / bins;

  const boundaries = Array.from({ length: bins + 1 }, (_, i) => mn + i * width);
  const pipeline = [
    { $match: { _session_id: req.sessionId, ...ACTIVE, [column]: { $ne: null } } },
    {
      $bucket: {
        groupBy: `$${column}`,
        boundaries,
        default: "other",
        output: { count: { $sum: 1 } },
      },
    },
  ];
  const docs = await dataCol.aggregate(pipeline).toArray();
  res.json({
    min: mn,
    max: mx,
    bucketWidth: width,
    buckets: docs.map((d) => ({ from: d._id, count: d.count })),
  });
});

// ── GET /api/analytics/correlation — Pearson correlation matrix ─────────────
router.get("/correlation", async (req, res) => {
  const schema = await getSchema(req.sessionId);
  if (!schema) return res.status(400).json({ error: "لا توجد بيانات" });
  const numericCols = schema.columns
    .filter((c) => ["integer", "float"].includes(c.dtype))
    .map((c) => c.name);
  if (numericCols.length < 2) return res.json({ columns: [], matrix: [] });

  const projection = {};
  numericCols.forEach((c) => (projection[c] = 1));
  const docs = await getDataCol()
    .find({ _session_id: req.sessionId, ...ACTIVE }, { projection })
    .toArray();

  const matrix = numericCols.map((c1) =>
    numericCols.map((c2) => round2(pearson(docs, c1, c2)))
  );
  res.json({ columns: numericCols, matrix });
});

function pearson(docs, colA, colB) {
  const pairs = docs
    .map((d) => [Number(d[colA]), Number(d[colB])])
    .filter(([a, b]) => !Number.isNaN(a) && !Number.isNaN(b));
  const n = pairs.length;
  if (!n) return 0;
  const meanA = pairs.reduce((s, [a]) => s + a, 0) / n;
  const meanB = pairs.reduce((s, [, b]) => s + b, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (const [a, b] of pairs) {
    num += (a - meanA) * (b - meanB);
    denA += (a - meanA) ** 2;
    denB += (b - meanB) ** 2;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

// ── GET /api/analytics/distribution?column=X — category counts (for pies) ──
router.get("/distribution", async (req, res) => {
  const column = req.query.column;
  if (!column) return res.status(400).json({ error: "معطيات ناقصة" });
  const pipeline = [
    { $match: { _session_id: req.sessionId, ...ACTIVE } },
    { $group: { _id: `$${column}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ];
  const docs = await getDataCol().aggregate(pipeline).toArray();
  res.json(docs.map((d) => ({ category: d._id, count: d.count })));
});

function round2(n) {
  return n == null ? null : Math.round(n * 100) / 100;
}

module.exports = router;

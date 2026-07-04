const { MongoClient } = require("mongodb");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/";
const DB_NAME = process.env.DB_NAME || "educational_analytics";

let client;
let db;

// Collection names — same convention as the original Streamlit app
const DATA_COL = "dataset_records";
const META_COL = "dataset_meta";

// Base filter that excludes soft-deleted records
const ACTIVE = { _deleted: { $ne: true } };

// Internal bookkeeping fields that should never be shown to the client
const INTERNAL_FIELDS = new Set([
  "_id",
  "_row_id",
  "_deleted",
  "_created_at",
  "_updated_at",
  "_deleted_at",
  "_recovered_at",
]);

async function connectDB() {
  if (db) return db;
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);
  console.log(`✅ Connected to MongoDB → ${DB_NAME}`);
  return db;
}

function getDataCol() {
  return db.collection(DATA_COL);
}

function getMetaCol() {
  return db.collection(META_COL);
}

// Strip internal fields before sending a document back to the frontend
function cleanForDisplay(doc) {
  const out = {};
  for (const [k, v] of Object.entries(doc)) {
    if (!INTERNAL_FIELDS.has(k)) out[k] = v;
  }
  return out;
}

module.exports = {
  connectDB,
  getDataCol,
  getMetaCol,
  cleanForDisplay,
  ACTIVE,
  DATA_COL,
  META_COL,
  INTERNAL_FIELDS,
};

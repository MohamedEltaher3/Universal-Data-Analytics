/**
 * Core engine: schema inference + generic import helpers.
 * Works on ANY uploaded CSV — no fixed/hardcoded column names anywhere.
 * This is a direct port of the logic that used to live inside Req3_GUI.py.
 */

function isBlank(v) {
  return v === null || v === undefined || v === "" || (typeof v === "string" && v.trim() === "");
}

function toNumberOrNaN(v) {
  if (isBlank(v)) return NaN;
  const n = Number(v);
  return Number.isNaN(n) ? NaN : n;
}

function looksLikeDate(v) {
  if (isBlank(v)) return false;
  if (!Number.isNaN(Number(v))) return false; // pure numbers aren't dates here
  const t = Date.parse(v);
  return !Number.isNaN(t);
}

/**
 * rows: array of plain objects (already parsed from CSV, string values)
 * columnNames: array of column names in original order
 */
function inferSchema(rows, columnNames) {
  const n = rows.length;
  const columns = [];

  for (const col of columnNames) {
    const values = rows.map((r) => r[col]);
    const nonMissing = values.filter((v) => !isBlank(v));
    const missing = n - nonMissing.length;

    const uniqueSet = new Set(nonMissing);
    const nunique = uniqueSet.size;

    const numericVals = nonMissing.map(toNumberOrNaN);
    const numericCount = numericVals.filter((v) => !Number.isNaN(v)).length;
    const numericRatio = n ? numericCount / n : 0;
    const isNumeric = numericRatio >= 0.9;

    let isDatetime = false;
    if (!isNumeric) {
      const dateCount = nonMissing.filter(looksLikeDate).length;
      isDatetime = n ? dateCount / n >= 0.9 : false;
    }

    let dtype;
    if (isNumeric) {
      const validNums = numericVals.filter((v) => !Number.isNaN(v));
      const isInt = validNums.length > 0 && validNums.every((v) => Number.isInteger(v));
      dtype = isInt ? "integer" : "float";
    } else if (isDatetime) {
      dtype = "datetime";
    } else if (nunique > 0 && nunique <= Math.max(30, Math.floor(n * 0.05)) && nunique < n) {
      dtype = "categorical";
    } else {
      dtype = "text";
    }

    columns.push({ name: String(col), dtype, nunique, missing });
  }

  // Detect a natural ID column: fully-unique values + name hints at "id"
  let idColumn = null;
  const idCandidates = columns.filter(
    (c) => c.nunique === n && n > 0 && /id/i.test(c.name)
  );
  if (idCandidates.length) idColumn = idCandidates[0].name;

  return {
    columns,
    id_column: idColumn,
    row_count: n,
    uploaded_at: new Date(),
  };
}

function schemaColumnNames(schema) {
  return schema.columns.map((c) => c.name);
}

/**
 * Convert one raw CSV row (object of strings) into a MongoDB-safe document
 * based on the inferred dtype of each column.
 */
function rowToDoc(row, columns) {
  const doc = {};
  for (const c of columns) {
    const { name, dtype } = c;
    const val = row[name];
    if (isBlank(val)) {
      doc[name] = null;
    } else if (dtype === "integer") {
      doc[name] = parseInt(val, 10);
    } else if (dtype === "float") {
      doc[name] = parseFloat(val);
    } else if (dtype === "datetime") {
      const t = Date.parse(val);
      doc[name] = Number.isNaN(t) ? String(val) : new Date(t);
    } else {
      doc[name] = String(val).trim();
    }
  }
  return doc;
}

module.exports = { inferSchema, schemaColumnNames, rowToDoc, isBlank };

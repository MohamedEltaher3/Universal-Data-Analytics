import { useState } from "react";
import { apiDelete, apiPost } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { Alert, NoDataset } from "../components/ui";

const TABS = [
  { key: "single", label: "Delete a record" },
  { key: "bulk", label: "Bulk delete by condition" },
  { key: "restore", label: "Restore a record" },
];

export default function DeletePage() {
  const { schema } = useSchema();
  const [tab, setTab] = useState("single");

  if (!schema) return <NoDataset />;
  const idField = schema.id_column || "_row_id";
  const numericCols = schema.columns.filter((c) => ["integer", "float"].includes(c.dtype));

  return (
    <div>
      <div className="page-eyebrow">Records</div>
      <h1 className="page-title">Delete & restore records</h1>
      <div className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "single" && <SingleDelete idField={idField} />}
      {tab === "bulk" && <BulkDelete numericCols={numericCols} />}
      {tab === "restore" && <RestoreRecord idField={idField} />}
    </div>
  );
}

function SingleDelete({ idField }) {
  const [id, setId] = useState("");
  const [type, setType] = useState("soft");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (!id.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      await apiDelete(`/records/${encodeURIComponent(id.trim())}?type=${type}`);
      setResult(id.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <p className="muted" style={{ marginBottom: 14 }}>
        ID column in use: <strong>{idField}</strong>
      </p>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>ID value</label>
        <input type="text" value={id} onChange={(e) => setId(e.target.value)} />
      </div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Delete type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="soft">Soft delete (mark as deleted)</option>
          <option value="hard">Hard delete (permanent)</option>
        </select>
      </div>
      <Alert type="warn">A hard delete cannot be undone.</Alert>
      <button className="btn danger" onClick={handleDelete} disabled={busy}>
        {busy ? "Deleting…" : "Delete record"}
      </button>
      <div style={{ marginTop: 14 }}>
        {error && <Alert type="error">{error}</Alert>}
        {result && <Alert type="success">Record {result} deleted.</Alert>}
      </div>
    </div>
  );
}

function BulkDelete({ numericCols }) {
  const [column, setColumn] = useState(numericCols[0]?.name || "");
  const [operator, setOperator] = useState("lt");
  const [value, setValue] = useState("0");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!numericCols.length) {
    return <div className="panel muted">This dataset has no numeric columns to filter on.</div>;
  }

  async function handleBulkDelete() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await apiPost("/records/bulk-delete", { column, operator, value });
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Numeric column</label>
        <select value={column} onChange={(e) => setColumn(e.target.value)}>
          {numericCols.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Condition</label>
        <select value={operator} onChange={(e) => setOperator(e.target.value)}>
          <option value="lt">Less than (&lt;)</option>
          <option value="lte">Less than or equal (&lt;=)</option>
          <option value="gt">Greater than (&gt;)</option>
          <option value="gte">Greater than or equal (&gt;=)</option>
        </select>
      </div>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>Value</label>
        <input type="number" step="any" value={value} onChange={(e) => setValue(e.target.value)} />
      </div>
      <button className="btn danger" onClick={handleBulkDelete} disabled={busy}>
        {busy ? "Deleting…" : "Soft-delete all matching records"}
      </button>
      <div style={{ marginTop: 14 }}>
        {error && <Alert type="error">{error}</Alert>}
        {result && (
          <Alert type="success">
            Soft-deleted {result.modified.toLocaleString()} of {result.matched.toLocaleString()}{" "}
            matching record(s).
          </Alert>
        )}
      </div>
    </div>
  );
}

function RestoreRecord({ idField }) {
  const [id, setId] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleRestore() {
    if (!id.trim()) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      await apiPost(`/records/${encodeURIComponent(id.trim())}/restore`);
      setResult(id.trim());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <p className="muted" style={{ marginBottom: 14 }}>
        ID column in use: <strong>{idField}</strong>
      </p>
      <div className="field" style={{ maxWidth: 320 }}>
        <label>ID to restore</label>
        <input type="text" value={id} onChange={(e) => setId(e.target.value)} />
      </div>
      <button className="btn secondary" onClick={handleRestore} disabled={busy}>
        {busy ? "Restoring…" : "Restore record"}
      </button>
      <div style={{ marginTop: 14 }}>
        {error && <Alert type="error">{error}</Alert>}
        {result && <Alert type="success">Record {result} restored.</Alert>}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { apiGet } from "../api/client";
import { Metric, NoDataset, Spinner, Alert } from "../components/ui";
import { DTYPE_LABEL } from "../utils/format";

const TYPE_COLORS = {
  integer: "var(--accent)",
  float: "var(--accent)",
  categorical: "var(--amber)",
  datetime: "var(--violet)",
  text: "#9a9d9f",
};

export default function OverviewPage() {
  const [ov, setOv] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/dataset/overview")
      .then(setOv)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <Alert type="error">{error}</Alert>;
  if (!ov) return <Spinner label="Loading overview…" />;
  if (!ov.hasData) return <NoDataset />;

  const cols = ov.schema.columns;
  const counts = {};
  cols.forEach((c) => (counts[c.dtype] = (counts[c.dtype] || 0) + 1));

  return (
    <div>
      <div className="page-eyebrow">Step 02</div>
      <h1 className="page-title">Dataset overview</h1>
      <p className="page-sub">A live snapshot of what's currently stored in MongoDB.</p>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <Metric label="Total records" value={ov.total_records.toLocaleString()} />
        <Metric label="Active records" value={ov.active_records.toLocaleString()} tone="accent" />
        <Metric
          label="Soft-deleted"
          value={ov.deleted_records.toLocaleString()}
          tone={ov.deleted_records ? "danger" : undefined}
        />
        <Metric label="Columns" value={cols.length} tone="amber" />
      </div>

      <div className="panel">
        <h3>Column type distribution</h3>
        <div className="fingerprint">
          {cols.map((c) => (
            <span
              key={c.name}
              style={{ width: `${100 / cols.length}%`, background: TYPE_COLORS[c.dtype] }}
              title={`${c.name}: ${DTYPE_LABEL[c.dtype]}`}
            />
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "var(--text-muted)" }}>
          {Object.entries(counts).map(([dtype, n]) => (
            <span key={dtype}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: TYPE_COLORS[dtype],
                  marginRight: 5,
                }}
              />
              {DTYPE_LABEL[dtype]} · {n}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Columns and inferred types</h3>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Detected type</th>
                <th>Unique values</th>
                <th>Missing</th>
              </tr>
            </thead>
            <tbody>
              {cols.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>
                    <span className={`chip ${c.dtype}`}>{DTYPE_LABEL[c.dtype]}</span>
                  </td>
                  <td>{c.nunique.toLocaleString()}</td>
                  <td>{c.missing.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <h3>Sample document</h3>
        <pre className="code-block">{JSON.stringify(ov.sample_doc, null, 2)}</pre>
      </div>

      <div className="panel">
        <h3>Indexes</h3>
        {Object.entries(ov.indexes).map(([name, info]) => (
          <div className="muted" key={name} style={{ marginBottom: 4 }}>
            <span style={{ fontFamily: "var(--font-mono)" }}>{name}</span> → key:{" "}
            {JSON.stringify(info.key)}
          </div>
        ))}
      </div>
    </div>
  );
}

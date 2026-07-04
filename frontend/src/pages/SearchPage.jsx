import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { Alert, DataTable, NoDataset, Spinner } from "../components/ui";

export default function SearchPage() {
  const { schema } = useSchema();
  const [catOptions, setCatOptions] = useState({});
  const [catSelected, setCatSelected] = useState({});
  const [numRange, setNumRange] = useState({});
  const [textVal, setTextVal] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const numericCols = schema?.columns.filter((c) => ["integer", "float"].includes(c.dtype)) || [];
  const catCols = schema?.columns.filter((c) => c.dtype === "categorical") || [];
  const textCols = schema?.columns.filter((c) => c.dtype === "text") || [];

  useEffect(() => {
    if (!schema) return;
    catCols.forEach((c) => {
      apiGet(`/records/distinct/${encodeURIComponent(c.name)}`).then((vals) =>
        setCatOptions((prev) => ({ ...prev, [c.name]: vals }))
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schema]);

  if (!schema) return <NoDataset />;

  function toggleCatValue(col, value, checked) {
    setCatSelected((prev) => {
      const cur = new Set(prev[col] || []);
      if (checked) cur.add(value);
      else cur.delete(value);
      return { ...prev, [col]: Array.from(cur) };
    });
  }

  async function runSearch() {
    setLoading(true);
    setError(null);
    const categorical = {};
    Object.entries(catSelected).forEach(([col, vals]) => {
      if (vals?.length) categorical[col] = vals;
    });
    const numeric = {};
    Object.entries(numRange).forEach(([col, range]) => {
      if (range && (range.min !== undefined || range.max !== undefined)) {
        numeric[col] = [
          range.min !== undefined && range.min !== "" ? Number(range.min) : -Infinity,
          range.max !== undefined && range.max !== "" ? Number(range.max) : Infinity,
        ];
      }
    });
    const text = {};
    Object.entries(textVal).forEach(([col, v]) => {
      if (v?.trim()) text[col] = v.trim();
    });

    try {
      const data = await apiPost("/records/search", { categorical, numeric, text, limit: 200 });
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-eyebrow">Records</div>
      <h1 className="page-title">Search & filter records</h1>
      <p className="page-sub">
        Combine categorical, numeric range, and text filters across every column of the active
        dataset.
      </p>

      <div className="panel">
        {catCols.length > 0 && (
          <>
            <h3>Categorical columns</h3>
            <div className="grid cols-3" style={{ marginBottom: 20 }}>
              {catCols.map((c) => (
                <div className="field" key={c.name}>
                  <label>{c.name}</label>
                  <div
                    style={{
                      maxHeight: 110,
                      overflowY: "auto",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "var(--radius-sm)",
                      padding: 8,
                    }}
                  >
                    {(catOptions[c.name] || []).map((v) => (
                      <label key={v} style={{ display: "flex", gap: 6, fontSize: 12.5, padding: "2px 0" }}>
                        <input
                          type="checkbox"
                          checked={(catSelected[c.name] || []).includes(v)}
                          onChange={(e) => toggleCatValue(c.name, v, e.target.checked)}
                        />
                        {v}
                      </label>
                    ))}
                    {!(catOptions[c.name] || []).length && (
                      <span className="muted">Loading values…</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {numericCols.length > 0 && (
          <>
            <h3>Numeric columns (min – max)</h3>
            <div className="grid cols-3" style={{ marginBottom: 20 }}>
              {numericCols.map((c) => (
                <div className="field" key={c.name}>
                  <label>{c.name}</label>
                  <div className="field-row">
                    <input
                      type="number"
                      step="any"
                      placeholder="min"
                      value={numRange[c.name]?.min ?? ""}
                      onChange={(e) =>
                        setNumRange((prev) => ({
                          ...prev,
                          [c.name]: { ...prev[c.name], min: e.target.value },
                        }))
                      }
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder="max"
                      value={numRange[c.name]?.max ?? ""}
                      onChange={(e) =>
                        setNumRange((prev) => ({
                          ...prev,
                          [c.name]: { ...prev[c.name], max: e.target.value },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {textCols.length > 0 && (
          <>
            <h3>Text columns (partial match)</h3>
            <div className="grid cols-3" style={{ marginBottom: 8 }}>
              {textCols.map((c) => (
                <div className="field" key={c.name}>
                  <label>{c.name}</label>
                  <input
                    type="text"
                    value={textVal[c.name] || ""}
                    onChange={(e) => setTextVal((prev) => ({ ...prev, [c.name]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <button className="btn" style={{ marginTop: 10 }} onClick={runSearch} disabled={loading}>
          {loading ? "Searching…" : "Run search"}
        </button>
      </div>

      {loading && <Spinner label="Searching…" />}
      {error && <Alert type="error">{error}</Alert>}
      {result && !result.records.length && <Alert type="warn">No matching records found.</Alert>}
      {result && result.records.length > 0 && (
        <>
          <Alert type="success">
            {result.total.toLocaleString()} matching record(s) — showing first{" "}
            {result.records.length.toLocaleString()}
          </Alert>
          <div className="panel">
            <DataTable columns={Object.keys(result.records[0])} rows={result.records} />
          </div>
        </>
      )}
    </div>
  );
}

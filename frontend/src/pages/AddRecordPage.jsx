import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { Alert, FieldInput, NoDataset } from "../components/ui";

export default function AddRecordPage() {
  const { schema, refresh } = useSchema();
  const [values, setValues] = useState({});
  const [catOptions, setCatOptions] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!schema) return;
    schema.columns
      .filter((c) => c.dtype === "categorical")
      .forEach((c) => {
        apiGet(`/records/distinct/${encodeURIComponent(c.name)}`).then((vals) =>
          setCatOptions((prev) => ({ ...prev, [c.name]: vals }))
        );
      });
  }, [schema]);

  if (!schema) return <NoDataset />;

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await apiPost("/records", values);
      setSuccess(true);
      setValues({});
      await refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-eyebrow">Records</div>
      <h1 className="page-title">Add a new record</h1>
      <p className="page-sub">The form below is generated automatically from the dataset's columns.</p>

      <div className="panel">
        <div className="form-grid">
          {schema.columns.map((c) => (
            <div className="field" key={c.name}>
              <label>{c.name}</label>
              <FieldInput
                column={c}
                id={`add_${c.name}`}
                value={values[c.name]}
                onChange={(v) => setValues((prev) => ({ ...prev, [c.name]: v }))}
                options={catOptions[c.name]}
              />
            </div>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 18 }} onClick={handleSubmit} disabled={saving}>
          {saving ? "Adding…" : "Add record"}
        </button>

        <div style={{ marginTop: 14 }}>
          {error && <Alert type="error">{error}</Alert>}
          {success && <Alert type="success">Record added successfully.</Alert>}
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { apiGet, apiPut } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { Alert, FieldInput, NoDataset } from "../components/ui";

export default function EditRecordPage() {
  const { schema } = useSchema();
  const [idValue, setIdValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [values, setValues] = useState(null);
  const [catOptions, setCatOptions] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saved, setSaved] = useState(false);

  if (!schema) return <NoDataset />;
  const idField = schema.id_column || "_row_id";

  async function handleLoad() {
    if (!idValue.trim()) return;
    setLoading(true);
    setLoadError(null);
    setValues(null);
    setSaved(false);
    try {
      const doc = await apiGet(`/records/find?id=${encodeURIComponent(idValue.trim())}`);
      delete doc._is_deleted;
      const initial = {};
      schema.columns.forEach((c) => {
        initial[c.name] =
          c.dtype === "datetime" && doc[c.name] ? String(doc[c.name]).slice(0, 10) : doc[c.name] ?? "";
      });
      setValues(initial);

      schema.columns
        .filter((c) => c.dtype === "categorical")
        .forEach((c) => {
          apiGet(`/records/distinct/${encodeURIComponent(c.name)}`).then((vals) =>
            setCatOptions((prev) => ({ ...prev, [c.name]: vals }))
          );
        });
    } catch (e) {
      setLoadError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      await apiPut(`/records/${encodeURIComponent(idValue.trim())}`, values);
      setSaved(true);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-eyebrow">Records</div>
      <h1 className="page-title">Edit an existing record</h1>
      <p className="page-sub">
        ID column in use: <strong>{idField}</strong>
      </p>

      <div className="panel">
        <div className="field" style={{ maxWidth: 320 }}>
          <label>ID to edit</label>
          <input
            type="text"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          />
        </div>
        <button className="btn secondary" onClick={handleLoad} disabled={loading}>
          {loading ? "Loading…" : "Load record"}
        </button>
      </div>

      {loadError && <Alert type="error">{loadError}</Alert>}

      {values && (
        <div className="panel">
          <h3>
            Editing {idField} = {idValue}
          </h3>
          <div className="form-grid">
            {schema.columns.map((c) => (
              <div className="field" key={c.name}>
                <label>{c.name}</label>
                <FieldInput
                  column={c}
                  id={`edit_${c.name}`}
                  value={values[c.name]}
                  onChange={(v) => setValues((prev) => ({ ...prev, [c.name]: v }))}
                  options={catOptions[c.name]}
                />
              </div>
            ))}
          </div>
          <button className="btn" style={{ marginTop: 18 }} onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
          <div style={{ marginTop: 14 }}>
            {saveError && <Alert type="error">{saveError}</Alert>}
            {saved && <Alert type="success">Changes saved successfully.</Alert>}
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { apiGet } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { Alert, NoDataset } from "../components/ui";
import { formatVal } from "../utils/format";

export default function FindByIdPage() {
  const { schema } = useSchema();
  const [idValue, setIdValue] = useState("");
  const [doc, setDoc] = useState(null);
  const [isDeleted, setIsDeleted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!schema) return <NoDataset />;
  const idField = schema.id_column || "_row_id";

  async function handleFind() {
    if (!idValue.trim()) return;
    setLoading(true);
    setError(null);
    setDoc(null);
    try {
      const data = await apiGet(`/records/find?id=${encodeURIComponent(idValue.trim())}`);
      setIsDeleted(!!data._is_deleted);
      delete data._is_deleted;
      setDoc(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-eyebrow">Records</div>
      <h1 className="page-title">Find a record by ID</h1>
      <p className="page-sub">
        ID column in use: <strong>{idField}</strong>
      </p>

      <div className="panel">
        <div className="field" style={{ maxWidth: 320 }}>
          <label>ID value</label>
          <input
            type="text"
            value={idValue}
            onChange={(e) => setIdValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFind()}
          />
        </div>
        <button className="btn" onClick={handleFind} disabled={loading}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {doc && (
        <>
          <Alert type="success">Record found.</Alert>
          {isDeleted && <Alert type="warn">This record is currently soft-deleted.</Alert>}
          <div className="panel table-wrap">
            <table className="data-table">
              <tbody>
                {Object.entries(doc).map(([k, v]) => (
                  <tr key={k}>
                    <th>{k}</th>
                    <td>{formatVal(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

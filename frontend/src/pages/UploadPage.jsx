import { useRef, useState } from "react";
import { apiUpload } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { Alert, Metric, Spinner } from "../components/ui";

export default function UploadPage() {
  const { schema, refresh } = useSchema();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [clearExisting, setClearExisting] = useState(true);
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  function pickFile(f) {
    if (!f) return;
    setFile(f);
    setStatus("idle");
    setResult(null);
    setError(null);
  }

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setError(null);
    try {
      const stats = await apiUpload("/dataset/upload", file, clearExisting);
      setResult(stats);
      setStatus("done");
      await refresh();
    } catch (e) {
      setError(e.message);
      setStatus("error");
    }
  }

  return (
    <div>
      <div className="page-eyebrow">Step 01</div>
      <h1 className="page-title">Upload a new dataset</h1>
      <p className="page-sub">
        Upload any CSV file — the backend reads every column, infers its type automatically
        (integer, float, categorical, datetime, or text), and indexes it in MongoDB.
      </p>

      {schema && (
        <div className="grid cols-3" style={{ marginBottom: 18 }}>
          <Metric label="Rows in current dataset" value={schema.row_count?.toLocaleString()} />
          <Metric label="Columns" value={schema.columns.length} tone="accent" />
          <Metric
            label="Detected ID column"
            value={schema.id_column || "_row_id (internal)"}
            tone="amber"
          />
        </div>
      )}

      <div className="panel">
        <div
          className={`dropzone${dragging ? " drag" : ""}`}
          onClick={() => inputRef.current.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) pickFile(e.dataTransfer.files[0]);
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            onChange={(e) => pickFile(e.target.files[0])}
          />
          <div className="dropzone-title">Drop a CSV file here, or click to browse</div>
          <div className="dropzone-sub">Only .csv files are supported</div>
        </div>

        {file && (
          <div style={{ marginTop: 16 }}>
            <Alert type="info">
              Selected file: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(1)} KB)
            </Alert>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={clearExisting}
                onChange={(e) => setClearExisting(e.target.checked)}
              />
              Clear existing data before import (fresh import)
            </label>
            <button className="btn" onClick={handleUpload} disabled={status === "uploading"}>
              {status === "uploading" ? "Analyzing…" : "Analyze & import data"}
            </button>

            <div style={{ marginTop: 16 }}>
              {status === "uploading" && <Spinner label="Uploading and analyzing the file…" />}
              {status === "error" && <Alert type="error">{error}</Alert>}
              {status === "done" && result && (
                <>
                  <Alert type="success">Dataset analyzed and imported successfully.</Alert>
                  <div className="grid cols-3">
                    <Metric label="Rows inserted" value={result.inserted.toLocaleString()} />
                    <Metric label="Columns" value={result.columns} tone="accent" />
                    <Metric label="ID column" value={result.id_column || "_row_id"} tone="amber" />
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { exportUrl } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { NoDataset } from "../components/ui";

export default function ExportPage() {
  const { schema } = useSchema();
  const [includeDeleted, setIncludeDeleted] = useState(false);

  if (!schema) return <NoDataset />;

  return (
    <div>
      <div className="page-eyebrow">Data</div>
      <h1 className="page-title">Export the current dataset</h1>
      <p className="page-sub">
        Download an up-to-date CSV snapshot — including any records you've added or edited since
        the original upload.
      </p>

      <div className="panel">
        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={includeDeleted}
            onChange={(e) => setIncludeDeleted(e.target.checked)}
          />
          Include soft-deleted records
        </label>
        <button
          className="btn"
          onClick={() => window.open(exportUrl(includeDeleted), "_blank")}
        >
          Prepare & download CSV
        </button>
      </div>
    </div>
  );
}

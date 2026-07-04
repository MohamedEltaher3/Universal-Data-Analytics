import { formatVal } from "../utils/format";

export function Metric({ label, value, tone }) {
  return (
    <div className="metric">
      <div className="label">{label}</div>
      <div className={`value ${tone || ""}`}>{value}</div>
    </div>
  );
}

export function Alert({ type = "info", children }) {
  return <div className={`alert ${type}`}>{children}</div>;
}

export function EmptyState({ title, body }) {
  return (
    <div className="panel empty-state">
      <div className="glyph">∅</div>
      <h3 style={{ marginBottom: 6 }}>{title}</h3>
      <p className="muted">{body}</p>
    </div>
  );
}

export function NoDataset({ actionLabel = "Go to Upload Data", onAction }) {
  return (
    <EmptyState
      title="No dataset loaded yet"
      body="Upload a CSV file first — the platform will infer column types and index it automatically."
    />
  );
}

export function DataTable({ columns, rows, renderCell }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {columns.map((c) => (
                <td key={c}>{renderCell ? renderCell(row, c) : formatVal(row[c])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function FieldInput({ column, id, value, onChange, options }) {
  const commonProps = {
    id,
    value: value ?? "",
    onChange: (e) => onChange(e.target.value),
  };
  if (column.dtype === "integer" || column.dtype === "float") {
    return <input type="number" step={column.dtype === "integer" ? "1" : "any"} {...commonProps} />;
  }
  if (column.dtype === "categorical") {
    return (
      <select {...commonProps}>
        <option value="">— select —</option>
        {(options || []).map((v) => (
          <option key={v} value={v}>
            {v}
          </option>
        ))}
      </select>
    );
  }
  if (column.dtype === "datetime") {
    return <input type="date" {...commonProps} />;
  }
  return <input type="text" {...commonProps} />;
}

export function Spinner({ label = "Loading…" }) {
  return (
    <div>
      <div className="progress-bar">
        <div />
      </div>
      <p className="muted">{label}</p>
    </div>
  );
}

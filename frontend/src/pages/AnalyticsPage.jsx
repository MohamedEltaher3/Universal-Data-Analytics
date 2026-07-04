import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet } from "../api/client";
import { useSchema } from "../context/SchemaContext";
import { NoDataset, Spinner } from "../components/ui";
import { corrColor } from "../utils/format";

const PIE_COLORS = ["#2f6e6a", "#c07a2e", "#6f63b8", "#b3413a", "#9a9d9f", "#3f8f5c", "#c79ce0", "#7d9ad8"];

export default function AnalyticsPage() {
  const { schema } = useSchema();

  if (!schema) return <NoDataset />;

  const numericCols = schema.columns.filter((c) => ["integer", "float"].includes(c.dtype));
  const catCols = schema.columns.filter((c) => c.dtype === "categorical");

  return (
    <div>
      <div className="page-eyebrow">Insights</div>
      <h1 className="page-title">Analytics dashboard</h1>
      <p className="page-sub">Descriptive statistics, distributions, and correlations computed live from MongoDB aggregation pipelines.</p>

      <SummaryPanel />
      {numericCols.length > 0 && <GroupByPanel numericCols={numericCols} catCols={catCols} />}
      {numericCols.length > 0 && <HistogramPanel numericCols={numericCols} />}
      {numericCols.length >= 2 && <CorrelationPanel />}
      {catCols.length > 0 && <DistributionPanel catCols={catCols} />}
    </div>
  );
}

function SummaryPanel() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet("/analytics/summary").then(setRows).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="panel">
      <h3>Descriptive statistics — numeric columns</h3>
      {error && <p className="muted">{error}</p>}
      {!rows && !error && <Spinner label="Computing statistics…" />}
      {rows && !rows.length && <p className="muted">No numeric columns in this dataset.</p>}
      {rows && rows.length > 0 && (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Column</th>
                <th>Count</th>
                <th>Mean</th>
                <th>Std</th>
                <th>Min</th>
                <th>Max</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.column}>
                  <td>{r.column}</td>
                  <td>{r.count}</td>
                  <td>{r.mean}</td>
                  <td>{r.std}</td>
                  <td>{r.min}</td>
                  <td>{r.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function GroupByPanel({ numericCols, catCols }) {
  const [numeric, setNumeric] = useState(numericCols[0]?.name);
  const [categorical, setCategorical] = useState(catCols[0]?.name);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!numeric || !categorical) return;
    apiGet(`/analytics/group-by?numeric=${encodeURIComponent(numeric)}&categorical=${encodeURIComponent(categorical)}`).then(
      setData
    );
  }, [numeric, categorical]);

  if (!catCols.length) return null;

  return (
    <div className="panel">
      <h3>Average value by category</h3>
      <div className="grid cols-2" style={{ marginBottom: 4 }}>
        <div className="field">
          <label>Numeric column</label>
          <select value={numeric} onChange={(e) => setNumeric(e.target.value)}>
            {numericCols.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Group by (categorical)</label>
          <select value={categorical} onChange={(e) => setCategorical(e.target.value)}>
            {catCols.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="chart-box">
        {!data ? (
          <Spinner label="Loading chart…" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="category" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg_value" fill="var(--amber)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function HistogramPanel({ numericCols }) {
  const [column, setColumn] = useState(numericCols[0]?.name);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!column) return;
    apiGet(`/analytics/histogram?column=${encodeURIComponent(column)}&bins=25`).then((d) =>
      setData(
        d.buckets.map((b) => ({
          from: typeof b.from === "number" ? b.from.toFixed(1) : b.from,
          count: b.count,
        }))
      )
    );
  }, [column]);

  return (
    <div className="panel">
      <h3>Distribution of a numeric column</h3>
      <div className="field" style={{ maxWidth: 280, marginBottom: 4 }}>
        <label>Column</label>
        <select value={column} onChange={(e) => setColumn(e.target.value)}>
          {numericCols.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="chart-box">
        {!data ? (
          <Spinner label="Loading chart…" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="from" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function CorrelationPanel() {
  const [data, setData] = useState(null);

  useEffect(() => {
    apiGet("/analytics/correlation").then(setData);
  }, []);

  return (
    <div className="panel">
      <h3>Correlation matrix — numeric columns</h3>
      {!data ? (
        <Spinner label="Computing correlations…" />
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                {data.columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.matrix.map((row, i) => (
                <tr key={data.columns[i]}>
                  <th>{data.columns[i]}</th>
                  {row.map((v, j) => (
                    <td key={j} style={{ background: corrColor(v) }}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DistributionPanel({ catCols }) {
  const [column, setColumn] = useState(catCols[0]?.name);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!column) return;
    apiGet(`/analytics/distribution?column=${encodeURIComponent(column)}`).then(setData);
  }, [column]);

  return (
    <div className="panel">
      <h3>Distribution of a categorical column</h3>
      <div className="field" style={{ maxWidth: 280, marginBottom: 4 }}>
        <label>Column</label>
        <select value={column} onChange={(e) => setColumn(e.target.value)}>
          {catCols.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="chart-box">
        {!data ? (
          <Spinner label="Loading chart…" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="category" outerRadius={100} label>
                {data.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

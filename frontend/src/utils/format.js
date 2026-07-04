export function formatVal(v) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  return Number(n).toLocaleString();
}

export function corrColor(v) {
  const a = Math.abs(v);
  if (v > 0) return `rgba(47, 110, 106, ${a * 0.55})`;
  return `rgba(179, 65, 58, ${a * 0.55})`;
}

export const DTYPE_LABEL = {
  integer: "Integer",
  float: "Float",
  categorical: "Categorical",
  datetime: "Datetime",
  text: "Text",
};

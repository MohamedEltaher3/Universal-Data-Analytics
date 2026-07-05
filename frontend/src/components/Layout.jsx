import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useSchema } from "../context/SchemaContext";
import { DTYPE_LABEL } from "../utils/format";

const NAV = [
  {
    label: "Data",
    items: [
      { to: "/upload", text: "Upload Dataset" },
      { to: "/overview", text: "Dataset Overview" },
      { to: "/export", text: "Export Dataset" },
    ],
  },
  {
    label: "Records",
    items: [
      { to: "/search", text: "Search & Filter" },
      { to: "/find", text: "Find by ID" },
      { to: "/add", text: "Add Record" },
      { to: "/edit", text: "Edit Record" },
      { to: "/delete", text: "Delete & Restore" },
    ],
  },
  {
    label: "Insights",
    items: [{ to: "/analytics", text: "Analytics Dashboard" }],
  },
];

export default function Layout() {
  const { schema, connected } = useSchema();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="app-shell">
      <button
        className="mobile-menu-btn"
        aria-label="Toggle navigation"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>

      {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

      <aside className={`sidebar${menuOpen ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-mark" />
          <div className="brand-text">
            Datasetter
            <span>Universal Data Analytics</span>
          </div>
        </div>

        {NAV.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-group-label">{group.label}</div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
              >
                <span className="dot" />
                {item.text}
              </NavLink>
            ))}
          </div>
        ))}

        <div className="sidebar-footer">
          <span className={`status-dot${connected ? " ok" : ""}`} />
          {connected ? "API connected" : "API unreachable — check backend on :5000"}
        </div>
      </aside>

      <div className="main-col">
        <header className="topbar">
          <div className="schema-strip">
            {!schema ? (
              <span className="empty">No dataset loaded</span>
            ) : (
              <>
                {schema.columns.slice(0, 10).map((c) => (
                  <span className={`chip ${c.dtype}`} key={c.name} title={DTYPE_LABEL[c.dtype]}>
                    {c.name}
                  </span>
                ))}
                {schema.columns.length > 10 && (
                  <span className="chip text">+{schema.columns.length - 10} more</span>
                )}
              </>
            )}
          </div>
          {schema && (
            <div className="muted" style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
              {schema.row_count?.toLocaleString()} rows · {schema.columns.length} cols
            </div>
          )}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

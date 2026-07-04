# Universal Data Analytics Platform — React Frontend

A professional React 19 + Vite rewrite of the original vanilla-JS frontend. Same backend,
same API, same features — new UI: a fixed sidebar with grouped navigation, a live "schema
fingerprint" strip showing detected column types, and charts built with Recharts instead
of Chart.js.

## Stack

- **React 19** + **React Router 6** (client-side routing)
- **Vite** (dev server + build)
- **Recharts** for the analytics dashboard (bar charts, pie charts)
- Plain CSS with a small design-token system (`src/styles/tokens.css`) — no CSS framework

## Project structure

```
frontend-react/
├── index.html
├── vite.config.js
├── .env.example            # VITE_API_BASE
└── src/
    ├── main.jsx
    ├── App.jsx              # routes
    ├── api/client.js        # fetch wrapper (get/post/put/delete/upload)
    ├── context/SchemaContext.jsx   # shares dataset schema + API status
    ├── components/
    │   ├── Layout.jsx        # sidebar + topbar shell
    │   └── ui.jsx             # Metric, Alert, DataTable, FieldInput, Spinner...
    ├── pages/
    │   ├── UploadPage.jsx
    │   ├── OverviewPage.jsx
    │   ├── SearchPage.jsx
    │   ├── FindByIdPage.jsx
    │   ├── AddRecordPage.jsx
    │   ├── EditRecordPage.jsx
    │   ├── DeletePage.jsx     # single / bulk delete / restore tabs
    │   ├── AnalyticsPage.jsx
    │   └── ExportPage.jsx
    ├── utils/format.js
    └── styles/{tokens,global}.css
```

Every page maps 1:1 to a backend endpoint, exactly like the original app:

| Page | Endpoint |
|---|---|
| Upload Dataset | `POST /api/dataset/upload` |
| Dataset Overview | `GET /api/dataset/overview` |
| Search & Filter | `POST /api/records/search` |
| Find by ID | `GET /api/records/find` |
| Add Record | `POST /api/records` |
| Edit Record | `PUT /api/records/:id` |
| Delete / Bulk delete / Restore | `DELETE /api/records/:id`, `POST /api/records/bulk-delete`, `POST /api/records/:id/restore` |
| Analytics Dashboard | `GET /api/analytics/*` |
| Export Dataset | `GET /api/dataset/export` |

## Running it

### 1) Start the backend (unchanged)

```bash
cd backend
cp .env.example .env
npm install
npm start          # http://localhost:5000
```

### 2) Start the React frontend

```bash
cd frontend-react
cp .env.example .env      # VITE_API_BASE=http://localhost:5000/api
npm install
npm run dev                # http://localhost:5173
```

To build a production bundle: `npm run build` → static files land in `dist/`, deployable
to any static host (Netlify, Vercel, S3, nginx...). Just make sure `VITE_API_BASE` points
at your deployed backend URL when you build.

## Design notes

- **Sidebar** — dark, grouped into *Data*, *Records*, *Insights* — mirrors the app's actual
  workflow instead of one flat list.
- **Schema fingerprint** — the topbar chip strip and the overview page's color-coded bar
  are the same idea: the dataset's inferred column types (integer/float = teal,
  categorical = amber, datetime = violet, text = grey) become a visual signature of the
  file you uploaded.
- Numbers and identifiers use a monospace face (JetBrains Mono) to read like real data;
  headings use Space Grotesk for a technical, structured feel.

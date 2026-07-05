require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/db");

const datasetRoutes = require("./src/routes/dataset");
const recordsRoutes = require("./src/routes/records");
const analyticsRoutes = require("./src/routes/analytics");
const { sessionMiddleware } = require("./src/sessionMiddleware");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/dataset", sessionMiddleware, datasetRoutes);
app.use("/api/records", sessionMiddleware, recordsRoutes);
app.use("/api/analytics", sessionMiddleware, analyticsRoutes);

connectDB()
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 API server running on 0.0.0.0:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectDB } = require("./src/db");

const datasetRoutes = require("./src/routes/dataset");
const recordsRoutes = require("./src/routes/records");
const analyticsRoutes = require("./src/routes/analytics");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/dataset", datasetRoutes);
app.use("/api/records", recordsRoutes);
app.use("/api/analytics", analyticsRoutes);

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  });

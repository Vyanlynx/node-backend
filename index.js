const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const cors = require("cors");
const logger = require("./logger");
const {
  setDynamicConfig,
  getDynamicConfigData,
  returnLogs,
  removeDayOldData,
} = require("./utils/setdynamicConfig");

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, "public");

// Middleware
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(removeDayOldData);
app.use(logger);

// API Routes
app.post("/setData", setDynamicConfig);
app.get("/get", getDynamicConfigData);
app.get("/getLogs", returnLogs);

const MIME_TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

const serveStaticFile = async (req, res, next) => {
  try {
    const filename = req.params.filename || "index.html";
    const filePath = path.join(PUBLIC_DIR, filename);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const data = await fs.readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.status(200).type(contentType).send(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({ error: "File not found" });
    }
    next(err);
  }
};

app.get("/", serveStaticFile);
app.get("/:filename", serveStaticFile);

app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 JSONVault server running on http://localhost:${PORT}`);
  console.log(`📁 Serving static files from: ${PUBLIC_DIR}`);
  console.log(`⏰ Auto-cleanup enabled: Data older than 1 day will be removed`);
});

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

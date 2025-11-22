const fs = require("fs/promises");

const logger = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  const method = req.method.padEnd(6);
  const url = req.url.padEnd(30);
  const userAgent = req.get("User-Agent") || "Unknown";
  const ip = (req.ip || req.connection.remoteAddress || "Unknown").toString();
  const responseTime = Date.now();

  const logEntry = `🌐 | ${method} | ${url} | ${timestamp} | ${ip.padEnd(
    15
  )} | ${userAgent} |\n`;

  fs.appendFile("./logger.txt", logEntry).catch(console.error);

  res.on("finish", async () => {
    const duration = Date.now() - responseTime;
    const statusEmoji = res.statusCode >= 400 ? "❌" : "✅";
    const perfEntry = `${statusEmoji} | ${method} | ${url} | ${res.statusCode} | ${duration}ms |\n`;
    fs.appendFile("./performance.txt", perfEntry).catch(console.error);
  });

  next();
};

module.exports = logger;

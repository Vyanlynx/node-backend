const fs = require("fs/promises");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "dynamicConfig.json");
const ERROR_LOG_PATH = path.join(__dirname, "..", "errorLogger.txt");
const LOGGER_PATH = path.join(__dirname, "..", "logger.txt");

const readConfigFile = async () => {
  try {
    const data = await fs.readFile(CONFIG_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      await writeConfigFile({ mappings: [] });
      return { mappings: [] };
    }
    throw error;
  }
};

const writeConfigFile = async (data) => {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(data, null, 2), "utf8");
};

const logError = async (error) => {
  const timestamp = new Date().toISOString();
  const errorMessage = `[${timestamp}] ${error.stack || error.toString()}\n`;
  try {
    await fs.appendFile(ERROR_LOG_PATH, errorMessage);
  } catch (err) {
    console.error("Failed to write to error log:", err);
  }
};

const setDynamicConfig = async (req, res) => {
  console.log(req.headers["x-forwarded-for"], req.socket.remoteAddress, req.ip);
  try {
    const { key, data: jsonData } = req.body;

    if (!key || typeof key !== "string" || key.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Key is required and must be a non-empty string",
      });
    }

    if (!jsonData) {
      return res.status(400).json({
        success: false,
        message: "Data is required",
      });
    }

    let parsedData;
    try {
      parsedData =
        typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;
    } catch (parseError) {
      return res.status(400).json({
        success: false,
        message: "Invalid JSON data provided",
      });
    }

    const config = await readConfigFile();

    const existingIndex = config.mappings.findIndex(
      (mapping) => mapping.key === key
    );

    const newMapping = {
      key: key.trim(),
      data: parsedData,
      storedDate: new Date().toISOString(),
    };

    if (existingIndex !== -1) {
      config.mappings[existingIndex] = newMapping;
    } else {
      config.mappings.push(newMapping);
    }

    await writeConfigFile(config);
    return res.status(200).json({
      success: true,
      message: "Data saved successfully",
      key: key.trim(),
      accessUrl: `/getData?id=${encodeURIComponent(key.trim())}`,
    });
  } catch (err) {
    await logError(err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while saving data",
    });
  }
};

const getDynamicConfigData = async (req, res, next) => {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string" || id.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Query parameter 'id' is required",
      });
    }

    const config = await readConfigFile();

    const mapping = config.mappings.find((m) => m.key === id.trim());

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: "Data not found. Please check the ID and try again.",
      });
    }

    return res.status(200).json({
      success: true,
      key: mapping.key,
      data: mapping.data,
      storedDate: mapping.storedDate,
    });
  } catch (err) {
    await logError(err);
    return res.status(500).json({
      success: false,
      message: "An error occurred while retrieving data",
    });
  }
};

const returnLogs = async (req, res) => {
  try {
    const data = await fs.readFile(LOGGER_PATH, "utf-8");
    return res.status(200).send(data);
  } catch (err) {
    if (err.code === "ENOENT") {
      return res.status(404).json({
        success: false,
        message: "Log file not found",
      });
    }
    await logError(err);
    return res.status(500).json({
      success: false,
      message: "Error reading log file",
    });
  }
};

const compareDateInDays = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  return diffMs / (1000 * 60 * 60 * 24);
};

const removeDayOldData = async (req, res, next) => {
  try {
    const config = await readConfigFile();

    const filteredMappings = config.mappings.filter(
      (mapping) => compareDateInDays(mapping.storedDate) < 1
    );

    if (filteredMappings.length !== config.mappings.length) {
      await writeConfigFile({ mappings: filteredMappings });
      console.log(
        `Cleaned up ${
          config.mappings.length - filteredMappings.length
        } old entries`
      );
    }

    next();
  } catch (err) {
    await logError(err);
    console.error("Error cleaning up old data:", err.message);
    next();
  }
};

module.exports = {
  setDynamicConfig,
  getDynamicConfigData,
  returnLogs,
  removeDayOldData,
};

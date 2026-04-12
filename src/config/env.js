const fs = require("fs");
const path = require("path");

// Simple zero-dependency .env parser
function loadEnv() {
  try {
    // Resolve .env relative to repository root.
    const envPath = path.resolve(__dirname, "../../.env");
    if (fs.existsSync(envPath)) {
      // Read the file once and split by lines.
      const file = fs.readFileSync(envPath, "utf8");
      file.split("\n").forEach((line) => {
        // Ignore comments and empty lines
        if (!line || line.startsWith("#")) return;

        // Split only on the first '=' and keep the rest as value.
        const [key, ...valueParts] = line.split("=");
        if (key) {
          // Trim spaces so values like " KEY = VALUE " still work.
          process.env[key.trim()] = valueParts.join("=").trim();
        }
      });
      console.log("Environment variables loaded natively.");
    }
  } catch (e) {
    console.error("Failed to load .env natively:", e.message);
  }
}

module.exports = { loadEnv };

import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

let cachedData = [];

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

function maskUsername(username) {
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

function getDateRange() {
  const now = new Date();

  let month = now.getUTCMonth();
  let year = now.getUTCFullYear();

  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0));

  // Get last day of current month
  const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)); // 0th day of next month = last day of current month

  return {
    start_at: start.toISOString().split("T")[0],
    end_at: end.toISOString().split("T")[0],
  };
}


async function fetchAndCacheData() {
  try {
    const { start_at, end_at } = getDateRange();

    const API_URL = `https://services.rainbet.com/v1/external/affiliates?start_at=${start_at}&end_at=${end_at}&key=yJXEBkgryTtlOSo2OrgxjtdgwNNOvScO`;

    const response = await fetch(API_URL);
    const json = await response.json();

    if (!json.affiliates || !Array.isArray(json.affiliates)) {
      throw new Error("Invalid affiliate data");
    }

    const filtered = json.affiliates.filter(a => a.username && a.wagered_amount);
    const sorted = filtered.sort((a, b) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount));
    const top10 = sorted.slice(0, 10);

    if (top10.length >= 2) {
      [top10[0], top10[1]] = [top10[1], top10[0]];
    }

    cachedData = top10.map(entry => ({
      username: maskUsername(entry.username),
      wagered: Math.round(parseFloat(entry.wagered_amount)),
      weightedWager: Math.round(parseFloat(entry.wagered_amount))
    }));

    console.log(`[✅] Leaderboard updated for period ${start_at} → ${end_at}`);
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet data:", err.message);
  }
}

fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000);

app.get("/leaderboard/top14", (req, res) => {
  res.json(cachedData);
});

// Optional self-ping
const SELF_URL = "https://typlerplaysdata.onrender.com/leaderboard/top14";
setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch(err => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

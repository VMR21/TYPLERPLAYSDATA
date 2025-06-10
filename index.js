import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;

const API_URL = "https://services.rainbet.com/v1/external/affiliates?start_at=2025-05-11&end_at=2025-06-10&key=yJXEBkgryTtlOSo2OrgxjtdgwNNOvScO";
const SELF_URL = "https://typlerplaysdata.onrender.com/leaderboard/top14";

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

async function fetchAndCacheData() {
  try {
    const response = await fetch(API_URL);
    const json = await response.json();

    if (!json.affiliates || !Array.isArray(json.affiliates)) {
      throw new Error("Invalid affiliate data");
    }

    // Step 1: Remove TYLERGOAT11
    const filtered = json.affiliates.filter(entry => entry.username !== "TYLERGOAT11");

    // Step 2: Sort and get top 10
    const sorted = filtered.sort((a, b) => parseFloat(b.wagered_amount) - parseFloat(a.wagered_amount));
    const top10 = sorted.slice(0, 10);

    // Step 3: Swap top 2
    if (top10.length >= 2) {
      [top10[0], top10[1]] = [top10[1], top10[0]];
    }

    // Step 4: Take the 10th and remove it
    const removed = top10.pop(); // remove 10th person

    // Step 5: Add $200 to the removed user's wager
    const tylerWagered = parseFloat(removed.wagered_amount) + 600;

    // Step 6: Create TYLERGOAT11 entry
    const tylerEntry = {
      username: "TYLERGOAT11",
      wagered_amount: tylerWagered.toString()
    };

    // Step 7: Final list = top 9 + TYLERGOAT11
    const finalList = [...top10, tylerEntry];

    // Step 8: Mask and store
    cachedData = finalList.map(entry => ({
      username: maskUsername(entry.username),
      wagered: Math.round(parseFloat(entry.wagered_amount)),
      weightedWager: Math.round(parseFloat(entry.wagered_amount))
    }));

    console.log(`[✅] Leaderboard updated — top 2 swapped, TYLERGOAT11 added at bottom`);
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet data:", err.message);
  }
}

fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000);

app.get("/leaderboard/top14", (req, res) => {
  res.json(cachedData);
});

setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch(err => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000);

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

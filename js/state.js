// ── STATE ─────────────────────────────────────────────────
let state = {
  meals: {},
  shop: {},
  mealData: JSON.parse(JSON.stringify(DEFAULT_MEALS)),
  shopData: JSON.parse(JSON.stringify(DEFAULT_SHOP)),
  profileData: null,
  schedaLoadedAt: null
};
let today = new Date().getDay(); today = today===0?6:today-1;
let currentDay = today, timerInt = null, settingsDay = 0;
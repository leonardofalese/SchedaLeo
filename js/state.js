// ── STATE ─────────────────────────────────────────────────
let state = {
  meals: {},
  shop: {},
  mealData: JSON.parse(JSON.stringify(DEFAULT_MEALS)),
  shopData: JSON.parse(JSON.stringify(DEFAULT_SHOP)),
  gymData: JSON.parse(JSON.stringify(DEFAULT_GYM)),
  gymLog: {},
  profileData: null,
  schedaLoadedAt: null,
  weightLog: []   // [{ date: 'YYYY-MM-DD', kg: 75.2 }, ...]
};
let today = new Date().getDay(); today = today===0?6:today-1;
let currentDay = today, timerInt = null, settingsDay = 0, gymDay = 0, schedeGymDay = 0, schedeActiveTab = 'alimentare', homeActiveTab = 'alimenti';
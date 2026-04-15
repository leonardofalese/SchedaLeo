// ── SUPABASE DATA SYNC ────────────────────────────────────
function showSync() {
  document.getElementById('syncDot').classList.add('syncing');
}
function hideSync() {
  document.getElementById('syncDot').classList.remove('syncing');
}

async function loadFromCloud() {
  if (!currentUser) return;
  // Reset state prima di caricare (evita dati residui di sessioni precedenti)
  state = {
    meals: {},
    shop: {},
    mealData: JSON.parse(JSON.stringify(DEFAULT_MEALS)),
    shopData: JSON.parse(JSON.stringify(DEFAULT_SHOP))
  };
  showSync();
  const {data, error} = await sb.from('user_data').select('data').eq('user_id', currentUser.id).single();
  hideSync();
  if (error && error.code !== 'PGRST116') { console.error('Load error:', error); return; }
  if (data?.data) {
    const loaded = data.data;
    if (loaded.meals) state.meals = loaded.meals;
    if (loaded.shop) state.shop = loaded.shop;
    if (loaded.mealData) {
      state.mealData = loaded.mealData;
      const fixed = {};
      Object.keys(state.mealData.days).forEach(k => { fixed[parseInt(k)] = state.mealData.days[k]; });
      state.mealData.days = fixed;
    }
    if (loaded.shopData) state.shopData = loaded.shopData;
    if (loaded.schedaLoadedAt) state.schedaLoadedAt = loaded.schedaLoadedAt;
    if (loaded.profileData) state.profileData = loaded.profileData;
  }
}

async function saveToCloud() {
  if (!currentUser) return;
  showSync();
  await sb.from('user_data').upsert({
    user_id: currentUser.id,
    data: { meals: state.meals, shop: state.shop, mealData: state.mealData, shopData: state.shopData, schedaLoadedAt: state.schedaLoadedAt, profileData: state.profileData },
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  hideSync();
}

function save() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => saveToCloud(), 1000);
}
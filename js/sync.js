// ── SUPABASE DATA SYNC ────────────────────────────────────
const _LOCAL_KEY = 'scheda_v2';

function _statePayload() {
  return { meals: state.meals, shop: state.shop, mealData: state.mealData, shopData: state.shopData, schedaLoadedAt: state.schedaLoadedAt, profileData: state.profileData, gymData: state.gymData, gymLog: state.gymLog };
}
function saveLocal() {
  try { localStorage.setItem(_LOCAL_KEY, JSON.stringify(_statePayload())); } catch(e) {}
}
function loadLocal() {
  try { return JSON.parse(localStorage.getItem(_LOCAL_KEY) || 'null'); } catch(e) { return null; }
}

function showSync() {
  document.getElementById('syncDot').classList.add('syncing');
}
function hideSync() {
  document.getElementById('syncDot').classList.remove('syncing');
}

function _applyLoaded(loaded) {
  if (!loaded) return;
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
  if (loaded.gymData) {
    state.gymData = loaded.gymData;
    const fixedG = {};
    Object.keys(state.gymData.giorni).forEach(k => { fixedG[parseInt(k)] = state.gymData.giorni[k]; });
    state.gymData.giorni = fixedG;
  }
  if (loaded.gymLog) state.gymLog = loaded.gymLog;
}

async function loadFromCloud() {
  if (!currentUser) return;
  // Reset state prima di caricare (evita dati residui di sessioni precedenti)
  state = {
    meals: {},
    shop: {},
    mealData: JSON.parse(JSON.stringify(DEFAULT_MEALS)),
    shopData: JSON.parse(JSON.stringify(DEFAULT_SHOP)),
    gymData: JSON.parse(JSON.stringify(DEFAULT_GYM)),
    gymLog: {},
    profileData: null,
    schedaLoadedAt: null
  };
  // Carica localStorage subito (nessuna attesa rete)
  const local = loadLocal();
  if (local) _applyLoaded(local);
  // Poi cloud in background — se ha dati più aggiornati, aggiorna
  showSync();
  const {data, error} = await sb.from('user_data').select('data').eq('user_id', currentUser.id).single();
  hideSync();
  if (error && error.code !== 'PGRST116') { console.error('Load error:', error); return; }
  if (data?.data) _applyLoaded(data.data);
}

async function saveToCloud() {
  if (!currentUser) return;
  showSync();
  await sb.from('user_data').upsert({
    user_id: currentUser.id,
    data: _statePayload(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });
  hideSync();
}

function save() {
  saveLocal(); // istantaneo — dati al sicuro subito
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => saveToCloud(), 300); // cloud in background
}
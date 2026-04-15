function switchView(view,btn) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  btn.classList.add('active');
  document.getElementById('mainContent').scrollTop=0;
  document.getElementById('dayNav').style.display = view==='oggi' ? '' : 'none';
  if(timerInt){clearInterval(timerInt);timerInt=null;}
  if(view==='tracker')renderTracker();
  if(view==='spesa'){renderShop();renderShopEditor();}
  if(view==='scheda'){switchSchedeTab(schedeActiveTab);}
  if(view==='oggi'){switchHomeTab(homeActiveTab);}
  if(view==='settings')initSettingsView();
}


function switchHomeTab(tab) {
  homeActiveTab = tab;
  const tabAlim = document.getElementById('homeTabAlim');
  const tabGym  = document.getElementById('homeTabGym');
  const secAlim = document.getElementById('homeAlimenti');
  const secGym  = document.getElementById('homePalestra');
  if (tabAlim) tabAlim.classList.toggle('active', tab === 'alimenti');
  if (tabGym)  tabGym.classList.toggle('active',  tab === 'palestra');
  if (secAlim) secAlim.style.display = tab === 'alimenti' ? '' : 'none';
  if (secGym)  secGym.style.display  = tab === 'palestra' ? '' : 'none';
  if (tab === 'palestra') renderHomePalestra();
}

function switchSchedeTab(tab) {
  schedeActiveTab = tab;
  const tabAlim = document.getElementById('schedeTabAlim');
  const tabGym  = document.getElementById('schedeTabGym');
  const secAlim = document.getElementById('schedeAlimentare');
  const secGym  = document.getElementById('schedePalestra');
  if (tabAlim) tabAlim.classList.toggle('active', tab === 'alimentare');
  if (tabGym)  tabGym.classList.toggle('active',  tab === 'palestra');
  if (secAlim) secAlim.style.display = tab === 'alimentare' ? '' : 'none';
  if (secGym)  secGym.style.display  = tab === 'palestra'   ? '' : 'none';
  if (tab === 'alimentare') { renderSettingsDayTabs(); renderMealEditor(); }
  if (tab === 'palestra')   { renderGymEditorDayTabs(); renderGymEditor(); }
}

// ── FORGOT PASSWORD ───────────────────────────────────────
async function doForgotPassword() {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) return showAuthError('Inserisci la tua email');
  const btn = document.getElementById('forgotBtn');
  btn.disabled = true; btn.textContent = 'Invio...';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  btn.disabled = false; btn.textContent = 'Invia link di recupero';
  if (error) showAuthError('Errore: ' + error.message);
  else showAuthError('✓ Email inviata! Controlla la tua casella e clicca il link.', true);
}

async function doResetPassword() {
  const newPwd = document.getElementById('resetNewPassword').value;
  const confirmPwd = document.getElementById('resetConfirmPassword').value;
  const errEl = document.getElementById('resetError');
  errEl.classList.remove('show');
  if (newPwd.length < 6) { errEl.textContent='Min. 6 caratteri'; errEl.classList.add('show'); return; }
  if (newPwd !== confirmPwd) { errEl.textContent='Le password non coincidono'; errEl.classList.add('show'); return; }
  const { error } = await sb.auth.updateUser({ password: newPwd });
  if (error) { errEl.textContent=error.message; errEl.classList.add('show'); }
  else { showToast('Password aggiornata!'); setTimeout(() => showAuth(), 1500); }
}

// ── WELCOME SCREEN ────────────────────────────────────────

function skipWelcome() {
  document.getElementById('welcomeScreen').classList.add('hidden');
}

function cancelWelcomeImport() {
  importedMealData = null;
  delete _importCache['welcome'];
  document.getElementById('welcomeImportPreview').classList.remove('show');
  document.getElementById('welcomeImportStatus').classList.remove('show');
  document.getElementById('welcomeImportQuestions').style.display = 'none';
  document.getElementById('welcomeImportFile').value = '';
  document.getElementById('welcomeImportDrop').style.display = '';
}


// ── GENERA LISTA SPESA DA SCHEDA ─────────────────────────
function generateShopFromMeals(mealData) {
  const allFoods = {};

  // Unità contabili (non in grammi)
  const COUNT_UNITS = ['pz','fette','fetta','scatolette','scatoletta','busta','buste','pacco','pacchetto','frutto','frutti'];
  // Fattori di conversione in grammi per le unità contabili
  const UNIT_TO_G = { pz:50, frutto:150, frutti:150, fette:50, fetta:50, scatolette:80, scatoletta:80, busta:100, buste:100, pacco:100, pacchetto:100, kg:1000, l:1000, ml:1 };

  function parseQtyStr(qtyStr) {
    if (!qtyStr) return { amount: 0, unit: 'g' };
    const m = qtyStr.match(/^(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l|pz|fette?|scatolett[ae]|bust[ae]|pacco|pacchetto|frutto|frutti)?/i);
    if (!m || !m[1]) return { amount: 0, unit: 'g' };
    return { amount: parseFloat(m[1].replace(',','.')), unit: (m[2]||'g').toLowerCase() };
  }

  function toGrams(amount, unit) {
    return amount * (UNIT_TO_G[unit] !== undefined ? UNIT_TO_G[unit] : 1);
  }

  Object.values(mealData.days).forEach(day => {
    MEAL_KEYS.forEach(k => {
      (day[k] || []).forEach(food => {
        if (!food || food === 'Giorno libero' || food === 'Libero') return;
        const p = parseFood(food);
        const name = p.name.trim();
        if (!name) return;
        const key = name.toLowerCase();
        const { amount, unit } = parseQtyStr(p.qty);
        if (amount === 0) return;

        if (!allFoods[key]) {
          allFoods[key] = { name, totalGrams: 0, countTotal: 0, countUnit: null };
        }

        const isCount = COUNT_UNITS.includes(unit);
        if (isCount && allFoods[key].totalGrams === 0) {
          // Accumula come unità contabile (es. scatolette, buste)
          if (!allFoods[key].countUnit) allFoods[key].countUnit = unit;
          allFoods[key].countTotal += amount;
        } else {
          // Accumula in grammi; se c'erano già unità contabili, convertile
          if (allFoods[key].countTotal > 0) {
            allFoods[key].totalGrams += toGrams(allFoods[key].countTotal, allFoods[key].countUnit);
            allFoods[key].countTotal = 0;
            allFoods[key].countUnit = null;
          }
          allFoods[key].totalGrams += toGrams(amount, unit);
        }
      });
    });
  });

  function formatQty(item) {
    if (item.countTotal > 0) {
      const u = item.countUnit || '';
      const label = (u === 'scatolette' || u === 'scatoletta') ? (item.countTotal === 1 ? 'scatoletta' : 'scatolette')
                  : (u === 'fette' || u === 'fetta')           ? (item.countTotal === 1 ? 'fetta' : 'fette')
                  : (u === 'busta' || u === 'buste')           ? (item.countTotal === 1 ? 'busta' : 'buste')
                  : (u === 'pacco' || u === 'pacchetto')       ? (item.countTotal === 1 ? 'pz' : 'pz')
                  : 'pz';
      return `${item.countTotal} ${label}`;
    }
    if (item.totalGrams === 0) return '';
    if (item.totalGrams >= 1000) {
      const kg = item.totalGrams / 1000;
      return `${parseFloat(kg.toFixed(1))} kg`;
    }
    return `${Math.round(item.totalGrams)}g`;
  }

  // Raggruppa in categorie base
  const proteine = ['tonno','salmone','pollo','manzo','macinato','bistecca','bresaola','uova','uovo','prosciutto','tacchino','merluzzo','sgombro'];
  const carboidrati = ['pasta','riso','pane','avena','farro','orzo','cereali','biscotti','cracker','patate','fette','gallette'];
  const latticini = ['latte','yogurt','greco','grana','parmigiano','mozzarella','ricotta','burro','formaggio'];
  const verdure = ['zucchine','carote','spinaci','insalata','broccoli','pomodori','peperoni','melanzane','cipolla','aglio','verdure','funghi','cavolo','cetrioli','lattuga'];
  const frutta = ['mela','pera','banana','arancia','kiwi','fragole','uva','ananas','mango','frutto','frutti','melone'];

  const cats = {
    'Proteine': [],
    'Carboidrati & Cereali': [],
    'Latticini': [],
    'Verdure & Frutta': [],
    'Condimenti & Altro': []
  };

  Object.values(allFoods).forEach(item => {
    const nameLow = item.name.toLowerCase();
    const entry = { name: item.name, qty: formatQty(item) };
    if (proteine.some(p => nameLow.includes(p)))           cats['Proteine'].push(entry);
    else if (carboidrati.some(p => nameLow.includes(p)))   cats['Carboidrati & Cereali'].push(entry);
    else if (latticini.some(p => nameLow.includes(p)))     cats['Latticini'].push(entry);
    else if (verdure.some(p => nameLow.includes(p)) ||
             frutta.some(p => nameLow.includes(p)))        cats['Verdure & Frutta'].push(entry);
    else                                                    cats['Condimenti & Altro'].push(entry);
  });

  return Object.entries(cats)
    .filter(([,items]) => items.length > 0)
    .map(([cat, items]) => ({ cat, items }));
}

async function confirmWelcomeImport() {
  if (!importedMealData) return;
  const fixed = {};
  Object.keys(importedMealData.days).forEach(k => { fixed[parseInt(k)] = importedMealData.days[k]; });
  state.mealData.days = fixed;
  if (importedMealData.times) state.mealData.times = importedMealData.times;
  const generatedShop = generateShopFromMeals(state.mealData);
  if (generatedShop.length > 0) state.shopData = generatedShop;
  state.schedaLoadedAt = new Date().toISOString();
  saveWelcomeProfile();
  importedMealData = null;
  save();
  renderMeals();
  updateProgress();
  renderDayNav();
  document.getElementById('welcomeScreen').classList.add('hidden');
  showToast('Scheda e lista spesa importate! ✓');
}

// ── GREETING MODAL (icona profilo) ────────────────────────
function openProfileModal() { openGreeting(); }

function openGreeting() {
  const nickname = currentUser?.user_metadata?.nickname || 'Leo';
  document.getElementById('greetingName').textContent = nickname;

  const now = new Date();
  const giorni = ['Domenica','Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato'];
  const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];
  document.getElementById('greetingDay').textContent = `Oggi è ${giorni[now.getDay()]} ${now.getDate()} ${mesi[now.getMonth()]}`;

  const mealOrder = ['colazione','pranzo','spuntini','cena'];
  const labels = {colazione:'Colazione',pranzo:'Pranzo',spuntini:'Spuntino',cena:'Cena'};
  const times = state.mealData.times;
  let nextMeal = null;
  for (const k of mealOrder) {
    if (!isDone(today, k)) { nextMeal = { label: labels[k], time: times[k] || '' }; break; }
  }
  const nextEl = document.getElementById('greetingNext');
  if (nextMeal) {
    nextEl.innerHTML = `Il prossimo pasto è <em>${nextMeal.label}</em> alle ${nextMeal.time}`;
  } else {
    nextEl.textContent = 'Tutti i pasti di oggi completati! 🎉';
  }

  const schedaEl = document.getElementById('greetingScheda');
  if (state.schedaLoadedAt) {
    const d = new Date(state.schedaLoadedAt);
    schedaEl.textContent = 'Scheda caricata il ' + d.toLocaleDateString('it-IT', {day:'numeric', month:'long', year:'numeric'});
  } else {
    schedaEl.textContent = 'Nessuna scheda caricata';
  }

  document.getElementById('greetingModal').classList.remove('hidden');
}

function closeGreeting() {
  document.getElementById('greetingModal').classList.add('hidden');
}

function closeGreetingBg(e) {
  if (e.target === document.getElementById('greetingModal')) closeGreeting();
}

// ── PROFILE FORM (welcome + settings) ─────────────────────
function setSex(sex, prefix) {
  ['M','F'].forEach(s => {
    const btn = document.getElementById(`${prefix}Sex${s}`);
    if (btn) btn.classList.toggle('active', s === sex);
  });
}

function setGoal(goal, prefix) {
  ['Dimagrire','Mantenere','Massa'].forEach(g => {
    const btn = document.getElementById(`${prefix}Goal${g}`);
    if (btn) btn.classList.toggle('active', g.toLowerCase() === goal);
  });
  const row = document.getElementById(`${prefix}PesoObiettivoRow`);
  if (row) row.style.display = goal !== 'mantenere' ? 'flex' : 'none';
}

function readProfileFromDOM(prefix) {
  const sexM = document.getElementById(`${prefix}SexM`);
  const sexF = document.getElementById(`${prefix}SexF`);
  const sesso = sexM?.classList.contains('active') ? 'M' : sexF?.classList.contains('active') ? 'F' : null;
  const eta = parseInt(document.getElementById(`${prefix}Eta`)?.value) || null;
  const altezza = parseInt(document.getElementById(`${prefix}Altezza`)?.value) || null;
  const peso = parseFloat(document.getElementById(`${prefix}Peso`)?.value) || null;
  const pesoObiettivo = parseFloat(document.getElementById(`${prefix}PesoObiettivo`)?.value) || null;
  const goals = ['Dimagrire','Mantenere','Massa'];
  const goal = goals.find(g => document.getElementById(`${prefix}Goal${g}`)?.classList.contains('active'));
  const obiettivo = goal ? goal.toLowerCase() : null;
  return { sesso, eta, altezza, peso, pesoObiettivo, obiettivo };
}

function populateProfileDOM(prefix, pd) {
  if (!pd) return;
  if (pd.sesso) setSex(pd.sesso, prefix);
  if (pd.eta) { const el = document.getElementById(`${prefix}Eta`); if (el) el.value = pd.eta; }
  if (pd.altezza) { const el = document.getElementById(`${prefix}Altezza`); if (el) el.value = pd.altezza; }
  if (pd.peso) { const el = document.getElementById(`${prefix}Peso`); if (el) el.value = pd.peso; }
  if (pd.obiettivo) {
    setGoal(pd.obiettivo, prefix);
    if (pd.pesoObiettivo) {
      const el = document.getElementById(`${prefix}PesoObiettivo`);
      if (el) el.value = pd.pesoObiettivo;
    }
  }
}

function saveWelcomeProfile() {
  const pd = readProfileFromDOM('welcome');
  if (pd.eta || pd.altezza || pd.peso || pd.obiettivo) {
    state.profileData = pd;
    save();
  }
}

function skipWelcomeEmpty() {
  saveWelcomeProfile();
  document.getElementById('welcomeScreen').classList.add('hidden');
}

// ── SETTINGS VIEW ─────────────────────────────────────────
function initSettingsView() {
  const nickname = currentUser?.user_metadata?.nickname || '';
  const email = currentUser?.email || '—';
  document.getElementById('settingsNickname').value = nickname;
  document.getElementById('settingsEmail').textContent = email;
  document.getElementById('settingsNewPassword').value = '';
  document.getElementById('settingsConfirmPassword').value = '';
  document.getElementById('settingsNicknameSuccess').classList.remove('show');
  document.getElementById('settingsPasswordError').classList.remove('show');
  document.getElementById('settingsPasswordSuccess').classList.remove('show');
  populateProfileDOM('settings', state.profileData);
}

async function saveSettingsProfile() {
  const pd = readProfileFromDOM('settings');
  state.profileData = pd;
  await saveToCloud();
  _refreshTracker();
  document.getElementById('settingsProfileSuccess').classList.add('show');
  setTimeout(() => document.getElementById('settingsProfileSuccess').classList.remove('show'), 2000);
}

async function saveSettingsNickname() {
  const nickname = document.getElementById('settingsNickname').value.trim();
  if (!nickname) return;
  const clean = nickname.charAt(0).toUpperCase() + nickname.slice(1).toLowerCase();
  const { data, error } = await sb.auth.updateUser({ data: { nickname: clean } });
  if (!error) {
    currentUser = data.user;
    document.getElementById('appNickname').textContent = clean;
    document.getElementById('profileInitials').textContent = clean.charAt(0).toUpperCase();
    document.getElementById('settingsNicknameSuccess').classList.add('show');
    setTimeout(() => document.getElementById('settingsNicknameSuccess').classList.remove('show'), 2000);
  }
}

async function saveSettingsPassword() {
  const newPwd = document.getElementById('settingsNewPassword').value;
  const confirmPwd = document.getElementById('settingsConfirmPassword').value;
  const errEl = document.getElementById('settingsPasswordError');
  const okEl = document.getElementById('settingsPasswordSuccess');
  errEl.classList.remove('show');
  okEl.classList.remove('show');
  if (newPwd.length < 6) { errEl.textContent = 'Min. 6 caratteri'; errEl.classList.add('show'); return; }
  if (newPwd !== confirmPwd) { errEl.textContent = 'Le password non coincidono'; errEl.classList.add('show'); return; }
  const { error } = await sb.auth.updateUser({ password: newPwd });
  if (error) { errEl.textContent = error.message; errEl.classList.add('show'); }
  else {
    okEl.classList.add('show');
    document.getElementById('settingsNewPassword').value = '';
    document.getElementById('settingsConfirmPassword').value = '';
    setTimeout(() => okEl.classList.remove('show'), 2000);
  }
}

// ── IMPORT SCHEDA ─────────────────────────────────────────
let importedMealData = null, _importCache = {};

function handleDragOver(e, dropId) { e.preventDefault(); document.getElementById(dropId||'importDrop').classList.add('dragover'); }
function handleDragLeave(e, dropId) { document.getElementById(dropId||'importDrop').classList.remove('dragover'); }
function handleDrop(e, ctx) {
  e.preventDefault();
  const dropId = ctx==='welcome' ? 'welcomeImportDrop' : 'importDrop';
  document.getElementById(dropId).classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) processImportFile(file, ctx||'settings');
}
function handleFileSelect(e, ctx) {
  const file = e.target.files[0];
  if (file) processImportFile(file, ctx||'settings');
}

async function processImportFile(file, ctx) {
  ctx = ctx || 'settings';
  const isWelcome = ctx === 'welcome';
  const statusId       = isWelcome ? 'welcomeImportStatus'        : 'importStatus';
  const statusTextId   = isWelcome ? 'welcomeImportStatusText'    : 'importStatusText';
  const previewContentId = isWelcome ? 'welcomeImportPreviewContent' : 'importPreviewContent';
  const questionsId    = isWelcome ? 'welcomeImportQuestions'     : 'importQuestions';
  const dropId         = isWelcome ? 'welcomeImportDrop'          : 'importDrop';
  const status     = document.getElementById(statusId);
  const statusText = document.getElementById(statusTextId);
  document.getElementById(isWelcome ? 'welcomeImportPreview' : 'importPreview').classList.remove('show');
  const qEl = document.getElementById(questionsId); if (qEl) qEl.style.display = 'none';
  status.classList.add('show');
  statusText.textContent = 'Lettura file…';

  try {
    const { base64, mediaType } = await fileToBase64(file);
    _importCache[ctx] = { base64, mediaType, fileType: file.type, isGym: false };
    statusText.textContent = 'Claude sta analizzando la scheda…';

    const messages = buildImportMessages(base64, mediaType, file.type);
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `Sei un assistente che estrae schede alimentari da file.
Analizza il contenuto e decidi:

1. Se tutto è chiaro, rispondi SOLO con questo JSON:
{"status":"complete","data":{"times":{"colazione":"HH:MM","pranzo":"HH:MM","spuntini":"HH:MM","cena":"HH:MM"},"days":{"0":{"colazione":[...],"pranzo":[...],"spuntini":[...],"cena":[...]},"1":{...},"2":{...},"3":{...},"4":{...},"5":{...},"6":{...}}}}

2. Se hai dubbi importanti (giorni ambigui, struttura poco chiara, informazioni critiche mancanti), rispondi SOLO con:
{"status":"questions","questions":["Prima domanda?","Seconda domanda?"]}

Regole:
- I giorni vanno da 0 (Lunedì) a 6 (Domenica).
- Gli alimenti devono includere quantità es. "150g latte", "2 uova".
- Giorni non specificati → "Giorno libero" per tutti i pasti.
- Orari di default: colazione 07:30, pranzo 13:00, spuntini 16:30, cena 20:00.
- Massimo 6 domande, solo quelle necessarie per completare la scheda correttamente.
- Restituisci SOLO il JSON, niente altro.`,
        messages
      })
    });

    if (!response.ok) throw new Error('Errore API Claude');
    const data = await response.json();
    const text = data.content.find(b => b.type === 'text')?.text || '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g,'').trim()); }
    catch(e) { throw new Error('Non riesco a leggere la struttura della scheda. Prova con un file più chiaro.'); }

    document.getElementById(dropId).style.display = 'none';

    if (parsed.status === 'questions') {
      statusText.textContent = '💬 Ho alcune domande sulla scheda…';
      _importCache[ctx].questions = parsed.questions;
      showImportQuestions(parsed.questions, questionsId, ctx);
    } else {
      const mealData = parsed.data || parsed;
      importedMealData = mealData;
      statusText.textContent = '✓ Scheda letta con successo';
      showImportPreview(mealData, previewContentId);
    }
  } catch(err) {
    statusText.textContent = '✗ ' + (err.message || 'Errore durante l\'analisi');
  }
}

function buildImportMessages(base64, mediaType, fileType) {
  if (fileType.startsWith('image/')) {
    return [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
      { type: 'text', text: 'Estrai la scheda alimentare da questa immagine e restituisci il JSON.' }
    ]}];
  } else if (fileType === 'application/pdf') {
    return [{ role: 'user', content: [
      { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
      { type: 'text', text: 'Estrai la scheda alimentare da questo PDF e restituisci il JSON.' }
    ]}];
  } else {
    const text = atob(base64);
    return [{ role: 'user', content: `Estrai la scheda alimentare da questo testo e restituisci il JSON:\n\n${text}` }];
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(',')[1];
      const mediaType = file.type || 'application/octet-stream';
      resolve({ base64, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showImportPreview(data, previewContentId) {
  const previewId = previewContentId === 'welcomeImportPreviewContent' ? 'welcomeImportPreview' : 'importPreview';
  const preview = document.getElementById(previewId);
  const content = document.getElementById(previewContentId || 'importPreviewContent');
  const giorni = ['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
  const pasti = ['colazione','pranzo','spuntini','cena'];
  const labels = {colazione:'Colazione',pranzo:'Pranzo',spuntini:'Spuntini',cena:'Cena'};

  content.innerHTML = Object.keys(data.days || {}).slice(0,7).map(d => {
    const day = data.days[d];
    const righe = pasti.map(k => {
      const foods = day[k] || [];
      const preview = foods.slice(0,2).join(', ') + (foods.length > 2 ? `… +${foods.length-2}` : '');
      return `<div class="import-meal-preview"><strong>${labels[k]}:</strong> ${preview || '—'}</div>`;
    }).join('');
    return `<div class="import-day-preview"><div class="import-day-name">${giorni[parseInt(d)]}</div>${righe}</div>`;
  }).join('');

  preview.classList.add('show');
}

function cancelImport() {
  importedMealData = null;
  delete _importCache['settings'];
  document.getElementById('importPreview').classList.remove('show');
  document.getElementById('importStatus').classList.remove('show');
  document.getElementById('importQuestions').style.display = 'none';
  document.getElementById('importFile').value = '';
  document.getElementById('importDrop').style.display = '';
}

function confirmImport() {
  if (!importedMealData) return;
  const fixed = {};
  Object.keys(importedMealData.days).forEach(k => { fixed[parseInt(k)] = importedMealData.days[k]; });
  state.mealData.days = fixed;
  if (importedMealData.times) state.mealData.times = importedMealData.times;
  const generatedShop = generateShopFromMeals(state.mealData);
  if (generatedShop.length > 0) state.shopData = generatedShop;
  state.schedaLoadedAt = new Date().toISOString();
  save(); renderMeals(); updateProgress(); renderMealEditor(); cancelImport(); _refreshTracker();
  showToast('Scheda e lista spesa aggiornate! ✓');
}

// ── GYM IMPORT ────────────────────────────────────────────
let importedGymData = null;

function handleGymDragOver(e, dropId) { e.preventDefault(); document.getElementById(dropId).classList.add('dragover'); }
function handleGymDragLeave(e, dropId) { document.getElementById(dropId).classList.remove('dragover'); }
function handleGymDrop(e, ctx) {
  e.preventDefault();
  const dropId = ctx==='gym-welcome' ? 'gymWelcomeImportDrop' : 'gymImportDrop';
  document.getElementById(dropId).classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) processGymImportFile(file, ctx);
}
function handleGymFileSelect(e, ctx) {
  const file = e.target.files[0];
  if (file) processGymImportFile(file, ctx);
}

async function processGymImportFile(file, ctx) {
  const isWelcome  = ctx === 'gym-welcome';
  const statusId   = isWelcome ? 'gymWelcomeImportStatus'         : 'gymImportStatus';
  const statusTextId = isWelcome ? 'gymWelcomeImportStatusText'   : 'gymImportStatusText';
  const previewCId = isWelcome ? 'gymWelcomeImportPreviewContent' : 'gymImportPreviewContent';
  const questionsId = isWelcome ? 'gymWelcomeImportQuestions'     : 'gymImportQuestions';
  const dropId     = isWelcome ? 'gymWelcomeImportDrop'           : 'gymImportDrop';
  const status     = document.getElementById(statusId);
  const statusText = document.getElementById(statusTextId);
  document.getElementById(isWelcome ? 'gymWelcomeImportPreview' : 'gymImportPreview').classList.remove('show');
  const qEl = document.getElementById(questionsId); if (qEl) qEl.style.display = 'none';
  status.classList.add('show');
  statusText.textContent = 'Lettura file…';

  try {
    const { base64, mediaType } = await fileToBase64(file);
    _importCache[ctx] = { base64, mediaType, fileType: file.type, isGym: true };
    statusText.textContent = 'Claude sta analizzando la scheda palestra…';

    const messages = buildImportMessages(base64, mediaType, file.type);
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `Sei un assistente specializzato nell'estrazione di schede di allenamento da file.
Analizza il contenuto e decidi:

1. Se tutto è chiaro, rispondi SOLO con questo JSON:
{"status":"complete","data":{"giorni":{"0":{"nome":"...","esercizi":[{"nome":"...","serie":4,"ripetizioni":"8-10","kg":"60","recupero":"90s","note":""}]},"1":{...},"2":{...},"3":{...},"4":{...},"5":{...},"6":{...}}}}

2. Se hai dubbi importanti (giorni non chiari, esercizi illeggibili, struttura ambigua), rispondi SOLO con:
{"status":"questions","questions":["Prima domanda?","Seconda domanda?"]}

Regole:
- MAPPATURA GIORNI OBBLIGATORIA (settimana italiana, parte da Lunedì): "0"=Lunedì "1"=Martedì "2"=Mercoledì "3"=Giovedì "4"=Venerdì "5"=Sabato "6"=Domenica. NON usare la convenzione JavaScript dove 0=Domenica.
- Giorni di riposo → nome "Riposo" ed esercizi [].
- Schede con meno di 7 giorni → distribuisci nei giorni tipici e metti "Riposo" negli altri.
- "serie" è un intero, "ripetizioni" una stringa (es. "8-10"), "kg" è il peso usato (es. "60", "80", "bodyweight") o "" se non specificato, "recupero" una stringa (es. "90s") o "".
- Superset/circuit → aggiungi nota nel campo "note".
- Massimo 6 domande, solo quelle necessarie per completare la scheda correttamente.
- Restituisci SOLO il JSON, niente altro.`,
        messages
      })
    });

    if (!response.ok) throw new Error('Errore API Claude');
    const data = await response.json();
    const text = data.content.find(b => b.type === 'text')?.text || '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g,'').trim()); }
    catch(e) { throw new Error('Non riesco a leggere la struttura della scheda. Prova con un file più chiaro.'); }

    document.getElementById(dropId).style.display = 'none';

    if (parsed.status === 'questions') {
      statusText.textContent = '💬 Ho alcune domande sulla scheda…';
      _importCache[ctx].questions = parsed.questions;
      showImportQuestions(parsed.questions, questionsId, ctx);
    } else {
      const gymData = parsed.data || parsed;
      importedGymData = gymData;
      statusText.textContent = '✓ Scheda palestra letta con successo';
      showGymImportPreview(gymData, previewCId);
    }
  } catch(err) {
    statusText.textContent = '✗ ' + (err.message || 'Errore durante l\'analisi');
  }
}

function showGymImportPreview(data, contentId) {
  const previewId = contentId === 'gymWelcomeImportPreviewContent' ? 'gymWelcomeImportPreview' : 'gymImportPreview';
  const content = document.getElementById(contentId);
  content.innerHTML = Object.keys(data.giorni || {}).slice(0,7).map(d => {
    const day = data.giorni[d];
    const esercizi = day.esercizi || [];
    const nome = day.nome || GIORNI[parseInt(d)];
    if (!nome || (nome.toLowerCase() === 'riposo' && esercizi.length === 0)) {
      return `<div class="import-day-preview"><div class="import-day-name">${GIORNI[parseInt(d)]}</div><div class="import-meal-preview" style="color:var(--text-soft)">Riposo</div></div>`;
    }
    const righe = esercizi.slice(0,3).map(e =>
      `<div class="import-meal-preview"><strong>${e.nome}</strong> · ${e.serie}×${e.ripetizioni}</div>`
    ).join('') + (esercizi.length > 3 ? `<div class="import-meal-preview">+${esercizi.length-3} altri…</div>` : '');
    return `<div class="import-day-preview"><div class="import-day-name">${GIORNI[parseInt(d)]} · ${nome}</div>${righe}</div>`;
  }).join('');
  document.getElementById(previewId).classList.add('show');
}

function cancelGymImport(ctx) {
  importedGymData = null;
  delete _importCache[ctx];
  const isWelcome = ctx === 'gym-welcome';
  document.getElementById(isWelcome ? 'gymWelcomeImportPreview'   : 'gymImportPreview').classList.remove('show');
  document.getElementById(isWelcome ? 'gymWelcomeImportStatus'    : 'gymImportStatus').classList.remove('show');
  const qEl = document.getElementById(isWelcome ? 'gymWelcomeImportQuestions' : 'gymImportQuestions');
  if (qEl) qEl.style.display = 'none';
  const fileId = isWelcome ? 'gymWelcomeImportFile' : 'gymImportFile';
  const dropId = isWelcome ? 'gymWelcomeImportDrop' : 'gymImportDrop';
  document.getElementById(fileId).value = '';
  document.getElementById(dropId).style.display = '';
}

function confirmGymImport(ctx) {
  if (!importedGymData) return;
  const fixed = {};
  Object.keys(importedGymData.giorni).forEach(k => { fixed[parseInt(k)] = importedGymData.giorni[k]; });
  state.gymData.giorni = fixed;
  importedGymData = null;
  save();
  cancelGymImport(ctx);
  showToast('Scheda palestra importata! ✓');
  if (ctx !== 'gym-welcome') {
    renderHomePalestra();
  }
  _refreshTracker();
}

// ── AGENT EDIT ────────────────────────────────────────────
async function agentEditAlim() {
  const input   = document.getElementById('agentAlimInput');
  const statusEl= document.getElementById('agentAlimStatus');
  const btn     = document.getElementById('agentAlimBtn');
  const request = input.value.trim();
  if (!request) return;

  _readMealEditorToState();
  statusEl.innerHTML = '<span class="import-spinner"></span> Elaborazione…';
  statusEl.className = 'agent-edit-status';
  btn.disabled = true;

  const system = `Sei un assistente che modifica schede alimentari. Ogni giorno ha colazione/pranzo/spuntini/cena come array di stringhe (es. ["150g Pasta","100g Pollo"]).
MAPPATURA GIORNI OBBLIGATORIA: "0"=Lunedì "1"=Martedì "2"=Mercoledì "3"=Giovedì "4"=Venerdì "5"=Sabato "6"=Domenica
Se la modifica è piccola (max 5 alimenti, orari, quantità, 1-2 giorni), rispondi SOLO con:
{"status":"ok","summary":"breve descrizione della modifica","data":{"times":{...},"days":{"0":{...},...,"6":{...}}}}
Se troppo grande o riguarda tutta la settimana, rispondi SOLO con: {"status":"too_complex"}
Restituisci SOLO il JSON, niente altro.`;

  try {
    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system,
        messages: [{ role:'user', content: `Scheda attuale:\n${JSON.stringify(state.mealData)}\n\nRichiesta: ${request}` }]
      })
    });
    const data = await res.json();
    const raw  = (data.content?.[0]?.text||'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    if (parsed.status === 'too_complex') {
      statusEl.innerHTML = '⚠ Modifica troppo complessa: ricarica la scheda con un nuovo file.';
      statusEl.className = 'agent-edit-status error';
    } else if (parsed.status === 'ok' && parsed.data?.times && parsed.data?.days) {
      state.mealData = parsed.data;
      save();
      renderMeals(); updateProgress(); renderSettingsDayTabs(); renderMealEditor(); _refreshTracker();
      input.value = '';
      statusEl.innerHTML = `✓ ${parsed.summary || 'Modifica applicata!'}`;
      statusEl.className = 'agent-edit-status success';
      setTimeout(() => { statusEl.innerHTML = ''; statusEl.className = 'agent-edit-status'; }, 4000);
    } else {
      throw new Error('risposta non valida');
    }
  } catch(e) {
    statusEl.innerHTML = '✗ Errore durante la modifica. Riprova.';
    statusEl.className = 'agent-edit-status error';
  }
  btn.disabled = false;
}

async function agentEditGym() {
  const input   = document.getElementById('agentGymInput');
  const statusEl= document.getElementById('agentGymStatus');
  const btn     = document.getElementById('agentGymBtn');
  const request = input.value.trim();
  if (!request) return;

  _readGymEditorToState();
  statusEl.innerHTML = '<span class="import-spinner"></span> Elaborazione…';
  statusEl.className = 'agent-edit-status';
  btn.disabled = true;

  const system = `Sei un assistente che modifica schede di allenamento. Ogni giorno ha "nome" e "esercizi":[{nome,serie,ripetizioni,kg,recupero,note}].
MAPPATURA GIORNI OBBLIGATORIA: "0"=Lunedì "1"=Martedì "2"=Mercoledì "3"=Giovedì "4"=Venerdì "5"=Sabato "6"=Domenica
serie=intero, ripetizioni=stringa, kg=stringa o "", recupero=stringa o "".
Se la modifica è piccola (max 3 esercizi, parametri, nome giorno), rispondi SOLO con:
{"status":"ok","summary":"breve descrizione della modifica","data":{"0":{...},...,"6":{...}}}
Se troppo complessa, rispondi SOLO con: {"status":"too_complex"}
Restituisci SOLO il JSON, niente altro.`;

  try {
    const res = await fetch('/api/claude', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system,
        messages: [{ role:'user', content: `Scheda attuale:\n${JSON.stringify(state.gymData.giorni)}\n\nRichiesta: ${request}` }]
      })
    });
    const data = await res.json();
    const raw  = (data.content?.[0]?.text||'').trim();
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);

    if (parsed.status === 'too_complex') {
      statusEl.innerHTML = '⚠ Modifica troppo complessa: ricarica la scheda con un nuovo file.';
      statusEl.className = 'agent-edit-status error';
    } else if (parsed.status === 'ok' && parsed.data) {
      const fixed = {};
      Object.keys(parsed.data).forEach(k => { fixed[parseInt(k)] = parsed.data[k]; });
      state.gymData.giorni = fixed;
      save();
      renderGymEditorDayTabs(); renderGymEditor(); renderHomePalestra(); _refreshTracker();
      input.value = '';
      statusEl.innerHTML = `✓ ${parsed.summary || 'Modifica applicata!'}`;
      statusEl.className = 'agent-edit-status success';
      setTimeout(() => { statusEl.innerHTML = ''; statusEl.className = 'agent-edit-status'; }, 4000);
    } else {
      throw new Error('risposta non valida');
    }
  } catch(e) {
    statusEl.innerHTML = '✗ Errore durante la modifica. Riprova.';
    statusEl.className = 'agent-edit-status error';
  }
  btn.disabled = false;
}

// ── IMPORT Q&A FLOW ───────────────────────────────────────
function showImportQuestions(questions, containerId, ctx) {
  const el = document.getElementById(containerId);
  if (!el) return;
  const isGym = ctx.startsWith('gym');
  const cancelFn = ctx === 'welcome'      ? 'cancelWelcomeImport()'
                 : ctx === 'settings'     ? 'cancelImport()'
                 : `cancelGymImport('${ctx}')`;
  el.innerHTML = `
    <div class="import-questions-title">💬 Ho alcune domande</div>
    <div class="import-questions-sub">Rispondendo renderai la scheda più precisa e completa.</div>
    ${questions.map((q,i) => `
      <div class="import-question-row">
        <div class="import-question-text">${q}</div>
        <textarea class="import-question-input" id="iq_${ctx.replace(/-/g,'_')}_${i}" placeholder="La tua risposta…" rows="2"></textarea>
      </div>`).join('')}
    <div class="import-actions" style="margin-top:14px">
      <button class="import-cancel-btn" onclick="${cancelFn}">Annulla</button>
      <button class="import-confirm-btn" onclick="submitImportAnswers('${ctx}')">Procedi →</button>
    </div>`;
  el.style.display = 'block';
}

async function submitImportAnswers(ctx) {
  const cache = _importCache[ctx];
  if (!cache) return;
  const isGym     = cache.isGym;
  const isWelcome = ctx === 'welcome' || ctx === 'gym-welcome';
  const statusId     = isGym ? (isWelcome ? 'gymWelcomeImportStatus'      : 'gymImportStatus')
                              : (isWelcome ? 'welcomeImportStatus'         : 'importStatus');
  const statusTextId = isGym ? (isWelcome ? 'gymWelcomeImportStatusText'  : 'gymImportStatusText')
                              : (isWelcome ? 'welcomeImportStatusText'     : 'importStatusText');
  const previewCId   = isGym ? (isWelcome ? 'gymWelcomeImportPreviewContent' : 'gymImportPreviewContent')
                              : (isWelcome ? 'welcomeImportPreviewContent'    : 'importPreviewContent');
  const questionsId  = isGym ? (isWelcome ? 'gymWelcomeImportQuestions'   : 'gymImportQuestions')
                              : (isWelcome ? 'welcomeImportQuestions'      : 'importQuestions');

  // Collect answers
  const ctxKey = ctx.replace(/-/g,'_');
  const questions = cache.questions || [];
  const qaLines = questions.map((q,i) => {
    const ans = document.getElementById(`iq_${ctxKey}_${i}`)?.value?.trim() || '(nessuna risposta)';
    return `D: ${q}\nR: ${ans}`;
  }).join('\n\n');

  document.getElementById(questionsId).style.display = 'none';
  document.getElementById(statusId).classList.add('show');
  document.getElementById(statusTextId).textContent = 'Aggiorno la scheda con le tue risposte…';

  try {
    const { base64, mediaType, fileType } = cache;
    const messages = buildImportMessages(base64, mediaType, fileType);
    // Append Q&A to the last message
    const last = messages[messages.length - 1];
    const qaNote = `\n\nRisposte alle domande di chiarimento:\n${qaLines}`;
    if (typeof last.content === 'string') {
      messages[messages.length - 1] = { ...last, content: last.content + qaNote };
    } else if (Array.isArray(last.content)) {
      last.content.push({ type: 'text', text: qaNote });
    }

    const mealFinalSystem = `Sei un assistente che estrae schede alimentari. Usa il file e le risposte dell'utente per produrre la scheda completa.
Restituisci SOLO il JSON: {"times":{"colazione":"HH:MM","pranzo":"HH:MM","spuntini":"HH:MM","cena":"HH:MM"},"days":{"0":{...},...,"6":{...}}}
I giorni vanno da 0 (Lunedì) a 6 (Domenica). Gli alimenti devono includere quantità. Restituisci SOLO il JSON.`;
    const gymFinalSystem = `Sei un assistente che estrae schede di allenamento. Usa il file e le risposte dell'utente per produrre la scheda completa.
Restituisci SOLO il JSON: {"giorni":{"0":{"nome":"...","esercizi":[...]},...,"6":{...}}}
MAPPATURA GIORNI OBBLIGATORIA (settimana italiana, parte da Lunedì): "0"=Lunedì "1"=Martedì "2"=Mercoledì "3"=Giovedì "4"=Venerdì "5"=Sabato "6"=Domenica. NON usare la convenzione JavaScript dove 0=Domenica.
serie=intero, ripetizioni=stringa, kg=peso usato (stringa, es. "60" o "bodyweight") o "", recupero=stringa o "". Restituisci SOLO il JSON.`;

    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: isGym ? gymFinalSystem : mealFinalSystem,
        messages
      })
    });

    if (!response.ok) throw new Error('Errore API Claude');
    const apiData = await response.json();
    const text = apiData.content.find(b => b.type === 'text')?.text || '';
    let parsed;
    try { parsed = JSON.parse(text.replace(/```json|```/g,'').trim()); }
    catch(e) { throw new Error('Non riesco a leggere la struttura. Prova a fornire risposte più dettagliate.'); }

    document.getElementById(statusTextId).textContent = '✓ Scheda completata con successo';
    if (isGym) { importedGymData = parsed; showGymImportPreview(parsed, previewCId); }
    else       { importedMealData = parsed; showImportPreview(parsed, previewCId); }

  } catch(err) {
    document.getElementById(statusTextId).textContent = '✗ ' + (err.message || 'Errore durante l\'analisi');
  }
}
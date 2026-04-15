function switchView(view,btn) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  btn.classList.add('active');
  document.getElementById('mainContent').scrollTop=0;
  if(timerInt){clearInterval(timerInt);timerInt=null;}
  if(view==='tracker')renderTracker();
  if(view==='spesa'){renderShop();renderShopEditor();}
  if(view==='scheda'){renderSettingsDayTabs();renderMealEditor();}
  if(view==='settings')initSettingsView();
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
  document.getElementById('welcomeImportPreview').classList.remove('show');
  document.getElementById('welcomeImportStatus').classList.remove('show');
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
let importedMealData = null;

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
  const statusId = isWelcome ? 'welcomeImportStatus' : 'importStatus';
  const previewId = isWelcome ? 'welcomeImportPreview' : 'importPreview';
  const statusTextId = isWelcome ? 'welcomeImportStatusText' : 'importStatusText';
  const previewContentId = isWelcome ? 'welcomeImportPreviewContent' : 'importPreviewContent';
  const status = document.getElementById(statusId);
  const preview = document.getElementById(previewId);
  const statusText = document.getElementById(statusTextId);
  preview.classList.remove('show');
  status.classList.add('show');
  statusText.textContent = 'Lettura file…';

  try {
    const { base64, mediaType } = await fileToBase64(file);
    statusText.textContent = 'Claude sta analizzando la scheda…';

    const messages = buildImportMessages(base64, mediaType, file.type);
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: `Sei un assistente che estrae schede alimentari da file. 
Analizza il contenuto e restituisci SOLO un JSON valido (senza markdown, senza backtick) con questa struttura esatta:
{
  "times": { "colazione": "HH:MM", "pranzo": "HH:MM", "spuntini": "HH:MM", "cena": "HH:MM" },
  "days": {
    "0": { "colazione": ["alimento1", "alimento2"], "pranzo": [...], "spuntini": [...], "cena": [...] },
    "1": { ... },
    "2": { ... },
    "3": { ... },
    "4": { ... },
    "5": { ... },
    "6": { ... }
  }
}
I giorni vanno da 0 (Lunedì) a 6 (Domenica).
Gli alimenti devono includere quantità es. "150g latte intero", "2 uova", "100g riso".
Se un giorno non è specificato, usa "Giorno libero" per tutti i pasti.
Se gli orari non sono specificati usa: colazione 07:30, pranzo 13:00, spuntini 16:30, cena 20:00.
Restituisci SOLO il JSON, niente altro.`,
        messages
      })
    });

    if (!response.ok) throw new Error('Errore API Claude');
    const data = await response.json();
    const text = data.content.find(b => b.type === 'text')?.text || '';

    let parsed;
    try {
      const clean = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch(e) {
      throw new Error('Non riesco a leggere la struttura della scheda. Prova con un file più chiaro.');
    }

    importedMealData = parsed;
    statusText.textContent = '✓ Scheda letta con successo';
    // Nascondi il box di upload e mostra solo l'anteprima
    const dropEl = document.getElementById(isWelcome ? 'welcomeImportDrop' : 'importDrop');
    if (dropEl) dropEl.style.display = 'none';
    showImportPreview(parsed, previewContentId);

  } catch(err) {
    statusText.textContent = '✗ ' + (err.message || 'Errore durante l\'analisi');
    document.getElementById('importSpinner').style.display = 'none';
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
  document.getElementById('importPreview').classList.remove('show');
  document.getElementById('importStatus').classList.remove('show');
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
  save(); renderMeals(); updateProgress(); renderMealEditor(); cancelImport();
  showToast('Scheda e lista spesa aggiornate! ✓');
}
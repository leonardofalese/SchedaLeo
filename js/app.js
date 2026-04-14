function switchView(view,btn) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('view-'+view).classList.add('active');
  btn.classList.add('active');
  document.getElementById('mainContent').scrollTop=0;
  if(view==='tracker')renderTracker();
  if(view==='spesa')renderShop();
  if(view==='timer')renderTimer();
  else if(timerInt){clearInterval(timerInt);timerInt=null;}
  if(view==='settings'){renderSettingsDayTabs();renderMealEditor();renderShopEditor();}
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
  
  Object.values(mealData.days).forEach(day => {
    MEAL_KEYS.forEach(k => {
      (day[k] || []).forEach(food => {
        if (!food || food === 'Giorno libero' || food === 'Libero') return;
        const p = parseFood(food);
        const name = p.name.trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!allFoods[key]) {
          allFoods[key] = { name: name, qty: p.qty || '' };
        }
      });
    });
  });

  // Raggruppa in categorie base
  const proteine = ['tonno','salmone','pollo','manzo','macinato','bistecca','bresaola','uova','uovo','prosciutto','tacchino','merluzzo','sgombro'];
  const carboidrati = ['pasta','riso','pane','avena','farro','orzo','cereali','biscotti','cracker','patate','fette','gallette'];
  const latticini = ['latte','yogurt','greco','grana','parmigiano','mozzarella','ricotta','burro','formaggio'];
  const verdure = ['zucchine','carote','spinaci','insalata','broccoli','pomodori','peperoni','melanzane','cipolla','aglio','verdure','funghi','cavolo','cetrioli','lattuga'];
  const frutta = ['mela','pera','banana','arancia','kiwi','fragole','uva','ananas','mango','frutto','frutti','frutte','melone'];
  const condimenti = ['olio','sale','pepe','miele','aceto','salsa','passata','pomodoro','dado','spezie','erbe','cacao','cioccolato','frutta secca','mandorle','noci','nocciole'];

  const cats = {
    'Proteine': [],
    'Carboidrati & Cereali': [],
    'Latticini': [],
    'Verdure & Frutta': [],
    'Condimenti & Altro': []
  };

  Object.values(allFoods).forEach(item => {
    const nameLow = item.name.toLowerCase();
    if (proteine.some(p => nameLow.includes(p))) {
      cats['Proteine'].push(item);
    } else if (carboidrati.some(p => nameLow.includes(p))) {
      cats['Carboidrati & Cereali'].push(item);
    } else if (latticini.some(p => nameLow.includes(p))) {
      cats['Latticini'].push(item);
    } else if (verdure.some(p => nameLow.includes(p)) || frutta.some(p => nameLow.includes(p))) {
      cats['Verdure & Frutta'].push(item);
    } else {
      cats['Condimenti & Altro'].push(item);
    }
  });

  return Object.entries(cats)
    .filter(([,items]) => items.length > 0)
    .map(([cat, items]) => ({
      cat,
      items: items.map(i => ({ name: i.name, qty: i.qty }))
    }));
}

async function confirmWelcomeImport() {
  if (!importedMealData) return;
  const fixed = {};
  Object.keys(importedMealData.days).forEach(k => { fixed[parseInt(k)] = importedMealData.days[k]; });
  state.mealData.days = fixed;
  if (importedMealData.times) state.mealData.times = importedMealData.times;
  const generatedShop = generateShopFromMeals(state.mealData);
  if (generatedShop.length > 0) state.shopData = generatedShop;
  importedMealData = null;
  save();
  renderMeals();
  updateProgress();
  renderDayNav();
  document.getElementById('welcomeScreen').classList.add('hidden');
  showToast('Scheda e lista spesa importate! ✓');
}

// ── PROFILE MODAL ─────────────────────────────────────────
function openProfileModal() {
  const nickname = currentUser?.user_metadata?.nickname || '';
  document.getElementById('profileNickname').value = nickname;
  document.getElementById('profileNewPassword').value = '';
  document.getElementById('profileConfirmPassword').value = '';
  document.getElementById('nicknameSuccess').classList.remove('show');
  document.getElementById('passwordError').classList.remove('show');
  document.getElementById('passwordSuccess').classList.remove('show');
  document.getElementById('profileModal').classList.remove('hidden');
}

function closeProfileModal(e) {
  if (e.target === document.getElementById('profileModal')) {
    document.getElementById('profileModal').classList.add('hidden');
  }
}

async function saveNickname() {
  const nickname = document.getElementById('profileNickname').value.trim();
  if (!nickname) return;
  const clean = nickname.charAt(0).toUpperCase() + nickname.slice(1).toLowerCase();
  const { data, error } = await sb.auth.updateUser({ data: { nickname: clean } });
  if (!error) {
    currentUser = data.user;
    document.getElementById('appNickname').textContent = clean;
    document.getElementById('profileInitials').textContent = clean.charAt(0).toUpperCase();
    document.getElementById('nicknameSuccess').classList.add('show');
    setTimeout(() => document.getElementById('nicknameSuccess').classList.remove('show'), 2000);
  }
}

async function savePassword() {
  const newPwd = document.getElementById('profileNewPassword').value;
  const confirmPwd = document.getElementById('profileConfirmPassword').value;
  const errEl = document.getElementById('passwordError');
  const okEl = document.getElementById('passwordSuccess');
  errEl.classList.remove('show');
  okEl.classList.remove('show');
  if (newPwd.length < 6) { errEl.textContent = 'La password deve essere di almeno 6 caratteri'; errEl.classList.add('show'); return; }
  if (newPwd !== confirmPwd) { errEl.textContent = 'Le password non coincidono'; errEl.classList.add('show'); return; }
  const { error } = await sb.auth.updateUser({ password: newPwd });
  if (error) { errEl.textContent = error.message; errEl.classList.add('show'); }
  else {
    okEl.classList.add('show');
    document.getElementById('profileNewPassword').value = '';
    document.getElementById('profileConfirmPassword').value = '';
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
  save(); renderMeals(); updateProgress(); renderMealEditor(); cancelImport();
  showToast('Scheda e lista spesa aggiornate! ✓');
}
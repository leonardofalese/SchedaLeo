// Calcola kcal giorno (solo pasti completati se onlyDone=true)
function calcDayKcal(dayIndex, onlyDone) {
  let total = 0;
  MEAL_KEYS.forEach(k => {
    if (onlyDone && !isDone(dayIndex, k)) return;
    const foods = state.mealData.days[dayIndex]?.[k] || [];
    foods.forEach(f => { total += calcKcalFromFood(f); });
  });
  return total;
}
function calcTotalDayKcal(dayIndex) {
  return calcDayKcal(dayIndex, false);
}

// ── RENDER FUNCTIONS (identiche a prima) ─────────────────
const mealKey = (d,k) => `d${d}_${k}`;
const isDone = (d,k) => !!state.meals[mealKey(d,k)];
function parseFood(f) {
  const m = f.match(/^(\d+\s*(?:g|ml|kg|L|pz|pacco|busta|scatolette|fette|frutto)?\s+)/i);
  if (m&&m[0].trim()) return {qty:m[0].trim(), name:f.slice(m[0].length).trim()||f};
  return {qty:'', name:f};
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg||'Salvato!';
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 2000);
}

function _dayHasWarnings(dayIndex) {
  return MEAL_KEYS.some(k => {
    const foods = state.mealData.days[dayIndex]?.[k] || [];
    return foods.some(f => {
      if (!f || /libero/i.test(f)) return false;
      const p = parseFood(f);
      return !p.qty && !!p.name;
    });
  });
}
function renderDayNav() {
  document.getElementById('dayNav').innerHTML = GIORNI_SHORT.map((g,i) => {
    const hasAny = MEAL_KEYS.some(k=>isDone(i,k));
    const warn   = _dayHasWarnings(i);
    return `<button class="day-btn ${i===currentDay?'active':''} ${hasAny&&i!==currentDay?'has-activity':''}" onclick="selectDay(${i})">${g}${warn?'<span class="day-warn-dot"></span>':''}</button>`;
  }).join('');
}
function selectDay(i) { currentDay=i; renderDayNav(); renderMeals(); updateProgress(); renderHomePalestra(); document.getElementById('mainContent').scrollTop=0; }

function renderMeals() {
  const times = state.mealData.times;
  // Warning banner — alimenti senza quantità
  const warnItems = [];
  MEAL_KEYS.forEach(k => {
    (state.mealData.days[currentDay]?.[k] || []).forEach(f => {
      if (!f || /libero/i.test(f)) return;
      const p = parseFood(f);
      if (!p.qty && p.name) warnItems.push(p.name);
    });
  });
  const wb = document.getElementById('dayWarnBanner');
  if (wb) {
    if (warnItems.length > 0) {
      wb.innerHTML = `<div class="day-warn-banner"><span class="day-warn-icon">⚠</span><div><strong>Grammi mancanti</strong><div class="day-warn-list">${warnItems.join(' · ')}</div></div></div>`;
      wb.style.display = '';
    } else {
      wb.style.display = 'none';
    }
  }
  document.getElementById('mealsContainer').innerHTML = MEAL_KEYS.map(k => {
    const done = isDone(currentDay,k);
    const foods = state.mealData.days[currentDay]?.[k]||[];
    const kcalMeal = foods.reduce((s,f)=>s+calcKcalFromFood(f),0);
    return `<div class="meal-card ${done?'done':''}" id="meal-card-${k}">
      <div class="meal-header" onclick="toggleMeal(${currentDay},'${k}')">
        <div class="meal-icon-wrap" style="color:${done?'var(--green)':'var(--text-mid)'}">${ICO[k]}</div>
        <div class="meal-info"><div class="meal-name">${MEAL_LABELS[k]}<span style="font-size:11px;font-weight:400;color:var(--text-mid);font-family:var(--mono)">${kcalMeal>0?' · '+kcalMeal+' kcal':''}</span></div><div class="meal-time">${times[k]}</div></div>
        <div style="display:flex;align-items:center;gap:8px">
          <button onclick="event.stopPropagation();toggleMealEdit('${k}')" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-soft);display:flex;align-items:center" title="Modifica quantità">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <div class="meal-check ${done?'checked':''}">${done?'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}</div>
        </div>
      </div>
      <div class="meal-foods" id="meal-foods-${k}">${foods.map((f,fi)=>{const p=parseFood(f);return`<div class="food-row"><span class="food-qty">${p.qty}</span><span class="food-name">${p.name}</span></div>`;}).join('')}</div>
      <div class="meal-edit-panel" id="meal-edit-${k}" style="display:none;padding:0 16px 14px 16px;border-top:1px solid var(--border)">
        <div id="meal-edit-inputs-${k}" style="margin-top:10px">
          ${foods.map((f,fi)=>{const p=parseFood(f);return`<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <input class="shop-edit-qty" type="text" value="${p.qty.replace(/"/g,'&quot;')}" id="inline-qty-${k}-${fi}" placeholder="150g" oninput="updateInlineKcal('${k}')">
            <input class="food-edit-input" type="text" value="${p.name.replace(/"/g,'&quot;')}" id="inline-name-${k}-${fi}" style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px 8px;font-family:var(--font);font-size:12px;color:var(--text);outline:none" oninput="updateInlineKcal('${k}')">
          </div>`;}).join('')}
        </div>
        <button onclick="saveInlineMeal('${k}')" style="background:var(--green);color:#0a0a0a;border:none;border-radius:20px;padding:6px 16px;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer;margin-top:4px">Salva</button>
        <button onclick="toggleMealEdit('${k}')" style="background:none;border:1px solid var(--border2);border-radius:20px;padding:6px 12px;font-family:var(--font);font-size:12px;color:var(--text-mid);cursor:pointer;margin-top:4px;margin-left:6px">Annulla</button>
        <div id="inline-kcal-${k}" style="font-size:11px;color:var(--green);font-family:var(--mono);margin-top:6px"></div>
      </div>
    </div>`;
  }).join('');
}
function toggleMeal(d,k) { state.meals[mealKey(d,k)]=!isDone(d,k); save(); renderMeals(); updateProgress(); renderDayNav(); }
function toggleMealEdit(k) {
  const panel = document.getElementById('meal-edit-' + k);
  const isOpen = panel.style.display !== 'none';
  // Close all other panels first
  MEAL_KEYS.forEach(mk => {
    const p = document.getElementById('meal-edit-' + mk);
    if (p) p.style.display = 'none';
  });
  if (!isOpen) {
    panel.style.display = 'block';
    updateInlineKcal(k);
  }
}

function updateInlineKcal(k) {
  const nameInputs = document.querySelectorAll(`[id^="inline-name-${k}-"]`);
  let total = 0;
  nameInputs.forEach((nameEl, i) => {
    const qtyEl = document.getElementById(`inline-qty-${k}-${i}`);
    total += calcKcalFromFood(((qtyEl?.value||'') + ' ' + nameEl.value).trim());
  });
  const el = document.getElementById('inline-kcal-' + k);
  if (el) el.textContent = total > 0 ? total + ' kcal' : '';
}

function saveInlineMeal(k) {
  const nameInputs = document.querySelectorAll(`[id^="inline-name-${k}-"]`);
  const newFoods = Array.from(nameInputs).map((nameEl, i) => {
    const qtyEl = document.getElementById(`inline-qty-${k}-${i}`);
    return ((qtyEl?.value||'') + ' ' + nameEl.value).trim();
  }).filter(Boolean);
  if (!state.mealData.days[currentDay]) state.mealData.days[currentDay] = {};
  state.mealData.days[currentDay][k] = newFoods;
  const generated = generateShopFromMeals(state.mealData);
  if (generated.length > 0) state.shopData = generated;
  save();
  renderMeals();
  updateProgress();
  showToast('Salvato · lista spesa aggiornata');
}

function updateProgress() {
  const done = MEAL_KEYS.filter(k=>isDone(currentDay,k)).length;
  const kcalDone = calcDayKcal(currentDay, true);
  const kcalTotal = calcTotalDayKcal(currentDay);

  // Ring: % calorie consumate, label mostra "consumate/totale"
  const pct = kcalTotal > 0 ? Math.min(kcalDone / kcalTotal, 1) : (done / 4);
  document.getElementById('ringFill').style.strokeDashoffset = 188.5 - (188.5 * pct);
  document.getElementById('ringLabel').textContent = kcalTotal > 0 ? kcalDone + '' : done + '/4';

  // Titolo progressivo
  const titles = ['Inizia la giornata', 'Ottimo inizio!', 'Metà strada', 'Quasi fatto!', 'Completata! ⚡'];
  document.getElementById('progressTitle').textContent = titles[done] || 'Completata! ⚡';
  // Mostra target kcal giornaliero nel sottotitolo
  const kcalEl2 = document.getElementById('kcalDisplay');
  if (kcalEl2) {
    kcalEl2.style.display = '';
    kcalEl2.textContent = kcalTotal > 0 ? kcalDone + ' / ' + kcalTotal + ' kcal' : '';
  }



  // Macro giornaliere pianificate
  const mr = document.getElementById('macroRow');
  if (mr) {
    const mac = calcDayMacros(currentDay);
    if (mac.p > 0 || mac.c > 0 || mac.g > 0) {
      mr.innerHTML = `<div class="macro-row"><span class="macro-pill macro-p">P&nbsp;${mac.p}g</span><span class="macro-pill macro-c">C&nbsp;${mac.c}g</span><span class="macro-pill macro-g">G&nbsp;${mac.g}g</span></div>`;
      mr.style.display = '';
    } else { mr.style.display = 'none'; }
  }

  // Dot: solo nome, niente numeri
  document.getElementById('mealDots').innerHTML = MEAL_KEYS.map(k => {
    const d = isDone(currentDay, k);
    return `<div class="meal-dot-wrap"><div class="meal-dot ${d ? 'done' : ''}"></div><div class="meal-dot-label">${k.slice(0,3).toUpperCase()}</div></div>`;
  }).join('');
}

// ── ANALYTICS ─────────────────────────────────────────────
let _chartWeekly = null, _chartMeals = null, _chartProjection = null, _chartGym = null, _chartVol = null, _chartWeight = null;

function calcActivityMultiplier(trainingDays, totalVol) {
  // Base da frequenza allenamenti
  let m;
  if (trainingDays === 0)     m = 1.2;
  else if (trainingDays <= 2) m = 1.375;
  else if (trainingDays <= 4) m = 1.55;
  else if (trainingDays <= 6) m = 1.725;
  else                         m = 1.9;
  // Bonus continuo da volume (serie × rip × kg) — ogni 10.000 kg/sett → +0.015, max +0.15
  if (totalVol > 0) {
    const volBonus = Math.min((totalVol / 10000) * 0.015, 0.15);
    m = Math.min(parseFloat((m + volBonus).toFixed(3)), 1.9);
  }
  return m;
}

function calcBMR(pd) {
  if (!pd || !pd.peso || !pd.altezza || !pd.eta) return 0;
  const base = 10 * pd.peso + 6.25 * pd.altezza - 5 * pd.eta;
  return Math.round(pd.sesso === 'F' ? base - 161 : base + 5);
}

function calcAvgDailyKcal() {
  const kcals = Array.from({length:7}, (_,d) => calcTotalDayKcal(d)).filter(k => k > 0);
  return kcals.length ? Math.round(kcals.reduce((a,b) => a+b, 0) / kcals.length) : 0;
}
function calcDayMacros(dayIndex) {
  const t = {kcal:0,p:0,c:0,g:0};
  MEAL_KEYS.forEach(k => {
    (state.mealData.days[dayIndex]?.[k]||[]).forEach(f => {
      const m = calcMacrosFromFood(f);
      t.kcal+=m.kcal; t.p+=m.p; t.c+=m.c; t.g+=m.g;
    });
  });
  return {kcal:t.kcal, p:Math.round(t.p*10)/10, c:Math.round(t.c*10)/10, g:Math.round(t.g*10)/10};
}
function calcWeekAvgMacros() {
  let count=0; const s={kcal:0,p:0,c:0,g:0};
  for(let d=0;d<7;d++){const m=calcDayMacros(d);if(m.kcal>0){s.kcal+=m.kcal;s.p+=m.p;s.c+=m.c;s.g+=m.g;count++;}}
  if(!count) return {kcal:0,p:0,c:0,g:0};
  return {kcal:Math.round(s.kcal/count),p:Math.round(s.p/count),c:Math.round(s.c/count),g:Math.round(s.g/count)};
}

function renderTrackerAnalytics() {
  if (_chartWeekly)    { _chartWeekly.destroy();    _chartWeekly    = null; }
  if (_chartMeals)     { _chartMeals.destroy();     _chartMeals     = null; }
  if (_chartProjection){ _chartProjection.destroy(); _chartProjection= null; }
  if (_chartGym)       { _chartGym.destroy();       _chartGym       = null; }
  if (_chartVol)       { _chartVol.destroy();        _chartVol       = null; }
  if (_chartWeight)    { _chartWeight.destroy();     _chartWeight    = null; }

  const el = document.getElementById('trackerAnalytics');
  const pd = state.profileData;
  const weekKcal = Array.from({length:7}, (_,d) => calcTotalDayKcal(d));
  const avgKcal = calcAvgDailyKcal();

  // Meal avg kcal (across whole week)
  const mealAvgKcal = MEAL_KEYS.map(k => {
    let tot = 0;
    for (let d=0; d<7; d++) (state.mealData.days[d]?.[k]||[]).forEach(f => { tot += calcKcalFromFood(f); });
    return Math.round(tot / 7);
  });

  // ── GYM BASICS (calcolati prima del TDEE) ──────────────
  const gymDays    = Array.from({length:7}, (_,d) => state.gymData.giorni[d] || {nome:'', esercizi:[]});
  const hasGymData = gymDays.some(d => (d.esercizi||[]).length > 0);
  const trainingDays = gymDays.filter(d => (d.esercizi||[]).length > 0 && (d.nome||'').toLowerCase() !== 'riposo').length;
  const totalEx      = gymDays.reduce((a,d) => a + (d.esercizi||[]).length, 0);
  const totalSets    = gymDays.reduce((a,d) => a + (d.esercizi||[]).reduce((b,ex) => b+(parseInt(ex.serie)||0), 0), 0);
  const totalVol     = gymDays.reduce((a,d) => a + (d.esercizi||[]).reduce((b,ex) => {
    const kg  = parseFloat(ex.kg);
    const rip = parseInt((ex.ripetizioni||'').split('-')[0]);
    return (!isNaN(kg) && kg > 0 && !isNaN(rip) && rip > 0) ? b + (parseInt(ex.serie)||0)*rip*kg : b;
  }, 0), 0);
  const totalDone   = gymDays.reduce((a,d,di) => a + (d.esercizi||[]).filter((_,i)=>isGymDone(di,i)).length, 0);
  const completePct = totalEx > 0 ? Math.round(totalDone/totalEx*100) : 0;
  const actMult     = calcActivityMultiplier(trainingDays, totalVol);
  const actLabel    = trainingDays === 0 ? 'Sedentario' : trainingDays <= 2 ? 'Leggero' : trainingDays <= 4 ? 'Moderato' : trainingDays <= 6 ? 'Attivo' : 'Max';

  let statsHTML = '';
  let projHTML  = '';

  if (pd && (pd.peso || pd.altezza || pd.eta)) {
    const bmr     = calcBMR(pd);
    const tdee    = bmr ? Math.round(bmr * actMult) : 0;
    const balance = avgKcal && tdee ? avgKcal - tdee : null;
    const balClass = balance === null ? '' : balance > 0 ? ' surplus' : ' deficit';
    const balText  = balance === null ? '—' : (balance > 0 ? '+' : '') + balance;

    statsHTML = `<div class="analytics-stats-row">
      <div class="analytics-stat"><div class="analytics-stat-val">${bmr||'—'}</div><div class="analytics-stat-label">BMR kcal</div></div>
      <div class="analytics-stat"><div class="analytics-stat-val">${tdee||'—'}</div><div class="analytics-stat-label">TDEE${hasGymData ? ` · ${actLabel} ×${actMult.toFixed(2)}` : ' kcal'}</div></div>
      <div class="analytics-stat"><div class="analytics-stat-val">${avgKcal||'—'}</div><div class="analytics-stat-label">Scheda/die</div></div>
      <div class="analytics-stat${balClass}"><div class="analytics-stat-val">${balText}</div><div class="analytics-stat-label">Bilancio</div></div>
    </div>`;

    if (pd.obiettivo && pd.obiettivo !== 'mantenere' && pd.pesoObiettivo && pd.peso && balance !== null) {
      const kgDiff   = parseFloat(Math.abs(pd.peso - pd.pesoObiettivo).toFixed(1));
      const dirLabel = pd.obiettivo === 'dimagrire' ? 'Da perdere' : 'Da guadagnare';
      const onTrack  = (pd.obiettivo === 'dimagrire' && balance < 0) || (pd.obiettivo === 'massa' && balance > 0);

      let timeStr = '—', weeksNeeded = 0, gymProjNote = '';

      if (pd.obiettivo === 'massa') {
        // ── MASSA: limite fisiologico + vincolo calorico ──────────────────
        let kgPerMonth = 0.25;
        if (trainingDays >= 1) kgPerMonth = 0.40;
        if (trainingDays >= 3) kgPerMonth = 0.60;
        if (trainingDays >= 4) kgPerMonth = 0.75;
        if (trainingDays >= 5) kgPerMonth = 0.90;
        if (totalVol >= 5000)  kgPerMonth = Math.min(kgPerMonth + 0.08, 1.2);
        if (totalVol >= 15000) kgPerMonth = Math.min(kgPerMonth + 0.10, 1.5);
        // Vincolo calorico: senza surplus sufficiente la crescita rallenta
        if (balance !== null) {
          if (balance < 0)         kgPerMonth *= 0.30; // deficit → quasi impossibile crescere
          else if (balance < 150)  kgPerMonth *= 0.55; // surplus insufficiente
          else if (balance < 300)  kgPerMonth *= 0.80; // surplus borderline
          // balance >= 300: tasso pieno
        }

        const monthsNeeded = kgDiff / kgPerMonth;
        weeksNeeded = Math.round(monthsNeeded * 4.3);
        timeStr = monthsNeeded <= 3 ? Math.round(weeksNeeded) + ' settimane'
                : monthsNeeded < 12 ? monthsNeeded.toFixed(1) + ' mesi'
                : (monthsNeeded / 12).toFixed(1) + ' anni';

        // Composizione del gain — muscleRatio scala con frequenza + volume
        let muscleRatio = trainingDays >= 5 ? 0.72 : trainingDays >= 4 ? 0.65 : trainingDays >= 2 ? 0.55 : 0.40;
        if (totalVol >= 10000) muscleRatio = Math.min(muscleRatio + 0.05, 0.80);
        if (totalVol >= 20000) muscleRatio = Math.min(muscleRatio + 0.05, 0.80);
        const estMuscle   = parseFloat((kgDiff * muscleRatio).toFixed(1));
        const estFat      = parseFloat(Math.max(kgDiff - estMuscle, 0).toFixed(1));
        gymProjNote = `<div class="analytics-gym-proj">
          <div class="analytics-gym-proj-title">Composizione stimata del gain</div>
          <div class="analytics-gym-proj-row"><span>Massa muscolare</span><strong class="analytics-green">+${estMuscle} kg</strong></div>
          <div class="analytics-gym-proj-row"><span>Grasso corporeo</span><strong>+${estFat} kg</strong></div>
          <div class="analytics-gym-proj-note">${trainingDays} sessioni/sett · ~${kgPerMonth.toFixed(2)} kg/mese · volume ${totalVol > 0 ? Math.round(totalVol)+'kg/sett' : 'non registrato'}</div>
        </div>`;
        if (balance !== null && balance < 0)
          gymProjNote += `<div class="analytics-warn">⚠ Sei in deficit calorico: la crescita muscolare è quasi azzerata. Aumenta le kcal della scheda.</div>`;
        else if (balance !== null && balance < 300)
          gymProjNote += `<div class="analytics-warn">⚠ Surplus insufficiente (${Math.round(balance)} kcal/die): la crescita rallenta. Ideale ≥ 300 kcal di surplus.</div>`;

      } else if (pd.obiettivo === 'dimagrire' && Math.abs(balance) > 50) {
        // ── DIMAGRIRE: formula calorica (7700 kcal = 1kg grasso) ─────────
        // Più palestra → TDEE più alto → deficit più grande → più veloce
        const deficit     = Math.abs(balance); // kcal/die
        const daysNeeded  = Math.round((kgDiff * 7700) / deficit);
        weeksNeeded       = Math.round(daysNeeded / 7);
        timeStr = weeksNeeded <= 12 ? weeksNeeded + ' settimane'
                : (weeksNeeded / 4.3).toFixed(1) + ' mesi';

        // Con allenamento si preserva più massa magra
        // Più volume → più preservazione muscolare in deficit
        let fatRatio = trainingDays >= 4 ? 0.86 : trainingDays >= 2 ? 0.80 : trainingDays >= 1 ? 0.73 : 0.62;
        if (totalVol >= 10000) fatRatio = Math.min(fatRatio + 0.03, 0.92);
        const _fatRatio = fatRatio;
        const estFatLoss  = parseFloat((kgDiff * _fatRatio).toFixed(1));
        const estLeanLoss = parseFloat(Math.max(kgDiff - estFatLoss, 0).toFixed(1));
        gymProjNote = `<div class="analytics-gym-proj">
          <div class="analytics-gym-proj-title">Composizione stimata della perdita</div>
          <div class="analytics-gym-proj-row"><span>Grasso perso</span><strong class="analytics-green">−${estFatLoss} kg</strong></div>
          <div class="analytics-gym-proj-row"><span>Massa magra</span><strong>−${estLeanLoss} kg</strong></div>
          <div class="analytics-gym-proj-note">${trainingDays} sessioni/sett · deficit ${Math.round(deficit)} kcal/die</div>
        </div>`;
        if (!onTrack) gymProjNote += `<div class="analytics-warn">⚠ Bilancio in surplus: riduci le calorie o aumenta l'attività</div>`;
      }

      if (timeStr !== '—') {
        projHTML = `<div class="analytics-card">
          <div class="analytics-card-title">Proiezione obiettivo</div>
          <div class="analytics-proj-row">
            <div><div class="analytics-proj-label">Peso attuale</div><div class="analytics-proj-val">${pd.peso} kg</div></div>
            <div class="analytics-proj-arrow">→</div>
            <div><div class="analytics-proj-label">Obiettivo</div><div class="analytics-proj-val analytics-green">${pd.pesoObiettivo} kg</div></div>
          </div>
          <div class="analytics-proj-info">
            <span>${dirLabel}: <strong>${kgDiff} kg</strong></span>
            <span>Stima: <strong class="analytics-green">${timeStr}</strong></span>
          </div>
          ${gymProjNote}
          <canvas id="projectionChart" height="90"></canvas>
        </div>`;
      }
    }
  }

  let gymStatsHTML = '', gymChartHTML = '';
  if (hasGymData) {
    gymStatsHTML = `<div class="analytics-stats-row" style="margin-top:0">
      <div class="analytics-stat"><div class="analytics-stat-val">${trainingDays}</div><div class="analytics-stat-label">Sessioni/sett</div></div>
      <div class="analytics-stat"><div class="analytics-stat-val">${totalEx}</div><div class="analytics-stat-label">Esercizi/sett</div></div>
      <div class="analytics-stat"><div class="analytics-stat-val">${totalSets}</div><div class="analytics-stat-label">Serie totali</div></div>
      <div class="analytics-stat ${completePct===100?'surplus':''}"><div class="analytics-stat-val">${totalVol>0?Math.round(totalVol)+'kg':completePct+'%'}</div><div class="analytics-stat-label">${totalVol>0?'Volume sett.':'Completato'}</div></div>
    </div>`;
    gymChartHTML = `
    <div class="analytics-card">
      <div class="analytics-card-title">Completamento allenamenti · settimana</div>
      <canvas id="gymChart" height="100"></canvas>
    </div>
    ${totalVol > 0 ? `<div class="analytics-card">
      <div class="analytics-card-title">Volume stimato per giorno <span style="font-size:10px;font-weight:400;color:var(--text-mid)">(serie × rip × kg)</span></div>
      <canvas id="volChart" height="100"></canvas>
    </div>` : ''}`;
  }

  const noProfile = !pd || (!pd.peso && !pd.eta);
  const noProfileNote = noProfile ? `<div class="analytics-note">Aggiungi i tuoi dati fisici in Impostazioni per vedere BMR, TDEE e la proiezione obiettivo.</div>` : '';

  // Macro medie settimanali
  const wm = calcWeekAvgMacros();
  const macroTotal = wm.p * 4 + wm.c * 4 + wm.g * 9;
  const pPct = macroTotal > 0 ? Math.round(wm.p * 4 / macroTotal * 100) : 0;
  const cPct = macroTotal > 0 ? Math.round(wm.c * 4 / macroTotal * 100) : 0;
  const gPct = macroTotal > 0 ? Math.round(wm.g * 9 / macroTotal * 100) : 0;
  const macroCardHTML = wm.p > 0 || wm.c > 0 ? `
    <div class="analytics-card">
      <div class="analytics-card-title">Macro medi/die · scheda</div>
      <div class="macro-stats-row">
        <div class="macro-stat-block macro-p"><div class="macro-stat-val">${wm.p}g</div><div class="macro-stat-lbl">Proteine · ${pPct}%</div></div>
        <div class="macro-stat-block macro-c"><div class="macro-stat-val">${wm.c}g</div><div class="macro-stat-lbl">Carbo · ${cPct}%</div></div>
        <div class="macro-stat-block macro-g"><div class="macro-stat-val">${wm.g}g</div><div class="macro-stat-lbl">Grassi · ${gPct}%</div></div>
      </div>
      <div class="macro-split-bar">
        <div class="macro-split-p" style="width:${pPct}%"></div>
        <div class="macro-split-c" style="width:${cPct}%"></div>
        <div class="macro-split-g" style="width:${gPct}%"></div>
      </div>
    </div>` : '';

  // Storico peso
  const wlog = (state.weightLog || []).slice(-30); // ultimi 30 giorni
  const weightChartHTML = wlog.length >= 2 ? `
    <div class="analytics-card">
      <div class="analytics-card-title">Andamento peso · ultimi ${wlog.length} giorni</div>
      <canvas id="weightChart" height="110"></canvas>
    </div>` : '';

  el.innerHTML = `
    ${noProfileNote}
    ${statsHTML ? `<div class="analytics-section-title">Alimentazione</div>${statsHTML}` : ''}
    ${macroCardHTML}
    ${weightChartHTML}
    ${projHTML}
    <div class="analytics-card">
      <div class="analytics-card-title">Kcal giornaliere · scheda</div>
      <canvas id="weeklyChart" height="120"></canvas>
    </div>
    <div class="analytics-card">
      <div class="analytics-card-title">Media kcal per pasto</div>
      <canvas id="mealsChart" height="160"></canvas>
    </div>
    ${hasGymData ? `<div class="analytics-section-title" style="margin-top:8px">Palestra</div>${gymStatsHTML}${gymChartHTML}` : ''}`;

  const chartDefaults = {
    color: '#888',
    borderColor: 'rgba(255,255,255,.06)',
    font: { family: "'DM Mono', monospace", size: 11 }
  };

  setTimeout(() => {
    // Weekly bar chart
    const wCtx = document.getElementById('weeklyChart')?.getContext('2d');
    if (wCtx && typeof Chart !== 'undefined') {
      _chartWeekly = new Chart(wCtx, {
        type: 'bar',
        data: {
          labels: GIORNI_SHORT,
          datasets: [{ data: weekKcal,
            backgroundColor: weekKcal.map((_,i) => i===today ? 'rgba(184,245,102,.85)' : 'rgba(184,245,102,.3)'),
            borderRadius: 6, borderSkipped: false }]
        },
        options: {
          responsive: true,
          plugins: { legend: {display:false}, tooltip: { callbacks: { label: c => c.raw + ' kcal' } } },
          scales: {
            x: { grid:{display:false}, ticks: { color:'#888', font:{size:11} } },
            y: { grid: { color:'rgba(255,255,255,.06)' }, ticks: { color:'#888', font:{size:11} } }
          }
        }
      });
    }

    // Meals doughnut
    const mCtx = document.getElementById('mealsChart')?.getContext('2d');
    if (mCtx && typeof Chart !== 'undefined') {
      _chartMeals = new Chart(mCtx, {
        type: 'doughnut',
        data: {
          labels: Object.values(MEAL_LABELS),
          datasets: [{ data: mealAvgKcal,
            backgroundColor: ['rgba(184,245,102,.8)','rgba(100,180,255,.8)','rgba(255,180,50,.8)','rgba(200,100,255,.8)'],
            borderWidth: 0 }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position:'bottom', labels: { color:'#aaa', font:{size:11}, padding:12, boxWidth:12 } },
            tooltip: { callbacks: { label: c => c.label + ': ' + c.raw + ' kcal' } }
          }
        }
      });
    }

    // Gym completion stacked bar
    const gCtx = document.getElementById('gymChart')?.getContext('2d');
    if (gCtx && typeof Chart !== 'undefined' && hasGymData) {
      const gymDayStats = gymDays.map((d,di) => {
        const exs = d.esercizi||[];
        const isRest = (d.nome||'').toLowerCase()==='riposo';
        const done = exs.filter((_,i)=>isGymDone(di,i)).length;
        return { total: exs.length, done, remaining: exs.length-done, isRest };
      });
      _chartGym = new Chart(gCtx, {
        type: 'bar',
        data: {
          labels: GIORNI_SHORT,
          datasets: [
            { label:'Completati', data: gymDayStats.map(s=>s.done),
              backgroundColor: gymDayStats.map(s => s.isRest ? 'transparent' : 'rgba(100,180,255,.85)'),
              borderRadius: 6, borderSkipped: false, stack:'gym' },
            { label:'Rimanenti', data: gymDayStats.map(s=>s.remaining),
              backgroundColor: gymDayStats.map(s => s.isRest ? 'transparent' : 'rgba(100,180,255,.2)'),
              borderRadius: 6, borderSkipped: false, stack:'gym' }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position:'bottom', labels:{color:'#aaa',font:{size:11},padding:12,boxWidth:12} },
            tooltip: { callbacks: { label: c => c.dataset.label+': '+c.raw+' es.' } }
          },
          scales: {
            x: { grid:{display:false}, ticks:{color:'#888',font:{size:11}}, stacked:true },
            y: { grid:{color:'rgba(255,255,255,.06)'}, ticks:{color:'#888',font:{size:11},stepSize:1}, stacked:true }
          }
        }
      });
    }

    // Volume per day bar
    const vCtx = document.getElementById('volChart')?.getContext('2d');
    if (vCtx && typeof Chart !== 'undefined' && hasGymData) {
      const volData = gymDays.map(d => (d.esercizi||[]).reduce((a,ex) => {
        const kg  = parseFloat(ex.kg);
        const rip = parseInt((ex.ripetizioni||'').split('-')[0]);
        return (!isNaN(kg)&&kg>0&&!isNaN(rip)&&rip>0) ? a+(parseInt(ex.serie)||0)*rip*kg : a;
      }, 0));
      _chartVol = new Chart(vCtx, {
        type: 'bar',
        data: {
          labels: GIORNI_SHORT,
          datasets: [{ label:'Volume (kg)', data: volData,
            backgroundColor: volData.map((_,i) => i===today ? 'rgba(100,180,255,.85)' : 'rgba(100,180,255,.3)'),
            borderRadius: 6, borderSkipped: false }]
        },
        options: {
          responsive: true,
          plugins: { legend:{display:false}, tooltip:{callbacks:{label:c=>Math.round(c.raw)+' kg'}} },
          scales: {
            x: { grid:{display:false}, ticks:{color:'#888',font:{size:11}} },
            y: { grid:{color:'rgba(255,255,255,.06)'}, ticks:{color:'#888',font:{size:11}} }
          }
        }
      });
    }

    // Projection line chart
    if (pd?.pesoObiettivo && pd?.peso && pd?.obiettivo && pd.obiettivo !== 'mantenere') {
      const pCtx = document.getElementById('projectionChart')?.getContext('2d');
      const kgDiff2 = Math.abs(pd.peso - pd.pesoObiettivo);
      let weeksMax = 0, pts = [];

      if (pd.obiettivo === 'massa') {
        let kgPerMonth2 = 0.25;
        if (trainingDays >= 1) kgPerMonth2 = 0.40;
        if (trainingDays >= 3) kgPerMonth2 = 0.60;
        if (trainingDays >= 4) kgPerMonth2 = 0.75;
        if (trainingDays >= 5) kgPerMonth2 = 0.90;
        if (totalVol >= 5000)  kgPerMonth2 = Math.min(kgPerMonth2 + 0.08, 1.2);
        if (totalVol >= 15000) kgPerMonth2 = Math.min(kgPerMonth2 + 0.10, 1.5);
        if (balance !== null) {
          if (balance < 0)        kgPerMonth2 *= 0.30;
          else if (balance < 150) kgPerMonth2 *= 0.55;
          else if (balance < 300) kgPerMonth2 *= 0.80;
        }
        const kgPerWeek2 = kgPerMonth2 / 4.3;
        weeksMax = Math.min(Math.ceil(kgDiff2 / kgPerWeek2) + 1, 120);
        pts = Array.from({length: weeksMax+1}, (_,i) => {
          return parseFloat(Math.min(pd.peso + kgPerWeek2 * i, pd.pesoObiettivo).toFixed(1));
        });
      } else {
        // dimagrire: usa il bilancio calorico reale con TDEE palestra
        const bal2 = balance; // già calcolato con actMult
        if (Math.abs(bal2) > 50) {
          weeksMax = Math.min(Math.round((kgDiff2 * 7700) / (Math.abs(bal2) * 7)) + 1, 120);
          pts = Array.from({length: weeksMax+1}, (_,i) => {
            const kg = pd.peso + (bal2 / 7700) * 7 * i;
            return parseFloat(kg.toFixed(1));
          });
        }
      }

      if (pCtx && pts.length > 1 && typeof Chart !== 'undefined') {
        const lbls = pts.map((_,i) => i===0 ? 'Oggi' : i===weeksMax ? 'Traguardo' : i%4===0 ? Math.round(i/4.3)+'m' : '');
        _chartProjection = new Chart(pCtx, {
          type: 'line',
          data: {
            labels: lbls,
            datasets: [{
              data: pts,
              borderColor: 'rgba(184,245,102,.8)',
              backgroundColor: 'rgba(184,245,102,.1)',
              fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 4
            }]
          },
          options: {
            responsive: true,
            plugins: { legend:{display:false}, tooltip: { callbacks: { label: c => c.raw+' kg' } } },
            scales: {
              x: { grid:{display:false}, ticks:{color:'#888',font:{size:10}} },
              y: { grid:{color:'rgba(255,255,255,.06)'}, ticks:{color:'#888',font:{size:10}} }
            }
          }
        });
      }
    }

    // Weight history line chart
    const wCtx2 = document.getElementById('weightChart')?.getContext('2d');
    if (wCtx2 && wlog.length >= 2 && typeof Chart !== 'undefined') {
      const wLabels = wlog.map(e => e.date.slice(5)); // MM-DD
      const wData   = wlog.map(e => e.kg);
      const wMin = Math.floor(Math.min(...wData) - 1);
      const wMax = Math.ceil(Math.max(...wData) + 1);
      // Overlay proiezione se disponibile
      const datasets = [{
        label: 'Peso reale',
        data: wData,
        borderColor: 'rgba(184,245,102,.9)',
        backgroundColor: 'rgba(184,245,102,.08)',
        fill: true, tension: 0.3, pointRadius: 3, pointHoverRadius: 5,
        pointBackgroundColor: 'rgba(184,245,102,.9)'
      }];
      _chartWeight = new Chart(wCtx2, {
        type: 'line',
        data: { labels: wLabels, datasets },
        options: {
          responsive: true,
          plugins: { legend:{display:false}, tooltip:{callbacks:{label:c=>c.raw+' kg'}} },
          scales: {
            x: { grid:{display:false}, ticks:{color:'#888',font:{size:10}} },
            y: { min:wMin, max:wMax, grid:{color:'rgba(255,255,255,.06)'}, ticks:{color:'#888',font:{size:10}} }
          }
        }
      });
    }
  }, 50);
}

function toggleGymExTracker(d,i) {
  state.gymLog[gymLogKey(d,i)] = !isGymDone(d,i);
  save();
  renderTracker();
  renderHomePalestra();
}

function _refreshTracker() {
  if (document.getElementById('view-tracker')?.classList.contains('active')) renderTracker();
}

function renderTracker() {
  renderTrackerAnalytics();
  document.getElementById('trackerContent').innerHTML = GIORNI.map((g,di) => {
    // FOOD
    const cnt      = MEAL_KEYS.filter(k=>isDone(di,k)).length;
    const mealDots = MEAL_KEYS.map(k=>`<div class="score-dot ${isDone(di,k)?'done':''}"></div>`).join('');
    const mealRows = MEAL_KEYS.map(k=>{
      const d=isDone(di,k);
      return `<div class="tracker-meal-row"><div class="tracker-cb ${d?'checked':''}" onclick="event.stopPropagation();toggleMeal(${di},'${k}');renderTracker()"></div><span class="tracker-meal-name ${d?'done':''}">${MEAL_LABELS[k]} · ${state.mealData.times[k]}</span></div>`;
    }).join('');

    // GYM
    const gd      = state.gymData.giorni[di] || {};
    const gNome   = gd.nome || '';
    const gExs    = gd.esercizi || [];
    const isRest  = gNome.toLowerCase() === 'riposo';
    const gDone   = gExs.filter((_,i)=>isGymDone(di,i)).length;
    const gymDots = gExs.map((_,i)=>`<div class="score-dot gym ${isGymDone(di,i)?'done':''}"></div>`).join('');

    const gymHeaderPart = gExs.length > 0 && !isRest
      ? `<span class="tracker-divider">│</span><div class="score-bar">${gymDots}</div><span style="color:var(--text-soft)">${gDone}/${gExs.length}</span>`
      : isRest ? `<span class="tracker-divider">│</span><span style="font-size:10px;color:var(--text-soft)">🛌</span>` : '';

    const gymDetailRows = isRest
      ? `<div class="tracker-rest-row">🛌 Giorno di riposo</div>`
      : gExs.length === 0
        ? `<div class="tracker-rest-row">Nessun allenamento pianificato</div>`
        : gExs.map((ex,i) => {
            const done = isGymDone(di,i);
            const stats = [
              ex.serie&&ex.ripetizioni ? `${ex.serie}×${ex.ripetizioni}` : '',
              ex.kg ? `${ex.kg}kg` : '',
              ex.recupero ? `⏱${ex.recupero}` : ''
            ].filter(Boolean).join(' · ');
            return `<div class="tracker-meal-row"><div class="tracker-cb gym ${done?'checked':''}" onclick="event.stopPropagation();toggleGymExTracker(${di},${i})"></div><span class="tracker-meal-name ${done?'done':''}">${ex.nome||'Esercizio'}${stats?`<span class="tracker-ex-stats"> · ${stats}</span>`:''}</span></div>`;
          }).join('');

    const isT = di===today;
    return `<div class="tracker-day" style="${isT?'border-color:rgba(184,245,102,.3)':''}">
      <div class="tracker-day-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
        <span class="tracker-day-name">${g}${isT?' <span style="font-size:10px;color:var(--green);font-family:var(--mono)">· OGGI</span>':''}</span>
        <span style="display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:12px"><div class="score-bar">${mealDots}</div>${cnt}/4${gymHeaderPart}</span>
      </div>
      <div class="tracker-meals" style="display:${isT?'block':'none'}">
        <div class="tracker-section-label">Pasti</div>
        ${mealRows}
        <div class="tracker-section-label" style="margin-top:12px">Allenamento${gNome&&!isRest?` · <em style="color:var(--text)">${gNome}</em>`:''}${gExs.length>0&&!isRest?` <span style="font-family:var(--mono);color:var(--text-mid)">${gDone}/${gExs.length}</span>`:''}</div>
        ${gymDetailRows}
      </div>
    </div>`;
  }).join('');
}

const shopKey = (ci,i) => `s_${ci}_${i}`;
const isShopDone = (ci,i) => !!state.shop[shopKey(ci,i)];
function renderShop() {
  const tot = state.shopData.reduce((a,c)=>a+c.items.length,0);
  const done = state.shopData.reduce((a,c,ci)=>a+c.items.filter((_,i)=>isShopDone(ci,i)).length,0);
  const pct = tot?Math.round(done/tot*100):0;
  document.getElementById('shopPct').textContent = pct+'%';
  document.getElementById('shopProgFill').style.width = pct+'%';
  document.getElementById('shopContent').innerHTML = state.shopData.map((cat,ci)=>`
    <div class="shop-cat"><div class="shop-cat-title">${cat.cat}</div>
      ${cat.items.map((item,i)=>{const d=isShopDone(ci,i);return`<div class="shop-item ${d?'bought':''}" onclick="toggleShop(${ci},${i})"><div class="shop-cb2 ${d?'checked':''}"></div><span class="shop-name">${item.name}</span><span class="shop-qty">${item.qty}</span></div>`;}).join('')}
    </div>`).join('');
}
function toggleShop(ci,i) { state.shop[shopKey(ci,i)]=!state.shop[shopKey(ci,i)]; save(); renderShop(); }
function resetShop() { state.shop={}; save(); renderShop(); }
function checkAll() { state.shopData.forEach((c,ci)=>c.items.forEach((_,i)=>{state.shop[shopKey(ci,i)]=true;})); save(); renderShop(); }

function renderTimer() {
  const now=new Date(), times=state.mealData.times;
  const mt=MEAL_KEYS.map(k=>{const[h,m]=times[k].split(':').map(Number);const t=new Date();t.setHours(h,m,0,0);return{key:k,date:t};}).sort((a,b)=>a.date-b.date);
  const next=(mt.find(m=>m.date>now)||mt[0]);
  const foods=state.mealData.days[currentDay]?.[next.key]||[];
  document.getElementById('timerMealName').textContent=MEAL_LABELS[next.key];
  document.getElementById('timerMealFoods').textContent=foods.slice(0,2).join(' · ')+(foods.length>2?'…':'');
  if(timerInt)clearInterval(timerInt);
  const tick=()=>{
    const n=new Date();let diff=next.date-n;if(diff<0)diff+=86400000;
    const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);
    const el=document.getElementById('timerDisplay');
    el.textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    el.classList.toggle('urgent',diff<600000);
  };
  tick(); timerInt=setInterval(tick,1000);
  document.getElementById('scheduleList').innerHTML=mt.map(m=>{
    const isN=m.key===next.key,isPast=m.date<now&&!isN;
    return`<div class="sched-row ${isN?'next':''} ${isPast?'past':''}">
      <div class="sched-left"><div style="color:${isN?'var(--green)':'var(--text-mid)'}">${ICO[m.key]}</div><div><div class="sched-name">${MEAL_LABELS[m.key]}</div><div class="sched-status">${isN?'⟵ prossimo':isPast?'passato':'in arrivo'}</div></div></div>
      <span class="sched-time">${times[m.key]}</span>
    </div>`;
  }).join('');
}
function markNextDone() {
  const now=new Date(),times=state.mealData.times;
  const mt=MEAL_KEYS.map(k=>{const[h,mn]=times[k].split(':').map(Number);const t=new Date();t.setHours(h,mn,0,0);return{key:k,date:t};}).sort((a,b)=>a.date-b.date);
  const next=mt.find(m=>m.date>now)||mt[0];
  toggleMeal(currentDay,next.key); renderTimer();
}

function renderSettingsDayTabs() {
  document.getElementById('settingsDayTabs').innerHTML=GIORNI_SHORT.map((g,i)=>`<button class="day-tab ${i===settingsDay?'active':''}" onclick="selectSettingsDay(${i})">${g}</button>`).join('');
}
function selectSettingsDay(i) { settingsDay=i; renderSettingsDayTabs(); renderMealEditor(); }

function renderMealEditor() {
  const times=state.mealData.times;
  const dayData=state.mealData.days[settingsDay]||{};
  document.getElementById('mealEditorContainer').innerHTML=MEAL_KEYS.map(k=>`
    <div class="settings-row">
      <div class="settings-row-header">
        <div class="settings-row-name">${MEAL_LABELS[k]}</div>
        <div class="settings-row-time"><label>Orario</label><input class="time-input" type="time" id="time_${k}" value="${times[k]}"></div>
      </div>
      <div class="food-edit-list" id="foods_${k}">
        ${(dayData[k]||[]).map((f,i)=>{
          const p=parseFood(f);
          return `<div class="food-edit-row-wrap">
            <div class="food-edit-row">
              <input class="shop-edit-qty" type="text" value="${p.qty.replace(/"/g,'&quot;')}" id="fi-qty_${k}_${i}" placeholder="150g">
              <input class="food-edit-input" type="text" value="${p.name.replace(/"/g,'&quot;')}" id="fi-name_${k}_${i}" placeholder="alimento">
              <button class="del-btn" onclick="delFood('${k}',${i})">×</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <button class="add-food-btn" onclick="addFood('${k}')">+ Aggiungi alimento</button>
    </div>`).join('');
}
function addFood(k) {
  if(!state.mealData.days[settingsDay][k])state.mealData.days[settingsDay][k]=[];
  state.mealData.days[settingsDay][k].push(''); save(); renderMealEditor();
  const inputs=document.querySelectorAll(`#foods_${k} .food-edit-input`);
  if(inputs.length)inputs[inputs.length-1].focus();
}
function delFood(k,idx) {
  state.mealData.days[settingsDay][k].splice(idx,1);
  const generated = generateShopFromMeals(state.mealData);
  if (generated.length > 0) state.shopData = generated;
  save(); renderMealEditor(); renderShopEditor();
}
function _readMealEditorToState() {
  MEAL_KEYS.forEach(k => {
    const tEl = document.getElementById('time_' + k);
    if (tEl && tEl.value) state.mealData.times[k] = tEl.value;
    const nameInputs = document.querySelectorAll(`[id^="fi-name_${k}_"]`);
    if (nameInputs.length) {
      state.mealData.days[settingsDay][k] = Array.from(nameInputs).map((nameEl, i) => {
        const qtyEl = document.getElementById(`fi-qty_${k}_${i}`);
        return ((qtyEl?.value||'') + ' ' + nameEl.value).trim();
      }).filter(Boolean);
    }
  });
}

function saveMeals() {
  MEAL_KEYS.forEach(k=>{
    const tEl=document.getElementById('time_'+k);
    if(tEl&&tEl.value)state.mealData.times[k]=tEl.value;
    const nameInputs=document.querySelectorAll(`[id^="fi-name_${k}_"]`);
    state.mealData.days[settingsDay][k]=Array.from(nameInputs).map((nameEl,i)=>{
      const qtyEl=document.getElementById(`fi-qty_${k}_${i}`);
      return ((qtyEl?.value||'') + ' ' + nameEl.value).trim();
    }).filter(Boolean);
  });
  const generated = generateShopFromMeals(state.mealData);
  if (generated.length > 0) { state.shopData = generated; renderShopEditor(); }
  save(); renderMeals(); updateProgress(); _refreshTracker(); showToast('Pasti e lista spesa aggiornati!');
}

function renderShopEditor() {
  document.getElementById('shopEditorContainer').innerHTML=state.shopData.map((cat,ci)=>`
    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div class="shop-cat-title" style="border:none;padding:0;margin:0">${cat.cat}</div>
        <button class="del-btn" onclick="delShopCat(${ci})" style="font-size:12px;width:auto;padding:0 8px;color:var(--text-soft)">Rimuovi cat.</button>
      </div>
      <div id="shopEditCat_${ci}">
        ${cat.items.map((item,i)=>`<div class="shop-edit-row"><input class="shop-edit-name" type="text" value="${item.name.replace(/"/g,'&quot;')}" id="sn_${ci}_${i}" placeholder="Ingrediente"><input class="shop-edit-qty" type="text" value="${item.qty.replace(/"/g,'&quot;')}" id="sq_${ci}_${i}" placeholder="qtà"><button class="del-btn" onclick="delShopItem(${ci},${i})">×</button></div>`).join('')}
      </div>
      <button class="add-food-btn" style="margin-top:6px" onclick="addShopItem(${ci})">+ Aggiungi</button>
    </div>`).join('');
}
function addShopItem(ci) { state.shopData[ci].items.push({name:'',qty:''}); save(); renderShopEditor(); const rows=document.querySelectorAll(`#shopEditCat_${ci} .shop-edit-name`); if(rows.length)rows[rows.length-1].focus(); }
function delShopItem(ci,i) { state.shopData[ci].items.splice(i,1); save(); renderShopEditor(); }
function delShopCat(ci) { if(confirm('Rimuovere la categoria?')){state.shopData.splice(ci,1);save();renderShopEditor();} }
function addShopCategory() { const name=prompt('Nome categoria:'); if(!name)return; state.shopData.push({cat:name,items:[]}); save(); renderShopEditor(); }
function recalcShopFromMeals() {
  const generated = generateShopFromMeals(state.mealData);
  if (generated.length > 0) {
    state.shopData = generated;
    state.shop = {};
    save();
    renderShopEditor();
    showToast('Lista spesa ricalcolata!');
  }
}
function saveShop() {
  state.shopData.forEach((cat,ci)=>{
    cat.items.forEach((item,i)=>{
      const n=document.getElementById(`sn_${ci}_${i}`),q=document.getElementById(`sq_${ci}_${i}`);
      if(n)item.name=n.value.trim(); if(q)item.qty=q.value.trim();
    });
    cat.items=cat.items.filter(item=>item.name);
  });
  save(); renderShop(); showToast('Lista salvata!');
}

// ── GYM VIEW ──────────────────────────────────────────────
const gymLogKey = (d,i) => `g${d}_${i}`;
const isGymDone = (d,i) => !!state.gymLog[gymLogKey(d,i)];

function toggleGymEx(d,i) {
  state.gymLog[gymLogKey(d,i)] = !isGymDone(d,i);
  save();
  renderGymExercises();
}

function renderGymDayTabs() {
  document.getElementById('gymDayTabs').innerHTML = GIORNI_SHORT.map((g,i) => {
    const has = (state.gymData.giorni[i]?.esercizi||[]).length > 0;
    return `<button class="day-tab ${i===gymDay?'active':''} ${has&&i!==gymDay?'has-activity':''}" onclick="selectGymDay(${i})">${g}</button>`;
  }).join('');
}

function selectGymDay(i) { gymDay=i; renderGymDayTabs(); renderGymExercises(); }

function renderGymExercises() {
  if (!document.getElementById('gymExercises')) return;
  const dayData = state.gymData.giorni[gymDay] || {};
  const nome = dayData.nome || '';
  const esercizi = dayData.esercizi || [];

  const nameEl = document.getElementById('gymDayName');
  nameEl.innerHTML = nome && nome.toLowerCase() !== 'riposo'
    ? `<div class="gym-day-title">${nome}</div>` : '';

  const exEl = document.getElementById('gymExercises');
  if (esercizi.length === 0) {
    exEl.innerHTML = `<div class="gym-empty">${nome.toLowerCase()==='riposo'?'🛌 Giorno di riposo':'Nessun esercizio per questo giorno'}</div>`;
    return;
  }

  const doneCnt = esercizi.filter((_,i) => isGymDone(gymDay,i)).length;
  exEl.innerHTML = `
    <div class="gym-progress">
      <div class="gym-prog-bar"><div class="gym-prog-fill" style="width:${esercizi.length?Math.round(doneCnt/esercizi.length*100):0}%"></div></div>
      <span class="gym-prog-label">${doneCnt}/${esercizi.length}</span>
    </div>
    ${esercizi.map((ex,i) => {
      const done = isGymDone(gymDay,i);
      return `<div class="gym-ex-card ${done?'done':''}" onclick="toggleGymEx(${gymDay},${i})">
        <div class="gym-ex-header">
          <div class="gym-ex-name">${ex.nome}</div>
          <div class="gym-ex-check ${done?'checked':''}">${done?'<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}</div>
        </div>
        <div class="gym-ex-stats">
          <span class="gym-ex-stat">${ex.serie} serie × ${ex.ripetizioni}</span>
          ${ex.recupero ? `<span class="gym-ex-sep">·</span><span class="gym-ex-rec">rec. ${ex.recupero}</span>` : ''}
        </div>
        ${ex.note ? `<div class="gym-ex-note">${ex.note}</div>` : ''}
      </div>`;
    }).join('')}`;
}

// ── PESO LOG ─────────────────────────────────────────────
function renderWeightCard() {
  const el = document.getElementById('weightCard');
  if (!el) return;
  const log = state.weightLog || [];
  const todayStr = new Date().toISOString().slice(0,10);
  const todayEntry = log.find(e => e.date === todayStr);
  const last = log.length > 0 ? log[log.length - 1] : null;
  const prev = log.length > 1 ? log[log.length - 2] : null;
  const delta = (last && prev) ? (last.kg - prev.kg) : null;
  const deltaStr = delta !== null ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)) + ' kg' : '';
  const deltaColor = delta === null ? '' : delta > 0 ? (state.profileData?.obiettivo === 'dimagrire' ? 'color:#ff6b6b' : 'color:var(--green)') : (state.profileData?.obiettivo === 'massa' ? 'color:#ff6b6b' : 'color:var(--green)');

  el.innerHTML = `<div class="weight-card">
    <div class="weight-card-left">
      <div class="weight-card-label">Peso oggi</div>
      <div class="weight-card-val">${todayEntry ? todayEntry.kg + ' kg' : (last ? last.kg + ' kg' : (state.profileData?.peso ? state.profileData.peso + ' kg' : '—'))}</div>
      ${deltaStr ? `<div class="weight-card-delta" style="${deltaColor}">${deltaStr} dall'ultima</div>` : ''}
    </div>
    <div class="weight-card-right">
      <input class="weight-input" type="number" step="0.1" min="30" max="300" id="weightInput" placeholder="${todayEntry ? todayEntry.kg : 'kg'}" ${todayEntry ? `value="${todayEntry.kg}"` : ''}>
      <button class="weight-save-btn" onclick="logWeight()">✓</button>
    </div>
  </div>`;
}

function logWeight() {
  const input = document.getElementById('weightInput');
  const val = parseFloat(input?.value);
  if (!val || val < 30 || val > 300) return;
  const todayStr = new Date().toISOString().slice(0,10);
  if (!state.weightLog) state.weightLog = [];
  const idx = state.weightLog.findIndex(e => e.date === todayStr);
  if (idx >= 0) state.weightLog[idx].kg = val;
  else state.weightLog.push({ date: todayStr, kg: val });
  // Aggiorna anche profileData.peso così i calcoli BMR/TDEE restano aggiornati
  if (!state.profileData) state.profileData = {};
  state.profileData.peso = val;
  save();
  renderWeightCard();
  _refreshTracker();
}

function renderGym() {
  const hasData = Object.values(state.gymData.giorni).some(d => (d.esercizi||[]).length > 0);
  document.getElementById('gymNoData').style.display  = hasData ? 'none' : 'block';
  document.getElementById('gymContent').style.display = hasData ? 'block' : 'none';
  if (!hasData) return;
  renderGymDayTabs();
  renderGymExercises();
  gymSwatchRender();
}

// ── HOME PALESTRA SUB-TAB ────────────────────────────────
function renderHomePalestra() {
  const el = document.getElementById('homePalestra');
  if (!el || el.style.display === 'none') return;
  gymSwatchRender();
  const hasAny = Object.values(state.gymData.giorni).some(d => (d.esercizi||[]).length > 0);
  const dayData = state.gymData.giorni[currentDay] || {};
  const nome = dayData.nome || '';
  const esercizi = dayData.esercizi || [];
  const isRest = nome.toLowerCase() === 'riposo';
  let html = '';
  if (!hasAny) {
    html = `<div class="gym-no-data" style="padding:32px 0">
      <div class="gym-no-data-icon">🏋️</div>
      <div class="gym-no-data-text">Nessuna scheda caricata</div>
      <div class="gym-no-data-sub">Importa la scheda in Impostazioni, o aggiungila in Schede → Palestra.</div>
    </div>`;
  } else {
    if (nome && !isRest) html += `<div class="gym-day-badge">${nome}</div>`;
    if (isRest || esercizi.length === 0) {
      html += `<div class="gym-home-rest">${isRest ? '🛌 Giorno di riposo' : 'Nessun allenamento oggi'}</div>`;
    } else {
      const doneCnt = esercizi.filter((_,i) => isGymDone(currentDay,i)).length;
      html += `<div class="gym-progress" style="margin-bottom:10px">
        <div class="gym-prog-bar"><div class="gym-prog-fill" style="width:${Math.round(doneCnt/esercizi.length*100)}%"></div></div>
        <span class="gym-prog-label">${doneCnt}/${esercizi.length}</span>
      </div>`;
      html += esercizi.map((ex,i) => {
        const done = isGymDone(currentDay,i);
        const statsLine = [
          ex.serie && ex.ripetizioni ? `${ex.serie} × ${ex.ripetizioni}` : '',
          ex.kg ? `${ex.kg} kg` : '',
          ex.recupero ? `rec. ${ex.recupero}` : ''
        ].filter(Boolean).join(' · ');
        return `<div class="meal-card ${done?'done':''}" id="home-gym-card-${i}">
          <div class="meal-header" onclick="toggleGymExHome(${currentDay},${i})">
            <div class="meal-icon-wrap" style="color:${done?'var(--green)':'var(--text-mid)'}">💪</div>
            <div class="meal-info">
              <div class="meal-name">${ex.nome||'Esercizio '+(i+1)}</div>
              <div class="meal-time">${statsLine}</div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              <button onclick="event.stopPropagation();toggleHomeGymEdit(${i})" style="background:none;border:none;cursor:pointer;padding:4px;color:var(--text-soft);display:flex;align-items:center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <div class="meal-check ${done?'checked':''}">${done?'<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="#0a0a0a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>':''}</div>
            </div>
          </div>
          <div class="meal-edit-panel" id="home-gym-edit-${i}" style="display:none;padding:0 16px 14px 16px;border-top:1px solid var(--border)">
            <div style="margin-top:10px;display:grid;grid-template-columns:1fr 1fr;gap:6px">
              <div style="grid-column:1/-1"><label class="gym-edit-label">Nome</label><input class="food-edit-input gym-edit-inp" id="hge-nome-${i}" value="${(ex.nome||'').replace(/"/g,'&quot;')}"></div>
              <div><label class="gym-edit-label">Serie</label><input class="food-edit-input gym-edit-inp" type="number" id="hge-serie-${i}" value="${ex.serie||''}"></div>
              <div><label class="gym-edit-label">Ripetizioni</label><input class="food-edit-input gym-edit-inp" id="hge-rip-${i}" value="${(ex.ripetizioni||'').replace(/"/g,'&quot;')}"></div>
              <div><label class="gym-edit-label">Kg</label><input class="food-edit-input gym-edit-inp" id="hge-kg-${i}" value="${(ex.kg||'').replace(/"/g,'&quot;')}" placeholder="es. 60"></div>
              <div><label class="gym-edit-label">Recupero</label><input class="food-edit-input gym-edit-inp" id="hge-rec-${i}" value="${(ex.recupero||'').replace(/"/g,'&quot;')}"></div>
              <div style="grid-column:1/-1"><label class="gym-edit-label">Note</label><input class="food-edit-input gym-edit-inp" id="hge-note-${i}" value="${(ex.note||'').replace(/"/g,'&quot;')}"></div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px">
              <button onclick="delGymExHome(${currentDay},${i})" style="background:none;border:1px solid rgba(255,85,85,.3);border-radius:20px;padding:5px 12px;font-family:var(--font);font-size:11px;color:#ff5555;cursor:pointer">Elimina</button>
              <div style="display:flex;gap:6px">
                <button onclick="toggleHomeGymEdit(${i})" style="background:none;border:1px solid var(--border2);border-radius:20px;padding:6px 12px;font-family:var(--font);font-size:12px;color:var(--text-mid);cursor:pointer">Annulla</button>
                <button onclick="saveHomeGymEdit(${currentDay},${i})" style="background:var(--green);color:#0a0a0a;border:none;border-radius:20px;padding:6px 16px;font-family:var(--font);font-size:12px;font-weight:700;cursor:pointer">Salva</button>
              </div>
            </div>
          </div>
        </div>`;
      }).join('');
    }
    if (!isRest) html += `<button class="add-food-btn" onclick="addGymExHome()" style="margin-top:8px;width:100%">+ Aggiungi esercizio</button>`;
  }
  document.getElementById('homeGymContent').innerHTML = html;
}

function toggleGymExHome(d,i) {
  state.gymLog[gymLogKey(d,i)] = !isGymDone(d,i);
  save();
  renderHomePalestra();
}

function toggleHomeGymEdit(i) {
  const panel = document.getElementById('home-gym-edit-' + i);
  if (!panel) return;
  const isOpen = panel.style.display !== 'none';
  document.querySelectorAll('[id^="home-gym-edit-"]').forEach(p => p.style.display = 'none');
  if (!isOpen) panel.style.display = 'block';
}

function saveHomeGymEdit(d,i) {
  const dayData = state.gymData.giorni[d];
  if (!dayData?.esercizi?.[i]) return;
  const ex = dayData.esercizi[i];
  const nome = document.getElementById(`hge-nome-${i}`)?.value?.trim();
  const serie = parseInt(document.getElementById(`hge-serie-${i}`)?.value);
  const rip  = document.getElementById(`hge-rip-${i}`)?.value?.trim();
  const kg   = document.getElementById(`hge-kg-${i}`)?.value?.trim();
  const rec  = document.getElementById(`hge-rec-${i}`)?.value?.trim();
  const note = document.getElementById(`hge-note-${i}`)?.value?.trim();
  if (nome  !== undefined) ex.nome = nome;
  if (!isNaN(serie) && serie > 0) ex.serie = serie;
  if (rip   !== undefined) ex.ripetizioni = rip;
  if (kg    !== undefined) ex.kg = kg;
  if (rec   !== undefined) ex.recupero = rec;
  if (note  !== undefined) ex.note = note;
  save();
  renderHomePalestra();
  showToast('Esercizio aggiornato!');
}

function addGymExHome() {
  if (!state.gymData.giorni[currentDay]) state.gymData.giorni[currentDay] = { nome:'', esercizi:[] };
  state.gymData.giorni[currentDay].esercizi.push({ nome:'', serie:3, ripetizioni:'10', kg:'', recupero:'', note:'' });
  save();
  renderHomePalestra();
  const idx = state.gymData.giorni[currentDay].esercizi.length - 1;
  setTimeout(() => toggleHomeGymEdit(idx), 50);
}

function delGymExHome(d,i) {
  if (!state.gymData.giorni[d]?.esercizi) return;
  state.gymData.giorni[d].esercizi.splice(i,1);
  save();
  renderHomePalestra();
}

// ── GYM EDITOR (Schede > Palestra) ───────────────────────
function renderGymEditorDayTabs() {
  const el = document.getElementById('gymEditorDayTabs');
  if (!el) return;
  el.innerHTML = GIORNI_SHORT.map((g,i) => {
    const has = (state.gymData.giorni[i]?.esercizi||[]).length > 0;
    return `<button class="day-tab ${i===schedeGymDay?'active':''} ${has&&i!==schedeGymDay?'has-activity':''}" onclick="selectGymEditorDay(${i})">${g}</button>`;
  }).join('');
}

function selectGymEditorDay(i) { schedeGymDay=i; renderGymEditorDayTabs(); renderGymEditor(); }

function renderGymEditor() {
  const el = document.getElementById('gymEditorContainer');
  if (!el) return;
  if (!state.gymData.giorni[schedeGymDay]) state.gymData.giorni[schedeGymDay] = { nome:'', esercizi:[] };
  const dayData = state.gymData.giorni[schedeGymDay];
  const esercizi = dayData.esercizi || [];
  el.innerHTML = `
    <div style="margin-bottom:14px">
      <label class="gym-edit-label">Nome allenamento del giorno</label>
      <input class="modal-input" style="margin-top:6px" type="text" id="gym-day-nome" value="${(dayData.nome||'').replace(/"/g,'&quot;')}" placeholder="Es. Push · Petto-Spalle · Riposo">
    </div>
    <div id="gymExEditorList">
      ${esercizi.map((ex,i) => `<div class="gym-ex-editor-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:10px;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.08em">Esercizio ${i+1}</span>
          <button class="del-btn" onclick="delGymExercise(${i})">×</button>
        </div>
        <div style="margin-bottom:6px">
          <label class="gym-edit-label">Nome</label>
          <input class="food-edit-input gym-edit-inp" style="display:block;width:100%;margin-top:4px" id="ge-nome-${i}" value="${ex.nome.replace(/"/g,'&quot;')}" placeholder="Nome esercizio">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:6px">
          <div><label class="gym-edit-label">Serie</label><input class="food-edit-input gym-edit-inp" style="display:block;width:100%;margin-top:4px" type="number" id="ge-serie-${i}" value="${ex.serie}" placeholder="4"></div>
          <div><label class="gym-edit-label">Ripetizioni</label><input class="food-edit-input gym-edit-inp" style="display:block;width:100%;margin-top:4px" id="ge-rip-${i}" value="${ex.ripetizioni.replace(/"/g,'&quot;')}" placeholder="8-10"></div>
          <div><label class="gym-edit-label">Kg</label><input class="food-edit-input gym-edit-inp" style="display:block;width:100%;margin-top:4px" id="ge-kg-${i}" value="${(ex.kg||'').replace(/"/g,'&quot;')}" placeholder="60"></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
          <div><label class="gym-edit-label">Recupero</label><input class="food-edit-input gym-edit-inp" style="display:block;width:100%;margin-top:4px" id="ge-rec-${i}" value="${(ex.recupero||'').replace(/"/g,'&quot;')}" placeholder="90s"></div>
          <div><label class="gym-edit-label">Note</label><input class="food-edit-input gym-edit-inp" style="display:block;width:100%;margin-top:4px" id="ge-note-${i}" value="${(ex.note||'').replace(/"/g,'&quot;')}" placeholder="opzionale"></div>
        </div>
      </div>`).join('')}
    </div>
    <button class="add-food-btn" onclick="addGymExercise()" style="margin-top:4px">+ Aggiungi esercizio</button>`;
}

function _readGymEditorToState() {
  if (!state.gymData.giorni[schedeGymDay]) return;
  const nomeEl = document.getElementById('gym-day-nome');
  if (nomeEl) state.gymData.giorni[schedeGymDay].nome = nomeEl.value.trim();
  state.gymData.giorni[schedeGymDay].esercizi.forEach((ex,i) => {
    const nome = document.getElementById(`ge-nome-${i}`)?.value?.trim();
    const serie = parseInt(document.getElementById(`ge-serie-${i}`)?.value);
    const rip = document.getElementById(`ge-rip-${i}`)?.value?.trim();
    const kg = document.getElementById(`ge-kg-${i}`)?.value?.trim();
    const rec = document.getElementById(`ge-rec-${i}`)?.value?.trim();
    const note = document.getElementById(`ge-note-${i}`)?.value?.trim();
    if (nome) ex.nome = nome;
    if (!isNaN(serie) && serie > 0) ex.serie = serie;
    if (rip !== undefined) ex.ripetizioni = rip;
    if (kg !== undefined) ex.kg = kg;
    if (rec !== undefined) ex.recupero = rec;
    if (note !== undefined) ex.note = note;
  });
}

function addGymExercise() {
  _readGymEditorToState();
  state.gymData.giorni[schedeGymDay].esercizi.push({ nome:'', serie:3, ripetizioni:'10', kg:'', recupero:'', note:'' });
  save();
  renderGymEditor();
  const inputs = document.querySelectorAll('[id^="ge-nome-"]');
  if (inputs.length) inputs[inputs.length-1].focus();
}

function delGymExercise(idx) {
  _readGymEditorToState();
  state.gymData.giorni[schedeGymDay].esercizi.splice(idx,1);
  save();
  renderGymEditor();
  renderGymEditorDayTabs();
}

function saveGymExercises() {
  _readGymEditorToState();
  save();
  renderGymEditorDayTabs();
  renderHomePalestra();
  _refreshTracker();
  showToast('Scheda palestra salvata!');
}

// ── GYM STOPWATCH ─────────────────────────────────────────
let _gymSwatchMs = 0, _gymSwatchRunning = false, _gymSwatchInterval = null;

function gymSwatchRender() {
  const el = document.getElementById('gymSwatchDisplay');
  if (!el) return;
  const total = Math.floor(_gymSwatchMs / 1000);
  const m = Math.floor(total / 60), s = total % 60;
  el.textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function gymSwatchToggle() {
  if (_gymSwatchRunning) {
    clearInterval(_gymSwatchInterval); _gymSwatchInterval = null; _gymSwatchRunning = false;
    const btn = document.getElementById('gymSwatchBtn');
    if (btn) { btn.textContent = '▶ Riprendi'; btn.classList.remove('running'); }
  } else {
    const startMs = Date.now() - _gymSwatchMs;
    _gymSwatchInterval = setInterval(() => { _gymSwatchMs = Date.now() - startMs; gymSwatchRender(); }, 100);
    _gymSwatchRunning = true;
    const btn = document.getElementById('gymSwatchBtn');
    if (btn) { btn.textContent = '⏸ Pausa'; btn.classList.add('running'); }
  }
}

function gymSwatchReset() {
  clearInterval(_gymSwatchInterval); _gymSwatchInterval = null; _gymSwatchRunning = false;
  _gymSwatchMs = 0;
  gymSwatchRender();
  const btn = document.getElementById('gymSwatchBtn');
  if (btn) { btn.textContent = '▶ Avvia'; btn.classList.remove('running'); }
}

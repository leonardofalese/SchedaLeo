// ── INIT APP ──────────────────────────────────────────────
async function initApp(user, isNewUser = false) {
  currentUser = user;
  const nickname = user.user_metadata?.nickname || 'Leo';
  document.getElementById('appNickname').textContent = nickname;
  document.getElementById('profileInitials').textContent = nickname.charAt(0).toUpperCase();
  document.getElementById('datePill').textContent = new Date().toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});
  await loadFromCloud();
  renderDayNav();
  renderMeals();
  updateProgress();
  if (isNewUser) {
    // Nuovo utente: stato completamente vuoto, nessuna scheda di default
    state = {
      meals: {},
      shop: {},
      mealData: {
        times: {colazione:'07:30',pranzo:'13:00',spuntini:'16:30',cena:'20:00'},
        days: {0:{colazione:[],pranzo:[],spuntini:[],cena:[]},1:{colazione:[],pranzo:[],spuntini:[],cena:[]},2:{colazione:[],pranzo:[],spuntini:[],cena:[]},3:{colazione:[],pranzo:[],spuntini:[],cena:[]},4:{colazione:[],pranzo:[],spuntini:[],cena:[]},5:{colazione:[],pranzo:[],spuntini:[],cena:[]},6:{colazione:[],pranzo:[],spuntini:[],cena:[]}}
      },
      shopData: []
    };
    renderMeals(); updateProgress(); renderDayNav();
    document.getElementById('welcomeName').textContent = nickname;
    showApp();
    document.getElementById('welcomeScreen').classList.remove('hidden');
  } else {
    showApp();
  }
}

// Fallback: se dopo 6 secondi non arriva risposta, mostra login
let sessionChecked = false;
setTimeout(() => {
  if (sessionChecked) return;
  sessionChecked = true;
  showAuth();
}, 5000);

// Controlla sessione al caricamento con getSession() (più affidabile)
sb.auth.getSession().then(async ({ data: { session } }) => {
  sessionChecked = true;
  if (session?.user) {
    await initApp(session.user, false);
  } else {
    showAuth();
  }
});

sb.auth.onAuthStateChange(async (event, session) => {
  sessionChecked = true;
  if (event === 'PASSWORD_RECOVERY') {
    showAllHidden();
    document.getElementById('resetScreen').classList.remove('hidden');
  } else if (event === 'SIGNED_IN') {
    const newUser = isRegistering;
    isRegistering = false;
    if (!currentUser) await initApp(session.user, newUser);
  } else if (event === 'SIGNED_OUT') {
    showAuth();
  }
});
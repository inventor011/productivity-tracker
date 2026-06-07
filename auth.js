(function () {
  var SUPABASE_URL = 'https://mejpamvwxztcmnnudmrx.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanBhbXZ3eHp0Y21ubnVkbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODIzMDEsImV4cCI6MjA5NTg1ODMwMX0.Xiky-Oh3gU-k3hlWR6uI_FlC9N3nYnoijNXJwsQMkfw';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._supabase = sb;

  var overlay  = document.getElementById('auth-overlay');
  var appNav   = document.getElementById('app-nav');
  var appWrap  = document.getElementById('app-wrapper');
  var errorEl  = document.getElementById('auth-error');
  var navUser  = document.getElementById('nav-user');
  var navEmail = document.getElementById('nav-email');

  // --- Helpers ---
  function nameToUsername(n) { return n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30); }

  function setError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? 'block' : 'none';
  }

  // --- Google Sign-In ---
  document.getElementById('auth-google-btn').addEventListener('click', async function () {
    setError('');
    try {
      var result = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://productivity101.vercel.app' }
      });
      if (result.error) setError(result.error.message);
    } catch (e) {
      setError('Google sign-in failed. Please try again.');
    }
  });

  // --- Welcome modal (shown once on first signup) ---
  function showWelcomeModal() {
    var modal = document.getElementById('welcome-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    document.getElementById('welcome-modal-close').addEventListener('click', function () {
      modal.style.display = 'none';
    }, { once: true });
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.style.display = 'none';
    }, { once: true });
  }

  // --- Show app / auth ---
  function showApp(user) {
    overlay.style.display = 'none';
    appNav.style.display = 'flex';
    appWrap.style.display = 'block';
    if (navUser) navUser.style.display = 'flex';

    try {
      var flagKey = 'firstSignup:' + user.id;
      if (localStorage.getItem(flagKey) === 'yes') {
        localStorage.removeItem(flagKey);
        setTimeout(showWelcomeModal, 600);
      }
    } catch (e) {}

    var meta = user.user_metadata || {};
    var avatarUrl = meta.avatar_url || meta.picture || '';
    var navAvatar = document.getElementById('nav-avatar');
    if (navAvatar && avatarUrl) {
      navAvatar.src = avatarUrl;
      navAvatar.style.display = '';
    }

    var quickName = getDisplayName(user);
    if (navEmail) navEmail.textContent = quickName;

    sb.from('profiles').select('display_name').eq('id', user.id).maybeSingle().then(function (res) {
      if (res.data && res.data.display_name) {
        if (navEmail) navEmail.textContent = res.data.display_name;
      }
    });
  }

  function showAuth() {
    overlay.style.display = 'flex';
    appNav.style.display = 'none';
    appWrap.style.display = 'none';
    if (navUser) navUser.style.display = 'none';
  }

  // --- Profile creation ---
  function getDisplayName(user) {
    var meta = user.user_metadata || {};
    return meta.full_name || meta.name || meta.display_name || user.email.split('@')[0];
  }

  function ensureProfile(user) {
    var name = getDisplayName(user);
    var meta = user.user_metadata || {};
    var username = meta.username || nameToUsername(name);

    sb.from('profiles').select('id, display_name').eq('id', user.id).maybeSingle().then(function (res) {
      if (res.data) {
        var stored = res.data.display_name;
        if (stored && stored === user.email.split('@')[0] && name !== stored) {
          sb.from('profiles').update({ display_name: name }).eq('id', user.id).then(function () {});
        }
        return;
      }
      // No profile row yet → brand-new signup. Flag for welcome modal.
      try { localStorage.setItem('firstSignup:' + user.id, 'yes'); } catch (e) {}
      sb.from('profiles').select('id').eq('username', username).maybeSingle().then(function (check) {
        if (check.data) username = username + Math.floor(Math.random() * 9000 + 1000);
        sb.from('profiles').insert({ id: user.id, display_name: name, username: username }).then(function () {});
      });
    });
  }

  // --- Events ---
  document.getElementById('nav-logout').addEventListener('click', function () { sb.auth.signOut(); });

  // --- Auth state ---
  sb.auth.onAuthStateChange(function (_event, session) {
    if (session) { ensureProfile(session.user); showApp(session.user); }
    else { showAuth(); }
  });

  sb.auth.getSession().then(function (response) {
    var session = response.data.session;
    if (session) { ensureProfile(session.user); showApp(session.user); }
    else { showAuth(); }
  });
})();

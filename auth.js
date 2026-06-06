(function () {
  var SUPABASE_URL = 'https://mejpamvwxztcmnnudmrx.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanBhbXZ3eHp0Y21ubnVkbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODIzMDEsImV4cCI6MjA5NTg1ODMwMX0.Xiky-Oh3gU-k3hlWR6uI_FlC9N3nYnoijNXJwsQMkfw';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._supabase = sb;

  var mode = 'signin';

  var overlay   = document.getElementById('auth-overlay');
  var appNav    = document.getElementById('app-nav');
  var appWrap   = document.getElementById('app-wrapper');
  var titleEl   = document.getElementById('auth-title');
  var subEl     = document.getElementById('auth-sub');
  var errorEl   = document.getElementById('auth-error');
  var nameIn    = document.getElementById('auth-name');
  var emailIn   = document.getElementById('auth-email');
  var passIn    = document.getElementById('auth-password');
  var passWrap  = document.querySelector('.auth-password-wrap');
  var eyeBtn    = document.getElementById('auth-eye');
  var submitBtn = document.getElementById('auth-submit');
  var switchRow = document.getElementById('auth-switch-row');
  var navUser   = document.getElementById('nav-user');
  var navEmail  = document.getElementById('nav-email');

  // Hide unused elements from previous flows
  var vs = document.getElementById('auth-verify-section');
  if (vs) vs.style.display = 'none';
  var ur = document.getElementById('auth-username-row');
  if (ur) ur.style.display = 'none';

  // --- Password toggle ---
  eyeBtn.addEventListener('click', function () {
    if (passIn.type === 'text') { passIn.type = 'password'; eyeBtn.textContent = 'Show'; }
    else { passIn.type = 'text'; eyeBtn.textContent = 'Hide'; }
  });

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

  // --- Helpers ---
  function nameToUsername(n) { return n.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30); }

  function setError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? 'block' : 'none';
  }

  function setMode(m) {
    mode = m;
    setError('');
    submitBtn.disabled = false;
    nameIn.style.display = m === 'signup' ? '' : 'none';

    if (m === 'signup') {
      titleEl.textContent = 'Create account';
      subEl.textContent = 'Start tracking your productivity';
      submitBtn.textContent = 'Create Account';
      document.getElementById('auth-switch-link').textContent = 'Sign in instead';
      document.getElementById('auth-switch-label').textContent = 'Already have an account? ';
    } else {
      titleEl.textContent = 'Welcome back';
      subEl.textContent = 'Sign in to access your tracker';
      submitBtn.textContent = 'Sign In';
      document.getElementById('auth-switch-link').textContent = 'Sign up';
      document.getElementById('auth-switch-label').textContent = "Don't have an account? ";
    }
  }

  // --- Show app / auth ---
  function showApp(user) {
    overlay.style.display = 'none';
    appNav.style.display = 'flex';
    appWrap.style.display = 'block';
    if (navUser) navUser.style.display = 'flex';

    var meta = user.user_metadata || {};
    var avatarUrl = meta.avatar_url || meta.picture || '';
    var navAvatar = document.getElementById('nav-avatar');
    if (navAvatar && avatarUrl) {
      navAvatar.src = avatarUrl;
      navAvatar.style.display = '';
    }

    // Show name immediately from Google metadata, then refine from profile
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
    // Google sends full_name/name; email signup sends display_name
    return meta.full_name || meta.name || meta.display_name || user.email.split('@')[0];
  }

  function ensureProfile(user) {
    var name = getDisplayName(user);
    var meta = user.user_metadata || {};
    var username = meta.username || nameToUsername(name);

    sb.from('profiles').select('id, display_name').eq('id', user.id).maybeSingle().then(function (res) {
      if (res.data) {
        // Update name if it was stored as the email prefix but Google has the real name
        var stored = res.data.display_name;
        if (stored && stored === user.email.split('@')[0] && name !== stored) {
          sb.from('profiles').update({ display_name: name }).eq('id', user.id).then(function () {});
        }
        return;
      }
      // No profile row yet → this is a brand-new signup. Flag for welcome modal.
      try { localStorage.setItem('firstSignup:' + user.id, 'yes'); } catch (e) {}
      sb.from('profiles').select('id').eq('username', username).maybeSingle().then(function (check) {
        if (check.data) username = username + Math.floor(Math.random() * 9000 + 1000);
        sb.from('profiles').insert({ id: user.id, display_name: name, username: username }).then(function () {});
      });
    });
  }

  // --- Email/Password Submit ---
  async function handleSubmit() {
    setError('');

    if (mode === 'signup') {
      var name = nameIn.value.trim();
      var email = emailIn.value.trim();
      var password = passIn.value;

      if (!name) { setError('Please enter your name.'); return; }
      if (!email) { setError('Please enter your email.'); return; }
      if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';

      try {
        var result = await sb.auth.signUp({
          email: email,
          password: password,
          options: { data: { display_name: name, username: nameToUsername(name) } }
        });

        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';

        if (result.error) { setError(result.error.message); return; }

        if (result.data && result.data.user && result.data.user.identities && result.data.user.identities.length === 0) {
          setError('This email is already registered. Try signing in.');
          return;
        }

        if (result.data && result.data.session) {
          return; // onAuthStateChange handles the rest
        }

        setError('Account created! But email confirmation is enabled. Please disable it in Supabase or use Google Sign-In.');

      } catch (e) {
        setError('Something went wrong: ' + (e.message || 'Please try again.'));
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }

    } else {
      var email = emailIn.value.trim();
      var password = passIn.value;
      if (!email) { setError('Please enter your email.'); return; }
      if (!password) { setError('Please enter your password.'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      try {
        var result = await sb.auth.signInWithPassword({ email: email, password: password });
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
        if (result.error) { setError(result.error.message); return; }
      } catch (e) {
        setError('Something went wrong: ' + (e.message || 'Please try again.'));
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  }

  // --- Events ---
  document.getElementById('auth-switch-link').addEventListener('click', function () {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  });
  submitBtn.addEventListener('click', handleSubmit);
  passIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
  emailIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') passIn.focus(); });
  nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') emailIn.focus(); });
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

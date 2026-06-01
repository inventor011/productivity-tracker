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
  var verifySection = document.getElementById('auth-verify-section');

  // Hide verify section entirely — not used in this flow
  if (verifySection) verifySection.style.display = 'none';

  // --- Password toggle ---
  eyeBtn.addEventListener('click', function () {
    if (passIn.type === 'text') {
      passIn.type = 'password';
      eyeBtn.textContent = 'Show';
    } else {
      passIn.type = 'text';
      eyeBtn.textContent = 'Hide';
    }
  });

  // --- Helpers ---
  function nameToUsername(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
  }

  function setError(msg) {
    errorEl.textContent = msg;
    errorEl.style.display = msg ? 'block' : 'none';
  }

  function resetBtn() {
    submitBtn.disabled = false;
    submitBtn.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';
  }

  function setMode(m) {
    mode = m;
    setError('');
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

  // --- Show app / show auth ---
  function showApp(user) {
    overlay.style.display = 'none';
    appNav.style.display = 'flex';
    appWrap.style.display = 'block';
    if (navUser) navUser.style.display = 'flex';

    // Load display name
    sb.from('profiles').select('display_name').eq('id', user.id).maybeSingle().then(function (res) {
      var label = (res.data && res.data.display_name) ? res.data.display_name : user.email.split('@')[0];
      if (navEmail) navEmail.textContent = label;
    });
  }

  function showAuth() {
    overlay.style.display = 'flex';
    appNav.style.display = 'none';
    appWrap.style.display = 'none';
    if (navUser) navUser.style.display = 'none';
  }

  // --- Ensure profile exists ---
  function ensureProfile(user) {
    var meta = user.user_metadata || {};
    var name = meta.display_name || user.email.split('@')[0];
    var username = meta.username || nameToUsername(name);

    sb.from('profiles').select('id').eq('id', user.id).maybeSingle().then(function (res) {
      if (res.data) return; // Already exists

      // Check if username is taken, add random suffix if so
      sb.from('profiles').select('id').eq('username', username).maybeSingle().then(function (check) {
        if (check.data) username = username + Math.floor(Math.random() * 9000 + 1000);

        sb.from('profiles').insert({
          id: user.id,
          display_name: name,
          username: username
        }).then(function () {});
      });
    });
  }

  // --- Submit handler ---
  async function handleSubmit() {
    setError('');
    var email = emailIn.value.trim();
    var password = passIn.value;

    if (mode === 'signup') {
      var name = nameIn.value.trim();
      if (!name) { setError('Please enter your name.'); return; }
      if (!email) { setError('Please enter your email.'); return; }
      if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Creating account…';

      try {
        var result = await sb.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { display_name: name, username: nameToUsername(name) },
            emailRedirectTo: 'https://productivity101.vercel.app'
          }
        });

        if (result.error) {
          setError(result.error.message);
          resetBtn();
          return;
        }

        // If Supabase returned a user with no identities → email already registered
        if (result.data && result.data.user && result.data.user.identities && result.data.user.identities.length === 0) {
          setError('This email is already registered. Try signing in.');
          resetBtn();
          return;
        }

        // If we got a session → user is logged in (email confirmation is off)
        if (result.data && result.data.session) {
          // onAuthStateChange will handle showing the app
          return;
        }

        // If no session → email confirmation is on, tell user
        setError('Account created! Check your email to confirm, then sign in here.');
        setMode('signin');
        emailIn.value = email;

      } catch (e) {
        setError('Something went wrong: ' + (e.message || 'Please try again.'));
        resetBtn();
      }

    } else {
      // Sign in
      if (!email) { setError('Please enter your email.'); return; }
      if (!password) { setError('Please enter your password.'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      try {
        var result = await sb.auth.signInWithPassword({ email: email, password: password });

        if (result.error) {
          setError(result.error.message);
          resetBtn();
          return;
        }
        // onAuthStateChange will handle showing the app

      } catch (e) {
        setError('Something went wrong: ' + (e.message || 'Please try again.'));
        resetBtn();
      }
    }
  }

  // --- Event listeners ---
  document.getElementById('auth-switch-link').addEventListener('click', function () {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  });

  submitBtn.addEventListener('click', handleSubmit);
  passIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
  emailIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') passIn.focus(); });
  nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') emailIn.focus(); });

  document.getElementById('nav-logout').addEventListener('click', function () {
    sb.auth.signOut();
  });

  // --- Auth state listener ---
  sb.auth.onAuthStateChange(function (_event, session) {
    if (session) {
      ensureProfile(session.user);
      showApp(session.user);
    } else {
      showAuth();
    }
  });

  sb.auth.getSession().then(function (response) {
    var session = response.data.session;
    if (session) {
      ensureProfile(session.user);
      showApp(session.user);
    } else {
      showAuth();
    }
  });
})();

(function () {
  const SUPABASE_URL = 'https://mejpamvwxztcmnnudmrx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanBhbXZ3eHp0Y21ubnVkbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODIzMDEsImV4cCI6MjA5NTg1ODMwMX0.Xiky-Oh3gU-k3hlWR6uI_FlC9N3nYnoijNXJwsQMkfw';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._supabase = sb;

  let mode = 'signin'; // 'signin' | 'signup' | 'verify'
  let needsUsername = false;
  let pendingEmail = '';
  let pendingName = '';
  let pendingUsername = '';

  // --- DOM refs ---
  const overlay       = document.getElementById('auth-overlay');
  const appNav        = document.getElementById('app-nav');
  const appWrap       = document.getElementById('app-wrapper');
  const titleEl       = document.getElementById('auth-title');
  const subEl         = document.getElementById('auth-sub');
  const errorEl       = document.getElementById('auth-error');
  const nameIn        = document.getElementById('auth-name');
  const usernameRow   = document.getElementById('auth-username-row');
  const usernameIn    = document.getElementById('auth-username');
  const emailIn       = document.getElementById('auth-email');
  const passIn        = document.getElementById('auth-password');
  const passWrap      = document.querySelector('.auth-password-wrap');
  const eyeBtn        = document.getElementById('auth-eye');
  const submitBtn     = document.getElementById('auth-submit');
  const verifySection = document.getElementById('auth-verify-section');
  const codeIn        = document.getElementById('auth-code');
  const verifyBtn     = document.getElementById('auth-verify-btn');
  const resendLink    = document.getElementById('auth-resend-link');
  const switchRow     = document.getElementById('auth-switch-row');
  const navUser       = document.getElementById('nav-user');
  const navEmail      = document.getElementById('nav-email');

  // --- Password show/hide ---
  eyeBtn.addEventListener('click', function () {
    var showing = passIn.type === 'text';
    passIn.type = showing ? 'password' : 'text';
    eyeBtn.textContent = showing ? 'Show' : 'Hide';
  });

  // --- Username helpers ---
  function nameToUsername(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
  }

  async function isUsernameTaken(username) {
    if (!username) return true;
    try {
      var result = await sb.from('profiles').select('id').eq('username', username).limit(1);
      if (result.error) return false;
      return result.data && result.data.length > 0;
    } catch (e) {
      return false;
    }
  }

  // --- Show/hide app vs auth ---
  async function showApp(user) {
    overlay.style.display = 'none';
    appNav.style.display  = 'flex';
    appWrap.style.display = 'block';

    try {
      var result = await sb.from('profiles').select('display_name, username').eq('id', user.id).single();
      var label = result.data ? result.data.display_name : user.email.split('@')[0];
    } catch (e) {
      var label = user.email.split('@')[0];
    }
    if (navEmail) navEmail.textContent = label;
    if (navUser)  navUser.style.display = 'flex';
  }

  function showAuth() {
    overlay.style.display = 'flex';
    appNav.style.display  = 'none';
    appWrap.style.display = 'none';
    if (navUser) navUser.style.display = 'none';
  }

  function setError(msg) {
    errorEl.textContent   = msg;
    errorEl.style.display = msg ? 'block' : 'none';
  }

  function setMode(m) {
    mode = m;
    setError('');
    needsUsername = false;

    // Reset visibility
    nameIn.style.display        = m === 'signup' ? '' : 'none';
    usernameRow.style.display   = 'none';
    emailIn.style.display       = m === 'verify' ? 'none' : '';
    passWrap.style.display      = m === 'verify' ? 'none' : '';
    submitBtn.style.display     = m === 'verify' ? 'none' : '';
    verifySection.style.display = m === 'verify' ? '' : 'none';
    switchRow.style.display     = m === 'verify' ? 'none' : '';

    // Reset button state
    submitBtn.disabled = false;

    if (m === 'signup') {
      titleEl.textContent   = 'Create account';
      subEl.textContent     = 'Start tracking your productivity';
      submitBtn.textContent = 'Create Account';
      document.getElementById('auth-switch-link').textContent  = 'Sign in instead';
      document.getElementById('auth-switch-label').textContent = 'Already have an account? ';
    } else if (m === 'signin') {
      titleEl.textContent   = 'Welcome back';
      subEl.textContent     = 'Sign in to access your tracker';
      submitBtn.textContent = 'Sign In';
      document.getElementById('auth-switch-link').textContent  = 'Sign up';
      document.getElementById('auth-switch-label').textContent = "Don't have an account? ";
    } else if (m === 'verify') {
      titleEl.textContent = 'Check your email';
      subEl.textContent   = 'Enter the 6-digit code sent to ' + pendingEmail;
      codeIn.value = '';
      setTimeout(function () { codeIn.focus(); }, 100);
    }
  }

  // --- Main submit handler ---
  async function handleSubmit() {
    setError('');

    if (mode === 'signup') {
      var name     = nameIn.value.trim();
      var email    = emailIn.value.trim();
      var password = passIn.value;

      if (!name)              { setError('Please enter your name.'); return; }
      if (!email || !password) { setError('Please fill in all fields.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

      var username = needsUsername
        ? usernameIn.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
        : nameToUsername(name);

      if (!username || username.length < 2) {
        setError('Username must be at least 2 characters (letters and numbers only).');
        return;
      }

      submitBtn.disabled    = true;
      submitBtn.textContent = 'Please wait…';

      try {
        var taken = await isUsernameTaken(username);
        if (taken && !needsUsername) {
          needsUsername = true;
          usernameRow.style.display = '';
          usernameIn.value = '';
          usernameIn.focus();
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Create Account';
          return;
        }
        if (taken && needsUsername) {
          setError('That username is also taken — try another.');
          submitBtn.disabled    = false;
          submitBtn.textContent = 'Create Account';
          return;
        }

        var result = await sb.auth.signUp({
          email: email,
          password: password,
          options: { data: { display_name: name, username: username } }
        });

        submitBtn.disabled    = false;
        submitBtn.textContent = 'Create Account';

        if (result.error) {
          setError(result.error.message);
          return;
        }

        // Check if user already exists (Supabase returns fake success)
        if (result.data.user && (!result.data.user.identities || result.data.user.identities.length === 0)) {
          setError('This email is already registered. Try signing in.');
          return;
        }

        // If session created immediately (email confirmation disabled)
        if (result.data.session) {
          return; // onAuthStateChange handles the rest
        }

        // Email confirmation required → show OTP verify screen
        pendingEmail    = email;
        pendingName     = name;
        pendingUsername  = username;
        setMode('verify');

      } catch (e) {
        setError('Something went wrong. Please try again.');
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Create Account';
      }

    } else if (mode === 'signin') {
      var email    = emailIn.value.trim();
      var password = passIn.value;
      if (!email || !password) { setError('Please fill in all fields.'); return; }

      submitBtn.disabled    = true;
      submitBtn.textContent = 'Please wait…';

      try {
        var result = await sb.auth.signInWithPassword({ email: email, password: password });

        submitBtn.disabled    = false;
        submitBtn.textContent = 'Sign In';

        if (result.error) {
          // If email not confirmed, offer to resend code
          if (result.error.message.toLowerCase().includes('not confirmed') || result.error.message.toLowerCase().includes('not been confirmed')) {
            pendingEmail = email;
            setError('Email not verified yet. Check your email for the code.');
            setMode('verify');
            return;
          }
          setError(result.error.message);
          return;
        }
      } catch (e) {
        setError('Something went wrong. Please try again.');
        submitBtn.disabled    = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  }

  // --- OTP verify handler ---
  async function handleVerify() {
    var code = codeIn.value.trim();
    if (!code || code.length < 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    verifyBtn.disabled    = true;
    verifyBtn.textContent = 'Verifying…';
    setError('');

    try {
      var result = await sb.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'signup'
      });

      verifyBtn.disabled    = false;
      verifyBtn.textContent = 'Verify & Sign In';

      if (result.error) {
        setError(result.error.message);
        return;
      }

      // Success — onAuthStateChange will fire and show the app
    } catch (e) {
      setError('Verification failed. Check the code and try again.');
      verifyBtn.disabled    = false;
      verifyBtn.textContent = 'Verify & Sign In';
    }
  }

  // --- Resend code handler ---
  async function handleResend() {
    setError('');
    try {
      var result = await sb.auth.resend({ type: 'signup', email: pendingEmail });
      if (result.error) {
        setError(result.error.message);
        return;
      }
      subEl.textContent = 'New code sent to ' + pendingEmail;
    } catch (e) {
      setError('Could not resend code. Please try again.');
    }
  }

  // --- Ensure profile exists ---
  async function ensureProfile(user) {
    try {
      var result = await sb.from('profiles').select('id').eq('id', user.id).single();
      if (result.data) return; // Profile already exists
    } catch (e) { /* no profile found, continue */ }

    var meta = user.user_metadata || {};
    var name = meta.display_name || pendingName || user.email.split('@')[0];
    var username = meta.username || pendingUsername || nameToUsername(name);

    try {
      var taken = await isUsernameTaken(username);
      if (taken) username = username + Math.floor(Math.random() * 9000 + 1000);

      await sb.from('profiles').upsert({
        id: user.id,
        display_name: name,
        username: username
      });
    } catch (e) { /* profile creation failed silently */ }
  }

  // --- Event listeners ---
  document.getElementById('auth-switch-link').addEventListener('click', function () {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  });

  submitBtn.addEventListener('click', handleSubmit);
  verifyBtn.addEventListener('click', handleVerify);
  resendLink.addEventListener('click', handleResend);

  passIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
  emailIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') passIn.focus(); });
  nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') emailIn.focus(); });
  usernameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
  codeIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleVerify(); });

  document.getElementById('nav-logout').addEventListener('click', function () { sb.auth.signOut(); });

  // --- Auth state listener ---
  sb.auth.onAuthStateChange(async function (_event, session) {
    if (session) {
      await ensureProfile(session.user);
      showApp(session.user);
    } else {
      showAuth();
    }
  });

  sb.auth.getSession().then(async function (response) {
    var session = response.data.session;
    if (session) {
      await ensureProfile(session.user);
      showApp(session.user);
    } else {
      showAuth();
    }
  });
})();

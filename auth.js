(function () {
  const SUPABASE_URL = 'https://mejpamvwxztcmnnudmrx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanBhbXZ3eHp0Y21ubnVkbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODIzMDEsImV4cCI6MjA5NTg1ODMwMX0.Xiky-Oh3gU-k3hlWR6uI_FlC9N3nYnoijNXJwsQMkfw';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._supabase = sb;

  let mode = 'signin';
  let needsUsername = false;

  const overlay      = document.getElementById('auth-overlay');
  const appNav       = document.getElementById('app-nav');
  const appWrap      = document.getElementById('app-wrapper');
  const titleEl      = document.getElementById('auth-title');
  const subEl        = document.getElementById('auth-sub');
  const errorEl      = document.getElementById('auth-error');
  const nameIn       = document.getElementById('auth-name');
  const usernameRow  = document.getElementById('auth-username-row');
  const usernameIn   = document.getElementById('auth-username');
  const emailIn      = document.getElementById('auth-email');
  const passIn       = document.getElementById('auth-password');
  const passWrap     = document.querySelector('.auth-password-wrap');
  const eyeBtn       = document.getElementById('auth-eye');
  const submitBtn    = document.getElementById('auth-submit');
  const switchRow    = document.getElementById('auth-switch-row');
  const navUser      = document.getElementById('nav-user');
  const navEmail     = document.getElementById('nav-email');

  // --- Password show/hide ---
  eyeBtn.addEventListener('click', () => {
    const showing = passIn.type === 'text';
    passIn.type = showing ? 'password' : 'text';
    eyeBtn.textContent = showing ? 'Show' : 'Hide';
  });

  // --- Username helpers ---
  function nameToUsername(name) {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
  }

  async function isUsernameTaken(username) {
    if (!username) return true;
    const { data } = await sb.from('profiles').select('id').eq('username', username).limit(1);
    return data && data.length > 0;
  }

  // --- Show/hide app vs auth ---
  async function showApp(user) {
    overlay.style.display = 'none';
    appNav.style.display  = 'flex';
    appWrap.style.display = 'block';

    const { data: profile } = await sb.from('profiles').select('display_name, username').eq('id', user.id).single();
    const label = profile ? profile.display_name : user.email.split('@')[0];
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

  function resetFormVisibility() {
    nameIn.style.display       = mode === 'signup' ? '' : 'none';
    usernameRow.style.display  = 'none';
    emailIn.style.display      = '';
    passWrap.style.display     = '';
    submitBtn.style.display    = '';
    switchRow.style.display    = '';
    needsUsername              = false;
  }

  function setMode(m) {
    mode = m;
    setError('');
    resetFormVisibility();
    if (m === 'signup') {
      titleEl.textContent   = 'Create account';
      subEl.textContent     = 'Start tracking your productivity';
      submitBtn.textContent = 'Create Account';
      document.getElementById('auth-switch-link').textContent  = 'Sign in instead';
      document.getElementById('auth-switch-label').textContent = 'Already have an account? ';
    } else {
      titleEl.textContent   = 'Welcome back';
      subEl.textContent     = 'Sign in to access your tracker';
      submitBtn.textContent = 'Sign In';
      document.getElementById('auth-switch-link').textContent  = 'Sign up';
      document.getElementById('auth-switch-label').textContent = "Don't have an account? ";
    }
  }

  async function handleSubmit() {
    setError('');
    const email    = emailIn.value.trim();
    const password = passIn.value;

    if (mode === 'signup') {
      const name = nameIn.value.trim();
      if (!name)              { setError('Please enter your name.'); return; }
      if (!email || !password) { setError('Please fill in all fields.'); return; }
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

      const username = needsUsername ? usernameIn.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '') : nameToUsername(name);
      if (!username || username.length < 2) {
        setError('Username must be at least 2 characters (letters and numbers only).');
        return;
      }

      submitBtn.disabled    = true;
      submitBtn.textContent = 'Please wait…';

      const taken = await isUsernameTaken(username);
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

      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { display_name: name, username: username } }
      });

      submitBtn.disabled    = false;
      submitBtn.textContent = 'Create Account';
      if (error) { setError(error.message); return; }

      if (data.session) {
        await sb.from('profiles').upsert({
          id: data.user.id,
          display_name: name,
          username: username
        });
      }

      if (!data.session) {
        titleEl.textContent        = 'Check your email';
        subEl.textContent          = 'We sent a confirmation link to ' + email + '. Click it, then come back and sign in.';
        nameIn.style.display       = 'none';
        usernameRow.style.display  = 'none';
        emailIn.style.display      = 'none';
        passWrap.style.display     = 'none';
        submitBtn.style.display    = 'none';
        switchRow.style.display    = 'none';
      }

    } else {
      if (!email || !password) { setError('Please fill in all fields.'); return; }

      submitBtn.disabled    = true;
      submitBtn.textContent = 'Please wait…';

      const { error } = await sb.auth.signInWithPassword({ email, password });

      submitBtn.disabled    = false;
      submitBtn.textContent = 'Sign In';
      if (error) { setError(error.message); return; }
    }
  }

  // --- On auth state change, create profile if missing (for email-confirmed users) ---
  async function ensureProfile(user) {
    const { data: existing } = await sb.from('profiles').select('id').eq('id', user.id).single();
    if (existing) return;

    const meta = user.user_metadata || {};
    const name = meta.display_name || user.email.split('@')[0];
    let username = meta.username || nameToUsername(name);

    const taken = await isUsernameTaken(username);
    if (taken) username = username + Math.floor(Math.random() * 9000 + 1000);

    await sb.from('profiles').upsert({
      id: user.id,
      display_name: name,
      username: username
    });
  }

  // --- Event listeners ---
  document.getElementById('auth-switch-link').addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
  submitBtn.addEventListener('click', handleSubmit);
  passIn.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
  emailIn.addEventListener('keydown', e => { if (e.key === 'Enter') passIn.focus(); });
  nameIn.addEventListener('keydown', e => { if (e.key === 'Enter') emailIn.focus(); });
  usernameIn.addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });

  document.getElementById('nav-logout').addEventListener('click', () => sb.auth.signOut());

  sb.auth.onAuthStateChange(async (_event, session) => {
    if (session) {
      await ensureProfile(session.user);
      showApp(session.user);
    } else {
      showAuth();
    }
  });

  sb.auth.getSession().then(async ({ data: { session } }) => {
    if (session) {
      await ensureProfile(session.user);
      showApp(session.user);
    } else {
      showAuth();
    }
  });
})();

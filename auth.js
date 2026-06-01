(function () {
  const SUPABASE_URL = 'https://mejpamvwxztcmnnudmrx.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanBhbXZ3eHp0Y21ubnVkbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODIzMDEsImV4cCI6MjA5NTg1ODMwMX0.Xiky-Oh3gU-k3hlWR6uI_FlC9N3nYnoijNXJwsQMkfw';

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._supabase = sb;

  let mode = 'signin';

  const overlay   = document.getElementById('auth-overlay');
  const appNav    = document.getElementById('app-nav');
  const appWrap   = document.getElementById('app-wrapper');
  const titleEl   = document.getElementById('auth-title');
  const subEl     = document.getElementById('auth-sub');
  const errorEl   = document.getElementById('auth-error');
  const emailIn   = document.getElementById('auth-email');
  const passIn    = document.getElementById('auth-password');
  const submitBtn = document.getElementById('auth-submit');
  const switchRow = document.getElementById('auth-switch-row');
  const navUser   = document.getElementById('nav-user');
  const navEmail  = document.getElementById('nav-email');

  function showApp(user) {
    overlay.style.display = 'none';
    appNav.style.display  = 'flex';
    appWrap.style.display = 'block';
    if (navEmail) navEmail.textContent = user.email.split('@')[0];
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
    if (m === 'signup') {
      titleEl.textContent   = 'Create account';
      subEl.textContent     = 'Start tracking your productivity';
      submitBtn.textContent = 'Create Account';
      document.getElementById('auth-switch-link').textContent = 'Sign in instead';
      document.getElementById('auth-switch-label').textContent = 'Already have an account? ';
    } else {
      titleEl.textContent   = 'Welcome back';
      subEl.textContent     = 'Sign in to access your tracker';
      submitBtn.textContent = 'Sign In';
      document.getElementById('auth-switch-link').textContent = 'Sign up';
      document.getElementById('auth-switch-label').textContent = "Don't have an account? ";
    }
  }

  async function handleSubmit() {
    const email    = emailIn.value.trim();
    const password = passIn.value;
    if (!email || !password) { setError('Please fill in all fields.'); return; }

    setError('');
    submitBtn.disabled    = true;
    submitBtn.textContent = 'Please wait…';

    const { data, error } = mode === 'signup'
      ? await sb.auth.signUp({ email, password })
      : await sb.auth.signInWithPassword({ email, password });

    submitBtn.disabled    = false;
    submitBtn.textContent = mode === 'signup' ? 'Create Account' : 'Sign In';

    if (error) { setError(error.message); return; }

    if (mode === 'signup' && !data.session) {
      titleEl.textContent     = 'Check your email ✓';
      subEl.textContent       = 'We sent a confirmation link to ' + email + '. Click it, then come back and sign in.';
      emailIn.style.display   = 'none';
      passIn.style.display    = 'none';
      submitBtn.style.display = 'none';
      switchRow.style.display = 'none';
    }
  }

  document.getElementById('auth-switch-link').addEventListener('click', () => setMode(mode === 'signin' ? 'signup' : 'signin'));
  submitBtn.addEventListener('click', handleSubmit);
  passIn.addEventListener('keydown',  e => { if (e.key === 'Enter') handleSubmit(); });
  emailIn.addEventListener('keydown', e => { if (e.key === 'Enter') passIn.focus(); });

  document.getElementById('nav-logout').addEventListener('click', () => sb.auth.signOut());

  sb.auth.onAuthStateChange((_event, session) => {
    session ? showApp(session.user) : showAuth();
  });

  sb.auth.getSession().then(({ data: { session } }) => {
    session ? showApp(session.user) : showAuth();
  });
})();

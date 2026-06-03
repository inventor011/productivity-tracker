(function () {
  var SUPABASE_URL = 'https://mejpamvwxztcmnnudmrx.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1lanBhbXZ3eHp0Y21ubnVkbXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODIzMDEsImV4cCI6MjA5NTg1ODMwMX0.Xiky-Oh3gU-k3hlWR6uI_FlC9N3nYnoijNXJwsQMkfw';

  var sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window._supabase = sb;

  var mode = 'signin'; // 'signin' | 'signup' | 'verify'
  var pendingEmail = '';
  var _signingUp = false; // flag to ignore auth changes during signup flow

  var overlay       = document.getElementById('auth-overlay');
  var appNav        = document.getElementById('app-nav');
  var appWrap       = document.getElementById('app-wrapper');
  var titleEl       = document.getElementById('auth-title');
  var subEl         = document.getElementById('auth-sub');
  var errorEl       = document.getElementById('auth-error');
  var nameIn        = document.getElementById('auth-name');
  var emailIn       = document.getElementById('auth-email');
  var passIn        = document.getElementById('auth-password');
  var passWrap      = document.querySelector('.auth-password-wrap');
  var eyeBtn        = document.getElementById('auth-eye');
  var submitBtn     = document.getElementById('auth-submit');
  var verifySection = document.getElementById('auth-verify-section');
  var codeIn        = document.getElementById('auth-code');
  var verifyBtn     = document.getElementById('auth-verify-btn');
  var resendLink    = document.getElementById('auth-resend-link');
  var switchRow     = document.getElementById('auth-switch-row');
  var navUser       = document.getElementById('nav-user');
  var navEmail      = document.getElementById('nav-email');

  // Hide unused elements
  var ur = document.getElementById('auth-username-row');
  if (ur) ur.style.display = 'none';

  // --- Password toggle ---
  eyeBtn.addEventListener('click', function () {
    if (passIn.type === 'text') { passIn.type = 'password'; eyeBtn.textContent = 'Show'; }
    else { passIn.type = 'text'; eyeBtn.textContent = 'Hide'; }
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

    nameIn.style.display        = m === 'signup' ? '' : 'none';
    emailIn.style.display       = m === 'verify' ? 'none' : '';
    passWrap.style.display      = m === 'verify' ? 'none' : '';
    submitBtn.style.display     = m === 'verify' ? 'none' : '';
    verifySection.style.display = m === 'verify' ? '' : 'none';
    switchRow.style.display     = m === 'verify' ? 'none' : '';

    if (m === 'signup') {
      titleEl.textContent = 'Create account';
      subEl.textContent = 'Start tracking your productivity';
      submitBtn.textContent = 'Create Account';
      document.getElementById('auth-switch-link').textContent = 'Sign in instead';
      document.getElementById('auth-switch-label').textContent = 'Already have an account? ';
    } else if (m === 'signin') {
      titleEl.textContent = 'Welcome back';
      subEl.textContent = 'Sign in to access your tracker';
      submitBtn.textContent = 'Sign In';
      document.getElementById('auth-switch-link').textContent = 'Sign up';
      document.getElementById('auth-switch-label').textContent = "Don't have an account? ";
    } else if (m === 'verify') {
      titleEl.textContent = 'Verify your email';
      subEl.textContent = 'Enter the 6-digit code sent to ' + pendingEmail;
      if (codeIn) { codeIn.value = ''; setTimeout(function () { codeIn.focus(); }, 100); }
      if (verifyBtn) { verifyBtn.disabled = false; verifyBtn.textContent = 'Verify & Sign In'; }
    }
  }

  // --- Show app / auth ---
  function showApp(user) {
    overlay.style.display = 'none';
    appNav.style.display = 'flex';
    appWrap.style.display = 'block';
    if (navUser) navUser.style.display = 'flex';
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

  // --- Profile creation ---
  function ensureProfile(user) {
    var meta = user.user_metadata || {};
    var name = meta.display_name || user.email.split('@')[0];
    var username = meta.username || nameToUsername(name);

    sb.from('profiles').select('id').eq('id', user.id).maybeSingle().then(function (res) {
      if (res.data) return;
      sb.from('profiles').select('id').eq('username', username).maybeSingle().then(function (check) {
        if (check.data) username = username + Math.floor(Math.random() * 9000 + 1000);
        sb.from('profiles').insert({ id: user.id, display_name: name, username: username }).then(function () {});
      });
    });
  }

  // --- Signup ---
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
        _signingUp = true; // prevent auth state listener from showing app

        // Step 1: Create the account
        var signUpResult = await sb.auth.signUp({
          email: email,
          password: password,
          options: { data: { display_name: name, username: nameToUsername(name) } }
        });

        if (signUpResult.error) {
          _signingUp = false;
          setError(signUpResult.error.message);
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
          return;
        }

        // Check if user already exists
        if (signUpResult.data && signUpResult.data.user &&
            signUpResult.data.user.identities && signUpResult.data.user.identities.length === 0) {
          _signingUp = false;
          setError('This email is already registered. Try signing in.');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Create Account';
          return;
        }

        // Step 2: Sign out silently (don't let them in without verification)
        await sb.auth.signOut();

        // Step 3: Send the real 6-digit OTP via Magic Link flow
        var otpResult = await sb.auth.signInWithOtp({
          email: email,
          options: { shouldCreateUser: false }
        });

        _signingUp = false;
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';

        if (otpResult.error) {
          setError(otpResult.error.message);
          return;
        }

        // Step 4: Show the code entry screen
        pendingEmail = email;
        setMode('verify');

      } catch (e) {
        _signingUp = false;
        setError('Something went wrong: ' + (e.message || 'Please try again.'));
        submitBtn.disabled = false;
        submitBtn.textContent = 'Create Account';
      }

    } else if (mode === 'signin') {
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
        // onAuthStateChange handles the rest
      } catch (e) {
        setError('Something went wrong: ' + (e.message || 'Please try again.'));
        submitBtn.disabled = false;
        submitBtn.textContent = 'Sign In';
      }
    }
  }

  // --- Verify OTP code ---
  async function handleVerify() {
    var code = codeIn.value.trim();
    if (!code || code.length < 6) { setError('Please enter the 6-digit code.'); return; }

    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying…';
    setError('');

    try {
      var result = await sb.auth.verifyOtp({
        email: pendingEmail,
        token: code,
        type: 'email'  // This is the correct type for signInWithOtp codes
      });

      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Sign In';

      if (result.error) { setError(result.error.message); return; }
      // Success — onAuthStateChange fires and shows the app
    } catch (e) {
      setError('Verification failed: ' + (e.message || 'Check the code and try again.'));
      verifyBtn.disabled = false;
      verifyBtn.textContent = 'Verify & Sign In';
    }
  }

  // --- Resend code ---
  async function handleResend() {
    setError('');
    try {
      var result = await sb.auth.signInWithOtp({
        email: pendingEmail,
        options: { shouldCreateUser: false }
      });
      if (result.error) { setError(result.error.message); return; }
      subEl.textContent = 'New code sent to ' + pendingEmail;
    } catch (e) {
      setError('Could not resend. Try again in a moment.');
    }
  }

  // --- Events ---
  document.getElementById('auth-switch-link').addEventListener('click', function () {
    setMode(mode === 'signin' ? 'signup' : 'signin');
  });
  submitBtn.addEventListener('click', handleSubmit);
  if (verifyBtn) verifyBtn.addEventListener('click', handleVerify);
  if (resendLink) resendLink.addEventListener('click', handleResend);
  if (codeIn) codeIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleVerify(); });
  passIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') handleSubmit(); });
  emailIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') passIn.focus(); });
  nameIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') emailIn.focus(); });
  document.getElementById('nav-logout').addEventListener('click', function () { sb.auth.signOut(); });

  // --- Auth state ---
  sb.auth.onAuthStateChange(function (_event, session) {
    if (_signingUp) return; // Ignore during signup flow
    if (session) { ensureProfile(session.user); showApp(session.user); }
    else { showAuth(); }
  });

  sb.auth.getSession().then(function (response) {
    var session = response.data.session;
    if (session) { ensureProfile(session.user); showApp(session.user); }
    else { showAuth(); }
  });
})();

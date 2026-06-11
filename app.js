// ==================== LOCAL-DATE HELPER ====================
// Format a Date as YYYY-MM-DD using LOCAL components (NOT UTC).
// toISOString() shifts to UTC and breaks day boundaries for non-UTC timezones.
function ymd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ==================== MOBILE MENU ====================
function closeMobileMenu() {
  var d = document.getElementById('mobile-menu-drawer');
  var b = document.getElementById('mobile-menu-backdrop');
  if (d) d.classList.remove('open');
  if (b) b.classList.remove('open');
}
(function () {
  var btn = document.getElementById('mobile-menu-btn');
  var close = document.getElementById('mobile-menu-close');
  var backdrop = document.getElementById('mobile-menu-backdrop');
  if (btn) btn.addEventListener('click', function () {
    document.getElementById('mobile-menu-drawer').classList.add('open');
    document.getElementById('mobile-menu-backdrop').classList.add('open');
    // sync user info into drawer
    var email = document.getElementById('nav-email');
    var avatar = document.getElementById('nav-avatar');
    var footer = document.getElementById('mobile-menu-user');
    if (footer && email) {
      var html = '';
      if (avatar && avatar.src && avatar.style.display !== 'none') html += '<img src="' + avatar.src + '" class="nav-avatar" style="width:32px;height:32px"/>';
      html += '<span style="font-size:13px;color:#aaa;font-family:Inter,system-ui,sans-serif;font-weight:500">' + email.textContent + '</span>';
      html += '<button onclick="document.getElementById(\'nav-logout\').click();closeMobileMenu()" style="margin-top:8px;width:100%;padding:10px;background:transparent;border:1px solid #333;color:#e07070;font-family:Inter,system-ui,sans-serif;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;border-radius:6px;cursor:pointer">Sign Out</button>';
      footer.innerHTML = html;
    }
  });
  if (close) close.addEventListener('click', closeMobileMenu);
  if (backdrop) backdrop.addEventListener('click', closeMobileMenu);
})();

// ==================== TAB SWITCHING ====================
var TAB_LABELS = { tracker: 'Weekly Tracker', todo: 'To-Do', progress: 'Progress', ranker: 'Ranker', streak: 'Streak', logbook: 'Logbook' };
function switchTab(name, persist) {
  const panel = document.getElementById('tab-' + name);
  const button = document.querySelector('.nav-tab[data-tab="' + name + '"]');
  if (!panel || !button) return;
  document.querySelectorAll('.tool-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  panel.classList.add('active');
  button.classList.add('active');
  // sync mobile menu active state
  document.querySelectorAll('.mobile-menu-item').forEach(function (mi) {
    mi.classList.toggle('active', mi.dataset.tab === name);
  });
  // Update mobile header to show current tab name
  var brand = document.getElementById('nav-brand-label');
  if (brand && window.innerWidth <= 640) {
    brand.textContent = '⬛ ' + (TAB_LABELS[name] || 'Dashboard');
  }
  // Show/hide "Change API Key" menu item based on tab
  var apiKeyBtn = document.getElementById('mobile-change-api-key');
  if (apiKeyBtn) apiKeyBtn.style.display = (name === 'ranker') ? '' : 'none';
  var promptBtn = document.getElementById('mobile-change-prompt');
  if (promptBtn) promptBtn.style.display = (name === 'ranker') ? '' : 'none';
  if (persist !== false) DB.savePrefs({ active_tab: name, tracker_theme: document.getElementById('tab-tracker').getAttribute('data-theme') || 'light' });
}

// ==================== GLOBAL THEME TOGGLE ====================
function toggleGlobalTheme() {
  var current = document.body.getAttribute('data-global-theme') || 'dark';
  var next = current === 'dark' ? 'light' : 'dark';
  document.body.setAttribute('data-global-theme', next);
  // Also sync tracker tab theme
  document.getElementById('tab-tracker').setAttribute('data-theme', next);
  // Update nav bar for light mode
  var nav = document.getElementById('app-nav');
  if (nav) nav.setAttribute('data-theme', next);
  // Update theme toggle icons
  var desktopBtn = document.getElementById('nav-theme-toggle');
  if (desktopBtn) desktopBtn.textContent = next === 'dark' ? '☀️' : '🌙';
  var mobileBtn = document.getElementById('mobile-theme-toggle');
  if (mobileBtn) {
    mobileBtn.innerHTML = '<span class="nav-icon">' + (next === 'dark' ? '☀️' : '🌙') + '</span> ' + (next === 'dark' ? 'Light Mode' : 'Dark Mode');
  }
  DB.savePrefs({ tracker_theme: next });
}
window.toggleGlobalTheme = toggleGlobalTheme;

// ==================== INIT ALL TABS ON AUTH READY ====================
DB.onReady(async function () {
  const prefs = await DB.loadPrefs();
  if (prefs.active_tab) switchTab(prefs.active_tab, false);
  if (prefs.tracker_theme) {
    document.body.setAttribute('data-global-theme', prefs.tracker_theme);
    document.getElementById('tab-tracker').setAttribute('data-theme', prefs.tracker_theme);
    var nav = document.getElementById('app-nav');
    if (nav) nav.setAttribute('data-theme', prefs.tracker_theme);
    var desktopBtn = document.getElementById('nav-theme-toggle');
    if (desktopBtn) desktopBtn.textContent = prefs.tracker_theme === 'dark' ? '☀️' : '🌙';
    var mobileBtn = document.getElementById('mobile-theme-toggle');
    if (mobileBtn) mobileBtn.innerHTML = '<span class="nav-icon">' + (prefs.tracker_theme === 'dark' ? '☀️' : '🌙') + '</span> ' + (prefs.tracker_theme === 'dark' ? 'Light Mode' : 'Dark Mode');
  }
  initTodo();
  await initProgress();
  try { await DB.migrateUTCKeys(); } catch (e) { console.warn('UTC migration skipped:', e); }
  await initTracker();
  initRanker();
  initStreak();
  initLogbook();
});

// ==================== TAB 1: TO-DO ====================
async function initTodo() {
  let tasks = await DB.loadTodos();
  let selectedPriority = 'none';
  const collapsedDates = new Set();
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  function ordSuffix(n) { var s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
  const now = new Date();
  document.getElementById('today-date').textContent = days[now.getDay()] + ', ' + ordSuffix(now.getDate()) + ' ' + months[now.getMonth()] + ' ' + now.getFullYear();
  window.todoToggleDate = function (key) {
    if (collapsedDates.has(key)) collapsedDates.delete(key); else collapsedDates.add(key);
    todoRender();
  };

  window.todoSelectPriority = function (el) {
    document.querySelectorAll('#tab-todo .p-tag').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    selectedPriority = el.dataset.p;
  };

  window.todoAddTask = async function () {
    const input = document.getElementById('task-input');
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    var tempId = Date.now();
    tasks.push({ id: tempId, text, done: false, priority: selectedPriority, created_at: new Date().toISOString() });
    todoRender();
    input.value = '';
    input.style.height = 'auto';
    input.focus();
    var row = await DB.insertTodo({ text, done: false, priority: selectedPriority });
    if (row) { var t = tasks.find(function(x){ return x.id === tempId; }); if (t) t.id = row.id; }
  };

  window.todoToggleTask = function (id) {
    const t = tasks.find(t => t.id === id);
    if (t) {
      t.done = !t.done;
      todoRender();
      DB.updateTodo(id, { done: t.done });
    }
  };

  window.todoEditTask = function (id) {
    const li = document.querySelector('#task-list [data-id="' + id + '"]');
    const t = tasks.find(x => x.id === id);
    if (!li || !t || li.querySelector('.task-edit-input')) return;
    const span = li.querySelector('.task-text');
    if (!span) return;
    const ta = document.createElement('textarea');
    ta.className = 'task-edit-input';
    ta.value = t.text;
    span.replaceWith(ta);
    ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
    ta.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
    var committed = false;
    function commit() {
      if (committed) return; committed = true;
      const v = ta.value.trim();
      if (v && v !== t.text) { t.text = v; DB.updateTodo(id, { text: v }); }
      todoRender();
    }
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { committed = true; todoRender(); }
    });
    ta.addEventListener('blur', commit);
  };

  window.todoDeleteTask = function (id) {
    const li = document.querySelector('#task-list [data-id="' + id + '"]');
    if (li) {
      li.classList.add('removing');
      li.addEventListener('animationend', () => {
        tasks = tasks.filter(t => t.id !== id);
        todoRender();
        DB.deleteTodo(id);
      }, { once: true });
    }
  };

  function escHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function todoRender() {
    const list = document.getElementById('task-list');
    const total = tasks.length, done = tasks.filter(t => t.done).length, left = total - done;
    const pct = total ? Math.round((done / total) * 100) : 0;
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-done').textContent = done;
    document.getElementById('stat-left').textContent = left;
    document.getElementById('progress-pct').textContent = pct + '%';
    document.getElementById('progress-fill').style.width = pct + '%';
    if (!total) { list.innerHTML = '<li class="empty"><div class="empty-icon">✦</div><p>Nothing yet — your day awaits.</p></li>'; return; }
    const pOrder = { high: 0, med: 1, low: 2, none: 3 };
    function localDayKey(ts) { return ts ? ymd(new Date(ts)) : 'unknown'; }
    const sorted = [...tasks].sort((a, b) => {
      const da = localDayKey(a.created_at), db = localDayKey(b.created_at);
      if (da !== db) return da < db ? 1 : -1;
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (pOrder[a.priority] ?? 3) - (pOrder[b.priority] ?? 3);
    });
    const grouped = {};
    sorted.forEach(t => {
      const dateKey = localDayKey(t.created_at);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(t);
    });
    let html = '';
    Object.entries(grouped).forEach(([dateKey, items]) => {
      let heading = dateKey;
      if (dateKey !== 'unknown') {
        const d = new Date(dateKey + 'T00:00:00');
        heading = days[d.getDay()] + ', ' + ordSuffix(d.getDate()) + ' ' + months[d.getMonth()];
      }
      const isCollapsed = collapsedDates.has(dateKey);
      const doneCount = items.filter(t => t.done).length;
      html += '<li class="date-header ' + (isCollapsed ? 'collapsed' : '') + '" onclick="todoToggleDate(\'' + dateKey + '\')"><span class="date-caret">' + (isCollapsed ? '▸' : '▾') + '</span><span class="date-label">' + heading + '</span><span class="date-count">' + doneCount + '/' + items.length + '</span></li>';
      if (!isCollapsed) {
        html += items.map(t => `<li class="task-item ${t.done ? 'done' : ''}" data-id="${t.id}"><button class="check-btn" onclick="todoToggleTask(${t.id})"><svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.8 7L9 1" stroke="#0f0f0f" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><span class="p-dot ${t.priority}"></span><span class="task-text">${escHtml(t.text)}</span><button class="edit-btn" onclick="todoEditTask(${t.id})" title="Edit task"><svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="del-btn" onclick="todoDeleteTask(${t.id})"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2L12 12M12 2L2 12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></button></li>`).join('');
      }
    });
    list.innerHTML = html;
  }

  var todoInput = document.getElementById('task-input');
  todoInput.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); todoAddTask(); } });
  todoInput.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
  todoRender();

  // ---- Daily Push Notification Reminder (Version 2.1) ----
  var VAPID_PUBLIC_KEY = 'BFnTAY1IUE4WO3dKgOO5t5XrwZytZj1sGqZgxjJQ6_lxUPPyoH5zGD4JvVJyoAaAKQKs9vs2x-IuSzdgRFKoWvI';
  var notifSubscription = null;
  var notifHour = 21;
  var notifActive = false;

  function urlBase64ToUint8Array(base64String) {
    var padding = '='.repeat((4 - base64String.length % 4) % 4);
    var base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    var rawData = atob(base64);
    var outputArray = new Uint8Array(rawData.length);
    for (var i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
  }

  function formatHour(h) {
    if (h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    return h > 12 ? (h - 12) + ':00 PM' : h + ':00 AM';
  }

  async function notifLoadState() {
    var sb = window._supabase;
    var { data } = await sb.from('push_subscriptions').select('notif_hour, endpoint').eq('user_id', DB.uid()).maybeSingle();
    if (data) { notifActive = true; notifHour = data.notif_hour; }
    else { notifActive = false; }
  }

  function notifUpdateUI() {
    var btn = document.getElementById('notif-toggle-btn');
    var label = document.getElementById('notif-label');
    var status = document.getElementById('notif-status');
    var timeRow = document.getElementById('notif-time-row');
    var hourInput = document.getElementById('notif-hour-input');
    var ampmBtn = document.getElementById('notif-ampm-btn');
    if (!btn) return;
    if (notifActive) {
      btn.classList.add('active');
      label.textContent = 'Reminders On';
      document.getElementById('notif-bell').textContent = '🔔';
      status.textContent = 'Daily at ' + formatHour(notifHour);
      if (timeRow) timeRow.style.display = 'flex';
      if (hourInput) {
        var display12 = notifHour === 0 ? 12 : (notifHour > 12 ? notifHour - 12 : notifHour);
        hourInput.value = display12;
      }
      if (ampmBtn) ampmBtn.textContent = notifHour >= 12 ? 'PM' : 'AM';
    } else {
      btn.classList.remove('active');
      label.textContent = 'Enable Reminders';
      document.getElementById('notif-bell').textContent = '🔕';
      status.textContent = '';
      if (timeRow) timeRow.style.display = 'none';
    }
  }

  window.todoToggleNotifications = async function () {
    if (!notifActive) {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        alert('Push notifications are not supported in your browser.');
        return;
      }
      if (Notification.permission === 'denied') {
        alert('Notifications are blocked. Please enable them in your browser settings and try again.');
        return;
      }
      try {
        var reg = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        var sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });
        var keys = sub.toJSON();
        var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
        await window._supabase.from('push_subscriptions').upsert({
          user_id: DB.uid(),
          endpoint: keys.endpoint,
          p256dh: keys.keys.p256dh,
          auth_key: keys.keys.auth,
          notif_hour: notifHour,
          timezone: tz
        }, { onConflict: 'user_id,endpoint' });
        notifActive = true;
        notifSubscription = sub;
      } catch (e) {
        console.error('Push subscription failed:', e);
        alert('Could not enable notifications. Please make sure you allow notifications when prompted.');
        return;
      }
    } else {
      try {
        var regs = await navigator.serviceWorker.getRegistrations();
        for (var r = 0; r < regs.length; r++) {
          var existingSub = await regs[r].pushManager.getSubscription();
          if (existingSub) await existingSub.unsubscribe();
        }
        await window._supabase.from('push_subscriptions').delete().eq('user_id', DB.uid());
      } catch (e) { console.warn('Unsubscribe error:', e); }
      notifActive = false;
      notifSubscription = null;
    }
    notifUpdateUI();
  };

  window.todoToggleAmPm = function () {
    var ampmBtn = document.getElementById('notif-ampm-btn');
    if (!ampmBtn) return;
    ampmBtn.textContent = ampmBtn.textContent === 'AM' ? 'PM' : 'AM';
    todoSaveNotifTime();
  };

  window.todoSaveNotifTime = async function () {
    var hourInput = document.getElementById('notif-hour-input');
    var ampmBtn = document.getElementById('notif-ampm-btn');
    if (!hourInput || !ampmBtn) return;
    var h = parseInt(hourInput.value);
    if (isNaN(h) || h < 1 || h > 12) return;
    var isPM = ampmBtn.textContent === 'PM';
    var hour24 = h === 12 ? (isPM ? 12 : 0) : (isPM ? h + 12 : h);
    notifHour = hour24;
    var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    await window._supabase.from('push_subscriptions')
      .update({ notif_hour: notifHour, timezone: tz })
      .eq('user_id', DB.uid());
    notifUpdateUI();
  };

  await notifLoadState();
  notifUpdateUI();
}

// ==================== TAB 2: PROGRESS ====================
async function initProgress() {
  const WEEK_COLORS = ['#c8ff00','#7c6fff','#ff6b8a','#00d4aa','#ff9f43','#54a0ff','#ff6348','#5f27cd','#01a3a4','#f368e0','#10ac84','#ee5a24'];
  const defaultRows = [{ week: 'Week 1', pct: 0 }];

  let saved = await DB.loadProgress();
  let rows = saved ? saved.rows : defaultRows;
  let chartTitle = saved ? saved.chartTitle : 'My Progress';
  let passingPercent = saved ? saved.passingPercent : 70;

  const PASS_COLOR = '#27ae60', FAIL_COLOR = '#ff4d6d';
  const canvasEl = document.getElementById('prog-chart');
  const ctx = canvasEl.getContext('2d');
  let chartType = (function () { try { return localStorage.getItem('progChartType') || 'bar'; } catch (e) { return 'bar'; } })();
  if (chartType !== 'bar' && chartType !== 'line') chartType = 'bar';
  let chart;

  function chartCommonOptions() {
    var isMobile = window.innerWidth <= 640;
    var tickSize = isMobile ? 9 : 11;
    return { responsive: true, maintainAspectRatio: true, animation: { duration: 500, easing: 'easeInOutQuart' }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#16161f', borderColor: '#c8ff00', borderWidth: 1, titleColor: '#c8ff00', bodyColor: '#f0f0f5', titleFont: { family: 'Inter, system-ui, sans-serif', size: 13, weight: '700' }, bodyFont: { family: 'Inter, system-ui, sans-serif', size: 12 }, padding: 12, callbacks: { label: c => ' ' + c.parsed.y + '%' } } }, scales: { x: { grid: { display: false }, ticks: { color: function (c) { return WEEK_COLORS[c.index % WEEK_COLORS.length]; }, font: { family: 'Inter, system-ui, sans-serif', size: tickSize, weight: 'bold' }, maxRotation: 45, minRotation: 0, autoSkip: true, autoSkipPadding: 4 }, border: { display: false } }, y: { min: 0, grid: { display: false }, ticks: { color: '#6b6b80', font: { family: 'Inter, system-ui, sans-serif', size: tickSize }, callback: v => v + '%' }, border: { display: false } } } };
  }

  function buildChart(type) {
    let dataset;
    if (type === 'line') {
      dataset = { label: 'Progress (%)', data: [], borderColor: PASS_COLOR, backgroundColor: 'rgba(39,174,96,0.12)', borderWidth: 2.5, pointBackgroundColor: PASS_COLOR, pointBorderColor: '#0a0a0f', pointBorderWidth: 2, pointRadius: 6, pointHoverRadius: 9, fill: true, tension: .35 };
    } else {
      dataset = { label: 'Progress (%)', data: [], backgroundColor: [], borderColor: [], borderWidth: 1, borderRadius: 4, maxBarThickness: window.innerWidth <= 640 ? 28 : 56 };
    }
    return new Chart(ctx, { type, data: { labels: [], datasets: [dataset] }, options: chartCommonOptions() });
  }

  chart = buildChart(chartType);

  function applyTypeLabel() {
    const lbl = document.getElementById('chartTypeLabel');
    if (lbl) lbl.textContent = chartType === 'line' ? 'Line Graph' : 'Bar Graph';
    const bBtn = document.getElementById('chartTypeBar'), lBtn = document.getElementById('chartTypeLine');
    if (bBtn) bBtn.classList.toggle('active', chartType === 'bar');
    if (lBtn) lBtn.classList.toggle('active', chartType === 'line');
  }
  applyTypeLabel();

  window.progSetChartType = function (t) {
    if (t !== 'bar' && t !== 'line') return;
    if (t === chartType) return;
    chartType = t;
    try { localStorage.setItem('progChartType', chartType); } catch (e) {}
    chart.destroy();
    chart = buildChart(chartType);
    applyTypeLabel();
    updateChart();
  };

  document.getElementById('chartNameInput').value = chartTitle;
  document.getElementById('chartTitleDisplay').textContent = chartTitle;
  document.getElementById('progPassInput').value = String(passingPercent);

  function escHtml(s) { return String(s).replace(/"/g, '&quot;'); }

  function progSave() {
    showSavedTime();
    DB.saveProgress({ rows, chartTitle, passingPercent });
  }

  function showSavedTime() {
    const el = document.getElementById('progSavedAt');
    const d = new Date();
    const h = d.getHours(), m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    el.textContent = 'Saved ' + hh + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm + ' — ' + d.toLocaleDateString();
  }

  function renderRows() {
    const list = document.getElementById('rowList');
    list.innerHTML = '';
    rows.forEach((r, i) => {
      const c = WEEK_COLORS[i % WEEK_COLORS.length];
      const div = document.createElement('div');
      div.className = 'data-row';
      div.innerHTML = `<input type="text" value="${escHtml(r.week)}" placeholder="Week ${i + 1}" style="border-left:3px solid ${c}" oninput="progUpdateWeek(${i},this.value)" onkeydown="if(event.key==='Enter'){this.nextElementSibling.focus()}"/><input type="number" value="${r.pct}" min="0" placeholder="%" oninput="progUpdatePct(${i},this.value)" onkeydown="if(event.key==='Enter'){progAddRow()}"/><button class="del-btn" onclick="progDeleteRow(${i})" title="Remove">✕</button>`;
      list.appendChild(div);
    });
    updateChart();
    showSavedTime();
  }

  function updateChart() {
    chart.data.labels = rows.map(r => r.week);
    chart.data.datasets[0].data = rows.map(r => r.pct);
    chart.update();
    const vals = rows.map(r => r.pct).filter(v => !isNaN(v));
    if (vals.length) {
      document.getElementById('statPeak').textContent = Math.max(...vals) + '%';
      document.getElementById('statAvg').textContent = (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) + '%';
    }
    applyProgressStatus();
  }

  function applyProgressStatus() {
    const ch = chart;
    if (!ch) return;
    const avg = rows.length ? rows.map(r => r.pct).filter(v => !isNaN(v)) : [];
    const avgVal = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length : null;
    // New users (< 2 weeks data): always green. After that: green/red based on passing %
    const isNewUser = avg.length < 2;
    const passed = isNewUser ? true : (avgVal != null && avgVal >= passingPercent);
    const themeColor = passed ? PASS_COLOR : FAIL_COLOR;
    const label = isNewUser ? 'Add more weeks to see pass/fail status' : (avgVal == null ? 'Passing target: ' + passingPercent + '%' : (passed ? 'Passing' : 'Below passing') + ' - target ' + passingPercent + '%');
    const ds = ch.data.datasets[0];
    if (chartType === 'line') {
      ds.borderColor = themeColor;
      ds.backgroundColor = passed ? 'rgba(39,174,96,0.14)' : 'rgba(255,77,109,0.14)';
      ds.pointBackgroundColor = rows.map(() => themeColor);
      ds.segment = { borderColor: themeColor };
    } else {
      ds.backgroundColor = rows.map(() => themeColor);
      ds.borderColor = rows.map(() => themeColor);
    }
    ch.options.plugins.tooltip.borderColor = themeColor;
    ch.options.plugins.tooltip.titleColor = themeColor;
    ch.options.scales.x.ticks.color = themeColor;
    const passData = ch.data.labels.map(() => passingPercent);
    if (ch.data.datasets.length < 2) {
      ch.data.datasets.push({ type: 'line', label: 'Passing %', data: passData, borderColor: '#8a8a9e', backgroundColor: 'transparent', borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, pointHoverRadius: 0, fill: false, tension: 0, order: 0 });
    } else { ch.data.datasets[1].data = passData; }
    const card = document.getElementById('chartCard');
    if (card) { card.classList.toggle('pass', passed); card.classList.toggle('fail', !passed); }
    let statusEl = document.getElementById('progPassStatus');
    if (!statusEl) {
      const tb = document.querySelector('#tab-progress .chart-title-block');
      if (tb) { statusEl = document.createElement('div'); statusEl.id = 'progPassStatus'; statusEl.className = 'chart-status'; tb.appendChild(statusEl); }
    }
    if (statusEl) { statusEl.textContent = label; statusEl.className = 'chart-status ' + (passed ? 'pass' : 'fail'); }
    document.querySelectorAll('#rowList .data-row input[type="text"]').forEach(inp => { inp.style.borderLeft = '3px solid ' + themeColor; });
    ch.update();
  }

  window.progAddRow = async function () {
    const n = rows.length + 1;
    rows.push({ week: 'Week ' + n, pct: 0 });
    await progSave(); renderRows(); progShowToast('Week ' + n + ' added');
  };
  window.progDeleteRow = async function (i) {
    if (rows.length === 1) { progShowToast('Need at least one row'); return; }
    rows.splice(i, 1); await progSave(); renderRows();
  };
  window.progUpdateWeek = async function (i, v) { rows[i].week = v; await progSave(); updateChart(); };
  window.progUpdatePct = async function (i, v) {
    let n = parseFloat(v); if (isNaN(n)) n = 0; n = Math.max(0, n);
    rows[i].pct = n; await progSave(); updateChart();
  };
  window.progClearAll = async function () {
    if (!confirm('Clear all data?')) return;
    rows = [{ week: 'Week 1', pct: 0 }]; await progSave(); renderRows(); progShowToast('Cleared');
  };
  window.progUpdateChartTitle = function (v) {
    chartTitle = v || 'My Progress';
    document.getElementById('chartTitleDisplay').textContent = chartTitle;
    DB.saveProgress({ rows, chartTitle, passingPercent });
  };
  window.progDownloadChart = function () {
    const title = document.getElementById('chartNameInput').value || 'progress-chart';
    const canvas = document.getElementById('prog-chart');
    const off = document.createElement('canvas'); off.width = canvas.width; off.height = canvas.height;
    const octx = off.getContext('2d'); octx.fillStyle = '#16161f'; octx.fillRect(0, 0, off.width, off.height); octx.drawImage(canvas, 0, 0);
    const link = document.createElement('a'); link.download = title.replace(/\s+/g, '-').toLowerCase() + '-' + chartType + '.png'; link.href = off.toDataURL('image/png'); link.click();
    progShowToast(chartType === 'line' ? 'Line graph downloaded!' : 'Bar graph downloaded!');
  };
  window.progDownloadCSV = function () {
    const title = document.getElementById('chartNameInput').value || 'progress';
    let csv = 'Week,Percentage\n'; rows.forEach(r => { csv += '"' + r.week + '",' + r.pct + '\n'; });
    const blob = new Blob([csv], { type: 'text/csv' }); const link = document.createElement('a');
    link.href = URL.createObjectURL(blob); link.download = title.replace(/\s+/g, '-').toLowerCase() + '.csv'; link.click();
    progShowToast('CSV exported!');
  };

  document.getElementById('progPassInput').addEventListener('input', function (ev) {
    const next = Number(ev.target.value);
    passingPercent = Number.isFinite(next) ? Math.max(0, next) : 70;
    DB.saveProgress({ rows, chartTitle, passingPercent });
    applyProgressStatus();
  });

  let progToastTimer;
  function progShowToast(msg) {
    const t = document.getElementById('prog-toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(progToastTimer); progToastTimer = setTimeout(() => t.classList.remove('show'), 2200);
  }
  window.progShowToast = progShowToast;

  window.progSyncFromTracker = async function (weekEntries) {
    let changed = false;
    weekEntries.forEach(function (entry) {
      const existing = rows.findIndex(function (r) { return r.week === entry.week; });
      if (existing >= 0) {
        if (rows[existing].pct !== entry.pct) { rows[existing].pct = entry.pct; changed = true; }
      } else {
        rows.push({ week: entry.week, pct: entry.pct });
        changed = true;
      }
    });
    if (changed) { await progSave(); renderRows(); }
  };

  renderRows();
}

// ==================== TAB 3: WEEK TRACKER ====================
async function initTracker() {
  const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const DAYS_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  let currentOffset = 0, selectedDayIdx = null;

  function getSundayOf(offset) {
    const d = new Date(); d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    d.setDate(d.getDate() - day + (offset || 0) * 7);
    return ymd(d);
  }
  function getWeekDates(mk) {
    const base = new Date(mk + 'T00:00:00');
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(base); d.setDate(d.getDate() + i); return d; });
  }
  function fmt(d) { return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); }
  function getWeekNum(d) {
    const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = dt.getUTCDay() || 7; dt.setUTCDate(dt.getUTCDate() + 4 - day);
    const ys = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
    return Math.ceil((((dt - ys) / 86400000) + 1) / 7);
  }
  function dayAvg(tasks) {
    if (!tasks || !tasks.length) return 0;
    return tasks.reduce((s, t) => s + t.rating, 0) / tasks.length;
  }
  function validDayKeys(weekKey) {
    if (!weekKey) return null;
    return getWeekDates(weekKey).map(ymd);
  }
  function weekScore(data, weekKey) {
    if (data.manualRating != null) return +data.manualRating;
    const validKeys = validDayKeys(weekKey);
    let sum = 0, hasData = false;
    if (validKeys) {
      validKeys.forEach(function (ds) {
        const tasks = data.days[ds];
        if (tasks && tasks.length) { sum += dayAvg(tasks); hasData = true; }
      });
    } else {
      // Fallback when weekKey unknown — sum all
      const allDates = Object.keys(data.days);
      if (!allDates.length) return null;
      Object.values(data.days).forEach(function (tasks) { sum += dayAvg(tasks); });
      hasData = true;
    }
    return hasData ? +sum.toFixed(2) : null;
  }
  function tier(score) {
    if (score == null) return null;
    if (score > 6.5) return { label: 'Overachiever', cls: 'tier-over', color: 'var(--green)' };
    if (score >= 5) return { label: 'Good', cls: 'tier-good', color: 'var(--blue)' };
    if (score >= 4) return { label: 'Average', cls: 'tier-avg', color: 'var(--amber)' };
    return { label: 'Underachiever', cls: 'tier-under', color: 'var(--red)' };
  }
  function barClass(s) { if (s == null) return 'bar-empty'; if (s > 6.5) return 'bar-over'; if (s >= 5) return 'bar-good'; if (s >= 4) return 'bar-avg'; return 'bar-under'; }
  function escHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function countAllTasks(data, weekKey) {
    const validKeys = validDayKeys(weekKey);
    if (!validKeys) return Object.values(data.days).reduce((s, ts) => s + ts.length, 0);
    let count = 0;
    validKeys.forEach(ds => { const ts = data.days[ds]; if (ts) count += ts.length; });
    return count;
  }
  function tierDesc(score) { if (score == null) return ''; if (score > 6.5) return 'Near-perfect discipline.'; if (score >= 5) return 'Strong performance this week.'; if (score >= 4) return 'Meeting the baseline.'; return 'Below baseline.'; }
  function bestStreak(scores) { let st = 0, b = 0; scores.forEach(s => { if (s >= 4) { st++; b = Math.max(b, st); } else st = 0; }); return b; }
  function openingLine(ws, prev) {
    const diff = prev != null ? ws - prev : null;
    if (ws > 6.5) return 'Extraordinary performance this week.' + (diff > 0 ? ' Improving from last week.' : '');
    if (ws >= 5) return 'Strong week — good discipline.' + (diff != null ? (diff >= 0 ? ' Held ground or improved.' : ' Slight dip, but solid.') : '');
    if (ws >= 4) return 'Average week.' + (diff != null ? (diff > 0 ? ' Better than last week.' : diff < 0 ? ' A step down.' : ' Consistent.') : '');
    return 'Challenging week.' + (diff != null && diff > 0 ? ' Still improved on last week.' : '');
  }
  function trendLine(trend) {
    if (trend > 0.5) return '📈 Scores <strong>trending up</strong> over 3 weeks.';
    if (trend < -0.5) return '📉 Scores <strong>trending down</strong> the last 3 weeks.';
    return '➡️ Scores relatively <strong>stable</strong>.';
  }
  function tierAdvice(ws, t) {
    if (!t) return '';
    const a = { 'tier-over': 'Exceptional discipline. Keep this up.', 'tier-good': 'Strong week. Target your weakest days.', 'tier-avg': 'Decent baseline. Push for consistency.', 'tier-under': 'Below average. Identify what\'s dragging your score.' };
    return a[t.cls] || '';
  }

  window.trackerJumpToWeek = function (key) {
    const base = new Date(getSundayOf(0) + 'T00:00:00'), target = new Date(key + 'T00:00:00');
    currentOffset = Math.round((target - base) / (7 * 24 * 60 * 60 * 1000));
    selectedDayIdx = 0; render();
    document.getElementById('tab-tracker').scrollTo({ top: 0, behavior: 'smooth' });
  };

  var _weekCache = {};
  async function _loadWeekCached(key) {
    if (_weekCache[key]) return _weekCache[key];
    var d = await DB.loadWeek(key);
    _weekCache[key] = d;
    return d;
  }
  function _saveWeekBg(key, obj) { _weekCache[key] = obj; DB.saveWeek(key, obj); }

  async function render() {
    const mondayKey = getSundayOf(currentOffset), data = await _loadWeekCached(mondayKey), dates = getWeekDates(mondayKey);
    const todayStr = ymd(new Date()), isThis = currentOffset === 0;
    if (selectedDayIdx === null) { if (isThis) { selectedDayIdx = new Date().getDay(); } else selectedDayIdx = 0; }
    const wn = getWeekNum(new Date(mondayKey + 'T00:00:00'));
    document.getElementById('weekPill').textContent = 'Week ' + wn;
    document.getElementById('weekTitle').textContent = 'Week ' + wn;
    var rangeText = fmt(dates[0]) + '  –  ' + fmt(dates[6]);
    document.getElementById('weekRange').textContent = rangeText;
    var wr2 = document.getElementById('weekRange2');
    if (wr2) wr2.textContent = rangeText;
    const ws = weekScore(data, mondayKey), t = tier(ws);
    document.getElementById('sc-week').textContent = ws != null ? ws.toFixed(2) : '—';
    document.getElementById('sc-week-sub').textContent = data.manualRating != null ? '★ Manual override' : (ws != null ? 'Sum of daily averages' : 'No data yet');
    const tierEl = document.getElementById('sc-tier'), tierSub = document.getElementById('sc-tier-sub');
    if (t) { tierEl.innerHTML = '<span class="tier-badge ' + t.cls + '">' + t.label + '</span>'; tierSub.textContent = tierDesc(ws); }
    else { tierEl.innerHTML = '<span style="color:var(--text3);font-size:.85rem">—</span>'; tierSub.textContent = 'Log tasks to see tier'; }
    document.getElementById('manualInput').value = data.manualRating != null ? data.manualRating : '';
    const tabsEl = document.getElementById('dayTabs'); tabsEl.innerHTML = '';
    dates.forEach((d, i) => {
      const ds = ymd(d);
      const tab = document.createElement('div');
      tab.className = 'day-tab' + (ds === todayStr ? ' today' : '') + (i === selectedDayIdx ? ' active' : '') + ((data.days[ds] || []).length ? ' has-data' : '');
      tab.innerHTML = '<div class="dtab-name">' + DAYS_SHORT[i] + '</div><div class="dtab-date">' + d.getDate() + '</div><div class="dtab-dot"></div>';
      tab.addEventListener('click', () => { selectedDayIdx = i; render(); });
      tabsEl.appendChild(tab);
    });
    const selDate = dates[selectedDayIdx], selDs = ymd(selDate);
    const dayTasks = data.days[selDs] || [];
    const dayAvgVal = dayTasks.length ? (dayTasks.reduce((s, t) => s + t.rating, 0) / dayTasks.length).toFixed(2) : null;
    const panel = document.getElementById('dayPanel');
    panel.innerHTML = '<div class="panel-header"><div><div class="panel-dayname">' + DAYS_LONG[selectedDayIdx] + '</div><div class="panel-date">' + fmt(selDate) + (selDs === todayStr ? ' · Today' : '') + '</div></div>' + (dayAvgVal ? '<div class="day-avg-chip">Avg: ' + dayAvgVal + '</div>' : '') + '</div><div class="add-row add-step-name" id="addStepName"><textarea id="taskNameIn" rows="1" placeholder="Task or activity…" class="task-name-textarea"></textarea><input type="number" id="taskRatingIn" placeholder="1.0" step="0.1" min="0" max="2" title="Rating (0–2)"/><button class="add-btn" id="addTaskBtn">+ Add</button></div><div class="add-row add-step-rating" id="addStepRating" style="display:none"><div class="step-rating-label" id="stepRatingLabel"></div><input type="number" id="taskRatingIn2" placeholder="1.0" step="0.1" min="0" max="2" title="Rating (0–2)"/><button class="add-btn" id="addTaskDoneBtn">Done</button><button class="add-btn step-cancel-btn" id="addTaskCancelBtn">Cancel</button></div><div class="task-list" id="taskListEl"></div>';
    const taskListEl = document.getElementById('taskListEl');
    if (!dayTasks.length) { taskListEl.innerHTML = '<div class="empty-day"><div class="emo">📝</div>No tasks for this day yet.</div>'; }
    else {
      dayTasks.forEach((task, ti) => {
        const item = document.createElement('div'); item.className = 'task-item';
        item.innerHTML = '<div class="task-item-name">' + escHtml(task.name) + '</div><input type="number" class="task-rating-edit" value="' + task.rating + '" step="0.1" min="0" max="2" data-ti="' + ti + '"/><button class="edit-btn" data-ti="' + ti + '" title="Edit task">✎</button><button class="del-btn" data-ti="' + ti + '">×</button>';
        taskListEl.appendChild(item);
      });
      taskListEl.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const ti = +btn.dataset.ti;
          const item = btn.closest('.task-item'), nameDiv = item.querySelector('.task-item-name');
          if (!nameDiv) return;
          const ta = document.createElement('textarea');
          ta.className = 'task-name-textarea task-edit-area';
          ta.value = data.days[selDs][ti].name;
          nameDiv.replaceWith(ta);
          ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px';
          ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
          ta.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
          var committed = false;
          function commit() {
            if (committed) return; committed = true;
            const v = ta.value.trim();
            if (v) { data.days[selDs][ti].name = v; _saveWeekBg(mondayKey, data); }
            render();
          }
          ta.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { committed = true; render(); }
          });
          ta.addEventListener('blur', commit);
        });
      });
      taskListEl.querySelectorAll('.task-rating-edit').forEach(inp => {
        inp.addEventListener('change', () => {
          const ti = +inp.dataset.ti; var val = parseFloat(inp.value); if (isNaN(val)) return;
          val = Math.min(2, Math.max(0, val));
          data.days[selDs][ti].rating = val;
          _saveWeekBg(mondayKey, data); render();
        });
      });
      taskListEl.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const ti = +btn.dataset.ti;
          data.days[selDs].splice(ti, 1); if (!data.days[selDs].length) delete data.days[selDs];
          _saveWeekBg(mondayKey, data); render();
        });
      });
    }
    var isMobile = window.innerWidth <= 640;
    document.getElementById('addTaskBtn').addEventListener('click', isMobile ? mobileStepNext : addTask);
    // Auto-grow textarea
    var taskNameIn = document.getElementById('taskNameIn');
    taskNameIn.addEventListener('input', function () { this.style.height = 'auto'; this.style.height = this.scrollHeight + 'px'; });
    taskNameIn.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (isMobile) { mobileStepNext(); } else { var r = document.getElementById('taskRatingIn'); if (!r.value) { r.focus(); } else { addTask(); } } } });
    document.getElementById('taskRatingIn').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

    function mobileStepNext() {
      var nameEl = document.getElementById('taskNameIn');
      var name = nameEl.value.trim();
      if (!name) { nameEl.style.borderColor = 'var(--red)'; setTimeout(function(){ nameEl.style.borderColor = ''; }, 900); return; }
      document.getElementById('stepRatingLabel').textContent = 'Rate: ' + name;
      document.getElementById('addStepName').style.display = 'none';
      document.getElementById('addStepRating').style.display = 'flex';
      var r2 = document.getElementById('taskRatingIn2');
      r2.value = ''; r2.focus();
    }
    var doneBtn = document.getElementById('addTaskDoneBtn');
    if (doneBtn) doneBtn.addEventListener('click', mobileStepDone);
    var cancelBtn = document.getElementById('addTaskCancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', function () {
      document.getElementById('addStepRating').style.display = 'none';
      document.getElementById('addStepName').style.display = 'flex';
    });
    var r2In = document.getElementById('taskRatingIn2');
    if (r2In) r2In.addEventListener('keydown', function (e) { if (e.key === 'Enter') mobileStepDone(); });

    function mobileStepDone() {
      var nameEl = document.getElementById('taskNameIn');
      var ratingEl = document.getElementById('taskRatingIn2');
      var name = nameEl.value.trim(); var rating = parseFloat(ratingEl.value);
      if (isNaN(rating)) { ratingEl.style.borderColor = 'var(--red)'; setTimeout(function(){ ratingEl.style.borderColor = ''; }, 900); return; }
      rating = Math.min(2, Math.max(0, rating));
      if (!data.days[selDs]) data.days[selDs] = [];
      data.days[selDs].push({ name, rating });
      nameEl.value = ''; ratingEl.value = '';
      document.getElementById('addStepRating').style.display = 'none';
      document.getElementById('addStepName').style.display = 'flex';
      _saveWeekBg(mondayKey, data); render();
    }

    function addTask() {
      const nameEl = document.getElementById('taskNameIn'), ratingEl = document.getElementById('taskRatingIn');
      const name = nameEl.value.trim(); var rating = parseFloat(ratingEl.value);
      if (!name) { nameEl.style.borderColor = 'var(--red)'; setTimeout(() => nameEl.style.borderColor = '', 900); return; }
      if (isNaN(rating)) { ratingEl.style.borderColor = 'var(--red)'; setTimeout(() => ratingEl.style.borderColor = '', 900); return; }
      rating = Math.min(2, Math.max(0, rating));
      if (!data.days[selDs]) data.days[selDs] = [];
      data.days[selDs].push({ name, rating });
      nameEl.value = ''; ratingEl.value = '';
      _saveWeekBg(mondayKey, data); render();
    }
    renderWeekChart(mondayKey, data, dates);
    await renderChart(mondayKey, weekScore(data, mondayKey)); renderReport(mondayKey); renderWeeksList(mondayKey);
    if (window.progSyncFromTracker) syncToProgress();
  }

  // --- Progress Over Week (current week daily averages, 0–2 scale) ---
  function renderWeekChart(mondayKey, data, dates) {
    var area = document.getElementById('weekChartArea');
    var MAX_Y = 2;
    var gridYs = [0, 0.5, 1.0, 1.5, 2.0];
    var points = [];
    for (var i = 0; i < 7; i++) {
      var ds = ymd(dates[i]);
      var tasks = data.days[ds] || [];
      var avg = tasks.length ? tasks.reduce(function (s, t) { return s + t.rating; }, 0) / tasks.length : 0;
      points.push({ label: DAYS_SHORT[i], value: avg });
    }
    var ws = weekScore(data, mondayKey), t = tier(ws);
    var verdictEl = document.getElementById('weekVerdict');
    if (verdictEl) {
      if (t) { verdictEl.innerHTML = 'You have been <strong style="color:' + t.color + '">' + t.label + '</strong> this week'; }
      else { verdictEl.textContent = 'Daily average — 0 to 2 scale'; }
    }
    function yPct(v) { return Math.min(v / MAX_Y, 1) * 100; }
    var yLabelsHtml = gridYs.map(function (v) { return '<div class="y-lbl" style="bottom:' + yPct(v) + '%">' + v.toFixed(1) + '</div>'; }).join('');
    var gridHtml = gridYs.map(function (v) { return '<div class="grid-line" style="bottom:' + yPct(v) + '%"></div>'; }).join('');
    var xLabelsHtml = points.map(function (p) { return '<div class="x-lbl">' + p.label + '</div>'; }).join('');
    var barsHtml = points.map(function (p) {
      var h = yPct(p.value);
      var color = p.value >= 0.5 ? 'var(--green)' : p.value > 0 ? 'var(--red)' : 'var(--border2)';
      return '<div class="chart-bar-wrap"><div class="chart-bar" style="height:' + Math.max(h, 2) + '%;background:' + color + '" data-val="' + p.value.toFixed(2) + '"></div></div>';
    }).join('');
    area.innerHTML = '<div class="chart-wrap"><div class="chart-canvas-row"><div class="y-labels">' + yLabelsHtml + '</div>' + gridHtml + '<div class="chart-bars-row">' + barsHtml + '</div></div><div class="x-labels-row">' + xLabelsHtml + '</div></div>';
  }

  // --- Progress Over Time (past weeks only, 0–7 scale) ---
  async function renderChart(currentKey, curWs) {
    var area = document.getElementById('chartArea');
    var currentMondayKey = getSundayOf(0); // the actual current week
    var keys = await DB.allWeekKeys();
    // Build a continuous timeline from earliest key to current week, excluding current week
    var allKeys = [...new Set([...keys, currentKey])].sort();
    // Find the earliest week
    var earliest = allKeys[0];
    if (!earliest) { area.innerHTML = '<div class="no-chart-msg">Log tasks over multiple weeks to see progress over time.</div>'; return; }
    // Generate all weeks from earliest to the week before current
    var timelineKeys = [];
    var d = new Date(earliest + 'T00:00:00');
    while (ymd(d) < currentMondayKey) {
      timelineKeys.push(ymd(d));
      d.setDate(d.getDate() + 7);
    }
    if (timelineKeys.length < 1) { area.innerHTML = '<div class="no-chart-msg">Complete a full week to see progress over time. Current week data appears next week.</div>'; return; }
    var recent = timelineKeys.slice(-12);
    var MAX_Y = 7;
    var gridYs = [0, 1, 2, 3, 4, 5, 6, 7];
    var entries = [];
    for (var i = 0; i < recent.length; i++) {
      var k = recent[i];
      var wdata = await DB.loadWeek(k);
      var ws = weekScore(wdata, k);
      var wdates = getWeekDates(k);
      entries.push({ key: k, score: ws != null ? ws : 0, label: 'W' + getWeekNum(wdates[0]) + '\n' + (fmt(wdates[0]).split(' ')[1]?.slice(0, 3) || '') });
    }
    // Verdict vs past weeks: compare this week's score against the average of past weeks
    var pastScores = entries.filter(function (e) { return e.score > 0; }).map(function (e) { return e.score; });
    var verdictEl = document.getElementById('weekVerdict');
    if (verdictEl && curWs != null && pastScores.length) {
      var pastAvg = pastScores.reduce(function (s, v) { return s + v; }, 0) / pastScores.length;
      var vLabel, vColor;
      if (curWs >= pastAvg + 0.5) { vLabel = 'an Overachiever'; vColor = 'var(--green)'; }
      else if (curWs <= pastAvg - 0.5) { vLabel = 'an Underachiever'; vColor = 'var(--red)'; }
      else { vLabel = 'Average'; vColor = 'var(--amber)'; }
      verdictEl.innerHTML = 'You have been <strong style="color:' + vColor + '">' + vLabel + '</strong> this week — past ' + pastScores.length + ' week' + (pastScores.length > 1 ? 's' : '') + ' avg: ' + pastAvg.toFixed(2);
    }
    function yPct(v) { return Math.min(v / MAX_Y, 1) * 100; }
    // Zone bands for new tiers
    var zones = [
      { cls: 'zone-over', top: 0, bottom: (1 - 6.5/7) * 100 },
      { cls: 'zone-good', top: (1 - 6.5/7) * 100, bottom: (1 - 5/7) * 100 },
      { cls: 'zone-avg', top: (1 - 5/7) * 100, bottom: (1 - 4/7) * 100 },
      { cls: 'zone-under', top: (1 - 4/7) * 100, bottom: 100 }
    ];
    var barsHtml = entries.map(function (e) {
      var bc = barClass(e.score);
      var heightPct = yPct(e.score);
      return '<div class="chart-bar-wrap"><div class="chart-bar ' + bc + '" style="height:' + Math.max(heightPct, 2) + '%" data-val="' + e.score.toFixed(2) + '"></div></div>';
    }).join('');
    var gridHtml = gridYs.map(function (v) { return '<div class="grid-line" style="bottom:' + yPct(v) + '%"></div>'; }).join('');
    var zoneHtml = zones.map(function (z) { return '<div class="zone-band ' + z.cls + '" style="top:' + z.top.toFixed(1) + '%;height:' + (z.bottom - z.top).toFixed(1) + '%"></div>'; }).join('');
    var xLabelsHtml = entries.map(function (e) { return '<div class="x-lbl">' + e.label.replace('\n', '<br>') + '</div>'; }).join('');
    var yLabelsHtml = gridYs.map(function (v) { return '<div class="y-lbl" style="bottom:' + yPct(v) + '%">' + v + '</div>'; }).join('');
    area.innerHTML = '<div class="chart-wrap"><div class="chart-canvas-row"><div class="y-labels">' + yLabelsHtml + '</div>' + zoneHtml + gridHtml + '<div class="chart-bars-row">' + barsHtml + '</div></div><div class="x-labels-row">' + xLabelsHtml + '</div></div>';
  }

  async function renderReport(currentKey) {
    const el = document.getElementById('reportContent');
    const data = await DB.loadWeek(currentKey), ws = weekScore(data, currentKey), t = tier(ws);
    const keys = (await DB.allWeekKeys()).sort(), cIdx = keys.indexOf(currentKey);
    const scores = [];
    for (const k of keys) { const wk = await DB.loadWeek(k); const s = weekScore(wk, k); if (s != null) scores.push(s); }
    const prevKey = cIdx > 0 ? keys[cIdx - 1] : null;
    let prevWs = null; if (prevKey) { const pw = await DB.loadWeek(prevKey); prevWs = weekScore(pw, prevKey); }
    let dayStats = {};
    const validReportKeys = new Set(validDayKeys(currentKey) || []);
    Object.entries(data.days).forEach(([ds, tasks]) => {
      if (validReportKeys.size && !validReportKeys.has(ds)) return;
      if (tasks.length) { const a = tasks.reduce((s, t) => s + t.rating, 0) / tasks.length; dayStats[ds] = { avg: a, count: tasks.length }; }
    });
    const dsa = Object.entries(dayStats);
    const bestDay = dsa.length ? dsa.reduce((b, c) => c[1].avg > b[1].avg ? c : b, dsa[0]) : null;
    const worstDay = dsa.length > 1 ? dsa.reduce((b, c) => c[1].avg < b[1].avg ? c : b, dsa[0]) : null;
    const bd = bestDay ? { ds: bestDay[0], ...bestDay[1] } : null, wd = worstDay ? { ds: worstDay[0], ...worstDay[1] } : null;
    const weekTaskCount = countAllTasks(data, currentKey);
    const validDayKeysSet = new Set(validDayKeys(currentKey) || []);
    let html = '<div class="report-grid"><div class="report-stat"><div class="rs-lbl">This Week Score</div><div class="rs-val">' + (ws != null ? ws.toFixed(2) : '—') + '<span style="font-size:.9rem;color:var(--text3)"> /7</span></div><div class="rs-sub">' + (t ? t.label : 'No data') + '</div></div><div class="report-stat"><div class="rs-lbl">Tasks Logged</div><div class="rs-val">' + weekTaskCount + '</div><div class="rs-sub">Across ' + Object.keys(data.days || {}).filter(k => (data.days[k] || []).length).length + ' day' + (Object.keys(data.days || {}).filter(k => (data.days[k] || []).length).length !== 1 ? 's' : '') + '</div></div><div class="report-stat"><div class="rs-lbl">vs Last Week</div><div class="rs-val" style="color:' + (prevWs != null && ws != null ? (ws >= prevWs ? 'var(--green)' : 'var(--red)') : 'var(--text3)') + '"> ' + (prevWs != null && ws != null ? (ws >= prevWs ? '↑' : '↓') + ' ' + Math.abs(ws - prevWs).toFixed(2) : '—') + '</div><div class="rs-sub">' + (prevWs != null ? 'Prev: ' + prevWs.toFixed(2) : 'No previous data') + '</div></div><div class="report-stat"><div class="rs-lbl">All-Time Avg</div><div class="rs-val">' + (scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2) : '—') + '</div><div class="rs-sub">Over ' + scores.length + ' scored week' + (scores.length !== 1 ? 's' : '') + '</div></div></div><div class="report-text">';
    if (ws == null) { html += '<p>No data for this week yet. Start adding tasks.</p>'; }
    else {
      html += '<p>' + openingLine(ws, prevWs) + '</p>';
      if (bd) {
        const bdWdn = DAYS_LONG[new Date(bd.ds + 'T00:00:00').getDay()];
        html += '<p><strong>Best day:</strong> <span class="hi">' + bdWdn + '</span> with avg ' + bd.avg.toFixed(1) + ' across ' + bd.count + ' task' + (bd.count !== 1 ? 's' : '') + '.';
        if (wd && wd.ds !== bd.ds) { const wdWdn = DAYS_LONG[new Date(wd.ds + 'T00:00:00').getDay()]; html += ' Weakest: <span class="hi">' + wdWdn + '</span> (' + wd.avg.toFixed(1) + ' avg).</p>'; } else html += '</p>';
      }
      if (scores.length >= 3) { const r3 = scores.slice(-3); html += '<p><strong>Trend:</strong> ' + trendLine(r3[2] - r3[0]) + '</p>'; }
      html += '<p>' + tierAdvice(ws, t) + '</p>';
    }
    html += '</div>';
    if (ws != null) {
      html += '<div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" id="downloadMdBtn" style="font-size:.8rem;padding:8px 18px">↓ Download as .md</button><button class="btn btn-ghost" id="downloadTxtBtn" style="font-size:.8rem;padding:8px 18px">↓ Download as .txt</button></div>';
    }
    el.innerHTML = html;
    var mdBtn = document.getElementById('downloadMdBtn');
    var txtBtn = document.getElementById('downloadTxtBtn');
    if (mdBtn) mdBtn.addEventListener('click', function () { downloadWeeklyReport(currentKey, data, ws, 'md'); });
    if (txtBtn) txtBtn.addEventListener('click', function () { downloadWeeklyReport(currentKey, data, ws, 'txt'); });
  }

  function buildWeeklyReportContent(weekKey, data, ws) {
    var dates = getWeekDates(weekKey);
    var wn = getWeekNum(dates[0]);
    var pct = Math.round(ws / 7 * 10000) / 100;
    var monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    function ordinal(n) { var s = ['th','st','nd','rd'], v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
    var startD = dates[0], endD = dates[6];
    var rangeStr = ordinal(startD.getDate()) + ' ' + monthNames[startD.getMonth()] + ' to ' + ordinal(endD.getDate()) + ' ' + monthNames[endD.getMonth()];
    var validSet = new Set(validDayKeys(weekKey) || []);
    var allTasks = [];
    Object.keys(data.days || {}).forEach(function (dk) {
      if (validSet.size && !validSet.has(dk)) return;
      (data.days[dk] || []).forEach(function (t) { allTasks.push(t.name); });
    });
    var out = '\n' + wn + '. Things done from the ' + rangeStr + '.\n';
    out += '   Week Score: ' + ws.toFixed(2) + '\n';
    out += '   Percentage: ' + pct + '%\n';
    out += '   Tasks Logged: ' + allTasks.length + '\n';
    out += '   \n';
    out += '   Tasks Done:/\n';
    if (allTasks.length) { allTasks.forEach(function (t, i) { out += (i + 1) + '. ' + t + '\n'; }); }
    else { out += '(No tasks logged)\n'; }
    return { content: out, weekNum: wn };
  }

  function downloadWeeklyReport(weekKey, data, ws, fmt) {
    var built = buildWeeklyReportContent(weekKey, data, ws);
    var mime = fmt === 'txt' ? 'text/plain' : 'text/markdown';
    var blob = new Blob([built.content], { type: mime });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Week-' + built.weekNum + '-Report.' + fmt;
    link.click();
  }

  async function renderWeeksList(currentKey) {
    const el = document.getElementById('weeksList'), keys = await DB.allWeekKeys();
    const all = [...new Set([currentKey, ...keys])].sort().reverse();
    if (!all.length) { el.innerHTML = '<p style="color:var(--text3);font-size:.85rem;font-style:italic">No weeks recorded yet.</p>'; return; }
    const rows = [];
    for (const k of all) {
      const d = await DB.loadWeek(k), ws = weekScore(d), dates = getWeekDates(k), t = tier(ws), tasks = countAllTasks(d);
      const dayAvgs = Object.values(d.days).map(ts => ts.length ? ts.reduce((s, t) => s + t.rating, 0) / ts.length : 0);
      const miniBars = dayAvgs.length ? dayAvgs.map(a => { const h = Math.max((a / 2) * 20, 2); return '<div class="wm-bar" style="height:' + h + 'px;background:' + (a >= 0.5 ? 'var(--green)' : a > 0 ? 'var(--red)' : 'var(--border2)') + '"></div>'; }).join('') : '<span style="font-size:.65rem;color:var(--text3)">no data</span>';
      rows.push('<div class="week-row' + (k === currentKey ? ' current' : '') + '" onclick="trackerJumpToWeek(\'' + k + '\')"><div class="wr-range">W' + getWeekNum(dates[0]) + ' · ' + fmt(dates[0]) + ' – ' + fmt(dates[6]) + '</div><div class="wr-mini">' + miniBars + '</div><div class="wr-tasks">' + tasks + ' task' + (tasks !== 1 ? 's' : '') + '</div><div class="wr-score">' + (ws != null ? ws.toFixed(2) : '—') + (t ? ' <span class="tier-badge ' + t.cls + '" style="font-size:.6rem">' + t.label + '</span>' : '') + '</div></div>');
    }
    el.innerHTML = rows.join('');
  }

  document.getElementById('prevBtn').addEventListener('click', () => { currentOffset--; selectedDayIdx = null; render(); });
  document.getElementById('nextBtn').addEventListener('click', () => { currentOffset++; selectedDayIdx = null; render(); });
  document.getElementById('saveManualBtn').addEventListener('click', async () => {
    const val = parseFloat(document.getElementById('manualInput').value); if (isNaN(val)) return;
    const k = getSundayOf(currentOffset), d = await _loadWeekCached(k); d.manualRating = val;
    _saveWeekBg(k, d); render();
  });
  document.getElementById('clearManualBtn').addEventListener('click', async () => {
    const k = getSundayOf(currentOffset), d = await _loadWeekCached(k); d.manualRating = null;
    document.getElementById('manualInput').value = '';
    _saveWeekBg(k, d); render();
  });
  // Theme toggle is now global (toggleGlobalTheme)
  render();

  async function syncToProgress() {
    if (!window.progSyncFromTracker) return;
    var keys = await DB.allWeekKeys();
    var entries = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var wdata = await DB.loadWeek(k);
      var ws = weekScore(wdata);
      if (ws == null) continue;
      var wn = getWeekNum(new Date(k + 'T00:00:00'));
      var pct = Math.round(ws / 7 * 10000) / 100;
      entries.push({ week: 'Week ' + wn, pct: pct });
    }
    if (entries.length) window.progSyncFromTracker(entries);
  }
  window.trackerSyncToProgress = syncToProgress;
  syncToProgress();
}

// ==================== TAB 4: RANKER ====================
async function initRanker() {
  let saved = await DB.loadRanker();
  let questions = saved.questions;
  let apiKey = saved.apiKey;
  let customPrompt = '';
  try { customPrompt = localStorage.getItem('rankerPrompt:' + DB.uid()) || ''; } catch(e) {}
  let schedulerTimer = null;

  function _saveRankerBg() {
    DB.saveRanker({ questions, apiKey, lastRun: saved.lastRun });
    try { localStorage.setItem('rankerPrompt:' + DB.uid(), customPrompt); } catch(e) {}
  }

  // --- API Key UI management ---
  function showKeySavedUI(flash) {
    var sec = document.getElementById('api-section');
    sec.style.display = 'flex';
    document.getElementById('api-key-input-wrap').style.display = 'none';
    document.getElementById('api-key-saved').style.display = 'flex';
    if (flash) {
      var el = document.getElementById('key-flash');
      if (el) { el.textContent = '✓ Saved'; el.style.opacity = '1'; setTimeout(function(){ el.style.opacity = '0'; }, 1500); }
    }
  }
  function showKeyInputUI() {
    var sec = document.getElementById('api-section');
    sec.style.display = 'flex';
    document.getElementById('api-key-saved').style.display = 'none';
    var wrap = document.getElementById('api-key-input-wrap');
    wrap.style.display = 'flex';
    var inp = document.getElementById('api-key-input');
    inp.value = '';
    inp.focus();
  }
  window.rankerShowKeyInput = showKeyInputUI;

  if (apiKey) showKeySavedUI();

  // --- Prompt UI management ---
  function showPromptSavedUI(flash) {
    document.getElementById('prompt-section').style.display = 'none';
    var btn = document.getElementById('btn-change-prompt');
    if (btn) btn.style.display = '';
    if (flash) {
      var el = document.getElementById('prompt-flash');
      if (el) { el.textContent = '✓ Saved'; el.style.opacity = '1'; setTimeout(function(){ el.style.opacity = '0'; }, 1500); }
    }
  }
  function showPromptInputUI() {
    document.getElementById('prompt-section').style.display = '';
    var btn = document.getElementById('btn-change-prompt');
    if (btn) btn.style.display = 'none';
    var inp = document.getElementById('ranking-prompt-input');
    if (inp) { inp.value = customPrompt; inp.focus(); }
  }
  window.rankerShowPromptInput = showPromptInputUI;

  var promptInput = document.getElementById('ranking-prompt-input');
  if (promptInput && customPrompt) { promptInput.value = customPrompt; showPromptSavedUI(); }

  window.rankerSavePrompt = function (val) {
    customPrompt = val || '';
    _saveRankerBg();
  };

  window.rankerSavePromptBtn = function () {
    var input = document.getElementById('ranking-prompt-input');
    customPrompt = input ? input.value || '' : '';
    _saveRankerBg();
    if (customPrompt) {
      showPromptSavedUI(true);
      rankerShowToast('Prompt saved', 'success');
    }
  };

  window.rankerSaveApiKey = function () {
    const val = document.getElementById('api-key-input').value.trim();
    if (!val) { rankerShowToast('Enter a valid API key', 'error'); return; }
    if (!val.startsWith('AIza')) {
      rankerShowToast('Invalid key — Gemini API keys start with "AIza"', 'error');
      return;
    }
    if (val.length < 30) {
      rankerShowToast('Key looks too short — check your API key', 'error');
      return;
    }
    apiKey = val;
    showKeySavedUI(true);
    rankerShowToast('API key saved', 'success');
    _saveRankerBg();
  };

  window.rankerAddQuestion = function () {
    const inp = document.getElementById('question-input'); const text = inp.value.trim();
    if (!text) { rankerShowToast('Question cannot be empty', 'error'); return; }
    questions.push({ id: Date.now(), text, score: null, reason: null, rank: null, addedAt: new Date().toISOString() });
    inp.value = '';
    rankerRender(); rankerShowToast('Question added', 'success');
    _saveRankerBg();
  };

  window.rankerDeleteQuestion = function (id) {
    questions = questions.filter(q => q.id !== id);
    rankerRender();
    _saveRankerBg();
  };

  window.rankerClearAll = function () {
    if (questions.length === 0) return;
    if (!confirm('Delete all questions and scores?')) return;
    questions = [];
    rankerRender(); rankerShowToast('All questions cleared', 'info');
    _saveRankerBg();
  };

  window.rankerHandleKey = function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); rankerAddQuestion(); } };

  function checkAndMaybeRun() {
    const now = new Date(), todayStr = now.toDateString();
    if (now.getHours() >= 11 && saved.lastRun !== todayStr && questions.length > 0 && apiKey) {
      rankerLog('Auto-triggering evaluation…', 'accent');
      setTimeout(rankerRunEvaluation, 1500);
    }
    updateSchedulerUI();
  }

  function scheduleNext11am() {
    if (schedulerTimer) clearTimeout(schedulerTimer);
    const now = new Date(), next = new Date(now); next.setHours(11, 0, 0, 0);
    if (now >= next) next.setDate(next.getDate() + 1);
    const ms = next - now;
    schedulerTimer = setTimeout(() => { rankerLog('⏰ Scheduled evaluation triggered.', 'accent'); rankerRunEvaluation(); scheduleNext11am(); }, ms);
    updateSchedulerUI(next);
  }

  function updateSchedulerUI(nextDate) {
    document.getElementById('sched-dot').className = 'dot live';
    document.getElementById('sched-label').textContent = 'Scheduler active';
    const disp = document.getElementById('next-run-display');
    const ref = nextDate || new Date();
    if (!nextDate) { if (ref.getHours() >= 11) ref.setDate(ref.getDate() + 1); ref.setHours(11, 0, 0, 0); }
    disp.textContent = 'Next run: ' + ref.toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  window.rankerRunEvaluation = async function () {
    if (!apiKey) { rankerShowToast('Set your Gemini API key first', 'error'); return; }
    if (questions.length === 0) { rankerShowToast('Add at least one question', 'error'); return; }
    const btn = document.getElementById('run-btn'); btn.disabled = true; btn.classList.add('running');
    rankerLog('Starting evaluation with Gemini 2.5 Flash…', 'accent');
    const list = questions.map((q, i) => (i + 1) + '. [ID:' + q.id + '] ' + q.text).join('\n');
    var customInstructions = customPrompt ? '\n\nUser\'s custom ranking instructions:\n' + customPrompt + '\n' : '';
    const prompt = 'You are an expert at evaluating the importance and depth of questions.\n\nBelow is a list of questions. Score each 1-10 (10=most important). Spread scores thoughtfully.' + customInstructions + '\n\nQuestions:\n' + list + '\n\nRespond ONLY with a valid JSON array. No markdown.\nFormat:\n[{"id":<id>,"score":<1-10>,"reason":"<one concise sentence>"},...]';
    try {
      const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, responseMimeType: 'application/json' } }) });
      if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err?.error?.message || 'HTTP ' + res.status); }
      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      let parsed; try { parsed = JSON.parse(rawText.replace(/```json|```/g, '').trim()); } catch { const m = rawText.match(/\[[\s\S]*\]/); if (m) try { parsed = JSON.parse(m[0]); } catch { } }
      if (!parsed) throw new Error('Could not parse response');
      const map = {}; parsed.forEach(s => { map[String(s.id)] = s; });
      questions.forEach(q => { const s = map[String(q.id)]; if (s) { q.score = s.score; q.reason = s.reason || null; } });
      questions.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      questions.forEach((q, i) => { q.rank = q.score !== null ? i + 1 : null; });
      saved.lastRun = new Date().toDateString();
      await DB.saveRanker({ questions, apiKey, lastRun: saved.lastRun });
      rankerLog('✓ Evaluation complete. ' + questions.length + ' questions scored.', 'ok');
      rankerShowToast('Questions ranked successfully', 'success');
      rankerRender();
    } catch (err) {
      rankerLog('✗ Error: ' + err.message, 'err');
      rankerShowToast('Error: ' + err.message, 'error');
    } finally { btn.disabled = false; btn.classList.remove('running'); }
  };

  function rankerRender() {
    const list = document.getElementById('questions-list');
    document.getElementById('q-count').innerHTML = '<strong>' + questions.length + '</strong> question' + (questions.length !== 1 ? 's' : '');
    if (questions.length === 0) { list.innerHTML = '<div class="empty-state"><div class="icon">✦</div><p>No questions yet.<br>Add your first question above.</p></div>'; return; }
    function esc(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    list.innerHTML = questions.map(q => {
      const has = q.score !== null, score = has ? q.score : null;
      let cardClass = 'unranked', badgeClass = 'unranked', badgeText = '—';
      if (has) { badgeText = score; if (score >= 7) { cardClass = 'ranked-high'; badgeClass = 'high'; } else if (score >= 4) { cardClass = 'ranked-mid'; badgeClass = 'mid'; } else { cardClass = 'ranked-low'; badgeClass = 'low'; } }
      const rankStr = q.rank ? '#' + q.rank + ' · ' : '';
      const added = new Date(q.addedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const reasonHtml = q.reason ? '<div class="question-reason">' + esc(q.reason) + '</div>' : '';
      return '<div class="question-card ' + cardClass + '" data-id="' + q.id + '"><div class="score-badge ' + badgeClass + '">' + badgeText + '</div><div class="question-body"><div class="question-rank">' + rankStr + 'Added ' + added + '</div><div class="question-text">' + esc(q.text) + '</div>' + reasonHtml + '<div class="question-meta">' + (has ? '<span>Score: ' + score + '/10</span>' : '<span>Not yet evaluated</span>') + '</div></div><button class="btn-delete" onclick="rankerDeleteQuestion(' + q.id + ')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>';
    }).join('');
  }
  window.rankerRender = rankerRender;
  function rankerLog(msg, type) {
    const el = document.getElementById('eval-log'); const p = document.createElement('p');
    const ts = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    p.textContent = '[' + ts + '] ' + msg; if (type) p.className = type;
    if (el.children.length === 1 && el.children[0].textContent.startsWith('Waiting')) el.innerHTML = '';
    el.appendChild(p); el.scrollTop = el.scrollHeight;
  }
  window.rankerLog = rankerLog;
  let rankerToastTimer;
  function rankerShowToast(msg, type) {
    const t = document.getElementById('ranker-toast'); t.textContent = msg;
    t.className = 'show' + (type ? ' ' + type : '');
    clearTimeout(rankerToastTimer); rankerToastTimer = setTimeout(() => { t.className = ''; }, 3000);
  }
  window.rankerShowToast = rankerShowToast;
  rankerRender(); checkAndMaybeRun(); scheduleNext11am();
}

// ==================== TAB 5: STREAK ====================
async function initStreak() {
  let data = await DB.loadStreaks();

  function todayStr() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function formatDate(str) { if (!str) return '—'; const [y, m, d] = str.split('-'); const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return d + ' ' + months[parseInt(m) - 1] + ' ' + y; }
  function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function escHtml(str) { return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

  function checkAndUpdateStreak(streak) {
    if (streak.completed) return streak; const today = todayStr(); if (!streak.lastLoggedDate) return streak;
    const diff = daysBetween(streak.lastLoggedDate, today);
    if (diff > 1) {
      for (let i = 1; i < diff; i++) { const md = new Date(streak.lastLoggedDate); md.setDate(md.getDate() + i); const ms = ymd(md); if (!streak.history.includes(ms)) { streak.missedDays = streak.missedDays || []; streak.missedDays.push(ms); } }
      streak.currentStreak = 0; streak.status = 'fresh';
    }
    return streak;
  }

  window.streakCreate = async function () {
    const nameInput = document.getElementById('task-name'), daysInput = document.getElementById('task-days');
    const name = nameInput.value.trim(), days = parseInt(daysInput.value);
    if (!name) { streakShowToast('Enter a task name.', 'error'); return; }
    if (!days || days < 1 || days > 365) { streakShowToast('Choose between 1 and 365 days.', 'error'); return; }
    data.push({ id: Date.now().toString(), name, targetDays: days, currentStreak: 0, createdDate: todayStr(), lastLoggedDate: null, history: [], missedDays: [], completed: false, status: 'fresh' });
    nameInput.value = ''; daysInput.value = ''; streakRender();
    DB.saveStreaks(data);
    streakShowToast('"' + name + '" streak created — ' + days + ' days to go!');
  };

  window.streakLogToday = async function (id) {
    const idx = data.findIndex(s => s.id === id); if (idx === -1) return;
    let s = data[idx]; const today = todayStr();
    if (s.history.includes(today)) { streakShowToast('Already logged today!', 'error'); return; }
    s = checkAndUpdateStreak(s); s.history.push(today); s.lastLoggedDate = today; s.currentStreak += 1;
    if (s.currentStreak >= s.targetDays) { s.completed = true; s.status = 'complete'; streakShowToast('🎉 "' + s.name + '" completed!', 'success'); }
    else { s.status = 'active'; const left = s.targetDays - s.currentStreak; streakShowToast('Day ' + s.currentStreak + ' logged! ' + left + ' day' + (left !== 1 ? 's' : '') + ' remaining.', 'success'); }
    data[idx] = s;
    streakRender();
    DB.saveStreaks(data);
  };

  let deleteTargetId = null;
  window.streakDelete = function (id) {
    const s = data.find(x => x.id === id); if (!s) return;
    deleteTargetId = id;
    document.getElementById('confirm-text').textContent = 'Delete "' + s.name + '"? All ' + s.history.length + ' day(s) of progress will be lost.';
    document.getElementById('confirm-overlay').classList.add('show');
  };
  window.streakCloseConfirm = function () { document.getElementById('confirm-overlay').classList.remove('show'); deleteTargetId = null; };
  window.streakConfirmDelete = async function () {
    if (!deleteTargetId) return;
    data = data.filter(s => s.id !== deleteTargetId);
    streakCloseConfirm(); streakRender(); streakShowToast('Streak deleted.');
    DB.saveStreaks(data);
  };

  function streakRender() {
    const today = todayStr();
    data = data.map(s => { if (!s.completed) s = checkAndUpdateStreak(s); return s; });
    const container = document.getElementById('streaks-container'), countEl = document.getElementById('streak-count');
    countEl.textContent = data.length;
    const emptyEl = document.getElementById('streak-empty-state');
    if (data.length === 0) { container.innerHTML = ''; container.appendChild(emptyEl); emptyEl.style.display = 'block'; return; }
    emptyEl.style.display = 'none';
    container.innerHTML = data.map(s => {
      const alreadyLogged = s.history.includes(today), pct = s.targetDays ? Math.min(100, (s.currentStreak / s.targetDays) * 100) : 0;
      let cardClass = 'streak-card'; if (s.completed) cardClass += ' complete'; else if (s.currentStreak > 0) cardClass += ' active'; else if (s.currentStreak === 0 && s.history.length > 0 && !alreadyLogged) cardClass += ' dead';
      let badgeClass = 'status-badge badge-fresh', badgeText = 'Not Started';
      if (s.completed) { badgeClass = 'status-badge badge-complete'; badgeText = 'Complete'; } else if (alreadyLogged) { badgeClass = 'status-badge badge-active'; badgeText = 'Logged Today'; } else if (s.currentStreak > 0) { badgeClass = 'status-badge badge-active'; badgeText = 'Active'; } else if (s.history.length > 0 && s.currentStreak === 0) { badgeClass = 'status-badge badge-dead'; badgeText = 'Reset'; }
      const maxDots = 365, showDots = Math.min(s.targetDays, maxDots); const histSet = new Set(s.history), missedSet = new Set(s.missedDays || []); const dotDates = []; const start = new Date(s.createdDate);
      for (let i = 0; i < showDots; i++) { const d = new Date(start); d.setDate(d.getDate() + i); dotDates.push(ymd(d)); }
      let dotsHtml = dotDates.map((dateStr, i) => { let cls = 'dot'; if (s.completed && histSet.has(dateStr)) cls += ' done-ok'; else if (histSet.has(dateStr)) cls += ' done'; else if (missedSet.has(dateStr) && dateStr < today) cls += ' missed'; else if (dateStr === today && !alreadyLogged) cls += ' today-dot'; return '<div class="' + cls + '" title="Day ' + (i + 1) + ': ' + formatDate(dateStr) + '"></div>'; }).join('');
      if (s.targetDays > maxDots) dotsHtml += '<span style="font-size:0.55rem;color:var(--text-muted);align-self:center;margin-left:4px">+' + (s.targetDays - maxDots) + ' more</span>';
      const logDisabled = alreadyLogged || s.completed;
      const logged = s.history.length, missed = (s.missedDays || []).length, totalActive = logged + missed;
      let consistencyText = '';
      if (s.completed) { consistencyText = 'Completed — ' + logged + ' days logged across the full streak.'; }
      else if (totalActive === 0) { consistencyText = 'No activity yet — start logging to build your streak.'; }
      else { const conPct = Math.round(logged / totalActive * 100); if (conPct >= 90) consistencyText = 'Excellent consistency — logged ' + logged + ' of ' + totalActive + ' days (' + conPct + '%).'; else if (conPct >= 70) consistencyText = 'Good consistency — logged ' + logged + ' of ' + totalActive + ' days (' + conPct + '%).'; else if (conPct >= 50) consistencyText = 'Moderate consistency — logged ' + logged + ' of ' + totalActive + ' days (' + conPct + '%).'; else consistencyText = 'Needs improvement — logged ' + logged + ' of ' + totalActive + ' days (' + conPct + '%).'; }
      return '<div class="' + cardClass + '" id="card-' + s.id + '"><div class="card-inner"><div class="card-left"><div class="task-name">' + escHtml(s.name) + '</div><div class="streak-meta"><span class="' + badgeClass + '">' + badgeText + '</span><span>started ' + formatDate(s.createdDate) + '</span><span>' + s.targetDays + ' days</span></div></div><div class="card-center"><div class="streak-number">' + s.currentStreak + '</div><div class="streak-label">/ ' + s.targetDays + ' days</div></div><div class="card-right"><button class="btn-log" onclick="streakLogToday(\'' + s.id + '\')" ' + (logDisabled ? 'disabled' : '') + '>' + (s.completed ? '✓ Done' : alreadyLogged ? '✓ Logged' : 'Log Today') + '</button><button class="btn-delete" onclick="streakDelete(\'' + s.id + '\')">Delete</button></div></div><div class="progress-wrap"><div class="progress-track"><div class="progress-fill" style="width:' + pct + '%"></div></div><div class="progress-dots">' + dotsHtml + '</div></div><div class="streak-consistency">' + consistencyText + '</div></div>';
    }).join('');
  }
  window.streakRender = streakRender;

  let streakToastTimer;
  function streakShowToast(msg, type) {
    const t = document.getElementById('streak-toast'); t.textContent = msg;
    t.className = 'show' + (type ? ' toast-' + type : '');
    clearTimeout(streakToastTimer); streakToastTimer = setTimeout(() => { t.className = ''; }, 3000);
  }
  window.streakShowToast = streakShowToast;

  const d = new Date(); const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']; const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  document.getElementById('today-display').textContent = days[d.getDay()] + ', ' + d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear();
  document.addEventListener('keydown', e => { if (e.key === 'Escape') streakCloseConfirm(); if (e.key === 'Enter') { const act = document.activeElement; if (act && (act.id === 'task-name' || act.id === 'task-days')) streakCreate(); } });
  streakRender();
}

// ==================== TAB 6: LOGBOOK ====================
async function initLogbook() {
  let savedLB = await DB.loadLogbook();
  let S = { projects: savedLB.projects, log: savedLB.log, activeId: savedLB.activeId, tab: 'active', open: {}, addingTop: false, _pendingDel: null, _pendingDelProj: null };

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const now = () => Date.now();
  const fmtDate = ts => { const d = new Date(ts); const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return mo[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear(); };
  const fmtFull = ts => { const d = new Date(ts); const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return mo[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };

  async function save() { await DB.saveLogbook({ projects: S.projects, log: S.log, activeId: S.activeId }); }

  function closeAllDotMenus() { document.querySelectorAll('.lb-dot-menu').forEach(function(m) { m.remove(); }); }

  function calcStatus(t) { if (!t.children || !t.children.length) return t.done ? 'done' : 'ns'; const ss = t.children.map(calcStatus); if (ss.every(s => s === 'done')) return 'done'; if (ss.some(s => s === 'done' || s === 'ip')) return 'ip'; return 'ns'; }
  function projStatus(p) { if (!p.children || !p.children.length) return 'ns'; const ss = p.children.map(calcStatus); if (ss.every(s => s === 'done')) return 'done'; if (ss.some(s => s === 'done' || s === 'ip')) return 'ip'; return 'ns'; }
  function countLeaves(t) { let d = 0, a = 0; (function walk(n) { if (!n.children || !n.children.length) { a++; if (n.done) d++; } else n.children.forEach(walk); })(t); return { d, a }; }
  function taskCompletionFraction(t) {
    if (!t.children || !t.children.length) return t.done ? 1 : 0;
    var childTotal = t.children.length;
    var childDone = t.children.reduce(function (s, c) { return s + taskCompletionFraction(c); }, 0);
    return childDone / childTotal;
  }
  function projPct(p) {
    if (!p.children || !p.children.length) return 0;
    var total = p.children.length;
    var sum = p.children.reduce(function (s, c) { return s + taskCompletionFraction(c); }, 0);
    return Math.round(sum / total * 100);
  }
  function taskPct(t) { return Math.round(taskCompletionFraction(t) * 100); }
  function addLog(action, entity, proj, extra) { S.log.unshift({ id: uid(), ts: now(), action, entity, proj: proj || '', extra: extra || '' }); if (S.log.length > 500) S.log.length = 500; }
  function syncTaskTree(children, proj) {
    children.forEach(t => {
      if (t.children && t.children.length) syncTaskTree(t.children, proj);
      const st = calcStatus(t); const prev = t._prevStatus || 'ns';
      if (st === 'done' && prev !== 'done') { t.done = true; t.completedAt = now(); addLog('task_done', t.title, proj.title); }
      if (prev === 'done' && st !== 'done') { t.done = false; t.completedAt = null; addLog('task_reopen', t.title, proj.title); }
      t._prevStatus = st;
    });
  }
  function syncProjectState(p) { const st = projStatus(p); const prev = p._lastStatus || 'ns'; if (st === 'done' && prev !== 'done') { p.completedAt = now(); addLog('proj_done', p.title); } if (prev === 'done' && st !== 'done') { p.completedAt = null; addLog('proj_reopen', p.title); } p._lastStatus = st; }
  function findTask(children, id) { for (const t of children) { if (t.id === id) return t; if (t.children) { const r = findTask(t.children, id); if (r) return r; } } return null; }
  function findProj(id) { return S.projects.find(p => p.id === id); }
  function activeProj() { return S.activeId ? findProj(S.activeId) : null; }

  function createProject(title) { const p = { id: uid(), title, children: [], createdAt: now(), completedAt: null, _lastStatus: 'ns' }; S.projects.push(p); addLog('proj_created', title); S.activeId = p.id; S.tab = 'active'; render(); save(); }
  function deleteProject(id) { const p = findProj(id); if (!p) return; addLog('proj_deleted', p.title); S.projects = S.projects.filter(x => x.id !== id); if (S.activeId === id) S.activeId = null; render(); save(); }
  async function createTask(projId, title) { const p = findProj(projId); if (!p) return; const t = { id: uid(), title, children: [], notes: '', links: [], createdAt: now(), completedAt: null, done: false, expanded: true, _prevStatus: 'ns' }; p.children.push(t); addLog('task_created', title, p.title); syncTaskTree(p.children, p); syncProjectState(p); render(); save(); }
  async function createSubtask(projId, parentId, title) { const p = findProj(projId); if (!p) return; const parent = findTask(p.children, parentId); if (!parent) return; if (!parent.children) parent.children = []; const t = { id: uid(), title, children: [], notes: '', links: [], createdAt: now(), completedAt: null, done: false, expanded: true, _prevStatus: 'ns' }; parent.children.push(t); parent.expanded = true; addLog('subtask_added', title, p.title, parent.title); syncTaskTree(p.children, p); syncProjectState(p); render(); save(); }
  function setAllDone(t, done) {
    t.done = done; t.completedAt = done ? now() : null; t._prevStatus = done ? 'done' : 'ns';
    if (t.children) t.children.forEach(function (c) { setAllDone(c, done); });
  }
  async function toggleTask(projId, taskId) { const p = findProj(projId); if (!p) return; const t = findTask(p.children, taskId); if (!t) return; if (t.children && t.children.length) { var newDone = calcStatus(t) !== 'done'; setAllDone(t, newDone); } else { t.done = !t.done; t.completedAt = t.done ? now() : null; t._prevStatus = t.done ? 'done' : 'ns'; } syncTaskTree(p.children, p); syncProjectState(p); render(); save(); }
  async function deleteTask(projId, taskId) { const p = findProj(projId); if (!p) return; const t = findTask(p.children, taskId); const tName = t ? t.title : ''; function rm(arr) { return arr.filter(x => { if (x.id === taskId) return false; x.children = rm(x.children || []); return true; }); } p.children = rm(p.children); addLog('task_deleted', tName, p.title); delete S.open[taskId]; syncTaskTree(p.children, p); syncProjectState(p); render(); save(); }
  function renameProject(projId, newTitle) { const p = findProj(projId); if (!p || !newTitle) return; addLog('proj_renamed', p.title + ' → ' + newTitle); p.title = newTitle; render(); save(); }
  async function renameTask(projId, taskId, newTitle) { const p = findProj(projId); if (!p || !newTitle) return; const t = findTask(p.children, taskId); if (!t) return; addLog('task_renamed', t.title + ' → ' + newTitle, p.title); t.title = newTitle; render(); save(); }
  async function addLink(projId, taskId, url, customName) { const p = findProj(projId); if (!p) return; const t = findTask(p.children, taskId); if (!t) return; let type = 'link', label = ''; try { const u = new URL(url); const h = u.hostname.replace('www.', ''); if (h.includes('youtube.com') || h.includes('youtu.be')) type = 'yt'; else if (h.includes('chatgpt.com') || h.includes('chat.openai.com')) type = 'gpt'; else if (h.includes('claude.ai')) type = 'claude'; label = u.hostname.replace('www.', '') + u.pathname; if (label.length > 40) label = label.slice(0, 38) + '…'; } catch { label = url.length > 40 ? url.slice(0, 38) + '…' : url; } if (customName && customName.trim()) label = customName.trim(); t.links.push({ id: uid(), url, type, label }); addLog('link_added', t.title, p.title); render(); save(); }
  async function removeLink(projId, taskId, linkId) { const p = findProj(projId); if (!p) return; const t = findTask(p.children, taskId); if (!t) return; t.links = t.links.filter(l => l.id !== linkId); render(); save(); }
  function updateNotes(projId, taskId, val) { const p = findProj(projId); if (!p) return; const t = findTask(p.children, taskId); if (!t) return; t.notes = val; save(); }
  function h(tag, attrs) { const el = document.createElement(tag); const ch = Array.from(arguments).slice(2); if (attrs) Object.entries(attrs).forEach(([k, v]) => { if (k === 'className') el.className = v; else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v); else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v); else el.setAttribute(k, v); }); ch.flat(9).forEach(c => { if (c == null) return; el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return el; }
  function collectCompletedTimestamps(node, out) {
    if (!node.children || !node.children.length) {
      if (node.done && node.completedAt) out.push(node.completedAt);
      return;
    }
    node.children.forEach(function (c) { collectCompletedTimestamps(c, out); });
  }
  function projectSummaryDates(p) {
    var parts = ['Created ' + fmtDate(p.createdAt)];
    var ts = [];
    (p.children || []).forEach(function (t) { collectCompletedTimestamps(t, ts); });
    if (ts.length) {
      ts.sort(function (a, b) { return a - b; });
      parts.push(h('span', { className: 'lb-summary-sep' }, '·'));
      parts.push('First task completed ' + fmtDate(ts[0]));
      parts.push(h('span', { className: 'lb-summary-sep' }, '·'));
      parts.push('Last task completed ' + fmtDate(ts[ts.length - 1]));
    }
    return parts;
  }
  function statusColor(s, pct) {
    if (s === 'done') return 'var(--lb-green)';
    if (s === 'ip') return (typeof pct === 'number' && pct >= 50) ? 'var(--lb-green)' : 'var(--lb-amber)';
    return '#333';
  }
  function logColor(action) { if (action.includes('done') || action.includes('created')) return 'var(--lb-green)'; if (action.includes('delete')) return 'var(--lb-red)'; if (action.includes('reopen')) return 'var(--lb-amber)'; if (action.includes('link')) return 'var(--lb-blue)'; return 'var(--lb-muted)'; }
  function logDesc(e) { const b = s => h('b', {}, s); switch (e.action) { case 'proj_created': return [b(e.entity), ' created']; case 'proj_deleted': return [b(e.entity), ' deleted']; case 'proj_done': return [b(e.entity), ' completed']; case 'proj_reopen': return [b(e.entity), ' reopened']; case 'task_created': return ['Task ', b(e.entity), ' added to ', b(e.proj)]; case 'subtask_added': return ['Subtask ', b(e.entity), ' added under ', b(e.extra), ' in ', b(e.proj)]; case 'task_done': return ['Task ', b(e.entity), ' completed in ', b(e.proj)]; case 'task_reopen': return ['Task ', b(e.entity), ' reopened in ', b(e.proj)]; case 'task_deleted': return ['Task ', b(e.entity), ' deleted from ', b(e.proj)]; case 'link_added': return ['Link added to ', b(e.entity), ' in ', b(e.proj)]; default: return [e.action]; } }

  function renderTabs() { const el = document.getElementById('lb-tabs'); el.innerHTML = ''; ['active', 'done', 'log'].forEach(t => { const label = t === 'active' ? 'Active' : t === 'done' ? 'Done' : 'Log'; el.appendChild(h('div', { className: 'lb-tab' + (S.tab === t ? ' active' : ''), onClick: () => { S.tab = t; render(); } }, label)); }); }
  function renderSidebarContent() { const el = document.getElementById('lb-sidebar-content'); el.innerHTML = ''; if (S.tab === 'active') { const active = S.projects.filter(p => projPct(p) < 100); if (!active.length) { el.appendChild(h('div', { className: 'lb-sidebar-empty' }, 'No active projects')); return; } active.forEach(p => { const pct = projPct(p); const st = projStatus(p); const isArmed = S._pendingDelProj === p.id; const row = h('div', { className: 'lb-proj-row' + (S.activeId === p.id ? ' selected' : ''), onClick: () => { S.activeId = p.id; if (window.innerWidth <= 640) S._mobileProjectsOpen = false; save(); render(); } }, h('div', { className: 'lb-proj-dot', style: { background: statusColor(st, pct) } }), h('div', { className: 'lb-proj-info' }, h('div', { className: 'lb-proj-title' }, p.title), h('div', { className: 'lb-proj-bar-wrap' }, h('div', { className: 'lb-proj-bar', style: { width: pct + '%', background: statusColor(st, pct) } }))), h('div', { className: 'lb-proj-pct' }, pct + '%'), h('div', { className: 'lb-proj-del' + (isArmed ? ' armed' : ''), onClick: ev => { ev.stopPropagation(); if (isArmed) { clearTimeout(S._pendingDelProjTimer); S._pendingDelProj = null; deleteProject(p.id); return; } S._pendingDelProj = p.id; render(); S._pendingDelProjTimer = setTimeout(() => { S._pendingDelProj = null; render(); }, 3000); } }, isArmed ? '?' : '✕')); el.appendChild(row); }); } else if (S.tab === 'done') { const done = S.projects.filter(p => projPct(p) >= 100); if (!done.length) { el.appendChild(h('div', { className: 'lb-sidebar-empty' }, 'No completed projects')); return; } done.forEach(p => { el.appendChild(h('div', { className: 'lb-done-row', style: { cursor: 'pointer' }, onClick: () => { S.activeId = p.id; S.tab = 'active'; save(); render(); } }, h('div', { className: 'lb-done-title' }, p.title), h('div', { className: 'lb-done-ts' }, p.completedAt ? fmtFull(p.completedAt) : ''))); }); } else { if (!S.log.length) { el.appendChild(h('div', { className: 'lb-sidebar-empty' }, 'No activity yet')); return; } S.log.forEach(e => { el.appendChild(h('div', { className: 'lb-log-entry' }, h('div', { className: 'lb-log-dot', style: { background: logColor(e.action) } }), h('div', { className: 'lb-log-body' }, h('div', { className: 'lb-log-desc' }, ...logDesc(e)), h('div', { className: 'lb-log-ts' }, fmtFull(e.ts))))); }); } }
  function renderSidebarFooter() { const el = document.getElementById('lb-sidebar-footer'); el.innerHTML = ''; if (S._addingProject) { const wrap = h('div', { className: 'lb-add-proj-row' }); const inp = h('input', { placeholder: 'Project name…', onKeydown: ev => { if (ev.key === 'Enter' && inp.value.trim()) { S._addingProject = false; createProject(inp.value.trim()); } if (ev.key === 'Escape') { S._addingProject = false; render(); } } }); const btn = h('button', { onClick: () => { if (inp.value.trim()) { S._addingProject = false; createProject(inp.value.trim()); } } }, 'Add'); wrap.append(inp, btn); el.appendChild(wrap); requestAnimationFrame(() => inp.focus()); } else { el.appendChild(h('button', { className: 'lb-new-proj-btn', onClick: () => { S._addingProject = true; render(); } }, '+ New Project')); } }
  function renderMain() { const el = document.getElementById('lb-main'); el.innerHTML = ''; const p = activeProj(); if (!p) { el.appendChild(h('div', { className: 'lb-empty-state' }, h('div', { className: 'icon' }, '📋'), h('p', {}, 'Select or create a project'))); return; } const pct = projPct(p); const st = projStatus(p); const stLabel = st === 'done' ? 'Completed' : st === 'ip' ? 'In Progress' : 'Not Started'; const header = h('div', { className: 'lb-proj-header' }, h('h1', { style: { cursor: 'pointer' }, title: 'Double-click to rename', onDblclick: function () { var newName = prompt('Rename project:', p.title); if (newName && newName.trim()) renameProject(p.id, newName.trim()); } }, p.title), h('div', { className: 'meta lb-project-summary' }, ...projectSummaryDates(p)), h('div', { className: 'lb-header-bar-wrap' }, h('div', { className: 'lb-header-bar', style: { width: pct + '%', background: statusColor(st, pct) } })), h('div', { className: 'lb-header-row' }, h('div', { className: 'lb-header-pct', style: { color: statusColor(st, pct) } }, pct + '%'), h('div', { className: 'lb-status-badge ' + st, style: st === 'ip' ? { background: pct >= 50 ? 'rgba(39,174,96,.12)' : 'rgba(230,126,34,.12)', color: statusColor(st, pct) } : {} }, stLabel))); el.appendChild(header); if (S.addingTop) { const wrap = h('div', { className: 'lb-add-top-input' }); const inp = h('input', { placeholder: 'Task name…', onKeydown: ev => { if (ev.key === 'Enter' && inp.value.trim()) { S.addingTop = false; createTask(p.id, inp.value.trim()); } if (ev.key === 'Escape') { S.addingTop = false; render(); } } }); wrap.appendChild(inp); el.appendChild(wrap); requestAnimationFrame(() => inp.focus()); } else { el.appendChild(h('button', { className: 'lb-add-task-btn', onClick: () => { S.addingTop = true; render(); } }, '+ Add task')); } const tree = h('div', {}); p.children.forEach(t => tree.appendChild(renderTaskNode(t, p))); el.appendChild(tree); }
  function renderTaskNode(t, proj) { const st = calcStatus(t); const hasChildren = t.children && t.children.length > 0; const pct = hasChildren ? taskPct(t) : 0; const open = S.open[t.id] || {}; const isArmed = S._pendingDel === t.id; const toggle = h('div', { className: 'lb-expand-toggle' + (hasChildren ? (t.expanded ? ' expanded' : '') : ' hidden'), onClick: ev => { ev.stopPropagation(); if (hasChildren) { t.expanded = !t.expanded; save(); render(); } } }, '▶'); const line = h('div', { className: 'lb-status-line', style: { background: statusColor(st, pct) } }); let checkContent = ''; if (st === 'done') checkContent = '✓'; else if (st === 'ip') checkContent = '◑'; const check = h('div', { className: 'lb-task-check' + (st === 'done' ? ' done' : st === 'ip' ? ' ip' : ''), style: st === 'ip' ? { borderColor: statusColor(st, pct), color: statusColor(st, pct) } : {}, onClick: ev => { ev.stopPropagation(); toggleTask(proj.id, t.id); } }, checkContent); const body = h('div', { className: 'lb-task-body' }, h('div', { className: 'lb-task-title' + (t.done ? ' completed' : '') }, t.title), hasChildren ? h('div', { className: 'lb-task-sub-info' }, h('div', { className: 'lb-mini-bar-wrap' }, h('div', { className: 'lb-mini-bar', style: { width: pct + '%', background: statusColor(st, pct) } })), h('div', { className: 'lb-mini-pct' }, pct + '%')) : null); const ts = t.completedAt ? h('div', { className: 'lb-task-ts' }, fmtFull(t.completedAt)) : null; const notesBadge = t.notes ? h('div', { className: 'badge', style: { background: 'var(--lb-amber)' } }) : null; const linksBadge = t.links && t.links.length ? h('div', { className: 'badge', style: { background: 'var(--lb-blue)' } }) : null;
    var isMob = window.innerWidth <= 640;
    var actions;
    if (isMob) {
      // Mobile: 3-dot menu
      var threeDot = h('button', { className: 'lb-three-dot', onClick: function(ev) { ev.stopPropagation(); var menu = ev.target.closest('.lb-task-actions').querySelector('.lb-dot-menu'); if (menu) { menu.remove(); return; } closeAllDotMenus(); var m = h('div', { className: 'lb-dot-menu' },
        h('button', { className: 'lb-dot-menu-item', onClick: function(e) { e.stopPropagation(); S.open[t.id] = { addChild: true, notes: false, links: false, renaming: false }; render(); } }, '➕ Add Subtask'),
        h('button', { className: 'lb-dot-menu-item', onClick: function(e) { e.stopPropagation(); S.open[t.id] = { renaming: true, notes: false, links: false, addChild: false }; render(); } }, '✏️ Rename'),
        h('button', { className: 'lb-dot-menu-item', onClick: function(e) { e.stopPropagation(); S.open[t.id] = { notes: true, links: false, addChild: false, renaming: false }; render(); } }, '📝 Add Note'),
        h('button', { className: 'lb-dot-menu-item', onClick: function(e) { e.stopPropagation(); S.open[t.id] = { links: true, notes: false, addChild: false, renaming: false }; render(); } }, '🔗 Add Link'),
        h('button', { className: 'lb-dot-menu-item danger', onClick: function(e) { e.stopPropagation(); deleteTask(proj.id, t.id); } }, '🗑 Delete')
      ); ev.target.closest('.lb-task-actions').appendChild(m); } }, '⋮');
      actions = h('div', { className: 'lb-task-actions' }, threeDot);
    } else {
      // Desktop: normal icon buttons
      actions = h('div', { className: 'lb-task-actions' + (isArmed ? ' force-show' : '') }, h('button', { className: 'lb-act-btn', title: 'Rename', onClick: ev => { ev.stopPropagation(); S.open[t.id] = { ...open, renaming: !open.renaming, notes: false, links: false, addChild: false }; render(); } }, '✏️'), h('button', { className: 'lb-act-btn', title: 'Notes', onClick: ev => { ev.stopPropagation(); S.open[t.id] = { ...open, notes: !open.notes, links: false, addChild: false, renaming: false }; render(); } }, '📝', notesBadge), h('button', { className: 'lb-act-btn', title: 'Links', onClick: ev => { ev.stopPropagation(); S.open[t.id] = { ...open, links: !open.links, notes: false, addChild: false, renaming: false }; render(); } }, '🔗', linksBadge), h('button', { className: 'lb-act-btn', title: 'Add subtask', onClick: ev => { ev.stopPropagation(); S.open[t.id] = { ...open, addChild: !open.addChild, notes: false, links: false, renaming: false }; render(); } }, '+'), h('button', { className: 'lb-act-btn' + (isArmed ? ' del-armed' : ''), title: 'Delete', onClick: ev => { ev.stopPropagation(); if (isArmed) { clearTimeout(S._pendingDelTimer); S._pendingDel = null; deleteTask(proj.id, t.id); return; } S._pendingDel = t.id; render(); S._pendingDelTimer = setTimeout(() => { S._pendingDel = null; render(); }, 3000); } }, isArmed ? '?' : '✕'));
    }
    const row = h('div', { className: 'lb-task-row' }, toggle, line, check, body, ts, actions); const node = h('div', { className: 'lb-task-node' }, row); if (open.renaming) { const wrap = h('div', { className: 'lb-add-child-wrap' }); const inp = h('input', { value: t.title, onKeydown: ev => { if (ev.key === 'Enter' && inp.value.trim()) { S.open[t.id] = { ...S.open[t.id], renaming: false }; renameTask(proj.id, t.id, inp.value.trim()); } if (ev.key === 'Escape') { S.open[t.id] = { ...S.open[t.id], renaming: false }; render(); } } }); wrap.appendChild(inp); node.appendChild(wrap); requestAnimationFrame(() => { inp.focus(); inp.select(); }); } if (open.notes) { const panel = h('div', { className: 'lb-notes-panel' }); const autoGrow = el => { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }; const ta = h('textarea', { placeholder: 'Add notes…', onInput: ev => { updateNotes(proj.id, t.id, ev.target.value); autoGrow(ev.target); } }); ta.value = t.notes || ''; panel.appendChild(ta); node.appendChild(panel); requestAnimationFrame(() => { autoGrow(ta); ta.focus(); }); } if (open.links) { const panel = h('div', { className: 'lb-links-panel' }); const inputsWrap = h('div', { className: 'lb-link-inputs' }); const nameRow = h('div', { className: 'lb-link-input-row' }); const nameInp = h('input', { placeholder: 'Link name (optional)…' }); nameRow.append(nameInp); const urlRow = h('div', { className: 'lb-link-input-row' }); const urlInp = h('input', { placeholder: 'Paste URL…', onKeydown: ev => { if (ev.key === 'Enter' && urlInp.value.trim()) { addLink(proj.id, t.id, urlInp.value.trim(), nameInp.value); } } }); const addBtn = h('button', { onClick: () => { if (urlInp.value.trim()) addLink(proj.id, t.id, urlInp.value.trim(), nameInp.value); } }, 'Add'); urlRow.append(urlInp, addBtn); inputsWrap.append(nameRow, urlRow); panel.appendChild(inputsWrap); (t.links || []).forEach(l => { panel.appendChild(h('div', { className: 'lb-link-item' }, h('span', { className: 'lb-link-badge ' + l.type }, l.type === 'yt' ? 'YT' : l.type === 'gpt' ? 'GPT' : l.type === 'claude' ? 'Claude' : 'Link'), h('a', { className: 'lb-link-url', href: l.url, target: '_blank', rel: 'noopener' }, l.label), h('span', { className: 'lb-link-del', onClick: () => removeLink(proj.id, t.id, l.id) }, '✕'))); }); node.appendChild(panel); requestAnimationFrame(() => nameInp.focus()); } if (open.addChild) { const wrap = h('div', { className: 'lb-add-child-wrap' }); const inp = h('input', { placeholder: 'Subtask name…', onKeydown: ev => { if (ev.key === 'Enter' && inp.value.trim()) { S.open[t.id] = { ...S.open[t.id], addChild: false }; createSubtask(proj.id, t.id, inp.value.trim()); } if (ev.key === 'Escape') { S.open[t.id] = { ...S.open[t.id], addChild: false }; render(); } } }); wrap.appendChild(inp); node.appendChild(wrap); requestAnimationFrame(() => inp.focus()); } if (hasChildren && t.expanded) { const childWrap = h('div', { className: 'lb-task-children' }); t.children.forEach(c => childWrap.appendChild(renderTaskNode(c, proj))); node.appendChild(childWrap); } return node; }

  function render() {
    // On mobile, force 'active' tab since tabs are hidden
    if (window.innerWidth <= 640 && S.tab !== 'active') S.tab = 'active';
    renderTabs(); renderSidebarContent(); renderSidebarFooter(); renderMain();
    // Mobile: add dropdown toggle for project list
    if (window.innerWidth <= 640) {
      var sidebar = document.querySelector('#tab-logbook .lb-sidebar');
      var content = document.getElementById('lb-sidebar-content');
      var existingToggle = sidebar.querySelector('.lb-mobile-proj-toggle');
      if (!existingToggle) {
        var toggle = document.createElement('div');
        toggle.className = 'lb-mobile-proj-toggle';
        var p = activeProj();
        toggle.innerHTML = '<span>' + (p ? p.title : 'Select Project') + '</span><span class="toggle-arrow' + (S._mobileProjectsOpen ? ' expanded' : '') + '">▼</span>';
        toggle.addEventListener('click', function () {
          S._mobileProjectsOpen = !S._mobileProjectsOpen;
          content.classList.toggle('mobile-collapsed', !S._mobileProjectsOpen);
          content.classList.toggle('mobile-expanded', S._mobileProjectsOpen);
          var arrow = toggle.querySelector('.toggle-arrow');
          if (arrow) arrow.classList.toggle('expanded', S._mobileProjectsOpen);
        });
        sidebar.insertBefore(toggle, content);
        // Default: collapsed on mobile
        if (!S._mobileProjectsOpen) {
          content.classList.add('mobile-collapsed');
          content.classList.remove('mobile-expanded');
        } else {
          content.classList.remove('mobile-collapsed');
          content.classList.add('mobile-expanded');
        }
      } else {
        var p2 = activeProj();
        existingToggle.querySelector('span:first-child').textContent = p2 ? p2.title : 'Select Project';
      }
    }
  }
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') { if (S.addingTop) { S.addingTop = false; render(); } if (S._addingProject) { S._addingProject = false; render(); } } });

  // Click-outside-to-dismiss for logbook panels and dot menus
  document.addEventListener('click', function(ev) {
    // Close dot menus on any outside click
    if (!ev.target.closest('.lb-dot-menu') && !ev.target.closest('.lb-three-dot')) {
      closeAllDotMenus();
    }
    // Dismiss open panels (notes, links, addChild, renaming) when clicking outside
    var logbookTab = document.getElementById('tab-logbook');
    if (!logbookTab || logbookTab.classList.contains('hidden')) return;
    var openIds = Object.keys(S.open);
    for (var i = 0; i < openIds.length; i++) {
      var tid = openIds[i];
      var o = S.open[tid];
      if (!o) continue;
      var isOpen = o.notes || o.links || o.addChild || o.renaming;
      if (!isOpen) continue;
      // Find the task node for this task
      var taskNode = null;
      var allNodes = logbookTab.querySelectorAll('.lb-task-node');
      for (var j = 0; j < allNodes.length; j++) {
        var node = allNodes[j];
        // Check if this node has an open panel
        if (node.querySelector('.lb-notes-panel') || node.querySelector('.lb-links-panel') || node.querySelector('.lb-add-child-wrap')) {
          if (ev.target.closest('.lb-task-node') === node) { taskNode = node; break; }
          // Click was outside this task node — check for unsaved content
          var hasContent = false;
          if (o.notes) {
            var ta = node.querySelector('.lb-notes-panel textarea');
            // For notes, find the task to compare
            var tObj = findTaskById(tid);
            if (ta && ta.value.trim() && ta.value !== (tObj && tObj.notes || '')) hasContent = true;
          }
          if (o.links) {
            var urlInp = node.querySelector('.lb-links-panel .lb-link-input-row input[placeholder*="URL"]');
            var nameInp = node.querySelector('.lb-links-panel .lb-link-input-row input[placeholder*="name"]');
            if ((urlInp && urlInp.value.trim()) || (nameInp && nameInp.value.trim())) hasContent = true;
          }
          if (o.addChild) {
            var subInp = node.querySelector('.lb-add-child-wrap input');
            if (subInp && subInp.value.trim()) hasContent = true;
          }
          if (o.renaming) {
            var renInp = node.querySelector('.lb-add-child-wrap input');
            if (renInp && renInp.value.trim()) hasContent = true;
          }
          if (hasContent) {
            if (!confirm('You have unsaved changes. Discard?')) return;
          }
          S.open[tid] = { notes: false, links: false, addChild: false, renaming: false };
          render();
          return;
        }
      }
    }
  });

  // Helper: find a task by id across all projects
  function findTaskById(id) {
    for (var p = 0; p < S.projects.length; p++) {
      var found = (function walk(tasks) {
        for (var i = 0; i < tasks.length; i++) {
          if (tasks[i].id === id) return tasks[i];
          if (tasks[i].children) { var r = walk(tasks[i].children); if (r) return r; }
        }
        return null;
      })(S.projects[p].children || []);
      if (found) return found;
    }
    return null;
  }

  render();
}

// ==================== STORY / WELCOME MODAL ====================
// Renders content from /content/our-story.md and /content/welcome.md.
// To edit the text shown to users, edit those .md files and push.
function _renderSimpleMarkdown(src) {
  // Minimal renderer: paragraphs split on blank lines, ** for bold, _ for italic, --- for hr.
  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var blocks = String(src).replace(/\r\n/g, '\n').split(/\n{2,}/);
  return blocks.map(function (b) {
    var trimmed = b.trim();
    if (!trimmed) return '';
    if (/^---+$/.test(trimmed)) return '<hr/>';
    if (/^#{2,3}\s+/.test(trimmed)) {
      var level = trimmed.match(/^(#+)/)[1].length;
      return '<h' + Math.min(level, 3) + '>' + esc(trimmed.replace(/^#+\s+/, '')) + '</h' + Math.min(level, 3) + '>';
    }
    var html = esc(trimmed)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\W)_([^_]+)_(\W|$)/g, '$1<em>$2</em>$3')
      .replace(/\n/g, '<br/>');
    return '<p>' + html + '</p>';
  }).join('');
}

async function openStoryModal(which) {
  var url = which === 'welcome' ? 'content/welcome.md' : 'content/our-story.md';
  var title = which === 'welcome' ? 'Welcome' : 'Our Story';
  var modal = document.getElementById('story-modal');
  var body = document.getElementById('story-modal-body');
  var titleEl = document.getElementById('story-modal-title');
  if (!modal) return;
  titleEl.textContent = title;
  body.innerHTML = '<p style="opacity:.6">Loading…</p>';
  modal.style.display = 'flex';
  try {
    var res = await fetch(url + '?v=' + Date.now(), { cache: 'no-cache' });
    var text = await res.text();
    body.innerHTML = _renderSimpleMarkdown(text);
  } catch (e) {
    body.innerHTML = '<p>Could not load this section right now.</p>';
  }
}
function closeStoryModal() {
  var modal = document.getElementById('story-modal');
  if (modal) modal.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', function () {
  var footer = document.getElementById('app-footer');
  var btn = document.getElementById('footer-our-story');
  var close = document.getElementById('story-modal-close');
  var overlay = document.getElementById('story-modal');
  if (btn) btn.addEventListener('click', function () { openStoryModal('story'); });
  if (close) close.addEventListener('click', closeStoryModal);
  if (overlay) overlay.addEventListener('click', function (ev) { if (ev.target === overlay) closeStoryModal(); });
  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeStoryModal(); });
  // Show footer once auth-ready
  if (window.DB && DB.onReady) {
    DB.onReady(function () { if (footer) footer.style.display = 'flex'; maybeShowWelcome(); });
  }
});

function maybeShowWelcome() {
  try {
    var uid = (window.DB && DB.uid && DB.uid()) || 'anon';
    var key = 'welcomeShown:' + uid;
    if (localStorage.getItem(key) === 'done') return;
    var isNew = localStorage.getItem('firstSignup:' + uid) === 'yes';
    if (!isNew) return;
    openStoryModal('welcome');
    localStorage.setItem(key, 'done');
    localStorage.removeItem('firstSignup:' + uid);
  } catch (e) {}
}

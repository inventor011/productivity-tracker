(function () {
  const sb = window._supabase;
  let _uid = null;
  let _ready = false;
  const _waiters = [];

  function uid() { return _uid; }

  function onReady(fn) {
    if (_ready) fn();
    else _waiters.push(fn);
  }

  sb.auth.onAuthStateChange((_ev, session) => {
    _uid = session ? session.user.id : null;
    if (_uid && !_ready) {
      _ready = true;
      _waiters.forEach(fn => fn());
      _waiters.length = 0;
    }
    if (!_uid) _ready = false;
  });

  // --- To-Do ---
  async function loadTodos() {
    const { data } = await sb.from('todo_tasks').select('*').eq('user_id', _uid).order('created_at');
    return (data || []).map(r => ({ id: r.id, text: r.text, done: r.done, priority: r.priority }));
  }
  async function saveTodo(task) {
    const { data } = await sb.from('todo_tasks').upsert({
      id: task.id > 1e12 ? undefined : task.id,
      user_id: _uid, text: task.text, done: task.done, priority: task.priority
    }, { onConflict: 'id' }).select().single();
    return data;
  }
  async function insertTodo(task) {
    const { data } = await sb.from('todo_tasks').insert({
      user_id: _uid, text: task.text, done: task.done, priority: task.priority
    }).select().single();
    return data;
  }
  async function updateTodo(id, fields) {
    await sb.from('todo_tasks').update(fields).eq('id', id).eq('user_id', _uid);
  }
  async function deleteTodo(id) {
    await sb.from('todo_tasks').delete().eq('id', id).eq('user_id', _uid);
  }

  // --- Progress ---
  async function loadProgress() {
    const { data } = await sb.from('progress_data').select('*').eq('user_id', _uid).maybeSingle();
    if (!data) return null;
    return { rows: data.rows, chartTitle: data.chart_title, passingPercent: data.passing_percent };
  }
  async function saveProgress(obj) {
    await sb.from('progress_data').upsert({
      user_id: _uid,
      rows: obj.rows,
      chart_title: obj.chartTitle || 'My Progress',
      passing_percent: obj.passingPercent || 70,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

  // --- Week Tracker ---
  async function loadWeek(weekKey) {
    const { data } = await sb.from('week_tracker').select('*').eq('user_id', _uid).eq('week_key', weekKey).maybeSingle();
    if (!data) return { manualRating: null, days: {} };
    return { manualRating: data.manual_rating, days: data.days || {} };
  }
  async function saveWeek(weekKey, obj) {
    await sb.from('week_tracker').upsert({
      user_id: _uid,
      week_key: weekKey,
      manual_rating: obj.manualRating,
      days: obj.days || {},
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,week_key' });
  }
  async function allWeekKeys() {
    const { data } = await sb.from('week_tracker').select('week_key').eq('user_id', _uid).order('week_key', { ascending: false });
    return (data || []).map(r => r.week_key);
  }

  // --- Ranker ---
  async function loadRanker() {
    const { data } = await sb.from('ranker_data').select('*').eq('user_id', _uid).maybeSingle();
    if (!data) return { questions: [], apiKey: '', lastRun: null };
    return { questions: data.questions || [], apiKey: data.api_key_encrypted || '', lastRun: data.last_run };
  }
  async function saveRanker(obj) {
    await sb.from('ranker_data').upsert({
      user_id: _uid,
      questions: obj.questions,
      api_key_encrypted: obj.apiKey || '',
      last_run: obj.lastRun || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

  // --- Streaks ---
  async function loadStreaks() {
    const { data } = await sb.from('streak_data').select('*').eq('user_id', _uid).maybeSingle();
    if (!data) return [];
    return data.streaks || [];
  }
  async function saveStreaks(arr) {
    await sb.from('streak_data').upsert({
      user_id: _uid,
      streaks: arr,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

  // --- Logbook ---
  async function loadLogbook() {
    const { data } = await sb.from('logbook_data').select('*').eq('user_id', _uid).maybeSingle();
    if (!data) return { projects: [], log: [], activeId: null };
    return { projects: data.projects || [], log: data.log || [], activeId: data.active_id };
  }
  async function saveLogbook(obj) {
    await sb.from('logbook_data').upsert({
      user_id: _uid,
      projects: obj.projects,
      log: obj.log,
      active_id: obj.activeId || null,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
  }

  // --- Prefs ---
  async function loadPrefs() {
    const { data } = await sb.from('user_prefs').select('*').eq('user_id', _uid).maybeSingle();
    return data || { active_tab: 'todo', tracker_theme: 'light' };
  }
  async function savePrefs(obj) {
    await sb.from('user_prefs').upsert({
      user_id: _uid,
      active_tab: obj.active_tab,
      tracker_theme: obj.tracker_theme
    }, { onConflict: 'user_id' });
  }

  window.DB = {
    uid, onReady,
    loadTodos, insertTodo, updateTodo, deleteTodo,
    loadProgress, saveProgress,
    loadWeek, saveWeek, allWeekKeys,
    loadRanker, saveRanker,
    loadStreaks, saveStreaks,
    loadLogbook, saveLogbook,
    loadPrefs, savePrefs
  };
})();

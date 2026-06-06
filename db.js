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
    return (data || []).map(r => ({ id: r.id, text: r.text, done: r.done, priority: r.priority, created_at: r.created_at }));
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

  // One-time migration: shifts day-keys that were stored under UTC-shifted values
  // (because old code used toISOString().slice(0,10) on local-midnight Date objects)
  // forward by 1 day so they land in the correct local Sunday-based week.
  function _shiftYmd(s, days) {
    const d = new Date(s + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function _sundayOf(s) {
    const d = new Date(s + 'T00:00:00');
    d.setDate(d.getDate() - d.getDay());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  async function migrateUTCKeys() {
    const flagKey = 'utcMigrationV1:' + _uid;
    try { if (localStorage.getItem(flagKey) === 'done') return; } catch (e) { return; }
    const { data: records } = await sb.from('week_tracker').select('*').eq('user_id', _uid);
    if (!records || !records.length) { try { localStorage.setItem(flagKey, 'done'); } catch (e) {} return; }
    const updates = {};
    const toDelete = [];
    for (const rec of records) {
      const wk = rec.week_key;
      const days = rec.days || {};
      const dayKeys = Object.keys(days).filter(k => days[k] && days[k].length);
      if (!dayKeys.length) continue;
      const wkEnd = _shiftYmd(wk, 6);
      const outOfRange = dayKeys.filter(k => k < wk || k > wkEnd);
      if (outOfRange.length === 0) continue;
      // Shift every day in this record forward by 1 day, re-homed to its proper Sunday
      for (const oldDk of dayKeys) {
        const newDk = _shiftYmd(oldDk, 1);
        const newWk = _sundayOf(newDk);
        if (!updates[newWk]) updates[newWk] = { days: {}, manualRating: null };
        if (!updates[newWk].days[newDk]) updates[newWk].days[newDk] = days[oldDk];
      }
      if (rec.manual_rating != null) {
        const newWk = _shiftYmd(wk, 1);
        if (!updates[newWk]) updates[newWk] = { days: {}, manualRating: null };
        if (updates[newWk].manualRating == null) updates[newWk].manualRating = rec.manual_rating;
      }
      toDelete.push(wk);
    }
    // Merge existing (correct) records' contents into updates so we don't lose data on overwrite
    for (const rec of records) {
      if (!updates[rec.week_key]) continue;
      const days = rec.days || {};
      Object.keys(days).forEach(dk => {
        if (!updates[rec.week_key].days[dk] && days[dk] && days[dk].length) {
          updates[rec.week_key].days[dk] = days[dk];
        }
      });
      if (rec.manual_rating != null && updates[rec.week_key].manualRating == null) {
        updates[rec.week_key].manualRating = rec.manual_rating;
      }
    }
    // Write the corrected records
    for (const [wk, payload] of Object.entries(updates)) {
      await sb.from('week_tracker').upsert({
        user_id: _uid,
        week_key: wk,
        manual_rating: payload.manualRating,
        days: payload.days,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,week_key' });
    }
    // Delete the old shifted records
    for (const wk of toDelete) {
      // Don't delete if the same key was also a target of merging
      if (updates[wk]) continue;
      await sb.from('week_tracker').delete().eq('user_id', _uid).eq('week_key', wk);
    }
    try { localStorage.setItem(flagKey, 'done'); } catch (e) {}
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
    return data || { active_tab: 'tracker', tracker_theme: 'light' };
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
    loadWeek, saveWeek, allWeekKeys, migrateUTCKeys,
    loadRanker, saveRanker,
    loadStreaks, saveStreaks,
    loadLogbook, saveLogbook,
    loadPrefs, savePrefs
  };
})();

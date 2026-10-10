// Demo mode: a tiny pretend server that keeps everything in this browser's localStorage.
// It answers the same requests as the real Express API, so the React app does not change.
import { addDays, iso } from './dates.js';

const KEY = 'petal_demo_db';
const empty = () => ({ seq: 1, users: [], projects: [], tasks: [], subtasks: [], notes: [] });
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || empty(); } catch { return empty(); } };
const save = (db) => localStorage.setItem(KEY, JSON.stringify(db));
const fail = (m) => { throw new Error(m); };
const sha = async (s) =>
  [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))]
    .map((x) => x.toString(16).padStart(2, '0')).join('');
const cmp = (a, b) => (a === b ? 0 : a == null ? 1 : b == null ? -1 : a < b ? -1 : 1);
const order = (a, b) => (a.done - b.done) || cmp(a.dueDate, b.dueDate) || cmp(a.dueTime, b.dueTime) || a.id - b.id;
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

function taskView(db, t) {
  const p = db.projects.find((x) => x.id === t.projectId);
  return {
    id: t.id, title: t.title, notes: t.notes, dueDate: t.dueDate, dueTime: t.dueTime,
    priority: t.priority, done: t.done, projectId: t.projectId,
    projectName: p ? p.name : null, projectColor: p ? p.color : null,
    subtasks: db.subtasks.filter((s) => s.taskId === t.id).map(({ id, title, done }) => ({ id, title, done })),
  };
}
function noteView(db, n) {
  const p = db.projects.find((x) => x.id === n.projectId);
  const t = db.tasks.find((x) => x.id === n.taskId);
  return {
    id: n.id, title: n.title, body: n.body, pinned: n.pinned, updatedAt: n.updatedAt,
    projectId: n.projectId, projectName: p ? p.name : null, projectColor: p ? p.color : null,
    taskId: n.taskId, taskTitle: t ? t.title : null,
  };
}

// New accounts start with the four projects plus a few example tasks and notes.
function seed(db, uid) {
  const mk = (name, color) => { const p = { id: db.seq++, userId: uid, name, color }; db.projects.push(p); return p; };
  const work = mk('Work', '#E7DDFB'), personal = mk('Personal', '#FFE9B5'), study = mk('Study', '#D9F2E3'), health = mk('Health', '#F9D3E0');
  const today = new Date();
  const add = (title, p, d, time, priority, done = false) => {
    const t = { id: db.seq++, userId: uid, projectId: p.id, title, notes: '', dueDate: iso(addDays(today, d)), dueTime: time, priority, done, completedAt: done ? iso(today) : null };
    db.tasks.push(t); return t;
  };
  add('Team standup', work, 0, '10:00', 'high');
  add('Pick up groceries', personal, 0, '13:30', 'medium');
  const read = add('Read chapter 4', study, 0, '17:00', 'medium');
  ['Skim the headings', 'Write three key points'].forEach((title) => db.subtasks.push({ id: db.seq++, taskId: read.id, title, done: false }));
  add('Morning run', health, 0, '07:30', 'low', true);
  add('Send project update', work, -1, '16:00', 'high');
  add('Call mum', personal, 1, '18:00', 'medium');
  add('Revise for quiz', study, 2, '11:00', 'medium');
  const note = (title, body, p, t, pinned = false) =>
    db.notes.push({ id: db.seq++, userId: uid, projectId: p ? p.id : null, taskId: t ? t.id : null, title, body, pinned, updatedAt: new Date().toISOString() });
  note('Marketing 101', 'The four Ps are product, price, place and promotion. Compare how each one changes by segment.', study, read, true);
  note('Gift ideas', 'Mum: silk scarf. Sam: notebook set.', personal, null);
  note('Meeting recap', 'Ship the beta on Friday. Send the team an update by Thursday.', work, null);
}

export async function demoApi(path, { method = 'GET', body } = {}, token) {
  const url = new URL(path, 'http://demo');
  const p = url.pathname, q = url.searchParams, b = body || {};
  const db = load();
  let m;

  // ---- accounts ----
  if (p === '/auth/register' && method === 'POST') {
    const name = String(b.name || '').trim(), email = String(b.email || '').trim().toLowerCase();
    if (!name) fail('Enter your name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('Enter a valid email address.');
    if (typeof b.password !== 'string' || b.password.length < 8) fail('Use a password with at least 8 characters.');
    if (db.users.some((u) => u.email === email)) fail('That email is already registered. Try logging in.');
    const u = { id: db.seq++, name, email, hash: await sha(email + b.password) };
    db.users.push(u); seed(db, u.id); save(db);
    return { token: 'demo-' + u.id, user: { id: u.id, name, email } };
  }
  if (p === '/auth/login' && method === 'POST') {
    const email = String(b.email || '').trim().toLowerCase();
    const u = db.users.find((x) => x.email === email);
    if (!u || u.hash !== (await sha(email + String(b.password || '')))) fail('Email or password is incorrect.');
    return { token: 'demo-' + u.id, user: { id: u.id, name: u.name, email: u.email } };
  }

  const uid = token && token.startsWith('demo-') ? Number(token.slice(5)) : 0;
  const me = db.users.find((u) => u.id === uid);
  if (!me) fail('Please log in to continue.');
  const mine = (arr) => arr.filter((x) => x.userId === uid);
  const ownProject = (id) => !id || mine(db.projects).some((x) => x.id === Number(id));
  const task = (id) => mine(db.tasks).find((t) => t.id === Number(id));
  const note = (id) => mine(db.notes).find((n) => n.id === Number(id));

  if (p === '/auth/me') return { id: me.id, name: me.name, email: me.email };

  if (p === '/stats') {
    const days = new Set(mine(db.tasks).filter((t) => t.completedAt).map((t) => t.completedAt));
    let d = new Date(), streak = 0;
    if (!days.has(iso(d))) d = addDays(d, -1);
    while (days.has(iso(d))) { streak++; d = addDays(d, -1); }
    return { done: mine(db.tasks).filter((t) => t.done).length, projects: mine(db.projects).length, streak };
  }

  // ---- projects ----
  if (p === '/projects' && method === 'GET') {
    return mine(db.projects).map(({ id, name, color }) => {
      const ts = mine(db.tasks).filter((t) => t.projectId === id);
      return { id, name, color, total: ts.length, done: ts.filter((t) => t.done).length };
    });
  }
  if (p === '/projects' && method === 'POST') {
    if (!String(b.name || '').trim()) fail('Enter a project name.');
    const pr = { id: db.seq++, userId: uid, name: String(b.name).trim(), color: /^#[0-9A-Fa-f]{6}$/.test(b.color || '') ? b.color : '#E7DDFB' };
    db.projects.push(pr); save(db);
    return { id: pr.id, name: pr.name, color: pr.color, total: 0, done: 0 };
  }
  if ((m = p.match(/^\/projects\/(\d+)$/)) && method === 'DELETE') {
    const id = Number(m[1]);
    db.projects = db.projects.filter((x) => !(x.id === id && x.userId === uid));
    db.tasks.forEach((t) => { if (t.projectId === id) t.projectId = null; });
    db.notes.forEach((n) => { if (n.projectId === id) n.projectId = null; });
    save(db); return null;
  }

  // ---- tasks ----
  if (p === '/tasks' && method === 'GET') {
    const from = q.get('from'), to = q.get('to'), pid = q.get('projectId');
    return mine(db.tasks)
      .filter((t) => (!from || (t.dueDate && t.dueDate >= from)) && (!to || (t.dueDate && t.dueDate <= to)) && (!pid || t.projectId === Number(pid)))
      .sort(order).map((t) => taskView(db, t));
  }
  if (p === '/tasks/overdue') {
    const today = q.get('today');
    if (!isDate(today)) fail('Send today as YYYY-MM-DD.');
    return mine(db.tasks).filter((t) => !t.done && t.dueDate && t.dueDate < today).sort(order).map((t) => taskView(db, t));
  }
  if (p === '/tasks' && method === 'POST') {
    if (!String(b.title || '').trim()) fail('Give the task a name.');
    if (b.priority && !['low', 'medium', 'high'].includes(b.priority)) fail('Invalid priority.');
    if (!ownProject(b.projectId)) fail('Unknown project.');
    const t = { id: db.seq++, userId: uid, projectId: b.projectId ? Number(b.projectId) : null, title: String(b.title).trim(), notes: b.notes || '', dueDate: b.dueDate || null, dueTime: b.dueTime || null, priority: b.priority || 'medium', done: false, completedAt: null };
    db.tasks.push(t); save(db); return taskView(db, t);
  }
  if ((m = p.match(/^\/tasks\/(\d+)$/))) {
    const t = task(m[1]);
    if (!t) fail('Task not found.');
    if (method === 'GET') return taskView(db, t);
    if (method === 'DELETE') {
      db.tasks = db.tasks.filter((x) => x.id !== t.id);
      db.subtasks = db.subtasks.filter((s) => s.taskId !== t.id);
      db.notes.forEach((n) => { if (n.taskId === t.id) n.taskId = null; });
      save(db); return null;
    }
    if (method === 'PATCH') {
      if ('title' in b) { if (!String(b.title).trim()) fail('Give the task a name.'); t.title = String(b.title).trim(); }
      if ('notes' in b) t.notes = String(b.notes);
      if ('dueDate' in b) t.dueDate = b.dueDate || null;
      if ('dueTime' in b) t.dueTime = b.dueTime || null;
      if ('priority' in b) { if (!['low', 'medium', 'high'].includes(b.priority)) fail('Invalid priority.'); t.priority = b.priority; }
      if ('projectId' in b) { if (!ownProject(b.projectId)) fail('Unknown project.'); t.projectId = b.projectId ? Number(b.projectId) : null; }
      if ('done' in b) { t.done = !!b.done; t.completedAt = t.done ? iso(new Date()) : null; }
      save(db); return taskView(db, t);
    }
  }
  if ((m = p.match(/^\/tasks\/(\d+)\/subtasks$/)) && method === 'POST') {
    const t = task(m[1]);
    if (!t) fail('Task not found.');
    if (!String(b.title || '').trim()) fail('Enter a subtask.');
    db.subtasks.push({ id: db.seq++, taskId: t.id, title: String(b.title).trim(), done: false });
    save(db); return taskView(db, t);
  }
  if ((m = p.match(/^\/tasks\/subtasks\/(\d+)$/))) {
    const s = db.subtasks.find((x) => x.id === Number(m[1]));
    const t = s && task(s.taskId);
    if (!t) fail('Subtask not found.');
    if (method === 'PATCH') {
      if (typeof b.done === 'boolean') s.done = b.done;
      if (b.title) s.title = String(b.title).trim();
    } else if (method === 'DELETE') db.subtasks = db.subtasks.filter((x) => x.id !== s.id);
    save(db); return taskView(db, t);
  }

  // ---- notes ----
  if (p === '/notes' && method === 'GET') {
    const text = (q.get('q') || '').toLowerCase(), pid = q.get('projectId');
    return mine(db.notes)
      .filter((n) => (!text || (n.title + ' ' + n.body).toLowerCase().includes(text)) && (!pid || n.projectId === Number(pid)))
      .sort((a, c) => (c.pinned - a.pinned) || c.updatedAt.localeCompare(a.updatedAt))
      .map((n) => ({ ...noteView(db, n), body: n.body.slice(0, 160) }));
  }
  if (p === '/notes' && method === 'POST') {
    if (!ownProject(b.projectId) || (b.taskId && !task(b.taskId))) fail('Unknown project or task.');
    const n = { id: db.seq++, userId: uid, title: String(b.title || ''), body: String(b.body || ''), pinned: !!b.pinned, projectId: b.projectId ? Number(b.projectId) : null, taskId: b.taskId ? Number(b.taskId) : null, updatedAt: new Date().toISOString() };
    db.notes.push(n); save(db); return noteView(db, n);
  }
  if ((m = p.match(/^\/notes\/(\d+)$/))) {
    const n = note(m[1]);
    if (!n) fail('Note not found.');
    if (method === 'GET') return noteView(db, n);
    if (method === 'DELETE') { db.notes = db.notes.filter((x) => x.id !== n.id); save(db); return null; }
    if (method === 'PATCH') {
      if (!ownProject(b.projectId) || (b.taskId && !task(b.taskId))) fail('Unknown project or task.');
      if ('title' in b) n.title = String(b.title);
      if ('body' in b) n.body = String(b.body);
      if ('pinned' in b) n.pinned = !!b.pinned;
      if ('projectId' in b) n.projectId = b.projectId ? Number(b.projectId) : null;
      if ('taskId' in b) n.taskId = b.taskId ? Number(b.taskId) : null;
      n.updatedAt = new Date().toISOString();
      save(db); return noteView(db, n);
    }
  }
  return fail('Not found.');
}

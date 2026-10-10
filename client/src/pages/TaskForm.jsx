import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { iso } from '../dates.js';
import Icon from '../components/Icon.jsx';

const PRIORITIES = [['low', 'Low'], ['medium', 'Medium'], ['high', 'High']];

// Used for both "New task" (/tasks/new) and "Task details" (/tasks/:id).
export default function TaskForm() {
  const { id } = useParams();
  const isNew = id === 'new';
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [f, setF] = useState({ title: '', notes: '', projectId: '', dueDate: params.get('date') || iso(new Date()), dueTime: '', priority: 'medium' });
  const [done, setDone] = useState(false);
  const [subs, setSubs] = useState([]);
  const [newSub, setNewSub] = useState('');
  const [projects, setProjects] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/projects').then(setProjects).catch((e) => setErr(e.message));
    if (!isNew) {
      api(`/tasks/${id}`).then((t) => {
        setF({ title: t.title, notes: t.notes, projectId: t.projectId || '', dueDate: t.dueDate || '', dueTime: t.dueTime || '', priority: t.priority });
        setDone(t.done); setSubs(t.subtasks);
      }).catch((e) => setErr(e.message));
    }
  }, [id, isNew]);

  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    const body = { ...f, projectId: f.projectId ? Number(f.projectId) : null, dueDate: f.dueDate || null, dueTime: f.dueTime || null };
    try {
      if (isNew) await api('/tasks', { method: 'POST', body });
      else await api(`/tasks/${id}`, { method: 'PATCH', body });
      nav('/');
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  async function toggleDone() {
    try { const t = await api(`/tasks/${id}`, { method: 'PATCH', body: { done: !done } }); setDone(t.done); }
    catch (x) { setErr(x.message); }
  }
  async function remove() {
    if (!window.confirm('Delete this task?')) return;
    try { await api(`/tasks/${id}`, { method: 'DELETE' }); nav('/'); } catch (x) { setErr(x.message); }
  }
  // Subtask calls return the whole task, so the list is always what the server has.
  const subCall = async (path, method, body) => {
    try { const t = await api(path, { method, body }); setSubs(t.subtasks); setErr(''); } catch (x) { setErr(x.message); }
  };
  const addSub = (e) => { e.preventDefault(); if (!newSub.trim()) return; subCall(`/tasks/${id}/subtasks`, 'POST', { title: newSub }); setNewSub(''); };

  return (
    <main className="screen editor">
      <header className="bar-top">
        <button className="round-line" aria-label="Back" onClick={() => nav(-1)}><Icon name="back" /></button>
        <h2 className="grow">{isNew ? 'New task' : 'Task details'}</h2>
        <span style={{ width: 44 }} />
      </header>
      {err && <p className="banner error" role="alert">{err}</p>}

      <form onSubmit={save} className="stack">
        <div className="field">
          <label htmlFor="title">Task name</label>
          <input id="title" className="title-input" placeholder="What needs doing?" value={f.title} onChange={(e) => set('title', e.target.value)} required autoFocus={isNew} />
        </div>

        <div className="field">
          <span className="label">Project</span>
          <div className="tiles" role="group" aria-label="Project">
            {projects.map((p) => (
              <button type="button" key={p.id} className={'tile' + (String(p.id) === String(f.projectId) ? ' on' : '')} aria-pressed={String(p.id) === String(f.projectId)}
                onClick={() => set('projectId', String(p.id) === String(f.projectId) ? '' : p.id)}>
                <span className="cat-dot" style={{ background: p.color }}>{p.name[0]}</span>
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <div className="field grow">
            <label htmlFor="date">Date</label>
            <input id="date" type="date" className="input" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
          </div>
          <div className="field grow">
            <label htmlFor="time">Time</label>
            <input id="time" type="time" className="input" value={f.dueTime} onChange={(e) => set('dueTime', e.target.value)} />
          </div>
        </div>

        <div className="field">
          <span className="label">Priority</span>
          <div className="seg" role="group" aria-label="Priority">
            {PRIORITIES.map(([v, l]) => (
              <button type="button" key={v} className={'seg-btn' + (f.priority === v ? ' on' : '') + (v === 'high' ? ' hi' : '')} aria-pressed={f.priority === v} onClick={() => set('priority', v)}>{l}</button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Details</label>
          <textarea id="notes" className="input area" value={f.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        <button className="btn" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create task' : 'Save changes'}</button>
      </form>

      {!isNew && (
        <>
          <h2>Subtasks</h2>
          <ul className="subs">
            {subs.map((s) => (
              <li key={s.id}>
                <button className="check" aria-label={s.done ? 'Mark subtask not done' : 'Mark subtask done'} onClick={() => subCall(`/tasks/subtasks/${s.id}`, 'PATCH', { done: !s.done })}>
                  <span className={'box' + (s.done ? ' done' : '')}>{s.done && <Icon name="today" size={14} />}</span>
                </button>
                <span className={s.done ? 'struck grow' : 'grow'}>{s.title}</span>
                <button className="icon-btn" aria-label={`Delete subtask ${s.title}`} onClick={() => subCall(`/tasks/subtasks/${s.id}`, 'DELETE')}><Icon name="close" size={18} /></button>
              </li>
            ))}
          </ul>
          <form onSubmit={addSub} className="row">
            <input aria-label="New subtask" className="input grow" placeholder="Add a subtask" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
            <button className="btn btn-out">Add</button>
          </form>

          <div className="stack spaced">
            <button className="btn btn-out" onClick={toggleDone}>{done ? 'Mark as not done' : 'Mark as done'}</button>
            <Link className="link center" to={`/notes/new?task=${id}`}>Write a note about this task</Link>
            <button className="btn btn-danger" onClick={remove}>Delete task</button>
          </div>
        </>
      )}
    </main>
  );
}

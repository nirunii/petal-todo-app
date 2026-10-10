import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

export default function NoteEditor() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const [noteId, setNoteId] = useState(id === 'new' ? null : id);
  const [note, setNote] = useState({ title: '', body: '', projectId: '', taskId: params.get('task') || '', pinned: false });
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [saved, setSaved] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    api('/projects').then(setProjects).catch((e) => setErr(e.message));
    api('/tasks').then((t) => setTasks(t.filter((x) => !x.done))).catch(() => {});
    if (id !== 'new') {
      api(`/notes/${id}`)
        .then((n) => setNote({ title: n.title, body: n.body, projectId: n.projectId || '', taskId: n.taskId || '', pinned: n.pinned }))
        .catch((e) => setErr(e.message));
    }
  }, [id]);

  const change = (patch) => { setNote((n) => ({ ...n, ...patch })); setSaved(false); };

  // Creates the note the first time, updates it afterwards. An empty new note is never saved.
  async function save() {
    if (!noteId && !note.title.trim() && !note.body.trim()) return true;
    const body = {
      title: note.title, body: note.body, pinned: note.pinned,
      projectId: note.projectId ? Number(note.projectId) : null,
      taskId: note.taskId ? Number(note.taskId) : null,
    };
    try {
      if (noteId) await api(`/notes/${noteId}`, { method: 'PATCH', body });
      else { const n = await api('/notes', { method: 'POST', body }); setNoteId(n.id); }
      setSaved(true); setErr('');
      return true;
    } catch (e) { setErr(e.message); return false; }
  }
  async function back() { if (await save()) nav('/notes'); }
  async function remove() {
    if (!window.confirm('Delete this note?')) return;
    try { if (noteId) await api(`/notes/${noteId}`, { method: 'DELETE' }); nav('/notes'); }
    catch (e) { setErr(e.message); }
  }

  const linked = tasks.find((t) => String(t.id) === String(note.taskId));
  return (
    <main className="screen editor">
      <header className="bar-top">
        <button className="round-line" aria-label="Back to notes" onClick={back}><Icon name="back" /></button>
        <div className="row">
          <button className={'round-line' + (note.pinned ? ' on' : '')} aria-pressed={note.pinned} aria-label="Pin note" onClick={() => change({ pinned: !note.pinned })}><Icon name="pin" /></button>
          {noteId && <button className="round-line" aria-label="Delete note" onClick={remove}><Icon name="trash" /></button>}
        </div>
      </header>

      {err && <p className="banner error" role="alert">{err}</p>}

      <div className="row wrap">
        <select aria-label="Project" className="pill-select" value={note.projectId} onChange={(e) => change({ projectId: e.target.value })}>
          <option value="">No project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select aria-label="Linked task" className="pill-select" value={note.taskId} onChange={(e) => change({ taskId: e.target.value })}>
          <option value="">No linked task</option>
          {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </div>
      {linked && <Link className="link-chip" to={`/tasks/${linked.id}`}><Icon name="link" size={14} /> Linked: {linked.title}</Link>}

      <input className="title-input" aria-label="Title" placeholder="Title" value={note.title} onChange={(e) => change({ title: e.target.value })} />
      <textarea className="body-input" aria-label="Note" placeholder="Start writing…" value={note.body} onChange={(e) => change({ body: e.target.value })} />

      <div className="save-bar">
        <span className="small muted" role="status">{saved ? 'Saved' : 'Unsaved changes'}</span>
        <button className="btn" onClick={save}>Save note</button>
      </div>
    </main>
  );
}

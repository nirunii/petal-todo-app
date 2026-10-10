import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

export default function Notes() {
  const [notes, setNotes] = useState([]);
  const [projects, setProjects] = useState([]);
  const [q, setQ] = useState('');
  const [projectId, setProjectId] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { api('/projects').then(setProjects).catch(() => {}); }, []);

  // Wait a moment after typing before asking the server, so it is not hit on every key.
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = new URLSearchParams();
      if (q) qs.set('q', q);
      if (projectId) qs.set('projectId', projectId);
      api(`/notes?${qs}`).then((n) => { setNotes(n); setErr(''); }).catch((e) => setErr(e.message)).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q, projectId]);

  return (
    <main className="screen">
      <h1>Notes</h1>
      <p className="muted">{notes.length} {notes.length === 1 ? 'note' : 'notes'}</p>

      <div className="search">
        <Icon name="search" size={20} />
        <input aria-label="Search notes" placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="chips">
        <button className={'chip' + (!projectId ? ' on' : '')} aria-pressed={!projectId} onClick={() => setProjectId(null)}>All</button>
        {projects.map((p) => (
          <button key={p.id} className={'chip' + (projectId === p.id ? ' on' : '')} aria-pressed={projectId === p.id}
            onClick={() => setProjectId(projectId === p.id ? null : p.id)}>{p.name}</button>
        ))}
      </div>
      {err && <p className="banner error" role="alert">{err}</p>}

      {!loading && notes.length === 0 ? (
        <section className="empty-card">
          <h2>{q || projectId ? 'No matching notes' : 'No notes yet'}</h2>
          <p>{q || projectId ? 'Try a different search.' : 'Capture an idea, a lecture or a meeting.'}</p>
          <Link className="btn" to="/notes/new">Write a note</Link>
        </section>
      ) : (
        <div className="masonry">
          {notes.map((n) => (
            <Link key={n.id} to={`/notes/${n.id}`} className="note" style={{ background: n.projectColor || 'var(--mist)' }}>
              <span className="small strong">{n.projectName || 'No project'}{n.pinned ? ' · Pinned' : ''}</span>
              <h3>{n.title || 'Untitled'}</h3>
              <p className="small">{n.body}</p>
              <span className="small muted">{new Date(n.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

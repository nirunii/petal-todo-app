import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Icon from '../components/Icon.jsx';

const COLORS = ['#E7DDFB', '#FFE9B5', '#D9F2E3', '#F9D3E0', '#FFD9A8', '#D6E8FB'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { api('/projects').then(setProjects).catch((e) => setErr(e.message)); }, []);

  async function create(e) {
    e.preventDefault();
    try {
      const p = await api('/projects', { method: 'POST', body: { name, color } });
      setProjects([...projects, p]); setName(''); setOpen(false); setErr('');
    } catch (x) { setErr(x.message); }
  }
  async function remove(p) {
    if (!window.confirm(`Delete "${p.name}"? Its tasks stay, but lose this project.`)) return;
    try { await api(`/projects/${p.id}`, { method: 'DELETE' }); setProjects(projects.filter((x) => x.id !== p.id)); }
    catch (x) { setErr(x.message); }
  }

  return (
    <main className="screen">
      <h1>Projects</h1>
      <p className="muted">{projects.length} active</p>
      {err && <p className="banner error" role="alert">{err}</p>}

      <div className="grid2">
        {projects.map((p) => (
          <article key={p.id} className="project" style={{ background: p.color }}>
            <button className="icon-btn" aria-label={`Delete ${p.name}`} onClick={() => remove(p)}><Icon name="trash" size={18} /></button>
            <span className="cat-dot light">{p.name[0]}</span>
            <h3>{p.name}</h3>
            <p className="small">{p.total} {p.total === 1 ? 'task' : 'tasks'}</p>
            <div className="bar"><i style={{ width: p.total ? `${(p.done / p.total) * 100}%` : '0%' }} /></div>
          </article>
        ))}
      </div>

      {open ? (
        <form onSubmit={create} className="sheet stack">
          <div className="field">
            <label htmlFor="pname">Project name</label>
            <input id="pname" className="input" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="swatches" role="group" aria-label="Colour">
            {COLORS.map((c) => (
              <button type="button" key={c} className={'swatch' + (c === color ? ' on' : '')} style={{ background: c }}
                aria-label={`Colour ${c}`} aria-pressed={c === color} onClick={() => setColor(c)} />
            ))}
          </div>
          <div className="row">
            <button className="btn">Create project</button>
            <button type="button" className="btn btn-out" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      ) : (
        <button className="btn spaced" onClick={() => setOpen(true)}>New project</button>
      )}
    </main>
  );
}

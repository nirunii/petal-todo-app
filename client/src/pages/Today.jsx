import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { greeting, iso, longDate } from '../dates.js';
import Flower from '../components/Flower.jsx';
import Icon from '../components/Icon.jsx';
import TaskCard from '../components/TaskCard.jsx';

const R = 26;
const C = 2 * Math.PI * R;

export default function Today() {
  const { user } = useAuth();
  const today = iso(new Date());
  const [tasks, setTasks] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [t, o, p] = await Promise.all([
        api(`/tasks?from=${today}&to=${today}`),
        api(`/tasks/overdue?today=${today}`),
        api('/projects'),
      ]);
      setTasks(t); setOverdue(o); setProjects(p); setErr('');
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, [today]);
  useEffect(() => { load(); }, [load]);

  // Update the screen right away, then tell the server. If it fails, reload the truth.
  async function toggle(task) {
    setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)));
    if (!task.done) setOverdue((os) => os.filter((x) => x.id !== task.id));
    try {
      await api(`/tasks/${task.id}`, { method: 'PATCH', body: { done: !task.done } });
    } catch (e) {
      setErr(e.message);
      load();
    }
  }

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const pct = total ? doneCount / total : 0;
  const shown = tasks.filter((t) => !filter || t.projectId === filter);
  const open = shown.filter((t) => !t.done);
  const finished = shown.filter((t) => t.done);
  const next = open[0];
  const overdueShown = overdue.filter((t) => !filter || t.projectId === filter);
  const empty = !loading && total === 0 && overdue.length === 0;

  return (
    <main className="screen">
      <header className="top">
        <Link to="/profile" className="avatar" aria-label="Open profile">{user.name[0].toUpperCase()}</Link>
        <div>
          <div className="muted small">{greeting()}</div>
          <div className="strong">{user.name.split(' ')[0]}</div>
        </div>
        <span className="muted small push">{longDate(new Date())}</span>
      </header>

      {err && <p className="banner error" role="alert"><Icon name="alert" size={20} /> {err}</p>}

      <h2>My day</h2>
      <div className="cats">
        {projects.map((p) => (
          <button key={p.id} className={'cat' + (filter === p.id ? ' on' : '')} aria-pressed={filter === p.id}
            onClick={() => setFilter(filter === p.id ? null : p.id)}>
            <span className="cat-dot" style={{ background: p.color }}>{p.name[0]}</span>
            <span>{p.name}</span>
          </button>
        ))}
      </div>

      {empty ? (
        <section className="empty-card">
          <Flower size={120} />
          <h2>A clear day</h2>
          <p>Nothing planned yet.</p>
          <Link className="btn" to="/tasks/new">Add your first task</Link>
        </section>
      ) : (
        <>
          <section className="progress" aria-label="Progress">
            <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--line)" strokeWidth="8" />
              <circle cx="32" cy="32" r={R} fill="none" stroke="var(--ink)" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 32 32)" />
            </svg>
            <div>
              <div className="strong">{doneCount} of {total} done</div>
              <div className="muted small">{total - doneCount === 0 ? 'Everything is done.' : `${total - doneCount} left today.`}</div>
            </div>
          </section>

          {next && (
            <>
              <h2>Up next</h2>
              <section className="upnext" style={{ background: next.projectColor || 'var(--mist)' }}>
                <Flower size={96} />
                <div className="upnext-pill">
                  <div>
                    <div className="small muted">{next.dueTime || 'Anytime'} · {next.projectName || 'No project'}</div>
                    <div className="strong">{next.title}</div>
                  </div>
                  <Link to={`/tasks/${next.id}`} className="round-btn" aria-label={`Open ${next.title}`}><Icon name="arrow" size={20} /></Link>
                </div>
              </section>
            </>
          )}

          {overdueShown.length > 0 && (
            <>
              <h2>Overdue</h2>
              <div className="stack">{overdueShown.map((t) => <TaskCard key={t.id} task={t} onToggle={toggle} overdue />)}</div>
            </>
          )}

          {open.length > 0 && (
            <>
              <h2>Today's schedule</h2>
              <div className="stack">{open.map((t) => <TaskCard key={t.id} task={t} onToggle={toggle} />)}</div>
            </>
          )}

          {finished.length > 0 && (
            <details className="done-list">
              <summary>Completed · {finished.length}</summary>
              <div className="stack">{finished.map((t) => <TaskCard key={t.id} task={t} onToggle={toggle} />)}</div>
            </details>
          )}
        </>
      )}
    </main>
  );
}

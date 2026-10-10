import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { addDays, iso, longDate, parse } from '../dates.js';
import TaskCard from '../components/TaskCard.jsx';

export default function Upcoming() {
  const start = new Date();
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const [selected, setSelected] = useState(iso(start));
  const [tasks, setTasks] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    api(`/tasks?from=${iso(days[0])}&to=${iso(days[6])}`).then(setTasks).catch((e) => setErr(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggle(task) {
    setTasks((ts) => ts.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)));
    try { await api(`/tasks/${task.id}`, { method: 'PATCH', body: { done: !task.done } }); }
    catch (e) { setErr(e.message); }
  }

  const list = tasks.filter((t) => t.dueDate === selected);
  return (
    <main className="screen">
      <h1>Upcoming</h1>
      <p className="muted">{start.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
      {err && <p className="banner error" role="alert">{err}</p>}

      <div className="week" role="group" aria-label="Pick a day">
        {days.map((d) => {
          const key = iso(d);
          const has = tasks.some((t) => t.dueDate === key && !t.done);
          return (
            <button key={key} className={'day' + (key === selected ? ' on' : '')} aria-pressed={key === selected} onClick={() => setSelected(key)}>
              <span>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
              <strong>{d.getDate()}</strong>
              <i className={has ? 'pip' : 'pip off'} aria-hidden="true" />
            </button>
          );
        })}
      </div>

      <h2>{longDate(parse(selected))}</h2>
      {list.length ? (
        <div className="stack">{list.map((t) => <TaskCard key={t.id} task={t} onToggle={toggle} />)}</div>
      ) : (
        <section className="empty-card">
          <h2>Nothing planned</h2>
          <p>Add something for this day.</p>
          <Link className="btn" to={`/tasks/new?date=${selected}`}>Add a task</Link>
        </section>
      )}
    </main>
  );
}

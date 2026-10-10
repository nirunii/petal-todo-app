import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import Icon from '../components/Icon.jsx';

export default function Profile() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => { api('/stats').then(setStats).catch((e) => setErr(e.message)); }, []);

  return (
    <main className="screen profile">
      <header className="bar-top">
        <span style={{ width: 44 }} />
        <button className="round-line" aria-label="Close profile" onClick={() => nav('/')}><Icon name="close" /></button>
      </header>
      <div className="center">
        <div className="avatar big">{user.name[0].toUpperCase()}</div>
        <h1>{user.name}</h1>
        <p className="muted">{user.email}</p>
      </div>
      {err && <p className="banner error" role="alert">{err}</p>}
      <dl className="stats">
        <div><dd>{stats ? stats.done : '–'}</dd><dt>Done</dt></div>
        <div><dd>{stats ? stats.streak : '–'}</dd><dt>Day streak</dt></div>
        <div><dd>{stats ? stats.projects : '–'}</dd><dt>Projects</dt></div>
      </dl>
      <button className="btn btn-out" onClick={() => { logout(); nav('/welcome'); }}>Log out</button>
    </main>
  );
}

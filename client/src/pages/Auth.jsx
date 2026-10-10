import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

// One screen for both "Log in" and "Create account".
export default function Auth({ mode }) {
  const signup = mode === 'signup';
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    if (signup && f.password !== f.confirm) return setErr('The two passwords do not match.');
    setBusy(true);
    try {
      if (signup) await register(f.name, f.email, f.password);
      else await login(f.email, f.password);
      nav('/', { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="screen auth">
      <svg width="44" height="44" viewBox="0 0 40 40" aria-hidden="true">
        <path d="M6 34C6 16 16 6 34 6c0 18-10 28-28 28z" fill="#141414" />
        <path d="M14 24l5 5 9-11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1>{signup ? 'Create account' : 'Welcome back'}</h1>
      <p className="muted">{signup ? 'Start planning in a minute.' : 'Log in to see your day.'}</p>

      <form onSubmit={submit} className="stack">
        {signup && (
          <div className="field">
            <label htmlFor="name">Name</label>
            <input id="name" className="input" value={f.name} onChange={on('name')} autoComplete="name" required />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={f.email} onChange={on('email')} autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Password</label>
          <div className="with-action">
            <input id="password" type={show ? 'text' : 'password'} className="input" value={f.password} onChange={on('password')}
              autoComplete={signup ? 'new-password' : 'current-password'} minLength={signup ? 8 : undefined} required />
            <button type="button" className="inline-action" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button>
          </div>
          {signup && <small className="muted">At least 8 characters.</small>}
        </div>
        {signup && (
          <div className="field">
            <label htmlFor="confirm">Confirm password</label>
            <input id="confirm" type={show ? 'text' : 'password'} className="input" value={f.confirm} onChange={on('confirm')} autoComplete="new-password" required />
          </div>
        )}
        {err && <p className="banner error" role="alert">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Log in'}</button>
      </form>

      <p className="center muted">
        {signup ? 'Have an account? ' : 'No account? '}
        <Link className="link" to={signup ? '/login' : '/signup'}>{signup ? 'Log in' : 'Sign up'}</Link>
      </p>
    </main>
  );
}

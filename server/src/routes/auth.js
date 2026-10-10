import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { q } from '../db.js';
import { sign, requireAuth, wrap } from '../middleware.js';

const router = Router();
const emailOk = (e) => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

router.post('/register', wrap(async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Enter your name.' });
  if (!emailOk(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  if (typeof password !== 'string' || password.length < 8)
    return res.status(400).json({ error: 'Use a password with at least 8 characters.' });

  const hash = await bcrypt.hash(password, 10);
  const r = await q(
    `INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3)
     ON CONFLICT (email) DO NOTHING RETURNING id, name, email`,
    [name.trim(), email.trim().toLowerCase(), hash]
  );
  if (!r.rows[0]) return res.status(409).json({ error: 'That email is already registered. Try logging in.' });
  const user = r.rows[0];

  // Every new account starts with the four default projects.
  await q(
    `INSERT INTO projects (user_id, name, color) VALUES
     ($1,'Work','#E7DDFB'),($1,'Personal','#FFE9B5'),($1,'Study','#D9F2E3'),($1,'Health','#F9D3E0')`,
    [user.id]
  );
  res.status(201).json({ token: sign(user.id), user });
}));

router.post('/login', wrap(async (req, res) => {
  const { email, password } = req.body || {};
  const r = await q('SELECT id, name, email, password_hash FROM users WHERE email = $1', [
    String(email || '').trim().toLowerCase(),
  ]);
  const row = r.rows[0];
  const ok = row && (await bcrypt.compare(String(password || ''), row.password_hash));
  // Same message for a wrong email and a wrong password, so accounts cannot be guessed.
  if (!ok) return res.status(401).json({ error: 'Email or password is incorrect.' });
  res.json({ token: sign(row.id), user: { id: row.id, name: row.name, email: row.email } });
}));

router.get('/me', requireAuth, wrap(async (req, res) => {
  const r = await q('SELECT id, name, email FROM users WHERE id = $1', [req.userId]);
  if (!r.rows[0]) return res.status(401).json({ error: 'Account not found.' });
  res.json(r.rows[0]);
}));

export default router;

import { Router } from 'express';
import { q } from '../db.js';
import { wrap } from '../middleware.js';

const router = Router();

router.get('/', wrap(async (req, res) => {
  const r = await q(
    `SELECT p.id, p.name, p.color,
            COUNT(t.id)::int AS total,
            COUNT(t.id) FILTER (WHERE t.done)::int AS done
     FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
     WHERE p.user_id = $1 GROUP BY p.id ORDER BY p.id`,
    [req.userId]
  );
  res.json(r.rows);
}));

router.post('/', wrap(async (req, res) => {
  const { name, color } = req.body || {};
  if (!name || !name.trim()) return res.status(400).json({ error: 'Enter a project name.' });
  const c = /^#[0-9A-Fa-f]{6}$/.test(color || '') ? color : '#E7DDFB';
  const r = await q(
    'INSERT INTO projects (user_id, name, color) VALUES ($1, $2, $3) RETURNING id, name, color',
    [req.userId, name.trim(), c]
  );
  res.status(201).json({ ...r.rows[0], total: 0, done: 0 });
}));

router.delete('/:id', wrap(async (req, res) => {
  await q('DELETE FROM projects WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
}));

export default router;

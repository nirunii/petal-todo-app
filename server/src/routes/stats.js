import { Router } from 'express';
import { q } from '../db.js';
import { wrap } from '../middleware.js';

const router = Router();
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

router.get('/', wrap(async (req, res) => {
  const done = await q('SELECT COUNT(*)::int AS n FROM tasks WHERE user_id = $1 AND done', [req.userId]);
  const projects = await q('SELECT COUNT(*)::int AS n FROM projects WHERE user_id = $1', [req.userId]);
  const days = await q(
    `SELECT DISTINCT completed_at::date AS d FROM tasks
     WHERE user_id = $1 AND completed_at IS NOT NULL`,
    [req.userId]
  );
  // Streak = consecutive days (ending today or yesterday) with at least one finished task.
  const set = new Set(days.rows.map((r) => r.d));
  let t = Date.now();
  if (!set.has(iso(t))) t -= 86400000;
  let streak = 0;
  while (set.has(iso(t))) { streak++; t -= 86400000; }
  res.json({ done: done.rows[0].n, projects: projects.rows[0].n, streak });
}));

export default router;

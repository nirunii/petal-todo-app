import { Router } from 'express';
import { q } from '../db.js';
import { wrap } from '../middleware.js';

const router = Router();

const SELECT = `
  SELECT n.id, n.title, n.body, n.pinned, n.updated_at AS "updatedAt",
         n.project_id AS "projectId", p.name AS "projectName", p.color AS "projectColor",
         n.task_id AS "taskId", t.title AS "taskTitle"
  FROM notes n
  LEFT JOIN projects p ON p.id = n.project_id
  LEFT JOIN tasks t ON t.id = n.task_id`;

const getOne = async (userId, id) =>
  (await q(`${SELECT} WHERE n.id = $1 AND n.user_id = $2`, [id, userId])).rows[0];

// A note may only point at a project or task that belongs to the same user.
async function linksOk(userId, projectId, taskId) {
  if (projectId && !(await q('SELECT 1 FROM projects WHERE id=$1 AND user_id=$2', [projectId, userId])).rowCount) return false;
  if (taskId && !(await q('SELECT 1 FROM tasks WHERE id=$1 AND user_id=$2', [taskId, userId])).rowCount) return false;
  return true;
}

router.get('/', wrap(async (req, res) => {
  const where = ['n.user_id = $1'];
  const vals = [req.userId];
  if (req.query.q) { vals.push(`%${req.query.q}%`); where.push(`(n.title ILIKE $${vals.length} OR n.body ILIKE $${vals.length})`); }
  if (req.query.projectId) { vals.push(Number(req.query.projectId)); where.push(`n.project_id = $${vals.length}`); }
  const r = await q(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY n.pinned DESC, n.updated_at DESC LIMIT 200`, vals);
  res.json(r.rows.map((n) => ({ ...n, body: n.body.slice(0, 160) })));
}));

router.get('/:id', wrap(async (req, res) => {
  const note = await getOne(req.userId, req.params.id);
  if (!note) return res.status(404).json({ error: 'Note not found.' });
  res.json(note);
}));

router.post('/', wrap(async (req, res) => {
  const { title = '', body = '', projectId = null, taskId = null, pinned = false } = req.body || {};
  if (!(await linksOk(req.userId, projectId, taskId))) return res.status(400).json({ error: 'Unknown project or task.' });
  const r = await q(
    `INSERT INTO notes (user_id, title, body, project_id, task_id, pinned)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
    [req.userId, String(title), String(body), projectId || null, taskId || null, !!pinned]
  );
  res.status(201).json(await getOne(req.userId, r.rows[0].id));
}));

router.patch('/:id', wrap(async (req, res) => {
  const b = req.body || {};
  if (!(await linksOk(req.userId, b.projectId, b.taskId))) return res.status(400).json({ error: 'Unknown project or task.' });
  const sets = ['updated_at = now()'];
  const vals = [];
  const set = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if ('title' in b) set('title', String(b.title));
  if ('body' in b) set('body', String(b.body));
  if ('pinned' in b) set('pinned', !!b.pinned);
  if ('projectId' in b) set('project_id', b.projectId || null);
  if ('taskId' in b) set('task_id', b.taskId || null);
  vals.push(req.params.id, req.userId);
  const r = await q(
    `UPDATE notes SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND user_id = $${vals.length} RETURNING id`,
    vals
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Note not found.' });
  res.json(await getOne(req.userId, r.rows[0].id));
}));

router.delete('/:id', wrap(async (req, res) => {
  await q('DELETE FROM notes WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
}));

export default router;

import { Router } from 'express';
import { q } from '../db.js';
import { wrap, isDate, isTime } from '../middleware.js';

const router = Router();

// One query shape for every task response: the task, its project, and its subtasks.
const SELECT = `
  SELECT t.id, t.title, t.notes, t.due_date AS "dueDate",
         to_char(t.due_time, 'HH24:MI') AS "dueTime",
         t.priority, t.done, t.project_id AS "projectId",
         p.name AS "projectName", p.color AS "projectColor",
         COALESCE((SELECT json_agg(json_build_object('id', s.id, 'title', s.title, 'done', s.done) ORDER BY s.id)
                   FROM subtasks s WHERE s.task_id = t.id), '[]'::json) AS subtasks
  FROM tasks t LEFT JOIN projects p ON p.id = t.project_id`;
const ORDER = 'ORDER BY t.done, t.due_date NULLS LAST, t.due_time NULLS LAST, t.id';

const getOne = async (userId, id) =>
  (await q(`${SELECT} WHERE t.id = $1 AND t.user_id = $2`, [id, userId])).rows[0];

const ownsProject = async (userId, projectId) =>
  !projectId || (await q('SELECT 1 FROM projects WHERE id = $1 AND user_id = $2', [projectId, userId])).rowCount > 0;

// GET /api/tasks?from=YYYY-MM-DD&to=YYYY-MM-DD&projectId=1
router.get('/', wrap(async (req, res) => {
  const where = ['t.user_id = $1'];
  const vals = [req.userId];
  const add = (sql, v) => { vals.push(v); where.push(sql.replace('?', '$' + vals.length)); };
  const { from, to, projectId } = req.query;
  if (from) { if (!isDate(from)) return res.status(400).json({ error: 'Invalid "from" date.' }); add('t.due_date >= ?', from); }
  if (to) { if (!isDate(to)) return res.status(400).json({ error: 'Invalid "to" date.' }); add('t.due_date <= ?', to); }
  if (projectId) add('t.project_id = ?', Number(projectId));
  const r = await q(`${SELECT} WHERE ${where.join(' AND ')} ${ORDER} LIMIT 500`, vals);
  res.json(r.rows);
}));

// Unfinished tasks whose due date is before "today" (the client sends its own local date).
router.get('/overdue', wrap(async (req, res) => {
  const { today } = req.query;
  if (!isDate(today)) return res.status(400).json({ error: 'Send today as YYYY-MM-DD.' });
  const r = await q(
    `${SELECT} WHERE t.user_id = $1 AND NOT t.done AND t.due_date < $2 ${ORDER}`,
    [req.userId, today]
  );
  res.json(r.rows);
}));

router.get('/:id', wrap(async (req, res) => {
  const task = await getOne(req.userId, req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  res.json(task);
}));

router.post('/', wrap(async (req, res) => {
  const { title, notes = '', projectId = null, dueDate = null, dueTime = null, priority = 'medium' } = req.body || {};
  if (!title || !title.trim()) return res.status(400).json({ error: 'Give the task a name.' });
  if (!['low', 'medium', 'high'].includes(priority)) return res.status(400).json({ error: 'Invalid priority.' });
  if (dueDate && !isDate(dueDate)) return res.status(400).json({ error: 'Invalid date.' });
  if (dueTime && !isTime(dueTime)) return res.status(400).json({ error: 'Invalid time.' });
  if (!(await ownsProject(req.userId, projectId))) return res.status(400).json({ error: 'Unknown project.' });
  const r = await q(
    `INSERT INTO tasks (user_id, project_id, title, notes, due_date, due_time, priority)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [req.userId, projectId || null, title.trim(), notes, dueDate || null, dueTime || null, priority]
  );
  res.status(201).json(await getOne(req.userId, r.rows[0].id));
}));

// Partial update: only the fields that are sent are changed.
router.patch('/:id', wrap(async (req, res) => {
  const b = req.body || {};
  const sets = [];
  const vals = [];
  const set = (col, v) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };

  if ('title' in b) { if (!String(b.title).trim()) return res.status(400).json({ error: 'Give the task a name.' }); set('title', String(b.title).trim()); }
  if ('notes' in b) set('notes', String(b.notes));
  if ('dueDate' in b) { if (b.dueDate && !isDate(b.dueDate)) return res.status(400).json({ error: 'Invalid date.' }); set('due_date', b.dueDate || null); }
  if ('dueTime' in b) { if (b.dueTime && !isTime(b.dueTime)) return res.status(400).json({ error: 'Invalid time.' }); set('due_time', b.dueTime || null); }
  if ('priority' in b) { if (!['low', 'medium', 'high'].includes(b.priority)) return res.status(400).json({ error: 'Invalid priority.' }); set('priority', b.priority); }
  if ('projectId' in b) { if (!(await ownsProject(req.userId, b.projectId))) return res.status(400).json({ error: 'Unknown project.' }); set('project_id', b.projectId || null); }
  if ('done' in b) { set('done', !!b.done); sets.push(b.done ? 'completed_at = now()' : 'completed_at = NULL'); }
  if (!sets.length) return res.status(400).json({ error: 'Nothing to update.' });

  vals.push(req.params.id, req.userId);
  const r = await q(
    `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${vals.length - 1} AND user_id = $${vals.length} RETURNING id`,
    vals
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Task not found.' });
  res.json(await getOne(req.userId, r.rows[0].id));
}));

router.delete('/:id', wrap(async (req, res) => {
  await q('DELETE FROM tasks WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
  res.status(204).end();
}));

// ---- Subtasks (each call returns the whole updated task) ----
router.post('/:id/subtasks', wrap(async (req, res) => {
  const title = String((req.body || {}).title || '').trim();
  if (!title) return res.status(400).json({ error: 'Enter a subtask.' });
  if (!(await getOne(req.userId, req.params.id))) return res.status(404).json({ error: 'Task not found.' });
  await q('INSERT INTO subtasks (task_id, title) VALUES ($1, $2)', [req.params.id, title]);
  res.status(201).json(await getOne(req.userId, req.params.id));
}));

router.patch('/subtasks/:id', wrap(async (req, res) => {
  const { done, title } = req.body || {};
  const r = await q(
    `UPDATE subtasks s SET done = COALESCE($1, s.done), title = COALESCE($2, s.title)
     FROM tasks t WHERE s.id = $3 AND s.task_id = t.id AND t.user_id = $4 RETURNING s.task_id`,
    [typeof done === 'boolean' ? done : null, title ? String(title).trim() : null, req.params.id, req.userId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Subtask not found.' });
  res.json(await getOne(req.userId, r.rows[0].task_id));
}));

router.delete('/subtasks/:id', wrap(async (req, res) => {
  const r = await q(
    `DELETE FROM subtasks s USING tasks t
     WHERE s.id = $1 AND s.task_id = t.id AND t.user_id = $2 RETURNING s.task_id`,
    [req.params.id, req.userId]
  );
  if (!r.rows[0]) return res.status(404).json({ error: 'Subtask not found.' });
  res.json(await getOne(req.userId, r.rows[0].task_id));
}));

export default router;

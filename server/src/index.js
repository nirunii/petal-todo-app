import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireAuth } from './middleware.js';
import auth from './routes/auth.js';
import projects from './routes/projects.js';
import tasks from './routes/tasks.js';
import notes from './routes/notes.js';
import stats from './routes/stats.js';

if (!process.env.JWT_SECRET || !process.env.DATABASE_URL) {
  console.error('Missing JWT_SECRET or DATABASE_URL. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', auth);
app.use('/api/projects', requireAuth, projects);
app.use('/api/tasks', requireAuth, tasks);
app.use('/api/notes', requireAuth, notes);
app.use('/api/stats', requireAuth, stats);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Try again.' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Petal API running on http://localhost:${port}`));

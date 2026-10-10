import 'dotenv/config';
import fs from 'node:fs';
import { pool } from './db.js';

const sql = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
await pool.query(sql);
console.log('Database tables are ready.');
await pool.end();

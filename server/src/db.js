import pg from 'pg';

// Return DATE columns as plain 'YYYY-MM-DD' strings so time zones never shift a due date.
pg.types.setTypeParser(1082, (v) => v);

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
export const q = (text, params) => pool.query(text, params);

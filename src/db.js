import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

export async function query(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function initSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      slug VARCHAR(100) UNIQUE NOT NULL,
      category VARCHAR(50) NOT NULL,
      image_url TEXT,
      published_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blog_post_translations (
      id SERIAL PRIMARY KEY,
      post_id INTEGER REFERENCES blog_posts(id) ON DELETE CASCADE,
      lang VARCHAR(5) NOT NULL,
      title TEXT NOT NULL,
      meta_title TEXT,
      meta_description TEXT,
      excerpt TEXT,
      content JSONB NOT NULL DEFAULT '[]',
      faq JSONB NOT NULL DEFAULT '[]',
      UNIQUE(post_id, lang)
    );
  `);
}

export default pool;

import express from 'express';
import cors from 'cors';
import { initSchema, query } from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/posts', async (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    const result = await query(
      `SELECT p.slug, p.category, p.image_url, p.published_at,
              t.title, t.excerpt, t.meta_title, t.meta_description
       FROM blog_posts p
       JOIN blog_post_translations t ON t.post_id = p.id AND t.lang = $1
       ORDER BY p.published_at DESC`,
      [lang]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/posts/:slug', async (req, res) => {
  try {
    const lang = req.query.lang || 'en';
    const result = await query(
      `SELECT p.slug, p.category, p.image_url, p.published_at,
              t.title, t.meta_title, t.meta_description, t.excerpt, t.content, t.faq
       FROM blog_posts p
       JOIN blog_post_translations t ON t.post_id = p.id AND t.lang = $1
       WHERE p.slug = $2`,
      [lang, req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function connectDb(retries = 10) {
  for (let i = 1; i <= retries; i++) {
    try {
      await initSchema();
      console.log('Database connected');
      return true;
    } catch (err) {
      console.warn(`DB connect attempt ${i}/${retries}: ${err.message}`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
  console.warn('No DATABASE_URL — API will return errors');
  return false;
}

async function start() {
  if (process.env.DATABASE_URL) await connectDb();
  app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`));
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});

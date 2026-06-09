import express from 'express';
import cors from 'cors';
import { initSchema, query, DB_HOSTS } from './db.js';
import { posts } from './posts-data.js';

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

function getStaticPost(slug, lang) {
  const post = posts.find((p) => p.slug === slug);
  if (!post) return null;
  const t = post.translations[lang] || post.translations.en;
  return {
    slug: post.slug,
    category: post.category,
    image_url: post.image_url,
    published_at: new Date().toISOString(),
    title: t.title,
    meta_title: t.meta_title,
    meta_description: t.meta_description,
    excerpt: t.excerpt,
    content: t.content,
    faq: t.faq,
  };
}

app.get('/api/posts/:slug', async (req, res) => {
  const lang = req.query.lang || 'en';
  try {
    const result = await query(
      `SELECT p.slug, p.category, p.image_url, p.published_at,
              t.title, t.meta_title, t.meta_description, t.excerpt, t.content, t.faq
       FROM blog_posts p
       JOIN blog_post_translations t ON t.post_id = p.id AND t.lang = $1
       WHERE p.slug = $2`,
      [lang, req.params.slug]
    );
    if (result.rows.length > 0) return res.json(result.rows[0]);
  } catch {
    // DB unavailable — serve static fallback
  }
  const staticPost = getStaticPost(req.params.slug, lang);
  if (!staticPost) return res.status(404).json({ error: 'Post not found' });
  res.json(staticPost);
});

async function connectDb() {
  const user = process.env.DB_USER || 'postgres';
  const pass = process.env.DB_PASSWORD || process.env.DATABASE_URL?.match(/:(.+?)@/)?.[1] || '';
  const db = process.env.DB_NAME || 'nodenscare';
  const hosts = process.env.DATABASE_URL
    ? [process.env.DATABASE_URL.match(/@([^:/]+)/)?.[1] || 'database']
    : DB_HOSTS;

  for (const host of hosts) {
    process.env.DATABASE_URL = `postgresql://${user}:${pass}@${host}:5432/${db}`;
    console.log(`Trying DB host: ${host}`);
    for (let i = 1; i <= 10; i++) {
      try {
        await initSchema();
        console.log(`Database connected via ${host}`);
        return true;
      } catch (err) {
        console.warn(`DB attempt ${i} (${host}): ${err.message}`);
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  console.warn('Database unavailable — API will return errors');
  return false;
}

async function start() {
  app.listen(PORT, '0.0.0.0', () => console.log(`API running on port ${PORT}`));
  if (process.env.DATABASE_URL || process.env.DB_PASSWORD) {
    connectDb().catch((err) => console.warn('Background DB connect failed:', err.message));
  }
}

start().catch((err) => {
  console.error('Startup failed:', err.message);
  process.exit(1);
});

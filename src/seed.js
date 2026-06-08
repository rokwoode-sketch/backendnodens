import { initSchema, query } from './db.js';
import { posts } from './posts-data.js';

async function seed() {
  if (!process.env.DATABASE_URL) {
    console.log('No DATABASE_URL — skipping seed');
    process.exit(0);
  }

  await initSchema();

  for (const post of posts) {
    const existing = await query('SELECT id FROM blog_posts WHERE slug = $1', [post.slug]);
    let postId;

    if (existing.rows.length === 0) {
      const inserted = await query(
        'INSERT INTO blog_posts (slug, category, image_url) VALUES ($1, $2, $3) RETURNING id',
        [post.slug, post.category, post.image_url]
      );
      postId = inserted.rows[0].id;
      console.log(`Created post: ${post.slug}`);
    } else {
      postId = existing.rows[0].id;
      await query(
        'UPDATE blog_posts SET category = $1, image_url = $2 WHERE id = $3',
        [post.category, post.image_url, postId]
      );
      console.log(`Updated post: ${post.slug}`);
    }

    for (const [lang, t] of Object.entries(post.translations)) {
      await query(
        `INSERT INTO blog_post_translations
          (post_id, lang, title, meta_title, meta_description, excerpt, content, faq)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (post_id, lang) DO UPDATE SET
          title = EXCLUDED.title,
          meta_title = EXCLUDED.meta_title,
          meta_description = EXCLUDED.meta_description,
          excerpt = EXCLUDED.excerpt,
          content = EXCLUDED.content,
          faq = EXCLUDED.faq`,
        [postId, lang, t.title, t.meta_title, t.meta_description, t.excerpt,
         JSON.stringify(t.content), JSON.stringify(t.faq)]
      );
    }
  }

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});

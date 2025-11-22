const express = require('express');
const db = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { logActivity } = require('../utils/activities');

const router = express.Router();

router.post('/', authRequired, async (req, res) => {
  const { content } = req.body;
  if (!content) {
    return res.status(400).json({ message: 'content is required' });
  }
  try {
    const result = await db.query(
      `INSERT INTO posts (user_id, content) VALUES ($1, $2)
       RETURNING id, user_id, content, created_at`,
      [req.user.id, content]
    );
    const post = result.rows[0];

    await logActivity({
      actorId: req.user.id,
      type: 'POST_CREATED',
      postId: post.id,
      description: `${req.user.display_name} made a post`,
    });

    return res.status(201).json(post);
  } catch (err) {
    console.error('Create post error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/', authRequired, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.user_id, u.display_name, p.content, p.created_at
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.deleted = FALSE
         AND NOT EXISTS (
           SELECT 1 FROM blocks b
           WHERE (b.blocker_id = $1 AND b.blocked_id = p.user_id)
              OR (b.blocker_id = p.user_id AND b.blocked_id = $1)
         )
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('List posts error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id', authRequired, async (req, res) => {
  const postId = Number(req.params.id);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid post id' });
  }
  try {
    const result = await db.query('SELECT id, user_id, deleted FROM posts WHERE id = $1', [postId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const post = result.rows[0];
    if (post.deleted) {
      return res.status(400).json({ message: 'Post already deleted' });
    }

    let deleterRole = 'USER';
    if (req.user.role === 'ADMIN') deleterRole = 'ADMIN';
    if (req.user.role === 'OWNER') deleterRole = 'OWNER';

    if (post.user_id !== req.user.id && req.user.role === 'USER') {
      return res.status(403).json({ message: 'Only owner of post or admin/owner can delete' });
    }

    await db.query(
      `UPDATE posts SET deleted = TRUE, deleted_by = $2, deleted_at = NOW() WHERE id = $1`,
      [postId, deleterRole]
    );

    await logActivity({
      actorId: req.user.id,
      type: 'POST_DELETED',
      postId,
      description:
        deleterRole === 'USER'
          ? `${req.user.display_name} deleted their post`
          : `Post deleted by '${deleterRole}'`,
    });

    return res.json({ message: 'Post deleted' });
  } catch (err) {
    console.error('Delete post error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/:id/like', authRequired, async (req, res) => {
  const postId = Number(req.params.id);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid post id' });
  }
  try {
    await db.query('INSERT INTO likes (user_id, post_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      req.user.id,
      postId,
    ]);

    await logActivity({
      actorId: req.user.id,
      type: 'LIKED_POST',
      postId,
      description: `${req.user.display_name} liked a post`,
    });

    return res.status(201).json({ message: 'Post liked' });
  } catch (err) {
    console.error('Like post error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/:id/like', authRequired, async (req, res) => {
  const postId = Number(req.params.id);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid post id' });
  }
  try {
    await db.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [req.user.id, postId]);
    return res.json({ message: 'Like removed' });
  } catch (err) {
    console.error('Unlike post error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

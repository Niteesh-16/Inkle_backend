const express = require('express');
const db = require('../config/db');
const { authRequired, requireRole } = require('../middleware/auth');
const { logActivity } = require('../utils/activities');

const router = express.Router();

// Promote user to ADMIN (OWNER only)
router.post('/admins/:id', authRequired, requireRole('OWNER'), async (req, res) => {
  const userId = Number(req.params.id);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  try {
    await db.query('UPDATE users SET role = \'ADMIN\' WHERE id = $1', [userId]);
    return res.json({ message: 'User promoted to admin' });
  } catch (err) {
    console.error('Promote admin error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Demote admin back to USER (OWNER only)
router.delete('/admins/:id', authRequired, requireRole('OWNER'), async (req, res) => {
  const userId = Number(req.params.id);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  try {
    await db.query('UPDATE users SET role = \'USER\' WHERE id = $1 AND role = \'ADMIN\'', [userId]);
    return res.json({ message: 'Admin demoted to user' });
  } catch (err) {
    console.error('Demote admin error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete user (ADMIN or OWNER)
router.delete('/users/:id', authRequired, requireRole(['ADMIN', 'OWNER']), async (req, res) => {
  const userId = Number(req.params.id);
  if (Number.isNaN(userId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  try {
    const who = req.user.role === 'OWNER' ? 'Owner' : 'Admin';

    // Log activity first while the target user row still exists
    await logActivity({
      actorId: req.user.id,
      type: 'USER_DELETED',
      targetUserId: userId,
      description: `User deleted by '${who}'`,
    });

    // Then delete the user
    await db.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('Delete user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete any post (ADMIN or OWNER)
router.delete('/posts/:id', authRequired, requireRole(['ADMIN', 'OWNER']), async (req, res) => {
  const postId = Number(req.params.id);
  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid post id' });
  }
  try {
    await db.query('UPDATE posts SET deleted = TRUE, deleted_by = $2, deleted_at = NOW() WHERE id = $1', [
      postId,
      req.user.role,
    ]);

    await logActivity({
      actorId: req.user.id,
      type: 'POST_DELETED',
      postId,
      description: `Post deleted by '${req.user.role}'`,
    });

    return res.json({ message: 'Post deleted by admin/owner' });
  } catch (err) {
    console.error('Admin delete post error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Delete a like (ADMIN or OWNER)
router.delete('/likes/:userId/:postId', authRequired, requireRole(['ADMIN', 'OWNER']), async (req, res) => {
  const userId = Number(req.params.userId);
  const postId = Number(req.params.postId);
  if (Number.isNaN(userId) || Number.isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid ids' });
  }
  try {
    await db.query('DELETE FROM likes WHERE user_id = $1 AND post_id = $2', [userId, postId]);
    return res.json({ message: 'Like deleted by admin/owner' });
  } catch (err) {
    console.error('Admin delete like error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

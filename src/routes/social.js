const express = require('express');
const db = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { logActivity } = require('../utils/activities');

const router = express.Router();

router.post('/follow/:id', authRequired, async (req, res) => {
  const targetId = Number(req.params.id);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'Cannot follow yourself' });
  }
  try {
    await db.query(
      'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, targetId]
    );

    const targetUser = await db.query('SELECT display_name FROM users WHERE id = $1', [targetId]);
    const targetName = targetUser.rows[0]?.display_name || 'a user';

    await logActivity({
      actorId: req.user.id,
      type: 'FOLLOWED',
      targetUserId: targetId,
      description: `${req.user.display_name} followed ${targetName}`,
    });

    return res.status(201).json({ message: 'Now following user' });
  } catch (err) {
    console.error('Follow user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/follow/:id', authRequired, async (req, res) => {
  const targetId = Number(req.params.id);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  try {
    await db.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [
      req.user.id,
      targetId,
    ]);
    return res.json({ message: 'Unfollowed user' });
  } catch (err) {
    console.error('Unfollow user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/block/:id', authRequired, async (req, res) => {
  const targetId = Number(req.params.id);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  if (targetId === req.user.id) {
    return res.status(400).json({ message: 'Cannot block yourself' });
  }
  try {
    await db.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, targetId]
    );
    return res.status(201).json({ message: 'User blocked' });
  } catch (err) {
    console.error('Block user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.delete('/block/:id', authRequired, async (req, res) => {
  const targetId = Number(req.params.id);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  try {
    await db.query('DELETE FROM blocks WHERE blocker_id = $1 AND blocked_id = $2', [
      req.user.id,
      targetId,
    ]);
    return res.json({ message: 'User unblocked' });
  } catch (err) {
    console.error('Unblock user error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

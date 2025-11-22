const express = require('express');
const db = require('../config/db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

// Global activity wall
router.get('/', authRequired, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id,
              a.type,
              a.description,
              a.created_at,
              actor.id       AS actor_id,
              actor.display_name AS actor_name,
              a.target_user_id,
              target.display_name AS target_name,
              a.post_id
       FROM activities a
       JOIN users actor ON actor.id = a.actor_id
       LEFT JOIN users target ON target.id = a.target_user_id
       ORDER BY a.created_at DESC
       LIMIT 100`
    );

    return res.json(result.rows);
  } catch (err) {
    console.error('List activities error', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;

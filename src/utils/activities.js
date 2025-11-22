const db = require('../config/db');

async function logActivity({ actorId, type, targetUserId = null, postId = null, description }) {
  await db.query(
    `INSERT INTO activities (actor_id, type, target_user_id, post_id, description)
     VALUES ($1, $2, $3, $4, $5)`,
    [actorId, type, targetUserId, postId, description]
  );
}

module.exports = { logActivity };

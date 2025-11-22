const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const socialRoutes = require('./routes/social');
const adminRoutes = require('./routes/admin');
const activitiesRoutes = require('./routes/activities');

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);
app.use('/social', socialRoutes); // follows, blocks
app.use('/admin', adminRoutes);
app.use('/activities', activitiesRoutes);

module.exports = app;

const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { authenticate, validateObjectId, register, login, checkUsername } = require('./auth');
require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const { Blog, Comment } = require('./db');

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

/* authorization */
app.post('/auth/register', register);
app.post('/auth/login', login);
app.post('/auth/check-username', checkUsername);

/* posts CRUD */
app.post('/posts', authenticate, async (req, res, next) => {
  const { title, body } = req.body;
  try {
    if (!title || !body) throw Object.assign(new Error('Title and body are required'), { status: 400 });
    const post = new Blog({ title, body, author: req.user.userId });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

app.get('/posts', async (req, res, next) => {
  try {
    const posts = await Blog.find().populate('author', 'username');
    res.json(posts);
  } catch (err) {
    next(err);
  }
});

app.get('/posts/user', authenticate, async (req, res, next) => {
  try {
    const posts = await Blog.find({ author: req.user.userId }).populate('author', 'username');
    res.json(posts || []);
  } catch (err) {
    next(err);
  }
});

app.get('/posts/:id', validateObjectId('id'), async (req, res, next) => {
  try {
    const post = await Blog.findById(req.params.id).populate('author', 'username');
    if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

app.put('/posts/:id', [authenticate, validateObjectId('id')], async (req, res, next) => {
  const { title, body } = req.body;
  try {
    if (!title || !body) throw Object.assign(new Error('Title and body are required'), { status: 400 });
    const post = await Blog.findOneAndUpdate(
      { _id: req.params.id, author: req.user.userId },
      { title, body },
      { new: true }
    );
    if (!post) throw Object.assign(new Error('Not authorized or post not found'), { status: 403 });
    res.json(post);
  } catch (err) {
    next(err);
  }
});

app.delete('/posts/:id', [authenticate, validateObjectId('id')], async (req, res, next) => {
  try {
    await Comment.deleteMany({ postId: req.params.id });
    const post = await Blog.findOneAndDelete({ _id: req.params.id, author: req.user.userId });
    if (!post) throw Object.assign(new Error('Not authorized or post not found'), { status: 403 });
    res.json({ message: 'Post and associated comments deleted' });
  } catch (err) {
    next(err);
  }
});

/* comments CRUD */
app.post('/posts/:id/comments', [authenticate, validateObjectId('id')], async (req, res, next) => {
  const { text } = req.body;
  try {
    if (!text) throw Object.assign(new Error('Comment text is required'), { status: 400 });
    const post = await Blog.findById(req.params.id);
    if (!post) throw Object.assign(new Error('Post not found'), { status: 404 });
    const comment = new Comment({ postId: req.params.id, author: req.user.userId, text });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

app.get('/posts/:id/comments', validateObjectId('id'), async (req, res, next) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).populate('author', 'username');
    res.json(comments);
  } catch (err) {
    next(err);
  }
});


/* global error handler */
app.use((err, req, res, next) => {
  console.error('Global error:', err.message);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
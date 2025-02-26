const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'default_secret';
const dbURL = process.env.dbURL;

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Error connecting to DB:', err));

/* schemas */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema, 'users');

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
const Blog = mongoose.model('Blog', blogSchema, 'blogs');

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true }
}, { timestamps: true });
const Comment = mongoose.model('Comment', commentSchema, 'comments');


const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({ error: `Invalid ${paramName} ID` });
  }
  req.params[paramName] = new mongoose.Types.ObjectId(req.params[paramName]);
  next();
};

/* authentication */
const authenticate = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'Access denied: No token provided' });
  try {
    const verified = jwt.verify(token.split(' ')[1], SECRET_KEY);
    if (!verified.userId) throw new Error('Token missing userId');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Invalid token: ' + err.message });
  }
};

/* Error handler */
const errorHandler = (res, err, message) => {
  console.error(`${message}:`, err.message);
  res.status(500).json({ error: `${message}: ${err.message}` });
};

/* paths */
app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: 'Error registering user: ' + err.message });
  }
});

app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, userId: user._id });
  } catch (err) {
    errorHandler(res, err, 'Error during login');
  }
});

app.post('/auth/check-username', async (req, res) => {
  const { username } = req.body;
  try {
    const user = await User.findOne({ username });
    res.json({ exists: !!user });
  } catch (err) {
    errorHandler(res, err, 'Error checking username');
  }
});

app.post('/posts', authenticate, async (req, res) => {
  const { title, body } = req.body;
  try {
    const post = new Blog({ title, body, author: req.user.userId });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    errorHandler(res, err, 'Error creating post');
  }
});

app.get('/posts', async (req, res) => {
  try {
    const posts = await Blog.find().populate('author', 'username');
    res.json(posts);
  } catch (err) {
    errorHandler(res, err, 'Error retrieving posts');
  }
});

app.get('/posts/user', authenticate, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.userId)) {
      return res.status(400).json({ error: 'Invalid userId in token' });
    }
    const userId = new mongoose.Types.ObjectId(req.user.userId);
    const posts = await Blog.find({ author: userId }).populate('author', 'username');
    res.json(posts || []);
  } catch (err) {
    errorHandler(res, err, 'Error retrieving user posts');
  }
});

app.get('/posts/:id', validateObjectId('id'), async (req, res) => {
  try {
    const post = await Blog.findById(req.params.id).populate('author', 'username');
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    errorHandler(res, err, 'Error retrieving post');
  }
});

app.put('/posts/:id', [authenticate, validateObjectId('id')], async (req, res) => {
  const { title, body } = req.body;
  try {
    const post = await Blog.findOneAndUpdate(
      { _id: req.params.id, author: req.user.userId },
      { title, body },
      { new: true }
    );
    if (!post) return res.status(403).json({ error: 'Not authorized' });
    res.json(post);
  } catch (err) {
    errorHandler(res, err, 'Error updating post');
  }
});

app.delete('/posts/:id', [authenticate, validateObjectId('id')], async (req, res) => {
  try {
    await Comment.deleteMany({ postId: req.params.id });
    const post = await Blog.findOneAndDelete({ _id: req.params.id, author: req.user.userId });
    if (!post) return res.status(403).json({ error: 'Not authorized' });
    res.json({ message: 'Post and associated comments deleted' });
  } catch (err) {
    errorHandler(res, err, 'Error deleting post');
  }
});

app.post('/posts/:id/comments', [authenticate, validateObjectId('id')], async (req, res) => {
  const { text } = req.body;
  try {
    const post = await Blog.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = new Comment({ postId: req.params.id, author: req.user.userId, text });
    await comment.save();
    res.status(201).json(comment);
  } catch (err) {
    errorHandler(res, err, 'Error adding comment');
  }
});

app.get('/posts/:id/comments', validateObjectId('id'), async (req, res) => {
  try {
    const comments = await Comment.find({ postId: req.params.id }).populate('author', 'username');
    res.json(comments);
  } catch (err) {
    errorHandler(res, err, 'Error retrieving comments');
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
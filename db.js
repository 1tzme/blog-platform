const mongoose = require('mongoose');
require('dotenv').config();

const dbURL = process.env.dbURL;

/* connection to db */
mongoose.connect(dbURL, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Error connecting to DB:', err));

/* schemas */
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const blogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Blog', required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true }
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', userSchema, 'users'),
  Blog: mongoose.model('Blog', blogSchema, 'blogs'),
  Comment: mongoose.model('Comment', commentSchema, 'comments')
};
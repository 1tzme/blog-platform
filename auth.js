const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const { User } = require('./db');
require('dotenv').config();

const SECRET_KEY = process.env.SECRET_KEY || 'default_secret';

const validateObjectId = (paramName) => (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
    return res.status(400).json({ error: `Invalid ${paramName} ID` });
  }
  req.params[paramName] = new mongoose.Types.ObjectId(req.params[paramName]);
  next();
};

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

const register = async (req, res, next) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) throw Object.assign(new Error('Username and password are required'), { status: 400 });
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  const { username, password } = req.body;
  try {
    if (!username || !password) throw Object.assign(new Error('Username and password are required'), { status: 400 });
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }
    const token = jwt.sign({ userId: user._id }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ token, userId: user._id });
  } catch (err) {
    next(err);
  }
};

const checkUsername = async (req, res, next) => {
  const { username } = req.body;
  try {
    if (!username) throw Object.assign(new Error('Username is required'), { status: 400 });
    const user = await User.findOne({ username });
    res.json({ exists: !!user });
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate, validateObjectId, register, login, checkUsername };
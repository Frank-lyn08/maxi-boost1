const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Connect to MongoDB Atlas
mongoose.connect("mongodb+srv://franklyn:8653@maxiboost.pgefvxo.mongodb.net/maxiboostDB?retryWrites=true&w=majority&appName=maxiboost", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));



// Define User schema
const userSchema = new mongoose.Schema({
  fullname: String,
  username: { type: String, unique: true },
  password: String,
  salt: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);


// Simple in-memory session (temporary)
const sessions = new Map();

function hashPassword(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

// 🟢 REGISTER
app.post('/register', async (req, res) => {
  const { fullname, username, password } = req.body;

  if (!fullname || !username || !password) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const existingUser = await User.findOne({ username: username.toLowerCase() });
  if (existingUser) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hashed = hashPassword(password, salt);

  const newUser = new User({
    fullname,
    username: username.toLowerCase(),
    password: hashed,
    salt
  });

  try {
    await newUser.save();
    res.json({ message: 'Registration successful' });
  } catch (err) {
    console.error('❌ Error saving user:', err);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// 🟣 LOGIN
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  const user = await User.findOne({ username: username.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const hashed = hashPassword(password, user.salt);
  if (hashed !== user.password) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const sessionId = crypto.randomBytes(24).toString('hex');
  sessions.set(sessionId, { username: user.username, name: user.fullname });

  res.setHeader('Set-Cookie', `session=${sessionId}; HttpOnly; Max-Age=${60 * 60}; Path=/`);
  res.json({ message: 'Login successful' });
});

// 🟡 GET /me (check session)
app.get('/me', (req, res) => {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([a-f0-9]+)/);
  if (!match) return res.status(401).json({ error: 'Not logged in' });

  const sessionId = match[1];
  const s = sessions.get(sessionId);
  if (!s) return res.status(401).json({ error: 'Not logged in' });

  return res.json({ username: s.username, name: s.name });
});

// 🔴 LOGOUT
app.post('/logout', (req, res) => {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/session=([a-f0-9]+)/);
  if (match) {
    sessions.delete(match[1]);
  }
  res.setHeader('Set-Cookie', 'session=; HttpOnly; Max-Age=0; Path=/');
  return res.json({ message: 'Logged out' });
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

module.exports = app;












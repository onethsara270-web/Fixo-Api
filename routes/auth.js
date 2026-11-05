const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const router = express.Router();

// ── Google ────────────────────────────────────────
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login?error=google_failed' }),
  (req, res) => res.redirect('/dashboard')
);

// ── Local register ────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 8) {
      return res.redirect('/register?error=invalid_input');
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.redirect('/register?error=email_taken');

    const hashed = await bcrypt.hash(password, 12);
    const isAdmin = (process.env.ADMIN_EMAILS || '')
      .split(',').map(e => e.trim()).includes(email.toLowerCase());

    await User.create({
      email: email.toLowerCase(),
      password: hashed,
      name: name || email.split('@')[0],
      role: isAdmin ? 'admin' : 'user'
    });

    res.redirect('/login?success=registered');
  } catch (err) {
    console.error(err);
    res.redirect('/register?error=server');
  }
});

// ── Local login ───────────────────────────────────
router.post('/login',
  passport.authenticate('local', {
    failureRedirect: '/login?error=invalid_credentials'
  }),
  (req, res) => {
    const redirect = req.body.redirect || '/dashboard';
    res.redirect(redirect.startsWith('/') ? redirect : '/dashboard');
  }
);

// ── Logout ────────────────────────────────────────
router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    res.redirect('/');
  });
});

// ── Current user (for client-side checks) ────────
router.get('/me', (req, res) => {
  if (!req.isAuthenticated()) return res.json({ user: null });
  res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
      role: req.user.role
    }
  });
});

module.exports = router;
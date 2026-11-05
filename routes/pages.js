const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ApiKey = require('../models/ApiKey');
const apis = require('../data/apis');

// ── Landing ───────────────────────────────────────
router.get('/', (req, res) => {
  res.render('index', { apis });
});

// ── Auth pages (redirect if already logged in) ────
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('login');
});

router.get('/register', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('register');
});

// ── Docs (public) ─────────────────────────────────
router.get('/docs', (req, res) => {
  res.render('docs', { apis });
});

router.get('/docs/:slug', (req, res) => {
  const api = apis.find(a => a.slug === req.params.slug);
  if (!api) return res.status(404).render('404');
  res.render('api-detail', { api });
});

// ── Dashboard (auth) ──────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  const keys = await ApiKey.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.render('dashboard', { keys, apis });
});

module.exports = router;
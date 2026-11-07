const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ApiKey = require('../models/ApiKey');
const User = require('../models/User');
const apis = require('../data/apis');

// ── Landing ───────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    // 1. Live APIs ගාණ
    const liveApis = apis.filter(a => a.status === 'live').length;
    
    // 2. ඇත්තම Users ගාණ
    const totalUsers = await User.countDocuments();
    
    // 3. මුළු API Requests ගාණ (හැම key එකකම requestCount එකතු කරලා)
    const keys = await ApiKey.find();
    const totalRequests = keys.reduce((sum, k) => sum + (k.requestCount || 0), 0);

    const stats = {
      endpoints: liveApis,
      users: totalUsers > 0 ? totalUsers : 1, // අඩුම තරමේ 1 වත් පෙන්නන්න
      requests: totalRequests,
      uptime: "99.9"
    };

    res.render('index', { apis, stats });
  } catch (err) {
    console.error(err);
    res.render('index', { apis, stats: { endpoints: 4, users: 1, requests: 0, uptime: "99.9" } });
  }
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

// ── Guide ─────────────────────────────────────────
router.get('/guide', (req, res) => {
  res.render('guide');
});

// ── Dashboard (auth) ──────────────────────────────
router.get('/dashboard', requireAuth, async (req, res) => {
  const keys = await ApiKey.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.render('dashboard', { keys, apis });
});

module.exports = router;

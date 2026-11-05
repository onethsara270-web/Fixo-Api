const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const User = require('../models/User');
const ApiKey = require('../models/ApiKey');

// hidden route — returns 404 to non-admins
router.use(requireAdmin);

router.get('/', async (req, res) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  const keys = await ApiKey.find().populate('owner', 'email name').sort({ createdAt: -1 }).lean();

  const stats = {
    totalUsers: users.length,
    totalKeys: keys.length,
    activeKeys: keys.filter(k => k.active).length,
    totalRequests: keys.reduce((sum, k) => sum + (k.requestCount || 0), 0)
  };

  res.render('admin', { users, keys, stats });
});

router.post('/keys/:id/revoke', async (req, res) => {
  await ApiKey.findByIdAndUpdate(req.params.id, { active: false });
  res.redirect('/admin');
});

router.post('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.redirect('/admin');
  await User.findByIdAndUpdate(req.params.id, { role });
  res.redirect('/admin');
});

module.exports = router;
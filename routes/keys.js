const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const ApiKey = require('../models/ApiKey');

// List own keys
router.get('/', requireAuth, async (req, res) => {
  const keys = await ApiKey.find({ owner: req.user._id }).sort({ createdAt: -1 });
  res.json(keys);
});

// Create new key
router.post('/', requireAuth, async (req, res) => {
  const label = (req.body.label || 'Default').slice(0, 40);
  const key = await ApiKey.create({
    key: ApiKey.generate(),
    owner: req.user._id,
    label
  });
  res.json({ success: true, key });
});

// Revoke key
router.delete('/:id', requireAuth, async (req, res) => {
  const key = await ApiKey.findOne({ _id: req.params.id, owner: req.user._id });
  if (!key) return res.status(404).json({ error: 'Not found' });
  key.active = false;
  await key.save();
  res.json({ success: true });
});

module.exports = router;
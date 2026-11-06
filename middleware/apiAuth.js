const ApiKey = require('../models/ApiKey');

exports.requireApiKey = async (req, res, next) => {
  try {
    // Key එක Header එකෙන් හෝ URL එකෙන් ගන්නවා
    const key = req.headers['x-api-key'] || req.query.api_key;

    if (!key) {
      return res.status(401).json({ error: 'API key missing. Add X-API-KEY header or api_key parameter.' });
    }

    const validKey = await ApiKey.findOne({ key, active: true });
    
    if (!validKey) {
      return res.status(403).json({ error: 'Invalid or revoked API key.' });
    }

    // Key එක පාවිච්චි කරපු ගාණ ගණන් කරනවා
    validKey.requestCount += 1;
    validKey.lastUsed = Date.now();
    await validKey.save();

    // User ව කොන්ටෙක්ස්ට් එකට දානවා
    req.apiKeyOwner = validKey.owner;
    
    next();
  } catch (err) {
    console.error('API Auth Error:', err);
    res.status(500).json({ error: 'Server error during API key authentication.' });
  }
};

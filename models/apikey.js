const mongoose = require('mongoose');
const crypto = require('crypto');

const apiKeySchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  label: { type: String, default: 'Default' },
  active: { type: Boolean, default: true },
  requestCount: { type: Number, default: 0 },
  lastUsed: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

apiKeySchema.statics.generate = function () {
  return 'sk_' + crypto.randomBytes(24).toString('hex');
};

module.exports = mongoose.model('ApiKey', apiKeySchema);
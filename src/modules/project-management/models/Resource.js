const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  type: { type: String, enum: ['image', 'document'], required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  exists: { type: Boolean, default: false },
  lastChecked: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'resources'
});

module.exports = mongoose.model('Resource', resourceSchema);

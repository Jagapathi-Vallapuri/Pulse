const mongoose = require('mongoose');

const songSchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  gridfsId: { type: mongoose.Schema.Types.ObjectId, required: true },
  title: { type: String },
  coverFilename: { type: String },
  coverMimeType: { type: String },
  coverGridfsId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' } });

module.exports = mongoose.model('Song', songSchema);

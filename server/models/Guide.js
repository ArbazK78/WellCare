const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
  name: String,
  email: String,
  approved: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Guide', guideSchema);


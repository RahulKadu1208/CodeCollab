const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    default: '# Write your Python code here\nprint("Hello, CodeTogether!")\n'
  },
  language: {
    type: String,
    default: 'python'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Auto delete after 7 days of inactivity
RoomSchema.index({ lastActive: 1 }, { expireAfterSeconds: 604800 });

module.exports = mongoose.model('Room', RoomSchema);

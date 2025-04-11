const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const { v4: uuidv4 } = require('uuid');

// Create a new room
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const roomId = uuidv4();
    const newRoom = new Room({ 
      roomId,
      name: name.trim()
    });
    
    await newRoom.save();
    res.status(201).json({ 
      roomId: newRoom.roomId,
      name: newRoom.name
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Error creating room' });
  }
});

// Check if room exists and get room data
router.get('/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });
    
    if (!room) {
      return res.status(404).json({ exists: false });
    }
    
    // Update lastActive timestamp
    room.lastActive = new Date();
    await room.save();
    
    res.status(200).json({ 
      exists: true, 
      room: {
        roomId: room.roomId,
        name: room.name,
        code: room.code,
        language: room.language,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Error checking room:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get room messages
router.get('/:roomId/messages', async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ roomId })
      .sort({ timestamp: 1 })
      .limit(100);
    
    res.status(200).json(messages);
  } catch (error) {
    console.error('Error getting room messages:', error);
    res.status(500).json({ message: 'Error getting messages' });
  }
});

module.exports = router;

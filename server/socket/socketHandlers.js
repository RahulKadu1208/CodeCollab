
const { createClient } = require('redis');
const Room = require('../models/Room');
const Message = require('../models/Message');

let redisClient;

// Initialize Redis client
(async () => {
  redisClient = createClient({
    url: process.env.REDIS_URI || 'redis://localhost:6379'
  });

  redisClient.on('error', (err) => {
    console.error('Redis error:', err);
  });

  await redisClient.connect().catch(err => {
    console.error('Redis connection error:', err);
  });

  console.log('Connected to Redis');
})();

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join a room
    socket.on('join_room', async ({ roomId, user }) => {
      try {
        // Join the socket room
        socket.join(roomId);
        
        // Store user in Redis for the room
        await redisClient.hSet(`room:${roomId}:users`, socket.id, JSON.stringify(user));
        
        // Get all users in room
        const roomUsersData = await redisClient.hGetAll(`room:${roomId}:users`);
        const roomUsers = Object.values(roomUsersData).map(userData => JSON.parse(userData));
        
        // Update room's lastActive timestamp in MongoDB
        await Room.findOneAndUpdate(
          { roomId },
          { $set: { lastActive: new Date() } }
        );
        
        // Broadcast user joined event
        io.to(roomId).emit('user_joined', { user, users: roomUsers });
        
        // Load messages from MongoDB and send to the new user
        const messages = await Message.find({ roomId }).sort({ timestamp: 1 });
        socket.emit('chat_history', messages);
        
        // Load current code from MongoDB
        const room = await Room.findOne({ roomId });
        if (room) {
          socket.emit('code_update', { 
            code: room.code,
            language: room.language
          });
        }
      } catch (error) {
        console.error('Error in join_room:', error);
      }
    });
    
    // Handle chat messages
    socket.on('send_message', async ({ roomId, message }) => {
      try {
        // Save message to MongoDB
        const newMessage = new Message({
          roomId,
          senderId: message.senderId,
          senderName: message.senderName,
          text: message.text,
          timestamp: new Date(message.timestamp)
        });
        
        await newMessage.save();
        
        // Broadcast message to room
        io.to(roomId).emit('receive_message', message);
      } catch (error) {
        console.error('Error in send_message:', error);
      }
    });
    
    // Handle code updates
    socket.on('code_change', async ({ roomId, code, language }) => {
      try {
        // Save code state to MongoDB
        await Room.findOneAndUpdate(
          { roomId },
          { 
            $set: { 
              code,
              language,
              lastActive: new Date()
            }
          }
        );
        
        // Broadcast code change to everyone except sender
        socket.to(roomId).emit('code_update', { code, language });
      } catch (error) {
        console.error('Error in code_change:', error);
      }
    });
    
    // Handle explicit leave room event
    socket.on('leave_room', async ({ roomId }) => {
      handleUserLeaving(socket, roomId);
    });
    
    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      // Find which rooms the user was in by checking Redis
      try {
        // Scan all keys that match the pattern room:*:users
        for await (const key of redisClient.scanIterator({ MATCH: 'room:*:users' })) {
          const roomId = key.split(':')[1]; // Extract roomId from key
          
          // Check if this user was in this room
          const exists = await redisClient.hExists(key, socket.id);
          if (exists) {
            await handleUserLeaving(socket, roomId);
          }
        }
      } catch (error) {
        console.error('Error handling disconnection:', error);
      }
    });
  });
  
  // Helper function to handle user leaving a room
  async function handleUserLeaving(socket, roomId) {
    try {
      // Get user data before removing
      const userData = await redisClient.hGet(`room:${roomId}:users`, socket.id);
      if (!userData) return;
      
      const user = JSON.parse(userData);
      
      // Remove user from Redis
      await redisClient.hDel(`room:${roomId}:users`, socket.id);
      
      // Leave the socket room
      socket.leave(roomId);
      
      // Get updated users list
      const roomUsersData = await redisClient.hGetAll(`room:${roomId}:users`);
      const roomUsers = Object.values(roomUsersData).map(userData => JSON.parse(userData));
      
      // Broadcast user left event
      io.to(roomId).emit('user_left', { userId: socket.id, user, users: roomUsers });
    } catch (error) {
      console.error('Error in handleUserLeaving:', error);
    }
  }
};

module.exports = { setupSocketHandlers };

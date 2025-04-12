const { Redis } = require('@upstash/redis');
const Room = require('../models/Room');
const Message = require('../models/Message');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Initialize Redis client
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Create a temporary directory for code execution
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

const setupSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Join a room
    socket.on('join_room', async ({ roomId, user }) => {
      try {
        // Join the socket room
        socket.join(roomId);
        
        // Store user in Redis for the room
        await redisClient.set(`room:${roomId}:users:${socket.id}`, JSON.stringify(user));
        
        // Get all users in room
        const keys = await redisClient.keys(`room:${roomId}:users:*`);
        const roomUsers = [];
        
        for (const key of keys) {
          const userData = await redisClient.get(key);
          if (userData) {
            try {
              const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
              roomUsers.push(parsedUser);
            } catch (parseError) {
              console.error('Error parsing user data:', parseError);
              continue;
            }
          }
        }
        
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
            code: room.code || '# Write your code here',
            language: room.language || 'javascript'
          });
        }
      } catch (error) {
        console.error('Error in join_room:', error);
      }
    });

    // WebRTC Signaling Handlers
    socket.on('offer', ({ roomId, offer, targetUserId }) => {
      socket.to(targetUserId).emit('offer', { offer, userId: socket.id });
    });

    socket.on('answer', ({ roomId, answer, targetUserId }) => {
      socket.to(targetUserId).emit('answer', { answer, userId: socket.id });
    });

    socket.on('ice_candidate', ({ roomId, candidate, targetUserId }) => {
      socket.to(targetUserId).emit('ice_candidate', { candidate, userId: socket.id });
    });
    
    // Handle code execution
    socket.on('execute_code', async ({ roomId, code, language }) => {
      try {
        // Create a temporary file
        const tempFile = path.join(tempDir, `temp_${Date.now()}.${language}`);
        fs.writeFileSync(tempFile, code);
        
        let command;
        switch (language) {
          case 'javascript':
            command = `node ${tempFile}`;
            break;
          case 'python':
            command = `python3 ${tempFile}`;
            break;
          case 'cpp':
            // Compile and run C++ code
            const executable = tempFile.replace('.cpp', '');
            command = `g++ ${tempFile} -o ${executable} && ${executable}`;
            break;
          default:
            throw new Error('Unsupported language');
        }
        
        // Execute the code
        exec(command, (error, stdout, stderr) => {
          // Clean up the temporary files
          fs.unlinkSync(tempFile);
          if (language === 'cpp') {
            const executable = tempFile.replace('.cpp', '');
            if (fs.existsSync(executable)) {
              fs.unlinkSync(executable);
            }
          }
          
          if (error) {
            socket.emit('execution_result', {
              success: false,
              output: error.message,
              error: stderr
            });
            return;
          }
          
          socket.emit('execution_result', {
            success: true,
            output: stdout,
            error: null
          });
        });
      } catch (error) {
        console.error('Error executing code:', error);
        socket.emit('execution_result', {
          success: false,
          output: null,
          error: error.message
        });
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
        // Validate code and language
        if (!code || typeof code !== 'string') {
          console.error('Invalid code format');
          return;
        }
        
        if (!language || typeof language !== 'string') {
          console.error('Invalid language format');
          return;
        }
        
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
        // Get all room keys
        const keys = await redisClient.keys(`room:*:users:${socket.id}`);
        
        for (const key of keys) {
          const roomId = key.split(':')[1]; // Extract roomId from key
          await handleUserLeaving(socket, roomId);
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
      const userData = await redisClient.get(`room:${roomId}:users:${socket.id}`);
      if (!userData) return;
      
      // Check if userData is already an object or needs parsing
      let user;
      try {
        user = typeof userData === 'string' ? JSON.parse(userData) : userData;
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        return;
      }
      
      // Remove user from Redis
      await redisClient.del(`room:${roomId}:users:${socket.id}`);
      
      // Leave the socket room
      socket.leave(roomId);
      
      // Get updated users list
      const keys = await redisClient.keys(`room:${roomId}:users:*`);
      const roomUsers = [];
      
      for (const key of keys) {
        const userData = await redisClient.get(key);
        if (userData) {
          try {
            const parsedUser = typeof userData === 'string' ? JSON.parse(userData) : userData;
            roomUsers.push(parsedUser);
          } catch (parseError) {
            console.error('Error parsing user data:', parseError);
            continue;
          }
        }
      }
      
      // Broadcast user left event
      io.to(roomId).emit('user_left', { user, users: roomUsers });
    } catch (error) {
      console.error('Error in handleUserLeaving:', error);
    }
  }
};

module.exports = { setupSocketHandlers };

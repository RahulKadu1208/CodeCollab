const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const { Redis } = require('@upstash/redis');
const config = require('./config');

// Initialize Redis
const redis = new Redis({
  url: config.REDIS.UPSTASH_REDIS_REST_URL,
  token: config.REDIS.UPSTASH_REDIS_REST_TOKEN,
});

// Import routes
const roomRoutes = require('./routes/roomRoutes');
const { setupSocketHandlers } = require('./socket/socketHandlers');

// Create Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, config.SOCKET.OPTIONS);

// Middleware
app.use(cors(config.CORS));
app.use(express.json());

// Handle OPTIONS requests
app.options('*', cors(config.CORS));

// API Routes
app.use('/api/rooms', roomRoutes);

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../dist')));

// Handle client-side routing
app.get('*', (req, res) => {
  // Don't handle API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  
  // Handle room routes
  if (req.path.startsWith('/room/')) {
    return res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
  
  // Handle join routes
  if (req.path.startsWith('/join/')) {
    return res.sendFile(path.join(__dirname, '../dist/index.html'));
  }
  
  // Serve index.html for all other routes
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Connect to MongoDB
mongoose.connect(config.MONGODB.URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize socket handlers
setupSocketHandlers(io);

// Handle unhandled errors
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

const PORT = config.SERVER.PORT;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

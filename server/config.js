// Server Configuration
module.exports = {
  // API Configuration
  API: {
    BASE_URL: 'https://code-collab-alpha.vercel.app',
    ENDPOINTS: {
      ROOMS: '/api/rooms',
    },
  },

  // Socket Configuration
  SOCKET: {
    URL: 'https://code-collab-alpha.vercel.app',
    OPTIONS: {
      cors: {
        origin: 'https://code-collab-alpha.vercel.app',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    },
  },

  // CORS Configuration
  CORS: {
    origin: 'https://code-collab-alpha.vercel.app',
    methods: ['GET', 'POST'],
    credentials: true,
  },

  // MongoDB Configuration
  MONGODB: {
    URI: 'mongodb+srv://RahulKadu:Mongo%401234@cluster0.yjn1oi1.mongodb.net/collab-code?retryWrites=true&w=majority&appName=Cluster0',
  },

  // Redis Configuration
  REDIS: {
    UPSTASH_REDIS_REST_URL: 'https://free-amoeba-17241.upstash.io',
    UPSTASH_REDIS_REST_TOKEN: 'AUNZAAIjcDE2ZWRjZGE1NWJhODc0YTFhYmFhNDAwNWY2ZGI0MDU2ZXAxMA',
  },

  // Server Configuration
  SERVER: {
    PORT: 5000,
  },
}; 
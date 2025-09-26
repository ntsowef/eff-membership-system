const { createServer } = require('http');
const { Server } = require('socket.io');

// Create a simple HTTP server
const httpServer = createServer();

// Create Socket.IO server
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Simple connection handler (no authentication)
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);
  
  // Mock user data for development
  socket.userId = 1;
  socket.userType = 'Admin';
  socket.userRole = 'super_admin';
  
  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to WebSocket (no auth)',
    userId: socket.userId,
    userType: socket.userType,
    timestamp: new Date().toISOString()
  });
  
  // Handle test events
  socket.on('test_message', (data) => {
    console.log('📨 Received test message:', data);
    socket.emit('test_response', {
      message: 'Test message received',
      originalData: data,
      timestamp: new Date().toISOString()
    });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// Start server
const PORT = 5001; // Different port to avoid conflicts
httpServer.listen(PORT, () => {
  console.log(`🚀 Test WebSocket server running on port ${PORT}`);
  console.log('🔓 Authentication disabled - all connections allowed');
  console.log('📡 Connect from frontend using: http://localhost:5001');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test WebSocket server...');
  httpServer.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

import { connectDB } from './config/mongodb.js';
import config from './src/config/env.js';
import app from './src/app.js';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Start server
    app.listen(config.server.port, () => {
      console.log(`🚀 Server started on port ${config.server.port}`);
      console.log(`📚 API available at http://localhost:${config.server.port}/api`);
      console.log(`🌍 Environment: ${config.server.env}`);
    });
  } catch (err) {
    console.error('❌ Error starting server:', err);
    process.exit(1);
  }
};

startServer();



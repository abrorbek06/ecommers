import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { validateEnv } from './config/env';
import { getLogger } from './logger';
import { setupSecurityMiddleware } from './middleware/security.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { bot } from './bot/bot';
import adminRouter from './routes/admin';
import publicRouter from './routes/public';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import { notificationService } from './services/notificationService';

// Validate environment variables
validateEnv();

const logger = getLogger();
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    credentials: true,
  },
});

// Initialize notification service with Socket.IO
notificationService.setSocketIO(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Admin dashboard connected');

  socket.on('join_admin', () => {
    socket.join('admins');
    logger.info({ socketId: socket.id }, 'Admin joined admin room');
  });

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Admin dashboard disconnected');
  });
});

// Apply security middleware
app.use(setupSecurityMiddleware());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve the static admin dashboard files
app.use('/admin', express.static(path.join(process.cwd(), 'public')));

// Register health check routes
app.use(healthRouter);

// Register admin API routes
app.use('/api/admin', adminRouter);

// Register public API routes for e-commerce
app.use('/api', publicRouter);

// Register auth API routes
app.use('/api/auth', authRouter);

// Image proxy endpoint to avoid CORS issues and hide bot token
app.get('/image/:fileId', async (req, res, next) => {
  try {
    const { fileId } = req.params;
    const botToken = process.env.BOT_TOKEN;

    if (!botToken) {
      return res.status(500).json({ error: 'Bot token not configured' });
    }

    // Get file info from Telegram
    const fileInfo = await bot.telegram.getFile(fileId);

    if (!fileInfo) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Construct the Telegram file URL
    const fileUrl = `https://api.telegram.org/file/bot${botToken}/${fileInfo.file_path}`;

    // Fetch the file from Telegram
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return res.status(404).json({ error: 'Failed to fetch file from Telegram' });
    }

    // Set appropriate headers
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    }

    // Cache the images for 1 hour
    res.setHeader('Cache-Control', 'public, max-age=3600');

    // Get the image buffer and send it
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (error) {
    logger.error({ error, fileId: req.params.fileId }, 'Error serving image');
    next(error);
  }
});

// Serve React application in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(process.cwd(), 'web/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'web/dist', 'index.html'));
  });
}

// Telegram webhook callback mapped to /blog/webhook/ (to match Django config in original)
const webhookPath = '/blog/webhook/';
app.post(webhookPath, (req, res, next) => {
  bot.webhookCallback(webhookPath)(req, res, next);
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
export { app, webhookPath, httpServer, io };

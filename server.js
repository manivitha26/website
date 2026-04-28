require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDb, closeDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for deployment behind reverse proxies
app.set('trust proxy', 1);

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(generalLimiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server after DB is ready
async function start() {
  try {
    await initDb();

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Server running at http://localhost:${PORT}`);
      console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`\n📝 API Endpoints:`);
      console.log(`   POST   /api/auth/signup`);
      console.log(`   POST   /api/auth/login`);
      console.log(`   POST   /api/auth/logout`);
      console.log(`   GET    /api/auth/me`);
      console.log(`   PUT    /api/auth/profile`);
      console.log(`   PUT    /api/auth/change-password`);
      console.log(`   GET    /api/posts`);
      console.log(`   POST   /api/posts`);
      console.log(`   GET    /api/posts/:id`);
      console.log(`   PUT    /api/posts/:id`);
      console.log(`   DELETE /api/posts/:id`);
      console.log(`   POST   /api/posts/:id/like`);
      console.log(`   POST   /api/posts/:id/comments`);
      console.log(`   DELETE /api/posts/:id/comments/:commentId`);
      console.log(`   GET    /api/health\n`);
    });

    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down gracefully...');
      closeDb();
      server.close(() => process.exit(0));
    });

    process.on('SIGTERM', () => {
      closeDb();
      server.close(() => process.exit(0));
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

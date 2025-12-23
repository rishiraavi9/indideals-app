import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env, validateEnv } from './config/env.js';
import passport from './config/passport.js';
import { sanitizeInputs } from './middleware/sanitize.js';

// Validate required environment variables at runtime
validateEnv();

// Routes
import authRoutes from './routes/auth.routes.js';
import dealsRoutes from './routes/deals.routes.js';
import categoriesRoutes from './routes/categories.routes.js';
import commentsRoutes from './routes/comments.routes.js';
import oauthRoutes from './routes/oauth.routes.js';
import scraperRoutes from './routes/scraper.routes.js';
import affiliateRoutes from './routes/affiliate.routes.js';
import searchRoutes from './routes/search.routes.js';
import passwordResetRoutes from './routes/password-reset.routes.js';
import gdprRoutes from './routes/gdpr.routes.js';
import alertsRoutes from './routes/alerts.routes.js';
import wishlistRoutes from './routes/wishlist.routes.js';
import priceHistoryRoutes from './routes/price-history.routes.js';
import couponsRoutes from './routes/coupons.routes.js';
import aiRoutes from './routes/ai.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';

// Job queue
import { bullBoardRouter, shutdownQueues } from './services/queue.service.js';
import { registerJobProcessors } from './jobs/index.js';

// Feature flags
import { logFeatureFlags, isFeatureEnabled } from './config/features.js';

const app = express();

// Trust proxy for Railway/load balancers (required for rate limiting and IP detection)
app.set('trust proxy', 1);

// Log feature flags on startup
logFeatureFlags();

// Initialize job processors (if Bull queues are enabled)
if (isFeatureEnabled('BULL_QUEUES')) {
  registerJobProcessors();
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));

// CORS Configuration
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5176',
  'http://localhost:5177',
  'https://precious-contentment-production.up.railway.app',
  'https://desidealsai.com',
  'https://www.desidealsai.com',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body Parsing with Size Limits
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Input Sanitization (prevents XSS)
app.use(sanitizeInputs);

app.use(cookieParser());
app.use(passport.initialize());

// Rate Limiting - Environment aware
const IS_PRODUCTION = env.NODE_ENV === 'production';
const ENABLE_RATE_LIMIT = IS_PRODUCTION || env.ENABLE_RATE_LIMIT === 'true';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 5000 : 10000, // Higher limits for shared IPs in India
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !ENABLE_RATE_LIMIT, // Skip if rate limiting is disabled
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per 15 minutes (protect against brute force)
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
  skip: () => !ENABLE_RATE_LIMIT,
});

// Health check (MUST be before HTTPS redirect for Railway probes)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// HTTPS Enforcement in Production (after health checks)
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// App config endpoint - exposes feature flags and config to frontend
app.get('/api/config', (req, res) => {
  // Import dynamically to get fresh values
  import('./config/features.js').then(({ features, appConfig }) => {
    res.json({
      features: {
        adsEnabled: true, // Frontend-specific flag
        imageStrategy: appConfig.imageStrategy,
        imageFallbackEnabled: features.IMAGE_FALLBACK,
        imageProxyEnabled: features.IMAGE_PROXY,
      },
    });
  });
});

// Bull Board (queue monitoring dashboard) - feature flag protected with basic auth
if (isFeatureEnabled('BULL_BOARD_DASHBOARD')) {
  // Basic HTTP Authentication middleware for admin dashboard
  const adminAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Check if admin password is configured
    if (!env.ADMIN_PASSWORD) {
      // In development without password, allow access with warning
      if (env.NODE_ENV !== 'production') {
        console.warn('⚠️  Admin dashboard accessible without authentication (ADMIN_PASSWORD not set)');
        return next();
      }
      // In production without password, deny access
      return res.status(503).json({ error: 'Admin dashboard not configured' });
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
      return res.status(401).send('Authentication required');
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    if (username === env.ADMIN_USERNAME && password === env.ADMIN_PASSWORD) {
      return next();
    }

    res.setHeader('WWW-Authenticate', 'Basic realm="Admin Dashboard"');
    return res.status(401).send('Invalid credentials');
  };

  app.use('/admin/queues', adminAuth, bullBoardRouter);
}

// Apply rate limiters
app.use('/api/', apiLimiter);

// Routes
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);
app.use('/api/auth', passwordResetRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api', commentsRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/affiliate', affiliateRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/alerts', alertsRoutes);

// Phase 1B routes (feature flag protected via middleware in route files)
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/coupons', couponsRoutes);

// Phase 2 routes - AI features
app.use('/api/ai', aiRoutes);

// Notifications
app.use('/api/notifications', notificationsRoutes);

// Image proxy endpoint (Option 3 - proxy-cache strategy)
app.get('/api/image-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    res.status(400).json({ error: 'Missing url parameter' });
    return;
  }

  try {
    const { proxyImage } = await import('./services/image-proxy.service.js');
    const result = await proxyImage(url);

    if (result) {
      res.setHeader('Content-Type', result.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
      res.send(result.buffer);
    } else {
      res.status(404).json({ error: 'Image not found' });
    }
  } catch (error) {
    console.error('Image proxy error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = env.PORT;
const HOST = '0.0.0.0'; // Bind to all interfaces (required for Railway/Docker)

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on http://${HOST}:${PORT}`);
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  console.log(`🌐 Frontend URL: ${env.FRONTEND_URL}`);

  if (isFeatureEnabled('BULL_BOARD_DASHBOARD')) {
    console.log(`📊 Queue Dashboard: http://localhost:${PORT}/admin/queues`);
  }
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('Received shutdown signal, closing server gracefully...');

  // Close HTTP server
  server.close(async () => {
    console.log('HTTP server closed');

    // Close job queues (if enabled)
    if (isFeatureEnabled('BULL_QUEUES')) {
      await shutdownQueues();
    }

    console.log('Shutdown complete');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

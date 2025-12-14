# Quick Security Fixes - Implementation Guide

This guide provides step-by-step instructions to fix the most critical security vulnerabilities identified in the security audit.

---

## 🔴 CRITICAL FIXES (Do These First!)

### Fix 1: Change JWT Secret

**Time:** 2 minutes

```bash
# Generate a strong secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Copy the output and update backend/.env
# Replace the JWT_SECRET line with:
JWT_SECRET=<paste-generated-secret-here>

# Restart the server
```

**Verify:**
```bash
# Check that the secret is at least 64 characters
grep JWT_SECRET backend/.env | wc -c
# Should be > 64
```

---

### Fix 2: Add Security Headers (Helmet)

**Time:** 5 minutes

```bash
cd backend
npm install helmet
```

Update `backend/src/index.ts`:

```typescript
import helmet from 'helmet';

// Add AFTER line 17 (after imports), BEFORE app.use(cors(...))
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
```

---

### Fix 3: Add Rate Limiting

**Time:** 10 minutes

```bash
cd backend
npm install express-rate-limit
```

Update `backend/src/index.ts`:

```typescript
import rateLimit from 'express-rate-limit';

// Add AFTER helmet, BEFORE routes

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many authentication attempts, please try again after 15 minutes.',
  skipSuccessfulRequests: true,
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
```

---

### Fix 4: Add Request Body Size Limits

**Time:** 2 minutes

Update `backend/src/index.ts` line 24-25:

**Before:**
```typescript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

**After:**
```typescript
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

---

### Fix 5: Secure Elasticsearch

**Time:** 5 minutes

**Option A: Enable Authentication (Recommended for Production)**

Update `backend/docker-compose.elasticsearch.yml`:

```yaml
elasticsearch:
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=true
    - ELASTIC_PASSWORD=YourStrongPasswordHere123!
    - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
```

Add to `backend/.env`:
```env
ELASTICSEARCH_PASSWORD=YourStrongPasswordHere123!
```

Update `backend/src/services/elasticsearch.service.ts`:

```typescript
const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  auth: {
    username: 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || '',
  },
});
```

**Option B: Network Isolation (For Development)**

Update `docker-compose.elasticsearch.yml`:

```yaml
elasticsearch:
  ports:
    - "127.0.0.1:9200:9200"  # Only accessible from localhost
    - "127.0.0.1:9300:9300"
```

---

### Fix 6: Secure Redis

**Time:** 5 minutes

Update `backend/docker-compose.elasticsearch.yml`:

```yaml
redis:
  command: redis-server --appendonly yes --requirepass YourRedisPassword123!
```

Add to `backend/.env`:
```env
REDIS_PASSWORD=YourRedisPassword123!
```

Update `backend/src/services/cache.service.ts`:

```typescript
export const redis = new Redis({
  host: 'localhost',
  port: 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true,
});
```

---

## 🟠 HIGH PRIORITY FIXES

### Fix 7: Fix Timing Attack in Login

Update `backend/src/controllers/auth.controller.ts`:

```typescript
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Always hash to prevent timing attacks
    const dummyHash = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const hash = user?.passwordHash || dummyHash;
    const isValid = await comparePassword(password, hash);

    if (!user || !isValid) {
      // Same error message for both cases
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        reputation: user.reputation,
      },
      token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid input', details: error.errors });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
```

---

### Fix 8: Improve CORS Configuration

Update `backend/src/index.ts`:

```typescript
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5174',
  'http://localhost:5176',
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
```

---

## 🟡 MEDIUM PRIORITY FIXES

### Fix 9: Add Input Sanitization

```bash
npm install dompurify isomorphic-dompurify
npm install --save-dev @types/dompurify
```

Create `backend/src/middleware/sanitize.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeInputs = (req: Request, res: Response, next: NextFunction) => {
  const sanitize = (data: any): any => {
    if (typeof data === 'string') {
      return DOMPurify.sanitize(data, {
        ALLOWED_TAGS: [],
        ALLOWED_ATTR: [],
      });
    }
    if (Array.isArray(data)) {
      return data.map(sanitize);
    }
    if (typeof data === 'object' && data !== null) {
      return Object.keys(data).reduce((acc, key) => {
        acc[key] = sanitize(data[key]);
        return acc;
      }, {} as any);
    }
    return data;
  };

  if (req.body) {
    req.body = sanitize(req.body);
  }
  if (req.query) {
    req.query = sanitize(req.query);
  }

  next();
};
```

Add to `backend/src/index.ts`:

```typescript
import { sanitizeInputs } from './middleware/sanitize.js';

// Add after body parsers
app.use(sanitizeInputs);
```

---

### Fix 10: Enforce HTTPS in Production

Add to `backend/src/index.ts` (after helmet):

```typescript
// Force HTTPS in production
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(301, `https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

### Fix 11: Improve Password Requirements

Update `backend/src/controllers/auth.controller.ts`:

```typescript
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be less than 50 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});
```

---

### Fix 12: Add Security Logging

```bash
npm install winston
```

Create `backend/src/utils/logger.ts`:

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'deals-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/security.log', level: 'warn' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

// Helper functions
export const logSecurityEvent = (event: string, details: any) => {
  logger.warn('Security Event', { event, ...details });
};

export const logAuthFailure = (email: string, ip: string) => {
  logger.warn('Auth Failure', { email, ip, timestamp: new Date() });
};

export const logAuthSuccess = (userId: string, ip: string) => {
  logger.info('Auth Success', { userId, ip, timestamp: new Date() });
};
```

Use in `auth.controller.ts`:

```typescript
import { logAuthFailure, logAuthSuccess } from '../utils/logger.js';

// In login function
if (!user || !isValid) {
  logAuthFailure(email, req.ip || 'unknown');
  res.status(401).json({ error: 'Invalid credentials' });
  return;
}

logAuthSuccess(user.id, req.ip || 'unknown');
```

---

## Verification Checklist

After implementing fixes, verify:

```bash
# 1. Check dependencies installed
npm list helmet express-rate-limit dompurify winston

# 2. Restart all services
docker compose -f docker-compose.elasticsearch.yml restart
npm run dev

# 3. Test rate limiting
for i in {1..10}; do curl -X POST http://localhost:3001/api/auth/login; done
# Should get rate limit error after 5 attempts

# 4. Test security headers
curl -I http://localhost:3001/health
# Should see X-Frame-Options, X-Content-Type-Options, etc.

# 5. Check JWT secret changed
grep JWT_SECRET backend/.env
# Should NOT contain "change-this"

# 6. Test Redis authentication
docker exec deals-redis redis-cli ping
# Should require AUTH if password is set

# 7. Run security audit
npm audit
```

---

## Complete Implementation Script

For automated implementation of all fixes:

```bash
#!/bin/bash

echo "🔒 Applying security fixes..."

# Install dependencies
npm install helmet express-rate-limit dompurify isomorphic-dompurify winston
npm install --save-dev @types/dompurify

# Generate new JWT secret
NEW_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$NEW_SECRET/" .env

# Generate passwords
ELASTIC_PASS=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
REDIS_PASS=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Add to .env
echo "ELASTICSEARCH_PASSWORD=$ELASTIC_PASS" >> .env
echo "REDIS_PASSWORD=$REDIS_PASS" >> .env

echo "✅ Security fixes applied!"
echo "⚠️  Manual steps required:"
echo "1. Update src/index.ts with helmet and rate limiting code"
echo "2. Update docker-compose.elasticsearch.yml with passwords"
echo "3. Update elasticsearch.service.ts and cache.service.ts with auth"
echo "4. Restart all services"
```

---

## Testing Security Fixes

Create `backend/tests/security.test.ts`:

```typescript
import request from 'supertest';
import app from '../src/index';

describe('Security Tests', () => {
  it('should have security headers', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should rate limit auth endpoints', async () => {
    const attempts = [];
    for (let i = 0; i < 10; i++) {
      attempts.push(
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@test.com', password: 'test' })
      );
    }
    const results = await Promise.all(attempts);
    const rateLimited = results.filter(r => r.status === 429);
    expect(rateLimited.length).toBeGreaterThan(0);
  });

  it('should reject oversized payloads', async () => {
    const largePayload = 'x'.repeat(20000); // 20KB
    const res = await request(app)
      .post('/api/deals')
      .send({ title: largePayload });
    expect(res.status).toBe(413); // Payload Too Large
  });
});
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All CRITICAL fixes implemented
- [ ] All HIGH priority fixes implemented
- [ ] Environment variables properly set
- [ ] Secrets rotated and stored securely
- [ ] HTTPS enabled on production domain
- [ ] Rate limiting configured for production traffic
- [ ] Security headers verified
- [ ] npm audit shows no vulnerabilities
- [ ] Security tests passing
- [ ] Logging and monitoring configured
- [ ] Backup and recovery plan in place

---

## Estimated Time

| Priority | Time Required |
|----------|---------------|
| CRITICAL | 30-60 minutes |
| HIGH | 1-2 hours |
| MEDIUM | 2-3 hours |
| **Total** | **4-6 hours** |

---

## Support

If you encounter issues implementing these fixes:

1. Check the error logs: `tail -f backend/logs/error.log`
2. Verify environment variables: `cat backend/.env`
3. Test each fix individually before moving to the next
4. Consult the full security audit: `SECURITY_AUDIT.md`

---

**Last Updated:** December 14, 2025
**Status:** Ready for implementation

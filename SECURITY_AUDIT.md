# Security Audit Report - IndiaDeals Application

**Date:** December 14, 2025
**Application:** IndiaDeals (Backend & Frontend)
**Audit Type:** Comprehensive Security Analysis

---

## Executive Summary

This report identifies security vulnerabilities in the IndiaDeals application and provides actionable remediation steps. The application has several **CRITICAL** and **HIGH** severity vulnerabilities that should be addressed immediately.

### Risk Overview

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 3 | ⚠️ Needs Immediate Action |
| 🟠 HIGH | 5 | ⚠️ Needs Action |
| 🟡 MEDIUM | 4 | ⚡ Should Fix |
| 🟢 LOW | 3 | 📋 Consider |

---

## 🔴 CRITICAL Vulnerabilities

### 1. Weak JWT Secret in Production

**Severity:** CRITICAL
**File:** `backend/.env:3`
**Current Value:** `change-this-secret-key-in-production-use-long-random-string`

**Issue:**
```env
JWT_SECRET=change-this-secret-key-in-production-use-long-random-string
```

The JWT secret is a placeholder value that is weak and predictable. If deployed to production, attackers could:
- Forge authentication tokens
- Impersonate any user
- Gain unauthorized access to all accounts

**Impact:**
- Complete authentication bypass
- Full account takeover
- Unauthorized access to all user data

**Fix:**
```bash
# Generate a strong 256-bit secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Update .env with the generated value
JWT_SECRET=<generated-secret-here>
```

**Recommendation:**
- Use environment-specific secrets (different for dev/staging/prod)
- Store production secrets in a secret manager (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly (every 90 days)

---

### 2. Missing Rate Limiting

**Severity:** CRITICAL
**File:** `backend/src/index.ts`

**Issue:**
No rate limiting middleware is implemented. Attackers can:
- Brute force login credentials (unlimited attempts)
- Perform DDoS attacks
- Scrape all data
- Overwhelm the server with requests

**Impact:**
- Credential brute force attacks
- Service disruption
- Resource exhaustion
- Data scraping

**Fix:**
Install rate limiting:
```bash
npm install express-rate-limit
```

Implement in `backend/src/index.ts`:
```typescript
import rateLimit from 'express-rate-limit';

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', authLimiter);
```

---

### 3. Missing Security Headers

**Severity:** CRITICAL
**File:** `backend/src/index.ts`

**Issue:**
No security headers (Helmet.js) are configured. This leaves the application vulnerable to:
- XSS attacks
- Clickjacking
- MIME sniffing attacks
- Insecure connections

**Impact:**
- Cross-site scripting (XSS)
- Man-in-the-middle attacks
- Content injection
- Browser-based attacks

**Fix:**
Install Helmet:
```bash
npm install helmet
```

Add to `backend/src/index.ts`:
```typescript
import helmet from 'helmet';

// Add after imports, before routes
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));
```

---

## 🟠 HIGH Severity Vulnerabilities

### 4. No Request Body Size Limits

**Severity:** HIGH
**File:** `backend/src/index.ts:24`

**Issue:**
```typescript
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```

No size limits on request bodies. Attackers can:
- Send massive payloads to crash the server
- Exhaust memory
- Perform DoS attacks

**Impact:**
- Server crashes
- Memory exhaustion
- Denial of service

**Fix:**
```typescript
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
```

---

### 5. Elasticsearch Without Authentication

**Severity:** HIGH
**File:** `backend/docker-compose.elasticsearch.yml:9`

**Issue:**
```yaml
xpack.security.enabled=false
```

Elasticsearch has security disabled. Anyone on the network can:
- Read all indexed data
- Modify indices
- Delete data
- Execute arbitrary queries

**Impact:**
- Data breach
- Data manipulation
- Data loss
- Unauthorized access

**Fix:**
Enable Elasticsearch security:
```yaml
environment:
  - xpack.security.enabled=true
  - ELASTIC_PASSWORD=your-strong-password
```

Update connection in `elasticsearch.service.ts`:
```typescript
const esClient = new Client({
  node: env.ELASTICSEARCH_URL,
  auth: {
    username: 'elastic',
    password: env.ELASTICSEARCH_PASSWORD,
  },
});
```

---

### 6. Redis Without Password

**Severity:** HIGH
**File:** `backend/docker-compose.elasticsearch.yml:45`

**Issue:**
Redis has no authentication. Anyone can:
- Read cached data (including search results, user data)
- Flush the entire cache
- Execute arbitrary Redis commands

**Impact:**
- Cache poisoning
- Data theft
- Service disruption
- Information disclosure

**Fix:**
Add password to Redis:
```yaml
command: redis-server --appendonly yes --requirepass your-redis-password
```

Update `cache.service.ts`:
```typescript
export const redis = new Redis(REDIS_URL, {
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  // ... rest of config
});
```

---

### 7. Timing Attack in Login

**Severity:** HIGH
**File:** `backend/src/controllers/auth.controller.ts:67-97`

**Issue:**
```typescript
if (!user) {
  res.status(401).json({ error: 'Invalid credentials' });
  return;
}

const isValid = await comparePassword(password, user.passwordHash);
if (!isValid) {
  res.status(401).json({ error: 'Invalid credentials' });
  return;
}
```

The timing difference between "user not found" and "wrong password" allows attackers to enumerate valid email addresses.

**Impact:**
- Email enumeration
- Targeted phishing attacks
- User privacy breach

**Fix:**
Always hash the password even if user doesn't exist:
```typescript
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Always hash to prevent timing attacks
    const hash = user?.passwordHash || '$2a$10$dummy.hash.to.prevent.timing';
    const isValid = await comparePassword(password, hash);

    if (!user || !isValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id);
    res.json({ user: { ... }, token });
  } catch (error) {
    // ...
  }
};
```

---

### 8. CORS Misconfiguration Potential

**Severity:** HIGH
**File:** `backend/src/index.ts:20-23`

**Issue:**
```typescript
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: true,
}));
```

If `FRONTEND_URL` is not properly set or is set to `*` in production, all origins can access the API with credentials.

**Impact:**
- Cross-site request forgery (CSRF)
- Unauthorized API access
- Session hijacking

**Fix:**
Add validation and whitelist:
```typescript
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:5174', // Development
  // Add other trusted origins
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
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

## 🟡 MEDIUM Severity Vulnerabilities

### 9. No Input Sanitization

**Severity:** MEDIUM

**Issue:**
While Zod validates types, it doesn't sanitize HTML/XSS payloads in user inputs like deal titles, descriptions, comments.

**Impact:**
- Stored XSS attacks
- HTML injection
- Script injection in comments/deals

**Fix:**
Install sanitization library:
```bash
npm install dompurify isomorphic-dompurify
```

Add sanitization middleware:
```typescript
import DOMPurify from 'isomorphic-dompurify';

const sanitizeInput = (data: any): any => {
  if (typeof data === 'string') {
    return DOMPurify.sanitize(data, { ALLOWED_TAGS: [] });
  }
  if (typeof data === 'object' && data !== null) {
    return Object.keys(data).reduce((acc, key) => {
      acc[key] = sanitizeInput(data[key]);
      return acc;
    }, {} as any);
  }
  return data;
};

// Use before validation
const sanitizedBody = sanitizeInput(req.body);
const validated = schema.parse(sanitizedBody);
```

---

### 10. SQL Injection via Raw Queries (Low Risk with Drizzle)

**Severity:** MEDIUM

**Issue:**
While Drizzle ORM protects against most SQL injection, any future raw SQL queries could be vulnerable.

**Current State:** ✅ Protected (using ORM)

**Recommendation:**
- Never use raw SQL queries
- If needed, always use parameterized queries
- Add linting rule to detect raw SQL

---

### 11. No HTTPS Enforcement

**Severity:** MEDIUM

**Issue:**
No middleware to enforce HTTPS in production. Credentials and tokens can be intercepted.

**Impact:**
- Man-in-the-middle attacks
- Credential theft
- Session hijacking

**Fix:**
Add HTTPS redirect middleware:
```typescript
// Force HTTPS in production
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}
```

---

### 12. Verbose Error Messages

**Severity:** MEDIUM
**File:** `backend/src/index.ts:54`

**Issue:**
```typescript
message: env.NODE_ENV === 'development' ? err.message : undefined,
```

Error messages might leak in development mode if NODE_ENV is not properly set.

**Fix:**
```typescript
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);

  const isDev = env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: isDev ? err.message : 'Internal server error',
    ...(isDev && { stack: err.stack }),
  });
});
```

---

## 🟢 LOW Severity Issues

### 13. JWT Token Expiration Too Long

**Severity:** LOW
**File:** `backend/src/utils/auth.ts:18`

**Issue:**
```typescript
return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
```

7-day token expiration is too long. If a token is stolen, it remains valid for a week.

**Recommendation:**
- Use shorter access tokens (15-30 minutes)
- Implement refresh tokens
- Add token revocation mechanism

---

### 14. No Logging/Monitoring

**Severity:** LOW

**Issue:**
No structured logging or monitoring for security events (failed logins, suspicious activity).

**Recommendation:**
Install Winston or Pino for logging:
```bash
npm install winston
```

Log security events:
```typescript
logger.warn('Failed login attempt', { email, ip: req.ip });
logger.info('Successful login', { userId, ip: req.ip });
```

---

### 15. No Password Strength Requirements

**Severity:** LOW
**File:** `backend/src/controllers/auth.controller.ts:10`

**Issue:**
```typescript
password: z.string().min(6),
```

Minimum 6-character password is too weak.

**Fix:**
```typescript
password: z.string()
  .min(12, 'Password must be at least 12 characters')
  .regex(/[A-Z]/, 'Password must contain uppercase letter')
  .regex(/[a-z]/, 'Password must contain lowercase letter')
  .regex(/[0-9]/, 'Password must contain number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain special character'),
```

---

## Additional Security Recommendations

### 1. Dependency Vulnerabilities

Run regular security audits:
```bash
npm audit
npm audit fix
```

Use automated tools:
```bash
npx npm-check-updates -u
npm install
```

### 2. Environment Variable Validation

The app already validates env vars using Zod, which is good! ✅

### 3. Database Security

**Current State:**
- ✅ Using ORM (Drizzle) - prevents SQL injection
- ✅ Parameterized queries
- ⚠️ Database credentials in plain text

**Recommendation:**
- Use connection pooling limits
- Enable PostgreSQL SSL connections in production
- Restrict database user permissions

### 4. File Upload Security

**File:** `backend/package.json` includes `multer`

**Risks:**
- Unrestricted file uploads
- Malicious file execution
- File path traversal

**Fix:**
```typescript
import multer from 'multer';

const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only images allowed'));
    } else {
      cb(null, true);
    }
  },
});
```

### 5. Redis Cache Security

**Recommendations:**
- Set max memory limit
- Configure eviction policy
- Use Redis namespaces for multi-tenancy

### 6. Elasticsearch Security

**Recommendations:**
- Enable authentication (xpack.security)
- Use role-based access control
- Encrypt data at rest
- Enable audit logging

---

## Compliance Considerations

### GDPR Compliance

**Issues:**
- ❌ No data retention policy
- ❌ No user data export functionality
- ❌ No right to be forgotten (account deletion)
- ❌ No privacy policy endpoint

**Required:**
- Implement user data export (JSON)
- Add account deletion with cascade
- Add consent management
- Log data access events

### OWASP Top 10 Coverage

| Vulnerability | Status | Notes |
|---------------|--------|-------|
| A01:2021 – Broken Access Control | ⚠️ | Auth implemented, needs improvement |
| A02:2021 – Cryptographic Failures | ⚠️ | Weak JWT secret, no HTTPS enforcement |
| A03:2021 – Injection | ✅ | Protected by ORM |
| A04:2021 – Insecure Design | ⚠️ | Missing rate limiting, no MFA |
| A05:2021 – Security Misconfiguration | ❌ | Missing Helmet, security headers |
| A06:2021 – Vulnerable Components | ⚠️ | Need npm audit |
| A07:2021 – Auth Failures | ⚠️ | Timing attacks, weak passwords |
| A08:2021 – Data Integrity Failures | ✅ | Using Zod validation |
| A09:2021 – Logging Failures | ❌ | No security logging |
| A10:2021 – SSRF | ✅ | Not applicable |

---

## Priority Action Plan

### Immediate (This Week)

1. ✅ Change JWT_SECRET to strong random value
2. ✅ Install and configure Helmet.js
3. ✅ Add rate limiting to auth endpoints
4. ✅ Add request body size limits
5. ✅ Enable Elasticsearch authentication

### Short-term (This Month)

6. ✅ Add Redis password authentication
7. ✅ Fix timing attack in login
8. ✅ Add input sanitization
9. ✅ Implement HTTPS enforcement
10. ✅ Add security logging

### Long-term (Next Quarter)

11. Implement refresh tokens
12. Add multi-factor authentication (MFA)
13. Set up security monitoring (Sentry, LogRocket)
14. Implement GDPR compliance features
15. Regular security audits and penetration testing

---

## Testing Recommendations

### Security Testing Tools

1. **OWASP ZAP** - Automated security scanner
2. **Burp Suite** - Manual penetration testing
3. **npm audit** - Dependency vulnerability scanning
4. **Snyk** - Continuous security monitoring

### Automated Tests

```bash
# Install security testing tools
npm install --save-dev jest supertest

# Run security tests
npm test
npm run security-audit
```

---

## Conclusion

The IndiaDeals application has several **critical security vulnerabilities** that must be addressed before production deployment. The most urgent issues are:

1. Weak JWT secret
2. Missing rate limiting
3. No security headers
4. Unauthenticated Elasticsearch and Redis

**Estimated Remediation Time:** 2-3 days for critical issues, 1-2 weeks for all high/medium issues.

**Next Steps:**
1. Review this report with the development team
2. Prioritize fixes based on severity
3. Implement fixes incrementally
4. Test each fix thoroughly
5. Schedule follow-up security audit in 30 days

---

**Report Prepared By:** Security Audit System
**Contact:** For questions about this report, consult with a security professional.

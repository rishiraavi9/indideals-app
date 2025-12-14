# Production Deployment Guide - IndiaDeals

## Quick Start (15 Minutes to Deploy)

### Option 1: Deploy to Render.com (Recommended for MVP)

1. **Create Render Account** - https://render.com
2. **Create Services**:
   ```
   - Web Service (Backend)
   - PostgreSQL Database
   - Redis Instance
   ```
3. **Connect GitHub Repository**
4. **Configure Environment Variables** (use .env.production.example)
5. **Deploy!**

**Estimated Cost**: $25-35/month

### Option 2: Deploy to Railway.app

1. **Create Railway Account** - https://railway.app
2. **New Project** → Import from GitHub
3. **Add Services**:
   - PostgreSQL Plugin
   - Redis Plugin
4. **Set Environment Variables**
5. **Deploy!**

**Estimated Cost**: $20-30/month

### Option 3: Traditional VPS (DigitalOcean, AWS, etc.)

See full guide below.

---

## Pre-Deployment Checklist

### Code Preparation
- [ ] All tests passing
- [ ] No console.log statements (use logger)
- [ ] Environment variables documented
- [ ] .gitignore includes .env files
- [ ] package.json has correct start script
- [ ] Dependencies up to date (`npm audit`)

### Security
- [ ] JWT secrets generated (128+ characters)
- [ ] Database credentials strong
- [ ] Redis password set
- [ ] CORS origins restricted
- [ ] Rate limiting enabled
- [ ] Helmet configured
- [ ] Input sanitization active

### Infrastructure
- [ ] Domain name registered
- [ ] SSL certificate ready (or using platform SSL)
- [ ] Database backups configured
- [ ] Monitoring set up (Sentry, etc.)
- [ ] Email service configured

---

## Detailed Deployment Steps

### Step 1: Set Up Production Database

#### Using Supabase (Easiest)
```bash
# 1. Create account: https://supabase.com
# 2. Create new project
# 3. Get connection string from Settings → Database
# 4. Add to .env.production:
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres?sslmode=require
```

#### Using AWS RDS
```bash
# 1. Create RDS PostgreSQL instance
# 2. Configure security groups
# 3. Enable automated backups
# 4. Get connection string
```

### Step 2: Set Up Redis

#### Using Upstash (Free Tier Available)
```bash
# 1. Create account: https://upstash.com
# 2. Create Redis database
# 3. Copy connection details
REDIS_URL=rediss://default:[PASSWORD]@[HOST].upstash.io:6379
REDIS_PASSWORD=[PASSWORD]
```

### Step 3: Set Up Elasticsearch

#### Using Elastic Cloud
```bash
# 1. Create account: https://cloud.elastic.co
# 2. Create deployment
# 3. Copy credentials
ELASTICSEARCH_URL=https://[CLUSTER-ID].es.[REGION].aws.found.io:9243
ELASTICSEARCH_PASSWORD=[PASSWORD]
```

###Step 4: Configure Email Service

#### Using SendGrid
```bash
# 1. Create account: https://sendgrid.com
# 2. Create API key
# 3. Verify sender email
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=[YOUR_API_KEY]
FROM_EMAIL=noreply@yourdomain.com
```

### Step 5: Set Up Error Tracking

#### Using Sentry
```bash
# 1. Create account: https://sentry.io
# 2. Create project
# 3. Get DSN
SENTRY_DSN=https://[KEY]@sentry.io/[PROJECT_ID]
```

### Step 6: Deploy Application

#### Render.com Deployment

1. **Create `render.yaml`** in project root:
```yaml
services:
  - type: web
    name: indiade als-backend
    env: node
    buildCommand: cd backend && npm install && npm run build
    startCommand: cd backend && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: deals-db
          property: connectionString
      # Add all other env vars from .env.production.example

databases:
  - name: deals-db
    databaseName: deals_db
    user: deals_user
```

2. **Push to GitHub**
3. **Connect Render to GitHub**
4. **Deploy!**

#### Manual VPS Deployment

```bash
# 1. SSH into server
ssh user@your-server-ip

# 2. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PostgreSQL, Redis (or use managed services)
# 4. Clone repository
git clone https://github.com/yourusername/deals-app.git
cd deals-app/backend

# 5. Install dependencies
npm install --production

# 6. Set up environment variables
cp .env.production.example .env.production
nano .env.production # Edit with actual values

# 7. Run migrations
npm run db:push

# 8. Build application
npm run build

# 9. Set up PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name deals-api
pm2 save
pm2 startup # Follow instructions

# 10. Set up Nginx reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/deals-api
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# 11. Enable site
sudo ln -s /etc/nginx/sites-available/deals-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 12. Set up SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

---

## Post-Deployment

### Monitoring

1. **Set up Uptime Monitoring**
   - UptimeRobot: https://uptimerobot.com
   - Pingdom: https://pingdom.com

2. **Monitor Health Endpoints**
   - `/health` - Overall health
   - `/health/live` - Liveness probe
   - `/health/ready` - Readiness probe

3. **Check Logs**
   ```bash
   # Render/Railway: View in dashboard
   # PM2:
   pm2 logs deals-api

   # Check log files
   tail -f logs/error.log
   tail -f logs/combined.log
   ```

### Testing Production

```bash
# 1. Health check
curl https://api.yourdomain.com/health

# 2. Test authentication
curl -X POST https://api.yourdomain.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","username":"test","password":"Test123!@#"}'

# 3. Test search
curl https://api.yourdomain.com/api/search/deals?q=laptop

# 4. Check security headers
curl -I https://api.yourdomain.com/health | grep -i "strict-transport\|x-frame\|x-content"
```

### Backup Strategy

```bash
# PostgreSQL backup (daily cron job)
0 2 * * * pg_dump $DATABASE_URL > /backups/db_$(date +\%Y\%m\%d).sql

# Upload to S3
aws s3 cp /backups/db_$(date +\%Y\%m\%d).sql s3://your-bucket/backups/
```

---

## Environment Variables Reference

See `.env.production.example` for complete list.

**Critical Variables:**
- `NODE_ENV=production`
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - 128+ character random string
- `REDIS_URL` - Redis connection string
- `REDIS_PASSWORD` - Redis password
- `FRONTEND_URL` - Your frontend domain
- `SMTP_*` - Email service credentials

---

## Troubleshooting

### Database Connection Fails
```bash
# Check connection string format
# PostgreSQL: postgresql://user:pass@host:5432/db?sslmode=require

# Test connection
psql $DATABASE_URL -c "SELECT 1"
```

### Redis Connection Fails
```bash
# Test Redis connection
redis-cli -h your-redis-host -p 6379 -a your-password ping
```

### Application Crashes
```bash
# Check logs
pm2 logs deals-api

# Check disk space
df -h

# Check memory
free -m

# Restart application
pm2 restart deals-api
```

### High Memory Usage
```bash
# Limit Node.js memory
NODE_OPTIONS="--max-old-space-size=512" pm2 start dist/index.js
```

---

## Scaling

### Horizontal Scaling
1. Deploy multiple instances behind load balancer
2. Use Redis for rate limiting (already implemented)
3. Use session store (Redis)
4. Use managed database with read replicas

### Vertical Scaling
1. Upgrade server resources
2. Optimize database queries
3. Increase caching TTL
4. Use CDN for static assets

---

## Cost Optimization

### Free Tier Options
- **Render**: Free tier available (sleeps after inactivity)
- **Railway**: $5 credit/month
- **Supabase**: Free PostgreSQL
- **Upstash**: Free Redis (10K commands/day)
- **SendGrid**: 100 emails/day free
- **Cloudflare**: Free CDN

### Budget Breakdown ($25-40/month)
```
Render Web Service:     $7/month
PostgreSQL (Supabase):  Free
Redis (Upstash):        Free
Elasticsearch:          $16/month (Elastic Cloud basic)
SendGrid:               Free (100/day)
Domain:                 $12/year
Sentry:                 Free tier
------------------------------------------
Total:                  ~$25/month
```

---

## Security Best Practices

1. **Never commit .env files**
2. **Rotate secrets every 90 days**
3. **Enable 2FA on all services**
4. **Use strong passwords**
5. **Keep dependencies updated**
6. **Monitor security advisories**
7. **Set up automated backups**
8. **Enable database encryption**
9. **Use VPN for database access**
10. **Regular security audits**

---

## Support & Maintenance

### Daily Tasks
- Check error logs
- Monitor uptime
- Review security alerts

### Weekly Tasks
- Review performance metrics
- Check database size
- Update dependencies (if needed)

### Monthly Tasks
- Security audit (`npm audit`)
- Review costs
- Test backup restoration
- Rotate credentials

### Quarterly Tasks
- Performance optimization
- Security penetration test
- Infrastructure review
- Disaster recovery drill

---

## Quick Reference Commands

```bash
# Start production server
NODE_ENV=production npm start

# Run migrations
npm run db:push

# Check health
curl http://localhost:3001/health

# View logs
tail -f logs/combined.log

# Restart with PM2
pm2 restart deals-api

# View PM2 logs
pm2 logs

# Database backup
pg_dump $DATABASE_URL > backup.sql

# Restore database
psql $DATABASE_URL < backup.sql
```

---

## Getting Help

- **Documentation**: Check all *.md files in project
- **Logs**: `logs/` directory
- **Health Check**: https://api.yourdomain.com/health
- **Issues**: Create GitHub issue

---

**Last Updated**: December 14, 2025
**Version**: 1.0.0

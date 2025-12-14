# Rate Limiting Configuration

## Overview

This application uses Redis-based distributed rate limiting to protect against abuse while ensuring legitimate users have a smooth experience.

## Environment-Based Configuration

### Development Mode (Default)
- **Rate limiting is DISABLED by default** in development
- This prevents issues during testing and development
- Set `ENABLE_RATE_LIMIT=true` to test rate limiting in development

### Production Mode
- **Rate limiting is ENABLED by default** in production
- High limits ensure legitimate users are not affected
- Protects against abuse and DDoS attacks

## Rate Limit Configurations

### General API Rate Limit
- **Limit**: 1,000 requests per 15 minutes
- **Purpose**: Protect overall API from abuse
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Authentication Rate Limit
- **Limit**: 10 attempts per 15 minutes
- **Purpose**: Prevent brute force attacks
- **Behavior**: Only counts failed attempts (successful logins don't count)

### Search Rate Limit
- **Limit**: 60 searches per minute (production), 100 in dev
- **Purpose**: Prevent search API abuse
- **Note**: Autocomplete is limited separately

### Deal Creation Rate Limit
- **Limit**: 20 deals per hour (production), 50 in dev
- **Purpose**: Prevent spam and abuse
- **Tracking**: Per user ID (if authenticated) or IP address

## IP Whitelisting

You can whitelist specific IPs that bypass rate limiting:

```env
RATE_LIMIT_WHITELIST=192.168.1.1,10.0.0.1,172.16.0.1
```

**Use cases for whitelisting:**
- Monitoring services (e.g., Pingdom, UptimeRobot)
- CI/CD pipelines
- Internal services
- Load balancers (health checks)

## Environment Variables

### `.env` Configuration

```env
# Rate Limiting
NODE_ENV=development|production
ENABLE_RATE_LIMIT=false|true  # Force enable/disable (optional)
RATE_LIMIT_WHITELIST=ip1,ip2,ip3  # Comma-separated IPs (optional)
```

### Examples

**Development (No rate limiting):**
```env
NODE_ENV=development
# ENABLE_RATE_LIMIT not set (defaults to false)
```

**Development (With rate limiting for testing):**
```env
NODE_ENV=development
ENABLE_RATE_LIMIT=true
```

**Production:**
```env
NODE_ENV=production
RATE_LIMIT_WHITELIST=203.0.113.1,203.0.113.2
```

## Redis Dependency

The rate limiting system requires Redis. If Redis is unavailable:
- **Behavior**: Rate limiting fails open (allows requests)
- **Logging**: Errors are logged to console
- **Recommendation**: Use Redis Sentinel or Redis Cluster for high availability in production

## Response Headers

When rate limited, the API returns these headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 900
Retry-After: 900
```

## Error Response

When rate limit is exceeded:

```json
{
  "error": "Too many requests from this IP, please try again later.",
  "retryAfter": 900
}
```

HTTP Status: `429 Too Many Requests`

## Best Practices for Production

1. **Monitor Rate Limits**: Track how often users hit limits
2. **Adjust Limits**: Based on actual usage patterns
3. **Use CDN**: Offload static content to reduce API calls
4. **Implement Caching**: On both frontend and backend
5. **Log Rate Limit Events**: For security monitoring
6. **Whitelist Known IPs**: For monitoring and CI/CD

## Testing Rate Limits

### Enable in Development
```env
ENABLE_RATE_LIMIT=true
```

### Test with curl
```bash
# Make repeated requests to test rate limiting
for i in {1..110}; do
  curl -i http://localhost:3001/api/deals
done
```

### Reset Rate Limits (Development)
Restart the backend server to clear Redis rate limit counters.

## Troubleshooting

### "Too many requests" in development
**Solution**: Remove or set `ENABLE_RATE_LIMIT=false` in `.env`

### Legitimate users hitting limits in production
**Solutions**:
1. Increase limits in `src/middleware/redis-rate-limit.ts`
2. Add their IP to whitelist
3. Implement user-based rate limiting instead of IP-based

### Redis connection errors
**Solutions**:
1. Ensure Redis is running (`redis-cli ping`)
2. Check Redis connection string in `.env`
3. Verify network connectivity to Redis server

## Customizing Rate Limits

Edit `src/middleware/redis-rate-limit.ts`:

```typescript
export const apiRateLimit = redisRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: getLimit(1000, 2000), // Dev: 1000, Prod: 2000
  message: 'Custom error message',
});
```

## Security Considerations

1. **Don't disable in production**: Always keep rate limiting enabled
2. **Whitelist carefully**: Only whitelist trusted IPs
3. **Monitor logs**: Watch for rate limit abuse patterns
4. **Use HTTPS**: Prevent IP spoofing
5. **Behind proxy**: Configure Express trust proxy settings

## Further Reading

- [Express Rate Limit Documentation](https://github.com/nfriedly/express-rate-limit)
- [Redis ZSET Commands](https://redis.io/commands/?group=sorted-set)
- [OWASP Rate Limiting](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)

import dotenv from 'dotenv';

dotenv.config();

export const env = {
  PORT: process.env.PORT || 3001,
  DATABASE_URL: process.env.DATABASE_URL!,
  JWT_SECRET: process.env.JWT_SECRET!,
  NODE_ENV: process.env.NODE_ENV || 'development',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  FACEBOOK_APP_ID: process.env.FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,

  // Redis Configuration
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  REDIS_PASSWORD: process.env.REDIS_PASSWORD,

  // Rate Limiting Configuration
  ENABLE_RATE_LIMIT: process.env.ENABLE_RATE_LIMIT, // Set to 'true' to enable in development
  RATE_LIMIT_WHITELIST: process.env.RATE_LIMIT_WHITELIST, // Comma-separated list of IPs to whitelist
};

// Validate required env vars
const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

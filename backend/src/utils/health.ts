import { db } from '../db/index.js';
import { redis } from '../services/cache.service.js';
import { esClient } from '../services/elasticsearch.service.js';
import { isFeatureEnabled } from '../config/features.js';

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    elasticsearch?: ServiceHealth;
  };
  version: string;
  environment: string;
}

export interface ServiceHealth {
  status: 'up' | 'down';
  responseTime?: number;
  error?: string;
  details?: any;
}

/**
 * Check PostgreSQL database health
 */
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    // Simple query to check connection
    await db.execute('SELECT 1');
    return {
      status: 'up',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const pong = await redis.ping();
    return {
      status: pong === 'PONG' ? 'up' : 'down',
      responseTime: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check Elasticsearch health
 */
async function checkElasticsearch(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const health = await esClient.cluster.health();
    return {
      status: 'up',
      responseTime: Date.now() - start,
      details: {
        cluster: health.cluster_name,
        status: health.status,
        nodes: health.number_of_nodes,
      },
    };
  } catch (error) {
    return {
      status: 'down',
      responseTime: Date.now() - start,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Perform comprehensive health check
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const elasticsearchEnabled = isFeatureEnabled('ELASTICSEARCH');

  const [database, redisHealth, elasticsearch] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    elasticsearchEnabled ? checkElasticsearch() : Promise.resolve(undefined),
  ]);

  const allServicesUp =
    database.status === 'up' &&
    redisHealth.status === 'up' &&
    (!elasticsearchEnabled || elasticsearch?.status === 'up');

  const someServicesDown =
    database.status === 'down' ||
    redisHealth.status === 'down' ||
    (elasticsearchEnabled && elasticsearch?.status === 'down');

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (allServicesUp) {
    overallStatus = 'healthy';
  } else if (database.status === 'down') {
    // Database is critical - mark as unhealthy
    overallStatus = 'unhealthy';
  } else if (someServicesDown) {
    // Redis or ES down - degraded but functional
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const services: HealthCheckResult['services'] = {
    database,
    redis: redisHealth,
  };

  if (elasticsearchEnabled && elasticsearch) {
    services.elasticsearch = elasticsearch;
  }

  return {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };
}

/**
 * Simple liveness probe - checks if server is running
 */
export function livenessProbe() {
  return {
    status: 'alive',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Readiness probe - checks if server is ready to accept traffic
 */
export async function readinessProbe() {
  const health = await performHealthCheck();
  return {
    ready: health.status !== 'unhealthy',
    status: health.status,
    timestamp: health.timestamp,
  };
}

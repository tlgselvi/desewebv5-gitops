import Redis from 'ioredis';
import { logger } from '@/utils/logger.js';

// Create Redis client for metrics (separate from main Redis client to avoid conflicts)
const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

redis.on('error', (e) => {
  logger.error('Redis metrics client error', { error: e });
});

export type StreamStat = {
  stream: string;
  length: number;
  lastGeneratedId?: string;
  groups: Array<{
    name: string;
    consumers: number;
    pending: number;
    lagApprox: number; // yaklaşık gecikme (mesaj)
  }>;
};

async function xinfoStream(stream: string) {
  try {
    const info = (await redis.call('XINFO', 'STREAM', stream)) as Array<any> | null;
    if (!info) return { length: 0, lastGeneratedId: undefined };
    
    const map: Record<string, any> = {};
    for (let i = 0; i < info.length; i += 2) {
      map[info[i]] = info[i + 1];
    }
    return {
      length: map.length ?? 0,
      lastGeneratedId: map['last-generated-id'] as string | undefined,
    };
  } catch (error) {
    logger.error('Failed to get stream info', { stream, error });
    return { length: 0, lastGeneratedId: undefined };
  }
}

async function xinfoGroups(stream: string) {
  try {
    const groups = (await redis.call('XINFO', 'GROUPS', stream)) as Array<Array<any>>;
    return groups.map((g) => {
      const m: Record<string, any> = {};
      for (let i = 0; i < g.length; i += 2) {
        m[g[i]] = g[i + 1];
      }
      return {
        name: String(m.name),
        consumers: Number(m.consumers ?? 0),
        pending: Number(m.pending ?? 0),
        lastDeliveredId: String(m['last-delivered-id'] ?? '0-0'),
      };
    });
  } catch (error) {
    logger.error('Failed to get stream groups', { stream, error });
    return [];
  }
}

function idCompare(a: string, b: string): number {
  // a-b biçimli (timestamp-sequence)
  const [a1, a2] = a.split('-').map((x) => Number(x));
  const [b1, b2] = b.split('-').map((x) => Number(x));
  if (a1 !== b1) return a1 - b1;
  return a2 - b2;
}

/**
 * Get statistics for Redis Streams
 */
export async function getStreamStats(streams: string[]): Promise<StreamStat[]> {
  const out: StreamStat[] = [];
  
  for (const s of streams) {
    try {
      const [si, groups] = await Promise.all([xinfoStream(s), xinfoGroups(s)]);
      
      const stats: StreamStat = {
        stream: s,
        length: si.length,
        lastGeneratedId: si.lastGeneratedId,
        groups: [],
      };
      
      for (const g of groups) {
        const lagApprox = si.lastGeneratedId
          ? Math.max(0, idCompare(si.lastGeneratedId, g.lastDeliveredId))
          : g.pending;
        
        stats.groups.push({
          name: g.name,
          consumers: g.consumers,
          pending: g.pending,
          lagApprox,
        });
      }
      
      out.push(stats);
    } catch (error) {
      logger.error('Failed to get stream stats', { stream: s, error });
      // Continue with other streams even if one fails
      out.push({
        stream: s,
        length: 0,
        groups: [],
      });
    }
  }
  
  return out;
}

export type WsStats = {
  connections: number;
  broadcastTotal: number;
  p50: number;
  p95: number;
};

// WS istatistikleri gateway'den sağlanır; burada yalnızca tip tanımı tutulur.


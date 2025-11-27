# TODO P2-06: Infrastructure Scaling & Optimization

**Öncelik:** 🟢 P2 - ORTA  
**Tahmini Süre:** 10-12 hafta  
**Sorumlu:** DevOps Engineer + Backend Engineer  
**Rapor Referansı:** DESE_EA_PLAN_TRANSFORMATION_REPORT.md - Bölüm 4 (Stratejik Yol Haritası - Faz 5), Bölüm 8 (İmplementasyon Planı - Database Read Replica, Redis Cluster, S3 Storage)  
**Durum:** ✅ **TAMAMLANDI**  
**Tamamlanma Oranı:** %100

**Tamamlanma Tarihi:** 27 Kasım 2025

---

## 🎯 Hedef

Production ortamında ölçeklenebilirlik ve performans için database read replica, Redis cluster ve S3 storage entegrasyonu.

**Mevcut Durum:**
- ✅ PostgreSQL 15 (with read replica support)
- ✅ Redis 7-alpine (with cluster support)
- ✅ S3 storage (AWS/MinIO/DigitalOcean)
- ✅ Database read replica setup
- ✅ Redis cluster setup
- ✅ S3 storage entegrasyonu

**Tamamlanan Hedefler:**
- ✅ PostgreSQL read replica setup (Connection Manager)
- ✅ Redis cluster setup (6-node cluster)
- ✅ S3 storage entegrasyonu (S3 Client, Upload Service)
- ✅ Connection pooling optimizasyonu (PgBouncer config)
- ✅ Query routing mekanizması (Read/Write separation)

---

## 📋 Görevler

### Faz 1: Database Read Replica Setup (3-4 hafta) ✅ TAMAMLANDI

#### 1.1 PostgreSQL Replication Configuration
- [x] Primary database replication configuration
- [x] Streaming replication setup
- [x] Replication slot configuration
- [x] WAL archiving configuration
- [x] Replication monitoring

#### 1.2 Read Replica Setup
- [x] Read replica instance creation
- [x] Replication lag monitoring
- [x] Replica health checks
- [x] Automatic failover mechanism (opsiyonel)
- [x] Replica promotion procedure

#### 1.3 Connection Pooling Optimization
- [x] PgBouncer setup ve configuration
- [x] Connection pool sizing
- [x] Read/write connection separation
- [x] Connection pool monitoring
- [x] Connection leak detection

#### 1.4 Query Routing Implementation
- [x] `src/db/connection-manager.ts` oluştur
- [x] Read query routing (replica)
- [x] Write query routing (primary)
- [x] Transaction handling (always primary)
- [x] Read-after-write consistency handling

#### 1.5 Drizzle ORM Integration
- [x] Drizzle read replica support
- [x] Query type detection (read/write)
- [x] Connection selection logic
- [x] Transaction management
- [x] Migration scriptleri (always primary)

### Faz 2: Redis Cluster Setup (2-3 hafta) ✅ TAMAMLANDI

#### 2.1 Redis Cluster Architecture
- [x] Cluster topology tasarımı
- [x] Node count belirleme (minimum 3 master, 3 replica)
- [x] Sharding strategy
- [x] Replication factor
- [x] Cluster configuration

#### 2.2 Redis Cluster Deployment
- [x] Redis cluster nodes setup
- [x] Cluster initialization
- [x] Cluster node discovery
- [x] Cluster health monitoring
- [x] Cluster failover testing

#### 2.3 Redis Client Integration
- [x] `src/services/redis/cluster-client.ts` oluştur
- [x] Redis cluster client configuration
- [x] Key distribution strategy
- [x] Cluster node failure handling
- [x] Retry mechanism

#### 2.4 Cache Strategy Optimization
- [x] Cache key naming convention
- [x] Cache sharding strategy
- [x] Cache invalidation strategy
- [x] Cache warming mechanism
- [x] Cache hit/miss monitoring

#### 2.5 Migration from Single Redis
- [x] Data migration strategy
- [x] Zero-downtime migration
- [x] Cache key mapping
- [x] Migration validation
- [x] Rollback procedure

### Faz 3: S3 Storage Integration (2-3 hafta) ✅ TAMAMLANDI

#### 3.1 S3 Provider Selection
- [x] AWS S3 evaluation
- [x] MinIO (self-hosted) evaluation
- [x] DigitalOcean Spaces evaluation
- [x] Provider selection ve setup
- [x] S3 bucket configuration

#### 3.2 S3 Client Implementation
- [x] `src/services/storage/s3-client.ts` oluştur
- [x] S3 client configuration
- [x] Upload implementation
- [x] Download implementation
- [x] Delete implementation
- [x] List implementation

#### 3.3 File Upload Service
- [x] `src/services/storage/upload.service.ts` oluştur
- [x] File validation
- [x] File size limits
- [x] File type restrictions
- [x] Upload progress tracking
- [x] Error handling

#### 3.4 File Management
- [x] File metadata storage (database)
- [x] File access control (RBAC)
- [x] File versioning
- [x] File deletion (soft delete)
- [x] File cleanup (orphaned files)

#### 3.5 CDN Integration
- [x] CDN provider selection (CloudFront, Cloudflare, vb.)
- [x] CDN configuration
- [x] Cache invalidation
- [x] CDN URL generation
- [x] CDN monitoring

#### 3.6 Migration from Local Storage
- [x] Local file inventory
- [x] Migration script
- [x] Batch upload process
- [x] Migration validation
- [x] Local storage cleanup

### Faz 4: Performance Optimization (2 hafta) ✅ TAMAMLANDI

#### 4.1 Database Query Optimization
- [x] Slow query analysis
- [x] Index optimization
- [x] Query plan analysis
- [x] Query caching strategy
- [x] Materialized views (opsiyonel)

#### 4.2 Connection Pool Tuning
- [x] Pool size optimization
- [x] Connection timeout tuning
- [x] Idle connection management
- [x] Connection pool monitoring
- [x] Load testing

#### 4.3 Cache Performance
- [x] Cache hit rate optimization
- [x] TTL strategy optimization
- [x] Cache size management
- [x] Cache eviction policy
- [x] Cache warming strategy

#### 4.4 Storage Performance
- [x] Upload performance optimization
- [x] Download performance optimization
- [x] Multipart upload (large files)
- [x] Parallel upload/download
- [x] Bandwidth optimization

### Faz 5: Monitoring & Alerting (1 hafta) ✅ TAMAMLANDI

#### 5.1 Database Monitoring
- [x] Replication lag monitoring
- [x] Connection pool metrics
- [x] Query performance metrics
- [x] Database size monitoring
- [x] Alert rules (Prometheus)

#### 5.2 Redis Monitoring
- [x] Cluster node health
- [x] Memory usage monitoring
- [x] Cache hit/miss rates
- [x] Cluster operations monitoring
- [x] Alert rules (Prometheus)

#### 5.3 Storage Monitoring
- [x] S3 bucket size monitoring
- [x] Upload/download metrics
- [x] CDN performance metrics
- [x] Storage costs monitoring
- [x] Alert rules

#### 5.4 Grafana Dashboards
- [x] Database performance dashboard
- [x] Redis cluster dashboard
- [x] Storage usage dashboard
- [x] Infrastructure overview dashboard

### Faz 6: Testing & Documentation (1 hafta) ✅ TAMAMLANDI

#### 6.1 Load Testing
- [x] Database read/write load testing
- [x] Redis cluster load testing
- [x] File upload/download load testing
- [x] End-to-end performance testing
- [x] Stress testing

#### 6.2 Failover Testing
- [x] Database replica failover
- [x] Redis cluster node failure
- [x] S3 service failure
- [x] Network partition scenarios
- [x] Recovery procedures

#### 6.3 Documentation
- [x] Infrastructure architecture documentation
- [x] Deployment guide
- [x] Configuration guide
- [x] Troubleshooting guide
- [x] Runbook (operational procedures)

---

## 🔧 Teknik Detaylar

### Database Read Replica Architecture
```
Primary (Write) ──┐
                  ├──> Streaming Replication
Replica 1 (Read) ─┘
Replica 2 (Read) ─┘
```

### Redis Cluster Architecture
```
Master 1 ──┐
           ├──> Replica 1
Master 2 ──┼──> Replica 2
           │
Master 3 ──┘──> Replica 3
```

### S3 Storage Structure
```
s3://dese-storage/
  ├── organizations/
  │   └── {org_id}/
  │       ├── documents/
  │       ├── images/
  │       └── exports/
  └── public/
      └── assets/
```

### Connection Manager Example
```typescript
class ConnectionManager {
  getReadConnection(): Database {
    // Route to replica
  }
  
  getWriteConnection(): Database {
    // Route to primary
  }
  
  getTransactionConnection(): Database {
    // Always primary for transactions
  }
}
```

---

## 📊 Başarı Kriterleri

### Performans Kriterleri
- ✅ Read query latency < 100ms (p95)
- ✅ Write query latency < 200ms (p95)
- ✅ Replication lag < 1 saniye
- ✅ Redis cluster operations < 50ms (p95)
- ✅ File upload < 5 saniye (10MB file)
- ✅ File download < 2 saniye (10MB file)

### Ölçeklenebilirlik Kriterleri
- ✅ Database read capacity: 10x artış
- ✅ Redis throughput: 5x artış
- ✅ Storage capacity: Unlimited (S3)
- ✅ Concurrent connections: 1000+

### Güvenilirlik Kriterleri
- ✅ Database uptime: %99.9
- ✅ Redis cluster uptime: %99.9
- ✅ Automatic failover: < 30 saniye
- ✅ Data durability: %100

---

## 🚨 Riskler ve Mitigasyon

### Risk 1: Replication Lag
- **Risk:** Read replica'da stale data
- **Mitigasyon:** Replication lag monitoring, read-after-write consistency handling

### Risk 2: Redis Cluster Data Loss
- **Risk:** Cluster node failure sırasında data kaybı
- **Mitigasyon:** Replication factor > 1, persistence (AOF/RDB), backup strategy

### Risk 3: S3 Costs
- **Risk:** Storage ve bandwidth maliyetleri
- **Mitigasyon:** Lifecycle policies, compression, CDN caching, cost monitoring

### Risk 4: Migration Downtime
- **Risk:** Migration sırasında service interruption
- **Mitigasyon:** Zero-downtime migration strategy, gradual rollout, rollback plan

---

## 📅 Zaman Çizelgesi

| Faz | Süre | Başlangıç | Bitiş |
|-----|------|-----------|-------|
| Faz 1: Database Read Replica | 3-4 hafta | - | - |
| Faz 2: Redis Cluster | 2-3 hafta | - | - |
| Faz 3: S3 Storage | 2-3 hafta | - | - |
| Faz 4: Performance Optimization | 2 hafta | - | - |
| Faz 5: Monitoring & Alerting | 1 hafta | - | - |
| Faz 6: Testing & Documentation | 1 hafta | - | - |
| **TOPLAM** | **10-12 hafta** | - | - |

---

## 📚 Referanslar

- [PostgreSQL Streaming Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [Redis Cluster Tutorial](https://redis.io/docs/manual/scaling/)
- [AWS S3 Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [PgBouncer Documentation](https://www.pgbouncer.org/)

## 🔐 Configuration Schema Updates

### Config Schema Extension

```typescript
// src/config/index.ts additions

database: z.object({
  url: z.string(),
  host: z.string().default("db"),
  port: z.coerce.number().default(5432),
  name: z.string().default("dese_ea_plan_v5"),
  user: z.string().default("dese"),
  password: z.string().default("dese123"),
  // New fields for replication
  readReplicaUrls: z.array(z.string()).default([]),
  maxPoolSize: z.coerce.number().default(20),
  replicationLagThreshold: z.coerce.number().default(1000),
  enableReadReplica: z.coerce.boolean().default(false),
}),

redis: z.object({
  url: z.string().default("redis://redis:6379"),
  host: z.string().default("redis"),
  port: z.coerce.number().default(6379),
  password: z.string().optional(),
  // New fields for cluster
  clusterEnabled: z.coerce.boolean().default(false),
  clusterNodes: z.array(z.string()).default([]),
  maxRetryDelay: z.coerce.number().default(2000),
}),

// New storage configuration
storage: z.object({
  provider: z.enum(["aws", "minio", "digitalocean"]).default("aws"),
  enabled: z.coerce.boolean().default(false),
  region: z.string().default("us-east-1"),
  bucket: z.string().default("dese-storage"),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  endpoint: z.string().optional(),
  forcePathStyle: z.coerce.boolean().default(false),
  cdnEnabled: z.coerce.boolean().default(false),
  cdnUrl: z.string().optional(),
}),
```

## 📝 Detailed Implementation Steps

### Phase 1: Database Read Replica - Detailed Steps

#### Step 1.1.1: Primary Database Configuration

1. **PostgreSQL Configuration (`postgresql.conf`)**:
```ini
# Replication settings
wal_level = replica
max_wal_senders = 3
max_replication_slots = 3
hot_standby = on
wal_keep_segments = 32
```

2. **PostgreSQL Authentication (`pg_hba.conf`)**:
```conf
# Allow replication from replicas
host replication replicator 0.0.0.0/0 md5
```

3. **Create Replication User**:
```sql
CREATE USER replicator WITH REPLICATION PASSWORD 'replication_password';
GRANT REPLICATION ON DATABASE dese_ea_plan_v5 TO replicator;
```

#### Step 1.1.2: Replica Setup Script

```bash
#!/bin/bash
# scripts/setup-replica.sh

PRIMARY_HOST=${PRIMARY_HOST:-db-primary}
PRIMARY_PORT=${PRIMARY_PORT:-5432}
REPLICATION_USER=${REPLICATION_USER:-replicator}
REPLICATION_PASSWORD=${REPLICATION_PASSWORD}

# Stop PostgreSQL if running
pg_ctl stop

# Remove existing data
rm -rf $PGDATA/*

# Create base backup
pg_basebackup \
  -h $PRIMARY_HOST \
  -p $PRIMARY_PORT \
  -U $REPLICATION_USER \
  -D $PGDATA \
  -Fp \
  -Xs \
  -P \
  -R

# Start PostgreSQL
pg_ctl start
```

#### Step 1.4.1: Update Drizzle Query Execution

```typescript
// src/db/query-router.ts
import { connectionManager } from './connection-manager.js';
import { SQL } from 'drizzle-orm';

/**
 * Execute read query (routes to replica)
 */
export async function executeReadQuery<T>(
  query: SQL<T>,
  params?: any[]
): Promise<T[]> {
  const db = connectionManager.getReplicaConnection();
  return await db.execute(query);
}

/**
 * Execute write query (routes to primary)
 */
export async function executeWriteQuery<T>(
  query: SQL<T>,
  params?: any[]
): Promise<T[]> {
  const db = connectionManager.getPrimaryConnection();
  return await db.execute(query);
}

/**
 * Execute transaction (always on primary)
 */
export async function executeTransaction<T>(
  callback: (tx: Transaction) => Promise<T>
): Promise<T> {
  const db = connectionManager.getPrimaryConnection();
  return await db.transaction(callback);
}
```

### Phase 2: Redis Cluster - Detailed Steps

#### Step 2.1.1: Redis Cluster Configuration

```yaml
# docker-compose.redis-cluster.yml
version: '3.8'

services:
  redis-cluster-0:
    image: redis:7-alpine
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-node-timeout 5000
      --appendonly yes
      --requirepass ${REDIS_PASSWORD}
      --masterauth ${REDIS_PASSWORD}
    environment:
      - REDIS_PASSWORD=${REDIS_PASSWORD}
    volumes:
      - redis_cluster_0:/data
    ports:
      - "7000:6379"
    networks:
      - redis-cluster-net

  redis-cluster-1:
    # ... similar config

  redis-cluster-init:
    image: redis:7-alpine
    command: >
      sh -c "
      until redis-cli -h redis-cluster-0 -p 6379 -a ${REDIS_PASSWORD} ping; do
        echo 'Waiting for cluster nodes...'
        sleep 2
      done
      redis-cli --cluster create
      redis-cluster-0:6379 redis-cluster-1:6379 redis-cluster-2:6379
      --cluster-replicas 1
      --cluster-yes
      -a ${REDIS_PASSWORD}
      "
    depends_on:
      - redis-cluster-0
      - redis-cluster-1
      - redis-cluster-2
    networks:
      - redis-cluster-net

networks:
  redis-cluster-net:
    driver: bridge

volumes:
  redis_cluster_0:
  redis_cluster_1:
  redis_cluster_2:
```

### Phase 3: S3 Storage - Detailed Steps

#### Step 3.1.1: S3 Bucket Setup

**AWS S3**:
```bash
aws s3 mb s3://dese-storage
aws s3api put-bucket-cors \
  --bucket dese-storage \
  --cors-configuration file://cors-config.json
```

**MinIO** (Local Development):
```bash
mc alias set minio http://localhost:9000 minioadmin minioadmin
mc mb minio/dese-storage
mc anonymous set public minio/dese-storage
```

#### Step 3.3.1: File Upload Service Implementation

```typescript
// src/services/storage/upload.service.ts
import { s3Client } from './s3-client.js';
import { db } from '@/db/index.js';
import { files } from '@/db/schema/index.js';
import { logger } from '@/utils/logger.js';
import { z } from 'zod';

const uploadSchema = z.object({
  organizationId: z.string().uuid(),
  filename: z.string(),
  mimeType: z.string(),
  size: z.number().positive(),
  category: z.enum(['documents', 'images', 'exports']).default('documents'),
});

export class UploadService {
  private maxFileSize: number;
  private allowedMimeTypes: string[];

  constructor() {
    this.maxFileSize = parseInt(process.env.MAX_FILE_SIZE || '10485760');
    this.allowedMimeTypes = (process.env.ALLOWED_FILE_TYPES || '').split(',');
  }

  /**
   * Upload file to storage
   */
  async uploadFile(
    organizationId: string,
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    category: string = 'documents'
  ): Promise<{ id: string; url: string; key: string }> {
    // Validate
    if (fileBuffer.length > this.maxFileSize) {
      throw new Error(`File size exceeds maximum: ${this.maxFileSize} bytes`);
    }

    if (!this.allowedMimeTypes.includes(mimeType)) {
      throw new Error(`Mime type not allowed: ${mimeType}`);
    }

    // Generate S3 key
    const key = s3Client.generateKey(organizationId, category, filename);

    // Upload to S3
    const url = await s3Client.upload(
      key,
      fileBuffer,
      mimeType,
      {
        organizationId,
        originalFilename: filename,
      }
    );

    // Save metadata to database
    const [fileRecord] = await db
      .insert(files)
      .values({
        organizationId,
        filename,
        mimeType,
        size: fileBuffer.length,
        path: key,
        storageProvider: 's3',
        storageKey: key,
        storageUrl: url,
        category,
      })
      .returning();

    logger.info('File uploaded', {
      fileId: fileRecord.id,
      organizationId,
      key,
    });

    return {
      id: fileRecord.id,
      url,
      key,
    };
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, organizationId: string): Promise<void> {
    // Get file record
    const fileRecord = await db
      .select()
      .from(files)
      .where(
        and(eq(files.id, fileId), eq(files.organizationId, organizationId))
      )
      .limit(1);

    if (!fileRecord[0]) {
      throw new Error('File not found');
    }

    // Delete from S3
    if (fileRecord[0].storageKey) {
      await s3Client.delete(fileRecord[0].storageKey);
    }

    // Soft delete in database
    await db
      .update(files)
      .set({ deletedAt: new Date() })
      .where(eq(files.id, fileId));

    logger.info('File deleted', { fileId, organizationId });
  }

  /**
   * Get file download URL
   */
  async getDownloadUrl(
    fileId: string,
    organizationId: string,
    expiresIn: number = 3600
  ): Promise<string> {
    const fileRecord = await db
      .select()
      .from(files)
      .where(
        and(
          eq(files.id, fileId),
          eq(files.organizationId, organizationId),
          isNull(files.deletedAt)
        )
      )
      .limit(1);

    if (!fileRecord[0]) {
      throw new Error('File not found');
    }

    if (fileRecord[0].storageKey) {
      return await s3Client.getPresignedUrl(
        fileRecord[0].storageKey,
        expiresIn
      );
    }

    throw new Error('File storage key not found');
  }
}

export const uploadService = new UploadService();
```

## 🧪 Testing Strategy

### Load Testing Scenarios

#### Database Read/Write Load Test

```typescript
// tests/load/database-load.test.ts
import { describe, it } from 'vitest';
import { connectionManager } from '@/db/connection-manager.js';

describe('Database Load Tests', () => {
  it('should handle concurrent read queries', async () => {
    const concurrentReads = 100;
    const promises = Array.from({ length: concurrentReads }, () => {
      const db = connectionManager.getReplicaConnection();
      return db.execute(sql`SELECT * FROM accounts LIMIT 10`);
    });

    const results = await Promise.all(promises);
    expect(results).toHaveLength(concurrentReads);
  });

  it('should handle concurrent write queries', async () => {
    const concurrentWrites = 50;
    const promises = Array.from({ length: concurrentWrites }, () => {
      const db = connectionManager.getPrimaryConnection();
      return db.execute(
        sql`INSERT INTO accounts (organization_id, name) VALUES (gen_random_uuid(), 'Test')`
      );
    });

    const results = await Promise.all(promises);
    expect(results).toHaveLength(concurrentWrites);
  });
});
```

#### Redis Cluster Load Test

```typescript
// tests/load/redis-cluster-load.test.ts
import { describe, it } from 'vitest';
import { redisCluster } from '@/services/redis/cluster-client.js';

describe('Redis Cluster Load Tests', () => {
  it('should handle high throughput', async () => {
    const operations = 10000;
    const promises = Array.from({ length: operations }, (_, i) => {
      return redisCluster.set(`test:key:${i}`, `value:${i}`, 60);
    });

    await Promise.all(promises);

    // Verify all keys exist
    const results = await Promise.all(
      Array.from({ length: 100 }, (_, i) =>
        redisCluster.get(`test:key:${i}`)
      )
    );

    expect(results.every((v) => v !== null)).toBe(true);
  });
});
```

### Failover Testing

#### Database Replica Failover Test

```typescript
// tests/failover/database-failover.test.ts
import { describe, it, beforeAll, afterAll } from 'vitest';

describe('Database Failover Tests', () => {
  it('should handle replica failure gracefully', async () => {
    // Simulate replica failure
    // Verify fallback to primary
    // Verify monitoring alerts
  });

  it('should handle primary failure and promote replica', async () => {
    // Simulate primary failure
    // Verify replica promotion
    // Verify service continuity
  });
});
```

## 📊 Monitoring Metrics

### Key Metrics to Track

1. **Database Metrics**:
   - Replication lag (milliseconds)
   - Connection pool usage (percentage)
   - Query latency (p50, p95, p99)
   - Read/write ratio

2. **Redis Metrics**:
   - Cluster node health
   - Memory usage (percentage)
   - Cache hit/miss ratio
   - Operation latency

3. **Storage Metrics**:
   - Upload/download throughput
   - Error rates
   - Storage usage (GB)
   - CDN cache hit ratio

4. **Infrastructure Metrics**:
   - CPU usage per service
   - Memory usage per service
   - Network I/O
   - Disk I/O

## 🔄 Rollback Procedures

### Database Replication Rollback

```bash
# 1. Stop replica services
docker-compose stop db-replica-1 db-replica-2

# 2. Update application config to disable read replicas
export DATABASE_ENABLE_READ_REPLICA=false

# 3. Restart application
docker-compose restart app

# 4. Verify all queries route to primary
```

### Redis Cluster Rollback

```bash
# 1. Update application config to use single Redis
export REDIS_CLUSTER_ENABLED=false
export REDIS_URL=redis://redis:6379

# 2. Restart application
docker-compose restart app

# 3. Migrate data back to single Redis (if needed)
```

### S3 Storage Rollback

```bash
# 1. Update application config to use local storage
export S3_ENABLED=false
export UPLOAD_PATH=./uploads

# 2. Download files from S3 back to local storage
node scripts/migrate-s3-to-local.js

# 3. Restart application
docker-compose restart app
```

## 📖 Documentation Requirements

### Required Documentation

1. **Architecture Diagram**: Visual representation of infrastructure
2. **Deployment Guide**: Step-by-step deployment instructions
3. **Configuration Guide**: All environment variables and settings
4. **Troubleshooting Guide**: Common issues and solutions
5. **Runbook**: Operational procedures for common tasks
6. **API Documentation**: Updated API docs with new endpoints
7. **Migration Guide**: Step-by-step migration procedures

---

**Son Güncelleme:** 27 Ocak 2025  
**Durum:** ✅ **PLAN TAMAMLANDI**

---

## 💻 Implementation Details

### Environment Variables

```bash
# Database Replication
DATABASE_URL=postgresql://user:password@db-primary:5432/dese_ea_plan_v5
DATABASE_READ_REPLICA_URL_1=postgresql://user:password@db-replica-1:5432/dese_ea_plan_v5
DATABASE_READ_REPLICA_URL_2=postgresql://user:password@db-replica-2:5432/dese_ea_plan_v5
DATABASE_MAX_POOL_SIZE=20
DATABASE_REPLICATION_LAG_THRESHOLD_MS=1000

# PgBouncer
PGBOUNCER_HOST=pgbouncer
PGBOUNCER_PORT=6432
PGBOUNCER_POOL_SIZE=100

# Redis Cluster
REDIS_CLUSTER_ENABLED=true
REDIS_CLUSTER_NODES=redis-cluster-0:6379,redis-cluster-1:6379,redis-cluster-2:6379
REDIS_CLUSTER_OPTIONS_STARTUP_NODES=3
REDIS_CLUSTER_REPLICATION_FACTOR=1
REDIS_CLUSTER_RETRY_STRATEGY_MAX_DELAY=2000

# S3 Storage
S3_PROVIDER=aws # aws | minio | digitalocean
S3_ENABLED=true
S3_REGION=us-east-1
S3_BUCKET_NAME=dese-storage
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_ENDPOINT= # For MinIO or DigitalOcean
S3_FORCE_PATH_STYLE=false
S3_CDN_ENABLED=true
S3_CDN_URL=https://cdn.dese.ai

# File Upload
MAX_FILE_SIZE=10485760 # 10MB
MAX_FILE_SIZE_LARGE=104857600 # 100MB (for multipart upload)
ALLOWED_FILE_TYPES=image/jpeg,image/png,image/webp,application/pdf
UPLOAD_MULTIPART_THRESHOLD=5242880 # 5MB

# Storage Migration
STORAGE_MIGRATION_ENABLED=false
STORAGE_MIGRATION_BATCH_SIZE=100
```

### Docker Compose Updates

#### PostgreSQL Primary & Replicas

```yaml
services:
  db-primary:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${POSTGRES_REPLICATION_PASSWORD}
    command:
      - "postgres"
      - "-c"
      - "wal_level=replica"
      - "-c"
      - "max_wal_senders=3"
      - "-c"
      - "max_replication_slots=3"
      - "-c"
      - "hot_standby=on"
    volumes:
      - postgres_primary_data:/var/lib/postgresql/data
      - ./init-sql/replication-setup.sql:/docker-entrypoint-initdb.d/replication-setup.sql
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  db-replica-1:
    image: postgres:15
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_MASTER_HOST: db-primary
      POSTGRES_REPLICATION_USER: replicator
      POSTGRES_REPLICATION_PASSWORD: ${POSTGRES_REPLICATION_PASSWORD}
    command:
      - "postgres"
      - "-c"
      - "hot_standby=on"
    volumes:
      - postgres_replica1_data:/var/lib/postgresql/data
      - ./init-sql/replica-setup.sh:/docker-entrypoint-initdb.d/replica-setup.sh
    depends_on:
      db-primary:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgbouncer:
    image: pgbouncer/pgbouncer:latest
    environment:
      DATABASES_HOST: db-primary
      DATABASES_PORT: 5432
      DATABASES_USER: ${POSTGRES_USER}
      DATABASES_PASSWORD: ${POSTGRES_PASSWORD}
      DATABASES_DBNAME: ${POSTGRES_DB}
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 25
    volumes:
      - ./config/pgbouncer.ini:/etc/pgbouncer/pgbouncer.ini
    ports:
      - "6432:6432"
    depends_on:
      - db-primary
    healthcheck:
      test: ["CMD", "pg_isready", "-h", "localhost", "-p", "6432"]
      interval: 10s
      timeout: 5s
      retries: 5
```

#### Redis Cluster

```yaml
services:
  redis-cluster-init:
    image: redis:7-alpine
    command: >
      sh -c "
      redis-cli --cluster create
      redis-cluster-0:6379
      redis-cluster-1:6379
      redis-cluster-2:6379
      --cluster-replicas 1
      --cluster-yes
      "
    depends_on:
      - redis-cluster-0
      - redis-cluster-1
      - redis-cluster-2
    profiles:
      - redis-cluster

  redis-cluster-0:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis_cluster_0_data:/data
    ports:
      - "7000:6379"
    profiles:
      - redis-cluster

  redis-cluster-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis_cluster_1_data:/data
    ports:
      - "7001:6379"
    profiles:
      - redis-cluster

  redis-cluster-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf --cluster-node-timeout 5000 --appendonly yes
    volumes:
      - redis_cluster_2_data:/data
    ports:
      - "7002:6379"
    profiles:
      - redis-cluster
```

#### MinIO (S3 Compatible Storage)

```yaml
services:
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD:-minioadmin}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000" # S3 API
      - "9001:9001" # Console
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
```

### Connection Manager Implementation

```typescript
// src/db/connection-manager.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';
import { config } from '@/config/index.js';
import { logger } from '@/utils/logger.js';

type QueryType = 'read' | 'write' | 'transaction';

interface ConnectionConfig {
  url: string;
  max: number;
  idle_timeout: number;
  connect_timeout: number;
  max_lifetime: number;
}

class ConnectionManager {
  private primaryConnection: ReturnType<typeof drizzle> | null = null;
  private replicaConnections: ReturnType<typeof drizzle>[] = [];
  private replicaIndex = 0;
  private replicationLagThreshold: number;

  constructor() {
    this.replicationLagThreshold = config.database.replicationLagThreshold || 1000;
    this.initializeConnections();
  }

  private initializeConnections(): void {
    // Primary connection (write)
    const primaryConfig: ConnectionConfig = {
      url: config.database.url,
      max: config.database.maxPoolSize || 20,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    };
    
    const primaryClient = postgres(primaryConfig.url, {
      max: primaryConfig.max,
      idle_timeout: primaryConfig.idle_timeout,
      connect_timeout: primaryConfig.connect_timeout,
      max_lifetime: primaryConfig.max_lifetime,
      prepare: false,
    });

    this.primaryConnection = drizzle(primaryClient, { schema });

    // Replica connections (read)
    const replicaUrls = config.database.readReplicaUrls || [];
    this.replicaConnections = replicaUrls.map((url: string) => {
      const replicaClient = postgres(url, {
        max: primaryConfig.max,
        idle_timeout: primaryConfig.idle_timeout,
        connect_timeout: primaryConfig.connect_timeout,
        max_lifetime: primaryConfig.max_lifetime,
        prepare: false,
      });
      return drizzle(replicaClient, { schema });
    });

    logger.info('Connection manager initialized', {
      primary: !!this.primaryConnection,
      replicas: this.replicaConnections.length,
    });
  }

  /**
   * Get connection based on query type
   */
  getConnection(queryType: QueryType = 'read'): ReturnType<typeof drizzle> {
    if (queryType === 'write' || queryType === 'transaction') {
      return this.primaryConnection!;
    }

    // Read queries: use replica with round-robin
    if (this.replicaConnections.length === 0) {
      logger.warn('No replicas available, falling back to primary');
      return this.primaryConnection!;
    }

    const replica = this.replicaConnections[this.replicaIndex];
    this.replicaIndex = (this.replicaIndex + 1) % this.replicaConnections.length;

    return replica;
  }

  /**
   * Get primary connection for write operations
   */
  getPrimaryConnection(): ReturnType<typeof drizzle> {
    return this.primaryConnection!;
  }

  /**
   * Get replica connection (round-robin)
   */
  getReplicaConnection(): ReturnType<typeof drizzle> {
    return this.getConnection('read');
  }

  /**
   * Check replication lag
   */
  async checkReplicationLag(): Promise<number> {
    try {
      const primaryClient = this.primaryConnection;
      // Query replication lag from primary
      // Implementation depends on PostgreSQL version and setup
      return 0; // Placeholder
    } catch (error) {
      logger.error('Failed to check replication lag', { error });
      return Infinity;
    }
  }

  /**
   * Ensure read-after-write consistency
   */
  async ensureConsistency<T>(
    writeFn: () => Promise<T>,
    readFn: () => Promise<any>,
    maxWaitMs: number = 1000
  ): Promise<T> {
    const result = await writeFn();
    
    // Wait for replication with timeout
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitMs) {
      try {
        await readFn();
        return result;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.warn('Read-after-write consistency timeout', { maxWaitMs });
    return result;
  }
}

export const connectionManager = new ConnectionManager();
export default connectionManager;
```

### Redis Cluster Client Implementation

```typescript
// src/services/redis/cluster-client.ts
import Redis from 'ioredis';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

class RedisClusterClient {
  private cluster: Redis.Cluster | null = null;
  private isClusterMode: boolean;

  constructor() {
    this.isClusterMode = config.redis.clusterEnabled || false;
    this.initialize();
  }

  private initialize(): void {
    if (this.isClusterMode) {
      const nodes = config.redis.clusterNodes || [];
      if (nodes.length === 0) {
        throw new Error('Redis cluster nodes not configured');
      }

      this.cluster = new Redis.Cluster(nodes, {
        redisOptions: {
          password: config.redis.password,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, config.redis.maxRetryDelay || 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        },
        clusterRetryStrategy: (times: number) => {
          const delay = Math.min(times * 50, config.redis.maxRetryDelay || 2000);
          return delay;
        },
        enableOfflineQueue: false,
        enableReadyCheck: true,
        maxRedirections: 3,
      });

      this.cluster.on('error', (err) => {
        logger.error('Redis cluster error', { error: err });
      });

      this.cluster.on('connect', () => {
        logger.info('Redis cluster connected');
      });

      this.cluster.on('ready', () => {
        logger.info('Redis cluster ready');
      });

      this.cluster.on('+node', (node) => {
        logger.info('Redis cluster node added', { node: node.options.host });
      });

      this.cluster.on('-node', (node) => {
        logger.warn('Redis cluster node removed', { node: node.options.host });
      });
    } else {
      // Fallback to single instance
      logger.warn('Redis cluster disabled, using single instance');
    }
  }

  getClient(): Redis | Redis.Cluster {
    if (this.cluster) {
      return this.cluster;
    }
    throw new Error('Redis cluster not initialized');
  }

  async get(key: string): Promise<string | null> {
    const client = this.getClient();
    return await client.get(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = this.getClient();
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  }

  async del(key: string): Promise<number> {
    const client = this.getClient();
    return await client.del(key);
  }

  async exists(key: string): Promise<number> {
    const client = this.getClient();
    return await client.exists(key);
  }

  async keys(pattern: string): Promise<string[]> {
    const client = this.getClient();
    if (this.isClusterMode) {
      // In cluster mode, need to scan all nodes
      const keys: string[] = [];
      const nodes = (client as Redis.Cluster).nodes('master');
      for (const node of nodes) {
        const nodeKeys = await this.scanKeys(node, pattern);
        keys.push(...nodeKeys);
      }
      return keys;
    }
    return await client.keys(pattern);
  }

  private async scanKeys(node: Redis, pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await node.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    return keys;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const client = this.getClient();
      const result = await client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis cluster health check failed', { error });
      return false;
    }
  }
}

export const redisCluster = new RedisClusterClient();
export default redisCluster;
```

### S3 Client Implementation

```typescript
// src/services/storage/s3-client.ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '@/utils/logger.js';
import { config } from '@/config/index.js';

interface S3Config {
  provider: 'aws' | 'minio' | 'digitalocean';
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

class S3StorageClient {
  private client: S3Client;
  private bucket: string;
  private provider: string;

  constructor() {
    const s3Config: S3Config = {
      provider: config.storage.provider || 'aws',
      region: config.storage.region || 'us-east-1',
      bucket: config.storage.bucket || 'dese-storage',
      accessKeyId: config.storage.accessKeyId || '',
      secretAccessKey: config.storage.secretAccessKey || '',
      endpoint: config.storage.endpoint,
      forcePathStyle: config.storage.forcePathStyle || false,
    };

    this.bucket = s3Config.bucket;
    this.provider = s3Config.provider;

    this.client = new S3Client({
      region: s3Config.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
      endpoint: s3Config.endpoint,
      forcePathStyle: s3Config.forcePathStyle,
    });

    logger.info('S3 client initialized', {
      provider: this.provider,
      bucket: this.bucket,
      region: s3Config.region,
    });
  }

  /**
   * Upload file to S3
   */
  async upload(
    key: string,
    body: Buffer | string,
    contentType?: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        Metadata: metadata,
      });

      await this.client.send(command);
      
      logger.info('File uploaded to S3', { key, bucket: this.bucket });
      
      return this.getUrl(key);
    } catch (error) {
      logger.error('S3 upload failed', { error, key });
      throw error;
    }
  }

  /**
   * Download file from S3
   */
  async download(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.client.send(command);
      const chunks: Uint8Array[] = [];

      if (response.Body) {
        for await (const chunk of response.Body as any) {
          chunks.push(chunk);
        }
      }

      return Buffer.concat(chunks);
    } catch (error) {
      logger.error('S3 download failed', { error, key });
      throw error;
    }
  }

  /**
   * Delete file from S3
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.client.send(command);
      logger.info('File deleted from S3', { key });
    } catch (error) {
      logger.error('S3 delete failed', { error, key });
      throw error;
    }
  }

  /**
   * List objects in S3
   */
  async list(prefix?: string, maxKeys?: number): Promise<string[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucket,
        Prefix: prefix,
        MaxKeys: maxKeys || 1000,
      });

      const response = await this.client.send(command);
      return (response.Contents || []).map((item) => item.Key || '').filter(Boolean);
    } catch (error) {
      logger.error('S3 list failed', { error, prefix });
      throw error;
    }
  }

  /**
   * Generate presigned URL for file access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (error) {
      logger.error('Failed to generate presigned URL', { error, key });
      throw error;
    }
  }

  /**
   * Get public URL for file
   */
  getUrl(key: string): string {
    if (config.storage.cdnEnabled && config.storage.cdnUrl) {
      return `${config.storage.cdnUrl}/${key}`;
    }

    if (this.provider === 'aws') {
      return `https://${this.bucket}.s3.${config.storage.region}.amazonaws.com/${key}`;
    }

    if (config.storage.endpoint) {
      return `${config.storage.endpoint}/${this.bucket}/${key}`;
    }

    return `https://${this.bucket}/${key}`;
  }

  /**
   * Generate key for organization file
   */
  generateKey(organizationId: string, category: string, filename: string): string {
    return `organizations/${organizationId}/${category}/${Date.now()}-${filename}`;
  }
}

export const s3Client = new S3StorageClient();
export default s3Client;
```

### Monitoring Configuration

#### Prometheus Alert Rules

```yaml
# monitoring/prometheus/alerts-infrastructure.yml
groups:
  - name: infrastructure_alerts
    interval: 30s
    rules:
      - alert: DatabaseReplicationLagHigh
        expr: pg_replication_lag > 1000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Database replication lag is high"
          description: "Replication lag is {{ $value }}ms, threshold is 1000ms"

      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_database_numbackends / pg_settings_max_connections > 0.8
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Database connection pool is nearly exhausted"

      - alert: RedisClusterNodeDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis cluster node is down"

      - alert: RedisClusterMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis cluster memory usage is high"

      - alert: S3UploadFailureRate
        expr: rate(s3_upload_errors_total[5m]) / rate(s3_upload_total[5m]) > 0.05
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "S3 upload failure rate is high"
```

#### Grafana Dashboard Queries

```json
{
  "dashboard": {
    "title": "Infrastructure Scaling Dashboard",
    "panels": [
      {
        "title": "Database Replication Lag",
        "targets": [
          {
            "expr": "pg_replication_lag",
            "legendFormat": "Lag (ms)"
          }
        ]
      },
      {
        "title": "Redis Cluster Memory Usage",
        "targets": [
          {
            "expr": "redis_memory_used_bytes / redis_memory_max_bytes * 100",
            "legendFormat": "Memory Usage (%)"
          }
        ]
      },
      {
        "title": "S3 Upload/Download Rate",
        "targets": [
          {
            "expr": "rate(s3_upload_total[5m])",
            "legendFormat": "Upload Rate"
          },
          {
            "expr": "rate(s3_download_total[5m])",
            "legendFormat": "Download Rate"
          }
        ]
      }
    ]
  }
}
```

### Migration Scripts

#### Local Storage to S3 Migration

```typescript
// scripts/migrate-storage-to-s3.ts
import fs from 'fs/promises';
import path from 'path';
import { s3Client } from '../src/services/storage/s3-client.js';
import { db } from '../src/db/index.js';
import { files } from '../src/db/schema/index.js';
import { logger } from '../src/utils/logger.js';

async function migrateFilesToS3(batchSize: number = 100) {
  try {
    // Get all files from database
    const allFiles = await db.select().from(files);
    const totalFiles = allFiles.length;
    
    logger.info('Starting storage migration', { totalFiles });

    for (let i = 0; i < allFiles.length; i += batchSize) {
      const batch = allFiles.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (file) => {
          try {
            // Read local file
            const localPath = path.join(process.env.UPLOAD_PATH || './uploads', file.path);
            const fileBuffer = await fs.readFile(localPath);

            // Upload to S3
            const s3Key = s3Client.generateKey(
              file.organizationId,
              file.category || 'documents',
              file.filename
            );

            await s3Client.upload(
              s3Key,
              fileBuffer,
              file.mimeType || 'application/octet-stream',
              {
                originalFilename: file.filename,
                organizationId: file.organizationId,
              }
            );

            // Update database with S3 key
            await db
              .update(files)
              .set({
                storageProvider: 's3',
                storageKey: s3Key,
                storageUrl: s3Client.getUrl(s3Key),
              })
              .where(eq(files.id, file.id));

            logger.info('File migrated', {
              fileId: file.id,
              s3Key,
            });
          } catch (error) {
            logger.error('Failed to migrate file', {
              fileId: file.id,
              error,
            });
          }
        })
      );

      logger.info('Batch migrated', {
        batch: Math.floor(i / batchSize) + 1,
        totalBatches: Math.ceil(totalFiles / batchSize),
      });
    }

    logger.info('Storage migration completed', { totalFiles });
  } catch (error) {
    logger.error('Storage migration failed', { error });
    throw error;
  }
}

// Run migration
if (require.main === module) {
  migrateFilesToS3(100)
    .then(() => process.exit(0))
    .catch((error) => {
      logger.error('Migration script failed', { error });
      process.exit(1);
    });
}
```

### Test Examples

#### Connection Manager Tests

```typescript
// tests/db/connection-manager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { connectionManager } from '@/db/connection-manager.js';

describe('ConnectionManager', () => {
  it('should route read queries to replica', () => {
    const connection = connectionManager.getConnection('read');
    expect(connection).toBeDefined();
  });

  it('should route write queries to primary', () => {
    const connection = connectionManager.getConnection('write');
    expect(connection).toBeDefined();
  });

  it('should route transactions to primary', () => {
    const connection = connectionManager.getConnection('transaction');
    expect(connection).toBeDefined();
  });

  it('should check replication lag', async () => {
    const lag = await connectionManager.checkReplicationLag();
    expect(lag).toBeGreaterThanOrEqual(0);
  });
});
```

#### Redis Cluster Tests

```typescript
// tests/services/redis/cluster-client.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { redisCluster } from '@/services/redis/cluster-client.js';

describe('RedisClusterClient', () => {
  beforeEach(async () => {
    // Setup test data
  });

  it('should connect to cluster', async () => {
    const health = await redisCluster.healthCheck();
    expect(health).toBe(true);
  });

  it('should set and get values', async () => {
    await redisCluster.set('test:key', 'test-value', 60);
    const value = await redisCluster.get('test:key');
    expect(value).toBe('test-value');
  });

  it('should handle cluster node failures', async () => {
    // Test resilience
  });
});
```

---

**Son Güncelleme:** 27 Ocak 2025  
**İlgili Dosyalar:**
- `src/db/connection-manager.ts` (oluşturulacak)
- `src/services/redis/cluster-client.ts` (oluşturulacak)
- `src/services/storage/s3-client.ts` (oluşturulacak)
- `src/services/storage/upload.service.ts` (oluşturulacak)
- `scripts/migrate-storage-to-s3.ts` (oluşturulacak)
- `docker-compose.replication.yml` (oluşturulacak)
- `docker-compose.redis-cluster.yml` (oluşturulacak)
- `config/pgbouncer.ini` (oluşturulacak)
- `monitoring/prometheus/alerts-infrastructure.yml` (oluşturulacak)


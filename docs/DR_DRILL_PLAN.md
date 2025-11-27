# 🧪 DR Drill Plan - DESE EA PLAN v7.0

**Version:** 1.0.0  
**Oluşturulma Tarihi:** 27 Kasım 2025  
**Son Güncelleme:** 27 Kasım 2025  
**Onaylayan:** DESE Teknik Değerlendirme Kurulu

---

## 📋 İçindekiler

1. [Overview](#overview)
2. [Drill Types](#drill-types)
3. [Drill Schedule](#drill-schedule)
4. [Detailed Procedures](#detailed-procedures)
5. [Checklists](#checklists)
6. [Reporting](#reporting)

---

## 📊 Overview

Bu doküman, DESE EA PLAN v7.0 sisteminin disaster recovery drill (felaketten kurtarma tatbikatı) planını içermektedir. Düzenli DR drilleri, sistemin felaket senaryolarına hazırlıklı olmasını sağlar.

### Objectives

1. **Validation**: DR prosedürlerinin çalıştığını doğrulama
2. **Training**: Ekibin DR süreçlerine aşinalığını artırma
3. **Improvement**: Süreçlerdeki eksiklikleri tespit ve iyileştirme
4. **Compliance**: Düzenleyici gereksinimlere uyum

### Success Criteria

| Metric | Target | Acceptable |
|--------|--------|------------|
| RTO | < 4 hours | < 6 hours |
| RPO | < 1 hour | < 2 hours |
| Data Integrity | 100% | 99.9% |
| Service Availability | 100% | 95% |

---

## 🎯 Drill Types

### 1. Tabletop Exercise (Masa Başı Tatbikatı)

**Frequency:** Quarterly  
**Duration:** 2 hours  
**Participants:** All teams

**Description:**
- Simülasyon senaryosu üzerinden tartışma
- Gerçek sistem değişikliği yok
- Karar alma süreçlerinin test edilmesi

**Scenarios:**
- Complete data center failure
- Ransomware attack
- Database corruption
- Network outage

### 2. Component Recovery Test (Bileşen Kurtarma Testi)

**Frequency:** Monthly  
**Duration:** 2-4 hours  
**Participants:** DevOps Team

**Description:**
- Tek bir bileşenin (DB, Redis) kurtarma testi
- Staging ortamında gerçekleştirilir
- Backup integrity doğrulama

**Components:**
- PostgreSQL backup/restore
- Redis backup/restore
- S3 replication verification

### 3. Failover Test (Yük Devri Testi)

**Frequency:** Quarterly  
**Duration:** 2 hours  
**Participants:** DevOps + Engineering

**Description:**
- Database replica promotion
- Load balancer failover
- DNS switchover

### 4. Full DR Drill (Tam DR Tatbikatı)

**Frequency:** Annually  
**Duration:** 8 hours  
**Participants:** All teams + Management

**Description:**
- Complete system recovery to DR site
- End-to-end validation
- Performance and data integrity checks

---

## 📅 Drill Schedule

### 2025-2026 Schedule

| Month | Drill Type | Focus Area |
|-------|------------|------------|
| December 2025 | Component Recovery | PostgreSQL |
| January 2026 | Tabletop | Ransomware Scenario |
| February 2026 | Component Recovery | Redis |
| March 2026 | Failover Test | Database Replica |
| April 2026 | Tabletop | Data Center Failure |
| May 2026 | Component Recovery | S3 Replication |
| June 2026 | Full DR Drill | Complete Recovery |
| July 2026 | Tabletop | Security Breach |
| August 2026 | Component Recovery | PostgreSQL |
| September 2026 | Failover Test | DNS Switchover |
| October 2026 | Tabletop | Network Outage |
| November 2026 | Component Recovery | All Components |
| December 2026 | Full DR Drill | Annual Assessment |

---

## 📝 Detailed Procedures

### Procedure 1: PostgreSQL Recovery Test

**Duration:** 2-3 hours  
**Environment:** Staging  
**Risk Level:** Low

#### Pre-Drill Checklist
- [ ] Notify stakeholders (24h before)
- [ ] Verify staging environment is available
- [ ] Confirm latest backup availability
- [ ] Prepare monitoring dashboards
- [ ] Document current database state

#### Drill Steps

```bash
# Step 1: Document current state
psql -h staging-db -U dese -c "SELECT COUNT(*) FROM users;" > /tmp/pre_drill_state.txt
psql -h staging-db -U dese -c "SELECT MAX(updated_at) FROM transactions;" >> /tmp/pre_drill_state.txt

# Step 2: Simulate failure (stop primary database)
kubectl scale deployment postgresql --replicas=0 -n staging

# Step 3: Start timer
echo "Drill started at: $(date)" >> /tmp/drill_log.txt

# Step 4: Execute restore procedure
./scripts/backup/restore-postgresql.sh --latest --verify

# Step 5: Verify data integrity
psql -h staging-db -U dese -c "SELECT COUNT(*) FROM users;" > /tmp/post_drill_state.txt
diff /tmp/pre_drill_state.txt /tmp/post_drill_state.txt

# Step 6: Stop timer and record RTO
echo "Drill completed at: $(date)" >> /tmp/drill_log.txt
```

#### Post-Drill Checklist
- [ ] Record actual RTO achieved
- [ ] Document any issues encountered
- [ ] Restore normal operations
- [ ] Clean up drill artifacts
- [ ] Complete drill report

---

### Procedure 2: Redis Recovery Test

**Duration:** 1-2 hours  
**Environment:** Staging  
**Risk Level:** Low

#### Pre-Drill Checklist
- [ ] Notify team
- [ ] Verify backup availability
- [ ] Document current cache state

#### Drill Steps

```bash
# Step 1: Record current state
redis-cli -h staging-redis INFO keyspace > /tmp/redis_pre_state.txt

# Step 2: Simulate failure
kubectl delete pod redis-0 -n staging

# Step 3: Start timer
DRILL_START=$(date +%s)

# Step 4: Execute restore
./scripts/backup/restore-redis.sh --latest --verify

# Step 5: Verify recovery
redis-cli -h staging-redis PING

# Step 6: Calculate RTO
DRILL_END=$(date +%s)
echo "RTO: $((DRILL_END - DRILL_START)) seconds"
```

---

### Procedure 3: Database Failover Test

**Duration:** 1-2 hours  
**Environment:** Staging  
**Risk Level:** Medium

#### Pre-Drill Checklist
- [ ] Verify replica is in sync
- [ ] Notify stakeholders
- [ ] Prepare rollback plan

#### Drill Steps

```bash
# Step 1: Verify replication lag
psql -h replica -U dese -c "SELECT pg_last_wal_receive_lsn() - pg_last_wal_replay_lsn() AS lag;"

# Step 2: Start timer
DRILL_START=$(date +%s)

# Step 3: Stop primary (simulate failure)
kubectl scale statefulset postgresql --replicas=0 -n staging

# Step 4: Promote replica
psql -h replica -U dese -c "SELECT pg_promote();"

# Step 5: Update connection strings
kubectl set env deployment/dese-ea-plan POSTGRES_HOST=replica -n staging

# Step 6: Verify application connectivity
curl -s http://staging-api/api/v1/health | jq .checks.database

# Step 7: Calculate failover time
DRILL_END=$(date +%s)
echo "Failover time: $((DRILL_END - DRILL_START)) seconds"
```

---

### Procedure 4: Full DR Drill

**Duration:** 8 hours  
**Environment:** DR Site  
**Risk Level:** High

#### Pre-Drill Checklist (1 Week Before)
- [ ] Schedule with all stakeholders
- [ ] Verify DR site infrastructure
- [ ] Confirm cross-region backup replication
- [ ] Prepare communication plan
- [ ] Assign roles and responsibilities
- [ ] Conduct briefing session

#### Team Roles

| Role | Responsibility | Primary | Backup |
|------|----------------|---------|--------|
| Drill Coordinator | Overall coordination | TBD | TBD |
| Infrastructure Lead | Server/network recovery | TBD | TBD |
| Database Lead | Database restoration | TBD | TBD |
| Application Lead | App deployment/testing | TBD | TBD |
| Communications Lead | Stakeholder updates | TBD | TBD |
| Scribe | Documentation | TBD | TBD |

#### Drill Timeline

| Time | Activity | Owner |
|------|----------|-------|
| T+0 | Kick-off meeting | Coordinator |
| T+15min | Declare disaster scenario | Coordinator |
| T+30min | Infrastructure assessment | Infra Lead |
| T+1h | Begin infrastructure provisioning | Infra Lead |
| T+2h | Database restoration begins | DB Lead |
| T+3h | Database restoration complete | DB Lead |
| T+3.5h | Application deployment | App Lead |
| T+4h | Application testing begins | App Lead |
| T+5h | DNS switchover | Infra Lead |
| T+6h | Full validation testing | All |
| T+7h | Cleanup and restoration | All |
| T+8h | Debrief and lessons learned | Coordinator |

#### Drill Steps

```bash
# Phase 1: Preparation (T+0 to T+30min)
echo "=== DR DRILL INITIATED ===" | tee /var/log/dr_drill.log
date >> /var/log/dr_drill.log

# Verify DR site connectivity
ping -c 3 dr-site.example.com

# Phase 2: Infrastructure (T+30min to T+2h)
./scripts/dr/full-recovery.sh --region us-east-1 --dry-run
./scripts/dr/full-recovery.sh --region us-east-1

# Phase 3: Database (T+2h to T+3h)
./scripts/backup/restore-postgresql.sh --latest --from-s3 us-east-1 --verify
./scripts/backup/restore-redis.sh --latest --from-s3 us-east-1 --verify

# Phase 4: Application (T+3h to T+4h)
kubectl apply -f k8s/ -n dese-ea-plan
kubectl wait --for=condition=available deployment --all -n dese-ea-plan --timeout=600s

# Phase 5: Validation (T+4h to T+6h)
./scripts/dr/validate-recovery.sh

# Phase 6: DNS Switchover (T+5h to T+6h)
# MANUAL STEP - Requires approval

# Phase 7: Cleanup (T+7h to T+8h)
# Return DNS to primary
# Scale down DR site
```

---

## ✅ Checklists

### Pre-Drill Notification Template

```
Subject: [DR DRILL] Scheduled for {DATE} - {DRILL_TYPE}

Team,

A {DRILL_TYPE} DR drill is scheduled for:

Date: {DATE}
Time: {START_TIME} - {END_TIME}
Environment: {ENVIRONMENT}
Participants: {TEAM_LIST}

Please ensure:
1. You are available during the drill window
2. Your access to required systems is verified
3. You have reviewed the drill procedures

Contact: {COORDINATOR_NAME}

Thank you.
```

### Post-Drill Report Template

```markdown
# DR Drill Report

## Basic Information
- **Date:** {DATE}
- **Drill Type:** {TYPE}
- **Duration:** {DURATION}
- **Coordinator:** {NAME}

## Objectives
- [ ] Objective 1
- [ ] Objective 2

## Results

### Metrics Achieved
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| RTO | 4h | X h | ✅/❌ |
| RPO | 1h | X min | ✅/❌ |

### Issues Discovered
1. **Issue:** {Description}
   - **Impact:** {Impact}
   - **Resolution:** {Resolution}
   - **Follow-up:** {Action item}

### Timeline
| Step | Planned | Actual | Delta |
|------|---------|--------|-------|
| Step 1 | T+Xm | T+Xm | +Xm |

## Lessons Learned
1. {Lesson 1}
2. {Lesson 2}

## Action Items
- [ ] {Action 1} - Owner: {Name} - Due: {Date}
- [ ] {Action 2} - Owner: {Name} - Due: {Date}

## Recommendations
1. {Recommendation 1}
2. {Recommendation 2}

## Participants
- {Name} - {Role}

## Attachments
- Drill log: {link}
- Monitoring screenshots: {link}
```

---

## 📊 Metrics Tracking

### Drill History Dashboard

Track drill results over time:

```
| Date | Type | RTO Target | RTO Actual | RPO Target | RPO Actual | Status |
|------|------|------------|------------|------------|------------|--------|
| 2025-12 | Component | 2h | - | 30m | - | Scheduled |
```

### Improvement Trend

After each drill, track:
- Issues discovered
- Issues resolved from previous drills
- Overall RTO/RPO improvement

---

## 📚 Related Documentation

- [DISASTER_RECOVERY_PLAN.md](./DISASTER_RECOVERY_PLAN.md) - Full DR plan
- [CAPACITY_PLANNING.md](./CAPACITY_PLANNING.md) - Capacity guidelines
- [OPERATIONS_GUIDE.md](./OPERATIONS_GUIDE.md) - Operations procedures

---

## 📝 Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-11-27 | DevOps Team | Initial DR drill plan |

---

**⚠️ Bu doküman düzenli olarak gözden geçirilmeli ve güncellenmelidir.**


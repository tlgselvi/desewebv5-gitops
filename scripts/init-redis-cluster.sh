#!/bin/bash
# Redis Cluster Initialization Script
# This script initializes a Redis cluster with 3 masters and 3 replicas

set -e

REDIS_PASSWORD=${REDIS_PASSWORD:-}
CLUSTER_NODES=${CLUSTER_NODES:-"redis-cluster-0:6379 redis-cluster-1:6379 redis-cluster-2:6379 redis-cluster-3:6379 redis-cluster-4:6379 redis-cluster-5:6379"}

echo "Initializing Redis cluster..."

# Wait for all nodes to be ready
echo "Waiting for all cluster nodes to be ready..."
for node in $CLUSTER_NODES; do
  host=$(echo $node | cut -d: -f1)
  port=$(echo $node | cut -d: -f2)
  
  echo "Checking $host:$port..."
  until redis-cli -h $host -p $port ping > /dev/null 2>&1; do
    echo "Waiting for $host:$port..."
    sleep 2
  done
  echo "$host:$port is ready"
done

echo "All nodes are ready. Creating cluster..."

# Create cluster
if [ -z "$REDIS_PASSWORD" ]; then
  redis-cli --cluster create $CLUSTER_NODES --cluster-replicas 1 --cluster-yes
else
  redis-cli --cluster create $CLUSTER_NODES --cluster-replicas 1 --cluster-yes -a "$REDIS_PASSWORD"
fi

echo "Cluster initialization completed!"

# Verify cluster status
echo "Verifying cluster status..."
if [ -z "$REDIS_PASSWORD" ]; then
  redis-cli --cluster check $(echo $CLUSTER_NODES | cut -d' ' -f1)
else
  redis-cli --cluster check $(echo $CLUSTER_NODES | cut -d' ' -f1) -a "$REDIS_PASSWORD"
fi

echo "Redis cluster is ready!"


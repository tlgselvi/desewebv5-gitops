#!/bin/bash
# ===============================================
# Docker Performance Optimization Script
# ===============================================

set -e

echo "🐳 Docker Performance Optimization"
echo "================================="
echo ""

# 1. Enable BuildKit
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

echo "✅ BuildKit enabled"
echo ""

# 2. Clean up unused resources
echo "🧹 Cleaning up unused Docker resources..."
echo ""

# Remove stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes
docker volume prune -f

# Remove build cache
docker builder prune -f

echo ""
echo "✅ Cleanup completed"
echo ""

# 3. Show disk usage
echo "📊 Docker Disk Usage:"
docker system df

echo ""
echo "✅ Docker optimized!"
echo ""


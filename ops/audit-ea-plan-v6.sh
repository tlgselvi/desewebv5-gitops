#!/bin/bash
# EA Plan v6.x Genel Denetim Script
# Kullanım: ./audit-ea-plan-v6.sh [section]
# Sections: all, configmaps, manifests, observability, security, automation, health

set -e

NAMESPACE_EA_WEB="ea-web"
NAMESPACE_MONITORING="monitoring"
NAMESPACE_DESEWEB="dese-ea-plan-v5"

echo "🔍 EA PLAN v6.x Genel Denetim Başlatılıyor..."
echo "Date: $(date)"
echo "Kubernetes Context: $(kubectl config current-context)"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

check_configmaps() {
    echo "📋 ConfigMaps Kontrolü..."
    echo "---"
    
    configmaps=(
        "ea-plan-v6-4:${NAMESPACE_EA_WEB}"
        "adaptive-tuning-config:${NAMESPACE_EA_WEB}"
        "security-hardening-config:${NAMESPACE_EA_WEB}"
        "self-healing-config:${NAMESPACE_EA_WEB}"
        "predictive-scaling-config:${NAMESPACE_MONITORING}"
        "final-optimization-config:${NAMESPACE_EA_WEB}"
    )
    
    for item in "${configmaps[@]}"; do
        name=$(echo $item | cut -d: -f1)
        ns=$(echo $item | cut -d: -f2)
        if kubectl get configmap $name -n $ns >/dev/null 2>&1; then
            echo -e "${GREEN}✅${NC} $name ($ns)"
        else
            echo -e "${RED}❌${NC} $name ($ns) - NOT FOUND"
        fi
    done
    echo ""
}

check_manifests() {
    echo "📦 Manifests Kontrolü..."
    echo "---"
    
    # HPA
    if kubectl get hpa ea-web-autoscaler -n $NAMESPACE_EA_WEB >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} ea-web-autoscaler (HPA)"
    else
        echo -e "${RED}❌${NC} ea-web-autoscaler - NOT FOUND"
    fi
    
    # CronJob
    if kubectl get cronjob seo-observer -n $NAMESPACE_MONITORING >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} seo-observer (CronJob)"
    else
        echo -e "${RED}❌${NC} seo-observer - NOT FOUND"
    fi
    
    # Jobs
    if kubectl get job aiops-tuning -n $NAMESPACE_MONITORING >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} aiops-tuning (Job)"
    else
        echo -e "${YELLOW}⚠️${NC}  aiops-tuning - NOT FOUND (may be completed)"
    fi
    
    echo ""
}

check_observability() {
    echo "📊 Observability Stack Kontrolü..."
    echo "---"
    
    # Prometheus
    if kubectl get pods -n $NAMESPACE_MONITORING -l app=prometheus --no-headers 2>&1 | grep -q Running; then
        echo -e "${GREEN}✅${NC} Prometheus - Running"
    else
        echo -e "${RED}❌${NC} Prometheus - NOT Running"
    fi
    
    # Grafana
    if kubectl get pods -n $NAMESPACE_MONITORING -l app=grafana --no-headers 2>&1 | grep -q Running; then
        echo -e "${GREEN}✅${NC} Grafana - Running"
    else
        echo -e "${RED}❌${NC} Grafana - NOT Running"
    fi
    
    # Jaeger
    if kubectl get pods -n $NAMESPACE_MONITORING | grep -qi jaeger; then
        echo -e "${GREEN}✅${NC} Jaeger - Found"
    else
        echo -e "${YELLOW}⚠️${NC}  Jaeger - NOT Found (may be using Tempo)"
    fi
    
    echo ""
}

check_security() {
    echo "🔒 Security Policies Kontrolü..."
    echo "---"
    
    # Network Policies
    np_count=$(kubectl get networkpolicy -n $NAMESPACE_EA_WEB --no-headers 2>&1 | wc -l)
    if [ $np_count -gt 0 ]; then
        echo -e "${GREEN}✅${NC} Network Policies - $np_count found in $NAMESPACE_EA_WEB"
    else
        echo -e "${RED}❌${NC} Network Policies - NONE"
    fi
    
    # Pod Security Standards
    pss_ea=$(kubectl get ns $NAMESPACE_EA_WEB -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}' 2>/dev/null || echo "")
    pss_mon=$(kubectl get ns $NAMESPACE_MONITORING -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}' 2>/dev/null || echo "")
    
    if [ -n "$pss_ea" ]; then
        echo -e "${GREEN}✅${NC} Pod Security Standards - ea-web: $pss_ea"
    else
        echo -e "${YELLOW}⚠️${NC}  Pod Security Standards - ea-web: NOT SET"
    fi
    
    if [ -n "$pss_mon" ]; then
        echo -e "${GREEN}✅${NC} Pod Security Standards - monitoring: $pss_mon"
    else
        echo -e "${YELLOW}⚠️${NC}  Pod Security Standards - monitoring: NOT SET"
    fi
    
    echo ""
}

check_automation() {
    echo "🤖 Automation Kontrolü..."
    echo "---"
    
    # Self-healing config
    if kubectl get configmap self-healing-config -n $NAMESPACE_EA_WEB >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Self-Healing Config - Active"
    else
        echo -e "${RED}❌${NC} Self-Healing Config - NOT FOUND"
    fi
    
    # Adaptive tuning config
    if kubectl get configmap adaptive-tuning-config -n $NAMESPACE_EA_WEB >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Adaptive Tuning Config - Active"
    else
        echo -e "${RED}❌${NC} Adaptive Tuning Config - NOT FOUND"
    fi
    
    # Predictive scaling config
    if kubectl get configmap predictive-scaling-config -n $NAMESPACE_MONITORING >/dev/null 2>&1; then
        echo -e "${GREEN}✅${NC} Predictive Scaling Config - Active"
    else
        echo -e "${RED}❌${NC} Predictive Scaling Config - NOT FOUND"
    fi
    
    echo ""
}

check_health() {
    echo "🏥 Sistem Sağlık Durumu..."
    echo "---"
    
    # Pod status
    running=$(kubectl get pods -A --no-headers 2>&1 | grep Running | wc -l)
    completed=$(kubectl get pods -A --no-headers 2>&1 | grep Completed | wc -l)
    failed=$(kubectl get pods -A --no-headers 2>&1 | grep -E "Failed|CrashLoopBackOff|Error" | wc -l)
    
    echo "Running Pods: $running"
    echo "Completed Pods: $completed"
    
    if [ $failed -gt 0 ]; then
        echo -e "${RED}Failed/Error Pods: $failed${NC}"
        kubectl get pods -A --no-headers | grep -E "Failed|CrashLoopBackOff|Error" | head -5
    else
        echo -e "${GREEN}Failed/Error Pods: 0${NC}"
    fi
    
    # Deployment status
    echo ""
    echo "Deployment Status:"
    kubectl get deployments -A --no-headers | while read line; do
        ns=$(echo $line | awk '{print $1}')
        name=$(echo $line | awk '{print $2}')
        desired=$(echo $line | awk '{print $3}' | cut -d/ -f1)
        ready=$(echo $line | awk '{print $3}' | cut -d/ -f2)
        if [ "$desired" != "$ready" ]; then
            echo -e "${YELLOW}⚠️${NC}  $ns/$name: $ready/$desired ready"
        else
            echo -e "${GREEN}✅${NC} $ns/$name: $ready/$desired ready"
        fi
    done
    
    echo ""
}

check_sprint_status() {
    echo "📊 Sprint Durumu..."
    echo "---"
    
    if kubectl get configmap ea-plan-v6-4 -n $NAMESPACE_EA_WEB >/dev/null 2>&1; then
        version=$(kubectl get configmap ea-plan-v6-4 -n $NAMESPACE_EA_WEB -o jsonpath='{.data.Version}' 2>/dev/null || echo "N/A")
        stage=$(kubectl get configmap ea-plan-v6-4 -n $NAMESPACE_EA_WEB -o jsonpath='{.data.stage}' 2>/dev/null || echo "N/A")
        phase=$(kubectl get configmap ea-plan-v6-4 -n $NAMESPACE_EA_WEB -o jsonpath='{.data.Phase}' 2>/dev/null || echo "N/A")
        
        echo "Version: $version"
        echo "Stage: $stage"
        echo "Phase: $phase"
    else
        echo -e "${RED}❌${NC} Sprint metadata (ea-plan-v6-4) - NOT FOUND"
    fi
    
    echo ""
}

# Main
case "${1:-all}" in
    configmaps)
        check_configmaps
        ;;
    manifests)
        check_manifests
        ;;
    observability)
        check_observability
        ;;
    security)
        check_security
        ;;
    automation)
        check_automation
        ;;
    health)
        check_health
        ;;
    sprint)
        check_sprint_status
        ;;
    all)
        check_configmaps
        check_manifests
        check_observability
        check_security
        check_automation
        check_health
        check_sprint_status
        ;;
    *)
        echo "Kullanım: $0 [section]"
        echo "Sections: all, configmaps, manifests, observability, security, automation, health, sprint"
        exit 1
        ;;
esac

echo "✅ Denetim tamamlandı."


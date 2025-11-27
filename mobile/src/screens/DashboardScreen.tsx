/**
 * Dashboard Screen
 * 
 * Main dashboard with overview metrics
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuthStore } from '../store/authStore.js';
import { api } from '../services/api.js';
import type { DashboardMetrics, RecentActivity } from '../types/index.js';

interface DashboardData {
  metrics: DashboardMetrics;
  recentActivity: RecentActivity[];
}

export function DashboardScreen({ navigation }: any) {
  const user = useAuthStore((state) => state.user);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.dashboard.getOverview();
      setData(response.data);
    } catch (error) {
      console.error('Dashboard load failed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  if (loading && !data) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Merhaba, {user?.name || 'Kullanıcı'}
        </Text>
      </View>

      {data && (
        <>
          <View style={styles.metricsContainer}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Gelir</Text>
              <Text style={styles.metricValue}>
                {data.metrics.revenue.toLocaleString('tr-TR')} ₺
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Gider</Text>
              <Text style={styles.metricValue}>
                {data.metrics.expenses.toLocaleString('tr-TR')} ₺
              </Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Aktif Anlaşmalar</Text>
              <Text style={styles.metricValue}>{data.metrics.activeDeals}</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Bekleyen Faturalar</Text>
              <Text style={styles.metricValue}>
                {data.metrics.pendingInvoices}
              </Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Aktiviteler</Text>
            {data.recentActivity.map((activity) => (
              <TouchableOpacity key={activity.id} style={styles.activityItem}>
                <Text style={styles.activityType}>{activity.type}</Text>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityTime}>{activity.timestamp}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  metricsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    margin: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  section: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1a1a1a',
  },
  activityItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  activityType: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 5,
  },
  activityTitle: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 5,
  },
  activityTime: {
    fontSize: 12,
    color: '#666',
  },
});


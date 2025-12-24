import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

const RUPEE = '₹';

interface Earnings {
  total_earnings: number;
  total_jobs: number;
  today_earnings: number;
  today_jobs: number;
}

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const data = await api.getBCEarnings();
      setEarnings(data);
    } catch (error) {
      console.log('Error loading earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadEarnings();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.pageTitle}>Earnings</Text>

        {/* Today's Stats */}
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>Today</Text>
          <View style={styles.todayContent}>
            <View style={styles.todayEarnings}>
              <Text style={styles.todayAmount}>{RUPEE}{earnings?.today_earnings || 0}</Text>
              <Text style={styles.todaySubtext}>earned</Text>
            </View>
            <View style={styles.todayDivider} />
            <View style={styles.todayJobs}>
              <Text style={styles.todayJobCount}>{earnings?.today_jobs || 0}</Text>
              <Text style={styles.todaySubtext}>jobs</Text>
            </View>
          </View>
        </View>

        {/* Total Stats */}
        <View style={styles.totalCard}>
          <Text style={styles.sectionTitle}>All Time</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="wallet" size={24} color="#10B981" />
              </View>
              <Text style={styles.statValue}>{RUPEE}{earnings?.total_earnings || 0}</Text>
              <Text style={styles.statLabel}>Total Earnings</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Ionicons name="checkmark-done" size={24} color="#4F46E5" />
              </View>
              <Text style={styles.statValue}>{earnings?.total_jobs || 0}</Text>
              <Text style={styles.statLabel}>Jobs Completed</Text>
            </View>
          </View>
        </View>

        {/* Earnings Info */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#4F46E5" />
          <Text style={styles.infoText}>
            Earnings are calculated from service fees collected per deposit. Settlements are processed weekly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 24,
  },
  todayCard: {
    backgroundColor: '#10B981',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
  },
  todayContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayEarnings: { flex: 1 },
  todayAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  todaySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  todayDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 24,
  },
  todayJobs: { alignItems: 'center' },
  todayJobCount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#A5B4FC',
    marginLeft: 12,
    lineHeight: 20,
  },
});

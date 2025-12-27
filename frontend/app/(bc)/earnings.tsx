import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';

const RUPEE = '₹';

interface Earnings {
  total_earnings: number;
  total_jobs: number;
  today_earnings: number;
  today_jobs: number;
}

interface CompletedJob {
  id: string;
  amount: number;
  service_fee: number;
  status: string;
  completed_at?: string;
  created_at: string;
}

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      const [earningsData, historyData] = await Promise.all([
        api.getBCEarnings(),
        api.getBCJobHistory(),
      ]);
      setEarnings(earningsData);
      setCompletedJobs(historyData.jobs?.filter((j: CompletedJob) => j.status === 'completed') || []);
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getShortJobId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
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
          <View style={styles.totalRow}>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total Earned</Text>
              <Text style={styles.totalValue}>{RUPEE}{earnings?.total_earnings || 0}</Text>
            </View>
            <View style={styles.totalItem}>
              <Text style={styles.totalLabel}>Total Jobs</Text>
              <Text style={styles.totalValue}>{earnings?.total_jobs || 0}</Text>
            </View>
          </View>
        </View>

        {/* Job History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Job History</Text>
          {completedJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No completed jobs yet</Text>
              <Text style={styles.emptySubtitle}>Your completed jobs will appear here</Text>
            </View>
          ) : (
            completedJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.jobIdBadge}>
                    <Text style={styles.jobIdText}>#{getShortJobId(job.id)}</Text>
                  </View>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                    <Text style={styles.completedText}>Completed</Text>
                  </View>
                </View>
                <View style={styles.jobDetails}>
                  <View style={styles.jobRow}>
                    <Text style={styles.jobLabel}>Deposit Amount</Text>
                    <Text style={styles.jobValue}>{RUPEE}{job.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.jobRow}>
                    <Text style={styles.jobLabel}>Your Earning</Text>
                    <Text style={styles.jobEarning}>{RUPEE}{job.service_fee}</Text>
                  </View>
                  <View style={styles.jobRow}>
                    <Text style={styles.jobLabel}>Date & Time</Text>
                    <Text style={styles.jobDate}>
                      {formatDate(job.completed_at || job.created_at)} • {formatTime(job.completed_at || job.created_at)}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={20} color="#4F46E5" />
          <Text style={styles.infoNoteText}>
            Earnings are credited after each completed job. Platform commission is handled separately.
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
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  todayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 12,
  },
  todayContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  todayEarnings: { flex: 1, alignItems: 'center' },
  todayAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#10B981',
  },
  todaySubtext: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  todayDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  todayJobs: { flex: 1, alignItems: 'center' },
  todayJobCount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  totalItem: { alignItems: 'center' },
  totalLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  historySection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#111827',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  jobCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  jobIdBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  jobIdText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  jobDetails: {},
  jobRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  jobValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  jobEarning: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  jobDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#A5B4FC',
    marginLeft: 12,
    lineHeight: 18,
  },
});

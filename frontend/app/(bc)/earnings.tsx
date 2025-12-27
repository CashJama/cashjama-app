import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
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
  total_cash: number;
  status: string;
  completed_at?: string;
  created_at: string;
  user_name?: string;
  location?: {
    address?: string;
  };
}

export default function EarningsScreen() {
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);
  const [showJobDetail, setShowJobDetail] = useState(false);

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

  const formatDateTime = (dateStr: string) => {
    return `${formatDate(dateStr)} • ${formatTime(dateStr)}`;
  };

  const getShortJobId = (id: string) => {
    return id.slice(0, 8).toUpperCase();
  };

  const openJobDetail = (job: CompletedJob) => {
    setSelectedJob(job);
    setShowJobDetail(true);
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

        {/* Job History Section */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Job History</Text>
          <Text style={styles.sectionSubtitle}>Tap a job to view details</Text>
          
          {completedJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No completed jobs yet</Text>
              <Text style={styles.emptySubtitle}>Your completed jobs will appear here</Text>
            </View>
          ) : (
            completedJobs.map((job) => (
              <TouchableOpacity 
                key={job.id} 
                style={styles.jobCard}
                onPress={() => openJobDetail(job)}
                activeOpacity={0.7}
              >
                <View style={styles.jobCardLeft}>
                  <Text style={styles.jobIdText}>#{getShortJobId(job.id)}</Text>
                  <Text style={styles.jobDateText}>{formatDate(job.completed_at || job.created_at)}</Text>
                </View>
                <View style={styles.jobCardRight}>
                  <Text style={styles.jobEarningText}>{RUPEE}{job.service_fee}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#6B7280" />
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Job Detail Modal */}
      <Modal 
        visible={showJobDetail} 
        transparent 
        animationType="slide"
        onRequestClose={() => setShowJobDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Job Details</Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowJobDetail(false)}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {selectedJob && (
              <ScrollView style={styles.modalContent}>
                {/* Job ID Badge */}
                <View style={styles.detailJobIdContainer}>
                  <View style={styles.detailJobIdBadge}>
                    <Text style={styles.detailJobIdText}>#{getShortJobId(selectedJob.id)}</Text>
                  </View>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.completedBadgeText}>Completed</Text>
                  </View>
                </View>

                {/* Amount Breakdown */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Amount Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Deposit Amount</Text>
                    <Text style={styles.detailValue}>{RUPEE}{selectedJob.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service Fee</Text>
                    <Text style={styles.detailValue}>{RUPEE}{selectedJob.service_fee}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Cash Collected</Text>
                    <Text style={styles.detailValue}>{RUPEE}{selectedJob.total_cash?.toLocaleString() || (selectedJob.amount + selectedJob.service_fee).toLocaleString()}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.detailEarningRow}>
                    <Text style={styles.detailEarningLabel}>Your Earning</Text>
                    <Text style={styles.detailEarningValue}>{RUPEE}{selectedJob.service_fee}</Text>
                  </View>
                </View>

                {/* Date & Time */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Date & Time</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Completed</Text>
                    <Text style={styles.detailValue}>{formatDateTime(selectedJob.completed_at || selectedJob.created_at)}</Text>
                  </View>
                </View>

                {/* Location */}
                {selectedJob.location?.address && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Location</Text>
                    <Text style={styles.detailLocationText}>{selectedJob.location.address}</Text>
                  </View>
                )}

                {/* Full Job ID */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Reference</Text>
                  <Text style={styles.detailRefText}>{selectedJob.id}</Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity 
              style={styles.modalDoneButton}
              onPress={() => setShowJobDetail(false)}
            >
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
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
  // Simplified job cards for list view
  jobCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  jobCardLeft: {},
  jobIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  jobDateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  jobCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  jobEarningText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    padding: 20,
  },
  detailJobIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  detailJobIdBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  detailJobIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'monospace',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  completedBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  detailSection: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  detailSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 12,
  },
  detailEarningRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailEarningLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#10B981',
  },
  detailEarningValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  detailLocationText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 20,
  },
  detailRefText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  modalDoneButton: {
    backgroundColor: '#10B981',
    margin: 20,
    marginTop: 0,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

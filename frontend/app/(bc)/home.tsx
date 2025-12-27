import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Modal,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

const RUPEE = '₹';
const POLL_INTERVAL = 10000; // 10 seconds auto-refresh

interface Job {
  id: string;
  amount: number;
  service_fee: number;
  total_cash: number;
  status: string;
  user_mobile: string;
  user_name?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  created_at: string;
}

export default function BCHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTogglingOnline, setIsTogglingOnline] = useState(false);
  
  // Modal states for dark-themed alerts
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState<{
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ type: 'info', title: '', message: '' });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // Load data on focus
  useFocusEffect(
    useCallback(() => {
      loadData();
      startPolling();
      
      return () => {
        stopPolling();
      };
    }, [])
  );

  // Handle app state changes for polling
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadData();
        startPolling();
      } else if (nextAppState.match(/inactive|background/)) {
        stopPolling();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const startPolling = () => {
    stopPolling();
    pollIntervalRef.current = setInterval(() => {
      loadData(true); // Silent refresh
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const loadData = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [onlineRes, availableRes, assignedRes] = await Promise.all([
        api.getOnlineStatus(),
        api.getAvailableJobs(),
        api.getAssignedJobs(),
      ]);
      setIsOnline(onlineRes.is_online || false);
      setAvailableJobs(availableRes.jobs || []);
      setAssignedJobs(assignedRes.jobs || []);
    } catch (error) {
      console.log('Error loading data:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, []);

  const showDarkModal = (type: 'success' | 'error' | 'info', title: string, message: string, onConfirm?: () => void) => {
    setModalConfig({ type, title, message, onConfirm });
    setShowModal(true);
  };

  const toggleOnlineStatus = async (value: boolean) => {
    setIsTogglingOnline(true);
    try {
      await api.setOnlineStatus(value);
      setIsOnline(value);
    } catch (error) {
      showDarkModal('error', 'Error', 'Failed to update online status');
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      await api.acceptJob(jobId);
      showDarkModal('success', 'Job Accepted', 'You can now proceed to the customer location.', () => {
        loadData();
      });
    } catch (error: any) {
      showDarkModal('error', 'Error', error.response?.data?.detail || 'Failed to accept job');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      agent_assigned: 'Assigned',
      arrived: 'Arrived',
      cash_collected: 'Cash Collected',
      deposited: 'Deposited',
      awaiting_confirmation: 'Awaiting User',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      agent_assigned: '#F59E0B',
      arrived: '#8B5CF6',
      cash_collected: '#EC4899',
      deposited: '#10B981',
      awaiting_confirmation: '#06B6D4',
    };
    return colors[status] || '#6B7280';
  };

  const getModalIcon = () => {
    switch (modalConfig.type) {
      case 'success': return { name: 'checkmark-circle', color: '#10B981' };
      case 'error': return { name: 'close-circle', color: '#EF4444' };
      default: return { name: 'information-circle', color: '#4F46E5' };
    }
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

  const modalIcon = getModalIcon();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with Online Toggle */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Agent'}</Text>
        </View>
        <View style={styles.onlineToggle}>
          <Text style={[styles.onlineLabel, { color: isOnline ? '#10B981' : '#EF4444' }]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
          {isTogglingOnline ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              trackColor={{ false: '#374151', true: 'rgba(16, 185, 129, 0.3)' }}
              thumbColor={isOnline ? '#10B981' : '#6B7280'}
            />
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Assigned Jobs Section */}
        {assignedJobs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Active Jobs ({assignedJobs.length})</Text>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            {assignedJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push({ pathname: '/(bc)/job/[id]', params: { id: job.id } })}
              >
                <View style={styles.jobHeader}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Deposit Amount</Text>
                    <Text style={styles.amount}>{RUPEE}{job.amount.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(job.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                      {getStatusLabel(job.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.earningRow}>
                  <Text style={styles.earningLabel}>Your Earning:</Text>
                  <Text style={styles.earningValue}>{RUPEE}{job.service_fee}</Text>
                </View>
                <View style={styles.jobInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#9CA3AF" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {job.location.address || 'Location not specified'}
                    </Text>
                  </View>
                </View>
                <View style={styles.jobFooter}>
                  <Text style={styles.viewDetails}>Tap to update status</Text>
                  <Ionicons name="chevron-forward" size={20} color="#10B981" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Available Jobs Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Jobs ({availableJobs.length})
          </Text>
          {!isOnline ? (
            <View style={styles.offlineMessage}>
              <Ionicons name="information-circle" size={24} color="#F59E0B" />
              <Text style={styles.offlineText}>Go online to see available jobs</Text>
            </View>
          ) : availableJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={48} color="#374151" />
              <Text style={styles.emptyTitle}>No Jobs Available</Text>
              <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
            </View>
          ) : (
            availableJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Deposit Amount</Text>
                    <Text style={styles.amount}>{RUPEE}{job.amount.toLocaleString()}</Text>
                  </View>
                </View>
                <View style={styles.earningRow}>
                  <Text style={styles.earningLabel}>Your Earning:</Text>
                  <Text style={styles.earningValue}>{RUPEE}{job.service_fee}</Text>
                </View>
                <View style={styles.jobInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#9CA3AF" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {job.location.address || 'Location not specified'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time" size={16} color="#9CA3AF" />
                    <Text style={styles.infoText}>{formatTime(job.created_at)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleAcceptJob(job.id)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.acceptButtonText}>Accept Job</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Dark Modal for all alerts */}
      <Modal visible={showModal} transparent animationType="fade" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: `${modalIcon.color}15` }]}>
              <Ionicons name={modalIcon.name as any} size={48} color={modalIcon.color} />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalMessage}>{modalConfig.message}</Text>
            <TouchableOpacity 
              style={[styles.modalButton, { backgroundColor: modalIcon.color }]}
              onPress={() => {
                setShowModal(false);
                modalConfig.onConfirm?.();
              }}
            >
              <Text style={styles.modalButtonText}>OK</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  greeting: { fontSize: 14, color: '#9CA3AF' },
  userName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel: { fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
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
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  amountContainer: {},
  amountLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  amount: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '600' },
  earningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
  },
  earningLabel: { fontSize: 14, color: '#9CA3AF' },
  earningValue: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  feeContainer: { alignItems: 'flex-end' },
  feeLabel: { fontSize: 11, color: '#10B981', marginBottom: 2 },
  fee: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  jobInfo: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 14, color: '#9CA3AF', flex: 1 },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  viewDetails: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
  },
  acceptButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  offlineText: { fontSize: 14, color: '#F59E0B', flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#6B7280', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#4B5563', marginTop: 4 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

const RUPEE = '₹';

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
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
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  }, []);

  const toggleOnlineStatus = async (value: boolean) => {
    setIsTogglingOnline(true);
    try {
      await api.setOnlineStatus(value);
      setIsOnline(value);
    } catch (error) {
      Alert.alert('Error', 'Failed to update status');
    } finally {
      setIsTogglingOnline(false);
    }
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      await api.acceptJob(jobId);
      Alert.alert('Success', 'Job accepted! You can now proceed to the customer.');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept job');
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      agent_assigned: 'Assigned',
      in_progress: 'In Progress',
      arrived: 'Arrived',
      cash_collected: 'Cash Collected',
      deposited: 'Deposited',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      agent_assigned: '#F59E0B',
      in_progress: '#3B82F6',
      arrived: '#8B5CF6',
      cash_collected: '#EC4899',
      deposited: '#10B981',
    };
    return colors[status] || '#6B7280';
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
            <Text style={styles.sectionTitle}>Your Active Jobs ({assignedJobs.length})</Text>
            {assignedJobs.map((job) => (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push({ pathname: '/(bc)/job/[id]', params: { id: job.id } })}
              >
                <View style={styles.jobHeader}>
                  <View style={styles.amountContainer}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amount}>{RUPEE}{job.amount.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(job.status)}20` }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(job.status) }]}>
                      {getStatusLabel(job.status)}
                    </Text>
                  </View>
                </View>
                <View style={styles.jobInfo}>
                  <View style={styles.infoRow}>
                    <Ionicons name="location" size={16} color="#9CA3AF" />
                    <Text style={styles.infoText} numberOfLines={1}>
                      {job.location.address || 'Location not specified'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="call" size={16} color="#9CA3AF" />
                    <Text style={styles.infoText}>{job.user_mobile}</Text>
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
                    <Text style={styles.amountLabel}>Deposit</Text>
                    <Text style={styles.amount}>{RUPEE}{job.amount.toLocaleString()}</Text>
                  </View>
                  <View style={styles.feeContainer}>
                    <Text style={styles.feeLabel}>Your Earning</Text>
                    <Text style={styles.fee}>{RUPEE}{job.service_fee}</Text>
                  </View>
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
                  <Text style={styles.acceptButtonText}>Accept Job</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 2 },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel: { fontSize: 14, fontWeight: '600' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 12 },
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
    marginBottom: 12,
  },
  amountContainer: {},
  amountLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  amount: { fontSize: 22, fontWeight: '700', color: '#FFFFFF' },
  feeContainer: { alignItems: 'flex-end' },
  feeLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  fee: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },
  jobInfo: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  infoText: { fontSize: 13, color: '#9CA3AF', marginLeft: 8, flex: 1 },
  jobFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewDetails: { fontSize: 14, color: '#10B981', fontWeight: '500' },
  acceptButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  offlineMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  offlineText: { fontSize: 14, color: '#F59E0B', flex: 1 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginTop: 12 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
});

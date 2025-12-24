import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
  job_otp?: string;
}

export default function BCHomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'assigned'>('available');
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'tracking' | 'off'>('off');

  useEffect(() => {
    loadJobs();
    startLocationTracking();
    
    // Poll for new jobs every 30 seconds
    const interval = setInterval(loadJobs, 30000);
    return () => clearInterval(interval);
  }, []);

  const startLocationTracking = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location is needed to show you nearby jobs.');
        return;
      }

      setLocationStatus('tracking');
      
      // Update location every 30 seconds
      const updateLocation = async () => {
        try {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          await api.updateBCLocation(
            location.coords.latitude,
            location.coords.longitude,
            location.coords.accuracy ?? undefined
          );
        } catch (error) {
          console.log('Location update error:', error);
        }
      };

      updateLocation();
      setInterval(updateLocation, 30000);
    } catch (error) {
      console.log('Location tracking error:', error);
    }
  };

  const loadJobs = async () => {
    try {
      const [availableRes, assignedRes] = await Promise.all([
        api.getAvailableJobs(),
        api.getAssignedJobs(),
      ]);
      setAvailableJobs(availableRes.jobs || []);
      setAssignedJobs(assignedRes.jobs || []);
    } catch (error) {
      console.log('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadJobs();
    setIsRefreshing(false);
  }, []);

  const handleAcceptJob = async (jobId: string) => {
    try {
      const result = await api.acceptJob(jobId);
      Alert.alert(
        'Job Accepted!',
        `Job OTP: ${result.job_otp}\n\nShare this with the customer for verification.`,
        [{ text: 'OK', onPress: loadJobs }]
      );
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to accept job';
      Alert.alert('Error', message);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const renderJobCard = (job: Job, isAssigned: boolean) => (
    <TouchableOpacity
      key={job.id}
      style={styles.jobCard}
      onPress={() => router.push({ pathname: '/(bc)/job/[id]', params: { id: job.id } })}
    >
      <View style={styles.jobHeader}>
        <View style={styles.amountContainer}>
          <Text style={styles.amountLabel}>Deposit</Text>
          <Text style={styles.amount}>{RUPEE}{job.amount.toLocaleString()}</Text>
        </View>
        <View style={styles.feeContainer}>
          <Text style={styles.feeLabel}>Your Fee</Text>
          <Text style={styles.fee}>{RUPEE}{job.service_fee}</Text>
        </View>
      </View>

      <View style={styles.jobInfo}>
        <View style={styles.infoRow}>
          <Ionicons name="location" size={16} color="#9CA3AF" />
          <Text style={styles.infoText} numberOfLines={1}>
            {job.location.address || `${job.location.latitude.toFixed(4)}, ${job.location.longitude.toFixed(4)}`}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="time" size={16} color="#9CA3AF" />
          <Text style={styles.infoText}>{formatTime(job.created_at)}</Text>
        </View>
      </View>

      {isAssigned ? (
        <View style={styles.assignedActions}>
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Text style={[styles.statusText, { color: '#10B981' }]}>
              {job.status === 'in_progress' ? 'In Progress' : 'Assigned'}
            </Text>
          </View>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
            <Ionicons name="chevron-forward" size={16} color="#10B981" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.acceptButton}
          onPress={() => handleAcceptJob(job.id)}
        >
          <Text style={styles.acceptButtonText}>Accept Job</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </SafeAreaView>
    );
  }

  const currentJobs = activeTab === 'available' ? availableJobs : assignedJobs;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>BC Agent</Text>
          <Text style={styles.userName}>{user?.name || 'Agent'}</Text>
        </View>
        <View style={styles.locationBadge}>
          <View style={[styles.locationDot, { backgroundColor: locationStatus === 'tracking' ? '#10B981' : '#EF4444' }]} />
          <Text style={styles.locationText}>
            {locationStatus === 'tracking' ? 'GPS On' : 'GPS Off'}
          </Text>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'available' && styles.activeTab]}
          onPress={() => setActiveTab('available')}
        >
          <Text style={[styles.tabText, activeTab === 'available' && styles.activeTabText]}>
            Available ({availableJobs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'assigned' && styles.activeTab]}
          onPress={() => setActiveTab('assigned')}
        >
          <Text style={[styles.tabText, activeTab === 'assigned' && styles.activeTabText]}>
            My Jobs ({assignedJobs.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Job List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#10B981" />
        }
        showsVerticalScrollIndicator={false}
      >
        {currentJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={activeTab === 'available' ? 'briefcase-outline' : 'checkmark-circle-outline'}
              size={64}
              color="#374151"
            />
            <Text style={styles.emptyTitle}>
              {activeTab === 'available' ? 'No Jobs Available' : 'No Active Jobs'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'available'
                ? 'Pull down to refresh and check for new jobs'
                : 'Accept a job from the Available tab'}
            </Text>
          </View>
        ) : (
          currentJobs.map((job) => renderJobCard(job, activeTab === 'assigned'))
        )}
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
  },
  greeting: { fontSize: 14, color: '#10B981', fontWeight: '600' },
  userName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  locationDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  locationText: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeTab: { backgroundColor: '#10B981' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  activeTabText: { color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
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
    marginBottom: 16,
  },
  amountContainer: {},
  amountLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  amount: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  feeContainer: { alignItems: 'flex-end' },
  feeLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  fee: { fontSize: 20, fontWeight: '700', color: '#10B981' },
  jobInfo: { marginBottom: 16 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: { fontSize: 13, color: '#9CA3AF', marginLeft: 8, flex: 1 },
  assignedActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewButtonText: { fontSize: 14, color: '#10B981', fontWeight: '600', marginRight: 4 },
  acceptButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});

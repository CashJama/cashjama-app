import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';

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
  job_otp_verified?: boolean;
}

const STATUS_FLOW = [
  { key: 'agent_assigned', label: 'Assigned', nextAction: 'Mark Arrived' },
  { key: 'arrived', label: 'Arrived', nextAction: 'Mark Cash Collected' },
  { key: 'cash_collected', label: 'Cash Collected', nextAction: 'Mark Deposited' },
  { key: 'deposited', label: 'Deposited', nextAction: 'Complete Job' },
  { key: 'completed', label: 'Completed', nextAction: null },
];

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const data = await api.getBCJobDetails(id);
      setJob(data);
    } catch (error) {
      console.log('Error loading job:', error);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setIsLoading(false);
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusMap: Record<string, string> = {
      agent_assigned: 'arrived',
      arrived: 'cash_collected',
      cash_collected: 'deposited',
      deposited: 'completed',
    };
    return statusMap[currentStatus];
  };

  const handleUpdateStatus = async () => {
    if (!job) return;
    
    const nextStatus = getNextStatus(job.status);
    if (!nextStatus) return;

    const currentStep = STATUS_FLOW.find(s => s.key === job.status);
    
    Alert.alert(
      'Update Status',
      `Mark this job as "${STATUS_FLOW.find(s => s.key === nextStatus)?.label}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsUpdating(true);
            try {
              if (nextStatus === 'completed') {
                await api.completeJob(id);
                Alert.alert('Success', 'Job completed successfully!', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                await api.updateJobStatus(id, nextStatus);
                loadJob();
              }
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to update status');
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ]
    );
  };

  const openMaps = () => {
    if (!job) return;
    const { latitude, longitude } = job.location;
    const url = Platform.select({
      ios: `maps:?daddr=${latitude},${longitude}`,
      android: `google.navigation:q=${latitude},${longitude}`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`,
    });
    Linking.openURL(url);
  };

  const callCustomer = () => {
    if (!job) return;
    Linking.openURL(`tel:${job.user_mobile}`);
  };

  const getCurrentStepIndex = () => {
    if (!job) return 0;
    return STATUS_FLOW.findIndex(s => s.key === job.status);
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

  if (!job) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const currentStep = STATUS_FLOW[currentStepIndex];
  const isCompleted = job.status === 'completed';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Deposit Amount</Text>
              <Text style={styles.amountValue}>{RUPEE}{job.amount.toLocaleString()}</Text>
            </View>
            <View style={styles.feeBox}>
              <Text style={styles.feeLabel}>Your Fee</Text>
              <Text style={styles.feeValue}>{RUPEE}{job.service_fee}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Cash to Collect</Text>
            <Text style={styles.totalValue}>{RUPEE}{job.total_cash.toLocaleString()}</Text>
          </View>
        </View>

        {/* Customer Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerInfo}>
              <Ionicons name="person-circle" size={48} color="#4F46E5" />
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{job.user_name || 'Customer'}</Text>
                <Text style={styles.customerMobile}>{job.user_mobile}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.callButton} onPress={callCustomer}>
              <Ionicons name="call" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <TouchableOpacity style={styles.locationCard} onPress={openMaps}>
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={24} color="#10B981" />
              <Text style={styles.locationText}>
                {job.location.address || `${job.location.latitude.toFixed(6)}, ${job.location.longitude.toFixed(6)}`}
              </Text>
            </View>
            <View style={styles.navigateButton}>
              <Ionicons name="navigate" size={20} color="#10B981" />
              <Text style={styles.navigateText}>Navigate</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Status Progress */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progress</Text>
          <View style={styles.progressCard}>
            {STATUS_FLOW.map((step, index) => {
              const isComplete = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              return (
                <View key={step.key} style={styles.progressStep}>
                  <View style={styles.progressLeft}>
                    <View style={[
                      styles.progressDot,
                      isComplete && styles.progressDotComplete,
                      isCurrent && styles.progressDotCurrent
                    ]}>
                      {isComplete && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    {index < STATUS_FLOW.length - 1 && (
                      <View style={[styles.progressLine, isComplete && styles.progressLineComplete]} />
                    )}
                  </View>
                  <Text style={[
                    styles.progressLabel,
                    (isComplete || isCurrent) && styles.progressLabelActive
                  ]}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action */}
      {!isCompleted && currentStep?.nextAction && (
        <View style={styles.bottomAction}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleUpdateStatus}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>{currentStep.nextAction}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {isCompleted && (
        <View style={styles.bottomAction}>
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.completedText}>Job Completed</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 16, marginBottom: 16 },
  backBtn: { backgroundColor: '#1F2937', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtnText: { color: '#FFFFFF', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 100 },
  amountCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  amountLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  amountValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  feeBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  feeLabel: { fontSize: 12, color: '#10B981', marginBottom: 4 },
  feeValue: { fontSize: 20, fontWeight: '700', color: '#10B981' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  totalLabel: { fontSize: 14, color: '#9CA3AF' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#F59E0B' },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 12 },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center' },
  customerDetails: { marginLeft: 12 },
  customerName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  customerMobile: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16 },
  locationInfo: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  locationText: { flex: 1, fontSize: 14, color: '#FFFFFF', marginLeft: 12, lineHeight: 20 },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingVertical: 12,
  },
  navigateText: { fontSize: 14, fontWeight: '600', color: '#10B981', marginLeft: 8 },
  progressCard: { backgroundColor: '#111827', borderRadius: 16, padding: 20 },
  progressStep: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  progressLeft: { alignItems: 'center', marginRight: 12 },
  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotComplete: { backgroundColor: '#10B981' },
  progressDotCurrent: { backgroundColor: '#F59E0B' },
  progressLine: { width: 2, height: 24, backgroundColor: '#374151', marginTop: 4 },
  progressLineComplete: { backgroundColor: '#10B981' },
  progressLabel: { fontSize: 14, color: '#6B7280', paddingTop: 2 },
  progressLabelActive: { color: '#FFFFFF', fontWeight: '500' },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0F1C',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  actionButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  completedText: { fontSize: 16, fontWeight: '600', color: '#10B981' },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
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

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleVerifyOTP = async () => {
    if (otp.length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the 4-digit OTP from the customer');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.verifyJobOTP(id, otp);
      Alert.alert('OTP Verified', 'Job is now in progress. Proceed with the deposit.');
      loadJob();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Invalid OTP';
      Alert.alert('Error', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteJob = async () => {
    Alert.alert(
      'Complete Job',
      'Are you sure the deposit has been made to the customer\'s bank account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Complete',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const result = await api.completeJob(id);
              Alert.alert(
                'Job Completed!',
                `Earnings: ${RUPEE}${result.earnings}`,
                [{ text: 'OK', onPress: () => router.back() }]
              );
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Failed to complete job';
              Alert.alert('Error', message);
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleRejectJob = async () => {
    Alert.alert(
      'Release Job',
      'Release this job back to the pool?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Release',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.rejectJob(id);
              Alert.alert('Job Released', 'Job has been released back to the pool.');
              router.back();
            } catch (error: any) {
              const message = error.response?.data?.detail || 'Failed to release job';
              Alert.alert('Error', message);
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
        </View>
      </SafeAreaView>
    );
  }

  const isAssigned = job.status === 'agent_assigned';
  const isInProgress = job.status === 'in_progress';

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

        {/* OTP Section (if assigned but not verified) */}
        {isAssigned && !job.job_otp_verified && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Verification</Text>
            <View style={styles.otpCard}>
              <Text style={styles.otpInstructions}>
                Ask the customer for the 4-digit OTP shown on their app
              </Text>
              <View style={styles.otpInputContainer}>
                <TextInput
                  style={styles.otpInput}
                  placeholder="Enter OTP"
                  placeholderTextColor="#6B7280"
                  keyboardType="number-pad"
                  maxLength={4}
                  value={otp}
                  onChangeText={setOtp}
                />
                <TouchableOpacity
                  style={[styles.verifyButton, otp.length !== 4 && styles.verifyButtonDisabled]}
                  onPress={handleVerifyOTP}
                  disabled={otp.length !== 4 || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.verifyButtonText}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>
              <Text style={styles.devNote}>Dev Mode: Use OTP "1234"</Text>
            </View>
          </View>
        )}

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusCard}>
            <View style={[styles.statusStep, { opacity: 1 }]}>
              <View style={[styles.statusDot, { backgroundColor: '#10B981' }]} />
              <Text style={styles.statusStepText}>Job Accepted</Text>
            </View>
            <View style={[styles.statusStep, { opacity: job.job_otp_verified ? 1 : 0.4 }]}>
              <View style={[styles.statusDot, { backgroundColor: job.job_otp_verified ? '#10B981' : '#374151' }]} />
              <Text style={styles.statusStepText}>OTP Verified</Text>
            </View>
            <View style={[styles.statusStep, { opacity: isInProgress ? 1 : 0.4 }]}>
              <View style={[styles.statusDot, { backgroundColor: isInProgress ? '#F59E0B' : '#374151' }]} />
              <Text style={styles.statusStepText}>In Progress</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        {isAssigned && (
          <TouchableOpacity style={styles.rejectButton} onPress={handleRejectJob}>
            <Text style={styles.rejectButtonText}>Release Job</Text>
          </TouchableOpacity>
        )}
        {isInProgress && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteJob}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                <Text style={styles.completeButtonText}>Complete Job</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
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
  locationCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
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
  otpCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
  },
  otpInstructions: { fontSize: 14, color: '#9CA3AF', marginBottom: 16, textAlign: 'center' },
  otpInputContainer: { flexDirection: 'row', gap: 12 },
  otpInput: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 8,
  },
  verifyButton: {
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  verifyButtonDisabled: { backgroundColor: '#374151' },
  verifyButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  devNote: { fontSize: 11, color: '#6B7280', textAlign: 'center', marginTop: 12 },
  statusCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  statusStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusDot: { width: 12, height: 12, borderRadius: 6, marginRight: 12 },
  statusStepText: { fontSize: 14, color: '#FFFFFF' },
  bottomActions: {
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
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  rejectButtonText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  completeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  completeButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

import React, { useEffect, useState, useCallback } from 'react';
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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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
  { key: 'agent_assigned', label: 'Assigned', nextAction: 'Mark Arrived', nextStatus: 'arrived' },
  { key: 'arrived', label: 'Arrived', nextAction: 'Verify & Collect Cash', nextStatus: 'cash_collected', requiresOtp: true },
  { key: 'cash_collected', label: 'Cash Collected', nextAction: 'Mark Deposited', nextStatus: 'deposited' },
  { key: 'deposited', label: 'Deposited', nextAction: 'Complete Job', nextStatus: 'completed' },
  { key: 'completed', label: 'Completed', nextAction: null, nextStatus: null },
];

export default function JobDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');

  // Persist and restore job data on focus
  useFocusEffect(
    useCallback(() => {
      loadJob();
    }, [id])
  );

  const loadJob = async () => {
    try {
      setIsLoading(true);
      const data = await api.getBCJobDetails(id);
      setJob(data);
    } catch (error) {
      console.log('Error loading job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentStep = () => {
    if (!job) return null;
    return STATUS_FLOW.find(s => s.key === job.status);
  };

  const handleUpdateStatus = async () => {
    if (!job) return;
    
    const currentStep = getCurrentStep();
    if (!currentStep?.nextStatus) return;

    // If OTP verification is required for this step
    if (currentStep.requiresOtp) {
      setShowOtpModal(true);
      setOtpInput('');
      setOtpError('');
      return;
    }

    await performStatusUpdate(currentStep.nextStatus);
  };

  const handleOtpVerifyAndUpdate = async () => {
    if (otpInput.length !== 4) {
      setOtpError('Please enter the 4-digit code from customer');
      return;
    }

    // Verify OTP first
    setIsUpdating(true);
    try {
      await api.verifyJobOTP(id, otpInput);
      setShowOtpModal(false);
      // Now update status to cash_collected
      await api.updateJobStatus(id, 'cash_collected');
      loadJob();
      Alert.alert('Success', 'OTP verified. Cash collection confirmed!');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Invalid code. Please check with customer.';
      setOtpError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const performStatusUpdate = async (nextStatus: string) => {
    const nextLabel = STATUS_FLOW.find(s => s.key === nextStatus)?.label;
    
    Alert.alert(
      'Update Status',
      `Mark this job as "${nextLabel}"?`,
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

  // Mask phone number for privacy
  const getMaskedPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return phone.slice(0, 2) + '****' + phone.slice(-4);
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
          <Text style={styles.loadingText}>Loading job...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
          <Text style={styles.errorText}>Job not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const currentStep = getCurrentStep();
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
        {/* Earnings Card - Clear fee label */}
        <View style={styles.earningsCard}>
          <View style={styles.earningsIcon}>
            <Ionicons name="wallet" size={24} color="#10B981" />
          </View>
          <View style={styles.earningsContent}>
            <Text style={styles.earningsLabel}>Your Earning for This Job</Text>
            <Text style={styles.earningsValue}>{RUPEE}{job.service_fee}</Text>
          </View>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Deposit Amount</Text>
              <Text style={styles.amountValue}>{RUPEE}{job.amount.toLocaleString()}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Cash to Collect</Text>
            <Text style={styles.totalValue}>{RUPEE}{job.total_cash.toLocaleString()}</Text>
          </View>
        </View>

        {/* Customer Info - Masked phone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <View style={styles.customerCard}>
            <View style={styles.customerInfo}>
              <Ionicons name="person-circle" size={48} color="#4F46E5" />
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>{job.user_name || 'Customer'}</Text>
                <Text style={styles.customerMobile}>{getMaskedPhone(job.user_mobile)}</Text>
              </View>
            </View>
            <View style={styles.callNote}>
              <Ionicons name="shield-checkmark" size={16} color="#9CA3AF" />
              <Text style={styles.callNoteText}>Contact via app only</Text>
            </View>
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
                <Ionicons name={currentStep.requiresOtp ? "key" : "checkmark-circle"} size={24} color="#FFFFFF" />
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

      {/* OTP Verification Modal - Custom styled */}
      {showOtpModal && (
        <View style={styles.otpOverlay}>
          <View style={styles.otpContainer}>
            <View style={styles.otpIconContainer}>
              <Ionicons name="key" size={48} color="#10B981" />
            </View>
            <Text style={styles.otpTitle}>Enter Customer Code</Text>
            <Text style={styles.otpMessage}>Ask the customer for their 4-digit verification code.</Text>
            <TextInput
              style={styles.otpInput}
              value={otpInput}
              onChangeText={(text) => { setOtpInput(text.replace(/[^0-9]/g, '')); setOtpError(''); }}
              placeholder="0000"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}
            <Text style={styles.otpHint}>Dev Mode: Use code "1234"</Text>
            <View style={styles.otpActions}>
              <TouchableOpacity style={styles.otpCancelBtn} onPress={() => setShowOtpModal(false)}>
                <Text style={styles.otpCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.otpConfirmBtn, otpInput.length !== 4 && styles.otpConfirmDisabled]} 
                onPress={handleOtpVerifyAndUpdate}
                disabled={otpInput.length !== 4 || isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.otpConfirmText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#9CA3AF', marginTop: 12, fontSize: 14 },
  errorText: { color: '#EF4444', fontSize: 16, marginTop: 12, marginBottom: 16 },
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
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 120 },
  earningsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  earningsIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  earningsContent: { flex: 1 },
  earningsLabel: { fontSize: 13, color: '#10B981', marginBottom: 2 },
  earningsValue: { fontSize: 24, fontWeight: '700', color: '#10B981' },
  amountCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  amountRow: { marginBottom: 16 },
  amountLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  amountValue: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
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
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  customerDetails: { marginLeft: 12, flex: 1 },
  customerName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  customerMobile: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  callNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  callNoteText: { fontSize: 12, color: '#9CA3AF' },
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
  // OTP Modal styles
  otpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  otpContainer: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  otpIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  otpMessage: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 20 },
  otpInput: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 12,
    width: '100%',
    borderWidth: 1,
    borderColor: '#374151',
  },
  otpErrorText: { fontSize: 13, color: '#EF4444', marginTop: 8 },
  otpHint: { fontSize: 11, color: '#6B7280', marginTop: 8 },
  otpActions: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 20 },
  otpCancelBtn: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  otpCancelText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  otpConfirmBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  otpConfirmDisabled: { backgroundColor: '#374151' },
  otpConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
  TextInput,
  Modal,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';

const RUPEE = '₹';
const POLL_INTERVAL = 5000; // 5 seconds for job details

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
  { key: 'deposited', label: 'Deposited', nextAction: 'Submit for Confirmation', nextStatus: 'awaiting_confirmation' },
  { key: 'awaiting_confirmation', label: 'Awaiting User Confirmation', nextAction: null, nextStatus: null },
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
  
  // Modal states for dark-themed alerts
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertConfig, setAlertConfig] = useState<{
    type: 'success' | 'error' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
  }>({ type: 'success', title: '', message: '' });

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // Load job on focus and start polling
  useFocusEffect(
    useCallback(() => {
      loadJob();
      startPolling();
      
      return () => {
        stopPolling();
      };
    }, [id])
  );

  // Handle app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        loadJob();
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
      loadJob(true);
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const loadJob = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const data = await api.getBCJobDetails(id);
      setJob(data);
    } catch (error) {
      console.log('Error loading job:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const showDarkAlert = (
    type: 'success' | 'error' | 'confirm',
    title: string,
    message: string,
    onConfirm?: () => void,
    confirmText?: string
  ) => {
    setAlertConfig({ type, title, message, onConfirm, confirmText });
    setShowAlertModal(true);
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

    // Show confirmation modal
    const nextLabel = STATUS_FLOW.find(s => s.key === currentStep.nextStatus)?.label;
    showDarkAlert(
      'confirm',
      'Update Status',
      `Mark this job as "${nextLabel}"?`,
      () => performStatusUpdate(currentStep.nextStatus!),
      'Confirm'
    );
  };

  const handleOtpVerifyAndUpdate = async () => {
    if (otpInput.length !== 4) {
      setOtpError('Please enter the 4-digit code from customer');
      return;
    }

    setIsUpdating(true);
    try {
      await api.verifyJobOTP(id, otpInput);
      setShowOtpModal(false);
      setOtpInput('');
      setOtpError('');
      loadJob();
      showDarkAlert('success', 'OTP Verified', 'Cash collection confirmed. Please proceed to deposit the cash.');
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Invalid code. Please check with customer.';
      setOtpError(message);
    } finally {
      setIsUpdating(false);
    }
  };

  const performStatusUpdate = async (nextStatus: string) => {
    setShowAlertModal(false);
    setIsUpdating(true);
    try {
      if (nextStatus === 'completed') {
        await api.completeJob(id);
        showDarkAlert('success', 'Job Completed!', `You earned ${RUPEE}${job?.service_fee} for this job.`, () => {
          router.back();
        });
      } else {
        await api.updateJobStatus(id, nextStatus);
        loadJob();
      }
    } catch (error: any) {
      showDarkAlert('error', 'Error', error.response?.data?.detail || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
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

  const getMaskedPhone = (phone: string) => {
    if (!phone || phone.length < 4) return phone;
    return phone.slice(0, 2) + '****' + phone.slice(-4);
  };

  const getCurrentStepIndex = () => {
    if (!job) return 0;
    return STATUS_FLOW.findIndex(s => s.key === job.status);
  };

  const getAlertIcon = () => {
    switch (alertConfig.type) {
      case 'success': return { name: 'checkmark-circle', color: '#10B981' };
      case 'error': return { name: 'close-circle', color: '#EF4444' };
      default: return { name: 'help-circle', color: '#F59E0B' };
    }
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
  const isLocked = ['cash_collected', 'deposited'].includes(job.status); // Lock after OTP verified
  const alertIcon = getAlertIcon();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header - hide back button when locked */}
      <View style={styles.header}>
        {!isLocked ? (
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedIndicator}>
            <Ionicons name="lock-closed" size={18} color="#F59E0B" />
          </View>
        )}
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Lock Banner when locked */}
      {isLocked && (
        <View style={styles.lockBanner}>
          <Ionicons name="shield-checkmark" size={18} color="#F59E0B" />
          <Text style={styles.lockBannerText}>Cash collected. Complete the deposit to finish this job.</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* ETA Display - only for assigned status */}
        {job.status === 'agent_assigned' && (
          <View style={styles.etaBanner}>
            <Ionicons name="time" size={20} color="#F59E0B" />
            <Text style={styles.etaBannerText}>ETA to customer: 20-25 mins</Text>
          </View>
        )}

        {/* Clear Fee Breakdown Card */}
        <View style={styles.breakdownCard}>
          <Text style={styles.breakdownTitle}>Job Summary</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Deposit Amount</Text>
            <Text style={styles.breakdownValue}>{RUPEE}{job.amount.toLocaleString()}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Service Fee (from customer)</Text>
            <Text style={styles.breakdownValue}>{RUPEE}{job.service_fee}</Text>
          </View>
          <View style={styles.breakdownDivider} />
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Total Cash to Collect</Text>
            <Text style={styles.breakdownTotal}>{RUPEE}{job.total_cash.toLocaleString()}</Text>
          </View>
          <View style={styles.earningHighlight}>
            <Ionicons name="wallet" size={20} color="#10B981" />
            <Text style={styles.earningHighlightLabel}>Your Earning:</Text>
            <Text style={styles.earningHighlightValue}>{RUPEE}{job.service_fee}</Text>
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
                <Text style={styles.customerMobile}>{getMaskedPhone(job.user_mobile)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={styles.callCustomerButton}
              onPress={() => Linking.openURL(`tel:${job.user_mobile?.replace(/\*/g, '0')}`)}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text style={styles.callCustomerText}>Call Customer</Text>
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

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <View style={styles.otpOverlay}>
          <View style={styles.otpContainer}>
            <View style={styles.otpIconContainer}>
              <Ionicons name="key" size={48} color="#10B981" />
            </View>
            <Text style={styles.otpTitle}>Verify & Collect Cash</Text>
            <View style={styles.otpInstructions}>
              <Text style={styles.otpInstructionText}>1. Collect CASH from customer first</Text>
              <Text style={styles.otpInstructionText}>2. Then ask for 4-digit code</Text>
            </View>
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
            <Text style={styles.otpWarning}>⚠️ After verification, you MUST complete the deposit</Text>
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

      {/* Dark Alert Modal */}
      <Modal visible={showAlertModal} transparent animationType="fade" onRequestClose={() => setShowAlertModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: `${alertIcon.color}15` }]}>
              <Ionicons name={alertIcon.name as any} size={48} color={alertIcon.color} />
            </View>
            <Text style={styles.modalTitle}>{alertConfig.title}</Text>
            <Text style={styles.modalMessage}>{alertConfig.message}</Text>
            <View style={styles.modalActions}>
              {alertConfig.type === 'confirm' && (
                <TouchableOpacity 
                  style={styles.modalCancelBtn}
                  onPress={() => setShowAlertModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                style={[
                  styles.modalConfirmBtn, 
                  { backgroundColor: alertIcon.color },
                  alertConfig.type !== 'confirm' && { flex: 1 }
                ]}
                onPress={() => {
                  setShowAlertModal(false);
                  alertConfig.onConfirm?.();
                }}
              >
                <Text style={styles.modalConfirmText}>
                  {alertConfig.confirmText || 'OK'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  lockedIndicator: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  lockBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  lockBannerText: { flex: 1, fontSize: 13, color: '#F59E0B', fontWeight: '500' },
  etaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  etaBannerText: { fontSize: 15, fontWeight: '600', color: '#F59E0B' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 120 },
  // Breakdown Card
  breakdownCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  breakdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  breakdownValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  breakdownTotal: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#1F2937',
    marginVertical: 12,
  },
  earningHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  earningHighlightLabel: {
    fontSize: 14,
    color: '#10B981',
    flex: 1,
  },
  earningHighlightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#9CA3AF', marginBottom: 8 },
  customerCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  customerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  customerDetails: { marginLeft: 12, flex: 1 },
  customerName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  customerMobile: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  callCustomerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  callCustomerText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  locationCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  locationInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  locationText: { fontSize: 14, color: '#FFFFFF', marginLeft: 12, flex: 1 },
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  navigateText: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  progressCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  progressStep: { flexDirection: 'row', alignItems: 'flex-start' },
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
  progressDotCurrent: { backgroundColor: '#4F46E5', borderWidth: 3, borderColor: 'rgba(79, 70, 229, 0.3)' },
  progressLine: { width: 2, height: 24, backgroundColor: '#374151', marginVertical: 4 },
  progressLineComplete: { backgroundColor: '#10B981' },
  progressLabel: { fontSize: 14, color: '#6B7280', paddingTop: 2 },
  progressLabelActive: { color: '#FFFFFF', fontWeight: '600' },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#0A0F1C',
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  actionButtonText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  completedText: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  // OTP Modal
  otpOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  otpTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 12 },
  otpInstructions: { width: '100%', marginBottom: 16 },
  otpInstructionText: { fontSize: 14, color: '#10B981', fontWeight: '600', marginBottom: 6 },
  otpInput: {
    width: '100%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  otpErrorText: { color: '#EF4444', fontSize: 13, marginTop: 8 },
  otpWarning: { color: '#F59E0B', fontSize: 12, marginTop: 12, textAlign: 'center', fontWeight: '500' },
  otpHint: { color: '#6B7280', fontSize: 12, marginTop: 4, marginBottom: 16 },
  otpActions: { flexDirection: 'row', gap: 12, width: '100%' },
  otpCancelBtn: {
    flex: 1,
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  otpCancelText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  otpConfirmBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  otpConfirmDisabled: { opacity: 0.5 },
  otpConfirmText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  // Alert Modal
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
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1F2937',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

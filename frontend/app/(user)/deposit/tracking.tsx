import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert, Modal, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';

// Helper function to format UTC timestamp to device local time
const formatLocalTime = (dateStr: string | undefined) => {
  if (!dateStr) return '';
  // Parse UTC time and convert to local
  const date = new Date(dateStr);
  return date.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
};

const formatRequestId = (id: string) => {
  return id.slice(-4).toUpperCase();
};

interface DepositDetails {
  id: string; amount: number; service_fee: number; total_cash: number; status: string;
  location: { latitude: number; longitude: number; address?: string };
  bc_agent_name?: string; bc_agent_mobile?: string; job_otp?: string;
  created_at: string; assigned_at?: string; started_at?: string; completed_at?: string;
}

export default function TrackingScreen() {
  const router = useRouter();
  const { depositId, from, source } = useLocalSearchParams<{ depositId: string; from?: string; source?: string }>();
  const [deposit, setDeposit] = useState<DepositDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Handle back navigation based on where user came from
  const handleBack = () => {
    if (from === 'history') {
      // Go back to history with the source param preserved
      router.push({ pathname: '/(user)/history', params: { source: source || 'tab' } });
    } else {
      router.push('/(user)/home');
    }
  };

  const fetchDeposit = async () => {
    try { 
      const response = await api.getDepositDetails(depositId || ''); 
      setDeposit(response); 
    }
    catch (error: any) { 
      console.log('Error fetching deposit:', error);
      // Only show alert on initial load, not during polling
      if (isLoading) {
        // Silent fail for polling - deposit may have been completed and removed
      }
    }
    finally { setIsLoading(false); }
  };

  const handleConfirmDeposit = () => {
    setShowConfirmModal(true);
  };

  const confirmDepositReceived = async () => {
    setIsConfirming(true);
    try {
      await api.confirmDeposit(depositId || '');
      setShowConfirmModal(false);
      Alert.alert('Success', 'Deposit confirmed! Thank you for using CashJama.', [
        { text: 'OK', onPress: () => router.push('/(user)/home') }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to confirm deposit');
    } finally {
      setIsConfirming(false);
    }
  };

  useEffect(() => { fetchDeposit(); }, [depositId]);

  useFocusEffect(useCallback(() => {
    fetchDeposit();
    // Poll every 5 seconds for real-time status updates from BC
    // Stop polling for completed or awaiting_confirmation states
    const interval = setInterval(() => { 
      if (deposit && ['requested', 'agent_assigned', 'arrived', 'cash_collected', 'deposited'].includes(deposit.status)) { 
        fetchDeposit(); 
      } 
    }, 5000);
    return () => clearInterval(interval);
  }, [deposit?.status]));

  const onRefresh = async () => { setIsRefreshing(true); await fetchDeposit(); setIsRefreshing(false); };

  const handleCancel = () => {
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    setIsCancelling(true);
    try {
      await api.cancelDeposit(depositId || '', 'Cancelled by user');
      setShowCancelModal(false);
      // Use router.back() to go back and trigger useFocusEffect on home screen
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to cancel request');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'requested': return { color: '#F59E0B', icon: 'time', label: 'Searching for Agent', description: 'Looking for an available BC agent near you' };
      case 'agent_assigned': return { color: '#3B82F6', icon: 'person', label: 'Agent Assigned', description: 'A BC agent has been assigned and is on the way' };
      case 'arrived': return { color: '#8B5CF6', icon: 'location', label: 'Agent Arrived', description: 'Agent has arrived at your location' };
      case 'cash_collected': return { color: '#EC4899', icon: 'cash', label: 'Cash Collected', description: 'Agent has collected your cash' };
      case 'deposited': return { color: '#06B6D4', icon: 'wallet', label: 'Deposited', description: 'Cash has been deposited to your bank' };
      case 'awaiting_confirmation': return { color: '#F59E0B', icon: 'checkmark-done', label: 'Awaiting Your Confirmation', description: 'BC has deposited the cash. Please confirm to complete.' };
      case 'completed': return { color: '#10B981', icon: 'checkmark-circle', label: 'Completed', description: 'Your cash has been deposited successfully' };
      case 'cancelled': return { color: '#EF4444', icon: 'close-circle', label: 'Cancelled', description: 'This request has been cancelled' };
      default: return { color: '#6B7280', icon: 'help-circle', label: status, description: '' };
    }
  };

  const getStatusSteps = () => {
    const steps = [
      { key: 'requested', label: 'Request Placed', time: deposit?.created_at },
      { key: 'agent_assigned', label: 'Agent Assigned', time: deposit?.assigned_at },
      { key: 'arrived', label: 'Agent Arrived', time: null },
      { key: 'cash_collected', label: 'Cash Collected', time: null },
      { key: 'deposited', label: 'Deposited', time: null },
      { key: 'awaiting_confirmation', label: 'Awaiting Confirmation', time: null },
      { key: 'completed', label: 'Completed', time: deposit?.completed_at },
    ];
    const statusOrder = ['requested', 'agent_assigned', 'arrived', 'cash_collected', 'deposited', 'awaiting_confirmation', 'completed'];
    const currentIndex = statusOrder.indexOf(deposit?.status || 'requested');
    return steps.map((step, index) => ({ ...step, isCompleted: index <= currentIndex, isCurrent: index === currentIndex }));
  };

  if (isLoading) { return (<SafeAreaView style={styles.container} edges={['top']}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4F46E5" /></View></SafeAreaView>); }
  if (!deposit) { return (<SafeAreaView style={styles.container} edges={['top']}><View style={styles.errorContainer}><Ionicons name="alert-circle" size={48} color="#EF4444" /><Text style={styles.errorText}>Deposit not found</Text><TouchableOpacity style={styles.goBackButton} onPress={handleBack}><Text style={styles.goBackButtonText}>Go Back</Text></TouchableOpacity></View></SafeAreaView>); }

  const statusInfo = getStatusInfo(deposit.status);
  const statusSteps = getStatusSteps();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#4F46E5" />} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></TouchableOpacity>
          <View style={styles.headerContent}><Text style={styles.headerTitle}>Track Request</Text><Text style={styles.headerSubtitle}>Request ID: {formatRequestId(deposit.id)}</Text></View>
        </View>

        <View style={styles.statusCard}>
          <View style={[styles.statusIconContainer, { backgroundColor: `${statusInfo.color}20` }]}><Ionicons name={statusInfo.icon as any} size={32} color={statusInfo.color} /></View>
          <Text style={[styles.statusLabel, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          <Text style={styles.statusDescription}>{statusInfo.description}</Text>
        </View>

        {deposit.job_otp && ['agent_assigned', 'arrived'].includes(deposit.status) && (
          <View style={styles.otpCard}>
            <View style={styles.otpHeader}><Ionicons name="shield-checkmark" size={22} color="#10B981" /><Text style={styles.otpTitle}>Verification Code</Text></View>
            <Text style={styles.otpCode}>{deposit.job_otp}</Text>
            <View style={styles.otpInstructions}>
              <Text style={styles.otpInstructionText}>1. Hand over CASH to the agent first</Text>
              <Text style={styles.otpInstructionText}>2. Then share this code with the agent</Text>
            </View>
            <Text style={styles.otpNote}>Do NOT share this code until you have handed over the cash.</Text>
          </View>
        )}

        {deposit.bc_agent_name && (
          <View style={styles.agentCard}>
            <View style={styles.agentHeader}>
              <View style={styles.agentAvatar}><Ionicons name="person" size={24} color="#4F46E5" /></View>
              <View style={styles.agentInfo}>
                <Text style={styles.agentLabel}>BC Agent</Text>
                <Text style={styles.agentName}>{deposit.bc_agent_name}</Text>
                {deposit.bc_agent_mobile && <Text style={styles.agentMobile}>{deposit.bc_agent_mobile}</Text>}
              </View>
            </View>
            {deposit.status === 'agent_assigned' && (
              <View style={styles.etaContainer}>
                <Ionicons name="time" size={18} color="#F59E0B" />
                <Text style={styles.etaText}>ETA: 20-25 mins</Text>
              </View>
            )}
            {deposit.bc_agent_mobile && (
              <TouchableOpacity style={styles.callButton} onPress={() => Linking.openURL(`tel:${deposit.bc_agent_mobile?.replace(/\*/g, '0')}`)}>
                <Ionicons name="call" size={18} color="#FFFFFF" />
                <Text style={styles.callButtonText}>Call Agent</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={styles.timelineCard}>
          <Text style={styles.timelineTitle}>Progress</Text>
          <View style={styles.timeline}>
            {statusSteps.map((step, index) => (
              <View key={step.key} style={styles.timelineItem}>
                <View style={styles.timelineLeft}>
                  <View style={[styles.timelineDot, step.isCompleted && styles.timelineDotCompleted, step.isCurrent && styles.timelineDotCurrent]}>{step.isCompleted && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}</View>
                  {index < statusSteps.length - 1 && <View style={[styles.timelineLine, step.isCompleted && styles.timelineLineCompleted]} />}
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineLabel, step.isCompleted && styles.timelineLabelCompleted]}>{step.label}</Text>
                  {step.time && <Text style={styles.timelineTime}>{formatLocalTime(step.time)}</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.amountCard}>
          <Text style={styles.amountTitle}>Amount Details</Text>
          <View style={styles.amountRow}><Text style={styles.amountLabel}>Deposit Amount</Text><Text style={styles.amountValue}>₹{deposit.amount.toLocaleString()}</Text></View>
          <View style={styles.amountRow}><Text style={styles.amountLabel}>Service Fee</Text><Text style={styles.amountValue}>₹{deposit.service_fee}</Text></View>
          <View style={styles.amountDivider} />
          <View style={styles.amountRow}><Text style={styles.totalLabel}>Total Cash</Text><Text style={styles.totalValue}>₹{deposit.total_cash.toLocaleString()}</Text></View>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationIcon}><Ionicons name="location" size={22} color="#4F46E5" /></View>
          <View style={styles.locationContent}><Text style={styles.locationLabel}>Pickup Location</Text><Text style={styles.locationAddress}>{deposit.location.address || 'Current Location'}</Text></View>
        </View>

        {['requested', 'agent_assigned'].includes(deposit.status) && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}><Ionicons name="close-circle" size={20} color="#EF4444" /><Text style={styles.cancelButtonText}>Cancel Request</Text></TouchableOpacity>
        )}

        {['arrived', 'cash_collected', 'deposited'].includes(deposit.status) && (
          <View style={styles.noCancelNote}>
            <Ionicons name="information-circle" size={20} color="#F59E0B" />
            <Text style={styles.noCancelText}>Cancellation is not allowed after the agent has arrived. Please complete the transaction or contact support.</Text>
          </View>
        )}

        {/* User Confirm Deposit Button - shown when awaiting confirmation */}
        {deposit.status === 'awaiting_confirmation' && (
          <View style={styles.confirmSection}>
            <View style={styles.confirmBanner}>
              <Ionicons name="checkmark-done-circle" size={24} color="#10B981" />
              <Text style={styles.confirmBannerText}>BC has completed the deposit. Please verify and confirm.</Text>
            </View>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmDeposit}>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm Deposit Received</Text>
            </TouchableOpacity>
          </View>
        )}

        {deposit.status === 'completed' && (
          <View style={styles.receiptNote}><Ionicons name="information-circle" size={20} color="#6B7280" /><Text style={styles.receiptNoteText}>This is NOT a bank receipt. Your cash has been deposited directly to your bank via authorized BC.</Text></View>
        )}
      </ScrollView>

      {/* Dark-themed Cancel Modal */}
      <Modal visible={showCancelModal} transparent animationType="fade" onRequestClose={() => setShowCancelModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="alert-circle" size={48} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Cancel Request?</Text>
            <Text style={styles.modalMessage}>Are you sure you want to cancel this deposit request? This action cannot be undone.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowCancelModal(false)} disabled={isCancelling}>
                <Text style={styles.modalCancelButtonText}>No, Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={confirmCancel} disabled={isCancelling}>
                {isCancelling ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalConfirmButtonText}>Yes, Cancel</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dark-themed Confirm Deposit Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade" onRequestClose={() => setShowConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={[styles.modalIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="checkmark-done-circle" size={48} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Confirm Deposit</Text>
            <Text style={styles.modalMessage}>Please confirm that your cash deposit of ₹{deposit?.amount?.toLocaleString()} has been successfully credited to your bank account.</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowConfirmModal(false)} disabled={isConfirming}>
                <Text style={styles.modalCancelButtonText}>Not Yet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalConfirmButton, { backgroundColor: '#10B981' }]} onPress={confirmDepositReceived} disabled={isConfirming}>
                {isConfirming ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.modalConfirmButtonText}>Yes, Confirm</Text>}
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
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  errorText: { fontSize: 18, color: '#FFFFFF', marginTop: 16, marginBottom: 24 },
  goBackButton: { backgroundColor: '#4F46E5', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  goBackButtonText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  statusCard: { backgroundColor: '#111827', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  statusIconContainer: { width: 72, height: 72, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusLabel: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  statusDescription: { fontSize: 14, color: '#9CA3AF', textAlign: 'center' },
  otpCard: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 16, padding: 20, alignItems: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  otpHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  otpTitle: { fontSize: 16, fontWeight: '600', color: '#10B981', marginLeft: 8 },
  otpCode: { fontSize: 36, fontWeight: '700', color: '#FFFFFF', letterSpacing: 8, marginBottom: 12 },
  otpInstructions: { marginBottom: 12, width: '100%' },
  otpInstructionText: { fontSize: 14, color: '#10B981', fontWeight: '600', marginBottom: 4 },
  otpNote: { fontSize: 12, color: '#F59E0B', textAlign: 'center', fontWeight: '500' },
  agentCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16 },
  agentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  agentAvatar: { width: 52, height: 52, borderRadius: 14, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  agentInfo: { flex: 1 },
  agentLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  agentName: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  agentMobile: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  etaContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 12, gap: 8 },
  etaText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  callButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 12, gap: 8 },
  callButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  timelineCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16 },
  timelineTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  timeline: {},
  timelineItem: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', marginRight: 14 },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  timelineDotCompleted: { backgroundColor: '#10B981' },
  timelineDotCurrent: { backgroundColor: '#4F46E5' },
  timelineLine: { width: 2, height: 32, backgroundColor: '#374151' },
  timelineLineCompleted: { backgroundColor: '#10B981' },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineLabel: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
  timelineLabelCompleted: { color: '#FFFFFF' },
  timelineTime: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
  amountCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16 },
  amountTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  amountLabel: { fontSize: 14, color: '#9CA3AF', flexShrink: 1 },
  amountValue: { fontSize: 14, fontWeight: '500', color: '#FFFFFF', marginLeft: 8 },
  amountDivider: { height: 1, backgroundColor: '#374151', marginVertical: 10 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },
  totalValue: { fontSize: 16, fontWeight: '700', color: '#10B981', marginLeft: 8 },
  locationCard: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16 },
  locationIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locationContent: { flex: 1 },
  locationLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  locationAddress: { fontSize: 14, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 },
  cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, paddingVertical: 14, gap: 8, marginBottom: 16 },
  cancelButtonText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
  noCancelNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 14, marginBottom: 16, gap: 10 },
  noCancelText: { flex: 1, fontSize: 13, color: '#F59E0B', lineHeight: 20 },
  // Confirm deposit section
  confirmSection: { marginBottom: 16 },
  confirmBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 12, padding: 14, gap: 10, marginBottom: 12 },
  confirmBannerText: { flex: 1, fontSize: 14, color: '#10B981', fontWeight: '500', lineHeight: 20 },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, gap: 10 },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  receiptNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#1F2937', borderRadius: 12, padding: 14 },
  receiptNoteText: { flex: 1, fontSize: 12, color: '#9CA3AF', marginLeft: 10, lineHeight: 18 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContainer: { backgroundColor: '#111827', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  modalIconContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  modalMessage: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelButton: { flex: 1, backgroundColor: '#1F2937', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalCancelButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  modalConfirmButton: { flex: 1, backgroundColor: '#EF4444', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  modalConfirmButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

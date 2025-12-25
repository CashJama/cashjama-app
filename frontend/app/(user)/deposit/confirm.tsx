import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../../src/services/api';
import DarkModal from '../../../src/components/DarkModal';

export default function ConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount: string; serviceFee: string; totalCash: string; latitude: string; longitude: string; address: string; accuracy: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showActiveModal, setShowActiveModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeDepositId, setActiveDepositId] = useState<string | null>(null);

  useEffect(() => {
    checkActiveDeposit();
  }, []);

  const checkActiveDeposit = async () => {
    try {
      const response = await api.getActiveDeposit();
      if (response.has_active && response.deposit) {
        setActiveDepositId(response.deposit.id);
        setShowActiveModal(true);
      }
    } catch (error) {
      console.log('Error checking active deposit:', error);
    }
  };

  const handleSubmit = async () => {
    if (!isConfirmed) { setShowConfirmModal(true); return; }
    setIsSubmitting(true);
    try {
      const response = await api.createDeposit({ amount: parseFloat(params.amount || '0'), location: { latitude: parseFloat(params.latitude || '0'), longitude: parseFloat(params.longitude || '0'), address: params.address, accuracy: parseFloat(params.accuracy || '0') } });
      if (response.success && response.deposit) { router.replace({ pathname: '/(user)/deposit/tracking', params: { depositId: response.deposit.id } }); }
      else { setErrorMessage('Failed to create deposit request. Please try again.'); setShowErrorModal(true); }
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to submit request. Please try again.';
      if (detail.includes('active')) {
        setActiveDepositId(err.response?.data?.deposit_id || null);
        setShowActiveModal(true);
      } else {
        setErrorMessage(detail);
        setShowErrorModal(true);
      }
    } finally { setIsSubmitting(false); }
  };

  const goToActiveDeposit = () => {
    setShowActiveModal(false);
    if (activeDepositId) {
      router.replace({ pathname: '/(user)/deposit/tracking', params: { depositId: activeDepositId } });
    } else {
      router.replace('/(user)/home');
    }
  };

  const amount = parseFloat(params.amount || '0');
  const serviceFee = parseFloat(params.serviceFee || '0');
  const totalCash = parseFloat(params.totalCash || '0');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} disabled={isSubmitting}><Ionicons name="arrow-back" size={24} color="#FFFFFF" /></TouchableOpacity>
          <View style={styles.headerContent}><Text style={styles.headerTitle}>Confirm Details</Text><Text style={styles.headerSubtitle}>Step 3 of 3</Text></View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}><Ionicons name="receipt" size={24} color="#4F46E5" /><Text style={styles.summaryTitle}>Deposit Summary</Text></View>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Deposit Amount</Text><Text style={styles.summaryValue}>₹{amount.toLocaleString()}</Text></View>
            <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Service Fee</Text><Text style={styles.summaryValue}>₹{serviceFee}</Text></View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}><Text style={styles.totalLabel}>Total Cash to Hand Over</Text><Text style={styles.totalValue}>₹{totalCash.toLocaleString()}</Text></View>
          </View>
        </View>

        <View style={styles.locationCard}>
          <View style={styles.locationHeader}>
            <View style={styles.locationIcon}><Ionicons name="location" size={22} color="#4F46E5" /></View>
            <View style={styles.locationInfo}><Text style={styles.locationLabel}>Pickup Location</Text><Text style={styles.locationAddress} numberOfLines={2}>{params.address || 'Current Location'}</Text></View>
          </View>
        </View>

        <View style={styles.noticeCard}>
          <View style={styles.noticeHeader}><Ionicons name="alert-circle" size={22} color="#F59E0B" /><Text style={styles.noticeTitle}>Important</Text></View>
          <View style={styles.noticeList}>
            {['Keep exact cash (₹' + totalCash.toLocaleString() + ') ready', 'A BC agent will arrive at your location shortly', 'Share the OTP only with the assigned agent', 'Your cash will be deposited directly to your bank'].map((text, i) => (
              <View key={i} style={styles.noticeItem}><View style={styles.bulletPoint} /><Text style={styles.noticeText}>{text}</Text></View>
            ))}
          </View>
        </View>

        <TouchableOpacity style={styles.confirmCheckbox} onPress={() => setIsConfirmed(!isConfirmed)} disabled={isSubmitting}>
          <View style={[styles.checkbox, isConfirmed && styles.checkboxChecked]}>{isConfirmed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}</View>
          <Text style={styles.confirmText}>I confirm the above details are correct and I understand that CashJama does NOT hold my money.</Text>
        </TouchableOpacity>

        <View style={styles.disclaimer}><Ionicons name="shield-checkmark" size={20} color="#4F46E5" /><Text style={styles.disclaimerText}>Cash is deposited directly into your bank via authorized BC (Business Correspondent). This is NOT a bank receipt.</Text></View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.submitButton, (!isConfirmed || isSubmitting) && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!isConfirmed || isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : (<><Text style={styles.submitButtonText}>Submit Request</Text><Ionicons name="checkmark-circle" size={20} color="#FFFFFF" /></>)}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  summaryCard: { backgroundColor: '#111827', borderRadius: 16, padding: 20, marginBottom: 16 },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  summaryTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginLeft: 10 },
  summaryContent: {},
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  summaryLabel: { fontSize: 15, color: '#9CA3AF', flexShrink: 1 },
  summaryValue: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginLeft: 8 },
  divider: { height: 1, backgroundColor: '#374151', marginVertical: 12 },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', flexShrink: 1 },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#10B981', marginLeft: 8 },
  locationCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 16 },
  locationHeader: { flexDirection: 'row', alignItems: 'center' },
  locationIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locationInfo: { flex: 1 },
  locationLabel: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  locationAddress: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 },
  noticeCard: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  noticeTitle: { fontSize: 16, fontWeight: '600', color: '#F59E0B', marginLeft: 8 },
  noticeList: { gap: 10 },
  noticeItem: { flexDirection: 'row', alignItems: 'flex-start' },
  bulletPoint: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B', marginTop: 6, marginRight: 10 },
  noticeText: { flex: 1, fontSize: 14, color: '#E5E7EB', lineHeight: 20 },
  confirmCheckbox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#111827', borderRadius: 12, padding: 16, marginBottom: 16 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#374151', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
  confirmText: { flex: 1, fontSize: 13, color: '#9CA3AF', lineHeight: 20 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: 12, padding: 14 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#9CA3AF', marginLeft: 10, lineHeight: 18 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0A0F1C', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1F2937' },
  submitButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 16, gap: 8 },
  submitButtonDisabled: { backgroundColor: '#374151', opacity: 0.7 },
  submitButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

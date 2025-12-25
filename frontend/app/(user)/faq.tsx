import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const RUPEE = '₹';

export default function FAQScreen() {
  const router = useRouter();

  const goBack = () => {
    // Navigate back to Profile tab
    router.push('/(user)/profile');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* What CashJama Does */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What CashJama Does</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What is CashJama?</Text>
            <Text style={styles.faqAnswer}>CashJama is a doorstep cash deposit service. We connect you with authorized Business Correspondents (BC agents) who come to your location, collect cash, and deposit it directly into your bank account.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How does it work?</Text>
            <Text style={styles.faqAnswer}>{`1. Enter the amount (min ${RUPEE}300)\n2. Set your pickup location\n3. A verified BC agent is assigned\n4. Agent arrives, collects cash & OTP\n5. Cash is deposited to your bank`}</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What are the service fees?</Text>
            <Text style={styles.faqAnswer}>{`${RUPEE}300 - ${RUPEE}999: ${RUPEE}40\n${RUPEE}1000 - ${RUPEE}1999: ${RUPEE}50\n${RUPEE}2000 - ${RUPEE}4999: ${RUPEE}70\n${RUPEE}5000+: ${RUPEE}100`}</Text>
          </View>
        </View>

        {/* What CashJama Does NOT Do */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleRed}>What CashJama Does NOT Do</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Does CashJama hold my money?</Text>
            <Text style={styles.faqAnswer}>NO. CashJama is NOT a wallet or payment app. We do not store, hold, or manage your funds. Cash goes directly to your bank via BC agents.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Can I transfer money through CashJama?</Text>
            <Text style={styles.faqAnswer}>NO. CashJama does not support money transfers, UPI payments, or digital transactions. We only facilitate cash deposits through BC agents.</Text>
          </View>
        </View>

        {/* User Verification */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Verification</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>How are users verified?</Text>
            <Text style={styles.faqAnswer}>Users are verified via mobile number + OTP only. No Aadhaar or fingerprint is required from users in the app.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What about Aadhaar/biometric verification?</Text>
            <Text style={styles.faqAnswer}>Aadhaar and fingerprint verification are handled by BC agents at the bank's micro-ATM device - this happens outside the CashJama app during the actual banking transaction.</Text>
          </View>
        </View>

        {/* Verification Clarification Box */}
        <View style={styles.clarificationBox}>
          <Ionicons name="finger-print" size={24} color="#4F46E5" />
          <View style={styles.clarificationContent}>
            <Text style={styles.clarificationTitle}>Verification Process</Text>
            <Text style={styles.clarificationText}>Users are verified via OTP only. Aadhaar & fingerprint verification are handled by BC agent at bank device - not in this app.</Text>
          </View>
        </View>

        {/* Safety */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Safety & Security</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>What is the OTP for?</Text>
            <Text style={styles.faqAnswer}>A unique OTP is generated for each request. Share this OTP only with the assigned BC agent at your doorstep to verify the transaction.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Why is location required?</Text>
            <Text style={styles.faqAnswer}>Location helps us assign the nearest BC agent and helps them navigate to you.</Text>
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="alert-circle" size={20} color="#F59E0B" />
          <Text style={styles.disclaimerText}>CashJama does NOT hold, store, or manage user funds. We are NOT a bank, wallet, or payment gateway. All deposits are processed by authorized BC agents.</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#10B981', marginBottom: 12 },
  sectionTitleRed: { fontSize: 18, fontWeight: '700', color: '#EF4444', marginBottom: 12 },
  faqItem: { backgroundColor: '#111827', borderRadius: 12, padding: 16, marginBottom: 10 },
  faqQuestion: { fontSize: 15, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  faqAnswer: { fontSize: 14, color: '#9CA3AF', lineHeight: 22 },
  clarificationBox: { flexDirection: 'row', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: 12, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(79, 70, 229, 0.3)' },
  clarificationContent: { flex: 1, marginLeft: 12 },
  clarificationTitle: { fontSize: 15, fontWeight: '600', color: '#4F46E5', marginBottom: 4 },
  clarificationText: { fontSize: 13, color: '#E5E7EB', lineHeight: 20 },
  disclaimer: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 14 },
  disclaimerText: { flex: 1, fontSize: 12, color: '#F59E0B', marginLeft: 10, lineHeight: 18 },
});

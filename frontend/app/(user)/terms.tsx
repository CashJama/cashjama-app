import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.sectionText}>
            By accessing and using the CashJama mobile application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Service Description</Text>
          <Text style={styles.sectionText}>
            CashJama is a platform that connects users with authorized Business Correspondents (BC Agents) for doorstep cash deposit services. We facilitate the connection between users and BC agents but do not directly handle, store, or transfer money.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
          <Text style={styles.sectionText}>
            • Provide accurate information during registration{"\n"}
            • Verify the identity of BC agents before handing over cash{"\n"}
            • Use the OTP system for transaction verification{"\n"}
            • Report any suspicious activity immediately{"\n"}
            • Ensure you have the exact cash amount ready
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Service Fees</Text>
          <Text style={styles.sectionText}>
            Service fees are charged based on the deposit amount as per our published fee structure. Fees are collected by the BC agent along with the deposit amount and are non-refundable once the service is completed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Cancellation Policy</Text>
          <Text style={styles.sectionText}>
            Users may cancel a deposit request before a BC agent arrives at the location. Once the BC agent has arrived and verified the OTP, cancellation is not permitted.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Limitation of Liability</Text>
          <Text style={styles.sectionText}>
            CashJama acts as a facilitator and is not liable for any disputes between users and BC agents, or for any loss arising from the use of our services. Users are advised to exercise due diligence.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Contact</Text>
          <Text style={styles.sectionText}>
            For any questions regarding these terms, please contact our support team through the app.
          </Text>
        </View>

        <View style={styles.pilotNote}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.pilotNoteText}>
            Note: This is a pilot version. Full terms and conditions will be updated before public launch.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  lastUpdated: { fontSize: 12, color: '#6B7280', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  sectionText: { fontSize: 14, color: '#9CA3AF', lineHeight: 22 },
  pilotNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 16, marginTop: 8 },
  pilotNoteText: { flex: 1, fontSize: 13, color: '#F59E0B', marginLeft: 12, lineHeight: 20 },
});

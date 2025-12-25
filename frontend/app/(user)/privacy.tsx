import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyScreen() {
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
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: December 2024</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.sectionText}>
            We collect the following information:{"\n"}
            • Mobile phone number for authentication{"\n"}
            • Name (optional) for personalization{"\n"}
            • Location data for service delivery{"\n"}
            • Transaction history for your records
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.sectionText}>
            Your information is used to:{"\n"}
            • Provide and improve our services{"\n"}
            • Connect you with BC agents{"\n"}
            • Process and track your deposit requests{"\n"}
            • Send important service notifications{"\n"}
            • Ensure security and prevent fraud
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Data Sharing</Text>
          <Text style={styles.sectionText}>
            We share limited information with BC agents only when necessary to complete your deposit request. This includes your approximate location and the deposit amount. We do not sell your personal data to third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.sectionText}>
            We implement industry-standard security measures to protect your data. All communications are encrypted, and we follow best practices for data storage and access control.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights</Text>
          <Text style={styles.sectionText}>
            You have the right to:{"\n"}
            • Access your personal data{"\n"}
            • Request data correction{"\n"}
            • Request account deletion{"\n"}
            • Opt-out of non-essential communications
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.sectionText}>
            We retain your transaction data for a period of 7 years as required by financial regulations. Account data is retained until you request deletion.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Contact Us</Text>
          <Text style={styles.sectionText}>
            For privacy-related inquiries, please contact our support team through the app or email us at privacy@cashjama.com
          </Text>
        </View>

        <View style={styles.pilotNote}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.pilotNoteText}>
            Note: This is a pilot version. Full privacy policy will be updated before public launch.
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

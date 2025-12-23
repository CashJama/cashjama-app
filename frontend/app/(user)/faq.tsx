import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const RUPEE = '₹';

interface FAQItemProps {
  question: string;
  answer: string;
  icon: string;
  iconColor: string;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, icon, iconColor }) => (
  <View style={styles.faqItem}>
    <View style={styles.faqHeader}>
      <View style={[styles.faqIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon as any} size={20} color={iconColor} />
      </View>
      <Text style={styles.faqQuestion}>{question}</Text>
    </View>
    <Text style={styles.faqAnswer}>{answer}</Text>
  </View>
);

export default function FAQScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & FAQ</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* What CashJama Does */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.sectionTitle}>What CashJama Does</Text>
          </View>
          
          <FAQItem
            icon="cash"
            iconColor="#10B981"
            question="What is CashJama?"
            answer="CashJama is a doorstep cash deposit service. We connect you with authorized Business Correspondents (BC agents) who come to your location, collect cash, and deposit it directly into your bank account."
          />
          
          <FAQItem
            icon="home"
            iconColor="#10B981"
            question="How does doorstep deposit work?"
            answer={`1. Enter the amount you want to deposit (minimum ${RUPEE}300)\n2. Set your pickup location\n3. A verified BC agent is assigned\n4. Agent arrives, collects cash & OTP\n5. Cash is deposited to your bank`}
          />
          
          <FAQItem
            icon="pricetag"
            iconColor="#10B981"
            question="What are the service fees?"
            answer={`Flat fee structure:\n• ${RUPEE}300 - ${RUPEE}999: ${RUPEE}40\n• ${RUPEE}1000 - ${RUPEE}1999: ${RUPEE}50\n• ${RUPEE}2000 - ${RUPEE}4999: ${RUPEE}70\n• ${RUPEE}5000+: ${RUPEE}100\n\nFees are paid in cash along with your deposit amount.`}
          />
          
          <FAQItem
            icon="person"
            iconColor="#10B981"
            question="Who are BC agents?"
            answer="Business Correspondents (BCs) are banking agents authorized by RBI and banks to provide basic banking services. All our BC agents are verified, trained, and carry valid identification."
          />
        </View>

        {/* What CashJama Does NOT Do */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
            <Text style={styles.sectionTitle}>What CashJama Does NOT Do</Text>
          </View>
          
          <FAQItem
            icon="wallet"
            iconColor="#EF4444"
            question="Does CashJama hold my money?"
            answer="NO. CashJama is NOT a wallet or payment app. We do not store, hold, or manage your funds in any way. Cash collected by BC agents goes directly to your bank - not to CashJama."
          />
          
          <FAQItem
            icon="swap-horizontal"
            iconColor="#EF4444"
            question="Can I transfer money through CashJama?"
            answer="NO. CashJama does not support money transfers, UPI payments, or any digital transactions. We only facilitate cash deposits through BC agents."
          />
          
          <FAQItem
            icon="card"
            iconColor="#EF4444"
            question="Is CashJama a bank or payment gateway?"
            answer="NO. CashJama is a service platform that connects you with banking agents. We are not a bank, NBFC, wallet, or payment processor. All deposits are handled by authorized banking channels."
          />
        </View>

        {/* Safety & Security */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="shield-checkmark" size={24} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Safety & Security</Text>
          </View>
          
          <FAQItem
            icon="key"
            iconColor="#4F46E5"
            question="What is the OTP for?"
            answer="A unique OTP is generated for each deposit request. This OTP verifies that the correct BC agent is servicing your request. Never share this OTP with anyone except the assigned agent at your doorstep."
          />
          
          <FAQItem
            icon="location"
            iconColor="#4F46E5"
            question="Why is location required?"
            answer="We need your location to assign the nearest available BC agent. Location helps agents navigate to you and ensures faster service. Your location data is used only for agent assignment."
          />
          
          <FAQItem
            icon="document-text"
            iconColor="#4F46E5"
            question="Will I get a receipt?"
            answer="Yes, you will receive a service receipt in the app. Note: This is a CashJama service receipt, NOT a bank receipt. Your bank deposit confirmation will come from your bank directly."
          />
          
          <FAQItem
            icon="alert-circle"
            iconColor="#4F46E5"
            question="What if the agent doesn't arrive?"
            answer="You can cancel your request anytime before the agent arrives. If there are delays, you can track the agent's status in the app or contact support. You will not be charged for cancelled requests."
          />
        </View>

        {/* Disclaimers */}
        <View style={styles.disclaimerSection}>
          <View style={styles.disclaimerHeader}>
            <Ionicons name="information-circle" size={22} color="#F59E0B" />
            <Text style={styles.disclaimerTitle}>Important Disclaimers</Text>
          </View>
          <View style={styles.disclaimerList}>
            <Text style={styles.disclaimerItem}>• CashJama does NOT hold, store, or manage user funds</Text>
            <Text style={styles.disclaimerItem}>• We are NOT a bank, wallet, or payment gateway</Text>
            <Text style={styles.disclaimerItem}>• Service fees are for operational costs only</Text>
            <Text style={styles.disclaimerItem}>• All deposits are processed by authorized BC agents</Text>
            <Text style={styles.disclaimerItem}>• Bank deposit confirmations come from your bank</Text>
            <Text style={styles.disclaimerItem}>• Users must verify agent identity before handing over cash</Text>
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.supportSection}>
          <Text style={styles.supportTitle}>Need more help?</Text>
          <Text style={styles.supportText}>Contact our support team for any questions or issues.</Text>
          <TouchableOpacity style={styles.supportButton}>
            <Ionicons name="chatbubble" size={20} color="#FFFFFF" />
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginLeft: 10 },
  
  faqItem: { backgroundColor: '#111827', borderRadius: 14, padding: 16, marginBottom: 12 },
  faqHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  faqIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  faqQuestion: { flex: 1, fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  faqAnswer: { fontSize: 14, color: '#9CA3AF', lineHeight: 22 },
  
  disclaimerSection: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  disclaimerTitle: { fontSize: 16, fontWeight: '600', color: '#F59E0B', marginLeft: 8 },
  disclaimerList: { gap: 8 },
  disclaimerItem: { fontSize: 13, color: '#E5E7EB', lineHeight: 20 },
  
  supportSection: { backgroundColor: '#111827', borderRadius: 16, padding: 20, alignItems: 'center' },
  supportTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  supportText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', marginBottom: 16 },
  supportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, gap: 8 },
  supportButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
});

import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ContactScreen() {
  const router = useRouter();

  const contactOptions = [
    {
      icon: 'mail',
      title: 'Email Support',
      subtitle: 'support@cashjama.com',
      action: () => Linking.openURL('mailto:support@cashjama.com'),
    },
    {
      icon: 'call',
      title: 'Phone Support',
      subtitle: '+91 1800-XXX-XXXX',
      action: () => Linking.openURL('tel:+911800000000'),
    },
    {
      icon: 'chatbubbles',
      title: 'WhatsApp',
      subtitle: 'Chat with us',
      action: () => Linking.openURL('https://wa.me/911800000000'),
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Us</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="headset" size={40} color="#4F46E5" />
          </View>
          <Text style={styles.heroTitle}>We're Here to Help</Text>
          <Text style={styles.heroSubtitle}>Our support team is available to assist you with any questions or issues.</Text>
        </View>

        <View style={styles.contactOptions}>
          {contactOptions.map((option, index) => (
            <TouchableOpacity key={index} style={styles.contactItem} onPress={option.action}>
              <View style={styles.contactIcon}>
                <Ionicons name={option.icon as any} size={24} color="#4F46E5" />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{option.title}</Text>
                <Text style={styles.contactSubtitle}>{option.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.hoursSection}>
          <Text style={styles.hoursTitle}>Support Hours</Text>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Monday - Friday</Text>
            <Text style={styles.hoursTime}>9:00 AM - 6:00 PM</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Saturday</Text>
            <Text style={styles.hoursTime}>10:00 AM - 4:00 PM</Text>
          </View>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursDay}>Sunday</Text>
            <Text style={styles.hoursTime}>Closed</Text>
          </View>
        </View>

        <View style={styles.pilotNote}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={styles.pilotNoteText}>
            Pilot Version: For urgent issues during the pilot, please contact your assigned pilot coordinator directly.
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
  heroSection: { alignItems: 'center', paddingVertical: 32 },
  heroIcon: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginBottom: 8 },
  heroSubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20 },
  contactOptions: { marginBottom: 24 },
  contactItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12 },
  contactIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  contactInfo: { flex: 1 },
  contactTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  contactSubtitle: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  hoursSection: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 24 },
  hoursTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  hoursRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  hoursDay: { fontSize: 14, color: '#9CA3AF' },
  hoursTime: { fontSize: 14, fontWeight: '500', color: '#FFFFFF' },
  pilotNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 16 },
  pilotNoteText: { flex: 1, fontSize: 13, color: '#F59E0B', marginLeft: 12, lineHeight: 20 },
});

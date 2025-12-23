import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }
    setIsLoading(true);
    try {
      await api.updateProfile({ name: name.trim() });
      updateUser({ name: name.trim() });
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color="#4F46E5" />
          </View>
          <View style={styles.profileInfo}>
            {isEditing ? (
              <TextInput style={styles.nameInput} value={name} onChangeText={setName} placeholder="Enter your name" placeholderTextColor="#6B7280" autoFocus />
            ) : (
              <Text style={styles.profileName}>{user?.name || 'Set your name'}</Text>
            )}
            <Text style={styles.profileMobile}>+91 {user?.mobile}</Text>
          </View>
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setName(user?.name || ''); setIsEditing(false); }} disabled={isLoading}>
                <Ionicons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={isLoading}>
                {isLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark" size={20} color="#FFFFFF" />}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Ionicons name="pencil" size={18} color="#4F46E5" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Account</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(user)/history')}>
            <View style={styles.menuItemIcon}><Ionicons name="receipt-outline" size={22} color="#4F46E5" /></View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>My Deposits</Text>
              <Text style={styles.menuItemSubtitle}>View all deposit history</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Support</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/(user)/faq')}>
            <View style={styles.menuItemIcon}><Ionicons name="help-circle-outline" size={22} color="#4F46E5" /></View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Help & FAQ</Text>
              <Text style={styles.menuItemSubtitle}>Learn what CashJama does & doesn't do</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIcon}><Ionicons name="chatbubble-outline" size={22} color="#4F46E5" /></View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Contact Us</Text>
              <Text style={styles.menuItemSubtitle}>Reach out for support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Legal</Text>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIcon}><Ionicons name="document-text-outline" size={22} color="#4F46E5" /></View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Terms of Service</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemIcon}><Ionicons name="shield-outline" size={22} color="#4F46E5" /></View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemTitle}>Privacy Policy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { paddingVertical: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 24 },
  avatarContainer: { width: 64, height: 64, borderRadius: 16, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
  profileMobile: { fontSize: 14, color: '#9CA3AF' },
  nameInput: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', backgroundColor: '#1F2937', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 4, borderWidth: 1, borderColor: '#374151' },
  editButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center' },
  editActions: { flexDirection: 'row', gap: 8 },
  cancelButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  saveButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
  menuSection: { marginBottom: 24 },
  menuSectionTitle: { fontSize: 14, fontWeight: '600', color: '#6B7280', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 8 },
  menuItemIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuItemContent: { flex: 1 },
  menuItemTitle: { fontSize: 15, fontWeight: '500', color: '#FFFFFF' },
  menuItemSubtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, paddingVertical: 14, gap: 8, marginTop: 8 },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#EF4444' },
  versionText: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 24 },
});

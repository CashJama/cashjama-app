import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, useFocusEffect, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View, Text, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../../src/services/api';

export default function BCLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [hasLockedJob, setHasLockedJob] = useState(false);
  const [lockedJobId, setLockedJobId] = useState<string | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  // Check for locked jobs on mount and when returning to layout
  useFocusEffect(
    useCallback(() => {
      checkForLockedJobs();
    }, [])
  );

  const checkForLockedJobs = async () => {
    try {
      const response = await api.getAssignedJobs();
      const jobs = response.jobs || [];
      // Find any job that is in a locked state (after OTP verification)
      const lockedJob = jobs.find((job: any) => 
        ['cash_collected', 'deposited', 'awaiting_confirmation'].includes(job.status)
      );
      
      if (lockedJob) {
        setHasLockedJob(true);
        setLockedJobId(lockedJob.id);
      } else {
        setHasLockedJob(false);
        setLockedJobId(null);
      }
    } catch (error) {
      console.log('Error checking for locked jobs:', error);
    }
  };

  const handleTabPress = (routeName: string) => {
    // If there's a locked job and user is trying to navigate away from job screen
    if (hasLockedJob && !pathname.includes('/job/')) {
      // Allow navigation - they're already out of job details
      return true;
    }
    
    if (hasLockedJob && pathname.includes('/job/') && routeName !== 'job/[id]') {
      setShowLockModal(true);
      return false;
    }
    return true;
  };

  const goToLockedJob = () => {
    setShowLockModal(false);
    if (lockedJobId) {
      router.push({ pathname: '/(bc)/job/[id]', params: { id: lockedJobId } });
    }
  };

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#111827',
            borderTopColor: '#1F2937',
            borderTopWidth: 1,
            height: Platform.OS === 'ios' ? 88 : 70,
            paddingBottom: Platform.OS === 'ios' ? 28 : 12,
            paddingTop: 12,
          },
          tabBarActiveTintColor: '#10B981',
          tabBarInactiveTintColor: '#6B7280',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
          },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{
            title: 'Jobs',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="briefcase" size={size} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!handleTabPress('home')) {
                e.preventDefault();
              }
            },
          }}
        />
        <Tabs.Screen
          name="earnings"
          options={{
            title: 'Earnings',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="wallet" size={size} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!handleTabPress('earnings')) {
                e.preventDefault();
              }
            },
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
          listeners={{
            tabPress: (e) => {
              if (!handleTabPress('profile')) {
                e.preventDefault();
              }
            },
          }}
        />
        <Tabs.Screen
          name="job/[id]"
          options={{
            href: null,
          }}
        />
      </Tabs>

      {/* Lock Modal */}
      <Modal visible={showLockModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalIconContainer}>
              <Ionicons name="lock-closed" size={48} color="#F59E0B" />
            </View>
            <Text style={styles.modalTitle}>Transaction In Progress</Text>
            <Text style={styles.modalMessage}>
              Please complete the current transaction before navigating away. Cash has been collected and must be deposited.
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={goToLockedJob}>
              <Text style={styles.modalButtonText}>Go to Active Job</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
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
  modalButton: {
    width: '100%',
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

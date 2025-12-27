import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { api } from '../../src/services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const RUPEE = '₹';
const POLL_INTERVAL = 10000; // 10 seconds auto-refresh

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [activeDeposit, setActiveDeposit] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feeExpanded, setFeeExpanded] = useState(false);
  const [newCompletedCount, setNewCompletedCount] = useState(0);
  const feeHeight = useRef(new Animated.Value(0)).current;
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appState = useRef(AppState.currentState);

  // Refresh active deposit state every time screen comes into focus
  useFocusEffect(
    useCallback(() => {
      checkActiveDeposit();
      checkNewCompletedDeposits();
      startPolling();
      
      return () => {
        stopPolling();
      };
    }, [])
  );

  // Handle app state changes for polling
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        checkActiveDeposit();
        checkNewCompletedDeposits();
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
      checkActiveDeposit();
    }, POLL_INTERVAL);
  };

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const checkActiveDeposit = async () => {
    try {
      const response = await api.getActiveDeposit();
      if (response.has_active && response.deposit) {
        setActiveDeposit(response.deposit);
      } else {
        setActiveDeposit(null);
      }
    } catch (error: any) {
      console.log('Error checking active deposit:', error);
      // Handle 401 silently - will be handled by token expiry logic
      if (error.response?.status === 401) {
        handleTokenExpiry();
      } else {
        setActiveDeposit(null);
      }
    }
  };

  const checkNewCompletedDeposits = async () => {
    try {
      const lastSeenId = await AsyncStorage.getItem('last_seen_completed_id');
      const response = await api.getMyDeposits();
      const completedDeposits = (response.deposits || []).filter((d: any) => d.status === 'completed');
      
      if (completedDeposits.length > 0) {
        const latestId = completedDeposits[0].id;
        if (!lastSeenId) {
          // First time - no notification
          await AsyncStorage.setItem('last_seen_completed_id', latestId);
          setNewCompletedCount(0);
        } else if (lastSeenId !== latestId) {
          // New completed deposit
          const newCount = completedDeposits.findIndex((d: any) => d.id === lastSeenId);
          setNewCompletedCount(newCount === -1 ? completedDeposits.length : newCount);
        } else {
          setNewCompletedCount(0);
        }
      }
    } catch (error) {
      console.log('Error checking completed deposits:', error);
    }
  };

  const handleTokenExpiry = async () => {
    // Clear auth and redirect to login
    await logout();
    router.replace('/(auth)/login');
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await checkActiveDeposit();
    await checkNewCompletedDeposits();
    setIsRefreshing(false);
  };

  const handleNewDeposit = () => {
    if (activeDeposit) {
      router.push({
        pathname: '/(user)/deposit/tracking',
        params: { depositId: activeDeposit.id },
      });
    } else {
      router.push('/(user)/deposit/amount');
    }
  };

  const handleHistoryPress = async () => {
    // Clear notification when user views history
    try {
      const response = await api.getMyDeposits();
      const completedDeposits = (response.deposits || []).filter((d: any) => d.status === 'completed');
      if (completedDeposits.length > 0) {
        await AsyncStorage.setItem('last_seen_completed_id', completedDeposits[0].id);
      }
    } catch (error) {
      console.log('Error clearing notification:', error);
    }
    setNewCompletedCount(0);
    router.push('/(user)/history');
  };

  const toggleFeeExpand = () => {
    const toValue = feeExpanded ? 0 : 1;
    Animated.timing(feeHeight, {
      toValue,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setFeeExpanded(!feeExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return '#F59E0B';
      case 'agent_assigned': return '#3B82F6';
      case 'arrived': return '#8B5CF6';
      case 'cash_collected': return '#EC4899';
      case 'deposited': return '#10B981';
      case 'completed': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Searching for Agent';
      case 'agent_assigned': return 'Agent Assigned';
      case 'arrived': return 'Agent Arrived';
      case 'cash_collected': return 'Cash Collected';
      case 'deposited': return 'Being Deposited';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  const feeGridHeight = feeHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 180],
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={handleHistoryPress}>
            <Ionicons name="time-outline" size={24} color="#FFFFFF" />
            {newCompletedCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{newCompletedCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {activeDeposit && (
          <TouchableOpacity
            style={styles.activeCard}
            onPress={() => router.push({ pathname: '/(user)/deposit/tracking', params: { depositId: activeDeposit.id } })}
          >
            <View style={styles.activeCardHeader}>
              <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(activeDeposit.status)}20` }]}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(activeDeposit.status) }]} />
                <Text style={[styles.statusText, { color: getStatusColor(activeDeposit.status) }]}>
                  {getStatusLabel(activeDeposit.status)}
                </Text>
              </View>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            <View style={styles.activeCardContent}>
              <View>
                <Text style={styles.activeCardLabel}>Deposit Amount</Text>
                <Text style={styles.activeCardAmount}>{RUPEE}{activeDeposit.amount.toLocaleString()}</Text>
              </View>
              <View style={styles.activeCardRight}>
                <Text style={styles.activeCardLabel}>Total Cash</Text>
                <Text style={styles.activeCardTotal}>{RUPEE}{activeDeposit.total_cash.toLocaleString()}</Text>
              </View>
            </View>
            <Text style={styles.tapToTrack}>Tap to track your request →</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.ctaButton} onPress={handleNewDeposit} activeOpacity={0.8}>
          <View style={styles.ctaIconContainer}>
            <Ionicons name="cash" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>{activeDeposit ? 'Track Your Deposit' : 'Deposit Cash at Home'}</Text>
            <Text style={styles.ctaSubtitle}>
              {activeDeposit ? 'View live status and agent details' : 'Get cash deposited to your bank via BC agent'}
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={40} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Collapsible Fee Structure */}
        <TouchableOpacity style={styles.feeHeader} onPress={toggleFeeExpand} activeOpacity={0.7}>
          <Text style={styles.feeTitle}>Service Fee Structure</Text>
          <Ionicons 
            name={feeExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#9CA3AF" 
          />
        </TouchableOpacity>
        <Animated.View style={[styles.feeGridContainer, { height: feeGridHeight, overflow: 'hidden' }]}>
          <View style={styles.feeGrid}>
            {[
              { range: `${RUPEE}300 - ${RUPEE}999`, fee: `${RUPEE}40` },
              { range: `${RUPEE}1000 - ${RUPEE}1999`, fee: `${RUPEE}50` },
              { range: `${RUPEE}2000 - ${RUPEE}4999`, fee: `${RUPEE}70` },
              { range: `${RUPEE}5000+`, fee: `${RUPEE}100` }
            ].map((item, idx) => (
              <View key={idx} style={styles.feeItem}>
                <Text style={styles.feeRange}>{item.range}</Text>
                <Text style={styles.feeAmount}>{item.fee}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsList}>
            {[
              { icon: 'create', title: 'Enter Amount', desc: `Min ${RUPEE}300 deposit` },
              { icon: 'location', title: 'Set Location', desc: 'Your doorstep' },
              { icon: 'person', title: 'Agent Arrives', desc: 'Verified BC agent' },
              { icon: 'checkmark-circle', title: 'Cash Deposited', desc: 'Direct to your bank' }
            ].map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={styles.stepIconContainer}>
                  <Ionicons name={step.icon as any} size={20} color="#4F46E5" />
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
                {index < 3 && <View style={styles.stepConnector} />}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark" size={24} color="#4F46E5" />
          <Text style={styles.disclaimerText}>
            CashJama does NOT hold your money. Cash is deposited directly into your bank via authorized BC (Business Correspondent).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 20 },
  greeting: { fontSize: 14, color: '#9CA3AF' },
  userName: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', marginTop: 4 },
  notificationButton: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    backgroundColor: '#1F2937', 
    alignItems: 'center', 
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  activeCard: { 
    backgroundColor: '#111827', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 20, 
    borderWidth: 1, 
    borderColor: '#1F2937' 
  },
  activeCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '600' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  activeCardContent: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  activeCardLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 4 },
  activeCardAmount: { fontSize: 24, fontWeight: '700', color: '#FFFFFF' },
  activeCardRight: { alignItems: 'flex-end' },
  activeCardTotal: { fontSize: 18, fontWeight: '600', color: '#10B981' },
  tapToTrack: { fontSize: 12, color: '#4F46E5', textAlign: 'center', fontWeight: '600' },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  ctaIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaContent: { flex: 1, marginLeft: 16 },
  ctaTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
  ctaSubtitle: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' },
  // Collapsible Fee Structure
  feeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 4,
  },
  feeTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  feeGridContainer: {
    backgroundColor: '#111827',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    marginBottom: 20,
    marginTop: -4,
  },
  feeGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  feeItem: {
    width: '48%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  feeRange: { fontSize: 13, color: '#9CA3AF', marginBottom: 4 },
  feeAmount: { fontSize: 18, fontWeight: '700', color: '#10B981' },
  howItWorks: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  stepsList: {},
  stepItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepContent: { marginLeft: 12, flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '600', color: '#FFFFFF', marginBottom: 2 },
  stepDesc: { fontSize: 12, color: '#9CA3AF' },
  stepConnector: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 24,
    backgroundColor: '#1F2937',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: '#A5B4FC', marginLeft: 12, lineHeight: 18 },
});

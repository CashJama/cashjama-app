import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/context/AuthContext';
import { api } from '@/src/services/api';

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeDeposit, setActiveDeposit] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    checkActiveDeposit();
  }, []);

  const checkActiveDeposit = async () => {
    try {
      const response = await api.getActiveDeposit();
      if (response.has_active && response.deposit) {
        setActiveDeposit(response.deposit);
      } else {
        setActiveDeposit(null);
      }
    } catch (error) {
      console.log('Error checking active deposit:', error);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await checkActiveDeposit();
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested':
        return '#F59E0B';
      case 'agent_assigned':
        return '#3B82F6';
      case 'in_progress':
        return '#8B5CF6';
      case 'completed':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested':
        return 'Searching for Agent';
      case 'agent_assigned':
        return 'Agent Assigned';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#4F46E5"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>
              {user?.name || 'User'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={() => {}}
          >
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Active Deposit Card */}
        {activeDeposit && (
          <TouchableOpacity
            style={styles.activeCard}
            onPress={() =>
              router.push({
                pathname: '/(user)/deposit/tracking',
                params: { depositId: activeDeposit.id },
              })
            }
          >
            <View style={styles.activeCardHeader}>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(activeDeposit.status)}20` },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(activeDeposit.status) },
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: getStatusColor(activeDeposit.status) },
                  ]}
                >
                  {getStatusLabel(activeDeposit.status)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
            <View style={styles.activeCardContent}>
              <View>
                <Text style={styles.activeCardLabel}>Deposit Amount</Text>
                <Text style={styles.activeCardAmount}>
                  ₹{activeDeposit.amount.toLocaleString()}
                </Text>
              </View>
              <View style={styles.activeCardRight}>
                <Text style={styles.activeCardLabel}>Total Cash</Text>
                <Text style={styles.activeCardTotal}>
                  ₹{activeDeposit.total_cash.toLocaleString()}
                </Text>
              </View>
            </View>
            <Text style={styles.tapToTrack}>Tap to track your request</Text>
          </TouchableOpacity>
        )}

        {/* Main CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleNewDeposit}
          activeOpacity={0.8}
        >
          <View style={styles.ctaIconContainer}>
            <Ionicons name="cash" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.ctaContent}>
            <Text style={styles.ctaTitle}>
              {activeDeposit ? 'Track Your Deposit' : 'Deposit Cash at Home'}
            </Text>
            <Text style={styles.ctaSubtitle}>
              {activeDeposit
                ? 'View live status and agent details'
                : 'Get cash deposited to your bank via BC agent'}
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={40} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Fee Info */}
        <View style={styles.feeCard}>
          <Text style={styles.feeTitle}>Service Fee Structure</Text>
          <View style={styles.feeGrid}>
            <View style={styles.feeItem}>
              <Text style={styles.feeRange}>₹300 - ₹999</Text>
              <Text style={styles.feeAmount}>₹40</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeRange}>₹1000 - ₹1999</Text>
              <Text style={styles.feeAmount}>₹50</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeRange}>₹2000 - ₹4999</Text>
              <Text style={styles.feeAmount}>₹70</Text>
            </View>
            <View style={styles.feeItem}>
              <Text style={styles.feeRange}>₹5000+</Text>
              <Text style={styles.feeAmount}>₹100</Text>
            </View>
          </View>
        </View>

        {/* How it Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.sectionTitle}>How It Works</Text>
          <View style={styles.stepsList}>
            {[
              { icon: 'create', title: 'Enter Amount', desc: 'Min ₹300 deposit' },
              { icon: 'location', title: 'Set Location', desc: 'Your doorstep' },
              { icon: 'person', title: 'Agent Arrives', desc: 'Verified BC agent' },
              { icon: 'checkmark-circle', title: 'Cash Deposited', desc: 'Direct to your bank' },
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

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Ionicons name="shield-checkmark" size={24} color="#4F46E5" />
          <Text style={styles.disclaimerText}>
            CashJama does NOT hold your money. Cash is deposited directly into
            your bank via authorized BC (Business Correspondent).
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  activeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  activeCardLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  activeCardAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeCardRight: {
    alignItems: 'flex-end',
  },
  activeCardTotal: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  tapToTrack: {
    fontSize: 12,
    color: '#4F46E5',
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  ctaIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  ctaContent: {
    flex: 1,
  },
  ctaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  ctaSubtitle: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  feeCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  feeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  feeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  feeItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
  },
  feeRange: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  howItWorks: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  stepDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  stepConnector: {
    position: 'absolute',
    left: 19,
    top: 40,
    width: 2,
    height: 16,
    backgroundColor: '#374151',
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 12,
    lineHeight: 18,
  },
});

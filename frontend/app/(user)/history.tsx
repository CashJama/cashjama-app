import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../src/services/api';
import { format } from 'date-fns';

// Helper function to format time to local timezone
const formatLocalDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, 'MMM dd, yyyy • hh:mm a');
};

interface Deposit {
  id: string;
  amount: number;
  service_fee: number;
  total_cash: number;
  status: string;
  created_at: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const response = await api.getMyDeposits();
      setDeposits(response.deposits || []);
    } catch (error) {
      console.error('Error fetching deposits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await fetchDeposits();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'requested': return '#F59E0B';
      case 'agent_assigned': return '#3B82F6';
      case 'in_progress': return '#8B5CF6';
      case 'completed': return '#10B981';
      case 'cancelled': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'requested': return 'Requested';
      case 'agent_assigned': return 'Agent Assigned';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'requested': return 'time';
      case 'agent_assigned': return 'person';
      case 'in_progress': return 'bicycle';
      case 'completed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const renderDepositItem = ({ item }: { item: Deposit }) => (
    <TouchableOpacity
      style={styles.depositCard}
      onPress={() => router.push({ pathname: '/(user)/deposit/tracking', params: { depositId: item.id } })}
    >
      <View style={styles.depositHeader}>
        <View style={[styles.statusIconContainer, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Ionicons name={getStatusIcon(item.status) as any} size={20} color={getStatusColor(item.status)} />
        </View>
        <View style={styles.depositInfo}>
          <Text style={styles.depositAmount}>₹{item.amount.toLocaleString()}</Text>
          <Text style={styles.depositDate}>{format(new Date(item.created_at), 'MMM dd, yyyy • hh:mm a')}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}20` }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>
      <View style={styles.depositDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Service Fee</Text>
          <Text style={styles.detailValue}>₹{item.service_fee}</Text>
        </View>
        <View style={styles.detailDivider} />
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Total Cash</Text>
          <Text style={styles.detailValueHighlight}>₹{item.total_cash.toLocaleString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="receipt-outline" size={48} color="#4F46E5" />
      </View>
      <Text style={styles.emptyTitle}>No Deposits Yet</Text>
      <Text style={styles.emptySubtitle}>Your deposit history will appear here once you make your first deposit request.</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={() => router.push('/(user)/deposit/amount')}>
        <Text style={styles.emptyButtonText}>Make First Deposit</Text>
        <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Deposit History</Text>
        <Text style={styles.headerSubtitle}>{deposits.length} {deposits.length === 1 ? 'request' : 'requests'}</Text>
      </View>
      <FlatList
        data={deposits}
        renderItem={renderDepositItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, deposits.length === 0 && styles.emptyListContent]}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#4F46E5" />}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingVertical: 20 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyListContent: { flex: 1 },
  depositCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F2937' },
  depositHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  statusIconContainer: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  depositInfo: { flex: 1 },
  depositAmount: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  depositDate: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  depositDetails: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 10, padding: 12 },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#9CA3AF', marginBottom: 2 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  detailValueHighlight: { fontSize: 14, fontWeight: '600', color: '#10B981' },
  detailDivider: { width: 1, height: 30, backgroundColor: '#374151', marginHorizontal: 16 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24, gap: 8 },
  emptyButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

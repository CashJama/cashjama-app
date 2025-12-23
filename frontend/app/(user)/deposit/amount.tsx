import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services/api';

export default function AmountScreen() {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [serviceFee, setServiceFee] = useState(0);
  const [totalCash, setTotalCash] = useState(0);
  const [error, setError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    if (numAmount >= 300) {
      calculateFee(numAmount);
    } else {
      setServiceFee(0);
      setTotalCash(0);
    }
  }, [amount]);

  const calculateFee = async (numAmount: number) => {
    setIsCalculating(true);
    try {
      const response = await api.calculateFee(numAmount);
      setServiceFee(response.service_fee);
      setTotalCash(response.total_cash);
    } catch (err) {
      // Fallback calculation
      let fee = 0;
      if (numAmount < 1000) fee = 40;
      else if (numAmount < 2000) fee = 50;
      else if (numAmount < 5000) fee = 70;
      else fee = 100;
      setServiceFee(fee);
      setTotalCash(numAmount + fee);
    } finally {
      setIsCalculating(false);
    }
  };

  const handleContinue = () => {
    const numAmount = parseFloat(amount) || 0;

    if (numAmount < 300) {
      setError('Minimum deposit amount is \u20b9300');
      return;
    }

    router.push({
      pathname: '/(user)/deposit/location',
      params: {
        amount: numAmount.toString(),
        serviceFee: serviceFee.toString(),
        totalCash: totalCash.toString(),
      },
    });
  };

  const quickAmounts = [500, 1000, 2000, 5000];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Deposit Amount</Text>
              <Text style={styles.headerSubtitle}>Step 1 of 3</Text>
            </View>
          </View>

          {/* Amount Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Enter deposit amount</Text>
            <View style={styles.amountInputContainer}>
              <Text style={styles.currencySymbol}>\u20b9</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor="#6B7280"
                keyboardType="number-pad"
                value={amount}
                onChangeText={(text) => {
                  setAmount(text.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                maxLength={7}
              />
            </View>
            <Text style={styles.minimumText}>Minimum amount: \u20b9300</Text>
          </View>

          {/* Quick Amount Buttons */}
          <View style={styles.quickAmounts}>
            {quickAmounts.map((quickAmount) => (
              <TouchableOpacity
                key={quickAmount}
                style={[
                  styles.quickAmountButton,
                  amount === quickAmount.toString() && styles.quickAmountActive,
                ]}
                onPress={() => setAmount(quickAmount.toString())}
              >
                <Text
                  style={[
                    styles.quickAmountText,
                    amount === quickAmount.toString() &&
                      styles.quickAmountTextActive,
                  ]}
                >
                  \u20b9{quickAmount.toLocaleString()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Error */}
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Fee Breakdown */}
          {parseFloat(amount) >= 300 && (
            <View style={styles.feeBreakdown}>
              <Text style={styles.feeTitle}>Fee Breakdown</Text>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Deposit Amount</Text>
                <Text style={styles.feeValue}>\u20b9{parseFloat(amount).toLocaleString()}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Service Fee</Text>
                {isCalculating ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <Text style={styles.feeValue}>\u20b9{serviceFee}</Text>
                )}
              </View>
              <View style={styles.feeDivider} />
              <View style={styles.feeRow}>
                <Text style={styles.totalLabel}>Total Cash to Hand Over</Text>
                <Text style={styles.totalValue}>\u20b9{totalCash.toLocaleString()}</Text>
              </View>
            </View>
          )}

          {/* Fee Slabs Info */}
          <View style={styles.feeSlabsCard}>
            <View style={styles.feeSlabsHeader}>
              <Ionicons name="information-circle" size={20} color="#4F46E5" />
              <Text style={styles.feeSlabsTitle}>Service Fee Structure</Text>
            </View>
            <View style={styles.feeSlabsList}>
              {[
                { range: '\u20b9300 - \u20b9999', fee: '\u20b940' },
                { range: '\u20b91000 - \u20b91999', fee: '\u20b950' },
                { range: '\u20b92000 - \u20b94999', fee: '\u20b970' },
                { range: '\u20b95000+', fee: '\u20b9100' },
              ].map((slab, index) => (
                <View key={index} style={styles.feeSlabItem}>
                  <Text style={styles.feeSlabRange}>{slab.range}</Text>
                  <Text style={styles.feeSlabFee}>{slab.fee}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* Continue Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              parseFloat(amount) < 300 && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={parseFloat(amount) < 300}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 2,
  },
  inputSection: {
    marginTop: 24,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#374151',
  },
  currencySymbol: {
    fontSize: 36,
    fontWeight: '700',
    color: '#9CA3AF',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    padding: 0,
  },
  minimumText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  quickAmounts: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  quickAmountButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  quickAmountActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  quickAmountTextActive: {
    color: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
  },
  feeBreakdown: {
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
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  feeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10B981',
  },
  feeSlabsCard: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 16,
    padding: 16,
  },
  feeSlabsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  feeSlabsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
    marginLeft: 8,
  },
  feeSlabsList: {
    gap: 8,
  },
  feeSlabItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeSlabRange: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  feeSlabFee: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0A0F1C',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.7,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

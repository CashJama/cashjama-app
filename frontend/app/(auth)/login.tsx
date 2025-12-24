import React, { useState } from 'react';
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
import { api } from '../../src/services/api';

export default function LoginScreen() {
  const router = useRouter();
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateMobile = (number: string) => {
    return /^[6-9]\d{9}$/.test(number);
  };

  const handleSendOTP = async () => {
    setError('');
    
    if (!mobile) {
      setError('Please enter your mobile number');
      return;
    }

    if (!validateMobile(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setIsLoading(true);

    try {
      await api.sendOTP(mobile);
      router.push({
        pathname: '/(auth)/otp',
        params: { mobile },
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to send OTP. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Title */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="wallet" size={48} color="#4F46E5" />
            </View>
            <Text style={styles.title}>CashJama</Text>
            <Text style={styles.subtitle}>Doorstep Cash Deposit</Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Login / Sign Up</Text>
            <Text style={styles.formDescription}>
              Enter your mobile number to continue
            </Text>

            {/* Mobile Input */}
            <View style={styles.inputContainer}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
                maxLength={10}
                value={mobile}
                onChangeText={(text) => {
                  setMobile(text.replace(/[^0-9]/g, ''));
                  setError('');
                }}
                editable={!isLoading}
              />
            </View>

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (!mobile || isLoading) && styles.submitButtonDisabled,
              ]}
              onPress={handleSendOTP}
              disabled={!mobile || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>Get OTP</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Verification Info */}
          <View style={styles.verificationInfo}>
            <Ionicons name="finger-print" size={20} color="#4F46E5" />
            <Text style={styles.verificationText}>
              Users are verified via OTP. Aadhaar & fingerprint are handled by BC at bank device.
            </Text>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle-outline" size={20} color="#6B7280" />
            <Text style={styles.disclaimerText}>
              CashJama does NOT hold your money. Cash is deposited directly into your bank via authorized BC.
            </Text>
          </View>
        </ScrollView>
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
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  formContainer: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  formDescription: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 16,
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRightWidth: 1,
    borderRightColor: '#374151',
  },
  countryCodeText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    marginLeft: 8,
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  verificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  verificationText: {
    fontSize: 13,
    color: '#A5B4FC',
    marginLeft: 10,
    flex: 1,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  disclaimerText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 10,
    flex: 1,
    lineHeight: 18,
  },
});

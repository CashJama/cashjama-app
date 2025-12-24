import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, ScrollView, KeyboardAvoidingView, Platform, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const RUPEE = '₹';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

type ScreenState = 'permission' | 'loading' | 'success' | 'manual';

export default function LocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount: string; serviceFee: string; totalCash: string }>();
  const [screenState, setScreenState] = useState<ScreenState>('permission');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');

  const requestLocationPermission = async () => {
    setScreenState('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Location is needed to assign a BC agent near you. Please enable location in settings or enter address manually.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Enter Manually', onPress: () => setScreenState('manual') },
          ]
        );
        return;
      }
      await getCurrentLocation();
    } catch (err) {
      Alert.alert('Error', 'Failed to request permission. Please enter address manually.', [
        { text: 'OK', onPress: () => setScreenState('manual') }
      ]);
    }
  };

  const getCurrentLocation = async () => {
    setScreenState('loading');
    try {
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
      };
      setLocation(locationData);

      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
        if (addressResult) {
          const formattedAddress = [addressResult.name, addressResult.street, addressResult.city, addressResult.region, addressResult.postalCode].filter(Boolean).join(', ');
          setAddress(formattedAddress);
          locationData.address = formattedAddress;
          setLocation(locationData);
        }
      } catch (geocodeError) {
        console.log('Geocoding error:', geocodeError);
      }
      setScreenState('success');
    } catch (err: any) {
      Alert.alert('Location Error', 'Could not get your location. Please enter your address manually.', [
        { text: 'OK', onPress: () => setScreenState('manual') }
      ]);
    }
  };

  const handleContinue = () => {
    if (screenState === 'manual') {
      if (!manualAddress.trim()) {
        Alert.alert('Address Required', 'Please enter your complete address for the BC agent to reach you.');
        return;
      }
      router.push({
        pathname: '/(user)/deposit/confirm',
        params: {
          amount: params.amount,
          serviceFee: params.serviceFee,
          totalCash: params.totalCash,
          latitude: '0',
          longitude: '0',
          address: manualAddress.trim(),
          accuracy: '0',
        },
      });
    } else if (location) {
      router.push({
        pathname: '/(user)/deposit/confirm',
        params: {
          amount: params.amount,
          serviceFee: params.serviceFee,
          totalCash: params.totalCash,
          latitude: location.latitude.toString(),
          longitude: location.longitude.toString(),
          address: address || 'Current Location',
          accuracy: (location.accuracy || 0).toString(),
        },
      });
    }
  };

  // Permission Explainer Screen
  if (screenState === 'permission') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Set Location</Text>
              <Text style={styles.headerSubtitle}>Step 2 of 3</Text>
            </View>
          </View>

          <View style={styles.permissionContainer}>
            <View style={styles.permissionIconContainer}>
              <Ionicons name="location" size={56} color="#4F46E5" />
            </View>
            <Text style={styles.permissionTitle}>Location Permission Required</Text>
            <Text style={styles.permissionDescription}>
              We need your location to assign a nearby BC agent who can come to your doorstep.
            </Text>

            <View style={styles.permissionInfoCard}>
              <View style={styles.permissionInfoItem}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.permissionInfoText}>Used only for BC agent assignment</Text>
              </View>
              <View style={styles.permissionInfoItem}>
                <Ionicons name="person" size={20} color="#10B981" />
                <Text style={styles.permissionInfoText}>Helps agent navigate to you</Text>
              </View>
            </View>

            <View style={styles.requiredNote}>
              <Ionicons name="information-circle" size={18} color="#F59E0B" />
              <Text style={styles.requiredNoteText}>Location permission is required to assign a BC agent to your request.</Text>
            </View>
          </View>

          <View style={styles.permissionActions}>
            <TouchableOpacity style={styles.allowButton} onPress={requestLocationPermission}>
              <Ionicons name="location" size={20} color="#FFFFFF" />
              <Text style={styles.allowButtonText}>Allow Location Access</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manualButton} onPress={() => setScreenState('manual')}>
              <Ionicons name="create" size={20} color="#4F46E5" />
              <Text style={styles.manualButtonText}>Enter Address Manually</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Loading Screen
  if (screenState === 'loading') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Set Location</Text>
              <Text style={styles.headerSubtitle}>Step 2 of 3</Text>
            </View>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Getting your location...</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Manual Address Entry Screen
  if (screenState === 'manual') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => setScreenState('permission')}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerContent}>
                <Text style={styles.headerTitle}>Enter Address</Text>
                <Text style={styles.headerSubtitle}>Step 2 of 3</Text>
              </View>
            </View>

            <View style={styles.manualInputSection}>
              <Text style={styles.manualInputLabel}>Complete Address</Text>
              <Text style={styles.manualInputHint}>Enter the full address where the BC agent should come</Text>
              <TextInput
                style={styles.addressInput}
                placeholder="e.g., 123 Main Street, Sector 5, Near Park, New Delhi 110001"
                placeholderTextColor="#6B7280"
                value={manualAddress}
                onChangeText={setManualAddress}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.manualNote}>
              <Ionicons name="alert-circle" size={20} color="#F59E0B" />
              <Text style={styles.manualNoteText}>
                Please ensure the address is accurate. The BC agent will use this to reach you.
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Deposit Amount</Text>
                <Text style={styles.summaryValue}>{RUPEE}{parseFloat(params.amount || '0').toLocaleString()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Service Fee</Text>
                <Text style={styles.summaryValue}>{RUPEE}{params.serviceFee}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.continueButton, !manualAddress.trim() && styles.continueButtonDisabled]}
              onPress={handleContinue}
              disabled={!manualAddress.trim()}
            >
              <Text style={styles.continueButtonText}>Confirm Address</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Success - Location Found
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Set Location</Text>
            <Text style={styles.headerSubtitle}>Step 2 of 3</Text>
          </View>
        </View>

        <View style={styles.mapContainer}>
          <View style={styles.mapPlaceholder}>
            <View style={styles.centerPin}>
              <Ionicons name="location" size={48} color="#EF4444" />
            </View>
            <Text style={styles.mapNote}>Google Maps integration pending</Text>
          </View>
        </View>

        {location && (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={24} color="#4F46E5" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Pickup Location</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>{address || 'Current Location'}</Text>
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={getCurrentLocation}>
                <Ionicons name="refresh" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <TouchableOpacity style={styles.changeToManual} onPress={() => setScreenState('manual')}>
          <Ionicons name="create-outline" size={18} color="#4F46E5" />
          <Text style={styles.changeToManualText}>Enter a different address</Text>
        </TouchableOpacity>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deposit Amount</Text>
            <Text style={styles.summaryValue}>{RUPEE}{parseFloat(params.amount || '0').toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>{RUPEE}{params.serviceFee}</Text>
          </View>
        </View>

        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={20} color="#4F46E5" />
          <Text style={styles.infoText}>The BC agent will come to this location.</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Confirm Location</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1C' },
  content: { flex: 1, paddingHorizontal: 20 },
  scrollContent: { paddingBottom: 100 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 2 },
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  permissionIconContainer: { width: 100, height: 100, borderRadius: 25, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  permissionTitle: { fontSize: 22, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
  permissionDescription: { fontSize: 15, color: '#9CA3AF', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  permissionInfoCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, width: '100%', marginBottom: 16 },
  permissionInfoItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  permissionInfoText: { fontSize: 14, color: '#E5E7EB', marginLeft: 12, flex: 1 },
  requiredNote: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 14, width: '100%' },
  requiredNoteText: { fontSize: 13, color: '#F59E0B', marginLeft: 10, flex: 1 },
  permissionActions: { paddingBottom: 24, width: '100%' },
  allowButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, gap: 8, marginBottom: 12 },
  allowButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
  manualButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, gap: 8, borderWidth: 1, borderColor: '#374151' },
  manualButtonText: { fontSize: 15, fontWeight: '500', color: '#4F46E5' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#FFFFFF', marginTop: 16 },
  manualInputSection: { marginTop: 16, marginBottom: 16 },
  manualInputLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  manualInputHint: { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },
  addressInput: { backgroundColor: '#111827', borderRadius: 12, padding: 16, fontSize: 15, color: '#FFFFFF', minHeight: 120, borderWidth: 1, borderColor: '#374151' },
  manualNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 14, marginBottom: 16 },
  manualNoteText: { fontSize: 13, color: '#F59E0B', marginLeft: 10, flex: 1, lineHeight: 18 },
  mapContainer: { height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 16, backgroundColor: '#1F2937' },
  mapPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerPin: { marginBottom: 8 },
  mapNote: { fontSize: 12, color: '#6B7280' },
  locationCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12 },
  locationHeader: { flexDirection: 'row', alignItems: 'center' },
  locationIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locationInfo: { flex: 1 },
  locationTitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 2 },
  locationAddress: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 },
  refreshButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center' },
  changeToManual: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 12 },
  changeToManualText: { fontSize: 14, color: '#4F46E5', marginLeft: 6 },
  summaryCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#9CA3AF' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 13, color: '#9CA3AF', marginLeft: 10, lineHeight: 18 },
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1F2937' },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, gap: 8 },
  continueButtonDisabled: { backgroundColor: '#374151', opacity: 0.7 },
  continueButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

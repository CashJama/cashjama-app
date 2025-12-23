import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, TextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
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

type ScreenState = 'permission' | 'loading' | 'success' | 'error' | 'manual';

export default function LocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ amount: string; serviceFee: string; totalCash: string }>();
  const [screenState, setScreenState] = useState<ScreenState>('permission');
  const [location, setLocation] = useState<LocationData | null>(null);
  const [address, setAddress] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const requestLocationPermission = async () => {
    setScreenState('loading');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMessage('Location permission was denied. You can enter your address manually.');
        setScreenState('error');
        return;
      }
      await getCurrentLocation();
    } catch (err) {
      setErrorMessage('Failed to request permission. Please try again or enter address manually.');
      setScreenState('error');
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
      setErrorMessage('Could not get your location. Please enter your address manually.');
      setScreenState('error');
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
          isManualAddress: 'true',
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
          isManualAddress: 'false',
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
            <Text style={styles.permissionTitle}>Location Access Required</Text>
            <Text style={styles.permissionDescription}>
              We need your location to assign a nearby BC agent who can come to your doorstep for cash collection.
            </Text>

            <View style={styles.permissionInfoCard}>
              <View style={styles.permissionInfoItem}>
                <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                <Text style={styles.permissionInfoText}>Your location is used only for agent assignment</Text>
              </View>
              <View style={styles.permissionInfoItem}>
                <Ionicons name="eye-off" size={20} color="#10B981" />
                <Text style={styles.permissionInfoText}>Location data is not stored or shared</Text>
              </View>
              <View style={styles.permissionInfoItem}>
                <Ionicons name="person" size={20} color="#10B981" />
                <Text style={styles.permissionInfoText}>Helps BC agent navigate to you accurately</Text>
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
            <Text style={styles.loadingSubtext}>This may take a moment</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Error Screen with Manual Fallback
  if (screenState === 'error') {
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
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="location-outline" size={48} color="#EF4444" />
            </View>
            <Text style={styles.errorTitle}>Location Unavailable</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
            <View style={styles.errorActions}>
              <TouchableOpacity style={styles.retryButton} onPress={requestLocationPermission}>
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.manualFallbackButton} onPress={() => setScreenState('manual')}>
                <Ionicons name="create" size={18} color="#4F46E5" />
                <Text style={styles.manualFallbackText}>Enter Address Manually</Text>
              </TouchableOpacity>
            </View>
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
                Please ensure the address is accurate and includes landmarks. The BC agent will use this to reach you.
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
            <View style={styles.mapBackground}>
              <View style={styles.mapGrid}>
                {[...Array(16)].map((_, i) => (<View key={i} style={styles.gridCell} />))}
              </View>
              <View style={styles.centerPin}>
                <Ionicons name="location" size={40} color="#EF4444" />
                <View style={styles.pinShadow} />
              </View>
            </View>
            <Text style={styles.mapNote}>Google Maps will be displayed here</Text>
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
            {location.accuracy && (
              <View style={styles.accuracyBadge}>
                <Ionicons name="navigate" size={14} color="#10B981" />
                <Text style={styles.accuracyText}>Accuracy: {Math.round(location.accuracy)}m</Text>
              </View>
            )}
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
          <Text style={styles.infoText}>The BC agent will come to this location. Make sure you can receive the agent at this address.</Text>
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
  
  // Permission Screen
  permissionContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  permissionIconContainer: { width: 100, height: 100, borderRadius: 25, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  permissionTitle: { fontSize: 24, fontWeight: '700', color: '#FFFFFF', textAlign: 'center', marginBottom: 12 },
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
  
  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: 16, color: '#FFFFFF', marginTop: 16 },
  loadingSubtext: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  
  // Error
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  errorIconContainer: { width: 80, height: 80, borderRadius: 20, backgroundColor: 'rgba(239, 68, 68, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  errorTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  errorText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  errorActions: { width: '100%', gap: 12 },
  retryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 14, gap: 8 },
  retryButtonText: { fontSize: 15, fontWeight: '600', color: '#FFFFFF' },
  manualFallbackButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderRadius: 12, paddingVertical: 14, gap: 8, borderWidth: 1, borderColor: '#374151' },
  manualFallbackText: { fontSize: 15, fontWeight: '500', color: '#4F46E5' },
  
  // Manual Input
  manualInputSection: { marginTop: 16, marginBottom: 16 },
  manualInputLabel: { fontSize: 16, fontWeight: '600', color: '#FFFFFF', marginBottom: 8 },
  manualInputHint: { fontSize: 13, color: '#9CA3AF', marginBottom: 12 },
  addressInput: { backgroundColor: '#111827', borderRadius: 12, padding: 16, fontSize: 15, color: '#FFFFFF', minHeight: 120, borderWidth: 1, borderColor: '#374151' },
  manualNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(245, 158, 11, 0.1)', borderRadius: 12, padding: 14, marginBottom: 16 },
  manualNoteText: { fontSize: 13, color: '#F59E0B', marginLeft: 10, flex: 1, lineHeight: 18 },
  
  // Map
  mapContainer: { height: 180, borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  mapPlaceholder: { flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
  mapBackground: { flex: 1, width: '100%', backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  mapGrid: { position: 'absolute', flexDirection: 'row', flexWrap: 'wrap', width: '100%', height: '100%', opacity: 0.3 },
  gridCell: { width: '25%', height: '25%', borderWidth: 0.5, borderColor: '#374151' },
  centerPin: { alignItems: 'center' },
  pinShadow: { width: 10, height: 5, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 5, marginTop: -5 },
  mapNote: { position: 'absolute', bottom: 8, fontSize: 11, color: '#6B7280', backgroundColor: 'rgba(17, 24, 39, 0.9)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  
  // Location Card
  locationCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12 },
  locationHeader: { flexDirection: 'row', alignItems: 'center' },
  locationIconContainer: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  locationInfo: { flex: 1 },
  locationTitle: { fontSize: 13, color: '#9CA3AF', marginBottom: 2 },
  locationAddress: { fontSize: 15, fontWeight: '500', color: '#FFFFFF', lineHeight: 20 },
  refreshButton: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(79, 70, 229, 0.1)', alignItems: 'center', justifyContent: 'center' },
  accuracyBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginTop: 12, alignSelf: 'flex-start' },
  accuracyText: { fontSize: 12, color: '#10B981', marginLeft: 6 },
  
  changeToManual: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginBottom: 12 },
  changeToManualText: { fontSize: 14, color: '#4F46E5', marginLeft: 6 },
  
  // Summary
  summaryCard: { backgroundColor: '#111827', borderRadius: 12, padding: 14, marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: '#9CA3AF' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },
  
  // Info
  infoNote: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(79, 70, 229, 0.1)', borderRadius: 12, padding: 14 },
  infoText: { flex: 1, fontSize: 13, color: '#9CA3AF', marginLeft: 10, lineHeight: 18 },
  
  // Footer
  footer: { paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#1F2937' },
  continueButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 16, gap: 8 },
  continueButtonDisabled: { backgroundColor: '#374151', opacity: 0.7 },
  continueButtonText: { fontSize: 16, fontWeight: '600', color: '#FFFFFF' },
});

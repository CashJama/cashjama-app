import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  accuracy?: number;
}

export default function LocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    amount: string;
    serviceFee: string;
    totalCash: string;
  }>();

  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Please enable location access.');
        setIsLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const locationData: LocationData = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy || undefined,
      };

      setLocation(locationData);

      // Get address from coordinates
      try {
        const [addressResult] = await Location.reverseGeocodeAsync({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });

        if (addressResult) {
          const formattedAddress = [
            addressResult.name,
            addressResult.street,
            addressResult.city,
            addressResult.region,
            addressResult.postalCode,
          ]
            .filter(Boolean)
            .join(', ');
          setAddress(formattedAddress);
          locationData.address = formattedAddress;
          setLocation(locationData);
        }
      } catch (geocodeError) {
        console.log('Geocoding error:', geocodeError);
      }
    } catch (err: any) {
      setError('Failed to get location. Please try again.');
      console.error('Location error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    if (!location) {
      Alert.alert('Error', 'Please allow location access to continue');
      return;
    }

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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Set Location</Text>
            <Text style={styles.headerSubtitle}>Step 2 of 3</Text>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapContainer}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Getting your location...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="location-outline" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Location Error</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={getCurrentLocation}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              {/* Map placeholder - Google Maps will be integrated here */}
              <View style={styles.mapBackground}>
                <View style={styles.mapGrid}>
                  {[...Array(16)].map((_, i) => (
                    <View key={i} style={styles.gridCell} />
                  ))}
                </View>
                {/* Center Pin */}
                <View style={styles.centerPin}>
                  <Ionicons name="location" size={40} color="#EF4444" />
                  <View style={styles.pinShadow} />
                </View>
              </View>
              <Text style={styles.mapNote}>
                Google Maps will be displayed here
              </Text>
            </View>
          )}
        </View>

        {/* Location Details */}
        {location && !error && (
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <View style={styles.locationIconContainer}>
                <Ionicons name="location" size={24} color="#4F46E5" />
              </View>
              <View style={styles.locationInfo}>
                <Text style={styles.locationTitle}>Pickup Location</Text>
                <Text style={styles.locationAddress} numberOfLines={2}>
                  {address || 'Current Location'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.refreshButton}
                onPress={getCurrentLocation}
              >
                <Ionicons name="refresh" size={20} color="#4F46E5" />
              </TouchableOpacity>
            </View>

            {location.accuracy && (
              <View style={styles.accuracyBadge}>
                <Ionicons name="navigate" size={14} color="#10B981" />
                <Text style={styles.accuracyText}>
                  Accuracy: {Math.round(location.accuracy)}m
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Amount Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Deposit Amount</Text>
            <Text style={styles.summaryValue}>
              \u20b9{parseFloat(params.amount || '0').toLocaleString()}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Service Fee</Text>
            <Text style={styles.summaryValue}>\u20b9{params.serviceFee}</Text>
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle" size={20} color="#4F46E5" />
          <Text style={styles.infoText}>
            The BC agent will come to this location. Make sure you can receive
            the agent at this address.
          </Text>
        </View>
      </View>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            (!location || isLoading) && styles.continueButtonDisabled,
          ]}
          onPress={handleContinue}
          disabled={!location || isLoading}
        >
          <Text style={styles.continueButtonText}>Confirm Location</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F1C',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
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
  mapContainer: {
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 12,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 8,
  },
  retryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 16,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBackground: {
    flex: 1,
    width: '100%',
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGrid: {
    position: 'absolute',
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    height: '100%',
    opacity: 0.3,
  },
  gridCell: {
    width: '25%',
    height: '25%',
    borderWidth: 0.5,
    borderColor: '#374151',
  },
  centerPin: {
    alignItems: 'center',
  },
  pinShadow: {
    width: 10,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 5,
    marginTop: -5,
  },
  mapNote: {
    position: 'absolute',
    bottom: 8,
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: 'rgba(17, 24, 39, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  locationCard: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  locationAddress: {
    fontSize: 15,
    fontWeight: '500',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  accuracyText: {
    fontSize: 12,
    color: '#10B981',
    marginLeft: 6,
  },
  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#9CA3AF',
    marginLeft: 10,
    lineHeight: 18,
  },
  footer: {
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

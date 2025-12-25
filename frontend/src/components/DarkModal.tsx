import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DarkModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  icon?: string;
  iconColor?: string;
  primaryButton?: {
    text: string;
    onPress: () => void;
    loading?: boolean;
    color?: string;
  };
  secondaryButton?: {
    text: string;
    onPress: () => void;
  };
  type?: 'info' | 'success' | 'warning' | 'error';
}

export default function DarkModal({
  visible,
  onClose,
  title,
  message,
  icon,
  iconColor,
  primaryButton,
  secondaryButton,
  type = 'info',
}: DarkModalProps) {
  const getTypeConfig = () => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle', color: '#10B981' };
      case 'warning':
        return { icon: 'alert-circle', color: '#F59E0B' };
      case 'error':
        return { icon: 'close-circle', color: '#EF4444' };
      default:
        return { icon: 'information-circle', color: '#4F46E5' };
    }
  };

  const config = getTypeConfig();
  const displayIcon = icon || config.icon;
  const displayColor = iconColor || config.color;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={[styles.iconContainer, { backgroundColor: `${displayColor}15` }]}>
            <Ionicons name={displayIcon as any} size={48} color={displayColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            {secondaryButton && (
              <TouchableOpacity style={styles.secondaryButton} onPress={secondaryButton.onPress}>
                <Text style={styles.secondaryButtonText}>{secondaryButton.text}</Text>
              </TouchableOpacity>
            )}
            {primaryButton && (
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: primaryButton.color || '#4F46E5' }, secondaryButton ? {} : { flex: 1 }]}
                onPress={primaryButton.onPress}
                disabled={primaryButton.loading}
              >
                {primaryButton.loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.primaryButtonText}>{primaryButton.text}</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

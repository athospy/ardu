import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import * as Notifications from 'expo-notifications';
import { scheduleNotifications } from '../screens/notificationUtils';

export default function NotificationOnboarding({ visible, onClose, quotes }) {
  const handleEnableNotifications = async () => {
    // Request permission
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
      },
    });

    if (status === 'granted') {
      // Schedule notifications after permission is granted
      await scheduleNotifications(quotes);
      onClose();
    } else {
      alert('Please enable notifications in your device settings to receive daily wisdom.');
      onClose();
    }
  };

  const handleMaybeLater = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.emoji}>✨</Text>
          <Text style={styles.title}>Daily Wisdom Awaits</Text>
          <Text style={styles.description}>
            We'll send you gentle reminders throughout your day with inspiring quotes.
          </Text>
          <Text style={styles.features}>
            • Up to 15 daily messages{'\n'}
            • Between 8 AM - 10 PM{'\n'}
            • Never spam, always uplifting{'\n'}
            • You can disable anytime
          </Text>

          <TouchableOpacity
            style={styles.enableButton}
            onPress={handleEnableNotifications}
          >
            <Text style={styles.enableButtonText}>Enable Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.laterButton}
            onPress={handleMaybeLater}
          >
            <Text style={styles.laterButtonText}>Maybe Later</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#221F20',
    marginBottom: 15,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  features: {
    fontSize: 14,
    color: '#666',
    textAlign: 'left',
    marginBottom: 25,
    lineHeight: 24,
    alignSelf: 'stretch',
    paddingLeft: 20,
  },
  enableButton: {
    backgroundColor: '#F3BB3E',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 25,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  enableButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  laterButton: {
    paddingVertical: 10,
  },
  laterButtonText: {
    color: '#999',
    fontSize: 16,
  },
});

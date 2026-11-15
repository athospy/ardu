import React, { useState, useEffect } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, ActivityIndicator, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Selector from '../components/LanguageSelector';
import { scheduleTestNotification } from './notificationUtils';
import { useTranslation } from 'react-i18next';
import { getData } from '../data/storage';
import { useAuthStore } from '../src/store/authStore';
import { userService } from '../src/api/services/userService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { quoteService } from '../src/api/services/quoteService';
import { 
  registerForPushNotifications, 
  arePushNotificationsEnabled,
  requestPushPermissions,
  getStoredPushToken 
} from '../utils/pushNotifications';

export default function SettingsScreen() {
  const { t } = useTranslation('common');
  const { user, isAuthenticated, logout, updateUser } = useAuthStore();
  const [isEditingMotivation, setIsEditingMotivation] = useState(false);
  const [motivation, setMotivation] = useState(user?.motivation || '');
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [pushToken, setPushToken] = useState(null);
  const [checkingNotifications, setCheckingNotifications] = useState(true);

  // Check notification status on mount
  useEffect(() => {
    const checkNotificationStatus = async () => {
      if (isAuthenticated) {
        const enabled = await arePushNotificationsEnabled();
        setNotificationsEnabled(enabled);
        
        const token = await getStoredPushToken();
        setPushToken(token);
      }
      setCheckingNotifications(false);
    };
    
    checkNotificationStatus();
  }, [isAuthenticated]);

  const handleTestNotification = async () => {
    const quotes = await getData();
    await scheduleTestNotification(quotes);
  };

  const handleUpdateMotivation = async () => {
    if (!motivation.trim()) {
      Alert.alert(t('updateFailed'), t('motivationPlaceholder'));
      return;
    }

    setIsSaving(true);
    try {
      // Update motivation on backend
      await userService.updateMotivation({ motivation: motivation.trim() });
      
      // Re-initialize quotes with new motivation
      const response = await quoteService.initializeQuotes();
      
      // Update local storage
      await AsyncStorage.setItem(
        '@personalized_quotes',
        JSON.stringify(response.data.quotes)
      );
      await AsyncStorage.setItem(
        '@quotes_last_sync',
        new Date().toISOString()
      );
      
      // Update user state
      updateUser({ ...user, motivation: motivation.trim() });
      
      // Close editing mode
      setIsEditingMotivation(false);
      
      Alert.alert(
        t('motivationUpdated'),
        t('motivationUpdateSuccess')
      );
    } catch (error) {
      console.error('Failed to update motivation:', error);
      Alert.alert(
        t('updateFailed'),
        t('motivationUpdateError')
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setMotivation(user?.motivation || '');
    setIsEditingMotivation(false);
  };

  const handleToggleNotifications = async (value) => {
    try {
      if (value) {
        // Request permissions and register
        const granted = await requestPushPermissions();
        if (granted) {
          const token = await registerForPushNotifications();
          if (token) {
            setPushToken(token);
            setNotificationsEnabled(true);
            
            // Update backend
            await userService.updateProfile({ notificationEnabled: true });
            updateUser({ ...user, notification_enabled: true });
            
            Alert.alert(
              '✅ Notifications Enabled',
              'You will now receive daily motivational quotes!'
            );
          } else {
            setNotificationsEnabled(false);
            Alert.alert(
              'Setup Failed',
              'Failed to setup push notifications. Please try again.'
            );
          }
        } else {
          setNotificationsEnabled(false);
          Alert.alert(
            'Permission Denied',
            'Please enable notifications in your device settings to receive quotes.'
          );
        }
      } else {
        // Disable notifications
        setNotificationsEnabled(false);
        await userService.updateProfile({ notificationEnabled: false });
        updateUser({ ...user, notification_enabled: false });
        
        Alert.alert(
          'Notifications Disabled',
          'You will no longer receive push notifications.'
        );
      }
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
      Alert.alert('Error', 'Failed to update notification settings');
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8F9FA' }} edges={['top', 'left', 'right']}>
      <ScrollView style={{ flex: 1 }}>
        {isAuthenticated && (
          <View style={styles.accountSection}>
          <Text style={styles.sectionTitle}>👤 {t('profile')}</Text>
          
          {/* User Info Card */}
          <View style={styles.userInfo}>
            <View style={styles.userInfoRow}>
              <Text style={styles.label}>Name</Text>
              <Text style={styles.userName}>{user?.name || 'User'}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.userInfoRow}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          
          {/* Motivation Section - Highlighted */}
          <View style={styles.motivationSection}>
            <View style={styles.motivationHeader}>
              <View style={styles.motivationTitleContainer}>
                <Text style={styles.motivationTitle}>💪 {t('myMotivation')}</Text>
                <Text style={styles.motivationSubtitle}>Personalizes your quote experience</Text>
              </View>
              {!isEditingMotivation && (
                <TouchableOpacity
                  onPress={() => setIsEditingMotivation(true)}
                  style={styles.editButton}
                >
                  <Text style={styles.editButtonText}>✏️ {t('editMotivation')}</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {isEditingMotivation ? (
              <View style={styles.motivationEditContainer}>
                <TextInput
                  style={styles.motivationInput}
                  value={motivation}
                  onChangeText={setMotivation}
                  placeholder={t('motivationPlaceholder')}
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <Text style={styles.motivationHint}>{t('motivationHint')}</Text>
                <Text style={styles.characterCount}>
                  {motivation.length}/500 characters
                </Text>
                
                <View style={styles.motivationActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancelEdit}
                    disabled={isSaving}
                  >
                    <Text style={styles.cancelButtonText}>{t('cancelButtonText')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleUpdateMotivation}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.motivationDisplay}>
                {user?.motivation ? (
                  <Text style={styles.motivationText}>{user.motivation}</Text>
                ) : (
                  <View style={styles.noMotivation}>
                    <Text style={styles.noMotivationText}>{t('noMotivationSet')}</Text>
                    <Text style={styles.noMotivationHint}>{t('tapToAddMotivation')}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Push Notifications Section */}
          <View style={styles.notificationCard}>
            <View style={styles.notificationHeader}>
              <View style={styles.notificationTitleContainer}>
                <Text style={styles.notificationTitle}>🔔 Push Notifications</Text>
                <Text style={styles.notificationSubtitle}>
                  {notificationsEnabled 
                    ? 'Receive daily motivational quotes' 
                    : 'Enable to get inspired daily'}
                </Text>
              </View>
              {checkingNotifications ? (
                <ActivityIndicator size="small" color="#F3BB3E" />
              ) : (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={handleToggleNotifications}
                  trackColor={{ false: '#DDD', true: '#F3BB3E' }}
                  thumbColor={notificationsEnabled ? '#221F20' : '#f4f3f4'}
                />
              )}
            </View>
            
            {pushToken && notificationsEnabled && (
              <View style={styles.tokenInfo}>
                <Text style={styles.tokenLabel}>📱 Device registered</Text>
                <Text style={styles.tokenText} numberOfLines={1}>
                  {pushToken.substring(0, 30)}...
                </Text>
              </View>
            )}
          </View>
          
          {/* Logout Button */}
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>🚪 Logout</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Language Selector - Simplified */}
      <View style={styles.languageSection}>
        <Selector />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  accountSection: {
    padding: 20,
    backgroundColor: '#FFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#221F20',
  },
  userInfo: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  userInfoRow: {
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#221F20',
  },
  userEmail: {
    fontSize: 15,
    color: '#444',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 8,
  },
  motivationSection: {
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#F3BB3E',
  },
  motivationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  motivationTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  motivationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#221F20',
    marginBottom: 4,
  },
  motivationSubtitle: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3BB3E',
  },
  editButtonText: {
    color: '#221F20',
    fontSize: 14,
    fontWeight: '600',
  },
  motivationDisplay: {
    minHeight: 60,
  },
  motivationText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
  },
  noMotivation: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  noMotivationText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 5,
  },
  noMotivationHint: {
    fontSize: 12,
    color: '#BBB',
    fontStyle: 'italic',
  },
  motivationEditContainer: {
    marginTop: 5,
  },
  motivationInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    color: '#221F20',
    backgroundColor: '#FFF',
  },
  motivationHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  characterCount: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'right',
  },
  motivationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 15,
    gap: 10,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#221F20',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3BB3E',
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#221F20',
    fontSize: 15,
    fontWeight: '600',
  },
  notificationCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTitleContainer: {
    flex: 1,
    marginRight: 10,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#221F20',
    marginBottom: 4,
  },
  notificationSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  tokenInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  tokenLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tokenText: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  logoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  languageSection: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    marginTop: 10,
  },
});
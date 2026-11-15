import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { reflectionService } from '../services/reflectionService';
import { useAuthStore } from '../src/store/authStore';

const JournalScreen = ({ onShowAuth }) => {
  const { t } = useTranslation();
  const [reflections, setReflections] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isFocused) {
      loadReflections();
    }
  }, [isFocused]);

  const loadReflections = async () => {
    try {
      const data = await reflectionService.getReflections();
      setReflections(data);
    } catch (error) {
      console.error('Failed to load reflections:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReflections();
    setRefreshing(false);
  };

  const handleDeleteReflection = (reflectionId) => {
    Alert.alert(
      'Delete Reflection',
      'Are you sure you want to delete this reflection?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await reflectionService.deleteReflection(reflectionId);
              await loadReflections();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete reflection');
            }
          },
        },
      ]
    );
  };

  const formatDate = (reflection) => {
    // Backend returns created_at, old local data used timestamp
    const dateString = reflection.created_at || reflection.timestamp;
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Check if today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    // Check if yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    // Format as Month Day, Year
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Show login prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📔 {t('common:reflectionJournal')}</Text>
        </View>

        <View style={styles.loginPrompt}>
          <Text style={styles.loginEmoji}>🔒</Text>
          <Text style={styles.loginTitle}>Sign In to Access Journal</Text>
          <Text style={styles.loginMessage}>
            Your reflections are private and synced across devices.
            Sign in to start building your journal.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onShowAuth}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Sign In / Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Show empty state if no reflections
  if (reflections.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>📔 {t('common:reflectionJournal')}</Text>
          <Text style={styles.headerCount}>0 reflections</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <Text style={styles.emptyEmoji}>✍️</Text>
          <Text style={styles.emptyTitle}>{t('common:noReflections')}</Text>
          <Text style={styles.emptyMessage}>
            After viewing a quote, take a moment to reflect on how you'll apply it.
            Your reflections will appear here.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Show reflections list
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📔 {t('common:reflectionJournal')}</Text>
        <Text style={styles.headerCount}>{reflections.length} reflections</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {reflections.map((reflection) => (
          <View key={reflection.id} style={styles.reflectionCard}>
            {/* Date Header */}
            <View style={styles.dateHeader}>
              <Text style={styles.dateText}>{formatDate(reflection)}</Text>
              <TouchableOpacity
                onPress={() => handleDeleteReflection(reflection.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={styles.deleteIcon}>🗑️</Text>
              </TouchableOpacity>
            </View>

            {/* Quote Section */}
            <LinearGradient
              colors={['#F3BB3E', '#FF9A56']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.quoteGradient}
            >
              <Text style={styles.quoteText}>"{reflection.quote_text || reflection.quoteText}"</Text>
              {reflection.author && (
                <Text style={styles.quoteAuthor}>— {reflection.author}</Text>
              )}
            </LinearGradient>

            {/* Reflection Section */}
            <View style={styles.reflectionSection}>
              <Text style={styles.reflectionLabel}>💭 Your Reflection:</Text>
              <Text style={styles.reflectionText}>{reflection.reflection}</Text>
            </View>
          </View>
        ))}

        {/* Bottom Padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontFamily: 'poppins-bold',
    fontSize: 24,
    color: '#211F1F',
    marginBottom: 4,
  },
  headerCount: {
    fontFamily: 'poppins-regular',
    fontSize: 14,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
  },
  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: 'poppins-bold',
    fontSize: 20,
    color: '#211F1F',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyMessage: {
    fontFamily: 'poppins-regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  // Login Prompt
  loginPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loginEmoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  loginTitle: {
    fontFamily: 'poppins-bold',
    fontSize: 22,
    color: '#211F1F',
    marginBottom: 12,
    textAlign: 'center',
  },
  loginMessage: {
    fontFamily: 'poppins-regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  loginButton: {
    backgroundColor: '#F3BB3E',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: '#F3BB3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonText: {
    fontFamily: 'poppins-bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  // Reflection Card
  reflectionCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontFamily: 'poppins-semibold',
    fontSize: 12,
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  deleteIcon: {
    fontSize: 18,
  },
  quoteGradient: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  quoteText: {
    fontFamily: 'poppins-regular',
    fontSize: 16,
    color: '#FFFFFF',
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontFamily: 'poppins-semibold',
    fontSize: 14,
    color: '#FFFFFF',
    textAlign: 'right',
  },
  reflectionSection: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F3BB3E',
  },
  reflectionLabel: {
    fontFamily: 'poppins-semibold',
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  reflectionText: {
    fontFamily: 'poppins-regular',
    fontSize: 15,
    color: '#211F1F',
    lineHeight: 22,
  },
});

export default JournalScreen;

import { Text, View, ScrollView, StatusBar, Platform, Image, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import React, { useState, useEffect, useContext } from 'react';
import StatusImageItemButton from '../components/StatusImageItemButton';
import EditButton from '../components/EditButton';
import DeleteButton from '../components/DeleteButton';
import defaultQuotes from '../data/defaultQuotes';
import { getData, storeData } from '../data/storage';
import { quoteStyles } from './quoteStyles';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { scheduleNotifications, cancelAllLocalNotifications } from './notificationUtils';
import { useIsFocused } from '@react-navigation/native';
import { BannerAd, TestIds, BannerAdSize } from 'react-native-google-mobile-ads';
import AddQuoteModal from '../components/AddQuoteModal';
import DeleteModal from '../components/DeleteModal';
import QuoteModal from '../components/QuoteModal';
import ReflectionModal from '../components/ReflectionModal';
import NotificationOnboarding from '../components/NotificationOnboarding';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Notification from '../classes/Notification';
import SplashScreen from './SplashScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../src/store/authStore';
import { useQuoteStore } from '../src/store/quoteStore';
import { quoteService } from '../src/api/services/quoteService';
// New dashboard components
import StreakCounter from '../components/StreakCounter';
import FeaturedQuoteCard from '../components/FeaturedQuoteCard';
import WeeklyBoostsSection from '../components/WeeklyBoostsSection';
import JournalPreview from '../components/JournalPreview';
import { streakService } from '../services/streakService';
import { reflectionService } from '../services/reflectionService';
import { ADMOB_BANNER_ID_IOS, ADMOB_BANNER_ID_ANDROID } from '@env';


// Real banner unit IDs come from .env (see .env.example). Without them, and in
// every dev build, Google's test banner is used so local builds never serve
// real ads on someone's AdMob account.
const releaseUnitId = Platform.select({
  ios: ADMOB_BANNER_ID_IOS,
  android: ADMOB_BANNER_ID_ANDROID,
});
const adUnitId = __DEV__ || !releaseUnitId ? TestIds.BANNER : releaseUnitId;

// Handle notifications when app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

export default function QuotesScreen({ onShowAuth, navigation }) {
  const [quotes, setQuotes] = useState([])
  const [inputText, setInputText] = useState('');
  const [inputAuthor, setInputAuthor] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const { t, i18n } = useTranslation();
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [isQuoteDialogVisible, setIsQuoteDialogVisible] = useState(false);
  const styles = quoteStyles();
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deleteModalIndex, setDeleteModalIndex] = useState(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showNotificationOnboarding, setShowNotificationOnboarding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isFocused = useIsFocused();
  
  // New dashboard state
  const [streakData, setStreakData] = useState({ currentStreak: 0, longestStreak: 0 });
  const [reflectionCount, setReflectionCount] = useState(0);
  const [featuredQuote, setFeaturedQuote] = useState(null);
  
  // Reflection modal state
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [reflectionQuote, setReflectionQuote] = useState(null);

  // Backend integration stores
  const { user, isAuthenticated } = useAuthStore();
  const { 
    createQuote, 
    updateQuote, 
    deleteQuote: deleteBackendQuote,
    loading: backendLoading 
  } = useQuoteStore();

  // Storage keys for personalized quotes
  const PERSONALIZED_QUOTES_KEY = '@personalized_quotes';
  const QUOTES_LAST_SYNC_KEY = '@quotes_last_sync';


  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { notification } = response;
      const notificationData = notification.request.content.data || {};
      const quoteId = notificationData.id;
      const quoteText = notification.request.content.body || '';
      
      console.log('📬 Notification Opened - Full Payload:', JSON.stringify({
        data: notificationData,
        quoteId: quoteId,
        body: quoteText,
        title: notification.request.content.title
      }, null, 2));
      
      // For push notifications (AI quotes, daily quotes), refresh quotes first if authenticated
      if (isAuthenticated && notificationData.type && notificationData.type !== 'local') {
        console.log(`${notificationData.type} notification - refreshing quotes...`);
        const freshQuotes = await handleRefresh();
        
        if (freshQuotes) {
          // Try to find by ID first (if provided in notification)
          if (quoteId) {
            const fullQuote = freshQuotes.find(q => q.id === quoteId);
            if (fullQuote) {
              console.log('Found quote by ID after refresh:', fullQuote.id);
              toggleQuoteDialog(fullQuote);
              return;
            }
          }
          
          // Fallback: find by text content
          const quoteByText = freshQuotes.find(q => q.text === quoteText);
          if (quoteByText) {
            console.log('Found quote by text after refresh:', quoteByText.id);
            toggleQuoteDialog(quoteByText);
            return;
          }
          
          console.log('Quote not found in fresh data, showing text only');
        }
        
        // Last resort: show text only
        toggleQuoteDialog({ text: quoteText });
        return;
      }
      
      // Try to find the full quote object by ID (for local notifications)
      if (quoteId) {
        const fullQuote = quotes.find(q => q.id === quoteId);
        if (fullQuote) {
          toggleQuoteDialog(fullQuote);
          return;
        }
      }
      
      // Try to find by text content as fallback
      const quoteByText = quotes.find(q => q.text === quoteText);
      if (quoteByText) {
        toggleQuoteDialog(quoteByText);
        return;
      }
      
      // Last resort: create minimal quote object with text only
      toggleQuoteDialog({ text: quoteText });
    });

    return () => subscription.remove();
  }, [quotes, isAuthenticated]);


  const adsPermision = async () => {
    const result = await check(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    if (result === RESULTS.DENIED) {
      // The permission has not been requested, so request it.
      await request(PERMISSIONS.IOS.APP_TRACKING_TRANSPARENCY);
    }
  }


  useEffect(() => {
    if (isFocused) {
      // Check if we should show notification onboarding
      checkNotificationOnboarding();
      // Update streak when app opens (only if authenticated)
      if (isAuthenticated) {
        updateStreakData();
      }
      adsPermision();
    }
  }, [isFocused, isAuthenticated]);
  
  // Load streak and reflection data
  const updateStreakData = async () => {
    if (!isAuthenticated) {
      console.log('⚠️ Skipping streak update - user not authenticated');
      return;
    }
    const streak = await streakService.updateStreak();
    console.log('🔥 Setting streak data to state:', streak);
    setStreakData(streak);
    const count = await streakService.getReflectionCount();
    console.log('📊 Setting reflection count to state:', count);
    setReflectionCount(count);
  };
  
  // Update featured quote when quotes change
  useEffect(() => {
    if (quotes.length > 0) {
      // Pick a random quote or the first one as featured
      const randomIndex = Math.floor(Math.random() * Math.min(quotes.length, 7));
      setFeaturedQuote(quotes[randomIndex]);
    }
  }, [quotes]);

  const checkNotificationOnboarding = async () => {
    const hasSeenOnboarding = await AsyncStorage.getItem('hasSeenNotificationOnboarding');
    const { status } = await Notifications.getPermissionsAsync();
    
    // Show onboarding if user hasn't seen it and doesn't have permission
    if (!hasSeenOnboarding && status !== 'granted') {
      setShowNotificationOnboarding(true);
      await AsyncStorage.setItem('hasSeenNotificationOnboarding', 'true');
    }
  };

  const handleCloseOnboarding = () => {
    setShowNotificationOnboarding(false);
  };

  const toggleModal = (index = null, fromCancel = false) => {
    if (index !== null && !fromCancel) {
      setInputText(quotes[index].text);
      setInputAuthor(quotes[index].author || '');
      setEditingIndex(index);
    } else {
      setInputText('');
      setInputAuthor('');
      setEditingIndex(null);
    }
    setIsModalVisible(!isModalVisible);
  };

  useEffect(() => {
    const loadQuotes = async () => {
      if (isAuthenticated) {
        // Load personalized quotes from AsyncStorage (synced by App.js on login)
        try {
          const storedQuotes = await AsyncStorage.getItem(PERSONALIZED_QUOTES_KEY);
          if (storedQuotes) {
            const parsedQuotes = JSON.parse(storedQuotes);
            // Format quotes for display
            setQuotes(parsedQuotes.map(q => ({
              id: q.id,
              text: q.text,
              author: q.author,
              category: q.category,
              isFavorite: q.is_favorite || false,
              is_ai_generated: q.is_ai_generated,
              isDefault: false,
            })));
            console.log('Loaded', parsedQuotes.length, 'personalized quotes from storage');
          } else {
            console.log('No personalized quotes found in storage');
            // Fallback to default quotes if no personalized quotes
            loadLocalQuotes();
          }
        } catch (error) {
          console.error('Error loading personalized quotes:', error);
          // Fallback to local storage
          loadLocalQuotes();
        }
      } else {
        // Load from local storage if not authenticated (guest mode)
        loadLocalQuotes();
      }
    };

    const loadLocalQuotes = () => {
      getData()
        .then((storedQuotes) => {
          if (storedQuotes && storedQuotes.length > 0) {
            setQuotes(storedQuotes);
          } else {
            const language = i18n.language;
            const languageQuotes = defaultQuotes[language] || defaultQuotes.en;
            const defaultQuotesWithFlag = languageQuotes.map((quote) => ({
              id: quote.id,
              text: quote.text,
              isDefault: true,
            }));
            setQuotes(defaultQuotesWithFlag);
          }
        })
        .catch((error) => {
          console.log("Error reading value from getData", error);
        });
    };

    loadQuotes();
  }, [isAuthenticated]);

  const changeDefaultQuotes = () => {
    //replace the default quotes in other language with the default quotes in the current language with the same id
    const language = i18n.language;
    const languageQuotes = defaultQuotes[language] || defaultQuotes.en;
    const updatedQuotes = quotes.map((quote) => {
      if (quote.isDefault) {
        const defaultQuote = languageQuotes.find((q) => q.id === quote.id);
        return {
          id: quote.id,
          text: defaultQuote.text,
          isDefault: true,
        };
      } else {
        return quote;
      }
    });

    // Compare the updatedQuotes array with the current quotes state
    if (JSON.stringify(updatedQuotes) !== JSON.stringify(quotes)) {
      setQuotes(updatedQuotes);
    }
  };

  useEffect(() => {
    if (quotes.length > 0) {
      storeData(quotes);
    }
  }, [quotes]);

  // Only schedule notifications on initial load if none exist (GUEST MODE ONLY)
  useEffect(() => {
    const initNotifications = async () => {
      if (quotes.length === 0) return;
      
      // Don't schedule local notifications for authenticated users (they get remote push)
      if (isAuthenticated) {
        console.log('🔔 User authenticated - skipping local notifications (using remote push)');
        await cancelAllLocalNotifications();
        return;
      }
      
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      if (scheduled.length === 0) {
        console.log('🔄 No notifications found — scheduling local notifications for guest...');
        await scheduleNotifications(quotes);
      }
    };
    
    if (quotes.length > 0) {
      initNotifications();
    }
  }, [isAuthenticated]); // Removed 'quotes' from dependencies - only run when auth status changes

  // Only update default quotes when language changes (NOT on every quotes change)
  useEffect(() => {
    if (quotes.length > 0) {
      changeDefaultQuotes();
    }
  }, [i18n.language]);

  const handleAddItem = async (isAIQuote = false) => {
    // For AI quotes, no text input is required
    if (!isAIQuote && !inputText) {
      return;
    }

    if (editingIndex !== null) {
      // Editing an existing quote (AI quotes can't be edited before generation)
      if (isAuthenticated) {
        try {
          const quoteId = quotes[editingIndex].id;
          await updateQuote(quoteId, { text: inputText, author: inputAuthor });
        } catch (error) {
          console.error('Error updating quote:', error);
          
          // Extract and show error message to user
          let errorMessage = t('common:updateQuoteError') || 'Failed to update quote. Please try again.';
          
          // Check if there's a validation error with details
          if (error.data?.errors && error.data.errors.length > 0) {
            const firstError = error.data.errors[0];
            errorMessage = firstError.msg || errorMessage;
          }
          
          Alert.alert(
            t('common:error') || 'Error',
            errorMessage,
            [{ text: 'OK' }]
          );
          return; // Don't close modal on error
        }
      } else {
        const updatedQuotes = [...quotes];
        updatedQuotes[editingIndex].text = inputText;
        updatedQuotes[editingIndex].author = inputAuthor;
        setQuotes(updatedQuotes);
        storeData(updatedQuotes);
      }
      setEditingIndex(null);
    } else {
      // Adding a new quote
      if (isAuthenticated) {
        try {
          console.log('📝 Creating quote...', { isAIQuote, hasText: !!inputText, hasAuthor: !!inputAuthor });
          
          const result = await createQuote({ 
            text: isAIQuote ? null : inputText,
            author: isAIQuote ? null : inputAuthor,
            is_ai_generated: isAIQuote,
            isPublic: false 
          });
          
          console.log('✅ Quote created successfully, result:', result);
          console.log('🔄 Calling handleRefresh to update quotes list...');
          
          // Refresh quotes to show the new quote (including AI pending quotes)
          const refreshResult = await handleRefresh();
          console.log('✅ Refresh completed, result:', refreshResult ? 'Success' : 'Failed');
          
          // Show success message for AI quotes
          if (isAIQuote) {
            console.log('💬 Showing AI quote success alert');
            Alert.alert(
              t('common:aiQuoteCreated') || 'AI Quote Created',
              t('common:aiQuoteCreatedMessage') || 'Your AI quote will be generated and appear tomorrow!',
              [{ text: 'OK' }]
            );
          }
        } catch (error) {
          console.error('❌ Error creating quote:', error);
          
          // Extract and show error message to user
          let errorMessage = t('common:createQuoteError') || 'Failed to create quote. Please try again.';
          
          // Check if there's a validation error with details
          if (error.data?.errors && error.data.errors.length > 0) {
            const firstError = error.data.errors[0];
            errorMessage = firstError.msg || errorMessage;
          }
          
          Alert.alert(
            t('common:error') || 'Error',
            errorMessage,
            [{ text: 'OK' }]
          );
          return; // Don't close modal on error
        }
      } else {
        // Guest users - store locally (AI quotes not recommended for guests)
        if (isAIQuote) {
          Alert.alert(
            t('common:loginRequired') || 'Login Required',
            t('common:aiQuoteRequiresAuth') || 'AI quotes require an account. Please sign in to use this feature.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        const newQuote = {
          id: quotes.length + 1,
          text: inputText,
          author: inputAuthor,
          isDefault: false,
        };
        const newQuotes = [...quotes, newQuote];
        setQuotes(newQuotes);
        storeData(newQuotes);
      }
    }
    setInputText('');
    setInputAuthor('');
    toggleModal();
  };

  const toggleDeleteModal = (index = null) => {
    setDeleteModalIndex(index);
    setIsDeleteModalVisible(!isDeleteModalVisible);
  };

  const deleteQuote = async (index) => {
    console.log("deleteQuote called with index", index);
    
    if (isAuthenticated) {
      try {
        const quoteId = quotes[index].id;
        await deleteBackendQuote(quoteId);
        
        // Refresh quotes from backend after successful deletion
        await handleRefresh();
      } catch (error) {
        console.error('Error deleting quote:', error);
        
        // Show error alert
        Alert.alert(
          t('common:error') || 'Error',
          t('common:deleteQuoteError') || 'Failed to delete quote. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } else {
      const updatedQuotes = [...quotes];
      updatedQuotes.splice(index, 1);
      console.log("updatedQuotes", updatedQuotes);
      setQuotes(updatedQuotes);
      storeData(updatedQuotes);
    }
    
    Notification.cancelNotification(index.toString());
    toggleDeleteModal();
  };
  
  // Reflection handlers
  const handleRequestReflection = (quote) => {
    setReflectionQuote(quote);
    setShowReflectionModal(true);
  };
  
  const handleSplashFinish = () => {
    setShowSplash(false);
  };
  
  const handleSaveReflection = async (reflectionText) => {
    try {
      await reflectionService.saveReflection({
        quoteId: reflectionQuote.id,
        quoteText: reflectionQuote.text,
        author: reflectionQuote.author,
        reflection: reflectionText,
      });
      
      // Update reflection count immediately
      const count = await streakService.getReflectionCount();
      setReflectionCount(count);
      
      // Update streak data
      const streak = await streakService.getStreak();
      setStreakData(streak);
      
      setShowReflectionModal(false);
      setReflectionQuote(null);
      
      // Show success feedback
      Alert.alert(
        '✅ Reflection Saved',
        'Your reflection has been added to your journal.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Failed to save reflection:', error);
      Alert.alert('Error', 'Failed to save reflection. Please try again.');
    }
  };
  
  const handleSkipReflection = () => {
    setShowReflectionModal(false);
    setReflectionQuote(null);
  };

  const handleRefresh = async () => {
    console.log('🔄 handleRefresh called, isAuthenticated:', isAuthenticated);
    
    if (isAuthenticated) {
      setRefreshing(true);
      try {
        console.log('📡 Fetching quotes from backend...');
        // Re-initialize personalized quotes from backend
        const response = await quoteService.initializeQuotes();
        console.log('📦 Got response from initializeQuotes');
        
        // Access quotes from the correct path (response.data.quotes or response.quotes)
        const quotesData = response.data?.quotes || response.quotes;
        console.log('📊 Quotes data extracted, count:', quotesData?.length || 0);
        
        if (quotesData) {
          console.log('💾 Storing quotes in AsyncStorage...');
          // Store updated quotes in AsyncStorage
          await AsyncStorage.setItem(PERSONALIZED_QUOTES_KEY, JSON.stringify(quotesData));
          await AsyncStorage.setItem(QUOTES_LAST_SYNC_KEY, new Date().toISOString());
          console.log('✅ Stored in AsyncStorage');
          
          // Update local state
          const formattedQuotes = quotesData.map(q => ({
            id: q.id,
            text: q.text,
            author: q.author,
            category: q.category,
            isFavorite: q.is_favorite || false,
            is_ai_generated: q.is_ai_generated,
            isDefault: false,
          }));
          
          console.log('🎨 Formatted quotes, count:', formattedQuotes.length);
          console.log('📋 Setting quotes state...');
          setQuotes(formattedQuotes);
          console.log('✅ State updated successfully');
          return formattedQuotes; // Return the fresh quotes for notification handler
        } else {
          console.warn('⚠️ No quotes data in response');
        }
      } catch (error) {
        console.error('❌ Error refreshing quotes:', error);
        Alert.alert(
          t('common:error') || 'Error',
          t('common:refreshError') || 'Failed to refresh quotes. Please try again.',
          [{ text: 'OK' }]
        );
      } finally {
        setRefreshing(false);
      }
    }
    return null;
  };

  const toggleQuoteDialog = (quote = null) => {
    setSelectedQuote(quote);
    setIsQuoteDialogVisible(!isQuoteDialogVisible);
  };

  const handleFavoriteToggle = (quoteId, newFavoriteStatus) => {
    setQuotes(prevQuotes => 
      prevQuotes.map(q => 
        q.id === quoteId ? { ...q, isFavorite: newFavoriteStatus } : q
      )
    );
  };

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }


  return (
    <SafeAreaView style={{ backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <Image source={require('../assets/images/logo_app.png')} style={styles.logoApp} />
        
        {/* Login Banner for unauthenticated users */}
        {!isAuthenticated && onShowAuth && (
          <View style={styles.loginBanner}>
            <Text style={styles.loginBannerText}>{t('common:loginBenefits')}</Text>
            <TouchableOpacity 
              style={styles.loginBannerButton}
              onPress={onShowAuth}
            >
              <Text style={styles.loginBannerButtonText}>{t('common:signInOrCreateAccount')}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ flex: 1, marginTop: isAuthenticated ? 8 : 0 }}>
          {/* Dashboard Layout */}
          <ScrollView 
            style={styles.dashboardContainer}
            contentContainerStyle={styles.dashboardContent}
            refreshControl={
              isAuthenticated ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#F3BB3E"
                />
              ) : undefined
            }
          >
            {/* Streak Counter */}
            {isAuthenticated && streakData.currentStreak > 0 && (
              <StreakCounter streak={streakData.currentStreak} />
            )}
            
            {/* Today's Focus Section */}
            {featuredQuote && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('common:todaysFocus')}</Text>
                <FeaturedQuoteCard 
                  quote={featuredQuote} 
                  onPress={() => toggleQuoteDialog(featuredQuote)}
                />
              </View>
            )}
            
            {/* Weekly Boosts Section */}
            {quotes.length > 0 && (
              <WeeklyBoostsSection 
                quotes={quotes}
                onQuotePress={toggleQuoteDialog}
              />
            )}
            
            {/* Journal Preview */}
            {isAuthenticated && (
              <JournalPreview 
                reflectionCount={reflectionCount}
                onPress={() => {
                  if (navigation) {
                    navigation.navigate('Journal');
                  }
                }}
              />
            )}
            
            {/* Request AI Boost Button */}
            <TouchableOpacity 
              style={styles.requestBoostButton}
              onPress={() => toggleModal(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.requestBoostIcon}>✨</Text>
              <Text style={styles.requestBoostText}>{t('common:requestBoost')}</Text>
            </TouchableOpacity>
            
            {/* Loading state */}
            {quotes.length === 0 && (
              <Text style={styles.loadingText}>{t('common:loadingQuotes')}</Text>
            )}
          </ScrollView>
          
          <View style={styles.bannerAd}>
            <BannerAd
              unitId={adUnitId}
              size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
              requestOptions={{
                requestNonPersonalizedAdsOnly: true,
              }}
              onAdFailedToLoad={(error) => { console.error('Advert failed to load: ', error); }}
            />
          </View>
        </View>
      </View>

      <AddQuoteModal isVisible={isModalVisible} toggleModal={toggleModal} handleAddItem={handleAddItem} inputText={inputText} setInputText={setInputText} inputAuthor={inputAuthor} setInputAuthor={setInputAuthor} isEditing={editingIndex !== null} t={t} />

      <QuoteModal 
        isVisible={isQuoteDialogVisible} 
        toggleModal={toggleQuoteDialog} 
        selectedQuote={selectedQuote}
        onFavoriteToggle={handleFavoriteToggle}
        onRequestReflection={handleRequestReflection}
      />

      <ReflectionModal
        visible={showReflectionModal}
        quote={reflectionQuote}
        onSave={handleSaveReflection}
        onSkip={handleSkipReflection}
      />

      <DeleteModal
        isVisible={isDeleteModalVisible}
        toggleModal={toggleDeleteModal}
        handleDeleteItem={deleteQuote}
        deleteModalIndex={deleteModalIndex}
        t={t}
      />

      <NotificationOnboarding
        visible={showNotificationOnboarding}
        onClose={handleCloseOnboarding}
        quotes={quotes}
      />

    </SafeAreaView>

  );
}

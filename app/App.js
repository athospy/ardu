import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuotesScreen from './screens/QuotesScreen';
import SettingsScreen from './screens/SettingsScreen';
import JournalScreen from './screens/JournalScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import MotivationModal from './components/MotivationModal';
import OnboardingScreen from './screens/OnboardingScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Image, ActivityIndicator, View, Alert } from 'react-native';
import { useAuthStore } from './src/store/authStore';
import { userService } from './src/api/services/userService';
import { quoteService } from './src/api/services/quoteService';
import { registerForPushNotifications, checkAndRefreshPushToken } from './utils/pushNotifications';
import { cancelAllLocalNotifications } from './screens/notificationUtils';
import { getToken } from './src/utils/storage';
import './constants/IMLocalize';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Main App Tabs (works for both authenticated and guest users)
function AppTabs({ onShowAuth }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let imageSource;

          if (route.name === 'Home') {
            imageSource = focused
              ? require('./assets/images/home_active.png')
              : require('./assets/images/home_normal.png');
          } else if (route.name === 'Journal') {
            imageSource = focused
              ? require('./assets/images/journal_active.png')
              : require('./assets/images/journal_normal.png');
          } else if (route.name === 'Settings') {
            imageSource = focused
              ? require('./assets/images/settings_active.png')
              : require('./assets/images/settings_normal.png');
          }

          return (
            <Image
              source={imageSource}
              resizeMode="center"
              style={{ marginTop: 5 }}
            />
          );
        },
        tabBarActiveTintColor: '#211F1F',
        tabBarInactiveTintColor: '#211F1F',
        headerShown: false,
        tabBarStyle: [
          {
            backgroundColor: '#F3BB3E',
            height: '12%',
          }
        ]
      })}
    >
      <Tab.Screen name='Home'>
        {(props) => <QuotesScreen {...props} onShowAuth={onShowAuth} />}
      </Tab.Screen>
      <Tab.Screen name='Journal'>
        {(props) => <JournalScreen {...props} onShowAuth={onShowAuth} />}
      </Tab.Screen>
      <Tab.Screen name='Settings' component={SettingsScreen} />
    </Tab.Navigator>
  );
}

// Auth Stack (when user wants to login)
function AuthStack({ onClose }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} onClose={onClose} />}
      </Stack.Screen>
      <Stack.Screen name="Register">
        {(props) => <RegisterScreen {...props} onClose={onClose} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

export default function App() {
  const { isAuthenticated, initialized, initialize, user, updateUser } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showMotivationModal, setShowMotivationModal] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await initialize();
        
        // Wait for auth state to stabilize (allow AsyncStorage writes to complete)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Check if user has completed onboarding
        const onboardingComplete = await AsyncStorage.getItem('hasCompletedOnboarding');
        setHasCompletedOnboarding(!!onboardingComplete);
        
        // Show onboarding if not completed
        if (!onboardingComplete) {
          setShowOnboarding(true);
        }
        
        // If user is authenticated and has motivation, sync quotes
        const currentUser = useAuthStore.getState().user;
        if (currentUser && currentUser.motivation) {
          try {
            // Verify token exists before making API call
            const token = await getToken();
            if (!token) {
              console.error('❌ No token found, skipping quote sync');
              return;
            }
            
            console.log('🔑 Token verified, syncing quotes...');
            const response = await quoteService.initializeQuotes();
            
            // Store personalized quotes locally
            await AsyncStorage.setItem(
              '@personalized_quotes',
              JSON.stringify(response.data.quotes)
            );
            
            // Update sync timestamp
            await AsyncStorage.setItem(
              '@quotes_last_sync',
              new Date().toISOString()
            );
            
            console.log('✅ Quotes synced on login:', response.data.alreadyInitialized ? 'existing quotes' : 'new quotes', '- Count:', response.data.count);
          } catch (error) {
            console.error('Failed to sync quotes on login:', error);
            // Don't block app if sync fails
          }

          // Register push notifications if authenticated
          try {
            // Cancel all local notifications (switch to remote push)
            await cancelAllLocalNotifications();
            console.log('✅ Local notifications cancelled - switching to remote push');
            
            const refreshed = await checkAndRefreshPushToken();
            if (!refreshed) {
              // If token wasn't refreshed, ensure it's registered
              await registerForPushNotifications();
            }
          } catch (error) {
            console.error('Failed to register push notifications:', error);
            // Don't block app if push registration fails
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
      } finally {
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  // Check if user needs to set motivation after authentication
  useEffect(() => {
    if (isAuthenticated && user && !user.motivation) {
      // Show motivation modal if user is authenticated but hasn't set motivation
      setShowMotivationModal(true);
    }
  }, [isAuthenticated, user]);

  const handleMotivationSubmit = async (motivation) => {
    try {
      // 1. Update user motivation on backend
      await userService.updateMotivation({ motivation });
      
      // 2. Initialize personalized quotes (creates 7 curated quotes)
      const response = await quoteService.initializeQuotes();
      
      // 3. Store personalized quotes locally
      await AsyncStorage.setItem(
        '@personalized_quotes',
        JSON.stringify(response.data.quotes)
      );
      
      // 4. Update sync timestamp
      await AsyncStorage.setItem(
        '@quotes_last_sync',
        new Date().toISOString()
      );
      
      console.log('✅ Personalized quotes initialized:', response.data.count, 'quotes stored');
      
      // 5. Update local user state
      updateUser({ ...user, motivation });
      
      // 6. Register push notifications
      try {
        // Cancel local notifications and switch to remote push
        await cancelAllLocalNotifications();
        await registerForPushNotifications();
        console.log('✅ Push notifications registered');
      } catch (error) {
        console.error('Push notification registration failed:', error);
        // Don't block flow if push registration fails
      }
      
      // 7. Close modal
      setShowMotivationModal(false);
    } catch (error) {
      console.error('Failed to update motivation:', error);
      Alert.alert('Error', 'Failed to save your motivation. Please try again.');
    }
  };
  
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setHasCompletedOnboarding(true);
  };
  
  const handleOnboardingMotivation = async (motivation) => {
    // If user is authenticated, save motivation immediately
    if (isAuthenticated) {
      await handleMotivationSubmit(motivation);
    } else {
      // Store motivation temporarily for when user signs up
      await AsyncStorage.setItem('@pending_motivation', motivation);
    }
  };
  
  // Show onboarding first if not completed
  if (showOnboarding) {
    return (
      <OnboardingScreen 
        onComplete={handleOnboardingComplete}
        onSetMotivation={handleOnboardingMotivation}
      />
    );
  }

  if (!isReady || !initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <ActivityIndicator size="large" color="#F3BB3E" />
      </View>
    );
  }

  // If user is authenticated, always show main app
  // If not authenticated, show main app by default (guest mode)
  // Only show auth stack if user explicitly wants to login
  return (
    <>
      <NavigationContainer>
        {isAuthenticated ? (
          <AppTabs />
        ) : showAuth ? (
          <AuthStack onClose={() => setShowAuth(false)} />
        ) : (
          <AppTabs onShowAuth={() => setShowAuth(true)} />
        )}
      </NavigationContainer>

      {/* Motivation Modal */}
      <MotivationModal
        visible={showMotivationModal}
        onClose={() => setShowMotivationModal(false)}
        onSubmit={handleMotivationSubmit}
      />
    </>
  );
}

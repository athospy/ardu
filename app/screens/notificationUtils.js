import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

/* ------------------------------
   🧹 Cancel all local notifications (for authenticated users)
------------------------------- */
export const cancelAllLocalNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem('notificationsScheduled');
    console.log('✅ All local notifications cancelled');
  } catch (error) {
    console.error('Failed to cancel local notifications:', error);
  }
};

/* ------------------------------
   📅 Schedules all quotes for TOMORROW only (GUEST MODE ONLY)
   (No repeat. This was your old flow.)
------------------------------- */
export const scheduleNotifications = async (quotes) => {
  if (!Device.isDevice) return;

  const scheduledFlag = await AsyncStorage.getItem('notificationsScheduled');
  if (scheduledFlag) {
    console.log('📌 Notifications were already scheduled.');
    return;
  }

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    console.log('❌ Permissions missing — onboarding must ask first');
    return;
  }

  const acceptableHours = [8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const now = new Date();

  // Schedule a welcome notification in 1 minute to give immediate feedback
  const welcomeQuote = quotes[Math.floor(Math.random() * quotes.length)];
  const welcomeTime = new Date(Date.now() + 60000); // 1 minute from now
  
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🎉 Welcome to Daily Wisdom!',
      body: welcomeQuote.text,
      data: { id: welcomeQuote.id },
      sound: 'default',
      priority: 'high',
      vibrate: [0,250,250,250],
    },
    trigger: { type: 'date', date: welcomeTime },
  });
  console.log('✨ Welcome notification scheduled for 1 minute from now');

  for (let hour of acceptableHours) {
    const quote = quotes[Math.floor(Math.random() * quotes.length)];

    const target = new Date(now);
    target.setDate(now.getDate() + 1); // 🔥 always tomorrow
    target.setHours(hour);
    target.setMinutes(Math.floor(Math.random() * 60));
    target.setSeconds(0);
    target.setMilliseconds(0);

    // safety check to ensure it's not firing today
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: '✨ Daily Wisdom',
        body: quote.text,
        data: { id: quote.id },
        sound: 'default',
        priority: 'high',
        vibrate: [0,250,250,250],
      },
      trigger: { type: 'date', date: target }, // Future-proof format
    });
  }

  await AsyncStorage.setItem('notificationsScheduled', 'true');
  console.log(`✅ Scheduled ${acceptableHours.length} notifications for tomorrow.`);
};

/* ------------------------------------
   🧪 Debug helpers - unchanged
-------------------------------------*/
export const getAllScheduledNotifications = async () => {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  console.log(`📋 Total: ${scheduled.length}`);
  return scheduled;
};

export const scheduleTestNotification = async (quotes) => {
  if (!Device.isDevice) return alert('⚠️ Real device required');

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return alert('❌ Enable notifications first');

  const q = quotes[Math.floor(Math.random() * quotes.length)];
  const time = new Date(Date.now() + 60000);

  await Notifications.scheduleNotificationAsync({
    content: { title:'🎉 Random Wisdom', body:q.text, data:{id:q.id} },
    trigger: { type: 'date', date: time },
  });

  alert('⏳ Quote in 1 minute!');
};

export const forceRescheduleNotifications = async (quotes) => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem('notificationsScheduled');
  await scheduleNotifications(quotes);
};

export const clearAllNotifications = async () => {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.multiRemove([
    'notificationsScheduled', 'lastScheduledQuotes'
  ]);
  console.log('🧹 Cleared everything');
};


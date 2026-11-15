import * as Notifications from 'expo-notifications';
import * as Permissions from 'expo-permissions';
import Constants from 'expo-constants';

class NotificationsManager {
  constructor() {
    this.bootstrap();

    // Background/foreground listener
    Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      if (notification) {
        this.handleNotificationOpen(notification);
      }
    });
  }

  // Handle when the user taps a notification
  handleNotificationOpen(notification: Notifications.Notification) {
    const { data } = notification.request.content;
    console.log('Notification Opened:', data);
  }

  // Called on app launch to handle initial notification
  async bootstrap() {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) {
      this.handleNotificationOpen(response.notification);
    }
  }

  // Request permission to send notifications
  async checkPermissions(): Promise<boolean> {
    if (!Constants.isDevice) {
      console.log('Must use physical device for notifications');
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('User declined permissions');
      return false;
    }

    return true;
  }

  // Schedule a notification
  async scheduleNotification({
    reminder,
    date,
    notificationId,
  }: {
    reminder: string;
    date: Date;
    notificationId: string;
  }) {
    const hasPermissions = await this.checkPermissions();
    if (!hasPermissions) return;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'RandomWisdomApp',
        body: reminder,
        data: {
          id: notificationId,
          action: 'reminder',
          details: {
            name: reminder,
            date: date.toString(),
          },
        },
      },
      trigger: {
        date, // Date object for scheduling
        repeats: true, // true for repeating (daily)
      },
    });
  }

  // Cancel a notification
  async cancelNotification(notificationId: string) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
}

export default new NotificationsManager();

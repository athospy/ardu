const { Expo } = require('expo-server-sdk');

const expo = new Expo({
  accessToken: process.env.EXPO_ACCESS_TOKEN,
  useFcmV1: true, // Use FCM v1 API
});

// Validate Expo push tokens
const isValidPushToken = (token) => {
  return Expo.isExpoPushToken(token);
};

// Send push notification
const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!isValidPushToken(pushToken)) {
    throw new Error('Invalid Expo push token');
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
    priority: 'high',
  };

  try {
    const ticketChunk = await expo.sendPushNotificationsAsync([message]);
    return ticketChunk[0];
  } catch (error) {
    console.error('Error sending push notification:', error);
    throw error;
  }
};

// Send multiple notifications in batches
const sendBatchNotifications = async (messages) => {
  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];

  for (let chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending batch notifications:', error);
    }
  }

  return tickets;
};

module.exports = {
  expo,
  isValidPushToken,
  sendPushNotification,
  sendBatchNotifications,
};

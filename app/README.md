# Ardu - Daily Wisdom & Reflection App

A React Native mobile application that delivers daily inspirational quotes and enables users to record personal reflections, track streaks, and build a mindfulness journal.

## About Ardu

Ardu transforms the way you engage with motivational content by delivering personalized wisdom at unexpected moments throughout your day. Unlike traditional quote apps that become predictable and easy to ignore, Ardu surprises you with thoughtfully-timed inspiration designed to break through your daily routine and spark genuine reflection.

At its core, Ardu is built around three powerful principles: personalization, consistency, and mindful engagement. When you first join, you share what motivates you—whether it's personal growth, overcoming challenges, or pursuing your dreams. Ardu then curates seven personalized quotes tailored to your unique journey, giving you a foundation of wisdom to explore.

But Ardu goes beyond simple quote delivery. The app encourages you to actively engage with the wisdom you receive through its reflection journal feature. After reading a quote that resonates, you can capture your thoughts, feelings, and insights in a private journal entry. This practice transforms passive reading into active learning, helping you internalize the wisdom and apply it to your life. Over time, your journal becomes a personal record of growth, filled with moments of clarity and breakthrough insights you can revisit whenever you need encouragement.

To keep you consistent on your growth journey, Ardu tracks your engagement through a streak system. Each day you check in and reflect, your streak grows—building a visual representation of your commitment to personal development. This gamification element provides gentle motivation to make wisdom and reflection a daily habit, not just an occasional activity.

The app also features smart push notifications that deliver quotes at thoughtfully chosen moments, ensuring the wisdom arrives when you're most receptive. You have full control over when and how often you receive notifications, putting you in charge of your experience while maintaining the element of delightful surprise.

For those seeking fresh perspectives, Ardu offers AI-generated quotes on demand. Simply tap the generate button, and within moments, you'll receive custom wisdom crafted specifically for your motivational themes. These AI-powered quotes complement the curated collection, ensuring you always have access to new inspiration when you need it most.

Ardu supports your journey in multiple languages—English, Spanish, and Guarani—making wisdom accessible to a diverse global community. Your data is securely stored in the cloud with end-to-end encryption, ensuring your personal reflections remain private while syncing seamlessly across your devices.

Whether you're starting your personal development journey or deepening an existing practice, Ardu meets you where you are. It's not about perfection or achieving some idealized version of yourself—it's about showing up, reflecting honestly, and growing one insight at a time. With its beautiful, distraction-free interface and portrait-only design, Ardu creates a focused space for contemplation in an increasingly chaotic digital world.

Join thousands of users who have made Ardu part of their daily routine. Download today and discover how a few moments of reflection each day can transform your mindset, build lasting positive habits, and help you become the person you aspire to be.

## Features

- **Daily Quotes**: Personalized inspirational quotes delivered at scheduled times
- **Reflection Journal**: Save and review your thoughts on quotes
- **Streak Tracking**: Build consecutive day streaks by checking in daily
- **Multi-language Support**: English, Spanish
- **Push Notifications**: Remote push notifications for daily reminders
- **Authentication**: Secure user accounts with JWT-based auth
- **Cloud Sync**: All data synced to backend API

## Tech Stack

- **Frontend**: React Native (Expo)
- **Backend**: Node.js API (http://localhost:3000)
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Internationalization**: i18next
- **Storage**: Backend API with JWT authentication

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with:
   ```
   API_BASE_URL=http://localhost:3000
   ```
4. Run the app:
   ```bash
   # iOS
   expo run:ios --device
   
   # Android
   expo run:android --device
   ```

## Project Structure

```
/screens        - Main app screens (Quotes, Journal, Settings, Splash)
/components     - Reusable UI components (Modals, Buttons, etc.)
/services       - API service layers (auth, reflections, streak, quotes)
/context        - React context providers
/constants      - Translations and constants
/assets         - Images, fonts, and video assets
```

## API Integration

All user data is stored in the cloud via REST API:
- Authentication: `/api/auth/login`, `/api/auth/register`
- Quotes: `/api/quotes/initialize`, `/api/quotes/personalize`
- Reflections: `/api/reflections` (CRUD operations)
- Streaks: `/api/users/streak`, `/api/users/streak/checkin`

## Development

- Backend API: http://localhost:3000
- Test script available: `node test-api.js`
- Documentation: See `/docs` folder

## License

Private project - All rights reserved

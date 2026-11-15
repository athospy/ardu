import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Image, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function OnboardingScreen({ onComplete, onSetMotivation }) {
  const { t } = useTranslation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [motivation, setMotivation] = useState('');

  const slides = [
    {
      emoji: '🎯',
      title: 'What Goal Are You Crushing?',
      subtitle: 'Ardu tailors your daily motivation to your personal goals',
      content: 'goal-input',
    },
    {
      emoji: '✨',
      title: 'Your Personal AI Coach',
      subtitle: 'Get 7 AI-curated motivations every week based on your goal',
      content: 'ai-explanation',
      image: '🤖',
    },
    {
      emoji: '📬',
      title: 'Progress Delivered Daily',
      subtitle: 'Receive timely motivation throughout your day (8 AM - 10 PM)',
      content: 'notifications',
      features: [
        'Up to 15 daily boosts',
        'Goal-aligned timing',
        'Never spam',
      ],
    },
    {
      emoji: '📈',
      title: 'See Your Growth',
      subtitle: 'Reflect on your journey and build your streak',
      content: 'progress',
      image: '📊',
    },
  ];

  const currentSlideData = slides[currentSlide];

  const handleNext = async () => {
    if (currentSlide === 0) {
      // First slide - validate goal input
      if (!motivation.trim()) {
        return; // Don't proceed without goal
      }
    }

    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Complete onboarding
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      if (motivation.trim()) {
        onSetMotivation?.(motivation);
      }
      onComplete();
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
    onComplete();
  };

  const renderSlideContent = () => {
    switch (currentSlideData.content) {
      case 'goal-input':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.inputLabel}>I'm focused on...</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., fitness, career, mindfulness, learning"
              placeholderTextColor="#999"
              value={motivation}
              onChangeText={setMotivation}
              multiline
              maxLength={200}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()}
              autoFocus={currentSlide === 0}
            />
            <Text style={styles.hint}>This helps us personalize your experience</Text>
          </View>
        );

      case 'ai-explanation':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.largeEmoji}>{currentSlideData.image}</Text>
            <Text style={styles.description}>
              Unlike generic quote apps, Ardu uses AI to generate personalized motivations specifically aligned with your goals.
            </Text>
          </View>
        );

      case 'notifications':
        return (
          <View style={styles.contentContainer}>
            <View style={styles.featuresContainer}>
              {currentSlideData.features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Text style={styles.checkmark}>✓</Text>
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'progress':
        return (
          <View style={styles.contentContainer}>
            <Text style={styles.largeEmoji}>{currentSlideData.image}</Text>
            <Text style={styles.description}>
              Track your streaks, save reflections, and watch your progress grow over time.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#F3BB3E', '#FF9A56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        >
          {/* Skip button */}
          {currentSlide < slides.length - 1 && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          )}

        {/* Slide indicator */}
        <View style={styles.indicatorContainer}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                index === currentSlide && styles.indicatorActive,
              ]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.slideContainer}>
          <Text style={styles.emoji}>{currentSlideData.emoji}</Text>
          <Text style={styles.title}>{currentSlideData.title}</Text>
          <Text style={styles.subtitle}>{currentSlideData.subtitle}</Text>

          {renderSlideContent()}
        </View>

        {/* Navigation */}
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              currentSlide === 0 && !motivation.trim() && styles.buttonDisabled,
            ]}
            onPress={handleNext}
            disabled={currentSlide === 0 && !motivation.trim()}
          >
            <Text style={styles.buttonText}>
              {currentSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3BB3E',
  },
  gradient: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 12,
  },
  skipText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 24,
    backgroundColor: '#FFF',
  },
  slideContainer: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  emoji: {
    fontSize: 72,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 16,
    opacity: 0.95,
  },
  contentContainer: {
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  input: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    fontSize: 16,
    color: '#211F1F',
    minHeight: 100,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  hint: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 12,
    opacity: 0.9,
    fontStyle: 'italic',
  },
  largeEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: '100%',
    paddingHorizontal: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
  },
  checkmark: {
    fontSize: 24,
    color: '#FFF',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    flex: 1,
  },
  navigationContainer: {
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  button: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#211F1F',
  },
});

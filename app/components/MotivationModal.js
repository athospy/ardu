import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function MotivationModal({ visible, onClose, onSubmit }) {
  const [motivation, setMotivation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!motivation.trim()) {
      Alert.alert('Please enter something', 'Tell us what motivates you to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(motivation.trim());
      setMotivation('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save your motivation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    setMotivation('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleSkip}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.emoji}>💪</Text>
              <Text style={styles.title}>What Motivates You?</Text>
              <Text style={styles.subtitle}>
                Help us personalize your daily wisdom by sharing what drives you forward.
              </Text>
            </View>

            {/* Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>I'm motivated by...</Text>
              <TextInput
                style={styles.input}
                placeholder="achieving my fitness goals, building better habits, personal growth..."
                placeholderTextColor="#999"
                value={motivation}
                onChangeText={setMotivation}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                autoFocus
                editable={!isLoading}
              />
              <Text style={styles.hint}>
                💡 Be specific! This helps us send you more relevant and inspiring quotes.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.primaryButton]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#211F1F" />
                ) : (
                  <Text style={styles.primaryButtonText}>Continue</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                disabled={isLoading}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#211F1F',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flex: 1,
    marginTop: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#211F1F',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    minHeight: 120,
    color: '#211F1F',
  },
  hint: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 20,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#F3BB3E',
    marginBottom: 12,
  },
  primaryButtonText: {
    color: '#211F1F',
    fontSize: 16,
    fontWeight: 'bold',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

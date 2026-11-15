import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';

/**
 * ReflectionModal - Prompts user to reflect on how they'll apply a quote
 * Shows after user views a quote in detail
 */
const ReflectionModal = ({ visible, quote, onSave, onSkip }) => {
  const { t } = useTranslation();
  const [reflection, setReflection] = useState('');

  const handleSave = () => {
    if (reflection.trim()) {
      onSave(reflection.trim());
      setReflection('');
    }
  };

  const handleSkip = () => {
    setReflection('');
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleSkip}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.emoji}>✍️</Text>
            <Text style={styles.title}>{t('common:quickReflection')}</Text>
            <Text style={styles.subtitle}>{t('common:reflectionPrompt')}</Text>
          </View>

          {/* Quote Preview */}
          {quote && (
            <View style={styles.quotePreview}>
              <Text style={styles.quoteText} numberOfLines={3}>
                "{quote.text}"
              </Text>
            </View>
          )}

          {/* Reflection Input */}
          <TextInput
            style={styles.input}
            placeholder="Type your thoughts here..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            value={reflection}
            onChangeText={setReflection}
            autoFocus
            textAlignVertical="top"
          />

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>{t('common:skipReflection')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButton,
                !reflection.trim() && styles.saveButtonDisabled
              ]}
              onPress={handleSave}
              activeOpacity={0.7}
              disabled={!reflection.trim()}
            >
              <Text style={styles.saveButtonText}>{t('common:saveReflection')}</Text>
            </TouchableOpacity>
          </View>

          {/* Hint */}
          <Text style={styles.hint}>
            💡 Your reflections help track your progress and unlock insights
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
    minHeight: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'poppins-bold',
    fontSize: 24,
    color: '#211F1F',
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: 'poppins-regular',
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  quotePreview: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F3BB3E',
  },
  quoteText: {
    fontFamily: 'poppins-regular',
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontFamily: 'poppins-regular',
    fontSize: 16,
    color: '#211F1F',
    minHeight: 120,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  skipButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontFamily: 'poppins-semibold',
    fontSize: 16,
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#F3BB3E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#F3BB3E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    fontFamily: 'poppins-bold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  hint: {
    fontFamily: 'poppins-regular',
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ReflectionModal;

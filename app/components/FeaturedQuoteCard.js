import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function FeaturedQuoteCard({ quote, onPress }) {
  if (!quote || (!quote.text && !quote.is_ai_generated)) return null;
  
  // Show AI pending state
  if (quote.is_ai_generated && !quote.text) {
    return (
      <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
        <LinearGradient
          colors={['#F3BB3E', '#FF9A56']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.aiPendingContainer}>
            <Text style={styles.aiPendingIcon}>✨</Text>
            <Text style={styles.aiPendingText}>
              AI generating your boost...{'\n'}you'll be notified when ready
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={['#F3BB3E', '#FF9A56']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {quote.is_ai_generated && (
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        )}
        
        <Text style={styles.quoteText}>{quote.text}</Text>
        
        {quote.author && (
          <Text style={styles.authorText}>— {quote.author}</Text>
        )}
        
        {quote.isFavorite && (
          <Text style={styles.favoriteIcon}>♥</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  gradient: {
    padding: 32,
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    lineHeight: 32,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  authorText: {
    fontSize: 16,
    color: '#FFF',
    marginTop: 16,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  aiBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#9B59B6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  aiBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  favoriteIcon: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    fontSize: 24,
    color: '#FFF',
  },
  aiPendingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPendingIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  aiPendingText: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

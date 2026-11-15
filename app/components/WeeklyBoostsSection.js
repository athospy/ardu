import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

function BoostCard({ quote, onPress }) {
  // AI pending state
  if (quote.is_ai_generated && !quote.text) {
    return (
      <TouchableOpacity style={[styles.card, styles.aiPendingCard]} onPress={onPress} activeOpacity={0.7}>
        <Text style={styles.aiPendingIcon}>✨</Text>
        <Text style={styles.aiPendingLabel}>Generating...</Text>
      </TouchableOpacity>
    );
  }
  
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      {quote.is_ai_generated && (
        <View style={styles.aiBadge}>
          <Text style={styles.aiBadgeText}>AI</Text>
        </View>
      )}
      <Text style={styles.cardText} numberOfLines={4}>
        {quote.text}
      </Text>
      {quote.author && (
        <Text style={styles.cardAuthor} numberOfLines={1}>— {quote.author}</Text>
      )}
    </TouchableOpacity>
  );
}

export default function WeeklyBoostsSection({ quotes, onQuotePress }) {
  const { t } = useTranslation();
  
  if (!quotes || quotes.length === 0) return null;
  
  // Show up to 7 quotes (weekly boosts)
  const weeklyQuotes = quotes.slice(0, 7);
  
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{t('common:weeklyBoosts')} ({weeklyQuotes.length})</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {weeklyQuotes.map((quote, index) => (
          <BoostCard 
            key={quote.id || index} 
            quote={quote} 
            onPress={() => onQuotePress(quote)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#211F1F',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  scrollContent: {
    paddingRight: 16,
  },
  card: {
    width: 160,
    height: 200,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: 'space-between',
  },
  cardText: {
    fontSize: 14,
    color: '#605A5C',
    lineHeight: 20,
    flex: 1,
  },
  cardAuthor: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  aiBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#9B59B6',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  aiBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  aiPendingCard: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 2,
    borderColor: '#F3BB3E',
    borderStyle: 'dashed',
  },
  aiPendingIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  aiPendingLabel: {
    fontSize: 12,
    color: '#F3BB3E',
    fontWeight: '600',
  },
});

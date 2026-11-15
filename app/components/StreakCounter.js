import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function StreakCounter({ streak = 0, style }) {
  const { t } = useTranslation();
  
  if (streak === 0) return null; // Don't show if no streak
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.streakInfo}>
        <Text style={styles.streakEmoji}>🔥</Text>
        <Text style={styles.streakNumber}>{streak}</Text>
        <Text style={styles.streakLabel}>{t('common:dayStreak')}</Text>
      </View>
      <Text style={styles.encouragement}>{t('common:keepMomentum')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F3BB3E',
  },
  streakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  streakEmoji: {
    fontSize: 32,
    marginRight: 8,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#211F1F',
    marginRight: 8,
  },
  streakLabel: {
    fontSize: 18,
    color: '#605A5C',
    fontWeight: '600',
  },
  encouragement: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
];

const Selector = () => {
  const { t, i18n } = useTranslation();
  const selectedLanguageCode = i18n.language;
  const [selectedLanguage, setSelectedLanguage] = useState(selectedLanguageCode);

  const setLanguage = code => {
    i18n.changeLanguage(code);
    setSelectedLanguage(code);
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{t('common:languageSelector')}</Text>
      </View>
      <View
        style={{
          borderBottomColor: '#E0E0E0',
          borderBottomWidth: 1,
          marginVertical: 20,
        }}
      />
      {LANGUAGES.map(language => {
        return (
          <Pressable
            key={language.code}
            style={[styles.buttonContainer, selectedLanguage === language.code && styles.selectedButtonContainer]}
            onPress={() => setLanguage(language.code)}
          >
            <View
              style={{
                borderBottomColor: '#E0E0E0',
                borderBottomWidth: 1,
                marginVertical: 20,
              }}
            />
            <View style={styles.radioButton}>
              {selectedLanguage === language.code && <View style={styles.radioInner} />}
            </View>
            <Text style={[styles.text, selectedLanguage === language.code && styles.selectedText]}>
              {language.label}
            </Text>
          </Pressable>
        );
      })}


    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#444',
    fontSize: 25,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  selectedButtonContainer: {
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#211F1F',
  },
  text: {
    fontSize: 18,
    color: '#000',
    paddingVertical: 4,
  },
  selectedText: {
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 4,
  },
});

export default Selector;
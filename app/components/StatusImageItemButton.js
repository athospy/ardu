import React, { useState, useRef } from 'react';
import { TouchableWithoutFeedback, Text, StyleSheet, Image, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export default function StatusImageItemButton({ onPress, activeImagePath, normalImagePath, buttonText, imageWidth, buttonTextColor }) {
  const { t } = useTranslation();
  const [active, setActive] = useState(false);

  return (
    <TouchableWithoutFeedback style={styles.addItemButton} onPress={onPress}
      onPressIn={() => setActive(true)}
      onPressOut={() => setActive(false)}>
      <View style={styles.buttonContainer}>
        <Image
          source={
            active
              ? activeImagePath
              : normalImagePath
          }
          style={[
            styles.addButtonImage,
            {width: imageWidth+'%'}
          ]} />
        <Text style={[styles.addItemButtonText, { color: buttonTextColor }]}>
          {buttonText}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
}




const styles = StyleSheet.create({
  addItemButton: {
    flex: 0.25,
  },
  buttonContainer: {
    alignItems: 'center',
    position: 'relative',
  },
  addButtonImage: {
    alignSelf: 'center',
    resizeMode: 'contain',
  },
  addItemButtonText: {
    color: '#221F20',
    fontSize: 16,
    fontWeight: '600',
    position: 'absolute',
    top: '39%',
    textAlign: 'center',
    width: '100%',
    alignSelf: 'center',
  },
});

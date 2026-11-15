import React, {useState} from 'react';
import { TouchableWithoutFeedback, Image, StyleSheet } from 'react-native';

export default function DeleteButton({ onPress }) {
  const [active, setActive] = useState(false);

  return (
    <TouchableWithoutFeedback style={styles.deleteButton} onPress={onPress} onPressIn={() => setActive(true)}
    onPressOut={() => setActive(false)}>
      <Image
        source={
          active
            ? require('../assets/images/delete_button_active.png')
            : require('../assets/images/delete_button_normal.png')
        }
        style={
          styles.deleteButtonImage
        } />
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    flex: 0.25,
  },
  deleteButtonImage: {
    alignSelf: 'center',
    width: '15%',
    resizeMode: 'contain',
  },
});

import React, {useState} from 'react';
import { TouchableWithoutFeedback, Image, StyleSheet } from 'react-native';

export default function EditButton({ onPress }) {
  const [active, setActive] = useState(false);

  return (
    <TouchableWithoutFeedback style={styles.editButton} onPress={onPress} onPressIn={() => setActive(true)}
    onPressOut={() => setActive(false)}>
      <Image
        source={
          active
            ? require('../assets/images/edit_button_active.png')
            : require('../assets/images/edit_button_normal.png')
        }
        style={
          styles.editButtonImage
        } />
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  editButton: {
    flex: 0.25,
  },
  editButtonImage: {
    alignSelf: 'center',
    width: '15%',
    resizeMode: 'contain',
  },
});

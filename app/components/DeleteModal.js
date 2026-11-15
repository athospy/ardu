import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Modal from 'react-native-modal';
import StatusImageItemButton from './StatusImageItemButton';

const DeleteModal = ({ isVisible, toggleModal, handleDeleteItem, deleteModalIndex, t }) => {

  const screenHeight = Dimensions.get('window').height;
  const isSmallScreen = screenHeight < 700;
  const percentage = isSmallScreen ? '31%' : '23%';

  return (
    <Modal isVisible={isVisible} style={deleteModalStyles.modalContainer}>
      <View style={[ deleteModalStyles.modalContent, {height: percentage}] }>
        <Text style={deleteModalStyles.confirmationTitle}>{t('common:confirmationTitle')}</Text>
        <Text style={deleteModalStyles.confirmationText}>{t('common:confirmationText')}</Text>
        <View style={deleteModalStyles.modalButtonsContainer}>
            <View style={deleteModalStyles.buttonWrapper}>
              <StatusImageItemButton onPress={()=>handleDeleteItem(deleteModalIndex)}
                activeImagePath={require('../assets/images/delete_modal_button_active.png')}
                normalImagePath={require('../assets/images/delete_modal_button_normal.png')}
                buttonText={ t('common:deleteButtonText')}
                imageWidth={100}
                buttonTextColor={"#ffffff"}
              />
            </View>
            <View style={{flex: 0.25}}></View>
            <View style={deleteModalStyles.buttonWrapper}>
              <StatusImageItemButton onPress={toggleModal}
                activeImagePath={require('../assets/images/cancel_modal_button_active.png')}
                normalImagePath={require('../assets/images/cancel_modal_button_normal.png')}
                buttonText={t('common:cancelButtonText')}
                imageWidth={100}
                buttonTextColor={"#ffffff"}
              />
            </View>
          </View>
      </View>
    </Modal>
  );
};

const deleteModalStyles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 5,
    paddingHorizontal: '4%',
    paddingVertical: '6%',
    width: '100%',
    justifyContent: 'space-between',
    
  },
  confirmationTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: '5%',
    textAlign: 'center',
  },
  confirmationText: {
    marginBottom: 0,
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  buttonText: {
    color: '#fff',
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default DeleteModal;

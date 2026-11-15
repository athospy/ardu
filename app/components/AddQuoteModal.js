import React, {useEffect} from 'react';
import { Text, TextInput, TouchableOpacity, View, StyleSheet, Keyboard, Dimensions, Switch} from 'react-native';
import Modal from 'react-native-modal';
import StatusImageItemButton from './StatusImageItemButton';

const AddQuoteModal = ({ isVisible, toggleModal, handleAddItem, inputText, setInputText, inputAuthor, setInputAuthor, isEditing, t }) => {
  const [isAIQuote, setIsAIQuote] = React.useState(false);
  const screenHeight = Dimensions.get('window').height;
  const isSmallScreen = screenHeight < 700;
  // Increase height when AI toggle is active to accommodate extra content
  const basePercentage = isSmallScreen ? 0.60 : 0.45;
  const aiExtraSpace = isAIQuote ? 0.08 : 0;
  const percentage = `${(basePercentage + aiExtraSpace) * 100}%`;

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  useEffect(() => {
    // Reset AI toggle when modal closes
    if (!isVisible) {
      setIsAIQuote(false);
    }
  }, [isVisible]);


  return (
    <Modal isVisible={isVisible} animationIn="slideInLeft" animationOut="slideOutRight">
      <View style={{ height: percentage }}>
        <View style={modalStyles.modalContent}>
          <Text style={modalStyles.modalTitle}>
            { isEditing ? t('common:editQuoteTitle') : t('common:addQuoteTitle')}
          </Text>
          <View
            style={{
              borderBottomColor: '#E0E0E0',
              borderBottomWidth: 1,
              marginBottom: 20,
              marginTop: 10,
            }}
          />
          
          {/* AI Quote Toggle */}
          <View style={modalStyles.aiToggleContainer}>
            <Text style={modalStyles.aiToggleLabel}>
              {t('common:aiGeneratedQuote')} ✨
            </Text>
            <Switch
              value={isAIQuote}
              onValueChange={setIsAIQuote}
              trackColor={{ false: "#767577", true: "#F3BB3E" }}
              thumbColor={isAIQuote ? "#FFF" : "#f4f3f4"}
            />
          </View>

          {/* Conditional message when AI is selected */}
          {isAIQuote && (
            <Text style={modalStyles.aiInfoText}>
              {t('common:aiQuoteInfo')}
            </Text>
          )}

          <TextInput
            style={[modalStyles.modalInput, isAIQuote && modalStyles.modalInputDisabled]}
            value={isAIQuote ? '' : inputText}
            onChangeText={setInputText}
            multiline={true}
            placeholder={isAIQuote ? t('common:aiWillGenerate') : t('common:enterYourQuote')}
            blurOnSubmit={true}
            editable={!isAIQuote}
          />
          
          <TextInput
            style={[modalStyles.authorInput, isAIQuote && modalStyles.modalInputDisabled]}
            value={isAIQuote ? '' : inputAuthor}
            onChangeText={setInputAuthor}
            placeholder={isAIQuote ? '' : (t('common:authorOptional') || 'Author (optional)')}
            blurOnSubmit={true}
            editable={!isAIQuote}
          />
          <View style={modalStyles.modalButtonsContainer}>
            <View style={modalStyles.buttonWrapper}>
              <StatusImageItemButton onPress={() => handleAddItem(isAIQuote)}
                activeImagePath={require('../assets/images/modal_add_button_active.png')}
                normalImagePath={require('../assets/images/modal_add_button_normal.png')}
                buttonText={ isEditing ? t('common:editButtonText') : t('common:addButtonText')}
                imageWidth={100}
                buttonTextColor={"#221F20"}
              />
            </View>
            <View style={{flex: 0.25}}></View>
            <View style={modalStyles.buttonWrapper}>
              <StatusImageItemButton onPress={() => toggleModal(null, true)}
                activeImagePath={require('../assets/images/modal_cancel_button_active.png')}
                normalImagePath={require('../assets/images/modal_cancel_button_normal.png')}
                buttonText={t('common:cancelButtonText')}
                imageWidth={100}
                buttonTextColor={"#ffffff"}
              />
            </View>

          </View>
        </View>
      </View>
    </Modal>
  );
};



const modalStyles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 5,
    padding: '5%',
    width: '100%',
    height: '100%',
    justifyContent: 'space-between',
  },
  modalInput: {
    flex: 1,
    borderColor: '#817373',
    borderWidth: 1,
    borderRadius: 5,
    padding: '3%',
    textAlignVertical: 'top',
    minHeight: 80,
    maxHeight: 80,
  },
  authorInput: {
    borderColor: '#817373',
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginTop: 12,
    fontSize: 14,
  },
  modalInputDisabled: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  aiToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 16,
  },
  aiToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  aiInfoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 7,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: '1%',
    textAlign: 'center',
  },
  buttonWrapper: {
    flex: 1,
  },
});

export default AddQuoteModal;

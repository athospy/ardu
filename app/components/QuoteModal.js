import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, TouchableOpacity, Alert } from 'react-native';
import ViewShot from 'react-native-view-shot';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';
import { useTranslation } from 'react-i18next';
import { useFonts } from 'expo-font';
import Modal from 'react-native-modal';
import * as Haptics from 'expo-haptics';
import { quoteService } from '../src/api/services/quoteService';
import { useAuthStore } from '../src/store/authStore';


const QuoteModal = ({ isVisible, toggleModal, selectedQuote, onFavoriteToggle, onRequestReflection }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuthStore();
  const viewShotRef = useRef(null);
  const screenHeight = Dimensions.get('window').height;
  const isSmallScreen = screenHeight < 700;
  const percentage = isSmallScreen ? '65%' : '50%';

  // Fixed style - no customization
  const bgColor = '#F3BB3E';
  const fontStyle = 'satisfy';
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  // Update favorite status when quote changes
  useEffect(() => {
    if (selectedQuote && typeof selectedQuote === 'object') {
      setIsFavorite(selectedQuote.isFavorite || false);
    }
  }, [selectedQuote]);



  const [fontsLoaded] = useFonts({
    'satisfy': require('../assets/fonts/Satisfy/Satisfy-Regular.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  // Calculate font size based on quote length
  const getQuoteFontSize = () => {
    if (!selectedQuote) return 24; // Default size if no quote
    const quoteText = typeof selectedQuote === 'object' ? selectedQuote.text : selectedQuote;
    const length = quoteText?.length || 0;
    if (length < 50) return 28;
    if (length < 100) return 24;
    if (length < 150) return 20;
    return 18;
  };

  // Toggle favorite status
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      Alert.alert(
        t('common:loginRequired') || 'Login Required',
        t('common:loginRequiredMessage') || 'Please login to mark quotes as favorites',
        [{ text: 'OK' }]
      );
      return;
    }

    if (!selectedQuote?.id) {
      console.warn('No quote ID available');
      return;
    }

    setIsTogglingFavorite(true);
    try {
      await quoteService.toggleFavorite(selectedQuote.id);
      const newFavoriteStatus = !isFavorite;
      setIsFavorite(newFavoriteStatus);
      
      // Notify parent component to update the quote list
      if (onFavoriteToggle) {
        onFavoriteToggle(selectedQuote.id, newFavoriteStatus);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert(
        t('common:error') || 'Error',
        t('common:favoriteError') || 'Failed to update favorite status',
        [{ text: 'OK' }]
      );
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const shareQuote = async () => {
    await captureQuoteImage();
  };

  const captureQuoteImage = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      
      const tempFilePath = `${RNFS.CachesDirectoryPath}/quote-${Date.now()}.jpg`;
      await RNFS.copyFile(uri, tempFilePath);
      
      const quoteText = typeof selectedQuote === 'object' ? selectedQuote.text : selectedQuote;
      const shareOptions = {
        url: `file://${tempFilePath}`,
        type: 'image/jpeg',
        title: 'Share Quote',
        subject: 'Motivation for Today',
        message: `"${quoteText}" — shared from RandomWisdomApp`,
      };
      
      await Share.open(shareOptions);
      
      setTimeout(async () => {
        try {
          await RNFS.unlink(tempFilePath);
        } catch (e) {
          console.log('Error cleaning up temp file:', e);
        }
      }, 2000);
    } catch (error) {
      if (error.message !== 'User did not share') {
        console.log('Error sharing quote:', error.message);
      }
    }
  };


  return (
    <Modal 
      isVisible={isVisible} 
      animationIn="zoomIn" 
      animationOut="zoomOut"
      backdropOpacity={0.5}
    >
      <View style={[modalStyles.modalContainer, {height: percentage}]}>
        <View style={modalStyles.quoteDialogContainer}>
          
          {/* Share Card */}
          <ViewShot 
            ref={viewShotRef} 
            options={{ format: "jpg", quality: 1 }} 
            style={modalStyles.cardShot}
          >
            <View style={[modalStyles.cardBackground, { backgroundColor: bgColor }]}>
              <Image 
                source={require('../assets/images/icono.png')} 
                style={modalStyles.cardLogo} 
              />

              <Text 
                style={[
                  modalStyles.cardQuote,
                  { 
                    fontFamily: fontStyle,
                    fontSize: getQuoteFontSize(),
                  }
                ]}
                numberOfLines={8}
                adjustsFontSizeToFit
              >
                "{typeof selectedQuote === 'object' ? selectedQuote?.text || '' : selectedQuote || ''}"
              </Text>

              <Text style={modalStyles.cardFooter}>@arduApp</Text>
            </View>
          </ViewShot>

          {/* Favorite Button - Only show for authenticated users */}
          {isAuthenticated && (
            <TouchableOpacity 
              style={modalStyles.favoriteButton}
              onPress={handleToggleFavorite}
              disabled={isTogglingFavorite}
            >
              <Text style={modalStyles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
              <Text style={modalStyles.favoriteText}>
                {isFavorite ? t('common:favorited') || 'Favorited' : t('common:addToFavorites') || 'Add to Favorites'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Action Buttons */}
          <View style={modalStyles.actionRow}>
            {/* Share Button */}
            <TouchableOpacity 
              style={modalStyles.shareButton}
              onPress={() => {
                Haptics.selectionAsync();
                shareQuote();
              }}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.shareButtonText}>📤 {t('common:shareButtonText')}</Text>
            </TouchableOpacity>

            {/* Reflection Button - Only for authenticated users */}
            {isAuthenticated && onRequestReflection && (
              <TouchableOpacity 
                style={modalStyles.reflectionButton}
                onPress={() => {
                  Haptics.selectionAsync();
                  toggleModal();
                  setTimeout(() => {
                    onRequestReflection(selectedQuote);
                  }, 500);
                }}
                activeOpacity={0.8}
              >
                <Text style={modalStyles.reflectionButtonText}>✍️ {t('common:addReflection') || 'Add Reflection'}</Text>
              </TouchableOpacity>
            )}

            {/* Close Button */}
            <TouchableOpacity 
              style={modalStyles.cancelButton}
              onPress={() => {
                Haptics.selectionAsync();
                toggleModal();
              }}
              activeOpacity={0.8}
            >
              <Text style={modalStyles.cancelButtonText}>✖ {t('common:close') || 'Close'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}



const modalStyles = StyleSheet.create({
  modalContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteDialogContainer: {
    backgroundColor: '#2C2C2C',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Customization Bar
  customizationBar: {
    marginBottom: 15,
  },
  colorOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 10,
  },
  colorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    borderColor: '#FFF',
    borderWidth: 3,
  },
  fontOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  fontButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#444',
  },
  selectedFontButton: {
    backgroundColor: '#F3BB3E',
  },
  fontButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Share Card Styles
  cardShot: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
  },
  cardBackground: {
    paddingVertical: 50,
    paddingHorizontal: 25,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  cardLogo: {
    height: 60,
    width: 60,
    resizeMode: 'contain',
    marginBottom: 30,
  },
  cardQuote: {
    textAlign: 'center',
    marginVertical: 20,
    lineHeight: 36,
    color: '#221F20',
  },
  cardFooter: {
    fontSize: 14,
    marginTop: 25,
    opacity: 0.7,
    fontFamily: 'System',
    color: '#221F20',
    fontWeight: '600',
  },

  // Favorite Button
  favoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A3A3A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 15,
  },
  favoriteIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  favoriteText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 10,
  },

  shareButton: {
    backgroundColor: '#F3BB3E',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },

  shareButtonText: {
    color: '#222',
    fontSize: 16,
    fontWeight: '700',
  },

  reflectionButton: {
    backgroundColor: '#9B59B6',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
    elevation: 4,
  },

  reflectionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },

  cancelButton: {
    backgroundColor: '#444',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QuoteModal;
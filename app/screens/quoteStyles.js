import { Dimensions, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { BannerAd } from 'react-native-google-mobile-ads';

const screenHeight = Dimensions.get('window').height;

export const quoteStyles = () => {
  const [fontsLoaded] = useFonts({
    'poppins': require('../assets/fonts/poppins/Poppins-Regular.ttf'),
  });
  
  // console.log("screenHeight", screenHeight)
  const isSmallScreen = screenHeight < 700;
  const percentage = isSmallScreen ? 0.5 : 0.53;

  // Check if the fonts have finished loading
  if (!fontsLoaded) {
    // Return a fallback or loading style
    return {
      loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      },
      loadingText: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    };
  }

  // Fonts are loaded, return the actual styles
  return StyleSheet.create({
    container: {
      width: '100%',
      height: '100%',
      fontFamily: 'poppins',
      backgroundColor: '#f5f5f5', // Set the background color here
    },
    itemsContainer: {
      //maxHeight: '61%',
      maxHeight: screenHeight * percentage,
      marginBottom: 5,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      fontSize: 24,
      paddingHorizontal: 15,
      paddingVertical: 7,
      borderBottomWidth: 1,
      borderBottomColor: '#ccc',
    },
    itemTextContainer: {
      flex: 1,
      marginHorizontal: 10,
    },
    itemText: {
      fontSize: 18,
      color: '#605A5C',
    },
    logoApp: {
      alignSelf: 'center',
      resizeMode: 'contain',
      height: '12%',
    },
    loginBanner: {
      backgroundColor: '#FFF',
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 12,
      padding: 16,
      borderRadius: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderLeftWidth: 4,
      borderLeftColor: '#F3BB3E',
    },
    loginBannerText: {
      fontSize: 14,
      color: '#666',
      lineHeight: 20,
      fontFamily: 'poppins',
      marginBottom: 12,
    },
    loginBannerButton: {
      backgroundColor: '#F3BB3E',
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 10,
      alignItems: 'center',
    },
    loginBannerButtonText: {
      color: '#211F1F',
      fontSize: 16,
      fontWeight: 'bold',
      fontFamily: 'poppins',
    },
    // AI Quote Styles
    aiPendingContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 12,
    },
    aiPendingIcon: {
      fontSize: 20,
      marginRight: 8,
      marginTop: 2,
    },
    aiPendingTextContainer: {
      flex: 1,
    },
    aiPendingText: {
      fontSize: 14,
      color: '#888',
      fontStyle: 'italic',
      fontFamily: 'poppins',
      marginBottom: 8,
    },
    aiPlaceholderShimmer: {
      marginTop: 4,
    },
    shimmerLine: {
      height: 12,
      backgroundColor: '#E8E8E8',
      borderRadius: 6,
      marginBottom: 6,
      width: '100%',
    },
    shimmerLineShort: {
      width: '75%',
    },
    aiBadge: {
      position: 'absolute',
      top: 8,
      right: 60,
      backgroundColor: '#9B59B6',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    aiBadgeText: {
      color: '#FFF',
      fontSize: 10,
      fontWeight: '700',
    },
    authorText: {
      fontSize: 14,
      color: '#555',
      marginTop: 4,
      fontStyle: 'italic',
    },
    // Dashboard Styles
    dashboardContainer: {
      flex: 1,
    },
    dashboardContent: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#211F1F',
      marginBottom: 12,
      fontFamily: 'poppins',
    },
    requestBoostButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F3BB3E',
      borderRadius: 16,
      padding: 20,
      marginTop: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 5,
    },
    requestBoostIcon: {
      fontSize: 24,
      marginRight: 12,
    },
    requestBoostText: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#211F1F',
      fontFamily: 'poppins',
    },
    loadingText: {
      fontSize: 16,
      color: '#666',
      textAlign: 'center',
      marginTop: 32,
      fontFamily: 'poppins',
    },
    bannerAd: {
      marginTop: 5,
    },
  });
};

import React, { useRef, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Image, Text } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

const SplashScreen = ({ onFinish }) => {
  const videoRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  const handleStatusUpdate = (status) => {
    if (status.isLoaded) {
      setIsLoading(false);
    }

    if (status.didJustFinish && onFinish) {
      onFinish();
    }
  };

  if (videoError) {
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/images/splash.png')}
          style={styles.video}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={require('../assets/images/splash-video.mp4')}
        style={styles.video}
        resizeMode={ResizeMode.COVER}
        shouldPlay
        isMuted
        isLooping={false}
        onPlaybackStatusUpdate={handleStatusUpdate}
        onError={() => setVideoError(true)}
      />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F3BB3E" />
        </View>
      )}
      
      <View style={styles.loadingTextContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingTextContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  loadingText: {
    color: '#F3BB3E',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
});

export default SplashScreen;

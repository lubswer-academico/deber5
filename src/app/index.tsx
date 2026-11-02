import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionController } from '@/presentation/session/useSessionController';

export default function IndexScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/principal');
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0D47A1" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
  },
});

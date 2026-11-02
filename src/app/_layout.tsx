import '../../global.css';
import { StatusBar } from 'react-native';
import { Stack } from 'expo-router';
import { useFonts, Limelight_400Regular } from '@expo-google-fonts/limelight';
import { KaushanScript_400Regular } from '@expo-google-fonts/kaushan-script';
import { useSyncEngine } from '@/presentation/sync/useSyncEngine';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Limelight_400Regular,
    KaushanScript_400Regular,
  });

  useSyncEngine();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent={true}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      />
    </>
  );
}

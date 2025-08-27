import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';

// Basic PDF417 parser placeholder: Different regions encode differently.
// We attempt to extract common fields with regex heuristics.
const parsePdf417 = (raw: string) => {
  const result: any = {};
  // License number: look for DL/LIC markers or alphanumeric lines of length 6-16
  const licMatch = raw.match(/\b([A-Z]{1,3}-?\d{4,12}|[A-Z0-9]{6,16})\b/);
  if (licMatch) result.licenseNumber = licMatch[1];

  // Expiry date patterns: YYYYMMDD or YYYY-MM-DD
  const expiryMatch = raw.match(/(20\d{2})[-\/]?(0[1-9]|1[0-2])[-\/]?(0[1-9]|[12]\d|3[01])/);
  if (expiryMatch) {
    const yyyy = expiryMatch[1]; const mm = expiryMatch[2]; const dd = expiryMatch[3];
    result.expiryDate = `${yyyy}-${mm}-${dd}`;
  }

  // Issuing authority: look for DMV/RTO/STATE words
  const authMatch = raw.match(/(DMV|RTO|TRANSPORT|STATE|GOVT)[^\n]{0,20}/i);
  if (authMatch) result.issuingAuthority = authMatch[0];

  return result;
};

const ScanLicenseScreen: React.FC = () => {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);

  useEffect(() => {
    (async () => {
      if (!permission || !permission.granted) {
        await requestPermission();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!scanning) return;
    setScanning(false);

    // Only process PDF417; otherwise still try to parse text
    const parsed = parsePdf417(data || '');
    if (!parsed.licenseNumber && !parsed.expiryDate) {
      Alert.alert('Scan captured', 'Could not auto-parse fields. You can still fill them manually.', [
        { text: 'OK', onPress: () => navigation.goBack() as any },
      ]);
      return;
    }

    // Navigate back to DriverVerification with scanResult
    // Ensure the screen name matches the one in App.tsx
    // @ts-ignore
    navigation.navigate('DriverVerification', { scanResult: parsed });
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.container}> 
        <ActivityIndicator color="#4CE5B1" />
      </SafeAreaView>
    );
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}> 
        <Text style={styles.text}>Camera permission denied.</Text>
        <Text style={styles.textSub}>Enable camera access in settings to scan your license.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan Driver's License</Text>
        <Text style={styles.subtitle}>Align the barcode or the license within the frame.</Text>
      </View>
      <View style={styles.scannerBox}>
        {typeof (CameraView as unknown) === 'function' ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{ barcodeTypes: ['pdf417', 'qr'] }}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}> 
            <Text style={styles.text}>Camera module not available.</Text>
            <Text style={styles.textSub}>Update Expo Go or use a Dev Client (npx expo run:android / run:ios), then reload.</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  header: {
    padding: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
  },
  subtitle: {
    color: '#A0A0A0',
    fontSize: 14,
    marginTop: 4,
  },
  scannerBox: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    margin: 16,
    backgroundColor: '#000',
  },
  cancelBtn: {
    margin: 16,
    padding: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  cancelText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  text: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 16,
  },
  textSub: {
    color: '#A0A0A0',
    textAlign: 'center',
    marginTop: 8,
  },
});

export default ScanLicenseScreen;

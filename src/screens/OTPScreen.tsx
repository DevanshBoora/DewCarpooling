import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { AuthStackParamList } from '../types/navigation';
import { useAuth } from '../context/AuthContext';

const OTPScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<AuthStackParamList, 'OTP'>>();
  const { email } = route.params;
  const { loginWithEmailOtp } = useAuth();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  const code = useMemo(() => digits.join(''), [digits]);

  const onChangeDigit = (index: number, value: string) => {
    if (/\d?/.test(value)) {
      const newDigits = [...digits];
      newDigits[index] = value;
      setDigits(newDigits);
      if (value && index < 5) {
        inputsRef.current[index + 1]?.focus();
      }
    }
  };

  const onKeyPress = (index: number, key: string) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const verify = async () => {
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }
    try {
      setLoading(true);
      await loginWithEmailOtp(email, code);
      // navigation will switch to app via auth state
    } catch (err: any) {
      const msg = err?.message || 'Verification failed';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter OTP</Text>
      <Text style={styles.subtitle}>We sent a 6-digit code to {email}</Text>
      <View style={styles.otpRow}>
        {digits.map((d, idx) => (
          <TextInput
            key={idx}
            ref={(el) => {
              inputsRef.current[idx] = el;
            }}
            style={styles.otpBox}
            keyboardType="number-pad"
            maxLength={1}
            value={d}
            onChangeText={(v) => onChangeDigit(idx, v.replace(/\D/g, ''))}
            onKeyPress={({ nativeEvent }) => onKeyPress(idx, nativeEvent.key)}
            autoFocus={idx === 0}
          />
        ))}
      </View>

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={verify} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Verifying...' : 'Verify & Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.link}>Edit email</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    color: '#bbb',
    marginBottom: 24,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  otpBox: {
    width: 48,
    height: 56,
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#3c7d68',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 10,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  link: {
    marginTop: 20,
    color: '#3c7d68',
    fontSize: 16,
  },
});

export default OTPScreen;

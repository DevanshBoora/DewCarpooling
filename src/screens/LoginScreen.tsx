import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { sendEmailOtp } from '../api/authService';
import { ApiError } from '../api/client';

const LoginScreen: React.FC<any> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});

  const sendCode = async () => {
    const e: typeof errors = {};
    const value = String(email).trim().toLowerCase();
    if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(value)) {
      e.email = 'Enter a valid email address';
    }
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    try {
      setLoading(true);
      const resp = await sendEmailOtp({ email: value });
      // For dev, show code if provided (our api client returns the parsed body directly)
      if ((resp as any)?.devOtp) {
        Alert.alert('Dev OTP', String((resp as any).devOtp));
      }
      navigation.navigate('OTP', { email: value });
    } catch (err: any) {
      const apiErr = err as ApiError;
      const msg = (apiErr?.data?.message) || apiErr?.message || 'Failed to send code';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login with Email</Text>
      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={sendCode} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Sending...' : 'Send OTP'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.link}>Need to complete profile? Continue</Text>
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
    marginBottom: 40,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  errorText: {
    width: '100%',
    color: '#ff6b6b',
    marginBottom: 12,
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

export default LoginScreen;

import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../types/navigation';
import { api } from '../api/client';
import { getMe, updateUserProfile } from '../api/userService';

type Props = StackScreenProps<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [communities, setCommunities] = useState<Array<{ _id: string; name?: string }>>([]);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>(() => ({}));
  const { register, refreshMe } = useAuth();
  const [showCommunityPicker, setShowCommunityPicker] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<Array<{ _id: string; name?: string }>>('/api/communities');
        setCommunities(list || []);
        // Prefer Gauthami Enclave if available; otherwise first
        const preferred = (list || []).find(c => (c.name || '').toLowerCase().includes('gauthami enclave')) || (list || [])[0];
        if (preferred?._id) setCommunityId(preferred._id);
      } catch {
        setCommunities([]);
        setCommunityId(null);
      }
    })();
  }, []);

  const handleRegister = async () => {
    const localErrors: { name?: string; email?: string; password?: string } = {};
    const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
    const strongPwd = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!name || name.trim().length < 2) localErrors.name = 'Name must be at least 2 characters';
    if (!email || !emailRegex.test(email)) localErrors.email = 'Email is invalid';
    if (!password) localErrors.password = 'Password is required';
    else if (!strongPwd.test(password)) localErrors.password = 'Password must be at least 8 characters and include letters and numbers';
    if (Object.keys(localErrors).length) {
      setErrors(localErrors);
      return;
    }
    try {
      setLoading(true);
      setErrors({});
      await register(name, email, password);
      // After successful auth, set the user's community if selected
      try {
        const me = await getMe(0);
        if (me?._id && communityId) {
          await updateUserProfile(me._id, { community: communityId } as any);
          await refreshMe();
        }
      } catch {}
    } catch (error: any) {
      if (error?.status === 422 && error?.data?.errors) {
        setErrors(error.data.errors);
      } else if (error?.status === 409) {
        setErrors({ email: 'Email already in use' });
      } else {
        const msg = error?.message || 'An error occurred.';
        Alert.alert('Registration Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      <TextInput
        style={[styles.input, errors.name && styles.inputError]}
        placeholder="Full Name"
        placeholderTextColor="#888"
        value={name}
        onChangeText={(t) => {
          setName(t);
          if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
        }}
        editable={!loading}
      />
      {!!errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        placeholder="Email"
        placeholderTextColor="#888"
        value={email}
        onChangeText={(t) => {
          setEmail(t);
          if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      {!!errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        placeholder="Password"
        placeholderTextColor="#888"
        value={password}
        onChangeText={(t) => {
          setPassword(t);
          if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
        }}
        secureTextEntry
        editable={!loading}
      />
      {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      {/* Community selection */}
      <View style={[styles.input, { paddingVertical: 12 }]}> 
        <Text style={{ color: '#aaa', marginBottom: 6 }}>Community</Text>
        <TouchableOpacity
          onPress={() => setShowCommunityPicker(v => !v)}
          disabled={loading}
        >
          <Text style={{ color: '#fff', fontSize: 16 }}>
            {communities.find(c => c._id === communityId)?.name || 'Gauthami Enclave'}
          </Text>
        </TouchableOpacity>
        {showCommunityPicker && communities.length > 1 && (
          <View style={{ marginTop: 10, gap: 8 }}>
            {communities.map(c => (
              <TouchableOpacity
                key={c._id}
                style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#444' }}
                onPress={() => { setCommunityId(c._id); setShowCommunityPicker(false); }}
                disabled={loading}
              >
                <Text style={{ color: c._id === communityId ? '#4CE5B1' : '#fff', fontSize: 15 }}>
                  {c.name || 'Community'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
      <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleRegister} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing up...' : 'Sign Up'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Log In</Text>
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

export default RegisterScreen;

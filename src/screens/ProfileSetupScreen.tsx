import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function ProfileSetupScreen() {
  const { user, completeProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const handleAutoAvatar = () => {
    const seed = encodeURIComponent(name || 'User');
    setAvatar(`https://api.dicebear.com/8.x/initials/svg?seed=${seed}`);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name to continue.');
      return;
    }
    try {
      setSubmitting(true);
      let avatarField = avatar.trim();
      if (avatarField && avatarField.startsWith('data:')) {
        // Upload inline image to backend and use returned fileId
        const uploaded = await api.post<{ fileId: string }>(`/api/files`, { data: avatarField });
        avatarField = uploaded.fileId;
      }
      await completeProfile(name.trim(), avatarField);
      // RootNavigator will automatically route to the app when needsProfile becomes false
    } catch (e: any) {
      Alert.alert('Update failed', e?.message || 'Could not complete profile');
    } finally {
      setSubmitting(false);
    }
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };

  const requestLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const chooseFromLibrary = async () => {
    const granted = await requestLibraryPermission();
    if (!granted) {
      Alert.alert('Permission needed', 'We need access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0] as any;
      const mime = asset?.mimeType || 'image/jpeg';
      const dataUrl = asset?.base64 ? `data:${mime};base64,${asset.base64}` : asset?.uri;
      if (dataUrl) setAvatar(dataUrl);
    }
  };

  const takePhoto = async () => {
    const granted = await requestCameraPermission();
    if (!granted) {
      Alert.alert('Permission needed', 'We need access to your camera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0] as any;
      const mime = asset?.mimeType || 'image/jpeg';
      const dataUrl = asset?.base64 ? `data:${mime};base64,${asset.base64}` : asset?.uri;
      if (dataUrl) setAvatar(dataUrl);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>Complete your profile</Text>
        <Text style={styles.subtitle}>Add your name and a photo. You can change these later.</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor="#888"
          style={styles.input}
          autoFocus
        />

        <Text style={styles.label}>Photo (optional)</Text>
        {avatar ? (
          <View style={{ alignItems: 'center', marginTop: 6 }}>
            <Image source={{ uri: avatar }} style={styles.avatarPreview} />
          </View>
        ) : null}
        <View style={styles.rowButtons}>
          <TouchableOpacity onPress={takePhoto} style={styles.pickButton} disabled={submitting}>
            <Ionicons name="camera" size={16} color="#fff" />
            <Text style={styles.pickButtonText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={chooseFromLibrary} style={styles.pickButton} disabled={submitting}>
            <Ionicons name="images-outline" size={16} color="#fff" />
            <Text style={styles.pickButtonText}>Choose from Photos</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleAutoAvatar} style={styles.linkButton}>
          <Text style={styles.linkText}>Use auto-generated initials avatar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#000" /> : <Text style={styles.primaryText}>Continue</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: {
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#aaa',
    marginBottom: 16,
  },
  label: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#111',
    borderColor: '#222',
    borderWidth: 1,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 6,
  },
  avatarPreview: { width: 96, height: 96, borderRadius: 48, backgroundColor: '#111' },
  rowButtons: { flexDirection: 'row', gap: 8, marginTop: 8 },
  pickButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3c7d68', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  pickButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  linkButton: {
    marginTop: -6,
    marginBottom: 8,
  },
  linkText: {
    color: '#3c7d68',
  },
  primaryBtn: {
    backgroundColor: '#3c7d68',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
});

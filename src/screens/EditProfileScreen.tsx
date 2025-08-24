import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { updateUserProfile } from '../api/userService';
import { api } from '../api/client';
import { BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'EditProfile'>>();
  const { user, refreshMe } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  // Derived preview URL if avatar is GridFS fileId
  const previewUri = React.useMemo(() => {
    if (!avatar) return '';
    if (avatar.startsWith('data:') || avatar.startsWith('http')) return avatar;
    // assume it's a GridFS fileId
    return `${BASE_URL}/api/files/${avatar}`;
  }, [avatar]);
  const [errors, setErrors] = useState<{ name?: string; general?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName(user?.name || '');
    setAvatar(user?.avatar || '');
  }, [user]);

  const validate = () => {
    const next: typeof errors = {};
    if (!name.trim()) next.name = 'Name is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need access to your photo library to select an avatar.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        // Using MediaTypeOptions for compatibility with installed version
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
    } catch (e: any) {
      Alert.alert('Image Picker Error', e?.message || 'Unable to open photo library');
    }
  };

  const onSave = async () => {
    if (submitting) return;
    if (!validate()) return;
    setSubmitting(true);
    setErrors({});
    try {
      const id = user?._id;
      if (!id) throw new Error('Missing user id');
      let avatarField: string | undefined = undefined;
      if (avatar) {
        if (avatar.startsWith('data:')) {
          // Upload to GridFS and use returned fileId
          const uploaded = await api.post<{ fileId: string }>(`/api/files`, { data: avatar });
          avatarField = uploaded.fileId;
        } else if (avatar.startsWith('http')) {
          // Keep as-is if already URL (unlikely in new flow)
          avatarField = avatar.trim();
        } else {
          // Presume it's already a GridFS fileId
          avatarField = avatar.trim();
        }
      }
      await updateUserProfile(id, { name: name.trim(), ...(avatarField ? { avatar: avatarField } : {}) });
      await refreshMe();
      Alert.alert('Profile Updated', 'Your profile has been saved.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e?.message || 'Failed to update profile';
      setErrors(prev => ({ ...prev, general: msg }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.header}> 
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          {errors.general ? <Text style={styles.errorText}>{errors.general}</Text> : null}

          <View style={[styles.field, { alignItems: 'center' }]}>
            {avatar ? (
              <Image source={{ uri: previewUri }} style={styles.avatarPreview} />
            ) : (
              <View style={[styles.avatarPreview, { backgroundColor: '#1C1C1E', alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="person-circle-outline" size={56} color="#555" />
              </View>
            )}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#888"
              style={[styles.input, errors.name && styles.inputError]}
              editable={!submitting}
            />
            {errors.name ? <Text style={styles.inlineError}>{errors.name}</Text> : null}
          </View>

          {/* Email is immutable. Removed from Edit Profile. */}

          <View style={[styles.field, { alignItems: 'center' }]}>
            <TouchableOpacity style={styles.pickButton} onPress={pickImage} disabled={submitting}>
              <Ionicons name="images-outline" size={16} color="#fff" />
              <Text style={styles.pickButtonText}>Choose from Photos</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[styles.saveButton, submitting && styles.saveButtonDisabled]} onPress={onSave} disabled={submitting}>
            <Text style={styles.saveButtonText}>{submitting ? 'Saving...' : 'Save Changes'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  field: { marginBottom: 16 },
  label: { color: '#8E8E93', marginBottom: 6, fontSize: 12, textTransform: 'uppercase' },
  input: { backgroundColor: '#1C1C1E', color: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#1C1C1E' },
  inputError: { borderColor: '#ff6b6b' },
  inlineError: { color: '#ff6b6b', marginTop: 6, fontSize: 12 },
  errorText: { color: '#ff6b6b', marginBottom: 12 },
  avatarPreview: { width: 96, height: 96, borderRadius: 48, marginVertical: 8 },
  pickButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginTop: 8, backgroundColor: '#3c7d68', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  pickButtonText: { color: '#fff', marginLeft: 8, fontWeight: '600' },
  saveButton: { backgroundColor: '#3c7d68', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
});

export default EditProfileScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
  Image
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { uploadFile } from '../api/fileService';
import { submitDriverVerification } from '../api/driverVerificationService';
import { uploadLicenseImageAndParse } from '../api/ocrService';

type VerificationStep = 'photo' | 'license' | 'vehicle';

const { width } = Dimensions.get('window');

const steps = [
  { key: 'photo', title: 'Photo' },
  { key: 'license', title: 'License' },
  { key: 'vehicle', title: 'Vehicle' },
];

const DriverVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  // @ts-ignore - route params are loosely typed for simplicity here
  const route: any = useRoute();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [currentStep, setCurrentStep] = useState<VerificationStep>('photo');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [faceImageUri, setFaceImageUri] = useState<string>('');
  const [licenseImageUri, setLicenseImageUri] = useState<string>('');
  const [showIssueDatePicker, setShowIssueDatePicker] = useState(false);
  const progressAnim = new Animated.Value(0);

  // Simple Indian state/UT validation for issuing authority
  const IN_STATES_UT = [
    'ANDHRA PRADESH','ARUNACHAL PRADESH','ASSAM','BIHAR','CHHATTISGARH','GOA','GUJARAT','HARYANA','HIMACHAL PRADESH','JHARKHAND','KARNATAKA','KERALA','MADHYA PRADESH','MAHARASHTRA','MANIPUR','MEGHALAYA','MIZORAM','NAGALAND','ODISHA','PUNJAB','RAJASTHAN','SIKKIM','TAMIL NADU','TELANGANA','TRIPURA','UTTAR PRADESH','UTTARAKHAND','WEST BENGAL',
    'ANDAMAN AND NICOBAR','ANDAMAN & NICOBAR','CHANDIGARH','DADRA AND NAGAR HAVELI','DADRA & NAGAR HAVELI','DAMAN AND DIU','DAMAN & DIU','DELHI','JAMMU AND KASHMIR','JAMMU & KASHMIR','LADAKH','LAKSHADWEEP','PUDUCHERRY','PONDICHERRY'
  ];
  const isValidIndianStateInAuthority = (authority: string) => {
    const up = (authority || '').toUpperCase();
    return IN_STATES_UT.some(s => up.includes(s));
  };

  const titleCase = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  const cleanAuthority = (s: string) => s.replace(/[^A-Za-z\s\-]/g, ' ').replace(/\s{2,}/g, ' ').trim();
  const extractStateFromAuthority = (authority: string): string | undefined => {
    const up = (authority || '').toUpperCase();
    const match = IN_STATES_UT.find(s => up.includes(s));
    return match ? titleCase(match) : undefined;
  };

  const normalizeLicenseNumber = (value: string) => value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const normalizeDateToYMD = (input?: string): string => {
    if (!input) return '';
    const s = input.replace(/\./g, '-').replace(/\//g, '-').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
    if (m) {
      const dd = m[1].padStart(2, '0');
      const mm = m[2].padStart(2, '0');
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yyyy}-${mm}-${dd}`;
    }
    const d = new Date(input);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    return input;
  };

  const addYearsToYMD = (ymd: string, years: number): string => {
    // ymd: YYYY-MM-DD
    const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return ymd;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    d.setFullYear(d.getFullYear() + years);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Expanded form state to satisfy backend validation
  const [formData, setFormData] = useState({
    faceImageId: '',
    identityDocument: {
      type: 'drivers_license', // fixed; not shown in UI
      documentNumber: '',
      frontImageId: '',
      backImageId: '',
    },
    drivingLicense: {
      frontImageId: '',
      backImageId: '',
      licenseNumber: '',
      expiryDate: '', // YYYY-MM-DD
      issueDate: '', // YYYY-MM-DD
      issuingAuthority: '',
    },
    vehicle: {
      make: '',
      model: '',
      color: '',
      licensePlate: '',
    }
  });

  // Server OCR flow: choose Camera or Gallery, upload to backend OCR, and prefill fields
  const handleServerOcrPress = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        // Still allow gallery without camera permission
        return pickFromGalleryForOcr();
      }
      Alert.alert(
        'Scan License',
        'Choose how to provide the license photo',
        [
          { text: 'Camera', onPress: () => launchCameraForOcr() },
          { text: 'Gallery', onPress: () => pickFromGalleryForOcr() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch {}
  };

  const launchCameraForOcr = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        await runServerOcr(result.assets[0].uri);
      }
    } catch {}
  };

  const pickFromGalleryForOcr = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets[0]) {
        await runServerOcr(result.assets[0].uri);
      }
    } catch {}
  };

  const runServerOcr = async (uri: string) => {
    try {
      setOcrBusy(true);
      const { parsed, rawText } = await uploadLicenseImageAndParse(uri);

      // Fallbacks if parser missed fields
      let licenseFromOcr = (parsed as any).licenseNumber as string | undefined;
      if (!licenseFromOcr && rawText) {
        const textUp = rawText.toUpperCase();
        const candidates = Array.from(textUp.matchAll(/\b([A-Z]{2}[A-Z0-9\s-]{8,})\b/g)).map(m => m[1]);
        const normalized = candidates
          .map(c => c.replace(/[^A-Z0-9]/g, ''))
          .filter(c => /^[A-Z]{2}\d{8,}$/.test(c))
          .sort((a, b) => b.length - a.length);
        if (normalized[0]) licenseFromOcr = normalized[0];
      }

      let issue = normalizeDateToYMD((parsed as any).issueDate || (parsed as any).dateOfIssue || (parsed as any).doi);
      if (!issue && rawText) {
        const anyDate = rawText.match(/(\d{1,2}[\-\/.]\d{1,2}[\-\/.]\d{2,4})/);
        if (anyDate) issue = normalizeDateToYMD(anyDate[1]);
      }

      const expiry = normalizeDateToYMD((parsed as any).validityNT || (parsed as any).validityTR);
      const rawAuthority = (parsed as any).issuingAuthority || '';
      const cleanedAuthority = cleanAuthority(rawAuthority);
      const inferredState = extractStateFromAuthority(cleanedAuthority);
      setFormData(prev => ({
        ...prev,
        identityDocument: {
          ...prev.identityDocument,
          documentNumber: licenseFromOcr || prev.identityDocument.documentNumber,
        },
        drivingLicense: {
          ...prev.drivingLicense,
          licenseNumber: licenseFromOcr || prev.drivingLicense.licenseNumber,
          expiryDate: expiry || prev.drivingLicense.expiryDate,
          issueDate: issue || prev.drivingLicense.issueDate,
          issuingAuthority: inferredState || cleanedAuthority || prev.drivingLicense.issuingAuthority,
        },
      }));
      setLicenseImageUri(uri);
      Alert.alert('Scan complete', 'We filled detected fields and added a preview. Please review and edit if needed.');
    } catch (err: any) {
      Alert.alert('Scan failed', err?.message || 'Could not extract text from the image. Try a clearer photo.');
    } finally {
      setOcrBusy(false);
    }
  };

  useEffect(() => {
    const stepIndex = steps.findIndex(step => step.key === currentStep);
    Animated.timing(progressAnim, {
      toValue: (stepIndex + 1) / steps.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Merge scan results from ScanLicense screen
  useEffect(() => {
    if (route?.params?.scanResult) {
      const { scanResult } = route.params as { scanResult: { licenseNumber?: string; expiryDate?: string; issuingAuthority?: string; documentNumber?: string } };
      setFormData(prev => ({
        ...prev,
        identityDocument: {
          ...prev.identityDocument,
          documentNumber: scanResult.documentNumber || prev.identityDocument.documentNumber,
        },
        drivingLicense: {
          ...prev.drivingLicense,
          licenseNumber: scanResult.licenseNumber || prev.drivingLicense.licenseNumber,
          expiryDate: scanResult.expiryDate || prev.drivingLicense.expiryDate,
          issuingAuthority: scanResult.issuingAuthority || prev.drivingLicense.issuingAuthority,
        },
      }));
      // Clear param so it doesn't re-apply
      navigation.setParams?.({ scanResult: undefined } as any);
    }
  }, [route?.params?.scanResult]);

  const uploadImage = async (imageUri: string): Promise<string> => {
    try {
      setUploadingImage(true);
      const response = await uploadFile(imageUri);
      return response.fileId;
    } catch (error) {
      console.error('Upload failed:', error);
      Alert.alert('Upload Failed', 'Failed to upload image. Please try again.');
      throw error;
    } finally {
      setUploadingImage(false);
    }
  };

  const captureImage = async (type: 'face' | 'license-front' | 'license-back') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required to capture photos');
      return;
    }

    Alert.alert(
      'Add Photo',
      'How would you like to add your photo?',
      [
        { text: 'Camera', onPress: () => launchCamera(type) },
        { text: 'Gallery', onPress: () => launchGallery(type) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const launchCamera = async (type: 'face' | 'license-front' | 'license-back') => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'face' ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageSelected(result.assets[0].uri, type);
    }
  };

  const launchGallery = async (type: 'face' | 'license-front' | 'license-back') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'face' ? [1, 1] : [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await handleImageSelected(result.assets[0].uri, type);
    }
  };

  const handleImageSelected = async (uri: string, type: 'face' | 'license-front' | 'license-back') => {
    try {
      const fileId = await uploadImage(uri);
      
      if (type === 'face') {
        setFormData(prev => ({ ...prev, faceImageId: fileId }));
        setFaceImageUri(uri);
      } else if (type === 'license-front') {
        setFormData(prev => ({
          ...prev,
          // also store to identity doc images to maximize utility server-side if needed
          drivingLicense: { ...prev.drivingLicense, frontImageId: fileId },
          identityDocument: { ...prev.identityDocument, frontImageId: fileId }
        }));
        setLicenseImageUri(uri);
      } else if (type === 'license-back') {
        setFormData(prev => ({
          ...prev,
          drivingLicense: { ...prev.drivingLicense, backImageId: fileId },
          identityDocument: { ...prev.identityDocument, backImageId: fileId }
        }));
      }
    } catch (error) {
      // Error already handled in uploadImage
    }
  };

  const nextStep = () => {
    const stepOrder: VerificationStep[] = ['photo', 'license', 'vehicle'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const stepOrder: VerificationStep[] = ['photo', 'license', 'vehicle'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const canProceedFromStep = (step: VerificationStep): boolean => {
    switch (step) {
      case 'photo':
        return formData.faceImageId !== '';
      case 'license':
        return (
          formData.drivingLicense.licenseNumber.trim() !== '' &&
          formData.drivingLicense.issueDate.trim() !== '' &&
          formData.drivingLicense.issuingAuthority.trim() !== '' &&
          isValidIndianStateInAuthority(formData.drivingLicense.issuingAuthority)
        );
      case 'vehicle':
        return (
          formData.vehicle.make.trim() !== '' &&
          formData.vehicle.model.trim() !== '' &&
          formData.vehicle.color.trim() !== '' &&
          formData.vehicle.licensePlate.trim() !== ''
        );
      default:
        return false;
    }
  };

  const submitVerification = async () => {
    try {
      setSubmitting(true);
      
      // Build payload matching backend validation
      const licenseNumber = normalizeLicenseNumber(formData.drivingLicense.licenseNumber);
      const issuingAuthority = formData.drivingLicense.issuingAuthority.trim();
      const issueDateYMD = normalizeDateToYMD(formData.drivingLicense.issueDate.trim());
      const existingExpiryYMD = normalizeDateToYMD(formData.drivingLicense.expiryDate.trim());
      const expiryDate = existingExpiryYMD || (issueDateYMD ? addYearsToYMD(issueDateYMD, 10) : '');
      if (!expiryDate) {
        Alert.alert('Missing date', 'Please provide an Issue Date so we can validate your license.');
        setSubmitting(false);
        return;
      }
      const documentNumber = (formData.identityDocument.documentNumber || licenseNumber).trim();
      const submissionData = {
        identityDocument: {
          type: formData.identityDocument.type as 'passport' | 'drivers_license' | 'national_id',
          documentNumber,
          frontImageId: formData.identityDocument.frontImageId || undefined,
          backImageId: formData.identityDocument.backImageId || undefined,
        },
        drivingLicense: {
          licenseNumber,
          expiryDate,
          issuingAuthority,
          // map front image to license image if present
          imageId: formData.drivingLicense.frontImageId || undefined,
        },
        vehicle: {
          make: formData.vehicle.make,
          model: formData.vehicle.model,
          color: formData.vehicle.color,
          licensePlate: formData.vehicle.licensePlate,
        }
      };

      await submitDriverVerification(submissionData);
      Alert.alert('Success', 'Your verification has been submitted. We\'ll review it within 24-48 hours.');
      // Go back to previous screen after submit
      (navigation as any).goBack();
    } catch (error) {
      console.error('Submission failed:', error);
      Alert.alert('Submission Failed', 'Failed to submit verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderProgressBar = () => null;

  const renderWelcomeStep = () => null;

  const renderPhotoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>Profile Photo</Text>
      <Text style={styles.stepDescription}>Add a clear photo of yourself.</Text>
      
      <TouchableOpacity 
        style={styles.photoContainer}
        onPress={() => captureImage('face')}
        disabled={uploadingImage}
      >
        {faceImageUri ? (
          <Image source={{ uri: faceImageUri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.photoPlaceholderText}>
              {uploadingImage ? 'Uploading...' : 'Tap to add photo'}
            </Text>
            {uploadingImage && <ActivityIndicator size="small" color="#4CE5B1" style={{ marginTop: 10 }} />}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLicenseStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>Driver's License</Text>
      <Text style={styles.stepDescription}>Scan your license to auto-fill details. Then quickly review and edit if needed.</Text>

      {/* Actions row: Scan and Upload side-by-side */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
        <TouchableOpacity
          style={[styles.secondaryButton, { flex: 1 }]}
          onPress={handleServerOcrPress}
          disabled={ocrBusy}
        >
          {ocrBusy ? <ActivityIndicator size="small" color="#4CE5B1" /> : null}
          <Text style={styles.secondaryButtonText}>{ocrBusy ? 'Scanning...' : 'Scan License'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.secondaryButton, { flex: 1 }]}
          onPress={pickFromGalleryForOcr}
          disabled={ocrBusy}
        >
          <Text style={styles.secondaryButtonText}>Upload from Gallery</Text>
        </TouchableOpacity>
      </View>

      {/* Smaller preview for aesthetics */}
      {licenseImageUri ? (
        <Image source={{ uri: licenseImageUri }} style={{ width: width - 80, height: 180, borderRadius: 12, alignSelf: 'center', marginBottom: 8, resizeMode: 'cover' }} />
      ) : null}

      <View style={styles.formContainer}>

        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>License Number</Text>
            <TextInput
              style={styles.input}
              placeholder="DL1234567"
              placeholderTextColor="#666666"
              value={formData.drivingLicense.licenseNumber}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  drivingLicense: { ...prev.drivingLicense, licenseNumber: normalizeLicenseNumber(text) },
                }))
              }
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Issuing Authority</Text>
            <TextInput
              style={styles.input}
              placeholder="RTO / DMV"
              placeholderTextColor="#666666"
              value={formData.drivingLicense.issuingAuthority}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  drivingLicense: { 
                    ...prev.drivingLicense, 
                    issuingAuthority: extractStateFromAuthority(cleanAuthority(text)) || cleanAuthority(text)
                  },
                }))
              }
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
          <Text style={styles.inputLabel}>Issue Date (YYYY-MM-DD)</Text>
          <View style={{ position: 'relative' }}>
            <TextInput
              style={styles.input}
              placeholder="2024-03-15"
              placeholderTextColor="#666666"
              value={formData.drivingLicense.issueDate}
              onChangeText={(text) =>
                setFormData((prev) => ({
                  ...prev,
                  drivingLicense: { ...prev.drivingLicense, issueDate: text },
                }))
              }
              onEndEditing={(e) => {
                const value = normalizeDateToYMD(e.nativeEvent.text);
                setFormData(prev => ({
                  ...prev,
                  drivingLicense: { ...prev.drivingLicense, issueDate: value }
                }));
              }}
            />
            <TouchableOpacity
              style={styles.calendarButton}
              onPress={() => setShowIssueDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#4CE5B1" />
            </TouchableOpacity>
          </View>
          {showIssueDatePicker && (
            <DateTimePicker
              value={(formData.drivingLicense.issueDate && !isNaN(new Date(formData.drivingLicense.issueDate).getTime())) ? new Date(formData.drivingLicense.issueDate) : new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowIssueDatePicker(false);
                if (date) {
                  const yyyy = date.getFullYear();
                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                  const dd = String(date.getDate()).padStart(2, '0');
                  const ymd = `${yyyy}-${mm}-${dd}`;
                  setFormData(prev => ({
                    ...prev,
                    drivingLicense: { ...prev.drivingLicense, issueDate: ymd }
                  }));
                }
              }}
            />
          )}
        </View>
          <View style={styles.inputHalf} />
        </View>
      </View>
    </View>
  );

  const renderVehicleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>Vehicle</Text>
      <Text style={styles.stepDescription}>Enter your vehicle details.</Text>
      
      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Make</Text>
            <TextInput
              style={styles.input}
              placeholder="Toyota, Honda..."
              placeholderTextColor="#666666"
              value={formData.vehicle.make}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle, make: text }
              }))}
            />
          </View>
          
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Model</Text>
            <TextInput
              style={styles.input}
              placeholder="Camry, Civic..."
              placeholderTextColor="#666666"
              value={formData.vehicle.model}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle, model: text }
              }))}
            />
          </View>
        </View>
        
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Color</Text>
            <TextInput
              style={styles.input}
              placeholder="White, Black..."
              placeholderTextColor="#666666"
              value={formData.vehicle.color}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle, color: text }
              }))}
            />
          </View>
          
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>License Plate</Text>
            <TextInput
              style={styles.input}
              placeholder="ABC123"
              placeholderTextColor="#666666"
              value={formData.vehicle.licensePlate}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle, licensePlate: text.toUpperCase() }
              }))}
            />
          </View>
        </View>

        {/* Year and Insurance Expiry removed per simplified requirements */}
      </View>
    </View>
  );

  const renderReviewStep = () => null;

  const renderSubmittedStep = () => null;

  const renderStepContent = () => {
    switch (currentStep) {
      case 'photo':
        return renderPhotoStep();
      case 'license':
        return renderLicenseStep();
      case 'vehicle':
        return renderVehicleStep();
      default:
        return renderPhotoStep();
    }
  };

  const renderNavigationButtons = () => {
    return (
      <View style={styles.navigationContainer}>
        {currentStep !== 'photo' && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={prevStep}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canProceedFromStep(currentStep) && styles.primaryButtonDisabled
          ]}
          onPress={currentStep === 'vehicle' ? submitVerification : nextStep}
          disabled={!canProceedFromStep(currentStep) || submitting}
        >
          {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
            <Text style={styles.primaryButtonText}>
              {currentStep === 'vehicle' ? 'Submit' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CE5B1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16 }}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Verification</Text>
        <View style={styles.headerSpacer} />
      </View>

      {renderProgressBar()}

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {renderNavigationButtons()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 16,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#0A0A0A',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#1C1C1E',
    borderRadius: 2,
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CE5B1',
    borderRadius: 2,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    alignItems: 'center',
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepCircleActive: {
    backgroundColor: '#4CE5B1',
  },
  stepCircleCompleted: {
    backgroundColor: '#4CE5B1',
  },
  stepTitle: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
  },
  stepTitleActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  welcomeHeader: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  benefitText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 16,
  },
  processInfo: {
    backgroundColor: '#1C1C1E',
    padding: 24,
    borderRadius: 16,
  },
  processTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  processText: {
    fontSize: 16,
    color: '#CCCCCC',
    marginBottom: 8,
    textAlign: 'center',
  },
  processSubtext: {
    fontSize: 14,
    color: '#4CE5B1',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  stepHeader: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  photoPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CE5B1',
    borderStyle: 'dashed',
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#4CE5B1',
  },
  photoPlaceholderText: {
    color: '#CCCCCC',
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  photoPreviewText: {
    color: '#4CE5B1',
    marginTop: 12,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  licenseContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  licenseCard: {
    width: '48%',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  licenseCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  licensePlaceholder: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  licensePreview: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  licensePlaceholderText: {
    color: '#666666',
    marginTop: 8,
    fontSize: 14,
  },
  licensePreviewText: {
    color: '#4CE5B1',
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  uploadingContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  uploadingText: {
    color: '#4CE5B1',
    marginLeft: 8,
    fontSize: 16,
  },
  formContainer: {
    marginBottom: 30,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputHalf: {
    width: '48%',
  },
  inputLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  calendarButton: {
    position: 'absolute',
    right: 12,
    top: 14,
    padding: 4,
  },
  reviewContainer: {
    marginBottom: 30,
  },
  reviewSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  reviewSectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    flex: 1,
  },
  submitInfo: {
    backgroundColor: '#1C1C1E',
    padding: 20,
    borderRadius: 16,
  },
  submitInfoText: {
    color: '#CCCCCC',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  successContainer: {
    padding: 40,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: '#E0E0E0',
    textAlign: 'center',
    lineHeight: 22,
  },
  nextStepsContainer: {
    backgroundColor: '#1C1C1E',
    padding: 24,
    borderRadius: 16,
  },
  nextStepsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  nextStepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  nextStepEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  nextStepText: {
    color: '#CCCCCC',
    fontSize: 16,
    flex: 1,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#4CE5B1',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginLeft: 12,
  },
  primaryButtonDisabled: {
    backgroundColor: '#333333',
  },
  primaryButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CE5B1',
  },
  secondaryButtonText: {
    color: '#4CE5B1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default DriverVerificationScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { uploadFile } from '../api/fileService';
import { submitDriverVerification } from '../api/driverVerificationService';

type VerificationStep = 'welcome' | 'photo' | 'license' | 'vehicle' | 'review' | 'submitted';

const { width } = Dimensions.get('window');

const steps = [
  { key: 'photo', title: 'Photo', icon: 'camera-outline' },
  { key: 'license', title: 'License', icon: 'card-outline' },
  { key: 'vehicle', title: 'Vehicle', icon: 'car-outline' },
  { key: 'review', title: 'Review', icon: 'checkmark-circle-outline' }
];

const DriverVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<VerificationStep>('welcome');
  const [uploadingImage, setUploadingImage] = useState(false);
  const progressAnim = new Animated.Value(0);

  // Expanded form state to satisfy backend validation
  const [formData, setFormData] = useState({
    faceImageId: '',
    identityDocument: {
      type: 'drivers_license', // passport | drivers_license | national_id
      documentNumber: '',
      frontImageId: '',
      backImageId: '',
    },
    drivingLicense: {
      frontImageId: '',
      backImageId: '',
      licenseNumber: '',
      expiryDate: '', // YYYY-MM-DD
      issuingAuthority: '',
    },
    vehicle: {
      make: '',
      model: '',
      color: '',
      licensePlate: '',
      year: '', // keep as string in state; convert to number on submit
      insuranceExpiryDate: '', // YYYY-MM-DD
    }
  });

  useEffect(() => {
    if (currentStep !== 'welcome' && currentStep !== 'submitted') {
      const stepIndex = steps.findIndex(step => step.key === currentStep);
      Animated.timing(progressAnim, {
        toValue: (stepIndex + 1) / steps.length,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [currentStep]);

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
      } else if (type === 'license-front') {
        setFormData(prev => ({
          ...prev,
          // also store to identity doc images to maximize utility server-side if needed
          drivingLicense: { ...prev.drivingLicense, frontImageId: fileId },
          identityDocument: { ...prev.identityDocument, frontImageId: fileId }
        }));
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
    const stepOrder: VerificationStep[] = ['welcome', 'photo', 'license', 'vehicle', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const stepOrder: VerificationStep[] = ['welcome', 'photo', 'license', 'vehicle', 'review'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const canProceedFromStep = (step: VerificationStep): boolean => {
    switch (step) {
      case 'welcome':
        return true;
      case 'photo':
        return formData.faceImageId !== '';
      case 'license':
        return (
          formData.drivingLicense.frontImageId !== '' &&
          formData.drivingLicense.backImageId !== '' &&
          formData.identityDocument.type.trim() !== '' &&
          formData.identityDocument.documentNumber.trim() !== '' &&
          formData.drivingLicense.licenseNumber.trim() !== '' &&
          formData.drivingLicense.expiryDate.trim() !== '' &&
          formData.drivingLicense.issuingAuthority.trim() !== ''
        );
      case 'vehicle':
        return (
          formData.vehicle.make.trim() !== '' &&
          formData.vehicle.model.trim() !== '' &&
          formData.vehicle.color.trim() !== '' &&
          formData.vehicle.licensePlate.trim() !== '' &&
          formData.vehicle.year.trim() !== '' &&
          formData.vehicle.insuranceExpiryDate.trim() !== ''
        );
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const submitVerification = async () => {
    try {
      setSubmitting(true);
      
      // Build payload matching backend validation
      const submissionData = {
        identityDocument: {
          type: formData.identityDocument.type as 'passport' | 'drivers_license' | 'national_id',
          documentNumber: formData.identityDocument.documentNumber,
          frontImageId: formData.identityDocument.frontImageId || undefined,
          backImageId: formData.identityDocument.backImageId || undefined,
        },
        drivingLicense: {
          licenseNumber: formData.drivingLicense.licenseNumber,
          expiryDate: formData.drivingLicense.expiryDate,
          issuingAuthority: formData.drivingLicense.issuingAuthority,
          // map front image to license image if present
          imageId: formData.drivingLicense.frontImageId || undefined,
        },
        vehicle: {
          make: formData.vehicle.make,
          model: formData.vehicle.model,
          year: Math.max(parseInt(formData.vehicle.year || '0', 10) || 0, 0),
          color: formData.vehicle.color,
          licensePlate: formData.vehicle.licensePlate,
          insuranceExpiryDate: formData.vehicle.insuranceExpiryDate,
        }
      };

      await submitDriverVerification(submissionData);
      setCurrentStep('submitted');
      Alert.alert('Success!', 'Your verification has been submitted. We\'ll review it within 24-48 hours.');
    } catch (error) {
      console.error('Submission failed:', error);
      Alert.alert('Submission Failed', 'Failed to submit verification. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill,
            {
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]} 
        />
      </View>
      <View style={styles.stepIndicators}>
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          return (
            <View key={step.key} style={styles.stepIndicator}>
              <View style={[
                styles.stepCircle,
                isActive && styles.stepCircleActive,
                isCompleted && styles.stepCircleCompleted
              ]}>
                <Ionicons 
                  name={isCompleted ? 'checkmark' : step.icon as any} 
                  size={16} 
                  color={isActive || isCompleted ? '#FFFFFF' : '#666666'} 
                />
              </View>
              <Text style={[
                styles.stepTitle,
                isActive && styles.stepTitleActive
              ]}>
                {step.title}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderWelcomeStep = () => (
    <View style={styles.stepContainer}>
      <LinearGradient
        colors={['#4CE5B1', '#3c7d68']}
        style={styles.welcomeHeader}
      >
        <Ionicons name="car-sport" size={60} color="#FFFFFF" />
        <Text style={styles.welcomeTitle}>Become a Dew Driver! 🚗</Text>
        <Text style={styles.welcomeSubtitle}>
          Join our community of eco-conscious drivers and start earning while helping reduce carbon emissions.
        </Text>
      </LinearGradient>
      
      <View style={styles.benefitsContainer}>
        <Text style={styles.sectionTitle}>Why drive with us?</Text>
        
        <View style={styles.benefitItem}>
          <Ionicons name="cash-outline" size={24} color="#4CE5B1" />
          <Text style={styles.benefitText}>Earn money for each ride</Text>
        </View>
        
        <View style={styles.benefitItem}>
          <Ionicons name="leaf-outline" size={24} color="#4CE5B1" />
          <Text style={styles.benefitText}>Help save the environment</Text>
        </View>
        
        <View style={styles.benefitItem}>
          <Ionicons name="people-outline" size={24} color="#4CE5B1" />
          <Text style={styles.benefitText}>Meet amazing people</Text>
        </View>
      </View>

      <View style={styles.processInfo}>
        <Text style={styles.processTitle}>Quick 3-step process:</Text>
        <Text style={styles.processText}>📸 Take a quick selfie</Text>
        <Text style={styles.processText}>🆔 Snap your license (both sides)</Text>
        <Text style={styles.processText}>🚗 Add your car details</Text>
        <Text style={styles.processSubtext}>Takes less than 5 minutes!</Text>
      </View>
    </View>
  );

  const renderPhotoStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>📸 Quick Selfie</Text>
      <Text style={styles.stepDescription}>
        This will be your driver profile photo. Make sure you look friendly! 😊
      </Text>
      
      <TouchableOpacity 
        style={styles.photoContainer}
        onPress={() => captureImage('face')}
        disabled={uploadingImage}
      >
        {formData.faceImageId ? (
          <View style={styles.photoPreview}>
            <Ionicons name="checkmark-circle" size={50} color="#4CE5B1" />
            <Text style={styles.photoPreviewText}>Perfect! 🎉</Text>
          </View>
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={60} color="#666666" />
            <Text style={styles.photoPlaceholderText}>
              {uploadingImage ? 'Uploading...' : 'Tap to take photo'}
            </Text>
            {uploadingImage && <ActivityIndicator size="small" color="#4CE5B1" style={{ marginTop: 10 }} />}
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderLicenseStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>🆔 Driver's License</Text>
      <Text style={styles.stepDescription}>
        We need both sides for verification. Don't worry, your info is secure! 🔒
      </Text>
      
      <View style={styles.licenseContainer}>
        <TouchableOpacity 
          style={styles.licenseCard}
          onPress={() => captureImage('license-front')}
          disabled={uploadingImage}
        >
          <Text style={styles.licenseCardTitle}>Front Side</Text>
          {formData.drivingLicense.frontImageId ? (
            <View style={styles.licensePreview}>
              <Ionicons name="checkmark-circle" size={40} color="#4CE5B1" />
              <Text style={styles.licensePreviewText}>Got it! ✅</Text>
            </View>
          ) : (
            <View style={styles.licensePlaceholder}>
              <Ionicons name="card-outline" size={50} color="#666666" />
              <Text style={styles.licensePlaceholderText}>Tap to capture</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.licenseCard}
          onPress={() => captureImage('license-back')}
          disabled={uploadingImage}
        >
          <Text style={styles.licenseCardTitle}>Back Side</Text>
          {formData.drivingLicense.backImageId ? (
            <View style={styles.licensePreview}>
              <Ionicons name="checkmark-circle" size={40} color="#4CE5B1" />
              <Text style={styles.licensePreviewText}>Got it! ✅</Text>
            </View>
          ) : (
            <View style={styles.licensePlaceholder}>
              <Ionicons name="card-outline" size={50} color="#666666" />
              <Text style={styles.licensePlaceholderText}>Tap to capture</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Identity document + license details */}
      <View style={styles.formContainer}>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>ID Type</Text>
            <TextInput
              style={styles.input}
              placeholder="drivers_license | passport | national_id"
              placeholderTextColor="#666666"
              value={formData.identityDocument.type}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                identityDocument: { ...prev.identityDocument, type: text as any }
              }))}
            />
          </View>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>ID Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Document number"
              placeholderTextColor="#666666"
              value={formData.identityDocument.documentNumber}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                identityDocument: { ...prev.identityDocument, documentNumber: text }
              }))}
            />
          </View>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>License Number</Text>
            <TextInput
              style={styles.input}
              placeholder="DL1234567"
              placeholderTextColor="#666666"
              value={formData.drivingLicense.licenseNumber}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                drivingLicense: { ...prev.drivingLicense, licenseNumber: text }
              }))}
            />
          </View>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Issuing Authority</Text>
            <TextInput
              style={styles.input}
              placeholder="RTO / DMV"
              placeholderTextColor="#666666"
              value={formData.drivingLicense.issuingAuthority}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                drivingLicense: { ...prev.drivingLicense, issuingAuthority: text }
              }))}
            />
          </View>
        </View>
        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>License Expiry (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-12-31"
              placeholderTextColor="#666666"
              value={formData.drivingLicense.expiryDate}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                drivingLicense: { ...prev.drivingLicense, expiryDate: text }
              }))}
            />
          </View>
          <View style={styles.inputHalf} />
        </View>
      </View>

      {uploadingImage && (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color="#4CE5B1" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}
    </View>
  );

  const renderVehicleStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>🚗 Your Ride</Text>
      <Text style={styles.stepDescription}>
        Tell us about your awesome car!
      </Text>
      
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

        <View style={styles.inputRow}>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Year</Text>
            <TextInput
              style={styles.input}
              placeholder="2018"
              keyboardType="number-pad"
              placeholderTextColor="#666666"
              value={formData.vehicle.year}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle, year: text }
              }))}
            />
          </View>
          <View style={styles.inputHalf}>
            <Text style={styles.inputLabel}>Insurance Expiry (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-12-31"
              placeholderTextColor="#666666"
              value={formData.vehicle.insuranceExpiryDate}
              onChangeText={(text) => setFormData(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle, insuranceExpiryDate: text }
              }))}
            />
          </View>
        </View>
      </View>
    </View>
  );

  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepHeader}>✅ Almost Done!</Text>
      <Text style={styles.stepDescription}>
        Everything looks good? Let's submit for review!
      </Text>
      
      <View style={styles.reviewContainer}>
        <View style={styles.reviewSection}>
          <Ionicons name="person-circle-outline" size={24} color="#4CE5B1" />
          <Text style={styles.reviewSectionTitle}>Profile Photo ✅</Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Ionicons name="card-outline" size={24} color="#4CE5B1" />
          <Text style={styles.reviewSectionTitle}>Driver's License ✅</Text>
        </View>
        
        <View style={styles.reviewSection}>
          <Ionicons name="car-outline" size={24} color="#4CE5B1" />
          <Text style={styles.reviewSectionTitle}>
            {formData.vehicle.color} {formData.vehicle.make} {formData.vehicle.model} ({formData.vehicle.licensePlate})
          </Text>
        </View>
      </View>
      
      <View style={styles.submitInfo}>
        <Text style={styles.submitInfoText}>
          🚀 We'll review everything within 24-48 hours and send you a notification when you're approved!
        </Text>
      </View>
    </View>
  );

  const renderSubmittedStep = () => (
    <View style={styles.stepContainer}>
      <LinearGradient
        colors={['#4CE5B1', '#3c7d68']}
        style={styles.successContainer}
      >
        <Ionicons name="checkmark-circle" size={100} color="#FFFFFF" />
        <Text style={styles.successTitle}>You're All Set! 🎉</Text>
        <Text style={styles.successSubtitle}>
          We're reviewing your info and will notify you soon!
        </Text>
      </LinearGradient>
      
      <View style={styles.nextStepsContainer}>
        <Text style={styles.nextStepsTitle}>What's next?</Text>
        
        <View style={styles.nextStepItem}>
          <Text style={styles.nextStepEmoji}>⏱️</Text>
          <Text style={styles.nextStepText}>We review (24-48 hours)</Text>
        </View>
        
        <View style={styles.nextStepItem}>
          <Text style={styles.nextStepEmoji}>📱</Text>
          <Text style={styles.nextStepText}>You get notified</Text>
        </View>
        
        <View style={styles.nextStepItem}>
          <Text style={styles.nextStepEmoji}>🚗</Text>
          <Text style={styles.nextStepText}>Start earning!</Text>
        </View>
      </View>
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcomeStep();
      case 'photo':
        return renderPhotoStep();
      case 'license':
        return renderLicenseStep();
      case 'vehicle':
        return renderVehicleStep();
      case 'review':
        return renderReviewStep();
      case 'submitted':
        return renderSubmittedStep();
      default:
        return renderWelcomeStep();
    }
  };

  const renderNavigationButtons = () => {
    if (currentStep === 'submitted') {
      return (
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.primaryButtonText}>Back to Account</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.navigationContainer}>
        {currentStep !== 'welcome' && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={prevStep}
            disabled={submitting}
          >
            <Ionicons name="chevron-back" size={20} color="#4CE5B1" />
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[
            styles.primaryButton,
            !canProceedFromStep(currentStep) && styles.primaryButtonDisabled
          ]}
          onPress={currentStep === 'review' ? submitVerification : nextStep}
          disabled={!canProceedFromStep(currentStep) || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>
                {currentStep === 'review' ? 'Submit for Review' : 'Continue'}
              </Text>
              {currentStep !== 'review' && (
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              )}
            </>
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
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Become a Driver</Text>
        <View style={styles.headerSpacer} />
      </View>

      {currentStep !== 'welcome' && currentStep !== 'submitted' && renderProgressBar()}

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

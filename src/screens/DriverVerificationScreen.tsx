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
  Image,
  Dimensions,
  Animated,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
// Using existing API services
import { 
  submitDriverVerification, 
  getDriverVerificationStatus,
  DriverVerificationStatus as ServiceDriverVerificationStatus,
  DriverVerificationData
} from '../api/driverVerificationService';

type ExtendedDriverVerificationStatus = 
  | (ServiceDriverVerificationStatus & { expiresAt?: string })
  | {
      id?: string;
      userId?: string;
      status: 'not_submitted' | 'in_review';
      submittedAt?: Date;
      reviewedAt?: Date;
      rejectionReason?: string;
      faceImageId?: string;
      drivingLicense?: {
        frontImageId: string;
        backImageId: string;
      };
      vehicle?: {
        make: string;
        model: string;
        color: string;
        licensePlate: string;
      };
      expiresAt?: string;
    };

type VerificationStep = 'welcome' | 'photo' | 'license' | 'vehicle' | 'review' | 'submitted';

const { width } = Dimensions.get('window');

const steps = [
  { key: 'welcome', title: 'Welcome', icon: 'hand-left-outline' },
  { key: 'photo', title: 'Photo', icon: 'camera-outline' },
  { key: 'license', title: 'License', icon: 'card-outline' },
  { key: 'vehicle', title: 'Vehicle', icon: 'car-outline' },
  { key: 'review', title: 'Review', icon: 'checkmark-circle-outline' }
];

const DriverVerificationScreen: React.FC = () => {
  const navigation = useNavigation();
  const [status, setStatus] = useState<ExtendedDriverVerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<VerificationStep>('welcome');
  const [showForm, setShowForm] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<string | null>(null);

  // Complete form state matching service interface
  const [formData, setFormData] = useState({
    faceImageId: '',
    drivingLicense: {
      frontImageId: '',
      backImageId: '',
      licenseNumber: '',
      issuingAuthority: '',
      expiryDate: new Date()
    },
    vehicle: {
      make: '',
      model: '',
      color: '',
      licensePlate: '',
      year: new Date().getFullYear(),
      registrationImageId: '',
      insuranceImageId: '',
      insuranceExpiryDate: new Date()
    },
    identityDocument: {
      type: 'drivers_license' as 'drivers_license' | 'passport' | 'national_id',
      documentNumber: '',
      frontImageId: '',
      backImageId: ''
    }
  });

  const [uploadingImage, setUploadingImage] = useState(false);
  const progressAnim = new Animated.Value(0);

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  const loadVerificationStatus = async () => {
    try {
      setLoading(true);
      const response = await getDriverVerificationStatus();
      if (response) {
        setStatus({
          ...response,
          status: response.status === 'pending' ? 'pending' : response.status as any
        });
      } else {
        setStatus({
          status: 'not_submitted'
        } as ExtendedDriverVerificationStatus);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load verification status');
      setStatus({
        status: 'not_submitted'
      } as ExtendedDriverVerificationStatus);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: string) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera roll permission is required to upload documents');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      // TODO: Upload image and get file ID
      const imageId = `mock_${Date.now()}`;
      
      switch (type) {
        case 'identity_front':
          setFormData(prev => ({
            ...prev,
            identityDocument: { ...prev.identityDocument, frontImageId: imageId }
          }));
          break;
        case 'identity_back':
          setFormData(prev => ({
            ...prev,
            identityDocument: { ...prev.identityDocument, backImageId: imageId }
          }));
          break;
        case 'license':
          setFormData(prev => ({
            ...prev,
            drivingLicense: { ...prev.drivingLicense, frontImageId: imageId }
          }));
          break;
        case 'registration':
          setFormData(prev => ({
            ...prev,
            vehicle: { ...prev.vehicle, registrationImageId: imageId }
          }));
          break;
        case 'insurance':
          setFormData(prev => ({
            ...prev,
            vehicle: { ...prev.vehicle, insuranceImageId: imageId }
          }));
          break;
      }
    }
  };

  const submitVerification = async () => {
    try {
      setSubmitting(true);
      
      // Basic validation
      if (!formData.identityDocument.documentNumber.trim()) {
        Alert.alert('Missing Information', 'Document number is required');
        return;
      }
      
      if (!formData.drivingLicense.licenseNumber.trim()) {
        Alert.alert('Missing Information', 'License number is required');
        return;
      }
      if (!formData.drivingLicense.issuingAuthority.trim()) {
        Alert.alert('Missing Information', 'Issuing authority is required');
        return;
      }
      
      if (!formData.vehicle.make.trim() || !formData.vehicle.model.trim()) {
        Alert.alert('Missing Information', 'Vehicle make and model are required');
        return;
      }
      if (!formData.vehicle.licensePlate.trim()) {
        Alert.alert('Missing Information', 'Vehicle license plate is required');
        return;
      }
      if (!formData.vehicle.insuranceExpiryDate) {
        Alert.alert('Missing Information', 'Insurance expiry date is required');
        return;
      }

      // Prepare data for API
      const toDateOnly = (d: Date) => d.toISOString().slice(0, 10);
      const verificationData: DriverVerificationData = {
        identityDocument: {
          type: formData.identityDocument.type,
          documentNumber: formData.identityDocument.documentNumber,
          frontImageId: formData.identityDocument.frontImageId || undefined,
          backImageId: formData.identityDocument.backImageId || undefined,
        },
        drivingLicense: {
          licenseNumber: formData.drivingLicense.licenseNumber,
          issuingAuthority: formData.drivingLicense.issuingAuthority,
          expiryDate: toDateOnly(formData.drivingLicense.expiryDate),
          imageId: formData.drivingLicense.frontImageId || undefined,
          frontImageId: formData.drivingLicense.frontImageId || undefined,
          backImageId: formData.drivingLicense.backImageId || undefined,
        },
        vehicle: {
          make: formData.vehicle.make,
          model: formData.vehicle.model,
          year: formData.vehicle.year,
          color: formData.vehicle.color,
          licensePlate: formData.vehicle.licensePlate,
          insuranceExpiryDate: toDateOnly(formData.vehicle.insuranceExpiryDate),
        },
        faceImageId: formData.faceImageId || undefined,
      };
      
      await submitDriverVerification(verificationData);
      
      Alert.alert(
        'Verification Submitted',
        'Your driver verification has been submitted for review. You will be notified once the review is complete.',
        [{ text: 'OK', onPress: () => {
          setShowForm(false);
          loadVerificationStatus();
        }}]
      );
      
    } catch (error) {
      Alert.alert('Error', 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#34C759';
      case 'rejected': return '#FF3B30';
      case 'pending': case 'in_review': return '#FF9500';
      case 'expired': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'not_submitted': return 'Not Submitted';
      case 'pending': return 'Pending Review';
      case 'in_review': return 'Under Review';
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'expired': return 'Expired';
      default: return 'Unknown';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3c7d68" />
          <Text style={styles.loadingText}>Loading verification status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Driver Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <Ionicons 
              name={status?.status === 'approved' ? 'checkmark-circle' : 'shield-outline'} 
              size={32} 
              color={getStatusColor(status?.status || 'not_submitted')} 
            />
            <View style={styles.statusInfo}>
              <Text style={styles.statusTitle}>Verification Status</Text>
              <Text style={[styles.statusText, { color: getStatusColor(status?.status || 'not_submitted') }]}>
                {getStatusText(status?.status || 'not_submitted')}
              </Text>
            </View>
          </View>

          {status?.status === 'approved' && status.expiresAt && (
            <Text style={styles.expiryText}>
              Expires: {new Date(status.expiresAt).toLocaleDateString()}
            </Text>
          )}

          {status?.status === 'rejected' && status.rejectionReason && (
            <View style={styles.rejectionCard}>
              <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
              <Text style={styles.rejectionText}>{status.rejectionReason}</Text>
            </View>
          )}
        </View>

        <Text style={styles.description}>
          Driver verification is required to offer rides. This includes identity verification, 
          background check, and vehicle documentation.
        </Text>

        {status?.status === 'not_submitted' || status?.status === 'rejected' || status?.status === 'expired' ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowForm(true)}
          >
            <Text style={styles.primaryButtonText}>
              {status?.status === 'not_submitted' ? 'Start Verification' : 'Resubmit Verification'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={24} color="#3c7d68" />
            <Text style={styles.infoText}>
              Your verification is being reviewed. We'll notify you once it's complete.
            </Text>
          </View>
        )}

        {status?.status === 'approved' && (
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsTitle}>✅ You can now:</Text>
            <Text style={styles.benefitItem}>• Create and offer rides</Text>
            <Text style={styles.benefitItem}>• Earn money by giving rides</Text>
            <Text style={styles.benefitItem}>• Build your driver rating</Text>
            <Text style={styles.benefitItem}>• Access driver-only features</Text>
          </View>
        )}
      </ScrollView>

      {/* Verification Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Driver Verification</Text>
            <TouchableOpacity onPress={submitVerification} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#3c7d68" size="small" />
              ) : (
                <Text style={styles.submitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.formContent}>
            {/* Identity Document Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Identity Document</Text>
              
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Document Type</Text>
                <View style={styles.pickerButtons}>
                  {[
                    { value: 'drivers_license', label: 'Driver\'s License' },
                    { value: 'passport', label: 'Passport' },
                    { value: 'national_id', label: 'National ID' }
                  ].map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.pickerButton,
                        formData.identityDocument.type === option.value && styles.selectedPicker
                      ]}
                      onPress={() => setFormData(prev => ({
                        ...prev,
                        identityDocument: { ...prev.identityDocument, type: option.value as any }
                      }))}
                    >
                      <Text style={[
                        styles.pickerButtonText,
                        formData.identityDocument.type === option.value && styles.selectedPickerText
                      ]}>
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Document Number"
                placeholderTextColor="#8E8E93"
                value={formData.identityDocument.documentNumber}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  identityDocument: { ...prev.identityDocument, documentNumber: text }
                }))}
              />

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('identity_front')}
              >
                <Ionicons name="camera" size={20} color="#3c7d68" />
                <Text style={styles.uploadButtonText}>
                  {formData.identityDocument.frontImageId ? 'Front Image ✓' : 'Upload Front Image'}
                </Text>
              </TouchableOpacity>

              {formData.identityDocument.type !== 'passport' && (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => pickImage('identity_back')}
                >
                  <Ionicons name="camera" size={20} color="#3c7d68" />
                  <Text style={styles.uploadButtonText}>
                    {formData.identityDocument.backImageId ? 'Back Image ✓' : 'Upload Back Image'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Driving License Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Driving License</Text>
              
              <TextInput
                style={styles.input}
                placeholder="License Number"
                placeholderTextColor="#8E8E93"
                value={formData.drivingLicense.licenseNumber}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  drivingLicense: { ...prev.drivingLicense, licenseNumber: text }
                }))}
              />

              <TextInput
                style={styles.input}
                placeholder="Issuing Authority"
                placeholderTextColor="#8E8E93"
                value={formData.drivingLicense.issuingAuthority}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  drivingLicense: { ...prev.drivingLicense, issuingAuthority: text }
                }))}
              />

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker('license')}
              >
                <Text style={styles.dateButtonText}>
                  License Expiry: {formData.drivingLicense.expiryDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar" size={20} color="#8E8E93" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('license')}
              >
                <Ionicons name="camera" size={20} color="#3c7d68" />
                <Text style={styles.uploadButtonText}>
                  {formData.drivingLicense.frontImageId ? 'License Image ✓' : 'Upload License Image'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Vehicle Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Information</Text>
              
              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Make"
                  placeholderTextColor="#8E8E93"
                  value={formData.vehicle.make}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, make: text }
                  }))}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Model"
                  placeholderTextColor="#8E8E93"
                  value={formData.vehicle.model}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, model: text }
                  }))}
                />
              </View>

              <View style={styles.row}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Year"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  value={formData.vehicle.year.toString()}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, year: parseInt(text) || new Date().getFullYear() }
                  }))}
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Color"
                  placeholderTextColor="#8E8E93"
                  value={formData.vehicle.color}
                  onChangeText={(text) => setFormData(prev => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, color: text }
                  }))}
                />
              </View>

              <TextInput
                style={styles.input}
                placeholder="License Plate"
                placeholderTextColor="#8E8E93"
                value={formData.vehicle.licensePlate}
                onChangeText={(text) => setFormData(prev => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, licensePlate: text }
                }))}
              />

              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker('insurance')}
              >
                <Text style={styles.dateButtonText}>
                  Insurance Expiry: {formData.vehicle.insuranceExpiryDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar" size={20} color="#8E8E93" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('registration')}
              >
                <Ionicons name="camera" size={20} color="#3c7d68" />
                <Text style={styles.uploadButtonText}>
                  {formData.vehicle.registrationImageId ? 'Registration ✓' : 'Upload Registration'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => pickImage('insurance')}
              >
                <Ionicons name="camera" size={20} color="#3c7d68" />
                <Text style={styles.uploadButtonText}>
                  {formData.vehicle.insuranceImageId ? 'Insurance ✓' : 'Upload Insurance'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={showDatePicker === 'license' ? formData.drivingLicense.expiryDate : formData.vehicle.insuranceExpiryDate}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(null);
                if (selectedDate) {
                  if (showDatePicker === 'license') {
                    setFormData(prev => ({
                      ...prev,
                      drivingLicense: { ...prev.drivingLicense, expiryDate: selectedDate }
                    }));
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      vehicle: { ...prev.vehicle, insuranceExpiryDate: selectedDate }
                    }));
                  }
                }
              }}
            />
          )}
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#8E8E93',
    marginTop: 16,
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  statusCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusInfo: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  expiryText: {
    color: '#8E8E93',
    fontSize: 14,
  },
  rejectionCard: {
    backgroundColor: '#2C1B1B',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  rejectionTitle: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  rejectionText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  description: {
    color: '#8E8E93',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: '#3c7d68',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  benefitsCard: {
    backgroundColor: '#1C2B1C',
    borderRadius: 12,
    padding: 16,
  },
  benefitsTitle: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  benefitItem: {
    color: '#FFFFFF',
    fontSize: 14,
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  submitText: {
    color: '#3c7d68',
    fontSize: 16,
    fontWeight: '600',
  },
  formContent: {
    padding: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  pickerContainer: {
    marginBottom: 12,
  },
  label: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 8,
  },
  pickerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pickerButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  selectedPicker: {
    backgroundColor: '#3c7d68',
    borderColor: '#3c7d68',
  },
  pickerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectedPickerText: {
    fontWeight: '600',
  },
  dateButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  uploadButton: {
    backgroundColor: '#1C1C1E',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3c7d68',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    color: '#3c7d68',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default DriverVerificationScreen;

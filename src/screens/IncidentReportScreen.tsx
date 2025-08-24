import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface IncidentReport {
  type: 'safety' | 'harassment' | 'vehicle' | 'payment' | 'other';
  description: string;
  rideId?: string;
  reportedUserId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

const IncidentReportScreen: React.FC = () => {
  const navigation = useNavigation();
  const [selectedType, setSelectedType] = useState<IncidentReport['type']>('safety');
  const [severity, setSeverity] = useState<IncidentReport['severity']>('medium');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const incidentTypes = [
    { key: 'safety', label: 'Safety Concern', icon: 'shield-outline' },
    { key: 'harassment', label: 'Harassment', icon: 'warning-outline' },
    { key: 'vehicle', label: 'Vehicle Issue', icon: 'car-outline' },
    { key: 'payment', label: 'Payment Dispute', icon: 'card-outline' },
    { key: 'other', label: 'Other', icon: 'help-circle-outline' },
  ];

  const severityLevels = [
    { key: 'low', label: 'Low', color: '#34C759' },
    { key: 'medium', label: 'Medium', color: '#FF9500' },
    { key: 'high', label: 'High', color: '#FF3B30' },
    { key: 'critical', label: 'Critical', color: '#8B0000' },
  ];

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please provide a description of the incident.');
      return;
    }

    try {
      setLoading(true);
      
      // TODO: Replace with actual API call
      const report: IncidentReport = {
        type: selectedType,
        description: description.trim(),
        severity,
      };

      console.log('Submitting incident report:', report);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Report Submitted',
        'Thank you for reporting this incident. Our safety team will review it and take appropriate action.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('Error submitting incident report:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Incident</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.subtitle}>
            Help us maintain a safe community by reporting any incidents or concerns.
          </Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incident Type</Text>
            <View style={styles.typeGrid}>
              {incidentTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  style={[
                    styles.typeButton,
                    selectedType === type.key && styles.typeButtonSelected,
                  ]}
                  onPress={() => setSelectedType(type.key as IncidentReport['type'])}
                >
                  <Ionicons
                    name={type.icon as any}
                    size={24}
                    color={selectedType === type.key ? '#000000' : '#ffffff'}
                  />
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedType === type.key && styles.typeButtonTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Severity Level</Text>
            <View style={styles.severityRow}>
              {severityLevels.map((level) => (
                <TouchableOpacity
                  key={level.key}
                  style={[
                    styles.severityButton,
                    severity === level.key && { borderColor: level.color },
                    severity === level.key && styles.severityButtonSelected,
                  ]}
                  onPress={() => setSeverity(level.key as IncidentReport['severity'])}
                >
                  <View
                    style={[
                      styles.severityIndicator,
                      { backgroundColor: level.color },
                      severity === level.key && styles.severityIndicatorSelected,
                    ]}
                  />
                  <Text
                    style={[
                      styles.severityButtonText,
                      severity === level.key && styles.severityButtonTextSelected,
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Please provide details about the incident..."
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={6}
              value={description}
              onChangeText={setDescription}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.infoText}>
              <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
              {' '}Your report will be reviewed by our safety team. For immediate emergencies, 
              use the SOS button or contact emergency services directly.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitReport}
            disabled={loading}
          >
            {loading ? (
              <Text style={styles.submitButtonText}>Submitting...</Text>
            ) : (
              <Text style={styles.submitButtonText}>Submit Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 100,
  },
  subtitle: {
    color: '#8E8E93',
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonSelected: {
    backgroundColor: '#3c7d68',
    borderColor: '#3c7d68',
  },
  typeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  typeButtonTextSelected: {
    color: '#000000',
  },
  severityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  severityButton: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  severityButtonSelected: {
    backgroundColor: '#2C2C2E',
  },
  severityIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  severityIndicatorSelected: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  severityButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  severityButtonTextSelected: {
    fontWeight: '600',
  },
  descriptionInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#2C2C2E',
  },
  infoText: {
    color: '#8E8E93',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
  },
  submitButton: {
    backgroundColor: '#3c7d68',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default IncidentReportScreen;

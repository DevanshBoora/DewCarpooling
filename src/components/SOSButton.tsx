import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
 import { getActiveRides, triggerRideEmergency } from '../api/rideTrackingService';

interface SOSButtonProps {
  onEmergencyTriggered?: (emergencyId: string) => void;
  style?: any;
}

type EmergencyType = 'sos' | 'panic' | 'medical' | 'accident' | 'harassment';

const SOSButton: React.FC<SOSButtonProps> = ({ onEmergencyTriggered, style }) => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<EmergencyType>('sos');
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [checkingActive, setCheckingActive] = useState<boolean>(true);

  const emergencyTypes = [
    { type: 'sos' as EmergencyType, label: 'General Emergency', icon: 'warning', color: '#FF3B30' },
    { type: 'panic' as EmergencyType, label: 'Panic/Fear', icon: 'heart', color: '#FF9500' },
    { type: 'medical' as EmergencyType, label: 'Medical Emergency', icon: 'medical', color: '#FF3B30' },
    { type: 'accident' as EmergencyType, label: 'Accident', icon: 'car-sport', color: '#FF3B30' },
    { type: 'harassment' as EmergencyType, label: 'Harassment', icon: 'shield', color: '#FF6B6B' }
  ];

  const triggerEmergency = async (type: EmergencyType) => {
    setLoading(true);
    
    try {
      if (!activeRideId) {
        Alert.alert('No Active Ride', 'Emergency alerts are only available during an active ride.');
        setLoading(false);
        return;
      }
      // Get current location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Required', 'Location access is required for emergency alerts.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });

      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });

      const addressString = address[0] ? 
        `${address[0].name || ''} ${address[0].street || ''}, ${address[0].city || ''}`.trim() :
        'Unknown location';

      // Route emergency to active ride
      await triggerRideEmergency(activeRideId, type);
      
      const emergencyId = `emergency_${Date.now()}`;
      
      Alert.alert(
        'Emergency Alert Sent',
        `Your ${emergencyTypes.find(t => t.type === type)?.label.toLowerCase()} alert has been sent for your active ride.`,
        [{ text: 'OK', onPress: () => setShowModal(false) }]
      );

      onEmergencyTriggered?.(emergencyId);

    } catch (error) {
      console.error('Emergency trigger error:', error);
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSOSPress = () => {
    if (!activeRideId) {
      Alert.alert('No Active Ride', 'SOS is only available during an active ride.');
      return;
    }
    Alert.alert(
      'Emergency Alert',
      'This will immediately notify your trusted contacts and emergency services if needed. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Emergency!', style: 'destructive', onPress: () => setShowModal(true) }
      ]
    );
  };

  useEffect(() => {
    const loadActiveRide = async () => {
      try {
        setCheckingActive(true);
        const rides = await getActiveRides();
        // Prefer the most recent active ride if multiple are present
        const ride = Array.isArray(rides) && rides.length > 0 ? rides[0] : null;
        // Prefer ride.ride (underlying rideId); fallback to tracking doc _id if needed
        setActiveRideId(ride?.ride || ride?._id || null);
      } catch (e) {
        console.error('Failed to fetch active rides:', e);
        setActiveRideId(null);
      } finally {
        setCheckingActive(false);
      }
    };
    loadActiveRide();
  }, []);

  return (
    <>
      {/* Only render the SOS button if there is an active ride */}
      {activeRideId && !checkingActive ? (
        <TouchableOpacity
          style={[styles.sosButton, style]}
          onPress={handleSOSPress}
          activeOpacity={0.8}
        >
          <Ionicons name="warning" size={32} color="#FFFFFF" />
          <Text style={styles.sosText}>SOS</Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => !loading && setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Emergency Type</Text>
            
            {emergencyTypes.map((emergency) => (
              <Pressable
                key={emergency.type}
                style={[
                  styles.emergencyOption,
                  selectedType === emergency.type && styles.selectedOption
                ]}
                onPress={() => setSelectedType(emergency.type)}
                disabled={loading}
              >
                <View style={styles.emergencyOptionContent}>
                  <Ionicons 
                    name={emergency.icon as any} 
                    size={24} 
                    color={emergency.color} 
                  />
                  <Text style={styles.emergencyLabel}>{emergency.label}</Text>
                </View>
                {selectedType === emergency.type && (
                  <Ionicons name="checkmark-circle" size={20} color="#3c7d68" />
                )}
              </Pressable>
            ))}

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowModal(false)}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              
              <Pressable
                style={[styles.modalButton, styles.emergencyButton]}
                onPress={() => triggerEmergency(selectedType)}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.emergencyButtonText}>Send Alert</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sosButton: {
    backgroundColor: '#FF3B30',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  sosText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },
  emergencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    marginBottom: 12,
  },
  selectedOption: {
    backgroundColor: '#3c7d68',
  },
  emergencyOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emergencyLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 12,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#2C2C2E',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
  },
  emergencyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SOSButton;

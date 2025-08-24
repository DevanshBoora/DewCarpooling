import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface TrustedContact {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: 'family' | 'friend' | 'colleague' | 'emergency_contact';
  isPrimary: boolean;
  isVerified: boolean;
}

const TrustedContactsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [selectedContact, setSelectedContact] = useState<TrustedContact | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add contact form state
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    relationship: 'family' as TrustedContact['relationship'],
    isPrimary: false
  });

  const relationships = [
    { value: 'family', label: 'Family Member' },
    { value: 'friend', label: 'Friend' },
    { value: 'colleague', label: 'Colleague' },
    { value: 'emergency_contact', label: 'Emergency Contact' }
  ];

  useEffect(() => {
    loadContacts();
  }, []);

  const loadContacts = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const response = await api.get('/api/trusted-contacts');
      // setContacts(response.data);
      
      // Mock data for now
      setContacts([
        {
          _id: '1',
          name: 'Mom',
          phone: '+919876543210',
          email: 'mom@example.com',
          relationship: 'family',
          isPrimary: true,
          isVerified: true
        },
        {
          _id: '2',
          name: 'Best Friend',
          phone: '+919876543211',
          relationship: 'friend',
          isPrimary: false,
          isVerified: false
        }
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to load trusted contacts');
    } finally {
      setLoading(false);
    }
  };

  const addContact = async () => {
    if (!newContact.name.trim() || !newContact.phone.trim()) {
      Alert.alert('Missing Information', 'Name and phone number are required');
      return;
    }

    try {
      setSubmitting(true);
      // TODO: Replace with actual API call
      // const response = await api.post('/api/trusted-contacts', newContact);
      
      Alert.alert(
        'Contact Added',
        'Verification code sent via SMS. Please verify the contact.',
        [{ text: 'OK', onPress: () => {
          setShowAddModal(false);
          setNewContact({ name: '', phone: '', email: '', relationship: 'family', isPrimary: false });
          loadContacts();
        }}]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add trusted contact');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyContact = async () => {
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit verification code');
      return;
    }

    try {
      setSubmitting(true);
      // TODO: Replace with actual API call
      // await api.post(`/api/trusted-contacts/${selectedContact?._id}/verify`, { code: verificationCode });
      
      Alert.alert('Success', 'Contact verified successfully', [
        { text: 'OK', onPress: () => {
          setShowVerifyModal(false);
          setVerificationCode('');
          setSelectedContact(null);
          loadContacts();
        }}
      ]);
    } catch (error) {
      Alert.alert('Error', 'Invalid verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const deleteContact = (contact: TrustedContact) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to remove ${contact.name} from your trusted contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => performDelete(contact._id) }
      ]
    );
  };

  const performDelete = async (contactId: string) => {
    try {
      // TODO: Replace with actual API call
      // await api.delete(`/api/trusted-contacts/${contactId}`);
      setContacts(contacts.filter(c => c._id !== contactId));
    } catch (error) {
      Alert.alert('Error', 'Failed to delete contact');
    }
  };

  const resendVerification = async (contact: TrustedContact) => {
    try {
      // TODO: Replace with actual API call
      // await api.post(`/api/trusted-contacts/${contact._id}/resend-verification`);
      Alert.alert('Code Sent', 'New verification code sent via SMS');
    } catch (error) {
      Alert.alert('Error', 'Failed to resend verification code');
    }
  };

  const renderContact = ({ item }: { item: TrustedContact }) => (
    <View style={styles.contactCard}>
      <View style={styles.contactInfo}>
        <View style={styles.contactHeader}>
          <Text style={styles.contactName}>{item.name}</Text>
          {item.isPrimary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>PRIMARY</Text>
            </View>
          )}
        </View>
        <Text style={styles.contactPhone}>{item.phone}</Text>
        <Text style={styles.contactRelationship}>
          {relationships.find(r => r.value === item.relationship)?.label}
        </Text>
      </View>
      
      <View style={styles.contactActions}>
        <View style={styles.statusContainer}>
          {item.isVerified ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.verifyButton}
              onPress={() => {
                setSelectedContact(item);
                setShowVerifyModal(true);
              }}
            >
              <Text style={styles.verifyButtonText}>Verify</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteContact(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trusted Contacts</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <Text style={styles.description}>
        Add trusted contacts who will be notified in case of an emergency. At least one verified contact is required.
      </Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3c7d68" />
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Contact Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Trusted Contact</Text>
            
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#8E8E93"
              value={newContact.name}
              onChangeText={(text) => setNewContact({...newContact, name: text})}
            />
            
            <TextInput
              style={styles.input}
              placeholder="Phone Number (+91XXXXXXXXXX)"
              placeholderTextColor="#8E8E93"
              value={newContact.phone}
              onChangeText={(text) => setNewContact({...newContact, phone: text})}
              keyboardType="phone-pad"
            />
            
            <TextInput
              style={styles.input}
              placeholder="Email (Optional)"
              placeholderTextColor="#8E8E93"
              value={newContact.email}
              onChangeText={(text) => setNewContact({...newContact, email: text})}
              keyboardType="email-address"
            />

            <View style={styles.relationshipContainer}>
              <Text style={styles.relationshipLabel}>Relationship:</Text>
              {relationships.map((rel) => (
                <TouchableOpacity
                  key={rel.value}
                  style={[
                    styles.relationshipOption,
                    newContact.relationship === rel.value && styles.selectedRelationship
                  ]}
                  onPress={() => setNewContact({...newContact, relationship: rel.value as any})}
                >
                  <Text style={[
                    styles.relationshipText,
                    newContact.relationship === rel.value && styles.selectedRelationshipText
                  ]}>
                    {rel.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addButton]}
                onPress={addContact}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.addButtonText}>Add Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Verify Contact Modal */}
      <Modal visible={showVerifyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Verify Contact</Text>
            <Text style={styles.verifyDescription}>
              Enter the 6-digit code sent to {selectedContact?.phone}
            </Text>
            
            <TextInput
              style={styles.codeInput}
              placeholder="000000"
              placeholderTextColor="#8E8E93"
              value={verificationCode}
              onChangeText={setVerificationCode}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
            />

            <TouchableOpacity
              style={styles.resendButton}
              onPress={() => selectedContact && resendVerification(selectedContact)}
            >
              <Text style={styles.resendButtonText}>Resend Code</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowVerifyModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.verifyModalButton]}
                onPress={verifyContact}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.verifyModalButtonText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  description: {
    color: '#8E8E93',
    fontSize: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  contactCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBadge: {
    backgroundColor: '#3c7d68',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  primaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  contactPhone: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 2,
  },
  contactRelationship: {
    color: '#8E8E93',
    fontSize: 12,
  },
  contactActions: {
    alignItems: 'flex-end',
  },
  statusContainer: {
    marginBottom: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verifiedText: {
    color: '#34C759',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  verifyButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteButton: {
    padding: 4,
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
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 16,
    color: '#FFFFFF',
    fontSize: 16,
    marginBottom: 16,
  },
  relationshipContainer: {
    marginBottom: 20,
  },
  relationshipLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  relationshipOption: {
    backgroundColor: '#2C2C2E',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedRelationship: {
    backgroundColor: '#3c7d68',
  },
  relationshipText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  selectedRelationshipText: {
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  addButton: {
    backgroundColor: '#3c7d68',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  verifyDescription: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  codeInput: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    padding: 20,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 8,
    marginBottom: 16,
  },
  resendButton: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  resendButtonText: {
    color: '#3c7d68',
    fontSize: 14,
    fontWeight: '600',
  },
  verifyModalButton: {
    backgroundColor: '#34C759',
  },
  verifyModalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default TrustedContactsScreen;

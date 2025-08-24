import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const PrivacyPolicyScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect information you provide directly to us, such as when you create an account, 
            complete your profile, or communicate with us. This includes:
          </Text>
          <Text style={styles.bulletPoint}>• Name, email address, and phone number</Text>
          <Text style={styles.bulletPoint}>• Profile photo and personal preferences</Text>
          <Text style={styles.bulletPoint}>• Vehicle information (for drivers)</Text>
          <Text style={styles.bulletPoint}>• Identity verification documents (for drivers)</Text>
          <Text style={styles.bulletPoint}>• Payment information</Text>
          <Text style={styles.bulletPoint}>• Communications and feedback</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Location Information</Text>
          <Text style={styles.paragraph}>
            We collect location data to provide our core services:
          </Text>
          <Text style={styles.bulletPoint}>• Real-time location during rides for safety and navigation</Text>
          <Text style={styles.bulletPoint}>• Pickup and drop-off locations</Text>
          <Text style={styles.bulletPoint}>• Route optimization and matching</Text>
          <Text style={styles.paragraph}>
            Location data is only collected when you're actively using the app and have granted permission. 
            You can disable location services at any time through your device settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
          <Text style={styles.paragraph}>We use your information to:</Text>
          <Text style={styles.bulletPoint}>• Provide and improve our carpooling services</Text>
          <Text style={styles.bulletPoint}>• Match you with compatible ride partners</Text>
          <Text style={styles.bulletPoint}>• Process payments and transactions</Text>
          <Text style={styles.bulletPoint}>• Verify driver identity and conduct background checks</Text>
          <Text style={styles.bulletPoint}>• Ensure safety and security of all users</Text>
          <Text style={styles.bulletPoint}>• Send important notifications about your rides</Text>
          <Text style={styles.bulletPoint}>• Calculate and display environmental impact</Text>
          <Text style={styles.bulletPoint}>• Comply with legal obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Information Sharing</Text>
          <Text style={styles.paragraph}>
            We share your information only in limited circumstances:
          </Text>
          <Text style={styles.bulletPoint}>• With other users for ride coordination (name, photo, ratings)</Text>
          <Text style={styles.bulletPoint}>• With payment processors for transaction processing</Text>
          <Text style={styles.bulletPoint}>• With background check providers (drivers only)</Text>
          <Text style={styles.bulletPoint}>• With emergency contacts when you trigger SOS</Text>
          <Text style={styles.bulletPoint}>• With law enforcement when legally required</Text>
          <Text style={styles.paragraph}>
            We never sell your personal information to third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Safety and Emergency Features</Text>
          <Text style={styles.paragraph}>
            For your safety, we may:
          </Text>
          <Text style={styles.bulletPoint}>• Share your real-time location with trusted contacts during emergencies</Text>
          <Text style={styles.bulletPoint}>• Record and monitor ride activities for safety purposes</Text>
          <Text style={styles.bulletPoint}>• Contact emergency services on your behalf when necessary</Text>
          <Text style={styles.bulletPoint}>• Retain trip data for safety investigations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement appropriate security measures to protect your information:
          </Text>
          <Text style={styles.bulletPoint}>• Encryption of sensitive data in transit and at rest</Text>
          <Text style={styles.bulletPoint}>• Regular security audits and updates</Text>
          <Text style={styles.bulletPoint}>• Limited access to personal information</Text>
          <Text style={styles.bulletPoint}>• Secure payment processing</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your information for as long as necessary to provide our services:
          </Text>
          <Text style={styles.bulletPoint}>• Account information: Until you delete your account</Text>
          <Text style={styles.bulletPoint}>• Trip data: 3 years for safety and legal purposes</Text>
          <Text style={styles.bulletPoint}>• Payment records: As required by law</Text>
          <Text style={styles.bulletPoint}>• Emergency records: 7 years for safety purposes</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Your Rights</Text>
          <Text style={styles.paragraph}>You have the right to:</Text>
          <Text style={styles.bulletPoint}>• Access your personal information</Text>
          <Text style={styles.bulletPoint}>• Correct inaccurate information</Text>
          <Text style={styles.bulletPoint}>• Delete your account and data</Text>
          <Text style={styles.bulletPoint}>• Export your data</Text>
          <Text style={styles.bulletPoint}>• Opt out of marketing communications</Text>
          <Text style={styles.bulletPoint}>• Withdraw consent for data processing</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            Our service is not intended for users under 18. We do not knowingly collect 
            personal information from children under 18. If we become aware that we have 
            collected such information, we will delete it immediately.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to and processed in countries other than 
            your own. We ensure appropriate safeguards are in place to protect your data 
            in accordance with applicable privacy laws.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Policy</Text>
          <Text style={styles.paragraph}>
            We may update this privacy policy from time to time. We will notify you of 
            any material changes by posting the new policy in the app and sending you a 
            notification. Your continued use of our service constitutes acceptance of the updated policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions about this privacy policy or our data practices, please contact us:
          </Text>
          <Text style={styles.bulletPoint}>• Email: privacy@dewcarpooling.com</Text>
          <Text style={styles.bulletPoint}>• Address: [Your Company Address]</Text>
          <Text style={styles.bulletPoint}>• Phone: [Your Phone Number]</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. GDPR Compliance (EU Users)</Text>
          <Text style={styles.paragraph}>
            If you are located in the European Union, you have additional rights under GDPR:
          </Text>
          <Text style={styles.bulletPoint}>• Right to data portability</Text>
          <Text style={styles.bulletPoint}>• Right to object to processing</Text>
          <Text style={styles.bulletPoint}>• Right to restrict processing</Text>
          <Text style={styles.bulletPoint}>• Right to lodge a complaint with supervisory authorities</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. California Privacy Rights (CCPA)</Text>
          <Text style={styles.paragraph}>
            California residents have additional rights under CCPA:
          </Text>
          <Text style={styles.bulletPoint}>• Right to know what personal information is collected</Text>
          <Text style={styles.bulletPoint}>• Right to delete personal information</Text>
          <Text style={styles.bulletPoint}>• Right to opt-out of sale of personal information</Text>
          <Text style={styles.bulletPoint}>• Right to non-discrimination for exercising privacy rights</Text>
        </View>
      </ScrollView>
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  paragraph: {
    color: '#E5E5E7',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletPoint: {
    color: '#E5E5E7',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 16,
  },
});

export default PrivacyPolicyScreen;

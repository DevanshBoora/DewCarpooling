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

const TermsOfServiceScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
          <Text style={styles.paragraph}>
            By accessing or using the Dew Carpooling app ("Service"), you agree to be bound by these 
            Terms of Service ("Terms"). If you do not agree to these Terms, do not use our Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            Dew is a community-based carpooling platform that connects drivers and passengers for 
            shared rides. We facilitate ride matching, payment processing, and safety features, 
            but we are not a transportation provider.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Eligibility</Text>
          <Text style={styles.paragraph}>
            To use our Service, you must:
          </Text>
          <Text style={styles.bulletPoint}>• Be at least 18 years old</Text>
          <Text style={styles.bulletPoint}>• Have the legal capacity to enter into contracts</Text>
          <Text style={styles.bulletPoint}>• Provide accurate and complete information</Text>
          <Text style={styles.bulletPoint}>• Comply with all applicable laws and regulations</Text>
          <Text style={styles.paragraph}>
            Drivers must additionally:
          </Text>
          <Text style={styles.bulletPoint}>• Hold a valid driver's license</Text>
          <Text style={styles.bulletPoint}>• Have valid vehicle registration and insurance</Text>
          <Text style={styles.bulletPoint}>• Pass identity verification and background checks</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Account Registration</Text>
          <Text style={styles.paragraph}>
            You must create an account to use our Service. You are responsible for:
          </Text>
          <Text style={styles.bulletPoint}>• Maintaining the confidentiality of your account</Text>
          <Text style={styles.bulletPoint}>• All activities that occur under your account</Text>
          <Text style={styles.bulletPoint}>• Notifying us immediately of unauthorized use</Text>
          <Text style={styles.bulletPoint}>• Providing accurate and up-to-date information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Driver Requirements and Verification</Text>
          <Text style={styles.paragraph}>
            To become a verified driver, you must:
          </Text>
          <Text style={styles.bulletPoint}>• Submit valid identity documents</Text>
          <Text style={styles.bulletPoint}>• Provide driver's license and vehicle information</Text>
          <Text style={styles.bulletPoint}>• Pass a background check</Text>
          <Text style={styles.bulletPoint}>• Maintain valid insurance coverage</Text>
          <Text style={styles.paragraph}>
            We reserve the right to reject or revoke driver verification at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Ride Booking and Cancellation</Text>
          <Text style={styles.paragraph}>
            When booking or offering rides:
          </Text>
          <Text style={styles.bulletPoint}>• All ride details must be accurate</Text>
          <Text style={styles.bulletPoint}>• Cancellations may result in fees</Text>
          <Text style={styles.bulletPoint}>• No-shows may affect your rating</Text>
          <Text style={styles.bulletPoint}>• You must arrive at agreed pickup/dropoff locations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Payment Terms</Text>
          <Text style={styles.paragraph}>
            Payment processing:
          </Text>
          <Text style={styles.bulletPoint}>• Passengers pay drivers directly through the app</Text>
          <Text style={styles.bulletPoint}>• We charge a service fee on each transaction</Text>
          <Text style={styles.bulletPoint}>• Refunds are subject to our refund policy</Text>
          <Text style={styles.bulletPoint}>• Drivers are responsible for tax obligations</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Safety and Conduct</Text>
          <Text style={styles.paragraph}>
            All users must:
          </Text>
          <Text style={styles.bulletPoint}>• Treat others with respect and courtesy</Text>
          <Text style={styles.bulletPoint}>• Follow all traffic laws and safety regulations</Text>
          <Text style={styles.bulletPoint}>• Not use the Service while under the influence</Text>
          <Text style={styles.bulletPoint}>• Report safety concerns immediately</Text>
          <Text style={styles.bulletPoint}>• Use emergency features responsibly</Text>
          <Text style={styles.paragraph}>
            Prohibited activities include:
          </Text>
          <Text style={styles.bulletPoint}>• Harassment, discrimination, or violence</Text>
          <Text style={styles.bulletPoint}>• Fraudulent or illegal activities</Text>
          <Text style={styles.bulletPoint}>• Misuse of emergency features</Text>
          <Text style={styles.bulletPoint}>• Sharing false or misleading information</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Privacy and Data</Text>
          <Text style={styles.paragraph}>
            Your privacy is important to us. Please review our Privacy Policy to understand 
            how we collect, use, and protect your information. By using our Service, you 
            consent to our data practices as described in the Privacy Policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Ratings and Reviews</Text>
          <Text style={styles.paragraph}>
            Our rating system helps maintain quality and safety:
          </Text>
          <Text style={styles.bulletPoint}>• Ratings must be honest and based on actual experience</Text>
          <Text style={styles.bulletPoint}>• We may remove inappropriate reviews</Text>
          <Text style={styles.bulletPoint}>• Low ratings may result in account restrictions</Text>
          <Text style={styles.bulletPoint}>• You cannot rate yourself or create fake reviews</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The Service and its content are owned by us and protected by intellectual property laws. 
            You may not copy, modify, distribute, or create derivative works without our permission.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Disclaimers</Text>
          <Text style={styles.paragraph}>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DISCLAIM ALL 
            WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
          </Text>
          <Text style={styles.paragraph}>
            We are not responsible for:
          </Text>
          <Text style={styles.bulletPoint}>• Actions or conduct of drivers or passengers</Text>
          <Text style={styles.bulletPoint}>• Vehicle accidents or injuries</Text>
          <Text style={styles.bulletPoint}>• Loss or damage to personal property</Text>
          <Text style={styles.bulletPoint}>• Service interruptions or technical issues</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, OUR LIABILITY IS LIMITED TO THE AMOUNT 
            YOU PAID FOR THE SERVICE IN THE 12 MONTHS PRECEDING THE CLAIM. WE ARE NOT LIABLE 
            FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to indemnify and hold us harmless from any claims, damages, or expenses 
            arising from your use of the Service, violation of these Terms, or infringement 
            of any rights of another person.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Termination</Text>
          <Text style={styles.paragraph}>
            We may terminate or suspend your account at any time for:
          </Text>
          <Text style={styles.bulletPoint}>• Violation of these Terms</Text>
          <Text style={styles.bulletPoint}>• Fraudulent or illegal activity</Text>
          <Text style={styles.bulletPoint}>• Safety concerns</Text>
          <Text style={styles.bulletPoint}>• Extended inactivity</Text>
          <Text style={styles.paragraph}>
            You may delete your account at any time through the app settings.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>16. Dispute Resolution</Text>
          <Text style={styles.paragraph}>
            Any disputes arising from these Terms will be resolved through binding arbitration 
            in accordance with the rules of [Arbitration Organization]. You waive your right 
            to participate in class action lawsuits.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>17. Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms are governed by the laws of [Your Jurisdiction] without regard to 
            conflict of law principles.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>18. Changes to Terms</Text>
          <Text style={styles.paragraph}>
            We may update these Terms from time to time. We will notify you of material 
            changes by posting the updated Terms in the app. Your continued use of the 
            Service constitutes acceptance of the updated Terms.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>19. Severability</Text>
          <Text style={styles.paragraph}>
            If any provision of these Terms is found to be unenforceable, the remaining 
            provisions will continue in full force and effect.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>20. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have questions about these Terms, please contact us:
          </Text>
          <Text style={styles.bulletPoint}>• Email: legal@dewcarpooling.com</Text>
          <Text style={styles.bulletPoint}>• Address: [Your Company Address]</Text>
          <Text style={styles.bulletPoint}>• Phone: [Your Phone Number]</Text>
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

export default TermsOfServiceScreen;

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

const appName = (Constants as any)?.expoConfig?.name || (Constants as any)?.manifest?.name || 'Dew Carpooling';
const appVersion = (Constants as any)?.expoConfig?.version || (Constants as any)?.manifest?.version || '1.0.0';

const SUPPORT_EMAIL = 'support@dewcarpooling.app';

const openEmail = (subject: string) => {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
  Linking.openURL(mailto).catch(() => {
    // no-op if user cancelled or no email client
  });
};

const openPrivacy = () => {
  Linking.openURL('https://example.com/privacy');
};

const openTerms = () => {
  Linking.openURL('https://example.com/terms');
};

const HelpItem = ({ icon, title, subtitle, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle?: string; onPress?: () => void }) => (
  <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
    <Ionicons name={icon} size={24} color="#3c7d68" style={styles.itemIcon} />
    <View style={styles.itemTextWrapper}>
      <Text style={styles.itemTitle}>{title}</Text>
      {subtitle ? <Text style={styles.itemSubtitle}>{subtitle}</Text> : null}
    </View>
    {onPress ? <Ionicons name="chevron-forward" size={20} color="#8E8E93" /> : null}
  </TouchableOpacity>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <Text style={styles.sectionTitle}>{children}</Text>
);

const HelpScreen: React.FC = () => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionTitle>FAQs</SectionTitle>
        <View style={styles.card}>
          <HelpItem icon="help-circle-outline" title="How do I create a dewdrop?" subtitle="Go to the Create Ride tab and fill the ride details, then publish." />
          <HelpItem icon="navigate-outline" title="How do I find rides to my destination?" subtitle="From Home, search your destination, then select a Dewdrop from Available Rides." />
          <HelpItem icon="shield-checkmark-outline" title="Is my data secure?" subtitle="Your account uses secure authentication and passwords are stored hashed." />
        </View>

        <SectionTitle>Contact</SectionTitle>
        <View style={styles.card}>
          <HelpItem icon="mail-outline" title="Email Support" subtitle={SUPPORT_EMAIL} onPress={() => openEmail(`${appName} Support`)} />
          <HelpItem icon="bug-outline" title="Report a Problem" subtitle="Describe the issue and steps to reproduce" onPress={() => openEmail('Bug Report')} />
        </View>

        <SectionTitle>About</SectionTitle>
        <View style={styles.card}>
          <HelpItem icon="information-circle-outline" title={`${appName}`} subtitle={`Version ${appVersion}`} />
          <HelpItem icon="document-text-outline" title="Terms of Service" onPress={openTerms} />
          <HelpItem icon="lock-closed-outline" title="Privacy Policy" onPress={openPrivacy} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16 },
  sectionTitle: { color: '#8E8E93', fontSize: 14, marginTop: 8, marginBottom: 8, textTransform: 'uppercase' },
  card: {
    backgroundColor: '#0C0C0E',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1C1C1E',
    marginBottom: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  itemIcon: { marginRight: 12 },
  itemTextWrapper: { flex: 1 },
  itemTitle: { color: '#fff', fontSize: 16, marginBottom: 2 },
  itemSubtitle: { color: '#B0B0B0', fontSize: 12 },
});

export default HelpScreen;

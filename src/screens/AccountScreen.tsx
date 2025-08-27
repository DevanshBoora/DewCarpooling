import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMe } from '../api/userService';
import { api } from '../api/client';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';

type TabParamList = {
  Home: undefined;
  Activity: undefined;
  'Create Ride': undefined;
  Messages: undefined;
  Account: undefined;
};

type TabNavigation = BottomTabNavigationProp<TabParamList>;

const AccountScreen: React.FC = () => {
  const navigation = useNavigation<TabNavigation>();
  const stackNav = useNavigation<StackNavigationProp<RootStackParamList, 'AccountDetails'>>();
  const { logout, user: authedUser, refreshMe } = useAuth();

  useFocusEffect(
    React.useCallback(() => {
      // Refresh current user profile when screen comes into focus
      refreshMe();
    }, [refreshMe])
  );

  const display = {
    name: authedUser?.name || 'User',
    avatar: authedUser?.avatar || '',
    ecoImpact: (authedUser as any)?.ecoImpact ?? 75,
    ridesGiven: (authedUser as any)?.ridesGiven ?? 0,
    ridesTaken: (authedUser as any)?.ridesTaken ?? 0,
    co2Saved: (authedUser as any)?.co2Saved ?? 0,
    memberSince: (authedUser as any)?.memberSince || new Date().toISOString(),
  };
  const avatarUri = React.useMemo(() => {
    const a = display.avatar as string;
    if (!a) return '';
    if (a.startsWith('data:') || a.startsWith('http')) return a;
    return `${BASE_URL}/api/files/${a}`;
  }, [display.avatar]);
  const memberSinceDate = new Date(display.memberSince);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - memberSinceDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const memberSinceText = `${diffDays} days`;
  const [communityName, setCommunityName] = React.useState('Loading...');
  
  React.useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        // community could be populated or an id
        const comm: any = me?.community;
        if (comm && typeof comm === 'object' && comm.name) {
          setCommunityName(comm.name);
          return;
        }
        // Fallback: fetch communities and select matching id or only available one
        const communities = await api.get<Array<{ _id: string; name?: string }>>('/api/communities');
        if (Array.isArray(communities) && communities.length) {
          if (typeof comm === 'string') {
            const found = communities.find(c => c._id === comm);
            if (found?.name) { setCommunityName(found.name); return; }
          }
          // If only one, use it
          if (communities.length === 1 && communities[0]?.name) {
            setCommunityName(communities[0].name!);
            return;
          }
        }
        setCommunityName('No Community');
      } catch {
        setCommunityName('No Community');
      }
    })();
  }, []);
  const handleEditProfile = () => stackNav.navigate('EditProfile');
  const handleLogout = () =>
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch (e) {
            // Optionally surface an error
          }
        },
      },
    ]);

  const StatCard = ({ icon, value, label }: { icon: any; value: string | number; label: string }) => (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={28} color="#4CE5B1" />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ActionButton = ({ icon, label, onPress }: { icon: any; label: string; onPress: () => void }) => (
    <Pressable
      style={styles.actionButton}
      onPress={() => {
        try {
          onPress();
        } catch (e) {}
      }}
      hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
      android_ripple={{ color: '#2a2a2a', borderless: true }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.actionIconContainer}>
        <Ionicons name={icon} size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentContainer}>

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{display.name}</Text>
            <Text style={styles.profileCommunity}>{communityName}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFC700" />
              <Text style={styles.ratingText}>{(authedUser as any)?.rating ?? 4.8}</Text>
              <View style={styles.titleBadge}>
                <Text style={styles.titleBadgeText}>Green Champion</Text>
              </View>
            </View>
          </View>
          <Pressable
            style={styles.settingsButton}
            onPress={() => stackNav.navigate('Settings')}
            hitSlop={8}
            android_ripple={{ color: '#2a2a2a', borderless: true }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <Pressable
          style={styles.editProfileButton}
          onPress={handleEditProfile}
          hitSlop={8}
          android_ripple={{ color: '#2a2a2a' }}
          accessibilityRole="button"
          accessibilityLabel="Edit Profile"
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.editProfileButtonText}>Edit Profile</Text>
        </Pressable>

        {/* Offering Rides Card */}
        <Pressable
          style={[styles.card, styles.offeringRidesCard]}
          onPress={() => stackNav.navigate('DriverVerification')}
          hitSlop={8}
          android_ripple={{ color: '#2a2a2a' }}
          accessibilityRole="button"
          accessibilityLabel="Become a Dew Driver"
        >
          <Ionicons name="car-sport-outline" size={32} color="#FFFFFF" />
          <View style={styles.cardContent}>
            <Text style={styles.offeringRidesTitle}>Become a Dew Driver</Text>
            <Text style={styles.offeringRidesSubtitle}>Earn, connect, and reduce your carbon footprint.</Text>
          </View>
          <Ionicons name="chevron-forward-outline" size={24} color="#FFFFFF" />
        </Pressable>

        {/* Eco Impact Card */}
        <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }]}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Eco Impact Level</Text>
            <Text style={styles.ecoPercent}>{display.ecoImpact}%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${display.ecoImpact}%` }]} />
          </View>
          <Text style={styles.cardSubtitle}>Keep sharing to get "Eco Warrior" status!</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="arrow-up-circle-outline" value={display.ridesGiven} label="Rides Given" />
          <StatCard icon="arrow-down-circle-outline" value={display.ridesTaken} label="Rides Taken" />
          <StatCard icon="leaf-outline" value={`${display.co2Saved} kg`} label="CO2 Saved" />
          <StatCard icon="calendar-outline" value={memberSinceText} label="Member Since" />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <ActionButton icon="help-circle-outline" label="Help" onPress={() => stackNav.navigate('Help')} />
          <ActionButton
            icon="leaf-outline"
            label="My Dewdrops"
            onPress={() => {
              // Prefer direct tab navigation; fallback to parent navigator if needed
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              try {
                (navigation as any)?.navigate?.('Activity');
              } catch {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (navigation as any)?.getParent?.()?.navigate?.('Activity');
              }
            }}
          />
          <ActionButton icon="wallet-outline" label="Wallet" onPress={() => Alert.alert('Wallet', 'Open wallet')} />
          <ActionButton icon="log-out-outline" label="Logout" onPress={handleLogout} />
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 16,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileCommunity: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  ratingText: {
    color: '#FFFFFF',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },
  titleBadge: {
    backgroundColor: '#3c7d68',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  titleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  settingsButton: {
    padding: 8,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 24,
  },
  offeringRidesCard: {
    backgroundColor: '#3c7d68',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  offeringRidesTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offeringRidesSubtitle: {
    color: '#E0E0E0',
    fontSize: 12,
    marginTop: 4,
  },
  editProfileButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  card: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
    marginHorizontal: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ecoPercent: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cardSubtitle: {
    color: '#8E8E93',
    fontSize: 14,
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    marginTop: 8,
    marginBottom: 4,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CE5B1',
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
    width: '48%',
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 24,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#1C1C1E',
    marginTop: 16, // Add some margin to separate from stats grid
    backgroundColor: '#000000',
    position: 'relative',
    zIndex: 10,
    elevation: 10,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1C1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    color: '#FFFFFF',
    fontSize: 12,
  },
});

export default AccountScreen;
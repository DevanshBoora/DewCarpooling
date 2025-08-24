import React, { useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  FlatList,
  Alert,
  SafeAreaView,
  Animated
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DewdropCard from '../components/DewdropCard';
import SOSButton from '../components/SOSButton';
import { StackNavigationProp } from '@react-navigation/stack';
import { listRides, Ride, joinRide } from '../api/rideService';
import { getMyContext } from '../api/userService';
import { useFocusEffect } from '@react-navigation/native';

// Local view model for Dewdrop cards
interface Dewdrop {
  id: string;
  driverName: string;
  driverAvatar: string;
  from: string;
  to: string;
  pricePerKm: number;
  availableSeats: number;
  date: string;
  time: string;
  duration: string;
  rating: number;
  dewdropType: string;
  carModel: string;
  distance: number;
  status: 'upcoming' | 'completed' | 'cancelled';
}

type RootStackParamList = {
  HomeScreen: undefined;
  PlanRide: undefined;
  TripOptions: undefined;
  AvailableRides: { destination: { name: string; address: string } };
  AllRides: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'HomeScreen'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [region, setRegion] = useState<Region | null>(null);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [upcomingDewdrops, setUpcomingDewdrops] = useState<Dewdrop[]>([]);
  const mapRef = useRef<MapView>(null);
  const initialRegion: Region = {
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };
  

  const handleFindDewdrop = () => {
    navigation.navigate('PlanRide');
  };


  const handleDewdropPress = async (dewdropId: string) => {
    try {
      const { userId } = await getMyContext();
      if (!userId) throw new Error('Missing user id');
      await joinRide(dewdropId, userId);
      Alert.alert('Joined', 'You have requested a seat in this dewdrop.');
    } catch (e: any) {
      Alert.alert('Join Failed', e?.message || 'Could not join the ride');
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const ctx = await getMyContext();
          if (!ctx.communityId) return;
          if (!cancelled) setCommunityId(ctx.communityId);
          const rides = await listRides(ctx.communityId);
          const mapped: Dewdrop[] = rides
            .filter(r => r.status === 'active')
            .map((r: Ride) => ({
              id: r._id,
              driverName: r.owner?.name || 'Driver',
              driverAvatar: r.owner?.avatar || 'https://i.pravatar.cc/100?img=12',
              from: r.pickupLocation?.name || 'Pickup',
              to: r.dropoffLocation?.name || 'Destination',
              pricePerKm: r.price || 0,
              availableSeats: Math.max(0, (r.capacity || 0) - (r.participants?.length || 0)),
              date: r.departureTime,
              time: new Date(r.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: '—',
              rating: 4.8,
              dewdropType: 'Shared Dewdrop',
              carModel: '—',
              distance: 0,
              status: 'upcoming',
            }));
          if (!cancelled) setUpcomingDewdrops(mapped);
        } catch (e) {
          console.log('Failed to load rides', e);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );


  // Ask for location permission and center map to user
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
      } catch (e) {
        // Location module may not be installed in dev; fail gracefully
        console.log('Location not available', e);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dew</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => Alert.alert('Notifications', 'No new notifications')}>
            <Ionicons name="notifications-outline" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.mapWrapper}>
        <MapView
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          ref={mapRef}
          initialRegion={initialRegion}
          showsUserLocation
          showsMyLocationButton={false}
          mapPadding={{ top: 0, right: 0, bottom: 1, left: 0 }}
          onMapReady={() => {}}
        >
        </MapView>
        
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TouchableOpacity style={styles.searchInput} onPress={handleFindDewdrop}>
            <Text style={styles.searchInputText}>Where to?</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Dewdrops Near You</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AllRides')}>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>
        <FlatList
          data={upcomingDewdrops}
          renderItem={({ item }) => <DewdropCard dewdrop={item} onPress={() => handleDewdropPress(item.id)} isHorizontal={true} />}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Emergency SOS Button */}
      <View style={styles.sosContainer}>
        <SOSButton 
          onEmergencyTriggered={(emergencyId) => {
            console.log('Emergency triggered:', emergencyId);
            Alert.alert('Emergency Alert', 'Your emergency alert has been sent to trusted contacts.');
          }}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'System', // Replace with a custom fancy font if available
  },
  communityName: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: -4,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  mapWrapper: {
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  searchContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 25,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
  },
  searchInputText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  bottomSection: {
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  viewAll: {
    color: '#3c7d68',
    fontSize: 14,
    fontWeight: '600',
  },
  
  sosContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 1000,
  },
});

export default HomeScreen;
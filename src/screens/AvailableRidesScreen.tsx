import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DewdropCard from '../components/DewdropCard';
import { Dewdrop } from '../data/mockData';
import { listRides, Ride, joinRide } from '../api/rideService';
import { getMe, getMyContext } from '../api/userService';

// Assuming this is the root stack param list from App.tsx
export type RootStackParamList = {
  HomeScreen: undefined;
  PlanRide: undefined;
  AvailableRides: { destination: { name: string; address: string } };
  // Note: CreateRide is part of a separate tab stack (see App.tsx). Not in this stack.
};

type AvailableRidesScreenRouteProp = RouteProp<RootStackParamList, 'AvailableRides'>;
type AvailableRidesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AvailableRides'>;

interface AvailableRidesScreenProps {
  route: AvailableRidesScreenRouteProp;
  navigation: AvailableRidesScreenNavigationProp;
}

const AvailableRidesScreen: React.FC<AvailableRidesScreenProps> = ({ route, navigation }) => {
  const { destination } = route.params;
  const [availableDewdrops, setAvailableDewdrops] = useState<Dewdrop[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { communityId } = await getMyContext();
        if (!communityId) return;
        const rides = await listRides(communityId);
        const mapped: Dewdrop[] = rides
          .filter((r) => r.status === 'active' && (r.dropoffLocation?.name || '').toLowerCase() === destination.name.toLowerCase())
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
        setAvailableDewdrops(mapped);
      } catch (e) {
        console.log('Failed to load available rides', e);
      }
    })();
  }, [destination?.name]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{destination.name}</Text>
      </View>

      <FlatList
        data={availableDewdrops}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DewdropCard
            dewdrop={item}
            onPress={async (rideId) => {
              try {
                const { userId } = await getMyContext();
                if (!userId) throw new Error('Missing user id');
                await joinRide(rideId, userId);
              } catch (e) {}
            }}
          />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.noDewsContainer}>
            <Ionicons name="leaf-outline" size={40} color="#666" />
            <Text style={styles.noDewsText}>No rides found for this destination</Text>
          </View>
        }
      />
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
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  noDewsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    marginTop: 50,
  },
  noDewsText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  noDewsSubText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
  createRideButton: {
    marginTop: 24,
    backgroundColor: '#3c7d68',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 30,
  },
  createRideButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AvailableRidesScreen;

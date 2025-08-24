import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity } from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DewdropCard from '../components/DewdropCard';
import { Dewdrop } from '../data/mockData';
import { listRides, Ride, joinRide, getRide } from '../api/rideService';
import { getMe, getMyContext } from '../api/userService';
import { useToast } from '../context/ToastContext';

// Assuming this is the root stack param list from App.tsx
export type RootStackParamList = {
  HomeScreen: undefined;
  PlanRide: undefined;
  AvailableRides: { destination?: { name: string; address: string }; rideId?: string };
  // Note: CreateRide is part of a separate tab stack (see App.tsx). Not in this stack.
};

type AvailableRidesScreenRouteProp = RouteProp<RootStackParamList, 'AvailableRides'>;
type AvailableRidesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AvailableRides'>;

interface AvailableRidesScreenProps {
  route: AvailableRidesScreenRouteProp;
  navigation: AvailableRidesScreenNavigationProp;
}

const AvailableRidesScreen: React.FC<AvailableRidesScreenProps> = ({ route, navigation }) => {
  const { destination, rideId } = route.params;
  const [availableDewdrops, setAvailableDewdrops] = useState<Dewdrop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { show } = useToast();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (rideId) {
          // Load a single ride
          const r = await getRide(rideId);
          if (!r) {
            setAvailableDewdrops([]);
            show('Ride not found', { type: 'error' });
            return;
          }
          const driverName = r.owner?.name || 'Driver';
          const availableSeats = Math.max(0, (r.capacity || 4) - (r.participants?.length || 0));
          const one: Dewdrop = {
            id: r._id,
            driverName,
            driverAvatar: r.owner?.avatar || `https://ui-avatars.com/api/?background=3c7d68&color=fff&name=${encodeURIComponent(driverName)}`,
            from: r.pickupLocation?.name || 'Pickup',
            to: r.dropoffLocation?.name || 'Destination',
            pricePerKm: r.price || 0,
            availableSeats,
            date: r.departureTime,
            time: new Date(r.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: '—',
            rating: (r.owner as any)?.rating ?? 4.8,
            dewdropType: availableSeats >= 2 ? 'Shared Dewdrop' : 'Solo Dewdrop',
            carModel: (r as any).vehicle?.model || 'Vehicle',
            distance: 0,
            status: 'upcoming' as const,
          };
          setAvailableDewdrops([one]);
          return;
        }

        const { communityId } = await getMyContext();
        if (!communityId) { setAvailableDewdrops([]); return; }
        const rides = await listRides(communityId);
        const mapped: Dewdrop[] = rides
          .filter(r => r.status === 'active')
          .filter(r => destination ? (r.dropoffLocation?.name || '').toLowerCase().includes(destination.name.toLowerCase()) : true)
          .map((r: Ride) => {
            const driverName = r.owner?.name || 'Driver';
            const availableSeats = Math.max(0, (r.capacity || 4) - (r.participants?.length || 0));
            return {
              id: r._id,
              driverName,
              driverAvatar: r.owner?.avatar || `https://ui-avatars.com/api/?background=3c7d68&color=fff&name=${encodeURIComponent(driverName)}`,
              from: r.pickupLocation?.name || 'Pickup',
              to: r.dropoffLocation?.name || 'Destination',
              pricePerKm: r.price || 0,
              availableSeats,
              date: r.departureTime,
              time: new Date(r.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              duration: '—',
              rating: (r.owner as any)?.rating ?? 4.8,
              dewdropType: availableSeats >= 2 ? 'Shared Dewdrop' : 'Solo Dewdrop',
              carModel: (r as any).vehicle?.model || 'Vehicle',
              distance: 0,
              status: 'upcoming' as const,
            };
          });
        setAvailableDewdrops(mapped);
      } catch (e: any) {
        show(e?.message || 'Failed to load rides', { type: 'error' });
      } finally {
        setLoading(false);
      }
    })();
  }, [destination, rideId]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={[
        styles.header,
        {
          paddingTop: Math.max(insets.top, 12),
          paddingBottom: 12,
          minHeight: Math.max(insets.top, 0) + 56,
        }
      ]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {rideId ? (availableDewdrops[0]?.to || 'Ride') : (destination?.name || 'Available rides')}
        </Text>
      </View>

      {loading ? (
        <View style={[styles.noDewsContainer, { marginTop: 0 }]}>
          <Ionicons name="time-outline" size={24} color="#8E8E93" />
          <Text style={styles.noDewsText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={availableDewdrops}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DewdropCard
              dewdrop={item}
              hideDestination={Boolean(destination) || Boolean(rideId)}
              onPress={async (rideId) => {
                try {
                  const { userId } = await getMyContext();
                  if (!userId) throw new Error('Missing user id');
                  await joinRide(rideId, userId);
                  show('Seat requested', { type: 'success' });
                  const parent = navigation.getParent?.();
                  if (parent) parent.navigate('Activity' as never);
                } catch (e: any) {
                  show(e?.message || 'Could not request a seat', { type: 'error' });
                }
              }}
            />
          )}
          contentContainerStyle={[styles.listContainer, { paddingTop: 16 }]}
          ListEmptyComponent={
            <View style={styles.noDewsContainer}>
              <Ionicons name="leaf-outline" size={40} color="#666" />
              <Text style={styles.noDewsText}>No rides found for this destination</Text>
            </View>
          }
        />
      )}
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

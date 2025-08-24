import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DewdropCard from '../components/DewdropCard';
import { getMyContext } from '../api/userService';
import { listRides, Ride } from '../api/rideService';

// Haversine distance calculation
const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round((R * c) * 10) / 10;
};
import { api } from '../api/client';
import { RootStackParamList } from '../types/navigation';
import { BASE_URL } from '../config';

type AllRidesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AllRides'>;

interface AllRidesScreenProps {
  navigation: AllRidesScreenNavigationProp;
}

// Local interface for display data
interface DewdropDisplay {
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

const AllRidesScreen: React.FC<AllRidesScreenProps> = ({ navigation }) => {
  const [dewdrops, setDewdrops] = useState<DewdropDisplay[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user's community and load rides
        const { communityId } = await getMyContext();
        if (!communityId) throw new Error('No community found');
        const rides = await listRides(communityId);

        // Get Gauthami Enclave coordinates for distance calculation
        let enclaveLat: number | null = null;
        let enclaveLng: number | null = null;
        try {
          const places = await api.get<any[]>(`/api/communities/${encodeURIComponent(communityId)}/places`);
          const norm = (s: string) => (s || '').trim().toLowerCase();
          const exact = (places || []).find(p => typeof p?.name === 'string' && norm(p.name) === 'gauthami enclave');
          const partial = (places || []).find(p => typeof p?.name === 'string' && norm(p.name).includes('gauthami'));
          const target = exact || partial;
          if (target?.location && typeof target.location.lat === 'number' && typeof target.location.lng === 'number') {
            enclaveLat = target.location.lat;
            enclaveLng = target.location.lng;
          }
        } catch {}

        // Map rides to display format
        const mapped = (rides as Ride[]).map((r) => {
          const departure = r.departureTime ? new Date(r.departureTime) : new Date();
          const timeStr = departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dropName = r.dropoffLocation?.name || 'Destination';
          const driverName = r.owner?.name || 'Driver';
          // Normalize avatar: support ObjectId or relative paths from backend
          const rawAvatar = (r.owner as any)?.avatar?.trim?.() || '';
          const isObjectId = /^[a-f\d]{24}$/i.test(rawAvatar);
          const normalizedPath = isObjectId
            ? `/api/files/${rawAvatar}`
            : (rawAvatar.startsWith('/') ? rawAvatar : rawAvatar);
          const absoluteAvatar = rawAvatar
            ? (rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://') || rawAvatar.startsWith('data:')
                ? rawAvatar
                : `${BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`)
            : '';
          const driverAvatar = absoluteAvatar || `https://ui-avatars.com/api/?background=3c7d68&color=fff&name=${encodeURIComponent(driverName)}`;
          const participants = Array.isArray(r.participants) ? r.participants.length : 0;
          const availableSeats = Math.max(0, (r.capacity || 4) - participants);
          const mappedStatus: DewdropDisplay['status'] = r.status === 'active' ? 'upcoming' : (r.status as 'completed' | 'cancelled');
          return {
            id: r._id,
            driverName,
            driverAvatar,
            from: r.pickupLocation?.name || 'Pickup',
            to: dropName,
            pricePerKm: r.price || 0,
            availableSeats,
            date: departure.toISOString().slice(0, 10),
            time: timeStr,
            duration: '30 min',
            rating: (r.owner as any)?.rating ?? 4.8,
            dewdropType: availableSeats >= 2 ? 'Shared Dewdrop' : 'Solo Dewdrop',
            carModel: (r as any).vehicle?.model || 'Vehicle',
            distance: (() => {
              const drop = r.dropoffLocation?.coordinates?.coordinates;
              const pick = r.pickupLocation?.coordinates?.coordinates;
              if (drop && typeof drop[1] === 'number' && typeof drop[0] === 'number') {
                if (typeof enclaveLat === 'number' && typeof enclaveLng === 'number') {
                  return distanceKm(enclaveLat, enclaveLng, drop[1], drop[0]);
                } else if (pick && typeof pick[1] === 'number' && typeof pick[0] === 'number') {
                  return distanceKm(pick[1], pick[0], drop[1], drop[0]);
                }
              }
              return 0;
            })(),
            status: mappedStatus,
          } as DewdropDisplay;
        });

        setDewdrops(mapped);
      } catch (e: any) {
        setError(e?.message || 'Failed to load rides');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const upcomingDewdrops = dewdrops.filter(dewdrop => dewdrop.status === 'upcoming');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Available Dewdrops</Text>
      </View>

      {loading && (
        <View style={{ padding: 16 }}>
          <ActivityIndicator color="#3c7d68" />
        </View>
      )}
      {!!error && !loading && (
        <View style={{ padding: 16 }}>
          <Text style={{ color: '#FF6B6B' }}>{error}</Text>
        </View>
      )}

      <FlatList
        data={upcomingDewdrops}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <DewdropCard
            dewdrop={item}
            onPress={(id) => navigation.navigate('RideDetails', { id })}
          />
        )}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.noDewsContainer}>
            <Ionicons name="sunny-outline" size={60} color="#8E8E93" />
            <Text style={styles.noDewsText}>No upcoming dewdrops right now.</Text>
            <Text style={styles.noDewsSubText}>Check back later!</Text>
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
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  noDewsSubText: {
    color: '#8E8E93',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default AllRidesScreen;

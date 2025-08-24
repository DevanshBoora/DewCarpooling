import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import DewdropCard from '../components/DewdropCard';
import { Dewdrop, userProfile, communities as mockCommunities } from '../data/mockData';
import { api } from '../api/client';
import { RootStackParamList } from '../types/navigation';

type AllRidesScreenNavigationProp = StackNavigationProp<RootStackParamList, 'AllRides'>;

interface AllRidesScreenProps {
  navigation: AllRidesScreenNavigationProp;
}

const AllRidesScreen: React.FC<AllRidesScreenProps> = ({ navigation }) => {
  const [dewdrops, setDewdrops] = useState<Dewdrop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // 1) Get community by name based on userProfile.communityId from mock data
        const desiredCommunityName = mockCommunities[userProfile.communityId as keyof typeof mockCommunities].name;
        const communities = await api.get<any[]>(`/api/communities`);
        const community = (communities as any[]).find(c => c.name === desiredCommunityName) || communities[0];
        if (!community?._id) throw new Error('No community found');

        // 2) Load rides for that community
        const rides = await api.get<any[]>(`/api/rides?community=${community._id}`);

        // 3) Map rides -> Dewdrop
        const mapped: Dewdrop[] = (rides as any[]).map((r) => {
          const departure = r.departureTime ? new Date(r.departureTime) : new Date();
          const timeStr = departure.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dropName = r.dropoffLocation?.name || 'Destination';
          const driverName = r.owner?.name || 'Driver';
          const driverAvatar = r.owner?.avatar || 'https://randomuser.me/api/portraits/men/32.jpg';
          const participants = Array.isArray(r.participants) ? r.participants.length : 0;
          const availableSeats = Math.max(0, 4 - participants); // simple placeholder logic
          const mappedStatus: Dewdrop['status'] = r.status === 'active' ? 'upcoming' : (r.status as 'completed' | 'cancelled');
          return {
            id: r._id,
            driverName,
            driverAvatar,
            from: r.pickupLocation?.name || 'Pickup',
            to: dropName,
            pricePerKm: 7,
            availableSeats,
            date: departure.toISOString().slice(0, 10),
            time: timeStr,
            duration: '30 min',
            rating: r.owner?.rating ?? 4.8,
            dewdropType: availableSeats >= 2 ? 'Shared Dewdrop' : 'Solo Dewdrop',
            carModel: 'Maruti Swift',
            distance: 8,
            status: mappedStatus,
          } as Dewdrop;
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

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Image, ScrollView, Alert } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../types/navigation';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Props = StackScreenProps<RootStackParamList, 'RideDetails'>;

const RideDetailsScreen: React.FC<Props> = ({ route, navigation }) => {
  const { id } = route.params;
  const [ride, setRide] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<any>(`/api/rides/${id}`);
        setRide(data);
      } catch (e: any) {
        setError(e?.message || 'Failed to load ride');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const onJoin = async () => {
    try {
      setJoining(true);
      if (!isAuthenticated || !user?._id) {
        Alert.alert('Sign in required', 'Please log in to join rides.');
        return;
      }
      await api.post(`/api/rides/${id}/join`, { userId: user._id });
      Alert.alert('Joined ride', 'You have successfully joined this ride.');
    } catch (e: any) {
      Alert.alert('Join failed', e?.message || 'Could not join ride');
    } finally {
      setJoining(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
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

      {!loading && !!ride && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.card}>
            <View style={styles.row}>
              <Image source={{ uri: ride.owner?.avatar || 'https://randomuser.me/api/portraits/men/32.jpg' }} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{ride.owner?.name || 'Driver'}</Text>
                <Text style={styles.subtle}>Rating: {(ride.owner?.rating ?? 4.8).toFixed(1)}</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>From</Text>
              <Text style={styles.value}>{ride.pickupLocation?.name || 'Pickup'}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>To</Text>
              <Text style={styles.value}>{ride.dropoffLocation?.name || 'Destination'}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Departure</Text>
              <Text style={styles.value}>{new Date(ride.departureTime).toLocaleString()}</Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Status</Text>
              <Text style={styles.value}>{ride.status}</Text>
            </View>

            <TouchableOpacity style={styles.joinBtn} onPress={onJoin} disabled={joining}>
              <Text style={styles.joinBtnText}>{joining ? 'Joining...' : 'Join Ride'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginLeft: 16 },
  content: { padding: 16 },
  card: { backgroundColor: '#1C1C1E', borderRadius: 12, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 50, height: 50, borderRadius: 25, marginRight: 12 },
  title: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  subtle: { color: '#8E8E93', marginTop: 4 },
  section: { marginTop: 12 },
  label: { color: '#8E8E93', fontSize: 12, marginBottom: 6 },
  value: { color: '#FFF', fontSize: 16 },
  joinBtn: {
    marginTop: 20,
    backgroundColor: '#3c7d68',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default RideDetailsScreen;

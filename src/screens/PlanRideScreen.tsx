import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { api } from '../api/client';
import { getMyContext } from '../api/userService';
import { listRides, Ride } from '../api/rideService';

type RootStackParamList = {
  PlanRide: undefined;
  AvailableRides: { destination?: { name: string; address: string }; rideId?: string };
};

type PlanRideNavigationProp = StackNavigationProp<RootStackParamList, 'PlanRide'>;

interface PlanRideScreenProps {
  navigation: PlanRideNavigationProp;
}

const PlanRideScreen: React.FC<PlanRideScreenProps> = ({ navigation }) => {
  const [destination, setDestination] = useState('');
  const [places, setPlaces] = useState<Array<{ id: string; name: string; address: string; rideId?: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { communityId } = await getMyContext();
        if (!communityId) {
          setPlaces([]);
          setUsedFallback(false);
          return;
        }

        // Build suggestions directly from active rides in this community
        const rides = await listRides(communityId);
        const activeRides = (rides || []).filter(r => r.status === 'active');
        const norm = (s: string) => (s || '').trim().toLowerCase();
        const seen = new Set<string>();
        const suggestions: Array<{ id: string; name: string; address: string; rideId?: string }> = [];
        for (const r of activeRides) {
          const name = r.dropoffLocation?.name || 'Destination';
          const addrRaw = r.dropoffLocation?.address || r.dropoffLocation?.name || '';
          const address = norm(addrRaw) === norm(name) ? '' : addrRaw; // hide grey line if duplicate
          const key = norm(name);
          if (seen.has(key)) continue; // dedupe by destination name
          seen.add(key);
          suggestions.push({ id: r._id, name, address, rideId: r._id });
          if (suggestions.length >= 15) break;
        }
        setPlaces(suggestions);
        setUsedFallback(false);
      } catch (e: any) {
        setPlaces([]);
        setUsedFallback(false);
        setError(e?.message || 'Failed to load suggestions');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSelectPlace = (place: { name: string; address: string; rideId?: string }) => {
    if (place.rideId) {
      navigation.navigate('AvailableRides', { rideId: place.rideId });
    } else {
      navigation.navigate('AvailableRides', { destination: { name: place.name, address: place.address } });
    }
  };

  const filteredPlaces = destination
    ? places.filter(place => place.name.toLowerCase().includes(destination.toLowerCase()))
    : places;

  const listHeaderText = loading ? 'Loading…' : 'Rides you can join';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100} style={{ flex: 1 }}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="search" size={24} color="#8E8E93" style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              placeholder="Where to?"
              placeholderTextColor="#8E8E93"
              value={destination}
              onChangeText={setDestination}
              autoFocus={true}
              returnKeyType="search"
            />
          </View>
        </View>

        {error ? (
          <View style={[styles.centerBox, { paddingBottom: 24 }] }>
            <Ionicons name="warning-outline" size={28} color="#FF453A" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPlaces}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.placeItem} onPress={() => handleSelectPlace(item)}>
                <Text style={styles.placeName}>{item.name}</Text>
                {!!item.address && <Text style={styles.placeAddress}>{item.address}</Text>}
              </TouchableOpacity>
            )}
            ListHeaderComponent={<Text style={styles.listHeader}>{listHeaderText}</Text>}
            ListEmptyComponent={!loading ? (
              <View style={[styles.centerBox, { paddingBottom: 48 }] }>
                <Ionicons name="search" size={28} color="#8E8E93" />
                <Text style={styles.emptyText}>No places found</Text>
              </View>
            ) : null}
            contentContainerStyle={[filteredPlaces.length === 0 ? { flexGrow: 1 } : undefined, { paddingBottom: 40 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          />
        )}
      </KeyboardAvoidingView>
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
    padding: 16,
  },
  inputContainer: {
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  listHeader: {
    color: '#8E8E93',
    fontSize: 14,
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
  },
  placeItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1C1C1E',
  },
  placeName: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
  },
  placeAddress: {
    color: '#8E8E93',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorText: {
    color: '#FF453A',
    marginTop: 8,
  },
  emptyText: {
    color: '#8E8E93',
    marginTop: 8,
  },
});

export default PlanRideScreen;

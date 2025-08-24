import React, { useMemo, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { getMyContext } from '../api/userService';
import { listRides, Ride } from '../api/rideService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  TripOptions: { destination: { name: string; address: string } };
  AvailableRides: { destination?: { name: string; address: string }; rideId?: string };
};

type TripOptionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TripOptions'>;
type TripOptionsScreenRouteProp = RouteProp<RootStackParamList, 'TripOptions'>;

interface TripOptionsScreenProps {
  navigation: TripOptionsScreenNavigationProp;
  route: TripOptionsScreenRouteProp;
}

const TripOptionsScreen: React.FC<TripOptionsScreenProps> = ({ navigation, route }) => {
  const { destination } = route.params;
  const insets = useSafeAreaInsets();

  // Approximate origin and destination coordinates
  const origin = useMemo(() => ({ latitude: 17.3999, longitude: 78.35, name: 'Home' }), []);
  const destCoords = useMemo(() => ({ latitude: 17.4202, longitude: 78.3402 }), []);

  // Memoized region to prevent MapView re-renders
  const initialRegion = useMemo(() => ({
    latitude: (origin.latitude + destCoords.latitude) / 2,
    longitude: (origin.longitude + destCoords.longitude) / 2,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }), [origin, destCoords]);

  // Suggestions from active rides in user's community
  const [suggestedDrops, setSuggestedDrops] = useState<Array<{ name: string; rideId: string }>>([]);
  useEffect(() => {
    (async () => {
      try {
        const { communityId } = await getMyContext();
        if (!communityId) { setSuggestedDrops([]); return; }
        const rides = await listRides(communityId);
        const active = (rides || []).filter(r => r.status === 'active');
        // One pill per unique destination name (case-insensitive, trimmed)
        const seen = new Set<string>();
        const norm = (s: string) => (s || '').trim().toLowerCase();
        const picks: Array<{ name: string; rideId: string }> = [];
        for (const r of active) {
          const name = r?.dropoffLocation?.name;
          if (!name) continue;
          const k = norm(name);
          if (seen.has(k)) continue;
          seen.add(k);
          picks.push({ name, rideId: r._id });
          if (picks.length >= 8) break;
        }
        setSuggestedDrops(picks);
      } catch {
        setSuggestedDrops([]);
      }
    })();
  }, []);

  const onSelectSuggestion = useCallback((rideId: string) => {
    navigation.navigate('AvailableRides', { rideId });
  }, [navigation]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <MapView
        style={styles.map}
        provider="google"
        initialRegion={initialRegion}
        liteMode
      >
        <Marker coordinate={origin} title="Home" pinColor="#00FF00" />
        <Marker coordinate={destCoords} title={destination.name} />
        <Polyline coordinates={[origin, destCoords]} strokeColor="#FFFFFF" strokeWidth={4} />
      </MapView>

      <TouchableOpacity style={[styles.backButton, { top: Math.max(insets.top + 12, 20) }]} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#000000" />
      </TouchableOpacity>

      <View style={[styles.bottomSheet, { paddingBottom: 24 + insets.bottom }]}>
        <Text style={styles.sheetTitle}>Choose a trip</Text>

        <TouchableOpacity style={styles.tripOption} activeOpacity={0.8}>
          <Image source={{ uri: 'https://img.icons8.com/ios-filled/50/ffffff/car.png' }} style={styles.carIcon} />
          <View style={styles.tripDetails}>
            <Text style={styles.tripName}>Dewdrop</Text>
            <Text style={styles.tripTime}>10:05 AM drop-off</Text>
          </View>
          <Text style={styles.tripPrice}>₹121.00</Text>
        </TouchableOpacity>

        <View style={styles.paymentContainer}>
          <Image source={{ uri: 'https://img.icons8.com/color/48/000000/cash-in-hand.png' }} style={styles.paymentIcon} />
          <Text style={styles.paymentText}>Cash</Text>
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </View>

        <TouchableOpacity style={styles.confirmButton} onPress={() => navigation.navigate('AvailableRides', { destination })}>
          <Text style={styles.confirmButtonText}>Select Dewdrop</Text>
        </TouchableOpacity>

        <View style={styles.suggestSection}>
          <Text style={styles.suggestTitle}>Rides heading to…</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestList}>
            {suggestedDrops.map((s) => (
              <TouchableOpacity key={s.rideId} style={styles.suggestPill} onPress={() => onSelectSuggestion(s.rideId)}>
                <Ionicons name="location" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.suggestText} numberOfLines={1} ellipsizeMode="tail">{s.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#FFFFFF',
    padding: 8,
    borderRadius: 20,
    elevation: 5,
    zIndex: 20,
  },
  bottomSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1C1C1E',
    padding: 16,
    paddingTop: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 10,
  },
  sheetTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  tripOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  carIcon: {
    width: 40,
    height: 40,
    marginRight: 16,
  },
  tripDetails: {
    flex: 1,
  },
  tripName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tripTime: {
    color: '#8E8E93',
    fontSize: 14,
  },
  tripPrice: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paymentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333333',
    marginBottom: 16,
  },
  paymentIcon: {
    width: 24,
    height: 24,
    marginRight: 12,
  },
  paymentText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  confirmButton: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  suggestSection: {
    marginTop: 16,
  },
  suggestTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  suggestList: {
    paddingVertical: 4,
  },
  suggestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  suggestText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 16,
    maxWidth: 180,
    flexShrink: 1,
  },
});

export default TripOptionsScreen;


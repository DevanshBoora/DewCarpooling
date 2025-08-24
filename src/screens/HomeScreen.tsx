import React, { useRef, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList,
  Alert,
  SafeAreaView
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, Region, Marker, Polygon } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import DewdropCard from '../components/DewdropCard';
import SOSButton from '../components/SOSButton';
import { StackNavigationProp } from '@react-navigation/stack';
import { listRides, Ride, joinRide } from '../api/rideService';
import { getMyContext } from '../api/userService';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import { BASE_URL } from '../config';
import { useToast } from '../context/ToastContext';

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
  const { show, hide } = useToast();
  const [communityId, setCommunityId] = useState<string | null>(null);
  const [upcomingDewdrops, setUpcomingDewdrops] = useState<Dewdrop[]>([]);
  const mapRef = useRef<MapView>(null);
  const [communityBox, setCommunityBox] = useState<{
    center: { latitude: number; longitude: number };
    corners: { latitude: number; longitude: number }[];
    name: string;
  } | null>(null);
  // Default to Gauthami Enclave to avoid SF flash
  const initialRegion: Region = {
    latitude: 17.465704,
    longitude: 78.350112,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  };
  
  // Haversine distance in km
  const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round((R * c) * 10) / 10; // 0.1 km precision
  };

  // Compute convex hull (Monotone chain). Treat longitude as X, latitude as Y.
  const convexHull = (points: { latitude: number; longitude: number }[]): { latitude: number; longitude: number }[] => {
    const pts = points
      .filter(p => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map(p => ({ x: p.longitude, y: p.latitude }));
    if (pts.length <= 3) return points;
    pts.sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const cross = (o: any, a: any, b: any) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: any[] = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper: any[] = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    const hull = lower.slice(0, lower.length - 1).concat(upper.slice(0, upper.length - 1));
    return hull.map(p => ({ latitude: p.y, longitude: p.x }));
  };

  // Scale polygon outward/inward from its centroid. Factor > 1 slightly enlarges the shape.
  const scalePolygon = (points: { latitude: number; longitude: number }[], factor: number) => {
    if (!points.length) return points;
    const cx = points.reduce((s, p) => s + p.longitude, 0) / points.length;
    const cy = points.reduce((s, p) => s + p.latitude, 0) / points.length;
    return points.map(p => ({
      latitude: cy + (p.latitude - cy) * factor,
      longitude: cx + (p.longitude - cx) * factor,
    }));
  };

  const handleFindDewdrop = () => {
    navigation.navigate('PlanRide');
  };


  const handleDewdropPress = async (dewdropId: string) => {
    try {
      const { userId } = await getMyContext();
      if (!userId) throw new Error('Missing user id');
      await joinRide(dewdropId, userId);
      show('Seat requested', { type: 'success' });
      // Optimistically remove from Home list
      setUpcomingDewdrops(prev => prev.filter(d => d.id !== dewdropId));
      // Navigate to Activity (Upcoming)
      const parent = (navigation as any)?.getParent?.();
      if (parent) parent.navigate('Activity');
    } catch (e: any) {
      show(e?.message || 'Could not join the ride', { type: 'error' });
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

          // Load all community places and compute a bounding box for the whole community
          let enclaveLat: number | null = null;
          let enclaveLng: number | null = null;
          let enclaveName: string = 'Gauthami Enclave';
          let bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number } | null = null;
          try {
            const places = await api.get<any[]>(`/api/communities/${encodeURIComponent(ctx.communityId)}/places`);
            const norm = (s: string) => (s || '').trim().toLowerCase();
            // Prefer a named place for label
            const labelPlace = (places || []).find(p => typeof p?.name === 'string' && norm(p.name).includes('gauthami')) || (places || [])[0];
            if (labelPlace?.name) enclaveName = String(labelPlace.name);
            // Compute bbox across all places with valid lat/lng
            for (const p of (places || [])) {
              const lat = p?.location?.lat; const lng = p?.location?.lng;
              if (typeof lat === 'number' && typeof lng === 'number') {
                if (!bbox) bbox = { minLat: lat, maxLat: lat, minLng: lng, maxLng: lng };
                else {
                  bbox.minLat = Math.min(bbox.minLat, lat);
                  bbox.maxLat = Math.max(bbox.maxLat, lat);
                  bbox.minLng = Math.min(bbox.minLng, lng);
                  bbox.maxLng = Math.max(bbox.maxLng, lng);
                }
              }
            }
            // Also keep a reasonable center fallback
            if (bbox) {
              enclaveLat = (bbox.minLat + bbox.maxLat) / 2;
              enclaveLng = (bbox.minLng + bbox.maxLng) / 2;
            }
          } catch {}

          // Fallback if places API didn't provide coords
          if (typeof enclaveLat !== 'number' || typeof enclaveLng !== 'number') {
            enclaveLat = 17.465704;
            enclaveLng = 78.350112;
          }

          if (typeof enclaveLat === 'number' && typeof enclaveLng === 'number') {
            // Prefer a precise convex hull polygon of community places when available
            let corners: { latitude: number; longitude: number }[];
            let hullCorners: { latitude: number; longitude: number }[] | null = null;
            try {
              const places = await api.get<any[]>(`/api/communities/${encodeURIComponent(ctx.communityId)}/places`);
              const pts = (places || [])
                .map(p => ({ latitude: p?.location?.lat as number, longitude: p?.location?.lng as number }))
                .filter(p => typeof p.latitude === 'number' && typeof p.longitude === 'number');
              if (pts.length >= 3) {
                const hull = convexHull(pts);
                // Slight outward scale for tasteful margin (tighter)
                hullCorners = scalePolygon(hull, 1.02);
              }
            } catch {}

            if (hullCorners && hullCorners.length >= 3) {
              corners = hullCorners;
            } else if (bbox) {
              // Conservative padded rectangle fallback
              const spanLat = Math.max(bbox.maxLat - bbox.minLat, 0.02);
              const spanLng = Math.max(bbox.maxLng - bbox.minLng, 0.03);
              const padLat = spanLat * 0.1;
              const padLng = spanLng * 0.1;
              const minLat = bbox.minLat - padLat;
              const maxLat = bbox.maxLat + padLat;
              const minLng = bbox.minLng - padLng;
              const maxLng = bbox.maxLng + padLng;
              corners = [
                { latitude: maxLat, longitude: minLng },
                { latitude: maxLat, longitude: maxLng },
                { latitude: minLat, longitude: maxLng },
                { latitude: minLat, longitude: minLng },
              ];
            } else {
              const BOX_DELTA_LAT = 0.002;
              const BOX_DELTA_LNG = 0.0025;
              corners = [
                { latitude: enclaveLat + BOX_DELTA_LAT, longitude: enclaveLng - BOX_DELTA_LNG },
                { latitude: enclaveLat + BOX_DELTA_LAT, longitude: enclaveLng + BOX_DELTA_LNG },
                { latitude: enclaveLat - BOX_DELTA_LAT, longitude: enclaveLng + BOX_DELTA_LNG },
                { latitude: enclaveLat - BOX_DELTA_LAT, longitude: enclaveLng - BOX_DELTA_LNG },
              ];
            }
            if (!cancelled) {
              setCommunityBox({ center: { latitude: enclaveLat, longitude: enclaveLng }, corners, name: enclaveName });
            }
            setTimeout(() => {
              // Balance top vs bottom so it's clear of the search bar and bottom menu
              mapRef.current?.fitToCoordinates(corners, { edgePadding: { top: 340, right: 64, bottom: 96, left: 64 }, animated: true });
              try {
                (mapRef.current as any)?.animateCamera?.({ center: { latitude: enclaveLat!, longitude: enclaveLng! }, zoom: 15.8 }, { duration: 600 });
              } catch {}
            }, 500);
          }

          const myId = ctx.userId;
          const mapped: Dewdrop[] = rides
            .filter(r => r.status === 'active')
            // Exclude rides the current user has already joined/requested
            .filter(r => {
              const pids = Array.isArray(r.participants)
                ? (r.participants as any[]).map(p => (typeof p === 'string' ? p : p?._id)).filter(Boolean)
                : [];
              return !myId || !pids.includes(myId);
            })
            .map((r: Ride) => {
              const drop = r.dropoffLocation?.coordinates?.coordinates; // [lng, lat]
              const pick = r.pickupLocation?.coordinates?.coordinates; // [lng, lat]
              let dist = 0;
              if (drop && typeof drop[1] === 'number' && typeof drop[0] === 'number') {
                if (typeof enclaveLat === 'number' && typeof enclaveLng === 'number') {
                  dist = distanceKm(enclaveLat, enclaveLng, drop[1], drop[0]);
                } else if (pick && typeof pick[1] === 'number' && typeof pick[0] === 'number') {
                  // Fallback: pickup -> dropoff distance
                  dist = distanceKm(pick[1], pick[0], drop[1], drop[0]);
                }
              }
              // Ensure non-negative and single-decimal precision for UI
              dist = Math.max(0, Number.isFinite(dist) ? parseFloat(dist.toFixed(1)) : 0);
              // Normalize driver avatar URL: absolute if relative path is returned by backend
              const rawAvatar = r.owner?.avatar?.trim?.() || '';
              const isObjectId = /^[a-f\d]{24}$/i.test(rawAvatar);
              const normalizedPath = isObjectId
                ? `/api/files/${rawAvatar}`
                : (rawAvatar.startsWith('/') ? rawAvatar : rawAvatar);
              const absoluteAvatar = rawAvatar
                ? (rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://') || rawAvatar.startsWith('data:')
                    ? rawAvatar
                    : `${BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`)
                : '';
              const ownerRating = (r as any).owner?.rating;
              return {
                id: r._id,
                driverName: r.owner?.name || 'Driver',
                driverAvatar: absoluteAvatar || `https://ui-avatars.com/api/?background=3c7d68&color=fff&name=${encodeURIComponent(r.owner?.name || 'Driver')}`,
                from: '',
                to: r.dropoffLocation?.name || 'Destination',
                pricePerKm: r.price || 0,
                availableSeats: Math.max(0, (r.capacity || 0) - (r.participants?.length || 0)),
                date: r.departureTime,
                time: new Date(r.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                duration: '—',
                // Keep 0 if explicitly provided by backend; only fallback when undefined/null
                rating: (typeof ownerRating === 'number' && Number.isFinite(ownerRating)) ? ownerRating : 4.8,
                dewdropType: 'Shared Dewdrop',
                carModel: '',
                distance: dist,
                status: 'upcoming',
              } as Dewdrop;
            });
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


  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Dew</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.iconButton} onPress={() => show('No new notifications', { type: 'info' })}>
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
          mapPadding={{ top: 60, right: 0, bottom: 1, left: 0 }}
          onMapReady={() => {}}
        >
          {communityBox && (
            <>
              <Polygon
                coordinates={communityBox.corners}
                strokeColor="rgb(36, 139, 70)"
                strokeWidth={3}
                fillColor="rgba(46, 110, 38, 0.18)"
              />
              <Marker coordinate={communityBox.center} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.communityBadge}>
                  <Text style={styles.communityBadgeText}>{communityBox.name}</Text>
                </View>
              </Marker>
            </>
          )}
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
            show('Emergency alert sent to trusted contacts', { type: 'info' });
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
    height: 270,
    borderRadius: 16,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 8,
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
    marginTop: 38,
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
  communityBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(60,125,104,0.8)',
  },
  communityBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Corner marker styles for the community box
  cornerMarker: {
    width: 22,
    height: 22,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderColor: 'rgba(60,125,104,0.95)',
    borderWidth: 3,
    borderRadius: 6,
    shadowColor: '#3c7d68',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  cornerTL: {
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTR: {
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBR: {
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  cornerBL: {
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  
  sosContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    zIndex: 1000,
  },
});

export default HomeScreen;
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { getMe, getMyContext } from '../api/userService';
import { createRide } from '../api/rideService';
import * as Location from 'expo-location';
import type { PlacePrediction } from '../api/googleMaps';
import { searchPlacesNominatim, haversineDistanceKm } from '../api/openMaps';

type RootStackParamList = {
  CreateRide: undefined;
  HomeScreen: undefined;
};

type CreateRideScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateRide'>;

interface CreateRideScreenProps {
  navigation: CreateRideScreenNavigationProp;
}

const CreateRideScreen: React.FC<CreateRideScreenProps> = ({ navigation }) => {
  const [destination, setDestination] = useState('');
  const [destAddress, setDestAddress] = useState('');
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [searching, setSearching] = useState(false);
  const [osmIndex, setOsmIndex] = useState<Record<string, { lat: number; lng: number; name: string; address: string }>>({});
  const [distanceText, setDistanceText] = useState<string>('');
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [seats, setSeats] = useState('');
  const [pricePerKm, setPricePerKm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    if (event.type === 'set') {
      setDate(currentDate);
    }
  };

  const onChangeTime = (event: any, selectedTime?: Date) => {
    const currentTime = selectedTime || time;
    if (event.type === 'set') {
      setTime(currentTime);
    }
  };

  // Ask for location permission and get current location as pickup
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({});
        setOriginCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      } catch {}
    })();
  }, []);

  // Autocomplete when typing destination (OSM primary)
  React.useEffect(() => {
    let active = true;
    const run = async () => {
      const q = destination.trim();
      if (q.length < 2) { setSuggestions([]); return; }
      setSearching(true);
      try {
        // OSM primary
        const osm = await searchPlacesNominatim(q, 6, ['in']);
        if (active) {
          const idx: Record<string, { lat: number; lng: number; name: string; address: string }> = {};
          const mapped: PlacePrediction[] = osm.map((p) => {
            const pid = `osm:${p.id}`;
            idx[pid] = { lat: p.lat, lng: p.lon, name: p.name, address: p.displayName };
            return {
              place_id: pid,
              description: p.displayName,
              structured_formatting: {
                main_text: p.name,
                secondary_text: p.displayName.replace(p.name, '').replace(/^,\s*/, ''),
              },
            } as PlacePrediction;
          });
          setOsmIndex(idx);
          setSuggestions(mapped);
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    };
    const t = setTimeout(run, 250);
    return () => { active = false; clearTimeout(t); };
  }, [destination]);

  const onSelectPrediction = async (p: PlacePrediction) => {
    try {
      if (p.place_id.startsWith('osm:')) {
        // OSM path
        const info = osmIndex[p.place_id];
        if (!info) return;
        setDestination(info.name);
        setDestAddress(info.address);
        setDestCoords({ lat: info.lat, lng: info.lng });
        setSuggestions([]);
        if (originCoords) {
          const km = haversineDistanceKm({ lat: originCoords.lat, lon: originCoords.lng }, { lat: info.lat, lon: info.lng });
          setDistanceText(km ? `Approx ${km.toFixed(1)} km` : '');
        }
        return;
      }
      // Ignore any non-OSM predictions
    } catch {}
  };


  const handlePublishRide = async () => {
    if (!destination || !seats || !pricePerKm) {
      Alert.alert('Incomplete Information', 'Please fill out all fields to publish your ride.');
      return;
    }

    try {
      setSubmitting(true);
      const { userId, communityId } = await getMyContext();
      if (!userId || !communityId) {
        throw new Error('Could not resolve current user or community');
      }

      const capacity = parseInt(seats, 10);
      const price = parseFloat(pricePerKm);
      if (!Number.isFinite(capacity) || capacity < 1) {
        throw new Error('Seats must be a number greater than or equal to 1');
      }
      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Price must be a number greater than or equal to 0');
      }

      // Combine date and time into a single ISO datetime
      const departure = new Date(date);
      departure.setHours(time.getHours(), time.getMinutes(), 0, 0);

      // Build location objects using real coordinates if available
      const pickupCoords: [number, number] = originCoords
        ? [originCoords.lng, originCoords.lat]
        : [0, 0];
      const dropoffCoords: [number, number] = destCoords
        ? [destCoords.lng, destCoords.lat]
        : [0, 0];

      const pickupLocation = {
        name: 'Current location',
        address: 'Current location',
        coordinates: {
          type: 'Point' as const,
          coordinates: pickupCoords,
        },
      };
      const dropoffLocation = {
        name: destination,
        address: destAddress || destination,
        coordinates: {
          type: 'Point' as const,
          coordinates: dropoffCoords,
        },
      };

      await createRide({
        owner: userId,
        community: communityId,
        pickupLocation,
        dropoffLocation,
        departureTime: departure.toISOString(),
        capacity,
        price,
      });

      Alert.alert('Success!', 'Your ride has been published.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      const msg = e?.data?.message || e?.message || 'Something went wrong';
      const fields = e?.data?.fields as string[] | undefined;
      const details = fields && fields.length ? `\nIssues: ${fields.join(', ')}` : '';
      Alert.alert('Failed to publish', `${msg}${details}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create a Ride</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Destination</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Where are you going?"
                placeholderTextColor="#8E8E93"
                value={destination}
                onChangeText={(t) => {
                  setDestination(t);
                  setDestAddress('');
                  setDestCoords(null);
                  setDistanceText('');
                }}
              />
            </View>
            {!!suggestions.length && (
              <View style={styles.suggestionsBox}>
                {suggestions.slice(0, 6).map((p) => (
                  <TouchableOpacity key={p.place_id} style={styles.suggestionItem} onPress={() => onSelectPrediction(p)}>
                    <Text style={styles.suggestionTitle}>{p.structured_formatting?.main_text || p.description}</Text>
                    {!!p.structured_formatting?.secondary_text && (
                      <Text style={styles.suggestionSubtitle}>{p.structured_formatting?.secondary_text}</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {!!distanceText && (
              <Text style={styles.distanceText}>Distance: {distanceText}</Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.label}>Date</Text>
              <LinearGradient
                colors={['#2A2A2E', '#1C1C1E']}
                style={styles.dateTimePickerContainer}
              >
                <DateTimePicker
                  testID="datePicker"
                  value={date}
                  mode={'date'}
                  display="default"
                  onChange={onChangeDate}
                  style={styles.dateTimePicker}
                  themeVariant="dark"
                />
              </LinearGradient>
            </View>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.label}>Time</Text>
              <LinearGradient
                colors={['#2A2A2E', '#1C1C1E']}
                style={styles.dateTimePickerContainer}
              >
                <DateTimePicker
                  testID="timePicker"
                  value={time}
                  mode={'time'}
                  display="default"
                  onChange={onChangeTime}
                  style={styles.dateTimePicker}
                  themeVariant="dark"
                />
              </LinearGradient>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.label}>Available Seats</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="people-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  value={seats}
                  onChangeText={setSeats}
                />
              </View>
            </View>
            <View style={[styles.inputGroup, styles.flexHalf]}>
              <Text style={styles.label}>Price per km</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="cash-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 7"
                  placeholderTextColor="#8E8E93"
                  keyboardType="numeric"
                  value={pricePerKm}
                  onChangeText={setPricePerKm}
                />
              </View>
            </View>
          </View>
        </View>


        <TouchableOpacity style={styles.publishButton} onPress={handlePublishRide} disabled={submitting}>
          <Text style={styles.publishButtonText}>{submitting ? 'Publishing…' : 'Launch Dewdrop'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  form: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#8E8E93',
    fontSize: 14,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    height: 56,
  },
  suggestionsBox: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2E',
  },
  suggestionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  suggestionSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 2,
  },
  distanceText: {
    color: '#8E8E93',
    fontSize: 13,
    marginTop: 8,
  },
  attribution: {
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 6,
  },
  inputText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    height: 56,
    textAlignVertical: 'center',
    paddingTop: 18, 
    paddingBottom: 18,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flexHalf: {
    flex: 0.48,
  },
  dateTimePicker: {
    width: '100%',
    height: 56,
  },
  dateTimePickerContainer: {
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  publishButton: {
    backgroundColor: '#3c7d68',
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 32,
  },
  publishButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateRideScreen;

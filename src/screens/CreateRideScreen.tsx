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

      // Minimal location objects (replace with real geocoded coordinates later)
      const pickupLocation = {
        name: 'Pickup',
        address: 'Pickup',
        coordinates: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
      };
      const dropoffLocation = {
        name: destination,
        address: destination,
        coordinates: { type: 'Point' as const, coordinates: [0, 0] as [number, number] },
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
      <ScrollView contentContainerStyle={styles.scrollContainer}>
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
                onChangeText={setDestination}
              />
            </View>
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

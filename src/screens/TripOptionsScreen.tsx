import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';

type RootStackParamList = {
  TripOptions: { destination: { name: string; address: string } };
  AvailableRides: { destination: { name: string; address: string } };
};

type TripOptionsScreenNavigationProp = StackNavigationProp<RootStackParamList, 'TripOptions'>;
type TripOptionsScreenRouteProp = RouteProp<RootStackParamList, 'TripOptions'>;

interface TripOptionsScreenProps {
  navigation: TripOptionsScreenNavigationProp;
  route: TripOptionsScreenRouteProp;
}

const TripOptionsScreen: React.FC<TripOptionsScreenProps> = ({ navigation, route }) => {
  const { destination } = route.params;

  const origin = { latitude: 17.3999, longitude: 78.35, name: 'Home' }; // Approx. Gauthami Enclave
  const destCoords = { latitude: 17.4202, longitude: 78.3402 }; // Approx. CBIT

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.map}
        provider="google"
        initialRegion={{
          latitude: (origin.latitude + destCoords.latitude) / 2,
          longitude: (origin.longitude + destCoords.longitude) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}>
        <Marker coordinate={origin} title="Home" pinColor="#00FF00" />
        <Marker coordinate={destCoords} title={destination.name} />
        <Polyline coordinates={[origin, destCoords]} strokeColor="#FFFFFF" strokeWidth={4} />
      </MapView>

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Ionicons name="arrow-back" size={24} color="#000000" />
      </TouchableOpacity>

      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>Choose a trip</Text>
        
        <TouchableOpacity style={styles.tripOption}>
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
  },
  bottomSheet: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
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
});

export default TripOptionsScreen;


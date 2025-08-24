import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Local copy of the Dewdrop view-model used by UI cards
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

interface DewdropCardProps {
  dewdrop: Dewdrop;
  onPress: (dewdropId: string) => void;
  isHorizontal?: boolean;
}

const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const DewdropCard: React.FC<DewdropCardProps> = ({ dewdrop, onPress, isHorizontal = false }) => {
  return (
    <View style={[styles.container, isHorizontal && styles.horizontalContainer, {marginHorizontal: isHorizontal ? 0 : 16} ]}>
      <View style={styles.cardHeader}>
        <View style={styles.driverInfo}>
          <Image source={{ uri: dewdrop.driverAvatar }} style={styles.avatar} />
          <View>
            <Text style={styles.driverName} numberOfLines={1}>{dewdrop.driverName}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFC700" />
              <Text style={styles.rating}>{dewdrop.rating.toFixed(1)}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <View style={styles.priceDisplay}>
            <Text style={styles.priceValue}>₹{dewdrop.pricePerKm}</Text>
            <Text style={styles.priceUnit}>/km</Text>
          </View>
        </View>
      </View>

      <View style={styles.routeInfo}>
        <View style={styles.routePoint}>
          <Ionicons name="location-outline" size={20} color="#FF6B6B" />
          <Text style={styles.locationText} numberOfLines={1}>{dewdrop.to}</Text>
        </View>
      </View>

      <View style={styles.rideDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText} numberOfLines={1}>{formatDate(dewdrop.date)}, {dewdrop.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={16} color="#8E8E93" />
          <Text style={styles.seatsText}>{dewdrop.availableSeats} seats</Text>
        </View>
      </View>

      <View style={styles.footerInfo}>
        <View style={styles.distanceInfo}>
          <Ionicons name="map-outline" size={18} color="#3c7d68" />
          <Text style={styles.distanceText}>{dewdrop.distance} km</Text>
        </View>
        <View style={styles.carInfo}>
          <Text style={styles.carModel} numberOfLines={1}>{dewdrop.carModel}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.requestButton} onPress={() => onPress(dewdrop.id)} accessibilityRole="button" accessibilityLabel={`View details for dewdrop from ${dewdrop.from} to ${dewdrop.to}`}>
        <Text style={styles.requestButtonText}>Request Seat</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  container: {
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  horizontalContainer: {
    width: 280,
    marginRight: 12,
    marginBottom: 0,
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  driverName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    flexShrink: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  rating: {
    color: '#FFC700',
    fontSize: 14,
    marginLeft: 4,
  },
  priceContainer: {
    backgroundColor: 'rgba(60, 125, 104, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(60, 125, 104, 0.5)',
  },
  priceDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceValue: {
    color: '#3c7d68',
    fontSize: 20,
    fontWeight: 'bold',
  },
  priceUnit: {
    color: '#3c7d68',
    fontSize: 14,
    marginLeft: 2,
    opacity: 0.8,
  },
  routeInfo: {
    marginVertical: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    flexShrink: 1,
  },
  rideDetails: {
    flexDirection: 'row',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#3A3A3C',
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 6,
  },
  seatsText: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 6,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  carInfo: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  carModel: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  requestButton: {
    marginTop: 16,
    backgroundColor: '#3c7d68',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  requestButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default DewdropCard;
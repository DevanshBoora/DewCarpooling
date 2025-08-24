import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Dewdrop } from '../data/mockData';
import { BASE_URL } from '../config';
import { getMe, getMyContext } from '../api/userService';
import { listRides, leaveRide, Ride } from '../api/rideService';
import { useToast } from '../context/ToastContext';

// Match DewdropCard date format, e.g., "Aug 24"
const formatDate = (dateString: string): string => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
};

const ActivityScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
  const [upcomingDewdrops, setUpcomingDewdrops] = useState<Dewdrop[]>([]);
  const [pastDewdrops, setPastDewdrops] = useState<Dewdrop[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { show } = useToast();

  const loadData = React.useCallback(async () => {
    try {
      const { communityId, userId } = await getMyContext();
      if (!communityId || !userId) {
        setUpcomingDewdrops([]);
        setPastDewdrops([]);
        show('Missing community context', { type: 'error' });
      } else {
      setCurrentUserId(userId);
      const rides = await listRides(communityId);

      // Only include rides the user has requested/joined (participants)
      const involved = rides.filter((r: Ride) => {
        const pids = Array.isArray(r.participants)
          ? (r.participants as any[]).map(p => (typeof p === 'string' ? p : p?._id)).filter(Boolean)
          : [];
        const isParticipant = pids.includes(userId);
        return isParticipant;
      });

      const mapToDewdrop = (r: Ride): Dewdrop => {
          const rawAvatar = (r.owner?.avatar as any)?.trim?.() || '';
          const isObjectId = /^[a-f\d]{24}$/i.test(rawAvatar);
          const normalizedPath = isObjectId ? `/api/files/${rawAvatar}` : (rawAvatar.startsWith('/') ? rawAvatar : rawAvatar);
          const absoluteAvatar = rawAvatar
            ? (rawAvatar.startsWith('http://') || rawAvatar.startsWith('https://') || rawAvatar.startsWith('data:')
                ? rawAvatar
                : `${BASE_URL}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`)
            : '';
          return {
            id: r._id,
            driverName: r.owner?.name || 'Driver',
            driverAvatar: absoluteAvatar || `https://ui-avatars.com/api/?background=3c7d68&color=fff&name=${encodeURIComponent(r.owner?.name || 'Driver')}`,
            from: r.pickupLocation?.name || 'Pickup',
            to: r.dropoffLocation?.name || 'Destination',
            pricePerKm: r.price || 0,
            availableSeats: Math.max(0, (r.capacity || 0) - (r.participants?.length || 0)),
            date: r.departureTime,
            time: new Date(r.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: '—',
            rating: (r.owner as any)?.rating ?? 4.8,
            dewdropType: 'Shared Dewdrop',
            carModel: '—',
            distance: 0,
            status: r.status === 'completed' ? 'completed' : 'upcoming',
          };
      };

      const upcoming = involved.filter(r => r.status === 'active').map(mapToDewdrop);
      const past = involved.filter(r => r.status === 'completed').map(mapToDewdrop);

      setUpcomingDewdrops(upcoming);
      setPastDewdrops(past);
      }
    } catch (e: any) {
      console.log('Failed to load rides', e);
      const msg = e?.message || 'Failed to load rides';
      show(msg, { type: 'error' });
    } finally {
      // no loading toast to hide
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadData();
      return () => {};
    }, [loadData])
  );

  const handleCardPress = (d: Dewdrop) => {
    show(`Ride with ${d.driverName}`, { type: 'info' });
  };

  const handleCancel = (d: Dewdrop) => {
    Alert.alert('Cancel Dewdrop', `Cancel ride with ${d.driverName}?`, [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => {
          // Optimistic update: remove immediately
          setUpcomingDewdrops(prev => prev.filter(item => item.id !== d.id));
          setPastDewdrops(prev => prev.filter(item => item.id !== d.id));
          show('Seat canceled', { type: 'success' });
          // Fire API call
          if (currentUserId) {
            (async () => {
              try {
                await leaveRide(d.id, currentUserId);
              } catch (e) {
                console.log('Failed to leave ride', e);
                // Re-sync from server in case of failure
                await loadData();
                show('Could not cancel your seat. List refreshed.', { type: 'error' });
              }
            })();
          }
        },
      },
    ]);
  };

  const handleMessage = (d: Dewdrop) => {
    show(`Opening chat with ${d.driverName}`, { type: 'info' });
  };

  const handleRate = (d: Dewdrop) => {
    show(`Rate ${d.driverName}`, { type: 'info' });
  };

  const renderDewdropItem = ({ item: dewdrop }: { item: Dewdrop }) => (
    <TouchableOpacity style={styles.dewdropCard} onPress={() => handleCardPress(dewdrop)}>
      <View style={styles.cardHeader}>
        <Image source={{ uri: dewdrop.driverAvatar }} style={styles.driverAvatar} />
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{dewdrop.driverName}</Text>
          <View style={styles.ratingContainer}>
            <Ionicons name="star" size={16} color="#FFC700" />
            <Text style={styles.rating}>{dewdrop.rating.toFixed(1)}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>₹{dewdrop.pricePerKm}/km</Text>
        </View>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routePoint}>
          <Ionicons name="location" size={16} color="#FF6B6B" />
          <Text style={styles.locationText}>{dewdrop.to}</Text>
        </View>
      </View>

      <View style={styles.dewdropDetails}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{formatDate(dewdrop.date)}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{dewdrop.time}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="people-outline" size={16} color="#8E8E93" />
          <Text style={styles.detailText}>{dewdrop.availableSeats} seats</Text>
        </View>
      </View>

      <View style={styles.footerInfo}>
        <View style={styles.distanceInfo}>
          <Ionicons name="map-outline" size={18} color="#3c7d68" />
          <Text style={styles.distanceText}>{dewdrop.distance} km</Text>
        </View>
        <Text style={styles.carModel}>{dewdrop.carModel}</Text>
      </View>

      {activeTab === 'upcoming' && (
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => handleCancel(dewdrop)}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.contactButton} onPress={() => handleMessage(dewdrop)}>
            <Ionicons name="chatbubble-outline" size={16} color="#3c7d68" />
            <Text style={styles.contactButtonText}>Message</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'past' && (
        <View style={styles.pastDewdropFooter}>
          <Text style={styles.completedText}>✓ Completed</Text>
          <TouchableOpacity style={styles.rateButton} onPress={() => handleRate(dewdrop)}>
            <Text style={styles.rateButtonText}>Rate Driver</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
          onPress={() => setActiveTab('upcoming')}
        >
          <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
            Upcoming ({upcomingDewdrops.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'past' && styles.activeTab]}
          onPress={() => setActiveTab('past')}
        >
          <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
            Past Dewdrops ({pastDewdrops.length})
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'upcoming' ? (
          <FlatList
            data={upcomingDewdrops}
            renderItem={renderDewdropItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="leaf-outline" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No upcoming dewdrops</Text>
                <Text style={styles.emptyStateSubtext}>Book a dewdrop to get started</Text>
              </View>
            )}
          />
        ) : (
          <FlatList
            data={pastDewdrops}
            renderItem={renderDewdropItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#666" />
                <Text style={styles.emptyStateText}>No past dewdrops</Text>
                <Text style={styles.emptyStateSubtext}>Your dewdrop history will appear here</Text>
              </View>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    marginHorizontal: 20,
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#3c7d68',
  },
  tabText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  dewdropCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  carModel: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#2C2C2E',
    borderRadius: 8,
    overflow: 'hidden',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
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
  routeSection: {
    marginBottom: 16,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 16,
    marginLeft: 12,
    flexShrink: 1,
  },
  dewdropDetails: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3A3C',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 4,
  },
  footerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 0.45,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B6B',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  contactButton: {
    flex: 0.45,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3c7d68',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  pastDewdropFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completedText: {
    color: '#3c7d68',
    fontSize: 14,
    fontWeight: '500',
  },
  rateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3c7d68',
  },
  rateButtonText: {
    color: '#3c7d68',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ActivityScreen;
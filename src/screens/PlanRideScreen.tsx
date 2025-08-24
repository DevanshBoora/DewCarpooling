import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { api } from '../api/client';
import { getMyContext } from '../api/userService';

type RootStackParamList = {
  PlanRide: undefined;
  AvailableRides: { destination: { name: string; address: string } };
};

type PlanRideNavigationProp = StackNavigationProp<RootStackParamList, 'PlanRide'>;

interface PlanRideScreenProps {
  navigation: PlanRideNavigationProp;
}

const PlanRideScreen: React.FC<PlanRideScreenProps> = ({ navigation }) => {
  const [destination, setDestination] = useState('');
  const [places, setPlaces] = useState<Array<{ id: string; name: string; address: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const { communityId } = await getMyContext();
        if (!communityId) return;
        const res = await api.get<any[]>(`/api/communities/${encodeURIComponent(communityId)}/places`);
        const mapped = (res || []).map((p: any) => ({ id: p._id, name: p.name, address: p.address }));
        setPlaces(mapped);
      } catch (e) {
        // fail silently; keep list empty
      }
    })();
  }, []);

  const handleSelectPlace = (place: { name: string; address: string }) => {
    navigation.navigate('AvailableRides', { destination: place });
  };

  const filteredPlaces = destination
    ? places.filter(place => place.name.toLowerCase().includes(destination.toLowerCase()))
    : places;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
          />
        </View>
      </View>

      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.placeItem} onPress={() => handleSelectPlace(item)}>
            <Text style={styles.placeName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListHeaderComponent={<Text style={styles.listHeader}>Suggestions</Text>}
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
});

export default PlanRideScreen;

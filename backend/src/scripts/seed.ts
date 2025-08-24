import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import Community from '../models/Community';
import Place from '../models/Place';
import Ride from '../models/Ride';

// Load env from project root .env regardless of CWD
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dewcarpooling';

const seedDatabase = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Community.deleteMany({});
    await Place.deleteMany({});
    await Ride.deleteMany({});
    console.log('Cleared existing data');

    // Create Communities
    const community1 = new Community({ name: 'Gauthami Enclave', description: 'A vibrant community in Kondapur.' });
    const community2 = new Community({ name: 'My Home Avatar', description: 'A modern living space in Narsingi.' });
    await community1.save();
    await community2.save();
    console.log('Communities created');

    // Create Places
    const places = await Place.insertMany([
      { name: 'Gauthami Enclave Main Gate', address: 'Kondapur, Hyderabad', location: { lat: 17.4657, lng: 78.3501 }, community: community1._id },
      { name: 'My Home Avatar, Block A', address: 'Narsingi, Hyderabad', location: { lat: 17.4186, lng: 78.3355 }, community: community2._id },
      { name: 'Hitech City', address: 'Hyderabad', location: { lat: 17.4435, lng: 78.3772 }, community: community1._id },
      { name: 'Financial District', address: 'Hyderabad', location: { lat: 17.4163, lng: 78.3398 }, community: community2._id },
    ]);
    console.log('Places created');

    // Create User
    const user = new User({
      name: 'Devansh Boora',
      avatar: 'https://images.pexels.com/photos/1585325/pexels-photo-1585325.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
      community: community1._id,
      ridesGiven: 23,
      ridesTaken: 45,
      co2Saved: 125,
      rating: 4.8,
      memberSince: new Date('2025-01-15'),
      ecoImpact: 75,
    });
    await user.save();
    console.log('User created');

    // Create Rides
    // Safety: ensure required place indices exist
    if (places.length < 4) {
      throw new Error('Seeding places failed: expected at least 4 places');
    }

    await Ride.insertMany([
      {
        owner: user._id,
        community: community1._id,
        pickupLocation: places[0]!._id, // Gauthami Enclave
        dropoffLocation: places[2]!._id, // Hitech City
        departureTime: new Date('2025-08-16T09:00:00'),
        status: 'active',
        participants: [],
      },
      {
        owner: user._id,
        community: community2._id,
        pickupLocation: places[1]!._id, // My Home Avatar
        dropoffLocation: places[3]!._id, // Financial District
        departureTime: new Date('2025-08-16T10:30:00'),
        status: 'active',
        participants: [user._id],
      },
    ]);
    console.log('Rides created');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

seedDatabase();

export interface Dewdrop {
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
  distance: number; // in kilometers
  status: 'upcoming' | 'completed' | 'cancelled';
}

export interface Message {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  isOwn: boolean;
}

export const mockDewdrops: Dewdrop[] = [
  {
    id: '1',
    driverName: 'Rohan Kumar',
    driverAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    from: 'Gachibowli',
    to: 'Hitech City',
    pricePerKm: 7,
    availableSeats: 2,
    date: '2025-08-16',
    time: '9:00 AM',
    duration: '30 min',
    rating: 4.9,
    dewdropType: 'Solo Dewdrop',
    carModel: 'Maruti Swift',
    distance: 8,
    status: 'upcoming'
  },
  {
    id: '2',
    driverName: 'Priya Sharma',
    driverAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    from: 'Kukatpally',
    to: 'Financial District',
    pricePerKm: 7,
    availableSeats: 3,
    date: '2025-08-16',
    time: '10:30 AM',
    duration: '45 min',
    rating: 4.8,
    dewdropType: 'Shared Dewdrop',
    carModel: 'Hyundai i20',
    distance: 15,
    status: 'upcoming'
  },
  {
    id: '3',
    driverName: 'Amit Singh',
    driverAvatar: 'https://randomuser.me/api/portraits/men/3.jpg',
    from: 'My Home Avatar, Narsingi',
    to: 'Jubilee Hills',
    pricePerKm: 7,
    availableSeats: 1,
    date: '2025-08-15',
    time: '7:00 PM',
    duration: '40 min',
    rating: 4.7,
    dewdropType: 'Solo Dewdrop',
    carModel: 'Honda City',
    distance: 12,
    status: 'completed'
  },
  {
    id: '4',
    driverName: 'Sunita Reddy',
    driverAvatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    from: 'Gauthami Enclave, Kondapur',
    to: 'Banjara Hills',
    pricePerKm: 7,
    availableSeats: 4,
    date: '2025-08-14',
    time: '9:30 AM',
    duration: '50 min',
    rating: 4.9,
    dewdropType: 'Shared Dewdrop',
    carModel: 'Toyota Innova',
    distance: 18,
    status: 'completed'
  }
];

export const mockMessages: Message[] = [
  {
    id: '1',
    name: 'Sarah Johnson',
    avatar: 'https://randomuser.me/api/portraits/women/75.jpg',
    lastMessage: 'Thanks for the ride! See you tomorrow.',
    timestamp: '2:30 PM',
    unreadCount: 1
  },
  {
    id: '2',
    name: 'Mike Chen',
    avatar: 'https://randomuser.me/api/portraits/men/75.jpg',
    lastMessage: 'Running 5 minutes late, be right there!',
    timestamp: '1:45 PM',
    unreadCount: 0
  },
  {
    id: '3',
    name: 'Emma Davis',
    avatar: 'https://randomuser.me/api/portraits/women/76.jpg',
    lastMessage: 'Great trip! Would definitely ride again.',
    timestamp: 'Yesterday',
    unreadCount: 0
  }
];

export const mockChatMessages: ChatMessage[] = [
  {
    id: '1',
    senderId: '2',
    senderName: 'Sarah Johnson',
    message: 'Hi! I\'ll be picking you up in 10 minutes.',
    timestamp: '2:20 PM',
    isOwn: false
  },
  {
    id: '2',
    senderId: '1',
    senderName: 'You',
    message: 'Perfect! I\'ll be waiting outside.',
    timestamp: '2:22 PM',
    isOwn: true
  },
  {
    id: '3',
    senderId: '2',
    senderName: 'Sarah Johnson',
    message: 'Thanks for the ride! See you tomorrow.',
    timestamp: '2:30 PM',
    isOwn: false
  }
];

export const communities = {
  gauthamiEnclave: {
    name: 'Gauthami Enclave',
    center: { latitude: 17.465704, longitude: 78.350112 },
    polygon: [
      { latitude: 17.467704, longitude: 78.348112 },
      { latitude: 17.467704, longitude: 78.352112 },
      { latitude: 17.463704, longitude: 78.352112 },
      { latitude: 17.463704, longitude: 78.348112 },
    ],
    places: [
      { id: '1', name: 'Gauthami Enclave Main Gate', address: 'Kondapur, Hyderabad' },
      { id: '2', name: 'Community Clubhouse', address: 'Gauthami Enclave, Kondapur' },
    ]
  },
  myHomeAvatar: {
    name: 'My Home Avatar',
    center: { latitude: 17.41863, longitude: 78.33559 },
    polygon: [
      { latitude: 17.42063, longitude: 78.33359 },
      { latitude: 17.42063, longitude: 78.33759 },
      { latitude: 17.41663, longitude: 78.33759 },
      { latitude: 17.41663, longitude: 78.33359 },
    ],
    places: [
      { id: '3', name: 'My Home Avatar, Block A', address: 'Narsingi, Hyderabad' },
      { id: '4', name: 'Clubhouse, My Home Avatar', address: 'Narsingi, Hyderabad' },
    ]
  }
};

export const userProfile = {
  name: 'Devansh Boora',
  avatar: 'https://images.pexels.com/photos/1585325/pexels-photo-1585325.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  communityId: 'gauthamiEnclave', // Can be 'gauthamiEnclave' or 'myHomeAvatar'
  ridesGiven: 23,
  ridesTaken: 45,
  co2Saved: 125, // kg
  rating: 4.8,
  badges: ['Green Champion', 'Safe Driver', 'Friendly Rider'],
  memberSince: '2025-01-15',
  ecoImpact: 75
};
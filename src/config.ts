// Central API configuration
// Reads from EXPO_PUBLIC_API_URL for production. Fallback to local dev.
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.48:5001';

// TEMP: Current user id used by actions like join ride.
// Replace with the actual user ObjectId from your database seed.
// Example: export const CURRENT_USER_ID = '66be3a0b7f1c2a3d9b8e4f12';
export const CURRENT_USER_ID = '';

import { RouteProp } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OTP: { email: string };
  ProfileSetup: undefined;
};

export type RootStackParamList = {
  HomeScreen: undefined;
  PlanRide: undefined;
  AvailableRides: { destination: { name: string; address: string } };
  ActivityList: undefined;
  MessageList: undefined;
  AccountDetails: undefined;
  Settings: undefined;
  Help: undefined;
  EditProfile: undefined;
  CreateRide: undefined;
  AllRides: undefined;
  RideDetails: { id: string };
  TrustedContacts: undefined;
  EmergencyHistory: undefined;
  DriverVerification: undefined;
  IncidentReport: undefined;
  PrivacyPolicy: undefined;
  TermsOfService: undefined;
};

export type AccountScreenNavigationProp = RouteProp<RootStackParamList, 'AccountDetails'>;

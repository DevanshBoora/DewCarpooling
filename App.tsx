import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { RootStackParamList, AuthStackParamList } from './src/types/navigation';

import {
  HomeScreen,
  ActivityScreen,
  MessagesScreen,
  AccountScreen,
  PlanRideScreen,
  AvailableRidesScreen,
  CreateRideScreen,
  AllRidesScreen,
  RideDetailsScreen,
  LoginScreen,
  RegisterScreen,
  HelpScreen,
  EditProfileScreen,
  OTPScreen,
  SettingsScreen,
  ProfileSetupScreen,
} from './src/screens';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();

const defaultStackOptions = {
  headerStyle: {
    backgroundColor: '#000000',
    borderBottomWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  headerTintColor: '#FFFFFF',
};

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="HomeScreen" component={HomeScreen} />
    <Stack.Screen name="PlanRide" component={PlanRideScreen} />
    <Stack.Screen name="AvailableRides" component={AvailableRidesScreen} />
    <Stack.Screen name="AllRides" component={AllRidesScreen} />
    <Stack.Screen name="RideDetails" component={RideDetailsScreen} />
  </Stack.Navigator>
);

const CreateRideStack = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name="CreateRide" component={CreateRideScreen} options={{ title: '' }} />
  </Stack.Navigator>
);

const ActivityStack = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name="ActivityList" component={ActivityScreen} options={{ title: '' }} />
  </Stack.Navigator>
);

const MessagesStack = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name="MessageList" component={MessagesScreen} options={{ title: '' }} />
  </Stack.Navigator>
);

const AccountStack = () => (
  <Stack.Navigator screenOptions={defaultStackOptions}>
    <Stack.Screen name="AccountDetails" component={AccountScreen} options={{ title: '' }} />
    <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
    <Stack.Screen name="Help" component={HelpScreen} options={{ title: 'Help & Support' }} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const AppTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: keyof typeof Ionicons.glyphMap;
        if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'Activity') iconName = focused ? 'list' : 'list-outline';
        else if (route.name === 'Create Ride') iconName = focused ? 'add-circle' : 'add-circle-outline';
        else if (route.name === 'Messages') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
        else if (route.name === 'Account') iconName = focused ? 'person' : 'person-outline';
        else iconName = 'alert-circle-outline';
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#3c7d68',
      tabBarInactiveTintColor: '#666666',
      tabBarStyle: styles.tabBar,
      headerShown: false,
    })}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Activity" component={ActivityStack} />
    <Tab.Screen name="Create Ride" component={CreateRideStack} />
    <Tab.Screen name="Messages" component={MessagesStack} />
    <Tab.Screen name="Account" component={AccountStack} />
  </Tab.Navigator>
);

const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="OTP" component={OTPScreen} />
  </AuthStack.Navigator>
);

const SetupNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
  </AuthStack.Navigator>
);

const RootNavigator = () => {
  const { isAuthenticated, isLoading, needsProfile } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!isAuthenticated) return <AuthNavigator />;
  if (needsProfile) return <SetupNavigator />;
  return <AppTabs />;
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="light" backgroundColor="#000000" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  tabBar: {
    backgroundColor: '#000000',
    borderTopColor: '#333333',
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
});
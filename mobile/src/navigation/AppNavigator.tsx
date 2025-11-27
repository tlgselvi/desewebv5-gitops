/**
 * App Navigator
 * 
 * Main navigation configuration
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '../store/authStore.js';
// Note: Install react-native-vector-icons and link it for icons to work
// For now, using text labels instead
import { LoginScreen } from '../screens/LoginScreen.js';
import { DashboardScreen } from '../screens/DashboardScreen.js';
import { ChatScreen } from '../screens/ChatScreen.js';
import { SearchScreen } from '../screens/SearchScreen.js';
import { ProfileScreen } from '../screens/ProfileScreen.js';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Main tabs navigator (authenticated)
 */
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        headerShown: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Ana Sayfa' }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'AI Asistan' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ title: 'Arama' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Root navigator
 */
export function AppNavigator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen name="Main" component={MainTabs} />
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}


import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import DonationsScreen from '../screens/DonationsScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.light.textSecondary,
        tabBarStyle: { borderTopColor: theme.colors.light.border, paddingTop: 4 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Feed', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📰</Text> }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarLabel: 'Map', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text> }}
      />
      <Tab.Screen
        name="Report"
        component={CreateReportScreen}
        options={{ tabBarLabel: 'Report', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>🔴</Text> }}
      />
      <Tab.Screen
        name="Donations"
        component={DonationsScreen}
        options={{ tabBarLabel: 'Help', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🤝</Text> }}
      />
    </Tab.Navigator>
  );
}

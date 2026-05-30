import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, TouchableOpacity } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import SOSScreen from '../screens/SOSScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import { theme } from '../theme';

const Tab = createBottomTabNavigator();

function CreateReportButton({ children, onPress }: any) {
  return (
    <TouchableOpacity style={styles.createBtnWrap} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.createBtn}>{children}</View>
    </TouchableOpacity>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.light.textSecondary,
        tabBarStyle: { borderTopColor: theme.colors.light.border, paddingTop: 4, height: 60 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
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
        name="CreateReport"
        component={CreateReportScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => <Text style={styles.createBtnIcon}>＋</Text>,
          tabBarButton: (props) => <CreateReportButton {...props} />,
        }}
      />
      <Tab.Screen
        name="SOS"
        component={SOSScreen}
        options={{
          tabBarLabel: 'SOS',
          tabBarIcon: ({ focused }) => <Text style={{ fontSize: 20, color: focused ? '#D92D20' : '#D92D20' }}>🚨</Text>,
          tabBarActiveTintColor: '#D92D20',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Me', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  createBtnWrap: { top: -16, justifyContent: 'center', alignItems: 'center' },
  createBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 8 },
  createBtnIcon: { fontSize: 28, color: '#fff', fontWeight: '700' },
});

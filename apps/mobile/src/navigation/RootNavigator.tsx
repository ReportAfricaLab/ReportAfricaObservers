import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import CampaignDetailScreen from '../screens/CampaignDetailScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import LicenseRequestsScreen from '../screens/LicenseRequestsScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import MainTabs from './MainTabs';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { isAuthenticated } = useAppStore();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ headerShown: true, headerTitle: 'Report', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="CampaignDetail" component={CampaignDetailScreen} options={{ headerShown: true, headerTitle: 'Campaign', headerTintColor: '#F97316' }} />
            <Stack.Screen name="LicenseRequests" component={LicenseRequestsScreen} options={{ headerShown: true, headerTitle: 'License Requests', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ headerShown: true, headerTitle: 'Create Report', headerTintColor: '#0F7B6C' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

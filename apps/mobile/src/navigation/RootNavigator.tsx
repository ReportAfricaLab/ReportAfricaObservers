import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store/useAppStore';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import LandingScreen from '../screens/LandingScreen';
import CampaignDetailScreen from '../screens/CampaignDetailScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';
import LicenseRequestsScreen from '../screens/LicenseRequestsScreen';
import InfoScreen from '../screens/InfoScreen';
import CreateReportScreen from '../screens/CreateReportScreen';
import GoLiveScreen from '../screens/GoLiveScreen';
import SearchScreen from '../screens/SearchScreen';
import ElectionsScreen from '../screens/ElectionsScreen';
import CreateElectionReportScreen from '../screens/CreateElectionReportScreen';
import DonationsScreen from '../screens/DonationsScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import FollowersScreen from '../screens/FollowersScreen';
import WatchlistScreen from '../screens/WatchlistScreen';
import CommentsScreen from '../screens/CommentsScreen';
import ReferralScreen from '../screens/ReferralScreen';
import BuyTipPackScreen from '../screens/BuyTipPackScreen';
import EarningsScreen from '../screens/EarningsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import TrustProfileScreen from '../screens/TrustProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import BusinessScreen from '../screens/BusinessScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import CreateCampaignScreen from '../screens/CreateCampaignScreen';
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
            <Stack.Screen name="Info" component={InfoScreen} options={{ headerShown: true, headerTitle: 'Info', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="CreateReport" component={CreateReportScreen} options={{ headerShown: true, headerTitle: 'Create Report', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="GoLive" component={GoLiveScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Elections" component={ElectionsScreen} />
            <Stack.Screen name="CreateElectionReport" component={CreateElectionReportScreen} options={{ headerShown: true, headerTitle: 'Election Report', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Donations" component={DonationsScreen} options={{ headerShown: true, headerTitle: 'Helping Hands', headerTintColor: '#F97316' }} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} options={{ headerShown: true, headerTitle: 'Leaderboard', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Followers" component={FollowersScreen} options={{ headerShown: true, headerTitle: 'Followers', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Watchlist" component={WatchlistScreen} options={{ headerShown: true, headerTitle: 'Watchlists', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Comments" component={CommentsScreen} options={{ headerShown: true, headerTitle: 'Comments', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Referral" component={ReferralScreen} options={{ headerShown: true, headerTitle: 'Referral', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="BuyTipPack" component={BuyTipPackScreen} options={{ headerShown: true, headerTitle: 'Buy Tip Pack', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Earnings" component={EarningsScreen} options={{ headerShown: true, headerTitle: 'My Earnings', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: true, headerTitle: 'Notifications', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="TrustProfile" component={TrustProfileScreen} options={{ headerShown: true, headerTitle: 'Trust Profile', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Subscription" component={SubscriptionScreen} options={{ headerShown: true, headerTitle: 'Premium Reporter', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="Business" component={BusinessScreen} options={{ headerShown: true, headerTitle: 'Business Badge', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ headerShown: true, headerTitle: 'Change Password', headerTintColor: '#0F7B6C' }} />
            <Stack.Screen name="CreateCampaign" component={CreateCampaignScreen} options={{ headerShown: true, headerTitle: 'Create Campaign', headerTintColor: '#F97316' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Info" component={InfoScreen} options={{ headerShown: true, headerTitle: 'Info', headerTintColor: '#0F7B6C' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

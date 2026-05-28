import React from 'react';
import { StatusBar } from 'react-native';
import * as Sentry from '@sentry/react-native';
import RootNavigator from './src/navigation/RootNavigator';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  release: 'reportafrica-mobile@1.0.0',
  enabled: !__DEV__, // Only active in production builds
});

function App() {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <RootNavigator />
    </>
  );
}

export default Sentry.wrap(App);

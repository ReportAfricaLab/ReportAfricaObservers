import React, { useEffect } from 'react';
import { StatusBar, I18nManager } from 'react-native';
import * as Sentry from '@sentry/react-native';
import RootNavigator from './src/navigation/RootNavigator';
import { useI18n } from './src/store/useI18n';
import { useAppStore } from './src/store/useAppStore';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || '',
  environment: __DEV__ ? 'development' : 'production',
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  release: 'reportafrica-mobile@1.0.0',
  enabled: !__DEV__, // Only active in production builds
});

function App() {
  const { isRTL } = useI18n();
  const { userCountry } = useAppStore();
  const { initFromCountry } = useI18n();

  useEffect(() => {
    initFromCountry(userCountry);
  }, [userCountry]);

  useEffect(() => {
    if (I18nManager.isRTL !== isRTL) {
      I18nManager.forceRTL(isRTL);
      I18nManager.allowRTL(isRTL);
    }
  }, [isRTL]);

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <RootNavigator />
    </>
  );
}

export default Sentry.wrap(App);

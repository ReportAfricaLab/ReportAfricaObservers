import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image, Modal, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../store/useI18n';
import { useThemeColors } from '../hooks/useThemeColors';
import { reportsAPI } from '../services/api';
import api from '../services/api';
import { offlineQueue } from '../services/offline-queue';
import { getCurrentLocation } from '../services/location';
import { theme } from '../theme';
import { COUNTRY_CONFIG } from '../constants';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  verificationLevel: string;
  city?: string;
  upvotes: number;
  commentCount: number;
  createdAt: string;
  author?: { displayName: string; trustLevel: string };
}

export default function HomeScreen() {
  const { viewingCountry, setViewingCountry } = useAppStore();
  const { t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sort, setSort] = useState<'smart' | 'latest'>('smart');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [activeEmergencies, setActiveEmergencies] = useState<any[]>([]);
  const [showDrawer, setShowDrawer] = useState(false);

  const brandName = COUNTRY_CONFIG[viewingCountry]?.brandName || COUNTRY_CONFIG[viewingCountry]?.name || 'ReportAfrica';

  useEffect(() => {
    getCurrentLocation().then((loc) => { if (loc) setLocation(loc); }).catch(() => {});
    // Check offline status and pending queue
    const checkStatus = async () => {
      const online = await offlineQueue.isOnline();
      setIsOffline(!online);
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    // Load active emergencies
    api.get(`/emergency/active?country=${viewingCountry}`).then((res) => {
      setActiveEmergencies(Array.isArray(res.data) ? res.data : []);
    }).catch(() => {});
    return () => clearInterval(interval);
  }, []);

  const loadFeed = async () => {
    try {
      const res = await reportsAPI.getFeed(viewingCountry, 1, location?.latitude, location?.longitude, sort);
      setReports(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load feed:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  useEffect(() => { loadFeed(); }, [viewingCountry, location, sort]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return theme.colors.emergency;
      case 'high': return theme.colors.humanitarian;
      case 'medium': return theme.colors.secondary;
      default: return theme.colors.info;
    }
  };

  const renderReport = ({ item }: { item: Report }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate('ReportDetail', { id: item.id })}>
      <View style={styles.cardHeader}>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
          <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
        </View>
        <Text style={[styles.category, { color: colors.textSecondary }]}>{item.category.replace('_', ' ')}</Text>
      </View>
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.aiHeadline || item.title}</Text>
      <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>{item.description}</Text>
      <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>{item.author?.displayName || 'Anonymous'}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>↑ {item.upvotes} · 💬 {item.commentCount}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>⚠️ You are offline. Reports will be saved and synced later.</Text>
        </View>
      )}
      {/* Pending Queue Badge */}
      {pendingCount > 0 && !isOffline && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingBannerText}>📤 {pendingCount} report{pendingCount > 1 ? 's' : ''} syncing...</Text>
        </View>
      )}
      {/* Row 1: Logo + Search + Bell + Drawer */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>{brandName}</Text>
              <Text style={styles.subtitle}>Live Reports</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.headerIconText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.headerIconText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon} onPress={() => setShowDrawer(true)}>
            <Text style={styles.headerIconText}>☰</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Country Selector + Sort Toggle */}
      <View style={[styles.filterRow, { backgroundColor: colors.card }]}>
        <TouchableOpacity style={styles.countrySelector} onPress={() => setShowCountryPicker(!showCountryPicker)}>
          <Text style={styles.countrySelectorText}>📍 {COUNTRY_CONFIG[viewingCountry]?.name || viewingCountry} ▼</Text>
        </TouchableOpacity>
        <View style={styles.sortRow}>
          <TouchableOpacity style={[styles.sortBtn, sort === 'smart' && styles.sortBtnActive]} onPress={() => setSort('smart')}>
            <Text style={[styles.sortBtnText, sort === 'smart' && styles.sortBtnTextActive]}>🔥 {t('feed.smart', 'Smart')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.sortBtn, sort === 'latest' && styles.sortBtnActive]} onPress={() => setSort('latest')}>
            <Text style={[styles.sortBtnText, sort === 'latest' && styles.sortBtnTextActive]}>🕐 {t('feed.latest', 'Latest')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {showCountryPicker && (
        <View style={[styles.countryGrid, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
            <TouchableOpacity key={code} style={[styles.countryChip, viewingCountry === code && styles.countryChipActive]}
              onPress={() => { setViewingCountry(code); setShowCountryPicker(false); }}>
              <Text style={[styles.countryChipText, viewingCountry === code && styles.countryChipTextActive]}>{config.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {/* Active Emergencies Banner */}
      {activeEmergencies.length > 0 && (
        <View style={styles.emergencyBanner}>
          <Text style={styles.emergencyBannerTitle}>🚨 Active Emergencies Nearby</Text>
          {activeEmergencies.slice(0, 3).map((e: any) => (
            <TouchableOpacity key={e.id} style={styles.emergencyItem} onPress={() => navigation.navigate('ReportDetail', { id: e.id })}>
              <Text style={styles.emergencyItemText}>{e.title}</Text>
              <Text style={styles.emergencyItemTime}>{new Date(e.createdAt).toLocaleTimeString()}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <FlatList
        data={reports}
        keyExtractor={(item, index) => item.id || `ad-${index}`}
        renderItem={({ item, index }) => {
          // Show sponsored ad placeholder every 5th position
          if ((index + 1) % 6 === 0) {
            return (
              <View style={styles.sponsoredCard}>
                <Text style={styles.sponsoredLabel}>Sponsored</Text>
                <View style={styles.sponsoredContent}>
                  <Text style={styles.sponsoredText}>Ad Space Available</Text>
                  <Text style={styles.sponsoredCta}>Advertise on ReportAfrica</Text>
                </View>
              </View>
            );
          }
          return renderReport({ item });
        }}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('feed.empty', 'No reports yet. Be the first to report!')}</Text>
          </View>
        }
      />
      {/* Right Drawer */}
      <Modal visible={showDrawer} animationType="slide" transparent onRequestClose={() => setShowDrawer(false)}>
        <TouchableOpacity style={styles.drawerOverlay} activeOpacity={1} onPress={() => setShowDrawer(false)}>
          <View style={styles.drawerContainer}>
            <Text style={styles.drawerTitle}>ReportAfrica</Text>
            <View style={styles.drawerDivider} />
            <ScrollView>
              {[
                { screen: 'Donations', icon: '🤝', label: 'Helping Hands' },
                { screen: 'Elections', icon: '🗳️', label: 'Elections' },
                { screen: 'GoLive', icon: '🔴', label: 'Go Live' },
                { screen: 'LicenseRequests', icon: '📄', label: 'Media Licensing' },
                { screen: 'Leaderboard', icon: '🏆', label: 'Leaderboard' },
                { screen: 'Earnings', icon: '💰', label: 'My Earnings' },
                { screen: 'TrustProfile', icon: '🛡️', label: 'Trust Profile' },
                { screen: 'Watchlist', icon: '📍', label: 'Watchlists' },
                { screen: 'Referral', icon: '🎁', label: 'Referral Program' },
                { screen: 'BuyTipPack', icon: '💳', label: 'Buy Tip Pack' },
              ].map((item) => (
                <TouchableOpacity key={item.screen} style={styles.drawerItem}
                  onPress={() => { setShowDrawer(false); navigation.navigate(item.screen); }}>
                  <Text style={styles.drawerItemIcon}>{item.icon}</Text>
                  <Text style={styles.drawerItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  offlineBanner: { backgroundColor: '#fef2f2', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#fecaca' },
  offlineBannerText: { fontSize: 12, color: '#dc2626', fontWeight: '600', textAlign: 'center' },
  pendingBanner: { backgroundColor: '#eff6ff', paddingVertical: 8, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#bfdbfe' },
  pendingBannerText: { fontSize: 12, color: '#2563eb', fontWeight: '600', textAlign: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.light.border },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerIcon: { paddingHorizontal: 8, paddingVertical: 8 },
  headerIconText: { fontSize: 20 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  logo: { width: 56, height: 56 },
  brandName: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.primary },
  subtitle: { fontSize: 11, color: theme.colors.light.textSecondary, marginTop: 1 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff' },
  countrySelector: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#f3f4f6', borderRadius: 20 },
  countrySelectorText: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6' },
  sortBtnActive: { backgroundColor: theme.colors.primary },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: theme.colors.light.textSecondary },
  sortBtnTextActive: { color: '#fff' },
  countryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.light.border },
  countryChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6' },
  countryChipActive: { backgroundColor: theme.colors.primary },
  countryChipText: { fontSize: 11, color: theme.colors.light.textSecondary },
  countryChipTextActive: { color: '#fff', fontWeight: '600' },
  emergencyBanner: { backgroundColor: '#fef2f2', borderBottomWidth: 1, borderBottomColor: '#fecaca', paddingHorizontal: 16, paddingVertical: 10 },
  emergencyBannerTitle: { fontSize: 13, fontWeight: '700', color: '#dc2626', marginBottom: 6 },
  emergencyItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  emergencyItemText: { fontSize: 12, color: '#991b1b', flex: 1 },
  emergencyItemTime: { fontSize: 10, color: '#dc2626' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: theme.borderRadius.md, padding: 16, borderWidth: 1, borderColor: theme.colors.light.border },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  severityBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  severityText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  category: { fontSize: theme.fontSize.xs, color: theme.colors.light.textSecondary, textTransform: 'capitalize' },
  title: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.light.text, marginBottom: 4 },
  description: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, lineHeight: 20 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.light.border },
  meta: { fontSize: theme.fontSize.xs, color: theme.colors.light.textSecondary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.light.textSecondary },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', flexDirection: 'row', justifyContent: 'flex-end' },
  drawerContainer: { width: '75%', backgroundColor: '#fff', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 40 },
  drawerTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.primary, marginBottom: 12 },
  drawerDivider: { height: 1, backgroundColor: theme.colors.light.border, marginBottom: 16 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  drawerItemIcon: { fontSize: 20 },
  drawerItemText: { fontSize: 15, fontWeight: '500', color: theme.colors.light.text },
  sponsoredCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  sponsoredLabel: { fontSize: 10, fontWeight: '600', color: '#9ca3af', marginBottom: 8 },
  sponsoredContent: { height: 80, backgroundColor: '#f9fafb', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  sponsoredText: { fontSize: 12, color: '#9ca3af' },
  sponsoredCta: { fontSize: 10, color: '#0F7B6C', marginTop: 4, fontWeight: '600' },
});

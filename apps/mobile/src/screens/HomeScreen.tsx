import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../store/useI18n';
import { reportsAPI } from '../services/api';
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
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [sort, setSort] = useState<'smart' | 'latest'>('smart');
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  const brandName = COUNTRY_CONFIG[viewingCountry]?.brandName || COUNTRY_CONFIG[viewingCountry]?.name || 'ReportAfrica';

  useEffect(() => {
    getCurrentLocation().then((loc) => { if (loc) setLocation(loc); }).catch(() => {});
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
    <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ReportDetail', { id: item.id })}>
      <View style={styles.cardHeader}>
        <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
          <Text style={styles.severityText}>{item.severity.toUpperCase()}</Text>
        </View>
        <Text style={styles.category}>{item.category.replace('_', ' ')}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
      <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.meta}>{item.author?.displayName || 'Anonymous'}</Text>
        <Text style={styles.meta}>↑ {item.upvotes} · 💬 {item.commentCount}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandName}>{brandName}</Text>
              <Text style={styles.subtitle}>Live Reports</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.searchBtn} onPress={() => navigation.navigate('Search')}>
            <Text style={styles.searchBtnText}>🔍</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.electionBtn} onPress={() => navigation.navigate('Elections')}>
            <Text style={styles.electionBtnText}>🗳️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.liveBtn} onPress={() => navigation.navigate('GoLive')}>
            <Text style={styles.liveBtnText}>● Live</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateReport')}>
            <Text style={styles.createBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* Country Selector + Sort Toggle */}
      <View style={styles.filterRow}>
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
        <View style={styles.countryGrid}>
          {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
            <TouchableOpacity key={code} style={[styles.countryChip, viewingCountry === code && styles.countryChipActive]}
              onPress={() => { setViewingCountry(code); setShowCountryPicker(false); }}>
              <Text style={[styles.countryChipText, viewingCountry === code && styles.countryChipTextActive]}>{config.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>{t('feed.empty', 'No reports yet. Be the first to report!')}</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.light.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: { width: 40, height: 40 },
  brandName: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.primary },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, marginTop: 2 },
  createBtn: { backgroundColor: theme.colors.emergency, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  searchBtnText: { fontSize: 18 },
  electionBtn: { paddingHorizontal: 8, paddingVertical: 8 },
  electionBtnText: { fontSize: 18 },
  liveBtn: { backgroundColor: '#000', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  liveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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
});

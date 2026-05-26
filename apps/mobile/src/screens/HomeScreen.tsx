import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { reportsAPI } from '../services/api';
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
  const { country } = useAppStore();
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const brandName = COUNTRY_CONFIG[country]?.brandName || 'ReportAfrica';

  const loadFeed = async () => {
    try {
      const res = await reportsAPI.getFeed(country);
      setReports(res.data);
    } catch (err) {
      console.error('Failed to load feed:', err);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  useEffect(() => { loadFeed(); }, [country]);

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
          <View>
            <Text style={styles.brandName}>{brandName}</Text>
            <Text style={styles.subtitle}>Live Reports</Text>
          </View>
          <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateReport')}>
            <Text style={styles.createBtnText}>+ Report</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReport}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No reports yet. Be the first to report!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.light.border },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandName: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.primary },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, marginTop: 2 },
  createBtn: { backgroundColor: theme.colors.emergency, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
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

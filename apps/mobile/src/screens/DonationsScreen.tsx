import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Linking } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import axios from 'axios';

const API_URL = __DEV__ ? 'http://10.162.41.17:3001/api/v1' : 'https://api.reportafrica.africa/api/v1';

interface Campaign {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: string;
  raisedAmount: string;
  currency: string;
  isEmergency: boolean;
  donorCount: number;
  author?: { displayName: string };
}

const CATEGORIES = ['', 'medical', 'disaster', 'abuse_survivor', 'education', 'legal_aid', 'community'];
const CATEGORY_LABELS: Record<string, string> = {
  '': '🔥 All',
  medical: '🏥 Medical',
  disaster: '🌊 Disaster',
  abuse_survivor: '🛡️ Survivors',
  education: '📚 Education',
  legal_aid: '⚖️ Legal',
  community: '🤝 Community',
};

export default function DonationsScreen({ navigation }: any) {
  const { country } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [category, setCategory] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const loadCampaigns = async () => {
    try {
      const url = category
        ? `${API_URL}/donations/campaigns/category/${category}?country=${country}`
        : `${API_URL}/donations/campaigns/feed?country=${country}`;
      const res = await axios.get(url);
      setCampaigns(res.data);
    } catch (err) {
      console.log('Failed to load campaigns:', err);
    }
  };

  useEffect(() => { loadCampaigns(); }, [country, category]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCampaigns();
    setRefreshing(false);
  };

  const renderCampaign = ({ item }: { item: Campaign }) => {
    const pct = Math.min((Number(item.raisedAmount) / Number(item.targetAmount)) * 100, 100);
    return (
      <TouchableOpacity style={styles.card} onPress={() => navigation?.navigate('CampaignDetail', { id: item.id })}>
        {item.isEmergency && (
          <View style={styles.emergencyBadge}><Text style={styles.emergencyText}>🚨 EMERGENCY</Text></View>
        )}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={2}>{item.description}</Text>

        {/* Progress Bar */}
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.raised}>{item.currency} {Number(item.raisedAmount).toLocaleString()}</Text>
          <Text style={styles.target}>of {item.currency} {Number(item.targetAmount).toLocaleString()}</Text>
        </View>

        <View style={styles.cardFooter}>
          <Text style={styles.donors}>{item.donorCount} donors</Text>
          <Text style={styles.categoryLabel}>{item.category.replace('_', ' ')}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.headerTitle}>Helping Hands 🤝</Text>
            <Text style={styles.headerSub}>Support fellow Africans in need</Text>
          </View>
          <TouchableOpacity style={{ backgroundColor: '#F97316', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }} onPress={() => navigation?.navigate('CreateCampaign')}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>+ Campaign</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filter */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, category === item && styles.filterChipActive]}
            onPress={() => setCategory(item)}>
            <Text style={[styles.filterText, category === item && styles.filterTextActive]}>
              {CATEGORY_LABELS[item]}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Campaigns */}
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={renderCampaign}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.humanitarian} />}
        ListEmptyComponent={
          <View style={styles.empty}><Text style={styles.emptyText}>No campaigns yet</Text></View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.light.border },
  headerTitle: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.humanitarian },
  headerSub: { fontSize: theme.fontSize.xs, color: theme.colors.light.textSecondary, marginTop: 2 },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border },
  filterChipActive: { backgroundColor: theme.colors.humanitarian, borderColor: theme.colors.humanitarian },
  filterText: { fontSize: 12, color: theme.colors.light.textSecondary, fontWeight: '500' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', borderRadius: theme.borderRadius.md, padding: 16, borderWidth: 1, borderColor: theme.colors.light.border },
  emergencyBadge: { backgroundColor: theme.colors.emergency, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  emergencyText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  cardTitle: { fontSize: theme.fontSize.md, fontWeight: '600', color: theme.colors.light.text, marginBottom: 4 },
  cardDesc: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, marginBottom: 12, lineHeight: 20 },
  progressBg: { height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: theme.colors.humanitarian, borderRadius: 3 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  raised: { fontSize: 12, fontWeight: '700', color: theme.colors.humanitarian },
  target: { fontSize: 12, color: theme.colors.light.textSecondary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.light.border },
  donors: { fontSize: 11, color: theme.colors.light.textSecondary },
  categoryLabel: { fontSize: 11, color: theme.colors.light.textSecondary, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: theme.fontSize.md, color: theme.colors.light.textSecondary },
});

import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { leaderboardAPI } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../store/useI18n';
import { theme } from '../theme';

const PERIODS = ['week', 'month', 'all'] as const;

export default function LeaderboardScreen() {
  const { country } = useAppStore();
  const { t } = useI18n();
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('week');
  const [data, setData] = useState<any[]>([]);
  const [myRank, setMyRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      leaderboardAPI.getTop(country, period).then((r) => setData(r.data)),
      leaderboardAPI.getMyRank(country, period).then((r) => setMyRank(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [country, period]);

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.row}>
      <Text style={styles.rank}>{getRankEmoji(item.rank)}</Text>
      <View style={styles.avatar}><Text style={styles.avatarText}>{item.displayName?.[0] || '?'}</Text></View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.displayName || item.username}</Text>
        <Text style={styles.stats}>{item.reportCount} reports · {item.totalUpvotes} upvotes</Text>
      </View>
      <Text style={styles.score}>{item.score}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🏆 {t('leaderboard.title', 'Leaderboard')}</Text>

      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {myRank?.rank && (
        <View style={styles.myRankBox}>
          <Text style={styles.myRankLabel}>Your Rank</Text>
          <Text style={styles.myRankValue}>{getRankEmoji(myRank.rank)} #{myRank.rank} · Score: {myRank.score}</Text>
        </View>
      )}

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : (
        <FlatList data={data} keyExtractor={(item) => item.userId} renderItem={renderItem} contentContainerStyle={styles.list} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background, paddingTop: 60 },
  heading: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.light.text, paddingHorizontal: 16, marginBottom: 16 },
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  periodBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border, alignItems: 'center' },
  periodBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: theme.colors.light.textSecondary },
  periodTextActive: { color: '#fff' },
  myRankBox: { marginHorizontal: 16, padding: 14, backgroundColor: '#ecfdf5', borderRadius: 10, marginBottom: 16 },
  myRankLabel: { fontSize: 11, color: theme.colors.primary, fontWeight: '600' },
  myRankValue: { fontSize: 15, fontWeight: '700', color: theme.colors.light.text, marginTop: 2 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.light.border },
  rank: { fontSize: 16, fontWeight: '700', width: 36, textAlign: 'center' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.light.text },
  stats: { fontSize: 11, color: theme.colors.light.textSecondary, marginTop: 2 },
  score: { fontSize: 16, fontWeight: '700', color: theme.colors.primary },
  loadingText: { textAlign: 'center', color: theme.colors.light.textSecondary, marginTop: 40 },
});

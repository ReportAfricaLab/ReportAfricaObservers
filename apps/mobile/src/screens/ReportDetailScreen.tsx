import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { reportsAPI } from '../services/api';
import { theme } from '../theme';

export default function ReportDetailScreen({ route }: any) {
  const { id } = route.params;
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reportsAPI.getById(id).then((res) => setReport(res.data)).finally(() => setLoading(false));
  }, [id]);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    try {
      const res = type === 'upvote' ? await reportsAPI.upvote(id) : await reportsAPI.downvote(id);
      setReport(res.data);
    } catch {}
  };

  if (loading) return <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>;
  if (!report) return <View style={styles.center}><Text style={styles.loadingText}>Report not found</Text></View>;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return theme.colors.emergency;
      case 'high': return theme.colors.humanitarian;
      case 'medium': return theme.colors.secondary;
      default: return theme.colors.info;
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Severity + Category */}
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: getSeverityColor(report.severity) }]}>
          <Text style={styles.badgeText}>{report.severity.toUpperCase()}</Text>
        </View>
        <Text style={styles.category}>{report.category.replace('_', ' ')}</Text>
        <Text style={styles.verification}>{report.verificationLevel.replace('_', ' ')}</Text>
      </View>

      <Text style={styles.title}>{report.title}</Text>
      <Text style={styles.description}>{report.description}</Text>

      {/* Location */}
      <View style={styles.locationBox}>
        <Text style={styles.locationText}>📍 {report.city || report.state || `${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`}</Text>
        <Text style={styles.countryText}>{report.country}</Text>
      </View>

      {/* Author */}
      <View style={styles.authorRow}>
        <Text style={styles.authorLabel}>Reported by </Text>
        <Text style={styles.authorName}>{report.author?.displayName || 'Anonymous'}</Text>
        {report.author?.trustLevel && (
          <Text style={styles.trustBadge}>{report.author.trustLevel.replace('_', ' ')}</Text>
        )}
      </View>
      <Text style={styles.date}>{new Date(report.createdAt).toLocaleString()}</Text>

      {/* Voting */}
      <View style={styles.voteRow}>
        <TouchableOpacity style={styles.confirmBtn} onPress={() => handleVote('upvote')}>
          <Text style={styles.confirmText}>↑ Confirm ({report.upvotes})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.disputeBtn} onPress={() => handleVote('downvote')}>
          <Text style={styles.disputeText}>↓ Dispute ({report.downvotes})</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.views}>👁️ {report.viewCount} views · 💬 {report.commentCount} comments</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { padding: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.light.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  category: { fontSize: 12, color: theme.colors.light.textSecondary, textTransform: 'capitalize' },
  verification: { marginLeft: 'auto', fontSize: 11, color: theme.colors.primary, textTransform: 'capitalize' },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.light.text, marginBottom: 10 },
  description: { fontSize: theme.fontSize.md, color: theme.colors.light.textSecondary, lineHeight: 24, marginBottom: 20 },
  locationBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.light.border, marginBottom: 16 },
  locationText: { fontSize: 13, color: theme.colors.light.textSecondary },
  countryText: { fontSize: 12, color: theme.colors.light.textSecondary },
  authorRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  authorLabel: { fontSize: 13, color: theme.colors.light.textSecondary },
  authorName: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text },
  trustBadge: { marginLeft: 8, fontSize: 11, color: theme.colors.secondary, textTransform: 'capitalize' },
  date: { fontSize: 12, color: theme.colors.light.textSecondary, marginBottom: 20 },
  voteRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  confirmBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#ecfdf5', borderRadius: 8, alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#059669' },
  disputeBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center' },
  disputeText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  views: { fontSize: 12, color: theme.colors.light.textSecondary, textAlign: 'center' },
});

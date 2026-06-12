import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert, Share } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { reportsAPI, followsAPI, tipsAPI, reportUpdatesAPI } from '../services/api';
import api from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../store/useI18n';
import { theme } from '../theme';

const CURRENCY_RATES: Record<string, number> = {
  NGN: 1500, GHS: 14, KES: 150, ZAR: 18, UGX: 3700, RWF: 1300,
  TZS: 2600, ETB: 57, XOF: 600, XAF: 600, EGP: 48, MAD: 10,
  DZD: 135, TND: 3.1, AOA: 850, MZN: 64, CDF: 2700, SDG: 600,
  LYD: 4.8, USD: 1, ZMW: 26, MWK: 1700, SLE: 22, LRD: 190,
  SOS: 570, MGA: 4500,
};

function getTipPresets(currency: string): number[] {
  const rate = CURRENCY_RATES[currency] || 1;
  const usdAmounts = [1, 2, 3.5, 7];
  return usdAmounts.map((usd) => Math.round(usd * rate / 100) * 100 || Math.round(usd * rate));
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', UGX: 'USh', RWF: 'RWF',
  TZS: 'TSh', ETB: 'Br', XOF: 'CFA', XAF: 'FCFA', EGP: 'E£', MAD: 'MAD',
  DZD: 'DA', TND: 'DT', AOA: 'Kz', MZN: 'MT', CDF: 'FC', SDG: 'SDG',
  LYD: 'LD', USD: '$', ZMW: 'ZK', MWK: 'MK', SLE: 'Le', LRD: 'L$',
  SOS: 'Sh', MGA: 'Ar',
};

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', RW: 'RWF',
  TZ: 'TZS', ET: 'ETB', SN: 'XOF', CM: 'XAF', EG: 'EGP', MA: 'MAD',
  DZ: 'DZD', TN: 'TND', CI: 'XOF', AO: 'AOA', MZ: 'MZN', CD: 'CDF',
  SD: 'SDG', LY: 'LYD', ZW: 'USD', ZM: 'ZMW', MW: 'MWK', BJ: 'XOF',
  TG: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', SL: 'SLE', LR: 'LRD',
  SO: 'SOS', MG: 'MGA',
};

export default function ReportDetailScreen({ route }: any) {
  const { id } = route.params;
  const navigation = useNavigation<any>();
  const { user, userCountry } = useAppStore();
  const { t } = useI18n();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [updates, setUpdates] = useState<any[]>([]);
  const [showTip, setShowTip] = useState(false);
  const [tipBalance, setTipBalance] = useState(0);
  const [updateText, setUpdateText] = useState('');
  const [verifyStats, setVerifyStats] = useState<any>(null);
  const [verifyComment, setVerifyComment] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);

  const currency = COUNTRY_CURRENCY[userCountry] || 'NGN';
  const symbol = CURRENCY_SYMBOLS[currency] || '₦';
  const presets = getTipPresets(currency);

  useEffect(() => {
    reportsAPI.getById(id).then((res) => setReport(res.data)).finally(() => setLoading(false));
    reportUpdatesAPI.getByReport(id).then((res) => setUpdates(res.data?.data || [])).catch(() => {});
    tipsAPI.getBalance().then((res) => setTipBalance(res.data?.balance || 0)).catch(() => {});
    api.get(`/reports/${id}/verify`).then((res) => setVerifyStats(res.data)).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!report?.author?.id || report.author.id === user?.id) return;
    followsAPI.isFollowing(report.author.id).then((res) => setIsFollowing(res.data)).catch(() => {});
  }, [report]);

  const handleVote = async (type: 'upvote' | 'downvote') => {
    try {
      const res = type === 'upvote' ? await reportsAPI.upvote(id) : await reportsAPI.downvote(id);
      setReport(res.data);
    } catch {}
  };

  const handleFollow = async () => {
    if (!report?.author?.id) return;
    try {
      if (isFollowing) {
        await followsAPI.unfollow(report.author.id);
        setIsFollowing(false);
      } else {
        await followsAPI.follow(report.author.id);
        setIsFollowing(true);
      }
    } catch {}
  };

  const handleTip = async (amount: number) => {
    if (tipBalance < amount) {
      Alert.alert('Insufficient Balance', `You need ${symbol}${amount} but have ${symbol}${tipBalance}. Buy a tip pack first.`);
      return;
    }
    try {
      const res = await tipsAPI.sendTip({ reportId: id, amount });
      setTipBalance(res.data?.remainingBalance ?? tipBalance - amount);
      Alert.alert('Tip Sent! 🎉', `You tipped ${symbol}${amount} to this reporter.`);
      setShowTip(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to send tip');
    }
  };

  const handlePostUpdate = async () => {
    if (!updateText.trim()) return;
    try {
      await reportUpdatesAPI.create({ reportId: id, text: updateText.trim() });
      const res = await reportUpdatesAPI.getByReport(id);
      setUpdates(res.data?.data || []);
      setUpdateText('');
    } catch { Alert.alert('Error', 'Failed to post update'); }
  };

  const HIGH_RISK_CATEGORIES = ['election', 'police_security', 'emergency', 'health'];
  const handleShare = () => {
    const doShare = () => Share.share({ message: `${report.title} — ReportAfrica https://reportafrica-web.vercel.app/report?id=${id}` });
    if (HIGH_RISK_CATEGORIES.includes(report.category) && report.verificationLevel === 'unverified') {
      Alert.alert(
        '⚠️ Unverified Report',
        'This report has NOT been verified. Sharing false information about elections, security, or emergencies may have legal consequences.\n\nAre you sure you want to share?',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Share Anyway', style: 'destructive', onPress: doShare }]
      );
    } else {
      doShare();
    }
  };

  if (loading) return <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>;
  if (!report) return <View style={styles.center}><Text style={styles.loadingText}>Report not found</Text></View>;

  const isAuthor = report.authorId === user?.id || report.author?.id === user?.id;

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
        {report.contentHash && <Text style={styles.evidenceBadge}>🔒 Evidence Sealed</Text>}
      </View>

      <Text style={styles.title}>{report.aiHeadline || report.title}</Text>
      {verifyStats && verifyStats.disputes >= 3 && (
        <View style={styles.disputedBanner}>
          <Text style={styles.disputedTitle}>⚠️ Disputed: Under community review</Text>
          <Text style={styles.disputedSub}>{verifyStats.disputes} members flagged concerns about accuracy.</Text>
        </View>
      )}
      <Text style={styles.description}>{translatedText || report.description}</Text>
      <TouchableOpacity onPress={async () => {
        if (translatedText) { setTranslatedText(''); return; }
        setTranslating(true);
        try {
          const res = await api.post('/voice/translate', { text: report.description, targetLanguage: 'en' });
          setTranslatedText(res.data?.translatedText || report.description);
        } catch { }
        setTranslating(false);
      }}>
        <Text style={styles.translateBtn}>{translating ? '⏳ Translating...' : translatedText ? '↩️ Show original' : '🌐 Translate'}</Text>
      </TouchableOpacity>

      {/* Location */}
      <View style={styles.locationBox}>
        <Text style={styles.locationText}>📍 {report.city || report.state || `${Number(report.latitude).toFixed(4)}, ${Number(report.longitude).toFixed(4)}`}</Text>
        <Text style={styles.countryText}>{report.country}</Text>
      </View>

      {/* Author + Follow */}
      <View style={styles.authorSection}>
        <View style={styles.authorInfo}>
          <Text style={styles.authorLabel}>Reported by </Text>
          <Text style={styles.authorName}>{report.author?.displayName || 'Anonymous'}</Text>
        </View>
        {report.author?.id && !isAuthor && (
          <TouchableOpacity style={[styles.followBtn, isFollowing && styles.followBtnActive]} onPress={handleFollow}>
            <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
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

      {/* Share */}
      <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
        <Text style={styles.shareBtnText}>📤 Share Report</Text>
      </TouchableOpacity>

      {/* Verification Section */}
      <View style={styles.verifySection}>
        <Text style={styles.verifySectionTitle}>🔍 Verify This Report</Text>
        {verifyStats && (
          <View style={styles.verifyStatsRow}>
            <Text style={styles.verifyStatGreen}>✅ {verifyStats.confirms || 0} confirms</Text>
            <Text style={styles.verifyStatRed}>❌ {verifyStats.disputes || 0} disputes</Text>
            <Text style={styles.verifyStatScore}>{verifyStats.credibilityScore || 0}% credible</Text>
          </View>
        )}
        <TextInput style={styles.verifyInput} value={verifyComment} onChangeText={setVerifyComment}
          placeholder="Optional: why do you confirm/dispute?" maxLength={200} />
        <View style={styles.verifyBtnRow}>
          <TouchableOpacity style={styles.verifyConfirmBtn} onPress={async () => {
            try {
              const res = await api.post(`/reports/${id}/verify`, { vote: 'confirm', comment: verifyComment });
              setVerifyStats(res.data); setVerifyComment('');
              Alert.alert('Verified', 'You confirmed this report.');
            } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Already voted'); }
          }}>
            <Text style={styles.verifyConfirmText}>✅ Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.verifyDisputeBtn} onPress={async () => {
            try {
              const res = await api.post(`/reports/${id}/verify`, { vote: 'dispute', comment: verifyComment });
              setVerifyStats(res.data); setVerifyComment('');
              Alert.alert('Disputed', 'You disputed this report.');
            } catch (e: any) { Alert.alert('Error', e?.response?.data?.message || 'Already voted'); }
          }}>
            <Text style={styles.verifyDisputeText}>❌ Dispute</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tip Reporter */}
      {!isAuthor && (
        <>
          <TouchableOpacity style={styles.tipBtn} onPress={() => setShowTip(!showTip)}>
            <Text style={styles.tipBtnText}>💰 {t('tip.tipReporter', 'Tip Reporter')}</Text>
            <Text style={styles.tipBalanceText}>{t('tip.balance', 'Balance')}: {symbol}{tipBalance}</Text>
          </TouchableOpacity>
          {showTip && (
            <View style={styles.tipForm}>
              {report.country !== userCountry && (
                <Text style={styles.conversionNote}>{t('tip.conversionNote', 'Reporter will receive equivalent in their local currency')}</Text>
              )}
              <View style={styles.tipPresetsRow}>
                {presets.map((amt) => (
                  <TouchableOpacity key={amt} style={styles.tipPresetBtn} onPress={() => handleTip(amt)}>
                    <Text style={styles.tipPresetText}>{symbol}{amt.toLocaleString()}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.buyPackBtn} onPress={() => navigation.navigate('BuyTipPack')}>
                <Text style={styles.buyPackText}>+ Buy Tip Pack</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {/* Comments Button */}
      <TouchableOpacity style={styles.commentsBtn} onPress={() => navigation.navigate('Comments', { reportId: id })}>
        <Text style={styles.commentsBtnText}>💬 {t('report.comments', 'View Comments')} ({report.commentCount})</Text>
      </TouchableOpacity>

      {/* Report Updates */}
      <View style={styles.updatesSection}>
        <Text style={styles.updatesTitle}>📝 {t('update.title', 'Updates')} ({updates.length})</Text>

        {isAuthor && (
          <View style={styles.updateInputRow}>
            <TextInput style={styles.updateInput} value={updateText} onChangeText={setUpdateText}
              placeholder="Post an update on this report..." multiline maxLength={500} />
            <TouchableOpacity style={styles.updatePostBtn} onPress={handlePostUpdate}>
              <Text style={styles.updatePostText}>Post</Text>
            </TouchableOpacity>
          </View>
        )}

        {updates.map((u: any) => (
          <View key={u.id} style={styles.updateCard}>
            <Text style={styles.updateType}>{u.type === 'resolution' ? '✅' : u.type === 'escalation' ? '⚠️' : '📝'} {u.type}</Text>
            <Text style={styles.updateText}>{u.text}</Text>
            <Text style={styles.updateTime}>{new Date(u.createdAt).toLocaleString()}</Text>
          </View>
        ))}

        {updates.length === 0 && <Text style={styles.noUpdates}>{t('update.empty', 'No updates yet')}</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { padding: 16, paddingTop: 60, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.light.textSecondary },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  category: { fontSize: 12, color: theme.colors.light.textSecondary, textTransform: 'capitalize' },
  verification: { marginLeft: 'auto', fontSize: 11, color: theme.colors.primary, textTransform: 'capitalize' },
  evidenceBadge: { fontSize: 10, color: '#1d4ed8', backgroundColor: '#eff6ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden', marginLeft: 6 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.light.text, marginBottom: 10 },
  disputedBanner: { backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 8, padding: 12, marginBottom: 12 },
  disputedTitle: { fontSize: 13, fontWeight: '700', color: '#92400e' },
  disputedSub: { fontSize: 11, color: '#b45309', marginTop: 4 },
  description: { fontSize: theme.fontSize.md, color: theme.colors.light.textSecondary, lineHeight: 24, marginBottom: 8 },
  translateBtn: { fontSize: 12, color: theme.colors.info, fontWeight: '600', marginBottom: 16 },
  locationBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.light.border, marginBottom: 16 },
  locationText: { fontSize: 13, color: theme.colors.light.textSecondary },
  countryText: { fontSize: 12, color: theme.colors.light.textSecondary },
  authorSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  authorInfo: { flexDirection: 'row', alignItems: 'center' },
  authorLabel: { fontSize: 13, color: theme.colors.light.textSecondary },
  authorName: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text },
  followBtn: { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: theme.colors.primary, borderRadius: 6 },
  followBtnActive: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: theme.colors.light.border },
  followBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  followBtnTextActive: { color: theme.colors.light.textSecondary },
  date: { fontSize: 12, color: theme.colors.light.textSecondary, marginBottom: 20 },
  voteRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  confirmBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#ecfdf5', borderRadius: 8, alignItems: 'center' },
  confirmText: { fontSize: 14, fontWeight: '600', color: '#059669' },
  disputeBtn: { flex: 1, paddingVertical: 12, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center' },
  disputeText: { fontSize: 14, fontWeight: '600', color: '#dc2626' },
  views: { fontSize: 12, color: theme.colors.light.textSecondary, textAlign: 'center', marginBottom: 12 },
  shareBtn: { paddingVertical: 12, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  shareBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.light.text },
  tipBtn: { paddingVertical: 12, backgroundColor: '#fef3c7', borderRadius: 8, alignItems: 'center', marginBottom: 8, flexDirection: 'row', justifyContent: 'center', gap: 10 },
  tipBtnText: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  tipBalanceText: { fontSize: 12, color: '#92400e' },
  tipForm: { marginBottom: 12 },
  tipPresetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tipPresetBtn: { flex: 1, minWidth: '45%', paddingVertical: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.secondary, alignItems: 'center' },
  tipPresetText: { fontSize: 14, fontWeight: '600', color: '#92400e' },
  buyPackBtn: { paddingVertical: 10, backgroundColor: '#f3f4f6', borderRadius: 8, alignItems: 'center' },
  buyPackText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
  conversionNote: { fontSize: 11, color: theme.colors.info, textAlign: 'center', marginBottom: 8, fontStyle: 'italic' },
  commentsBtn: { paddingVertical: 14, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: theme.colors.light.border, alignItems: 'center', marginBottom: 20 },
  commentsBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  updatesSection: { marginTop: 4 },
  updatesTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.light.text, marginBottom: 12 },
  updateInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  updateInput: { flex: 1, borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, maxHeight: 80 },
  updatePostBtn: { paddingHorizontal: 16, backgroundColor: theme.colors.primary, borderRadius: 8, justifyContent: 'center' },
  updatePostText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  updateCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.light.border, marginBottom: 8 },
  updateType: { fontSize: 11, fontWeight: '600', color: theme.colors.primary, textTransform: 'capitalize', marginBottom: 4 },
  updateText: { fontSize: 14, color: theme.colors.light.text, lineHeight: 20 },
  updateTime: { fontSize: 11, color: theme.colors.light.textSecondary, marginTop: 6 },
  noUpdates: { fontSize: 13, color: theme.colors.light.textSecondary, textAlign: 'center', paddingVertical: 12 },
  verifySection: { backgroundColor: '#fff', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.light.border, marginBottom: 16 },
  verifySectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.light.text, marginBottom: 8 },
  verifyStatsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  verifyStatGreen: { fontSize: 12, color: '#059669', fontWeight: '600' },
  verifyStatRed: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
  verifyStatScore: { fontSize: 12, color: theme.colors.info, fontWeight: '600', marginLeft: 'auto' },
  verifyInput: { borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, marginBottom: 10 },
  verifyBtnRow: { flexDirection: 'row', gap: 10 },
  verifyConfirmBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#ecfdf5', borderRadius: 8, alignItems: 'center' },
  verifyConfirmText: { fontSize: 13, fontWeight: '600', color: '#059669' },
  verifyDisputeBtn: { flex: 1, paddingVertical: 10, backgroundColor: '#fef2f2', borderRadius: 8, alignItems: 'center' },
  verifyDisputeText: { fontSize: 13, fontWeight: '600', color: '#dc2626' },
});

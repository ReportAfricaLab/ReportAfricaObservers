import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Alert, Share } from 'react-native';
import { referralAPI } from '../services/api';
import { useI18n } from '../store/useI18n';
import { theme } from '../theme';

export default function ReferralScreen() {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [applyCode, setApplyCode] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [codeRes, statsRes] = await Promise.all([
        referralAPI.getMyCode(),
        referralAPI.getMyReferrals(),
      ]);
      setCode(codeRes.data?.code || '');
      setStats(statsRes.data);
    } catch {}
    setLoading(false);
  };

  const handleShare = async () => {
    if (!code) {
      const res = await referralAPI.generate();
      setCode(res.data?.code || '');
    }
    Share.share({
      message: `Join ReportAfrica — Africa's citizen reporting platform! Use my referral code: ${code}

Sign up: https://reportafrica-web.vercel.app/register`,
    });
  };

  const handleApply = async () => {
    if (!applyCode.trim()) { Alert.alert('Error', 'Enter a referral code'); return; }
    try {
      await referralAPI.apply(applyCode.trim());
      Alert.alert('Success', 'Referral code applied!');
      setApplyCode('');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Invalid or already used code');
    }
  };

  if (loading) return <View style={styles.center}><Text style={styles.loadingText}>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>🎁 {t('activity.referral', 'Referral Program')}</Text>
      <Text style={styles.subheading}>Invite friends and earn trust points when they post their first report</Text>

      {/* My Code */}
      <View style={styles.codeBox}>
        <Text style={styles.codeLabel}>Your Referral Code</Text>
        <Text style={styles.codeValue}>{code || 'Tap Share to generate'}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
          <Text style={styles.shareBtnText}>📤 Share Code</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {stats && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.totalReferred || 0}</Text>
            <Text style={styles.statLabel}>Referred</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats.rewardsPaid || 0}</Text>
            <Text style={styles.statLabel}>Rewards Earned</Text>
          </View>
        </View>
      )}

      {/* Apply Code */}
      <View style={styles.applySection}>
        <Text style={styles.applyLabel}>Have a referral code?</Text>
        <View style={styles.applyRow}>
          <TextInput style={styles.applyInput} value={applyCode} onChangeText={setApplyCode}
            placeholder="Enter code (e.g. RA-XXXX1234)" autoCapitalize="characters" />
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background, padding: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: theme.colors.light.textSecondary },
  heading: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.light.text },
  subheading: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, marginBottom: 24 },
  codeBox: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.light.border, alignItems: 'center', marginBottom: 20 },
  codeLabel: { fontSize: 12, color: theme.colors.light.textSecondary, marginBottom: 8 },
  codeValue: { fontSize: 22, fontWeight: '700', color: theme.colors.primary, letterSpacing: 1, marginBottom: 16 },
  shareBtn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 8 },
  shareBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.light.border, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '700', color: theme.colors.light.text },
  statLabel: { fontSize: 12, color: theme.colors.light.textSecondary, marginTop: 4 },
  applySection: { marginTop: 8 },
  applyLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.light.text, marginBottom: 8 },
  applyRow: { flexDirection: 'row', gap: 8 },
  applyInput: { flex: 1, borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14 },
  applyBtn: { paddingHorizontal: 20, backgroundColor: theme.colors.primary, borderRadius: 8, justifyContent: 'center' },
  applyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { reportsAPI } from '../services/api';
import axios from 'axios';
import { theme } from '../theme';

const API_URL = __DEV__ ? 'http://10.162.41.17:3001/api/v1' : 'https://api.reportafrica.africa/api/v1';

const CATEGORIES = [
  { key: 'medical', label: '🏥 Medical' },
  { key: 'disaster', label: '🌊 Disaster' },
  { key: 'abuse_survivor', label: '🛡️ Survivor' },
  { key: 'education', label: '📚 Education' },
  { key: 'legal_aid', label: '⚖️ Legal' },
  { key: 'community', label: '🤝 Community' },
];

export default function CreateCampaignScreen({ navigation }: any) {
  const { token, country } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [beneficiaryAmount, setBeneficiaryAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [beneficiaryBank, setBeneficiaryBank] = useState('');
  const [beneficiaryAccount, setBeneficiaryAccount] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [agreedToFee, setAgreedToFee] = useState(false);
  const [reportId, setReportId] = useState('');
  const [myReports, setMyReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch user's reports with evidence
    if (token) {
      axios.get(`${API_URL}/reports/feed?country=${country}&page=1`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(res => {
        const reports = res.data?.data || [];
        const { user } = useAppStore.getState();
        const mine = reports.filter((r: any) => r.authorId === user?.id && r.media?.length > 0);
        setMyReports(mine);
      }).catch(() => {});
    }
  }, [token, country]);

  const amount = Number(beneficiaryAmount) || 0;
  const reporterCommission = Math.round(amount * 0.10);
  const platformFee = Math.round(amount * 0.15);
  const campaignGoal = amount + reporterCommission + platformFee;

  const handleSubmit = async () => {
    if (!category) { Alert.alert('Error', 'Select a category'); return; }
    if (!title || !description) { Alert.alert('Error', 'Fill in title and description'); return; }
    if (!reportId) { Alert.alert('Error', 'You must link this campaign to one of your reports'); return; }
    if (!beneficiaryBank || !beneficiaryAccount) { Alert.alert('Error', 'Bank details required'); return; }
    if (!agreedToFee) { Alert.alert('Error', 'You must agree to the fee structure'); return; }
    if (amount < 1000) { Alert.alert('Error', 'Minimum amount is 1,000'); return; }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/donations/campaigns`, {
        title, description, category, targetAmount: campaignGoal, beneficiaryAmount: amount,
        currency, isEmergency, beneficiaryName, beneficiaryBank, beneficiaryAccount,
        agreedToPlatformFee: true, reportId,
      }, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Campaign submitted for review!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create campaign');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Create Helping Hands Campaign</Text>
      <Text style={styles.subheading}>Raise funds for someone in need through your verified report</Text>

      {/* Requirements */}
      <View style={styles.requirementsBox}>
        <Text style={styles.requirementsTitle}>📋 Requirements:</Text>
        <Text style={styles.requirementsItem}>✅ Trust Score above 50</Text>
        <Text style={styles.requirementsItem}>✅ Completed Course 3: Investigative Journalism (Academy)</Text>
        <Text style={styles.requirementsItem}>✅ Must link to your own report with evidence</Text>
      </View>

      {/* Link to Report */}
      <Text style={styles.label}>Link to Your Report *</Text>
      {myReports.length > 0 ? (
        <View style={styles.reportList}>
          {myReports.map((r: any) => (
            <TouchableOpacity key={r.id} style={[styles.reportItem, reportId === r.id && styles.reportItemActive]} onPress={() => setReportId(r.id)}>
              <Text style={[styles.reportItemText, reportId === r.id && { color: '#fff' }]} numberOfLines={1}>{r.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.noReports}>No eligible reports. You need a report with photos/videos.</Text>
      )}

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity key={cat.key} style={[styles.categoryChip, category === cat.key && styles.categoryChipActive]} onPress={() => setCategory(cat.key)}>
            <Text style={[styles.categoryChipText, category === cat.key && { color: '#fff' }]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title & Description */}
      <Text style={styles.label}>Campaign Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Help Amina get surgery" maxLength={200} />

      <Text style={styles.label}>Story / Description</Text>
      <TextInput style={[styles.input, { height: 120, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="Tell the community what happened..." multiline maxLength={10000} />

      {/* Beneficiary Amount */}
      <Text style={styles.label}>How much does the beneficiary need?</Text>
      <TextInput style={styles.input} value={beneficiaryAmount} onChangeText={setBeneficiaryAmount} placeholder="500000" keyboardType="numeric" />

      {/* Fee Breakdown */}
      {amount > 0 && (
        <View style={styles.breakdownBox}>
          <Text style={styles.breakdownTitle}>Campaign Breakdown:</Text>
          <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Beneficiary receives:</Text><Text style={styles.breakdownValue}>{currency} {amount.toLocaleString()}</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Your commission (10%):</Text><Text style={[styles.breakdownValue, { color: '#059669' }]}>{currency} {reporterCommission.toLocaleString()}</Text></View>
          <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Platform fee (15%):</Text><Text style={styles.breakdownValue}>{currency} {platformFee.toLocaleString()}</Text></View>
          <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 8, marginTop: 8 }]}><Text style={[styles.breakdownLabel, { fontWeight: '700' }]}>Campaign goal (donors see):</Text><Text style={[styles.breakdownValue, { fontWeight: '700', color: '#F97316' }]}>{currency} {campaignGoal.toLocaleString()}</Text></View>
          <Text style={styles.breakdownNote}>💚 Donors only see the total goal. Beneficiary gets 100%.</Text>
        </View>
      )}

      {/* Bank Details */}
      <Text style={styles.label}>Beneficiary Bank Name / Code</Text>
      <TextInput style={styles.input} value={beneficiaryBank} onChangeText={setBeneficiaryBank} placeholder="e.g. 058 (GTBank)" />

      <Text style={styles.label}>Account Number</Text>
      <TextInput style={styles.input} value={beneficiaryAccount} onChangeText={(t) => setBeneficiaryAccount(t.replace(/\D/g, ''))} placeholder="0123456789" keyboardType="numeric" maxLength={10} />

      <Text style={styles.label}>Beneficiary Name</Text>
      <TextInput style={styles.input} value={beneficiaryName} onChangeText={setBeneficiaryName} placeholder="Who will receive the funds?" />

      {/* Emergency */}
      <TouchableOpacity style={styles.checkRow} onPress={() => setIsEmergency(!isEmergency)}>
        <View style={[styles.checkbox, isEmergency && { backgroundColor: '#dc2626', borderColor: '#dc2626' }]} />
        <Text style={styles.checkText}>🚨 Mark as Emergency</Text>
      </TouchableOpacity>

      {/* Agreement */}
      <TouchableOpacity style={styles.checkRow} onPress={() => setAgreedToFee(!agreedToFee)}>
        <View style={[styles.checkbox, agreedToFee && { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.checkText}>I agree to the fee structure</Text>
          <Text style={styles.checkSub}>10% reporter commission + 15% platform fee added on top. Beneficiary receives 100%.</Text>
        </View>
      </TouchableOpacity>

      {/* Submit */}
      <TouchableOpacity style={[styles.submitBtn, (loading || !agreedToFee || !reportId) && { opacity: 0.5 }]} onPress={handleSubmit} disabled={loading || !agreedToFee || !reportId}>
        <Text style={styles.submitBtnText}>{loading ? 'Creating...' : 'Submit Campaign for Review'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { padding: 16, paddingTop: 20, paddingBottom: 40 },
  heading: { fontSize: 20, fontWeight: '700', color: theme.colors.humanitarian },
  subheading: { fontSize: 13, color: theme.colors.light.textSecondary, marginBottom: 16 },
  requirementsBox: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: 10, padding: 12, marginBottom: 16 },
  requirementsTitle: { fontSize: 13, fontWeight: '700', color: '#1e40af', marginBottom: 6 },
  requirementsItem: { fontSize: 11, color: '#1e40af', marginBottom: 2 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text, marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: 10, padding: 12, fontSize: 14 },
  reportList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  reportItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border },
  reportItemActive: { backgroundColor: theme.colors.humanitarian, borderColor: theme.colors.humanitarian },
  reportItemText: { fontSize: 12, color: theme.colors.light.text },
  noReports: { fontSize: 12, color: theme.colors.light.textSecondary, padding: 12, backgroundColor: '#f9fafb', borderRadius: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border },
  categoryChipActive: { backgroundColor: theme.colors.humanitarian, borderColor: theme.colors.humanitarian },
  categoryChipText: { fontSize: 12, color: theme.colors.light.textSecondary, fontWeight: '600' },
  breakdownBox: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 14, marginTop: 10 },
  breakdownTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.light.text, marginBottom: 8 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakdownLabel: { fontSize: 12, color: theme.colors.light.textSecondary },
  breakdownValue: { fontSize: 12, fontWeight: '600', color: theme.colors.light.text },
  breakdownNote: { fontSize: 10, color: theme.colors.light.textSecondary, marginTop: 8 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 14, padding: 12, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: theme.colors.light.border },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.light.border, marginTop: 2 },
  checkText: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text },
  checkSub: { fontSize: 11, color: theme.colors.light.textSecondary, marginTop: 2 },
  submitBtn: { marginTop: 24, backgroundColor: theme.colors.humanitarian, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

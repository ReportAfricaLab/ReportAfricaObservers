import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Vibration } from 'react-native';
import { getCurrentLocation } from '../services/location';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';
import axios from 'axios';

const API_URL = 'http://10.162.41.17:3001/api/v1';

const EMERGENCY_TYPES = [
  { key: 'fire', label: '🔥 Fire', color: '#DC2626' },
  { key: 'violence', label: '⚔️ Violence', color: '#7C2D12' },
  { key: 'accident', label: '🚗 Accident', color: '#EA580C' },
  { key: 'flood', label: '🌊 Flood', color: '#2563EB' },
  { key: 'security_threat', label: '🚨 Security', color: '#991B1B' },
  { key: 'medical', label: '🏥 Medical', color: '#059669' },
];

export default function SOSScreen() {
  const { token } = useAppStore();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [selectedType, setSelectedType] = useState('');

  const triggerSOS = async () => {
    if (!selectedType) { Alert.alert('Select Type', 'Please select the emergency type'); return; }
    setSending(true);
    Vibration.vibrate([0, 200, 100, 200]);

    try {
      const loc = await getCurrentLocation();
      if (!loc) { Alert.alert('Error', 'Cannot detect location'); setSending(false); return; }

      await axios.post(`${API_URL}/emergency/sos`, {
        latitude: loc.latitude,
        longitude: loc.longitude,
        type: selectedType,
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSent(true);
      Alert.alert('🚨 SOS Sent', 'Emergency alert sent to nearby users. Help is on the way.');
    } catch (err) {
      Alert.alert('Error', 'Failed to send SOS. Try again.');
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={styles.sentBox}>
          <Text style={styles.sentIcon}>✅</Text>
          <Text style={styles.sentTitle}>SOS Alert Sent</Text>
          <Text style={styles.sentText}>Nearby users have been alerted. Stay safe.</Text>
          <TouchableOpacity style={styles.resetBtn} onPress={() => { setSent(false); setSelectedType(''); }}>
            <Text style={styles.resetBtnText}>Send Another Alert</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚨 Emergency SOS</Text>
        <Text style={styles.headerSub}>One tap to alert nearby users</Text>
      </View>

      <Text style={styles.label}>What's happening?</Text>
      <View style={styles.typeGrid}>
        {EMERGENCY_TYPES.map((t) => (
          <TouchableOpacity key={t.key}
            style={[styles.typeBtn, selectedType === t.key && { backgroundColor: t.color, borderColor: t.color }]}
            onPress={() => setSelectedType(t.key)}>
            <Text style={[styles.typeBtnText, selectedType === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.sosBtn, sending && styles.sosBtnDisabled]}
        onPress={triggerSOS}
        disabled={sending}>
        <Text style={styles.sosBtnText}>{sending ? 'SENDING...' : 'SEND SOS'}</Text>
      </TouchableOpacity>

      <Text style={styles.disclaimer}>This will share your location and alert users within 5km</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background, padding: 16, paddingTop: 60 },
  header: { marginBottom: 30, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: theme.colors.emergency },
  headerSub: { fontSize: 14, color: theme.colors.light.textSecondary, marginTop: 4 },
  label: { fontSize: 14, fontWeight: '600', color: theme.colors.light.text, marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
  typeBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#fff', borderWidth: 2, borderColor: theme.colors.light.border, width: '47%', alignItems: 'center' },
  typeBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.light.text },
  sosBtn: { backgroundColor: theme.colors.emergency, paddingVertical: 20, borderRadius: 16, alignItems: 'center', marginBottom: 16 },
  sosBtnDisabled: { opacity: 0.6 },
  sosBtnText: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 2 },
  disclaimer: { textAlign: 'center', fontSize: 12, color: theme.colors.light.textSecondary },
  sentBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  sentIcon: { fontSize: 60, marginBottom: 16 },
  sentTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.primary },
  sentText: { fontSize: 14, color: theme.colors.light.textSecondary, marginTop: 8, textAlign: 'center' },
  resetBtn: { marginTop: 30, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 8 },
  resetBtnText: { color: '#fff', fontWeight: '600' },
});

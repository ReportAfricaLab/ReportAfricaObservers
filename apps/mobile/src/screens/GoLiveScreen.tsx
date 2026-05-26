import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { getCurrentLocation } from '../services/location';
import { theme } from '../theme';
import axios from 'axios';

const API_URL = 'http://10.162.41.17:3001/api/v1';

export default function GoLiveScreen() {
  const { token } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [stream, setStream] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [isLive, setIsLive] = useState(false);

  const createStream = async () => {
    if (!title) { Alert.alert('Error', 'Please enter a title'); return; }
    setCreating(true);
    try {
      const loc = await getCurrentLocation();
      const res = await axios.post(`${API_URL}/livestream/create`, {
        title,
        description,
        latitude: loc?.latitude,
        longitude: loc?.longitude,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setStream(res.data);
    } catch (err) {
      Alert.alert('Error', 'Failed to create stream');
    } finally {
      setCreating(false);
    }
  };

  const goLive = async () => {
    try {
      await axios.patch(`${API_URL}/livestream/${stream.id}/go-live`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsLive(true);
    } catch {
      Alert.alert('Error', 'Failed to go live');
    }
  };

  const endStream = async () => {
    try {
      await axios.patch(`${API_URL}/livestream/${stream.id}/end`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsLive(false);
      Alert.alert('Stream Ended', 'Your livestream has been saved as a recording.');
      setStream(null);
      setTitle('');
      setDescription('');
    } catch {
      Alert.alert('Error', 'Failed to end stream');
    }
  };

  // Live state
  if (isLive && stream) {
    return (
      <View style={styles.liveContainer}>
        <View style={styles.liveBadge}><Text style={styles.liveBadgeText}>● LIVE</Text></View>
        <Text style={styles.liveTitle}>{stream.title}</Text>
        <Text style={styles.liveInfo}>Streaming to {stream.country} viewers</Text>
        <Text style={styles.liveUrl}>Playback: {stream.playbackUrl?.substring(0, 50)}...</Text>
        <TouchableOpacity style={styles.endBtn} onPress={endStream}>
          <Text style={styles.endBtnText}>End Stream</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Stream ready state
  if (stream) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heading}>Stream Ready</Text>
          <Text style={styles.subheading}>{stream.title}</Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Ingest Endpoint:</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{stream.ingestEndpoint}</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Playback URL:</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{stream.playbackUrl}</Text>
          </View>

          <TouchableOpacity style={styles.goLiveBtn} onPress={goLive}>
            <Text style={styles.goLiveBtnText}>🔴 GO LIVE</Text>
          </TouchableOpacity>

          <Text style={styles.hint}>Use a streaming app (e.g. Larix) with the ingest endpoint above, or tap GO LIVE to mark your stream as active.</Text>
        </ScrollView>
      </View>
    );
  }

  // Create stream state
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Go Live</Text>
        <Text style={styles.subheading}>Broadcast what's happening in real time</Text>

        <Text style={styles.label}>Stream Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What's happening?" />

        <Text style={styles.label}>Description (optional)</Text>
        <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Add context..." multiline numberOfLines={3} />

        <TouchableOpacity style={[styles.createBtn, creating && styles.createBtnDisabled]} onPress={createStream} disabled={creating}>
          <Text style={styles.createBtnText}>{creating ? 'Setting up...' : 'Create Stream'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { padding: 16, paddingTop: 60 },
  heading: { fontSize: 22, fontWeight: '700', color: theme.colors.light.text },
  subheading: { fontSize: 14, color: theme.colors.light.textSecondary, marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: 8, padding: 12, fontSize: 15 },
  textArea: { height: 80, textAlignVertical: 'top' },
  createBtn: { marginTop: 24, backgroundColor: theme.colors.emergency, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  infoBox: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.light.border, marginBottom: 12 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.light.textSecondary, marginBottom: 4 },
  infoValue: { fontSize: 12, color: theme.colors.light.text, fontFamily: 'monospace' },
  goLiveBtn: { marginTop: 20, backgroundColor: theme.colors.emergency, paddingVertical: 18, borderRadius: 14, alignItems: 'center' },
  goLiveBtnText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  hint: { marginTop: 16, fontSize: 12, color: theme.colors.light.textSecondary, textAlign: 'center', lineHeight: 18 },
  liveContainer: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: 24 },
  liveBadge: { backgroundColor: theme.colors.emergency, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20 },
  liveBadgeText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  liveTitle: { color: '#fff', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  liveInfo: { color: '#aaa', fontSize: 14, marginTop: 8 },
  liveUrl: { color: '#666', fontSize: 11, marginTop: 16, fontFamily: 'monospace' },
  endBtn: { marginTop: 40, backgroundColor: '#fff', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 10 },
  endBtnText: { color: theme.colors.emergency, fontSize: 16, fontWeight: '700' },
});

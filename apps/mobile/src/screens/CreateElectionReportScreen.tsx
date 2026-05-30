import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { getCurrentLocation } from '../services/location';
import { offlineQueue } from '../services/offline-queue';
import { theme } from '../theme';
import axios from 'axios';
import { livestreamAPI } from '../services/api';

const API_URL = 'http://10.162.41.17:3001/api/v1';

const REPORT_TYPES = [
  { key: 'result_upload', label: '📊 Results' },
  { key: 'violence', label: '⚔️ Violence' },
  { key: 'vote_buying', label: '💰 Vote Buying' },
  { key: 'intimidation', label: '😨 Intimidation' },
  { key: 'ballot_snatching', label: '📦 Ballot Snatch' },
  { key: 'observer_report', label: '👁️ Observer' },
];

const ELECTIONS = ['2027 General Election', '2025 Off-Cycle Governorship'];

export default function CreateElectionReportScreen({ navigation }: any) {
  const { token } = useAppStore();
  const [type, setType] = useState('');
  const [election, setElection] = useState(ELECTIONS[0]);
  const [state, setState] = useState('');
  const [lga, setLga] = useState('');
  const [ward, setWard] = useState('');
  const [pollingUnit, setPollingUnit] = useState('');
  const [description, setDescription] = useState('');
  const [results, setResults] = useState<{ party: string; votes: string }[]>([{ party: '', votes: '' }]);
  const [mediaFiles, setMediaFiles] = useState<{ uri: string; type: string }[]>([]);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) { setLatitude(loc.latitude); setLongitude(loc.longitude); }
      const online = await offlineQueue.isOnline();
      setIsOffline(!online);
    })();
  }, []);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const a = result.assets[0];
      setMediaFiles(prev => [...prev, { uri: a.uri, type: a.type === 'video' ? 'video/mp4' : 'image/jpeg' }].slice(0, 5));
    }
  };

  const pickGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8, allowsMultipleSelection: true, selectionLimit: 5 });
    if (!result.canceled) {
      const newFiles = result.assets.map(a => ({ uri: a.uri, type: a.type === 'video' ? 'video/mp4' : 'image/jpeg' }));
      setMediaFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const uploadMedia = async (): Promise<{ type: string; url: string }[]> => {
    const media: { type: string; url: string }[] = [];
    for (const file of mediaFiles) {
      try {
        const fileType = file.type.startsWith('video') ? 'video' : 'image';
        const res = await axios.post(`${API_URL}/upload/presigned-url`, { fileType, contentType: file.type }, { headers: { Authorization: `Bearer ${token}` } });
        const { uploadUrl, fileUrl } = res.data;
        const blob = await fetch(file.uri).then(r => r.blob());
        await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': file.type } });
        media.push({ type: file.type, url: fileUrl });
      } catch {}
    }
    return media;
  };

  const handleGoLive = async () => {
    if (!state) { Alert.alert('Error', 'Enter your state before going live'); return; }

    // Check if offline — switch to record mode
    const online = await offlineQueue.isOnline();
    if (!online) {
      // Open camera in video recording mode
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed'); return; }
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.8 });
      if (!result.canceled && result.assets[0]) {
        await offlineQueue.addElectionReport({
          type: 'observer_report',
          electionName: election,
          state,
          lga: lga || undefined,
          ward: ward || undefined,
          pollingUnit: pollingUnit || undefined,
          description: `Live recording from ${state}${pollingUnit ? ` - PU ${pollingUnit}` : ''}`,
          mediaUris: [result.assets[0].uri],
          latitude: latitude || undefined,
          longitude: longitude || undefined,
          isRecording: true,
        });
        Alert.alert('📹 Recorded!', 'Video saved. Will upload automatically when internet is available.');
      }
      return;
    }

    // Online — proceed with livestream
    try {
      await livestreamAPI.create({
        title: `Election Live: ${state}${pollingUnit ? ` - PU ${pollingUnit}` : ''}`,
        description: `Live from ${election}`,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        electionName: election,
        electionState: state,
        electionPollingUnit: pollingUnit || undefined,
      } as any);
      Alert.alert('Stream Created', 'Your election livestream is ready.');
      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to create livestream');
    }
  };

  const handleSubmit = async () => {
    if (!type) { Alert.alert('Error', 'Select a report type'); return; }
    if (!description && type !== 'result_upload') { Alert.alert('Error', 'Add a description'); return; }

    setSubmitting(true);
    try {
      // Check if offline
      const online = await offlineQueue.isOnline();
      if (!online) {
        await offlineQueue.addElectionReport({
          type,
          electionName: election,
          state: state || undefined,
          lga: lga || undefined,
          ward: ward || undefined,
          pollingUnit: pollingUnit || undefined,
          description: description || undefined,
          results: type === 'result_upload' ? Object.fromEntries(results.filter(r => r.party && r.votes).map(r => [r.party, Number(r.votes)])) : undefined,
          mediaUris: mediaFiles.map(m => m.uri),
          latitude: latitude || undefined,
          longitude: longitude || undefined,
        });
        Alert.alert('Saved Offline', 'Your election report has been saved and will be submitted when internet is available.');
        navigation.goBack();
        setSubmitting(false);
        return;
      }

      // Online — submit normally
      const media = mediaFiles.length > 0 ? await uploadMedia() : [];
      const resultsObj: Record<string, number> = {};
      if (type === 'result_upload') {
        results.forEach(r => { if (r.party && r.votes) resultsObj[r.party] = Number(r.votes); });
      }

      await axios.post(`${API_URL}/elections/report`, {
        type,
        electionName: election,
        state: state || undefined,
        lga: lga || undefined,
        ward: ward || undefined,
        pollingUnit: pollingUnit || undefined,
        description: description || undefined,
        results: Object.keys(resultsObj).length > 0 ? resultsObj : undefined,
        media: media.length > 0 ? media : undefined,
        latitude,
        longitude,
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('Submitted', 'Your election report has been submitted.');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const updateResult = (i: number, field: 'party' | 'votes', val: string) => {
    const copy = [...results];
    copy[i][field] = val;
    setResults(copy);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>⚠️ Offline — reports will be saved and uploaded when connected</Text>
        </View>
      )}
      <Text style={styles.heading}>Election Report</Text>

      {/* Election selector */}
      <View style={styles.electionRow}>
        {ELECTIONS.map(e => (
          <TouchableOpacity key={e} style={[styles.electionChip, election === e && styles.electionChipActive]} onPress={() => setElection(e)}>
            <Text style={[styles.electionChipText, election === e && { color: '#fff' }]} numberOfLines={1}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Type */}
      <Text style={styles.label}>Report Type</Text>
      <View style={styles.typeGrid}>
        {REPORT_TYPES.map(t => (
          <TouchableOpacity key={t.key} style={[styles.typeChip, type === t.key && styles.typeChipActive]} onPress={() => setType(t.key)}>
            <Text style={[styles.typeChipText, type === t.key && { color: '#fff' }]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Location */}
      <Text style={styles.label}>Location</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.halfInput]} value={state} onChangeText={setState} placeholder="State" />
        <TextInput style={[styles.input, styles.halfInput]} value={lga} onChangeText={setLga} placeholder="LGA" />
      </View>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.halfInput]} value={ward} onChangeText={setWard} placeholder="Ward" />
        <TextInput style={[styles.input, styles.halfInput]} value={pollingUnit} onChangeText={setPollingUnit} placeholder="Polling Unit" />
      </View>

      {/* Description */}
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} placeholder="What did you witness?" multiline />

      {/* Results (for result_upload) */}
      {type === 'result_upload' && (
        <>
          <Text style={styles.label}>Vote Counts</Text>
          {results.map((r, i) => (
            <View key={i} style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} value={r.party} onChangeText={v => updateResult(i, 'party', v)} placeholder="Party" />
              <TextInput style={[styles.input, { width: 80 }]} value={r.votes} onChangeText={v => updateResult(i, 'votes', v)} placeholder="Votes" keyboardType="numeric" />
            </View>
          ))}
          <TouchableOpacity onPress={() => setResults([...results, { party: '', votes: '' }])}>
            <Text style={styles.addParty}>+ Add party</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Media */}
      <Text style={styles.label}>Evidence (Photos/Videos)</Text>
      <View style={styles.mediaRow}>
        <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
          <Text style={styles.mediaBtnText}>📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediaBtn} onPress={pickGallery}>
          <Text style={styles.mediaBtnText}>📁 Gallery</Text>
        </TouchableOpacity>
      </View>
      {mediaFiles.length > 0 && (
        <View style={styles.mediaGrid}>
          {mediaFiles.map((m, i) => (
            <View key={i} style={styles.thumb}>
              <Image source={{ uri: m.uri }} style={styles.thumbImg} />
              <TouchableOpacity style={styles.thumbRemove} onPress={() => setMediaFiles(prev => prev.filter((_, j) => j !== i))}>
                <Text style={styles.thumbRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Go Live */}
      <Text style={styles.label}>Or go live from this polling unit</Text>
      <TouchableOpacity style={styles.goLiveBtn} onPress={handleGoLive}>
        <Text style={styles.goLiveBtnText}>{isOffline ? '📹 Record (Offline)' : '🔴 Go Live'}</Text>
      </TouchableOpacity>
      <Text style={styles.disclaimer}>⚠️ Ensure livestreaming is permitted at your polling unit</Text>

      {/* Submit */}
      <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : 'Submit Report'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { padding: 16, paddingBottom: 40 },
  offlineBanner: { backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 12 },
  offlineBannerText: { fontSize: 12, color: '#dc2626', fontWeight: '600', textAlign: 'center' },
  heading: { fontSize: 20, fontWeight: '700', color: theme.colors.light.text, marginBottom: 12 },
  electionRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  electionChip: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border, alignItems: 'center' },
  electionChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  electionChipText: { fontSize: 11, fontWeight: '600', color: theme.colors.light.textSecondary },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.light.text, marginBottom: 8, marginTop: 14 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border },
  typeChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  typeChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.light.textSecondary },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: 8, padding: 10, fontSize: 14 },
  halfInput: { flex: 1 },
  addParty: { color: theme.colors.primary, fontSize: 13, fontWeight: '600', marginTop: 4 },
  mediaRow: { flexDirection: 'row', gap: 10 },
  mediaBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.light.border, alignItems: 'center', backgroundColor: '#fff' },
  mediaBtnText: { fontSize: 13, color: theme.colors.light.textSecondary, fontWeight: '600' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  thumb: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbRemove: { position: 'absolute', top: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#D92D20', alignItems: 'center', justifyContent: 'center' },
  thumbRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  submitBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  goLiveBtn: { backgroundColor: '#000', paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  goLiveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  disclaimer: { fontSize: 11, color: theme.colors.humanitarian, textAlign: 'center', marginTop: 8 },
});

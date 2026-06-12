import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../store/useI18n';
import { reportsAPI, faceBlurAPI } from '../services/api';
import { getCurrentLocation } from '../services/location';
import { offlineQueue } from '../services/offline-queue';
import { voiceRecorder } from '../services/voice-recorder';
import { theme } from '../theme';
import { REPORT_CATEGORY_LABELS } from '../constants';
import axios from 'axios';

const API_URL = __DEV__ ? 'http://10.162.41.17:3001/api/v1' : 'https://34-242-14-140.nip.io/api/v1';

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'] as const;

export default function CreateReportScreen() {
  const { country } = useAppStore();
  const { t } = useI18n();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [severity, setSeverity] = useState<string>('medium');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mediaFiles, setMediaFiles] = useState<{ uri: string; type: string; fileName: string; blurredUri?: string; blurring?: boolean; s3Key?: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  useEffect(() => {
    (async () => {
      const loc = await getCurrentLocation();
      if (loc) {
        setLatitude(loc.latitude);
        setLongitude(loc.longitude);
      }
    })();
  }, []);

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required'); return; }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8, exif: false });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setMediaFiles((prev) => [...prev, { uri: asset.uri, type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg', fileName: asset.fileName || `media_${Date.now()}` }]);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.8, exif: false, allowsMultipleSelection: true, selectionLimit: 5 });
    if (!result.canceled) {
      const newFiles = result.assets.map((a) => ({ uri: a.uri, type: a.type === 'video' ? 'video/mp4' : 'image/jpeg', fileName: a.fileName || `media_${Date.now()}` }));
      setMediaFiles((prev) => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeMedia = (index: number) => setMediaFiles((prev) => prev.filter((_, i) => i !== index));

  const uploadMedia = async (): Promise<string[]> => {
    const { token } = useAppStore.getState();
    const urls: string[] = [];
    for (const media of mediaFiles) {
      try {
        const fileType = media.type.startsWith('video') ? 'video' : 'image';
        const res = await axios.post(`${API_URL}/upload/presigned-url`, { fileType, contentType: media.type }, { headers: { Authorization: `Bearer ${token}` } });
        const { uploadUrl, fileUrl, key } = res.data;
        const blob = await fetch(media.uri).then((r) => r.blob());
        await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': media.type } });

        // Store S3 key for face blur
        media.s3Key = key || fileUrl.split('.com/')[1];

        // Use blurred URL if face blur was applied
        urls.push(media.blurredUri || fileUrl);
      } catch {}
    }
    return urls;
  };

  const handleBlurFaces = async (index: number) => {
    const media = mediaFiles[index];
    if (media.type.startsWith('video')) {
      Alert.alert('Coming Soon', 'Video face blur will be available in a future update.');
      return;
    }

    // Upload image first if not already uploaded
    const { token } = useAppStore.getState();
    setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurring: true } : m));

    try {
      let s3Key = media.s3Key;
      if (!s3Key) {
        // Upload to get S3 key
        const res = await axios.post(`${API_URL}/upload/presigned-url`, { fileType: 'image', contentType: media.type }, { headers: { Authorization: `Bearer ${token}` } });
        const { uploadUrl, fileUrl, key } = res.data;
        const blob = await fetch(media.uri).then((r) => r.blob());
        await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': media.type } });
        s3Key = key || fileUrl.split('.com/')[1];
      }

      // Call face blur API
      const blurRes = await faceBlurAPI.blur(s3Key!);
      if (blurRes.data?.blurred) {
        setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurredUri: blurRes.data.blurredUrl, blurring: false, s3Key } : m));
        Alert.alert('Faces Blurred', `${blurRes.data.facesDetected} face(s) detected and blurred.`);
      } else {
        setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurring: false, s3Key } : m));
        Alert.alert('No Faces', 'No faces were detected in this image.');
      }
    } catch {
      setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurring: false } : m));
      Alert.alert('Error', 'Face blur failed. Try again.');
    }
  };

  const handleUndoBlur = (index: number) => {
    setMediaFiles((prev) => prev.map((m, i) => i === index ? { ...m, blurredUri: undefined } : m));
  };

  const handleVoiceRecord = async () => {
    if (isRecording) {
      setIsRecording(false);
      setTranscribing(true);
      try {
        const uri = await voiceRecorder.stopRecording();
        if (uri) {
          const result = await voiceRecorder.uploadAndTranscribe(uri, 'en');
          if (result.englishText) {
            setDescription((prev) => prev ? `${prev}\n${result.englishText}` : result.englishText);
          }
        }
      } catch {
        Alert.alert('Error', 'Voice transcription failed');
      }
      setTranscribing(false);
    } else {
      try {
        await voiceRecorder.startRecording();
        setIsRecording(true);
      } catch {
        Alert.alert('Error', 'Could not start recording. Check microphone permissions.');
      }
    }
  };

  const handleSubmit = async () => {
    if (!title || !description || !category) {
      Alert.alert('Missing Fields', 'Please fill in title, description, and category.');
      return;
    }
    if (!latitude || !longitude) {
      Alert.alert('Location Required', 'Please enable location to tag your report.');
      return;
    }

    setSubmitting(true);
    try {
      // Check if online
      const online = await offlineQueue.isOnline();
      if (!online) {
        await offlineQueue.addToQueue({ title, description, category, severity, latitude: latitude!, longitude: longitude!, isAnonymous, mediaUris: mediaFiles.map((m) => m.uri) });
        Alert.alert('Saved Offline', 'Your report has been saved and will be submitted when you reconnect.');
        setTitle(''); setDescription(''); setCategory(''); setMediaFiles([]);
        setSubmitting(false);
        return;
      }

      const mediaUrls = await uploadMedia();

      // Generate SHA-256 hash of primary media for evidence integrity
      let contentHash = '';
      if (mediaFiles.length > 0) {
        const { digestStringAsync, CryptoDigestAlgorithm } = require('expo-crypto');
        const fileData = await fetch(mediaFiles[0].uri).then(r => r.text());
        contentHash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, fileData);
      }

      await reportsAPI.create({ title, description, category, severity, latitude, longitude, isAnonymous, mediaUrls, contentHash });
      Alert.alert('Report Submitted', 'Your report has been submitted successfully.');
      setTitle(''); setDescription(''); setCategory(''); setMediaFiles([]);
    } catch (err) {
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>{t('report.create', 'Create Report')}</Text>
      <Text style={styles.subheading}>{t('report.description', 'Report what\'s happening around you')}</Text>

      {/* Category Selection */}
      <Text style={styles.label}>{t('report.category', 'Category')}</Text>
      <View style={styles.categoryGrid}>
        {Object.entries(REPORT_CATEGORY_LABELS).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.categoryChip, category === key && styles.categoryChipActive]}
            onPress={() => setCategory(key)}
          >
            <Text style={[styles.categoryChipText, category === key && styles.categoryChipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Title */}
      <Text style={styles.label}>{t('report.title', 'Title')}</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Brief title of the incident" maxLength={200} />

      <Text style={styles.label}>{t('report.description', 'Description')}</Text>
      <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} placeholder="Describe what is happening..." multiline numberOfLines={5} maxLength={5000} />
      <TouchableOpacity style={[styles.voiceBtn, isRecording && styles.voiceBtnRecording]} onPress={handleVoiceRecord} disabled={transcribing}>
        <Text style={styles.voiceBtnText}>{transcribing ? '⏳...' : isRecording ? '⏹️ Stop' : `🎙️ ${t('report.voice', 'Voice to Text')}`}</Text>
      </TouchableOpacity>

      {/* Severity */}
      <Text style={styles.label}>Severity</Text>
      <View style={styles.severityRow}>
        {SEVERITY_OPTIONS.map((s) => (
          <TouchableOpacity key={s} style={[styles.severityChip, severity === s && styles.severityChipActive]} onPress={() => setSeverity(s)}>
            <Text style={[styles.severityChipText, severity === s && styles.severityChipTextActive]}>{s.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Anonymous Toggle */}
      <TouchableOpacity style={styles.anonymousRow} onPress={() => setIsAnonymous(!isAnonymous)}>
        <View style={[styles.checkbox, isAnonymous && styles.checkboxActive]} />
        <Text style={styles.anonymousText}>Report anonymously</Text>
      </TouchableOpacity>

      {/* Media Capture */}
      <Text style={styles.label}>{t('report.photos', 'Photos / Videos')}</Text>
      <View style={styles.mediaRow}>
        <TouchableOpacity style={styles.mediaBtn} onPress={takePhoto}>
          <Text style={styles.mediaBtnText}>📷 Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.mediaBtn} onPress={pickFromGallery}>
          <Text style={styles.mediaBtnText}>📁 Gallery</Text>
        </TouchableOpacity>
      </View>
      {mediaFiles.length > 0 && (
        <View style={styles.mediaGrid}>
          {mediaFiles.map((m, i) => (
            <View key={i} style={styles.mediaThumbnailWrap}>
              <View style={styles.mediaThumbnail}>
                <Image source={{ uri: m.blurredUri || m.uri }} style={styles.mediaImage} />
                <TouchableOpacity style={styles.mediaRemove} onPress={() => removeMedia(i)}>
                  <Text style={styles.mediaRemoveText}>✕</Text>
                </TouchableOpacity>
                {m.blurredUri && <View style={styles.blurredBadge}><Text style={styles.blurredBadgeText}>✓ Blurred</Text></View>}
                {m.blurring && <View style={styles.blurringOverlay}><Text style={styles.blurringText}>⏳</Text></View>}
              </View>
              {!m.type.startsWith('video') && (
                m.blurredUri ? (
                  <TouchableOpacity style={styles.undoBlurBtn} onPress={() => handleUndoBlur(i)}>
                    <Text style={styles.undoBlurText}>Undo Blur</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.blurFacesBtn} onPress={() => handleBlurFaces(i)} disabled={m.blurring}>
                    <Text style={styles.blurFacesBtnText}>🕲 Blur Faces</Text>
                  </TouchableOpacity>
                )
              )}
              {m.type.startsWith('video') && (
                <Text style={styles.videoLabel}>🎬 Video</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Location Status */}
      <View style={styles.locationRow}>
        <Text style={styles.locationText}>
          📍 {latitude && longitude ? `Location detected (${latitude.toFixed(4)}, ${longitude.toFixed(4)})` : 'Detecting location...'}
        </Text>
      </View>

      {/* Submit */}
      <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.submitBtnText}>{submitting ? '...' : t('report.submit', 'Submit Report')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { padding: 16, paddingTop: 60 },
  heading: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.light.text },
  subheading: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, marginBottom: 24 },
  label: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.light.text, marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: theme.borderRadius.sm, padding: 12, fontSize: theme.fontSize.md },
  textArea: { height: 120, textAlignVertical: 'top' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border },
  categoryChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  categoryChipText: { fontSize: theme.fontSize.xs, color: theme.colors.light.textSecondary },
  categoryChipTextActive: { color: '#fff', fontWeight: '600' },
  severityRow: { flexDirection: 'row', gap: 8 },
  severityChip: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border, alignItems: 'center' },
  severityChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  severityChipText: { fontSize: 11, fontWeight: '600', color: theme.colors.light.textSecondary },
  severityChipTextActive: { color: '#fff' },
  anonymousRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.light.border },
  checkboxActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  anonymousText: { fontSize: theme.fontSize.sm, color: theme.colors.light.text },
  locationRow: { marginTop: 16, padding: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.light.border },
  locationText: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary },
  submitBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: theme.fontSize.md, fontWeight: '700' },
  mediaRow: { flexDirection: 'row', gap: 10 },
  mediaBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.light.border, alignItems: 'center', backgroundColor: '#fff' },
  mediaBtnText: { fontSize: 14, color: theme.colors.light.textSecondary, fontWeight: '600' },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  mediaThumbnailWrap: { width: 100, alignItems: 'center' },
  mediaThumbnail: { width: 100, height: 100, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  mediaImage: { width: '100%', height: '100%' },
  mediaRemove: { position: 'absolute', top: 2, right: 2, width: 20, height: 20, borderRadius: 10, backgroundColor: '#D92D20', alignItems: 'center', justifyContent: 'center' },
  mediaRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  blurredBadge: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(5,150,105,0.85)', paddingVertical: 2, alignItems: 'center' },
  blurredBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  blurringOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  blurringText: { fontSize: 24 },
  blurFacesBtn: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#ede9fe', borderRadius: 6, alignItems: 'center' },
  blurFacesBtnText: { fontSize: 10, fontWeight: '600', color: '#6d28d9' },
  undoBlurBtn: { marginTop: 4, paddingVertical: 4, paddingHorizontal: 6, backgroundColor: '#fef2f2', borderRadius: 6, alignItems: 'center' },
  undoBlurText: { fontSize: 10, fontWeight: '600', color: '#dc2626' },
  videoLabel: { marginTop: 4, fontSize: 10, color: theme.colors.light.textSecondary },
  voiceBtn: { marginTop: 8, paddingVertical: 10, backgroundColor: '#ede9fe', borderRadius: 8, alignItems: 'center' },
  voiceBtnRecording: { backgroundColor: '#fecaca' },
  voiceBtnText: { fontSize: 13, fontWeight: '600', color: '#6d28d9' },
});

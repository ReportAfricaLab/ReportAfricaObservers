import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Image, Alert, Switch, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../store/useI18n';
import { useThemeColors } from '../hooks/useThemeColors';
import { followsAPI, usersAPI, tipsAPI } from '../services/api';
import { theme } from '../theme';
import { COUNTRY_CONFIG } from '../constants';
import axios from 'axios';

const API_URL = __DEV__ ? 'http://10.162.41.17:3001/api/v1' : 'https://api.reportafrica.com/api/v1';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'Français' },
  { code: 'ar', name: 'العربية' },
  { code: 'pt', name: 'Português' },
  { code: 'sw', name: 'Kiswahili' },
];

const TRUST_LABELS: Record<string, { label: string; color: string }> = {
  new_reporter: { label: 'New Reporter', color: '#6B7280' },
  community_reporter: { label: 'Community Reporter', color: '#2563EB' },
  trusted_reporter: { label: 'Trusted Reporter', color: '#059669' },
  elite_reporter: { label: 'Elite Reporter', color: '#7C3AED' },
  investigative_reporter: { label: 'Investigative Reporter', color: '#DC2626' },
};

export default function ProfileScreen() {
  const { user, logout, userCountry, token, setAuth, isDarkMode, toggleDarkMode, secureWipe } = useAppStore();
  const { language, setLanguage, t } = useI18n();
  const colors = useThemeColors();
  const navigation = useNavigation<any>();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [tipBalance, setTipBalance] = useState(0);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [saving, setSaving] = useState(false);
  const [wipeTaps, setWipeTaps] = useState(0);
  const wipeTapTimer = React.useRef<any>(null);

  useEffect(() => {
    if (!user?.id) return;
    followsAPI.getCounts(user.id).then((r) => {
      setFollowers(r.data?.followers || 0);
      setFollowing(r.data?.following || 0);
    }).catch(() => {});
    tipsAPI.getBalance().then((r) => setTipBalance(r.data?.balance || 0)).catch(() => {});
  }, [user]);

  const handleChangePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    try {
      // Get presigned URL
      const presignRes = await axios.post(`${API_URL}/upload/presigned-url`,
        { fileType: 'image', contentType: 'image/jpeg' },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const { uploadUrl, fileUrl } = presignRes.data;

      // Upload to S3
      const blob = await fetch(result.assets[0].uri).then((r) => r.blob());
      await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': 'image/jpeg' } });

      // Update profile with new avatar URL
      await usersAPI.updateProfile({ avatar: fileUrl });
      setAvatar(fileUrl);

      // Update local store
      if (user && token) {
        setAuth({ ...user, avatar: fileUrl }, token);
      }
      Alert.alert('Success', 'Profile photo updated!');
    } catch {
      Alert.alert('Error', 'Failed to upload photo. Try again.');
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) { Alert.alert('Error', 'Name cannot be empty'); return; }
    setSaving(true);
    try {
      await usersAPI.updateProfile({ displayName: displayName.trim() });
      if (user && token) {
        setAuth({ ...user, displayName: displayName.trim() }, token);
      }
      setEditing(false);
      Alert.alert('Success', 'Profile updated!');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    }
    setSaving(false);
  };

  const trustInfo = TRUST_LABELS[user?.trustLevel || 'new_reporter'] || TRUST_LABELS.new_reporter;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Professional Profile Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity activeOpacity={1} onPress={() => {
          const now = Date.now();
          if (wipeTapTimer.current && now - wipeTapTimer.current > 2000) setWipeTaps(0);
          wipeTapTimer.current = now;
          const next = wipeTaps + 1;
          setWipeTaps(next);
          if (next >= 5) { setWipeTaps(0); secureWipe(); }
        }}>
          <View style={styles.coverBar} />
        </TouchableOpacity>
        <View style={styles.profileSection}>
          <TouchableOpacity onPress={handleChangePhoto} style={styles.avatarContainer}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{user?.displayName?.[0] || '?'}</Text>
              </View>
            )}
            <View style={styles.cameraIcon}>
              <Text style={styles.cameraIconText}>📷</Text>
            </View>
          </TouchableOpacity>

          {editing ? (
            <View style={styles.editNameRow}>
              <TextInput style={[styles.editNameInput, { color: colors.text }]} value={displayName} onChangeText={setDisplayName}
                placeholder="Your full name" placeholderTextColor={colors.textSecondary} maxLength={50} />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                <Text style={styles.saveBtnText}>{saving ? '...' : '✓'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setDisplayName(user?.displayName || ''); }}>
                <Text style={styles.cancelBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={[styles.fullName, { color: colors.text }]}>{user?.displayName || 'Reporter'}</Text>
              <Text style={styles.editHint}>Tap to edit name</Text>
            </TouchableOpacity>
          )}

          <Text style={[styles.username, { color: colors.textSecondary }]}>@{user?.username}</Text>

          <View style={styles.trustBadge}>
            <View style={[styles.trustDot, { backgroundColor: trustInfo.color }]} />
            <Text style={[styles.trustText, { color: trustInfo.color }]}>{trustInfo.label}</Text>
          </View>

          <Text style={[styles.locationText, { color: colors.textSecondary }]}>📍 {COUNTRY_CONFIG[userCountry]?.name || userCountry}</Text>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Followers', { userId: user?.id, tab: 'followers' })}>
            <Text style={[styles.statValue, { color: colors.text }]}>{followers}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Followers</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('Followers', { userId: user?.id, tab: 'following' })}>
            <Text style={[styles.statValue, { color: colors.text }]}>{following}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Following</Text>
          </TouchableOpacity>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{user?.trustScore || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Trust Score</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.statItem} onPress={() => navigation.navigate('BuyTipPack')}>
            <Text style={[styles.statValue, { color: colors.text }]}>{tipBalance}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tip Balance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Activity Menu */}
      <View style={styles.menu}>
        <Text style={[styles.menuSectionLabel, { color: colors.textSecondary }]}>Activity</Text>
        {[
          { screen: 'Followers', icon: '👥', label: 'Followers & Following', params: { userId: user?.id } },
          { screen: 'LicenseRequests', icon: '📄', label: 'License Requests' },
          { screen: 'Subscription', icon: '⭐', label: 'Premium Reporter' },
          { screen: 'Business', icon: '🏪', label: 'Business Badges' },
        ].map((item) => (
          <TouchableOpacity key={item.screen} style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => navigation.navigate(item.screen, item.params)}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={[styles.menuText, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.menuArrow, { color: colors.textSecondary }]}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Settings */}
      <View style={styles.menu}>
        <Text style={[styles.menuSectionLabel, { color: colors.textSecondary }]}>Settings</Text>

        <TouchableOpacity style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setShowLangPicker(!showLangPicker)}>
          <Text style={styles.menuIcon}>🌍</Text>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('settings.language', 'Language')}</Text>
          <Text style={styles.menuValue}>{LANGUAGES.find((l) => l.code === language)?.name || 'English'}</Text>
        </TouchableOpacity>

        {showLangPicker && (
          <View style={styles.picker}>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity key={lang.code} style={[styles.pickerItem, language === lang.code && styles.pickerItemActive]}
                onPress={() => { setLanguage(lang.code); setShowLangPicker(false); }}>
                <Text style={[styles.pickerText, language === lang.code && styles.pickerTextActive]}>{lang.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.menuIcon}>🏠</Text>
          <Text style={[styles.menuText, { color: colors.text }]}>{t('profile.yourCountry', 'Your Country')}</Text>
          <Text style={styles.menuValue}>{COUNTRY_CONFIG[userCountry]?.name || userCountry}</Text>
        </View>

        <View style={[styles.menuItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.menuIcon}>🌙</Text>
          <Text style={[styles.menuText, { color: colors.text }]}>Dark Mode</Text>
          <Switch value={isDarkMode} onValueChange={toggleDarkMode} trackColor={{ true: theme.colors.primary }} />
        </View>
      </View>

      {/* More */}
      <View style={styles.menu}>
        <Text style={styles.menuSectionLabel}>More</Text>
        {[
          { page: 'About', icon: 'ℹ️', label: 'About' },
          { page: 'HowItWorks', icon: '📖', label: 'How It Works' },
          { page: 'FAQ', icon: '❓', label: 'FAQ' },
          { page: 'Guidelines', icon: '📋', label: 'Community Guidelines' },
          { page: 'Privacy', icon: '🔒', label: 'Privacy Policy' },
          { page: 'Terms', icon: '📜', label: 'Terms of Service' },
        ].map((item) => (
          <TouchableOpacity key={item.page} style={styles.menuItem} onPress={() => navigation.navigate('Info', { page: item.page })}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuText}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.wipeBtn} onPress={() => {
        Alert.alert(
          '🚨 Clear All Data',
          'This will permanently delete all local data including tokens, cache, and offline reports. You will be logged out. This cannot be undone.',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Clear Everything', style: 'destructive', onPress: secureWipe }]
        );
      }}>
        <Text style={styles.wipeText}>🗑️ Clear My Data</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.academyBtn} onPress={() => {
        const { token: t } = useAppStore.getState();
        Linking.openURL(`https://reportafrica-academy.vercel.app/auth?token=${t || ''}`);
      }}>
        <Text style={styles.academyBtnText}>🎓 Journalist Academy</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { paddingBottom: 40 },
  header: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.light.border },
  coverBar: { height: 80, backgroundColor: theme.colors.primary },
  profileSection: { alignItems: 'center', marginTop: -40, paddingBottom: 16 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: '#fff' },
  avatarFallback: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff' },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.light.border },
  cameraIconText: { fontSize: 12 },
  fullName: { fontSize: 22, fontWeight: '700', color: theme.colors.light.text, textAlign: 'center' },
  editHint: { fontSize: 11, color: theme.colors.primary, textAlign: 'center', marginTop: 2 },
  username: { fontSize: 14, color: theme.colors.light.textSecondary, marginTop: 4 },
  editNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20 },
  editNameInput: { flex: 1, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, fontWeight: '600', textAlign: 'center' },
  saveBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  cancelBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
  trustBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#f9fafb', borderRadius: 20 },
  trustDot: { width: 8, height: 8, borderRadius: 4 },
  trustText: { fontSize: 12, fontWeight: '600' },
  locationText: { fontSize: 13, color: theme.colors.light.textSecondary, marginTop: 8 },
  statsRow: { flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: theme.colors.light.border, marginTop: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.light.text },
  statLabel: { fontSize: 11, color: theme.colors.light.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: theme.colors.light.border },
  menu: { padding: 16, gap: 8 },
  menuSectionLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.light.textSecondary, textTransform: 'uppercase', marginBottom: 4, marginLeft: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.light.border },
  menuIcon: { fontSize: 20, marginRight: 12 },
  menuText: { flex: 1, fontSize: theme.fontSize.md, fontWeight: '500', color: theme.colors.light.text },
  menuArrow: { fontSize: 20, color: theme.colors.light.textSecondary },
  menuValue: { fontSize: 13, color: theme.colors.primary, fontWeight: '500' },
  picker: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 4, paddingVertical: 8 },
  pickerItem: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: theme.colors.light.border },
  pickerItemActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  pickerText: { fontSize: 13, color: theme.colors.light.textSecondary },
  pickerTextActive: { color: '#fff', fontWeight: '600' },
  logoutBtn: { marginHorizontal: 16, marginTop: 20, paddingVertical: 14, backgroundColor: '#fef2f2', borderRadius: theme.borderRadius.md, alignItems: 'center' },
  logoutText: { color: '#dc2626', fontSize: theme.fontSize.md, fontWeight: '600' },
  wipeBtn: { marginHorizontal: 16, marginTop: 10, marginBottom: 10, paddingVertical: 14, backgroundColor: '#f3f4f6', borderRadius: theme.borderRadius.md, alignItems: 'center' },
  wipeText: { color: '#6b7280', fontSize: theme.fontSize.sm, fontWeight: '500' },
  academyBtn: { marginHorizontal: 16, marginBottom: 40, paddingVertical: 14, backgroundColor: '#ecfdf5', borderRadius: theme.borderRadius.md, alignItems: 'center' },
  academyBtnText: { color: '#065f46', fontSize: theme.fontSize.md, fontWeight: '600' },
});

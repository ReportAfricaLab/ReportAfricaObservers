import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppStore } from '../store/useAppStore';
import { useI18n } from '../store/useI18n';
import { theme } from '../theme';
import { COUNTRY_CONFIG } from '../constants';

const LANGUAGES: Record<string, string> = {
  en: 'English',
  yo: 'Yorùbá',
  ha: 'Hausa',
  ig: 'Igbo',
  sw: 'Kiswahili',
  fr: 'Français',
  zu: 'isiZulu',
  af: 'Afrikaans',
  rw: 'Kinyarwanda',
};

export default function ProfileScreen() {
  const { user, logout, country, setCountry } = useAppStore();
  const { language, setLanguage } = useI18n();
  const navigation = useNavigation<any>();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{user?.displayName?.[0] || '?'}</Text></View>
        <Text style={styles.name}>{user?.displayName || 'Reporter'}</Text>
        <Text style={styles.username}>@{user?.username}</Text>
        <Text style={styles.countryBadge}>{COUNTRY_CONFIG[country]?.brandName || 'ReportAfrica'}</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('LicenseRequests')}>
          <Text style={styles.menuIcon}>📄</Text>
          <Text style={styles.menuText}>License Requests</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowLangPicker(!showLangPicker)}>
          <Text style={styles.menuIcon}>🌍</Text>
          <Text style={styles.menuText}>Language</Text>
          <Text style={styles.menuValue}>{LANGUAGES[language] || 'English'}</Text>
        </TouchableOpacity>

        {showLangPicker && (
          <View style={styles.picker}>
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <TouchableOpacity key={code} style={[styles.pickerItem, language === code && styles.pickerItemActive]}
                onPress={() => { setLanguage(code); setShowLangPicker(false); }}>
                <Text style={[styles.pickerText, language === code && styles.pickerTextActive]}>{name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.menuItem} onPress={() => setShowCountryPicker(!showCountryPicker)}>
          <Text style={styles.menuIcon}>📍</Text>
          <Text style={styles.menuText}>Country</Text>
          <Text style={styles.menuValue}>{COUNTRY_CONFIG[country]?.name || country}</Text>
        </TouchableOpacity>

        {showCountryPicker && (
          <View style={styles.picker}>
            {Object.entries(COUNTRY_CONFIG).map(([code, config]) => (
              <TouchableOpacity key={code} style={[styles.pickerItem, country === code && styles.pickerItemActive]}
                onPress={() => { setCountry(code); setShowCountryPicker(false); }}>
                <Text style={[styles.pickerText, country === code && styles.pickerTextActive]}>{config.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background },
  content: { paddingBottom: 40 },
  header: { paddingTop: 60, paddingBottom: 24, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.light.border, alignItems: 'center' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', color: theme.colors.light.text },
  username: { fontSize: 14, color: theme.colors.light.textSecondary, marginTop: 2 },
  countryBadge: { fontSize: 12, color: theme.colors.primary, fontWeight: '600', marginTop: 6, backgroundColor: '#ecfdf5', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  menu: { padding: 16, gap: 8 },
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
});

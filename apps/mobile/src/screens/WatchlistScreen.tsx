import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { watchlistAPI } from '../services/api';
import { getCurrentLocation } from '../services/location';
import { useI18n } from '../store/useI18n';
import { theme } from '../theme';
import { REPORT_CATEGORY_LABELS } from '../constants';

export default function WatchlistScreen() {
  const { t } = useI18n();
  const [watchlists, setWatchlists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [radius, setRadius] = useState('5');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    loadWatchlists();
  }, []);

  const loadWatchlists = () => {
    setLoading(true);
    watchlistAPI.getAll().then((r) => setWatchlists(r.data)).finally(() => setLoading(false));
  };

  const handleCreate = async () => {
    if (!name.trim()) { Alert.alert('Error', 'Please enter a name'); return; }
    const loc = await getCurrentLocation();
    if (!loc) { Alert.alert('Error', 'Could not get location'); return; }

    try {
      await watchlistAPI.create({
        name: name.trim(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        radiusKm: Number(radius) || 5,
        categories: selectedCategories,
      });
      setName(''); setRadius('5'); setSelectedCategories([]); setShowCreate(false);
      loadWatchlists();
    } catch {
      Alert.alert('Error', 'Failed to create watchlist');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete', 'Remove this watchlist?', [
      { text: 'Cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => watchlistAPI.delete(id).then(loadWatchlists) },
    ]);
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName}>📍 {item.name}</Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)}>
          <Text style={styles.deleteText}>✕</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.cardDetail}>Radius: {item.radiusKm}km</Text>
      <Text style={styles.cardDetail}>
        Categories: {item.categories?.length > 0 ? item.categories.join(', ') : 'All'}
      </Text>
      <Text style={[styles.cardStatus, item.isActive ? styles.active : styles.inactive]}>
        {item.isActive ? '● Active' : '○ Paused'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>📍 {t('activity.watchlists', 'Watchlists')}</Text>
      <Text style={styles.subheading}>Get alerts when reports happen near your zones</Text>

      <TouchableOpacity style={styles.createBtn} onPress={() => setShowCreate(!showCreate)}>
        <Text style={styles.createBtnText}>{showCreate ? 'Cancel' : '+ New Watchlist'}</Text>
      </TouchableOpacity>

      {showCreate && (
        <View style={styles.form}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Zone name (e.g. My Home)" />
          <TextInput style={styles.input} value={radius} onChangeText={setRadius} placeholder="Radius in km" keyboardType="numeric" />
          <Text style={styles.label}>Alert categories (optional):</Text>
          <View style={styles.catGrid}>
            {Object.entries(REPORT_CATEGORY_LABELS).map(([key, label]) => (
              <TouchableOpacity key={key} style={[styles.catChip, selectedCategories.includes(key) && styles.catChipActive]} onPress={() => toggleCategory(key)}>
                <Text style={[styles.catChipText, selectedCategories.includes(key) && styles.catChipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleCreate}>
            <Text style={styles.saveBtnText}>Create (uses current location)</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : watchlists.length === 0 ? (
        <Text style={styles.loadingText}>No watchlists yet. Create one to get alerts!</Text>
      ) : (
        <FlatList data={watchlists} keyExtractor={(item) => item.id} renderItem={renderItem} contentContainerStyle={styles.list} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background, paddingTop: 60 },
  heading: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.light.text, paddingHorizontal: 16 },
  subheading: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, paddingHorizontal: 16, marginBottom: 16 },
  createBtn: { marginHorizontal: 16, paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  form: { marginHorizontal: 16, padding: 16, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: theme.colors.light.border, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: theme.colors.light.border, borderRadius: 8, padding: 12, marginBottom: 10, fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.light.textSecondary, marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  catChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: theme.colors.light.border },
  catChipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  catChipText: { fontSize: 11, color: theme.colors.light.textSecondary },
  catChipTextActive: { color: '#fff', fontWeight: '600' },
  saveBtn: { paddingVertical: 12, backgroundColor: theme.colors.primary, borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: theme.colors.light.border },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardName: { fontSize: 15, fontWeight: '600', color: theme.colors.light.text },
  deleteText: { fontSize: 18, color: '#dc2626', fontWeight: '700' },
  cardDetail: { fontSize: 12, color: theme.colors.light.textSecondary, marginBottom: 2 },
  cardStatus: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  active: { color: '#059669' },
  inactive: { color: theme.colors.light.textSecondary },
  loadingText: { textAlign: 'center', color: theme.colors.light.textSecondary, marginTop: 40 },
});

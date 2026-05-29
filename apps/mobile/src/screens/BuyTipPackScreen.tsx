import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { tipsAPI } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';

const TIP_PACKS: Record<string, { cost: number; value: number }[]> = {
  NGN: [{ cost: 2000, value: 1500 }, { cost: 5000, value: 4000 }, { cost: 10000, value: 8500 }, { cost: 25000, value: 22000 }],
  GHS: [{ cost: 20, value: 15 }, { cost: 50, value: 40 }, { cost: 100, value: 85 }, { cost: 250, value: 220 }],
  KES: [{ cost: 200, value: 150 }, { cost: 500, value: 400 }, { cost: 1000, value: 850 }, { cost: 2500, value: 2200 }],
  ZAR: [{ cost: 30, value: 20 }, { cost: 60, value: 50 }, { cost: 120, value: 100 }, { cost: 250, value: 220 }],
  UGX: [{ cost: 7000, value: 5000 }, { cost: 15000, value: 12000 }, { cost: 25000, value: 20000 }, { cost: 60000, value: 50000 }],
  RWF: [{ cost: 2000, value: 1500 }, { cost: 5000, value: 4000 }, { cost: 10000, value: 8500 }, { cost: 25000, value: 22000 }],
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', UGX: 'USh', RWF: 'RWF',
};

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', RW: 'RWF',
};

const PACK_LABELS = ['Starter', 'Popular', 'Supporter', 'Champion'];

export default function BuyTipPackScreen({ navigation }: any) {
  const { user, country } = useAppStore();
  const [balance, setBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(false);

  const currency = COUNTRY_CURRENCY[country] || 'NGN';
  const symbol = CURRENCY_SYMBOLS[currency] || '₦';
  const packs = TIP_PACKS[currency] || TIP_PACKS.NGN;

  useEffect(() => {
    tipsAPI.getBalance().then((res) => setBalance(res.data?.balance || 0)).catch(() => {});
  }, []);

  const handleBuyPack = async (packIndex: number) => {
    if (!user?.email) { Alert.alert('Error', 'Email required'); return; }
    setPurchasing(true);
    try {
      const res = await tipsAPI.buyPack({ packIndex, email: user.email, country });
      const paymentUrl = res.data?.paymentUrl;
      if (paymentUrl) {
        await Linking.openURL(paymentUrl);
        // After payment, user returns and we refresh balance
        setTimeout(() => {
          tipsAPI.getBalance().then((r) => setBalance(r.data?.balance || 0)).catch(() => {});
        }, 5000);
      } else {
        Alert.alert('Error', 'Could not generate payment link');
      }
    } catch {
      Alert.alert('Error', 'Failed to initiate purchase');
    }
    setPurchasing(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>💰 Buy Tip Pack</Text>
      <Text style={styles.subheading}>Buy credits to tip reporters for great reports</Text>

      <View style={styles.balanceBox}>
        <Text style={styles.balanceLabel}>Current Balance</Text>
        <Text style={styles.balanceValue}>{symbol}{balance.toLocaleString()}</Text>
      </View>

      <View style={styles.packsGrid}>
        {packs.map((pack, index) => (
          <TouchableOpacity key={index} style={[styles.packCard, index === 1 && styles.packCardPopular]}
            onPress={() => handleBuyPack(index)} disabled={purchasing}>
            {index === 1 && <Text style={styles.popularBadge}>BEST VALUE</Text>}
            <Text style={styles.packLabel}>{PACK_LABELS[index]}</Text>
            <Text style={styles.packValue}>{symbol}{pack.value.toLocaleString()}</Text>
            <Text style={styles.packValueLabel}>tip credits</Text>
            <View style={styles.packDivider} />
            <Text style={styles.packCost}>Pay {symbol}{pack.cost.toLocaleString()}</Text>
            <Text style={styles.packSavings}>Save {Math.round(((pack.cost - pack.value) / pack.cost) * 100)}% vs direct</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.disclaimer}>
        Payment processed securely via Paystack. Credits are non-refundable and can only be used to tip reporters.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.light.background, padding: 16, paddingTop: 60 },
  heading: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.light.text },
  subheading: { fontSize: theme.fontSize.sm, color: theme.colors.light.textSecondary, marginBottom: 20 },
  balanceBox: { backgroundColor: '#fef3c7', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 24 },
  balanceLabel: { fontSize: 12, color: '#92400e' },
  balanceValue: { fontSize: 28, fontWeight: '700', color: '#92400e', marginTop: 4 },
  packsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  packCard: { width: '47%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.light.border, alignItems: 'center' },
  packCardPopular: { borderColor: theme.colors.secondary, borderWidth: 2 },
  popularBadge: { position: 'absolute', top: -10, backgroundColor: theme.colors.secondary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, fontSize: 9, fontWeight: '700', color: '#fff', overflow: 'hidden' },
  packLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.light.textSecondary, marginBottom: 8 },
  packValue: { fontSize: 20, fontWeight: '700', color: theme.colors.light.text },
  packValueLabel: { fontSize: 11, color: theme.colors.light.textSecondary, marginBottom: 8 },
  packDivider: { width: '100%', height: 1, backgroundColor: theme.colors.light.border, marginVertical: 8 },
  packCost: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  packSavings: { fontSize: 10, color: '#059669', marginTop: 4 },
  disclaimer: { marginTop: 24, fontSize: 11, color: theme.colors.light.textSecondary, textAlign: 'center', lineHeight: 16 },
});

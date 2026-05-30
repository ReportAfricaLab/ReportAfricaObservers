import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { tipsAPI } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import { theme } from '../theme';

const CURRENCY_RATES: Record<string, number> = {
  NGN: 1500, GHS: 14, KES: 150, ZAR: 18, UGX: 3700, RWF: 1300,
  TZS: 2600, ETB: 57, XOF: 600, XAF: 600, EGP: 48, MAD: 10,
  DZD: 135, TND: 3.1, AOA: 850, MZN: 64, CDF: 2700, SDG: 600,
  LYD: 4.8, USD: 1, ZMW: 26, MWK: 1700, SLE: 22, LRD: 190,
  SOS: 570, MGA: 4500,
};

const PACK_MARKUPS = [0.25, 0.20, 0.15, 0.12, 0.10, 0.08];
const PACK_USD_COSTS = [1.5, 3.5, 7, 16, 33, 65];

function getPacksForCurrency(currency: string): { cost: number; value: number }[] {
  const rate = CURRENCY_RATES[currency] || 1;
  return PACK_USD_COSTS.map((usdCost, i) => {
    const cost = Math.round(usdCost * rate / 100) * 100 || Math.round(usdCost * rate);
    const value = Math.round(cost * (1 - PACK_MARKUPS[i]));
    return { cost, value };
  });
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  NGN: '₦', GHS: 'GH₵', KES: 'KSh', ZAR: 'R', UGX: 'USh', RWF: 'RWF',
  TZS: 'TSh', ETB: 'Br', XOF: 'CFA', XAF: 'FCFA', EGP: 'E£', MAD: 'MAD',
  DZD: 'DA', TND: 'DT', AOA: 'Kz', MZN: 'MT', CDF: 'FC', SDG: 'SDG',
  LYD: 'LD', USD: '$', ZMW: 'ZK', MWK: 'MK', SLE: 'Le', LRD: 'L$',
  SOS: 'Sh', MGA: 'Ar',
};

const COUNTRY_CURRENCY: Record<string, string> = {
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', UG: 'UGX', RW: 'RWF',
  TZ: 'TZS', ET: 'ETB', SN: 'XOF', CM: 'XAF', EG: 'EGP', MA: 'MAD',
  DZ: 'DZD', TN: 'TND', CI: 'XOF', AO: 'AOA', MZ: 'MZN', CD: 'CDF',
  SD: 'SDG', LY: 'LYD', ZW: 'USD', ZM: 'ZMW', MW: 'MWK', BJ: 'XOF',
  TG: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', SL: 'SLE', LR: 'LRD',
  SO: 'SOS', MG: 'MGA',
};

const PACK_LABELS = ['Starter', 'Popular', 'Supporter', 'Champion', 'Elite', 'Legend'];
const BEST_VALUE_INDEX = 3;

export default function BuyTipPackScreen({ navigation }: any) {
  const { user, country } = useAppStore();
  const [balance, setBalance] = useState(0);
  const [purchasing, setPurchasing] = useState(false);

  const currency = COUNTRY_CURRENCY[country] || 'NGN';
  const symbol = CURRENCY_SYMBOLS[currency] || '₦';
  const packs = getPacksForCurrency(currency);

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
          <TouchableOpacity key={index} style={[styles.packCard, index === BEST_VALUE_INDEX && styles.packCardPopular]}
            onPress={() => handleBuyPack(index)} disabled={purchasing}>
            {index === BEST_VALUE_INDEX && <Text style={styles.popularBadge}>BEST VALUE</Text>}
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

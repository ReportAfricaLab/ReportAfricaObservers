'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

const PACK_LABELS = ['Starter', 'Popular', 'Supporter', 'Champion', 'Elite', 'Legend'];
const BEST_VALUE_INDEX = 3;

export default function TipPacksPage() {
  const { token, user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('NGN');
  const [purchasing, setPurchasing] = useState(false);

  const symbol = CURRENCY_SYMBOLS[currency] || '₦';
  const packs = getPacksForCurrency(currency);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_URL}/tips/balance`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => { setBalance(data.balance || 0); setCurrency(data.currency || 'NGN'); })
      .catch(() => {});
  }, [token]);

  const handleBuy = async (packIndex: number) => {
    if (!token || !user) return;
    setPurchasing(true);
    try {
      const country = currency === 'NGN' ? 'NG' : currency === 'GHS' ? 'GH' : currency === 'KES' ? 'KE' : currency === 'ZAR' ? 'ZA' : currency === 'UGX' ? 'UG' : 'RW';
      const res = await fetch(`${API_URL}/tips/buy-pack`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ packIndex, email: user.email, country }),
      });
      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        alert('Could not generate payment link');
      }
    } catch {
      alert('Failed to initiate purchase');
    }
    setPurchasing(false);
  };

  if (!token) return <div className="max-w-md mx-auto px-4 py-20 text-center text-gray-400">Please log in to buy tip packs</div>;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">💰 Buy Tip Pack</h1>
      <p className="text-gray-500 text-sm mb-6">Buy credits to tip reporters for great reports</p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center mb-8">
        <p className="text-xs text-amber-700">Current Balance</p>
        <p className="text-3xl font-bold text-amber-800 mt-1">{symbol}{balance.toLocaleString()}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {packs.map((pack, index) => (
          <button key={index} onClick={() => handleBuy(index)} disabled={purchasing}
            className={`relative bg-white rounded-xl p-5 text-center border-2 transition hover:shadow-md disabled:opacity-50 ${index === BEST_VALUE_INDEX ? 'border-[#F4B400]' : 'border-gray-200'}`}>
            {index === BEST_VALUE_INDEX && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#F4B400] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                BEST VALUE
              </span>
            )}
            <p className="text-xs font-medium text-gray-500 mb-2">{PACK_LABELS[index]}</p>
            <p className="text-xl font-bold text-gray-900">{symbol}{pack.value.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mb-3">tip credits</p>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-sm font-semibold text-[#0F7B6C]">Pay {symbol}{pack.cost.toLocaleString()}</p>
              <p className="text-[10px] text-green-600 mt-1">
                Save {Math.round(((pack.cost - pack.value) / pack.cost) * 100)}% vs direct
              </p>
            </div>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center leading-relaxed">
        Payment processed securely via Paystack. Credits are non-refundable and can only be used to tip reporters on ReportAfrica.
      </p>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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

const PACK_LABELS = ['Starter', 'Popular', 'Supporter', 'Champion'];

export default function TipPacksPage() {
  const { token, user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [currency, setCurrency] = useState('NGN');
  const [purchasing, setPurchasing] = useState(false);

  const symbol = CURRENCY_SYMBOLS[currency] || '₦';
  const packs = TIP_PACKS[currency] || TIP_PACKS.NGN;

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
            className={`relative bg-white rounded-xl p-5 text-center border-2 transition hover:shadow-md disabled:opacity-50 ${index === 1 ? 'border-[#F4B400]' : 'border-gray-200'}`}>
            {index === 1 && (
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

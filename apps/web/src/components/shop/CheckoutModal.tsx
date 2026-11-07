'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { shopApi } from '@/lib/api';

const money = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v || 0);

interface CartItem {
  id: number;
  qty: number;
  name: string;
  price: number;
  imageUrl: string | null;
}

interface CheckoutItem {
  id: number;
  name: string;
  price: number;
  oldPrice: number | null;
  quantity: number;
  imageUrl: string | null;
  stock: number;
  stockOk: boolean;
}

interface DeliveryMethod {
  id: number;
  code: string;
  name: string;
  price: number;
  max_items: number | null;
  requires_point: number;
  available: boolean;
}

interface CheckoutInfo {
  items: CheckoutItem[];
  subtotal: number;
  deliveryMethods: DeliveryMethod[];
  localDelivery: {
    available: boolean;
    cutoffHour: number;
    radiusKm: number;
    freeKm: number;
    cost: number;
  };
  p24Enabled: boolean;
  payments: { id: string; name: string }[];
}

interface Locker {
  code: string;
  line1: string;
  line2: string;
  distance: number | null;
}

export default function CheckoutModal({
  items,
  user,
  onClose,
  onSuccess,
}: {
  items: CartItem[];
  user: { firstName?: string; lastName?: string; email?: string } | null;
  onClose: () => void;
  onSuccess: (orderId: number, total: number) => void;
}) {
  const [info, setInfo] = useState<CheckoutInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('odbior');
  const [address, setAddress] = useState('');
  const [postcode, setPostcode] = useState('');
  const [lockerQuery, setLockerQuery] = useState('');
  const [lockerResults, setLockerResults] = useState<Locker[]>([]);
  const [lockerSearched, setLockerSearched] = useState(false);
  const [lockerBusy, setLockerBusy] = useState(false);
  const [paczkomat, setPaczkomat] = useState<Locker | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'p24' | 'blik' | 'przy_odbiorze'>('p24');
  const [notes, setNotes] = useState('');
  const [code, setCode] = useState('');
  const [appliedCode, setAppliedCode] = useState<{ code: string; discount: number } | null>(null);
  const [codeMsg, setCodeMsg] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [terms, setTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [lockerErr, setLockerErr] = useState('');
  const [deliveryCheck, setDeliveryCheck] = useState<{
    status: 'idle' | 'busy' | 'ok' | 'fail';
    km?: number; cost?: number; freeKm?: number; radiusKm?: number;
    foundAddress?: string; error?: string;
  }>({ status: 'idle' });

  useEffect(() => {
    document.body.classList.add('modal-open');
    setName([user?.firstName, user?.lastName].filter(Boolean).join(' '));
    setEmail(user?.email || '');
    (async () => {
      try {
        const res = await shopApi.getCheckoutInfo(items.map((i) => ({ id: i.id, qty: i.qty })));
        setInfo(res);
        if (res.deliveryMethods?.length && !res.deliveryMethods.find((m: DeliveryMethod) => m.code === 'odbior')) {
          setDeliveryType(res.deliveryMethods[0].code);
        }
        if (res.payments?.length) setPaymentMethod(res.payments[0].id);
      } catch (e: any) {
        setLoadError(e?.response?.data?.error?.message || 'Nie udało się przygotować kasy.');
      } finally {
        setLoading(false);
      }
    })();
    return () => document.body.classList.remove('modal-open');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMethod = info?.deliveryMethods.find((m) => m.code === deliveryType) || null;
  const needsPoint = !!selectedMethod?.requires_point;
  const needsAddress = deliveryType !== 'odbior' && !needsPoint;

  // „u kuriera" tylko dla dostawy lokalnej — reset gdy zmiana dostawy
  useEffect(() => {
    if (deliveryType !== 'dostawa_lokalna' && paymentMethod === 'przy_odbiorze') {
      setPaymentMethod(info?.payments[0]?.id as any || 'p24');
    }
  }, [deliveryType, paymentMethod, info]);

  // zmiana adresu → wynik sprawdzenia zasięgu traci ważność
  useEffect(() => {
    setDeliveryCheck((d) => (d.status === 'busy' ? d : { status: 'idle' }));
  }, [address, postcode, deliveryType]);

  const deliveryCost = (() => {
    if (!info || deliveryType === 'odbior') return 0;
    if (deliveryType === 'dostawa_lokalna') {
      // po sprawdzeniu adresu pokazujemy dokładny koszt policzony przez sklep
      return deliveryCheck.status === 'ok' ? (deliveryCheck.cost ?? info.localDelivery.cost) : info.localDelivery.cost;
    }
    return selectedMethod?.price || 0;
  })();

  const checkDeliveryRange = async () => {
    if (address.trim().length < 3 || !postcode.trim() || deliveryCheck.status === 'busy') return;
    setDeliveryCheck({ status: 'busy' });
    try {
      const res = await shopApi.checkDelivery(address.trim(), postcode.trim());
      if (res.ok) {
        setDeliveryCheck({ status: 'ok', km: res.km, cost: res.cost, freeKm: res.freeKm, radiusKm: res.radiusKm, foundAddress: res.foundAddress });
      } else {
        setDeliveryCheck({ status: 'fail', km: res.km, radiusKm: res.radiusKm, foundAddress: res.foundAddress, error: res.error || 'Adres poza zasięgiem.' });
      }
    } catch (e: any) {
      setDeliveryCheck({ status: 'fail', error: e?.response?.data?.error || 'Nie udało się sprawdzić adresu — spróbuj ponownie.' });
    }
  };

  const discount = appliedCode?.discount || 0;
  const total = Math.max(0, (info?.subtotal || 0) + deliveryCost - discount);
  const stockIssue = info?.items.some((i) => !i.stockOk) || false;

  const searchLockers = async () => {
    if (lockerQuery.trim().length < 3 || lockerBusy) return;
    setLockerBusy(true);
    try {
      const res = await shopApi.getPaczkomaty(lockerQuery.trim());
      setLockerResults(res.items || []);
      setLockerSearched(true);
      setLockerErr(res.error || '');
    } catch {
      setLockerResults([]);
      setLockerSearched(true);
    } finally {
      setLockerBusy(false);
    }
  };

  const applyCode = async () => {
    if (!code.trim() || codeBusy) return;
    setCodeBusy(true);
    setCodeMsg('');
    try {
      const res = await shopApi.validateCode(code.trim(), items.map((i) => ({ id: i.id, qty: i.qty })));
      if (res.ok) {
        setAppliedCode({ code: res.code, discount: res.discount });
        setCodeMsg('');
      } else {
        setAppliedCode(null);
        setCodeMsg(res.error || 'Kod nieprawidłowy.');
      }
    } catch (e: any) {
      setAppliedCode(null);
      setCodeMsg(e?.response?.data?.error || 'Nie udało się sprawdzić kodu.');
    } finally {
      setCodeBusy(false);
    }
  };

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Podaj imię i nazwisko.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Podaj poprawny adres e-mail.');
    if (deliveryType !== 'odbior' && phone.replace(/\D/g, '').length < 9) {
      return setError('Podaj numer telefonu — kurier musi móc się z Tobą skontaktować.');
    }
    if (deliveryType !== 'odbior' && deliveryType !== 'dostawa_lokalna' && !selectedMethod) {
      return setError('Wybierz metodę dostawy.');
    }
    if (needsPoint && !paczkomat) return setError('Wybierz paczkomat z listy.');
    if (needsAddress && (address.trim().length < 3 || !postcode.trim())) {
      return setError('Podaj adres dostawy (ulica, kod pocztowy).');
    }
    if (deliveryType === 'dostawa_lokalna' && (address.trim().length < 3 || !postcode.trim())) {
      return setError('Podaj adres dostawy lokalnej (ulica, kod pocztowy).');
    }
    if (deliveryType === 'dostawa_lokalna' && deliveryCheck.status !== 'ok') {
      return setError('Najpierw potwierdź zasięg dostawy — kliknij „Sprawdź, czy dojedziemy na Twój adres".');
    }
    if (!terms) return setError('Zaakceptuj Regulamin i Politykę prywatności.');
    setBusy(true);
    try {
      const res = await shopApi.createOrder({
        items: items.map((i) => ({ id: i.id, qty: i.qty })),
        customer_name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        delivery_type: deliveryType,
        address: address.trim(),
        postcode: postcode.trim(),
        paczkomat_code: paczkomat?.code,
        payment_method: paymentMethod,
        notes: notes.trim(),
        discount_code: appliedCode?.code,
        terms: true,
      });
      if (res.paymentUrl) {
        onSuccess(res.orderId, res.total ?? total);
        window.location.href = res.paymentUrl; // płatność Przelewy24 — konto sklepu
        return;
      }
      onSuccess(res.orderId, res.total ?? total);
      if (res.thankYouUrl) window.open(res.thankYouUrl, '_blank');
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || 'Nie udało się złożyć zamówienia. Spróbuj ponownie.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10 text-sm';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl h-[92vh] sm:h-auto sm:max-h-[90vh] sm:rounded-2xl rounded-t-3xl shadow-xl flex flex-col overflow-hidden">
        {/* Nagłówek */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <h3 className="font-serif text-xl font-normal text-gray-900 flex items-center gap-2">
            <Lock className="w-5 h-5 text-brand-dark" /> Finalizacja zamówienia
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
              <p className="text-sm text-gray-500 mt-3">Przygotowuję zamówienie...</p>
            </div>
          ) : loadError || !info ? (
            <div className="py-12 text-center">
              <AlertTriangle className="w-9 h-9 mx-auto text-amber-500 mb-3" />
              <p className="text-gray-700 mb-4">{loadError || 'Nie udało się przygotować kasy.'}</p>
              <button onClick={onClose} className="pv-btn px-5 py-2.5 border border-gray-200 text-sm">Zamknij</button>
            </div>
          ) : (
            <>
              {stockIssue && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  Niektóre produkty mają niski stan — sklep zweryfikuje dostępność przy zamówieniu.
                </div>
              )}

              {/* Pozycje */}
              <div>
                <h4 className={labelCls}>Zamawiane produkty</h4>
                <div className="pv-card divide-y divide-gray-100">
                  {info.items.map((i) => (
                    <div key={i.id} className="px-4 py-2.5 flex items-center gap-3">
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{i.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">×{i.quantity}</span>
                      <span className="text-sm font-semibold text-gray-900 flex-shrink-0">{money(i.price * i.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dane kontaktowe */}
              <div>
                <h4 className={labelCls}>Dane kontaktowe</h4>
                <div className="space-y-3">
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Imię i nazwisko *" className={inputCls} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail *" className={inputCls} />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={`Telefon${deliveryType !== 'odbior' ? ' *' : ''}`} className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Dostawa */}
              <div>
                <h4 className={labelCls}>Sposób dostawy</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => { setDeliveryType('odbior'); setPaymentMethod('p24'); }}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                      deliveryType === 'odbior' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Package className={`w-5 h-5 flex-shrink-0 ${deliveryType === 'odbior' ? 'text-brand-dark' : 'text-gray-400'}`} />
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-gray-900 text-sm">Odbiór w sklepie</span>
                      <span className="block text-xs text-gray-500">Kraków — bezpłatnie</span>
                    </span>
                    <span className="font-bold text-brand-dark text-sm">0 zł</span>
                  </button>
                  {info.localDelivery.available && (
                    <button
                      onClick={() => setDeliveryType('dostawa_lokalna')}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                        deliveryType === 'dostawa_lokalna' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Truck className={`w-5 h-5 flex-shrink-0 ${deliveryType === 'dostawa_lokalna' ? 'text-brand-dark' : 'text-gray-400'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-gray-900 text-sm">Zamów dziś, otrzymaj dziś</span>
                        <span className="block text-xs text-gray-500">
                          do {info.localDelivery.cutoffHour}:00 · {info.localDelivery.freeKm} km gratis
                        </span>
                      </span>
                      <span className="font-bold text-brand-dark text-sm whitespace-nowrap">do {money(info.localDelivery.cost)}</span>
                    </button>
                  )}
                  {info.deliveryMethods.map((m) => (
                    <button
                      key={m.code}
                      onClick={() => m.available && setDeliveryType(m.code)}
                      disabled={!m.available}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                        deliveryType === m.code ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                      } ${!m.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <Truck className={`w-5 h-5 flex-shrink-0 ${deliveryType === m.code ? 'text-brand-dark' : 'text-gray-400'}`} />
                      <span className="flex-1 min-w-0">
                        <span className="block font-semibold text-gray-900 text-sm">{m.name}</span>
                        {!m.available && m.max_items != null && (
                          <span className="block text-xs text-red-500">max {m.max_items} szt.</span>
                        )}
                      </span>
                      <span className="font-bold text-brand-dark text-sm">{money(m.price)}</span>
                    </button>
                  ))}
                </div>

                {/* Paczkomat */}
                {needsPoint && (
                  <div className="mt-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={lockerQuery}
                          onChange={(e) => setLockerQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && searchLockers()}
                          placeholder="Kod pocztowy lub adres — szukaj paczkomatu"
                          className={`${inputCls} pl-10`}
                        />
                      </div>
                      <button onClick={searchLockers} disabled={lockerBusy} className="pv-btn px-4 border border-gray-200 text-sm font-medium disabled:opacity-50">
                        {lockerBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Szukaj'}
                      </button>
                    </div>
                    {paczkomat && (
                      <div className="flex items-center gap-2.5 p-3 rounded-xl bg-brand-mint/50 border border-brand/30 text-sm">
                        <MapPin className="w-4 h-4 text-brand-dark flex-shrink-0" />
                        <span className="font-semibold text-gray-900">{paczkomat.code}</span>
                        <span className="text-gray-500 truncate">{paczkomat.line1}, {paczkomat.line2}</span>
                        <button onClick={() => setPaczkomat(null)} className="ml-auto p-1 text-gray-400 hover:text-red-500" aria-label="Zmień">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {lockerSearched && !paczkomat && (
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                        {lockerResults.length === 0 ? (
                          <p className="p-3 text-sm text-gray-400 text-center">{lockerErr || 'Brak wyników — podaj dokładniejszy adres'}</p>
                        ) : (
                          lockerResults.map((l) => (
                            <button
                              key={l.code}
                              onClick={() => setPaczkomat(l)}
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-brand-mint/40 transition-all"
                            >
                              <span className="font-bold text-brand-dark text-sm flex-shrink-0">{l.code}</span>
                              <span className="text-xs text-gray-500 truncate">{l.line1}, {l.line2}</span>
                              {l.distance != null && <span className="ml-auto text-[11px] text-gray-400 flex-shrink-0">{l.distance} m</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Adres */}
                {(needsAddress || deliveryType === 'dostawa_lokalna') && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-[2fr_1fr] gap-3">
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Ulica, numer, miasto *" className={inputCls} />
                    <input type="text" value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Kod pocztowy *" maxLength={6} className={inputCls} />
                  </div>
                )}

                {/* Sprawdzenie zasięgu dostawy lokalnej */}
                {deliveryType === 'dostawa_lokalna' && (
                  <div className="mt-3 space-y-2">
                    <button
                      onClick={checkDeliveryRange}
                      disabled={deliveryCheck.status === 'busy' || address.trim().length < 3 || !postcode.trim()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/40 text-brand-dark text-sm font-semibold hover:bg-brand-mint/40 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      {deliveryCheck.status === 'busy' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4" />}
                      Sprawdź, czy dojedziemy na Twój adres
                    </button>

                    {deliveryCheck.status === 'ok' && (
                      <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm space-y-1">
                        <p className="font-semibold text-emerald-800 flex items-center gap-1.5">
                          <Check className="w-4 h-4" /> Dojedziemy — {deliveryCheck.km?.toFixed(1)} km od sklepu
                        </p>
                        <p className="text-emerald-700 text-xs">
                          Koszt dostawy:{' '}
                          <b>{deliveryCheck.cost === 0 ? '0 zł (gratis)' : money(deliveryCheck.cost || 0)}</b>
                          {deliveryCheck.cost === 0 && deliveryCheck.freeKm != null && ` — do ${deliveryCheck.freeKm} km za darmo`}
                        </p>
                        {deliveryCheck.foundAddress && (
                          <p className="text-[11px] text-emerald-600/80 truncate">Rozpoznano: {deliveryCheck.foundAddress}</p>
                        )}
                      </div>
                    )}
                    {deliveryCheck.status === 'fail' && (
                      <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm space-y-1">
                        <p className="font-semibold text-red-700 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4" /> {deliveryCheck.error}
                        </p>
                        {deliveryCheck.foundAddress && (
                          <p className="text-[11px] text-red-500/80 truncate">Rozpoznano: {deliveryCheck.foundAddress}</p>
                        )}
                        <p className="text-xs text-red-500">Wybierz paczkomat lub kuriera powyżej.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Płatność */}
              <div>
                <h4 className={labelCls}>Płatność</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {info.payments.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPaymentMethod(p.id as any)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                        paymentMethod === p.id ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ShieldCheck className={`w-5 h-5 flex-shrink-0 ${paymentMethod === p.id ? 'text-brand-dark' : 'text-gray-400'}`} />
                      <span className="font-semibold text-gray-900 text-sm">{p.name}</span>
                    </button>
                  ))}
                  {deliveryType === 'dostawa_lokalna' && (
                    <button
                      onClick={() => setPaymentMethod('przy_odbiorze')}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                        paymentMethod === 'przy_odbiorze' ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Package className={`w-5 h-5 flex-shrink-0 ${paymentMethod === 'przy_odbiorze' ? 'text-brand-dark' : 'text-gray-400'}`} />
                      <span className="font-semibold text-gray-900 text-sm">Płatność u kuriera</span>
                    </button>
                  )}
                </div>
                {info.p24Enabled && paymentMethod !== 'przy_odbiorze' && (
                  <p className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Bezpieczna płatność Przelewy24 — przeniesiesz na stronę banku. Środki trafiają do sklepu Przystań Pupila.
                  </p>
                )}
              </div>

              {/* Kod rabatowy + uwagi */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className={labelCls}>Kod rabatowy</h4>
                  {appliedCode ? (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm">
                      <Tag className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span className="font-semibold text-emerald-700">{appliedCode.code}</span>
                      <span className="text-emerald-600">−{money(appliedCode.discount)}</span>
                      <button onClick={() => setAppliedCode(null)} className="ml-auto p-1 text-emerald-500 hover:text-red-500" aria-label="Usuń kod">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => setCode(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && applyCode()}
                          placeholder="Wpisz kod"
                          className={inputCls}
                        />
                        <button onClick={applyCode} disabled={codeBusy || !code.trim()} className="pv-btn px-4 border border-gray-200 text-sm font-medium disabled:opacity-50">
                          {codeBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Użyj'}
                        </button>
                      </div>
                      {codeMsg && <p className="mt-1.5 text-xs text-red-500">{codeMsg}</p>}
                    </>
                  )}
                </div>
                <div>
                  <h4 className={labelCls}>Uwagi do zamówienia</h4>
                  <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Np. prośba o kontakt" maxLength={300} className={inputCls} />
                </div>
              </div>

              {/* Podsumowanie */}
              <div className="pv-card p-4 space-y-2 bg-gray-50/60">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Produkty</span><span>{money(info.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Dostawa</span>
                  <span>{deliveryType === 'odbior' ? 'Odbiór — 0 zł' : deliveryType === 'dostawa_lokalna' ? `do ${money(info.localDelivery.cost)}` : money(deliveryCost)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600 font-medium">
                    <span>Rabat ({appliedCode?.code})</span><span>−{money(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">Do zapłaty</span>
                  <span className="text-xl font-bold text-brand-dark">{money(total)}</span>
                </div>
              </div>

              {/* Zgoda */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <button
                  onClick={() => setTerms(!terms)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                    terms ? 'bg-brand-dark border-brand-dark' : 'border-gray-300 bg-white'
                  }`}
                  aria-checked={terms}
                  role="checkbox"
                >
                  {terms && <Check className="w-3.5 h-3.5 text-white" />}
                </button>
                <span className="text-xs text-gray-500 leading-relaxed" onClick={() => setTerms(!terms)}>
                  Akceptuję{' '}
                  <a href="https://przystan-pupila.pl/regulamin" target="_blank" rel="noreferrer" className="text-brand-dark underline" onClick={(e) => e.stopPropagation()}>
                    Regulamin
                  </a>{' '}
                  i{' '}
                  <a href="https://przystan-pupila.pl/polityka-prywatnosci" target="_blank" rel="noreferrer" className="text-brand-dark underline" onClick={(e) => e.stopPropagation()}>
                    Politykę prywatności
                  </a>{' '}
                  sklepu Przystań Pupila.
                </span>
              </label>

              {error && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
              )}
            </>
          )}
        </div>

        {/* Stopka */}
        {!loading && !loadError && info && (
          <div className="p-4 sm:p-5 border-t border-gray-100 flex-shrink-0 bg-white space-y-2">
            <button
              onClick={submit}
              disabled={busy || stockIssue || (deliveryType === 'dostawa_lokalna' && deliveryCheck.status !== 'ok')}
              className="w-full pv-btn-primary px-5 py-3.5 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
              {paymentMethod === 'przy_odbiorze' ? `Złóż zamówienie · ${money(total)}` : `Złóż i zapłać · ${money(total)}`}
            </button>
            {deliveryType === 'dostawa_lokalna' && deliveryCheck.status !== 'ok' && (
              <p className="text-[11px] text-amber-600 text-center font-medium">
                Żeby złożyć zamówienie, najpierw sprawdź zasięg dostawy (przycisk nad podsumowaniem).
              </p>
            )}
            <p className="text-[11px] text-gray-400 text-center">
              Zamówienie i płatność obsługuje sklep Przystań Pupila — potwierdzenie otrzymasz na e-mail.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

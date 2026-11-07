'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ShoppingBag,
  ShoppingCart,
  Search,
  Star,
  Plus,
  Minus,
  Trash2,
  X,
  ExternalLink,
  Package,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  PawPrint,
  Tag,
  CheckCircle2,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import CheckoutModal from '@/components/shop/CheckoutModal';
import { shopApi } from '@/lib/api';

interface ShopProduct {
  id: number;
  name: string;
  price: number;
  oldPrice: number | null;
  promo: boolean;
  promoTitle: string | null;
  promoDiscount: number | null;
  imageUrl: string | null;
  stock: number;
  badge: string | null;
  rating: number;
  ratingCount: number;
  url: string;
  description?: string;
  longDescription?: string;
  brand?: string;
  weight?: string;
  gallery?: string[];
}

interface ShopCategory {
  id: number;
  name: string;
  count: number;
  children: ShopCategory[];
}

interface CartItem {
  id: number;
  qty: number;
  name: string;
  price: number;
  imageUrl: string | null;
  stock?: number;
}

interface LocalOrder {
  id: number;
  createdAt: string;
  total: number;
  items: { name: string; qty: number }[];
}

interface ServerOrder {
  id: number;
  created_at: string;
  status: string;
  payment_status: string;
  total: number;
  delivery_type: string | null;
  items: { product_id: number; name: string; quantity: number; price: number }[];
}

const ORDER_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Nowe', cls: 'bg-blue-50 text-blue-600' },
  processing: { label: 'W realizacji', cls: 'bg-amber-50 text-amber-600' },
  awaiting_shipment: { label: 'Czeka na wysyłkę', cls: 'bg-amber-50 text-amber-600' },
  out_for_delivery: { label: 'W drodze', cls: 'bg-indigo-50 text-indigo-600' },
  shipped: { label: 'Wysłane', cls: 'bg-indigo-50 text-indigo-600' },
  completed: { label: 'Zrealizowane', cls: 'bg-emerald-50 text-emerald-600' },
  delivered: { label: 'Dostarczone', cls: 'bg-emerald-50 text-emerald-600' },
  cancelled: { label: 'Anulowane', cls: 'bg-red-50 text-red-500' },
};

const PAYMENT_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: 'Oczekuje na płatność', cls: 'bg-amber-50 text-amber-600' },
  paid: { label: 'Opłacone', cls: 'bg-emerald-50 text-emerald-600' },
  failed: { label: 'Płatność nieudana', cls: 'bg-red-50 text-red-500' },
  unpaid: { label: 'Nieopłacone', cls: 'bg-red-50 text-red-500' },
};

const CART_KEY = 'pv_shop_cart';
const ORDERS_KEY = 'pv_shop_orders';
const money = (v: number) =>
  new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(v || 0);

const SORTS = [
  { id: 'polecane', name: 'Polecane' },
  { id: 'cena_asc', name: 'Cena: od najniższej' },
  { id: 'cena_desc', name: 'Cena: od najwyższej' },
  { id: 'ocena', name: 'Najlepiej oceniane' },
  { id: 'nowosci', name: 'Nowości' },
];

function ProductImage({ src, name, className }: { src?: string | null; name: string; className: string }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className={`${className} bg-brand-mint/40 flex items-center justify-center`}>
        <PawPrint className="w-10 h-10 text-brand/40" />
      </div>
    );
  }
  return <img src={src} alt={name} loading="lazy" onError={() => setErr(true)} className={`${className} object-cover`} />;
}

export default function ShopPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [categories, setCategories] = useState<ShopCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<number | null>(null);
  const [subCategory, setSubCategory] = useState<number | null>(null);
  const [sort, setSort] = useState('polecane');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [detail, setDetail] = useState<ShopProduct | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailQty, setDetailQty] = useState(1);
  const [related, setRelated] = useState<ShopProduct[]>([]);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderDone, setOrderDone] = useState<number | null>(null);
  const [user, setUser] = useState<any>(null);
  const [shopError, setShopError] = useState('');
  const [localOrders, setLocalOrders] = useState<LocalOrder[]>([]);
  const [serverOrders, setServerOrders] = useState<ServerOrder[] | null>(null);
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [returnsOpen, setReturnsOpen] = useState(false);

  // koszyk i historia w localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CART_KEY);
      if (raw) setCart(JSON.parse(raw));
    } catch {}
    try {
      const rawOrders = localStorage.getItem(ORDERS_KEY);
      if (rawOrders) setLocalOrders(JSON.parse(rawOrders));
    } catch {}
    const userData = localStorage.getItem('user');
    if (userData) {
      try { setUser(JSON.parse(userData)); } catch {}
    }
    (async () => {
      try {
        const res = await shopApi.getMyOrders();
        setServerOrders(res.orders || []);
      } catch {}
    })();
  }, []);

  const openOrders = async () => {
    setOrdersOpen(true);
    setOrdersLoading(true);
    try {
      const res = await shopApi.getMyOrders();
      setServerOrders(res.orders || []);
    } catch {}
    finally {
      setOrdersLoading(false);
    }
  };

  const saveCart = (items: CartItem[]) => {
    setCart(items);
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  };
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ordersCount =
    (serverOrders?.length || 0) +
    localOrders.filter((o) => !(serverOrders || []).some((s) => s.id === o.id)).length;

  const addToCart = (p: ShopProduct, qty = 1) => {
    const items = [...cart];
    const existing = items.find((i) => i.id === p.id);
    if (existing) {
      existing.qty = Math.min(existing.qty + qty, Math.max(p.stock, 1));
      existing.stock = p.stock;
    } else {
      items.push({ id: p.id, qty: Math.min(qty, Math.max(p.stock, 1)), name: p.name, price: p.price, imageUrl: p.imageUrl, stock: p.stock });
    }
    saveCart(items);
  };
  const setCartQty = (id: number, qty: number) => {
    if (qty <= 0) return saveCart(cart.filter((i) => i.id !== id));
    saveCart(cart.map((i) => (i.id === id ? { ...i, qty: i.stock != null ? Math.min(qty, Math.max(i.stock, 1)) : qty } : i)));
  };

  const showShopError = (msg: string) => {
    setShopError(msg);
    setTimeout(() => setShopError(''), 4000);
  };

  const loadCategories = async () => {
    try {
      const res = await shopApi.getCategories();
      setCategories((res.categories || []).filter((c: ShopCategory) => c.count > 0));
    } catch {}
  };

  const loadProducts = async (reset = true, pageNum = 1) => {
    if (reset) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await shopApi.getProducts({
        search: search || undefined,
        category: subCategory ?? category ?? undefined,
        sort,
        page: pageNum,
        limit: 24,
      });
      setProducts((l) => (reset ? res.products : [...l, ...res.products]));
      setTotal(res.total || 0);
      setPage(res.page || 1);
      setTotalPages(res.totalPages || 1);
      setLoadError('');
    } catch {
      setLoadError('Sklep jest chwilowo niedostępny. Spróbuj ponownie za chwilę.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadProducts(true, 1), search ? 350 : 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, subCategory, sort]);

  const openDetail = async (p: ShopProduct) => {
    setDetail(p);
    setDetailQty(1);
    setRelated([]);
    setDetailLoading(true);
    try {
      const res = await shopApi.getProduct(p.id);
      setDetail(res.product);
      setRelated(res.related || []);
    } catch {
      // zostaje wersja z listy
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    const open = !!detail || cartOpen || checkoutOpen || ordersOpen || returnsOpen;
    document.body.classList.toggle('modal-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    };
  }, [detail, cartOpen, checkoutOpen, ordersOpen, returnsOpen]);

  const goCheckout = () => {
    if (!cart.length) return;
    setCartOpen(false);
    setCheckoutOpen(true);
  };

  const goExternalCheckout = async () => {
    if (!cart.length || checkoutBusy) return;
    setCheckoutBusy(true);
    try {
      const res = await shopApi.getCheckoutLink(cart.map((i) => ({ id: i.id, qty: i.qty })));
      window.open(res.url, '_blank');
    } catch {
      showShopError('Nie udało się przygotować linku do kasy — spróbuj ponownie.');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleOrderSuccess = (orderId: number, total: number) => {
    const entry: LocalOrder = {
      id: orderId,
      createdAt: new Date().toISOString(),
      total,
      items: cart.map((i) => ({ name: i.name, qty: i.qty })),
    };
    const next = [entry, ...localOrders].slice(0, 30);
    setLocalOrders(next);
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(next)); } catch {}
    saveCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
    setOrderDone(orderId);
    shopApi.getMyOrders().then((res) => setServerOrders(res.orders || [])).catch(() => {});
  };

  const activeCat = categories.find((c) => c.id === category);
  const detailImages = useMemo(() => {
    if (!detail) return [];
    return [detail.imageUrl, ...(detail.gallery || [])].filter(Boolean) as string[];
  }, [detail]);
  const [detailImgIdx, setDetailImgIdx] = useState(0);
  useEffect(() => setDetailImgIdx(0), [detail?.id]);

  return (
    <div className="space-y-6">
      <PageHeader
        icon={ShoppingBag}
        title="Sklep"
        description="Produkty dla pupila od naszego partnera — Przystań Pupila. Zamówienie i płatność realizuje sklep przystan-pupila.pl"
      />

      {orderDone && (
        <div className="pv-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 bg-emerald-50/60 border-emerald-200">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">Zamówienie #{orderDone} zostało złożone</p>
            <p className="text-sm text-gray-500">
              Potwierdzenie otrzymasz na e-mail od sklepu Przystań Pupila. Płatność online sfinalizujesz na bezpiecznej stronie Przelewy24.
            </p>
          </div>
          <button onClick={() => setOrderDone(null)} className="pv-btn px-4 py-2 border border-gray-200 text-sm self-start sm:self-center">
            OK
          </button>
        </div>
      )}

      {/* Zamówienia + zwroty — przyciski otwierające modale */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={openOrders}
          className="pv-card-hover flex-shrink-0 inline-flex items-center gap-2.5 px-5 py-3 font-semibold text-sm text-gray-800"
        >
          <Receipt className="w-5 h-5 text-brand-dark" />
          Twoje zamówienia
          {ordersCount > 0 && (
            <span className="min-w-[22px] h-[22px] px-1.5 rounded-full bg-brand-mint text-brand-dark text-xs font-bold flex items-center justify-center">
              {ordersCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setReturnsOpen(true)}
          className="pv-card-hover flex-shrink-0 inline-flex items-center gap-2.5 px-5 py-3 font-semibold text-sm text-gray-800"
        >
          <RotateCcw className="w-5 h-5 text-brand-dark" />
          Zwroty i reklamacje
        </button>
      </div>

      {/* Szukaj + sort + koszyk */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Szukaj produktów..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm pl-11 pr-4 py-3 font-medium focus:outline-none focus:border-brand focus:ring-4 focus:ring-brand/10 transition-all"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="px-4 py-3 rounded-2xl border border-gray-200 bg-white font-medium text-sm focus:outline-none focus:border-brand"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button
          onClick={() => setCartOpen(true)}
          className="relative pv-btn-primary px-5 py-3 rounded-2xl text-sm flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" /> Koszyk
          {cartCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* Kategorie */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => {
            setCategory(null);
            setSubCategory(null);
          }}
          className={`px-4 py-2 rounded-xl whitespace-nowrap border font-medium text-sm transition-all ${
            category === null ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
          }`}
        >
          Wszystkie
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setCategory(c.id);
              setSubCategory(null);
            }}
            className={`px-4 py-2 rounded-xl whitespace-nowrap border font-medium text-sm transition-all ${
              category === c.id ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-dark/40'
            }`}
          >
            {c.name} ({c.count})
          </button>
        ))}
      </div>
      {activeCat && activeCat.children.some((ch) => ch.count > 0) && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {activeCat.children.filter((ch) => ch.count > 0).map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSubCategory(subCategory === ch.id ? null : ch.id)}
              className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap border text-xs font-medium transition-all ${
                subCategory === ch.id ? 'bg-brand text-white border-brand' : 'bg-white text-gray-600 border-gray-200 hover:border-brand/50'
              }`}
            >
              {ch.name} ({ch.count})
            </button>
          ))}
        </div>
      )}

      {/* Produkty */}
      {loading ? (
        <div className="pv-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
          <p className="text-sm text-gray-500 mt-3">Ładowanie produktów...</p>
        </div>
      ) : loadError ? (
        <div className="pv-card p-8 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 mb-3" />
          <p className="text-gray-700 mb-4">{loadError}</p>
          <button onClick={() => loadProducts(true, 1)} className="pv-btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" /> Spróbuj ponownie
          </button>
        </div>
      ) : products.length === 0 ? (
        <div className="pv-card p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#1B6B4A]/10 to-[#2A8A5C]/10 flex items-center justify-center">
            <Package className="w-7 h-7 text-brand" />
          </div>
          <h3 className="pv-section-title mb-2">Brak produktów</h3>
          <p className="text-gray-500">Zmień kryteria wyszukiwania lub kategorię</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500">{total} produktów</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {products.map((p) => (
              <div key={p.id} className="pv-card-hover overflow-hidden flex flex-col cursor-pointer" onClick={() => openDetail(p)}>
                <div className="relative">
                  <ProductImage src={p.imageUrl} name={p.name} className="w-full aspect-square" />
                  {p.promo && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-red-500 text-white text-[11px] font-bold flex items-center gap-1">
                      <Tag className="w-3 h-3" /> -{p.promoDiscount}%
                    </span>
                  )}
                  {!p.promo && p.badge && (
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-brand-dark text-white text-[11px] font-bold">
                      {p.badge}
                    </span>
                  )}
                  {p.stock <= 0 && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <span className="px-3 py-1.5 rounded-full bg-gray-800 text-white text-xs font-bold">Brak w magazynie</span>
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 flex flex-col flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-1.5 min-h-[2.5rem]">{p.name}</h3>
                  {p.ratingCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-amber-500 mb-2">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {p.rating.toFixed(1)} <span className="text-gray-400">({p.ratingCount})</span>
                    </div>
                  )}
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <div>
                      {p.oldPrice != null && p.oldPrice > p.price && (
                        <div className="text-xs text-gray-400 line-through">{money(p.oldPrice)}</div>
                      )}
                      <div className="font-bold text-brand-dark">{money(p.price)}</div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (p.stock > 0) addToCart(p);
                      }}
                      disabled={p.stock <= 0}
                      className="pv-btn-primary !rounded-xl p-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Dodaj do koszyka"
                      title="Dodaj do koszyka"
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {page < totalPages && (
            <button
              onClick={() => loadProducts(false, page + 1)}
              disabled={loadingMore}
              className="w-full pv-btn px-5 py-3.5 border border-gray-200 text-gray-700 hover:border-brand-dark hover:text-brand-dark text-sm font-semibold"
            >
              {loadingMore ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Załaduj więcej produktów'}
            </button>
          )}
        </>
      )}

      {/* Modal produktu */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in sm:p-4" onClick={() => setDetail(null)}>
          {/* Pływające zamknięcie — zawsze widoczne na mobile, niezależnie od pozycji sheetu */}
          <button
            onClick={() => setDetail(null)}
            className="absolute top-[max(0.75rem,env(safe-area-inset-top))] right-3 z-20 p-2.5 rounded-full bg-white shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900 active:bg-gray-100 sm:hidden"
            aria-label="Zamknij produkt"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-2xl max-h-[92dvh] sm:max-h-[85vh] overflow-y-auto overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate pr-2">{detail.name}</h3>
              <button onClick={() => setDetail(null)} className="hidden sm:block p-2 -mr-1 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200 flex-shrink-0" aria-label="Zamknij">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <div className="relative">
                    <ProductImage src={detailImages[detailImgIdx] || detail.imageUrl} name={detail.name} className="w-full aspect-square rounded-2xl" />
                    {detail.promo && (
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-red-500 text-white text-xs font-bold flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" /> -{detail.promoDiscount}% {detail.promoTitle && `· ${detail.promoTitle}`}
                      </span>
                    )}
                  </div>
                  {detailImages.length > 1 && (
                    <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                      {detailImages.map((img, i) => (
                        <button key={i} onClick={() => setDetailImgIdx(i)} className={`flex-shrink-0 rounded-xl overflow-hidden border-2 ${i === detailImgIdx ? 'border-brand-dark' : 'border-transparent'}`}>
                          <ProductImage src={img} name="" className="w-14 h-14" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <h2 className="font-serif text-xl sm:text-2xl font-normal text-gray-900 break-words">{detail.name}</h2>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-500">
                    {detail.brand && <span>Marka: {detail.brand}</span>}
                    {detail.weight && <span>Waga: {detail.weight}</span>}
                    {detail.ratingCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-amber-500">
                        <Star className="w-3.5 h-3.5 fill-current" /> {detail.rating.toFixed(1)} ({detail.ratingCount} opinii)
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    {detail.oldPrice != null && detail.oldPrice > detail.price && (
                      <div className="text-sm text-gray-400 line-through">{money(detail.oldPrice)}</div>
                    )}
                    <div className="text-2xl font-bold text-brand-dark">{money(detail.price)}</div>
                    <div className={`text-xs mt-1 font-medium ${detail.stock > 0 ? (detail.stock <= 5 ? 'text-amber-600' : 'text-emerald-600') : 'text-red-500'}`}>
                      {detail.stock > 0 ? (detail.stock <= 5 ? `Ostatnie sztuki (${detail.stock})` : 'W magazynie') : 'Brak w magazynie'}
                    </div>
                  </div>

                  {detail.stock > 0 && (
                    <div className="flex items-center gap-3 mt-4">
                      <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                        <button onClick={() => setDetailQty(Math.max(1, detailQty - 1))} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Mniej">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-semibold text-sm">{detailQty}</span>
                        <button onClick={() => setDetailQty(Math.min(detail.stock, detailQty + 1))} className="p-2.5 text-gray-500 hover:bg-gray-50" aria-label="Więcej">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => {
                          addToCart(detail, detailQty);
                          setCartOpen(true);
                        }}
                        className="flex-1 pv-btn-primary px-4 py-3 text-sm flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" /> Do koszyka
                      </button>
                    </div>
                  )}

                  <a
                    href={detail.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-dark transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Zobacz na przystan-pupila.pl
                  </a>
                </div>
              </div>

              {detailLoading ? (
                <div className="py-6 text-center">
                  <Loader2 className="w-6 h-6 mx-auto text-brand animate-spin" />
                </div>
              ) : (
                (detail.longDescription || detail.description) && (
                  <div className="mt-6 pt-5 border-t border-gray-100">
                    <h4 className="font-semibold text-gray-900 mb-2">Opis produktu</h4>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">
                      {detail.longDescription || detail.description}
                    </p>
                  </div>
                )
              )}

              {related.length > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-3">Podobne produkty</h4>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {related.map((r) => (
                      <button key={r.id} onClick={() => openDetail(r)} className="flex-shrink-0 w-36 text-left">
                        <ProductImage src={r.imageUrl} name={r.name} className="w-36 h-36 rounded-2xl" />
                        <p className="text-xs font-medium text-gray-700 line-clamp-2 mt-2">{r.name}</p>
                        <p className="text-sm font-bold text-brand-dark mt-0.5">{money(r.price)}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zamknięcie na dole — zawsze osiągalne na mobile */}
              <button
                onClick={() => setDetail(null)}
                className="mt-6 w-full pv-btn border border-gray-200 px-5 py-3 text-sm text-gray-600 sm:hidden"
              >
                Wróć do sklepu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Koszyk — wysuwany panel */}
      {cartOpen && (
        <div className="fixed inset-0 z-[55]">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm animate-fade-in touch-none" onClick={() => setCartOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-brand-cream shadow-2xl flex flex-col animate-sheet-right overscroll-contain">
            <div className="flex items-center justify-between px-5 pb-5 border-b border-gray-200/70 bg-white/70 pt-[calc(1.25rem+env(safe-area-inset-top))]">
              <h3 className="font-serif text-xl font-normal text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-brand-dark" /> Koszyk ({cartCount})
              </h3>
              <button onClick={() => setCartOpen(false)} className="p-2 -mr-1 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 active:bg-gray-200" aria-label="Zamknij koszyk">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-16">
                  <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 text-sm">Koszyk jest pusty</p>
                </div>
              ) : (
                cart.map((i) => (
                  <div key={i.id} className="pv-card p-3 flex gap-3 items-center">
                    <ProductImage src={i.imageUrl} name={i.name} className="w-16 h-16 rounded-xl flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2">{i.name}</p>
                      <p className="text-sm font-bold text-brand-dark mt-0.5">{money(i.price)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <button onClick={() => setCartQty(i.id, 0)} className="p-1 text-gray-300 hover:text-red-500" aria-label="Usuń">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white">
                        <button onClick={() => setCartQty(i.id, i.qty - 1)} className="p-1.5 text-gray-500 hover:bg-gray-50">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{i.qty}</span>
                        <button onClick={() => setCartQty(i.id, i.qty + 1)} className="p-1.5 text-gray-500 hover:bg-gray-50">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-5 border-t border-gray-200/70 bg-white/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 font-medium">Razem</span>
                  <span className="text-xl font-bold text-brand-dark">{money(cartTotal)}</span>
                </div>
                <button
                  onClick={goCheckout}
                  className="w-full pv-btn-primary px-5 py-3.5 text-sm flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Przejdź do kasy
                </button>
                <button
                  onClick={goExternalCheckout}
                  disabled={checkoutBusy}
                  className="w-full text-[11px] text-gray-400 hover:text-brand-dark transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  {checkoutBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                  albo dokończ zakup bezpośrednio na przystan-pupila.pl
                </button>
              </div>
            )}

            {/* Zawsze dostępne wyjście na dole panelu */}
            <div className="px-5 pt-3 border-t border-gray-200/70 bg-white/70 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                onClick={() => setCartOpen(false)}
                className="w-full pv-btn border border-gray-200 px-5 py-3 text-sm text-gray-600 flex items-center justify-center gap-2"
              >
                Kontynuuj zakupy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kasa — zamówienie i płatność Przelewy24 sklepu Przystań Pupila */}
      {checkoutOpen && (
        <CheckoutModal
          items={cart}
          user={user}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={handleOrderSuccess}
        />
      )}

      {/* ====== MODAL: TWOJE ZAMÓWIENIA ====== */}
      {ordersOpen && (
        <div className="fixed inset-0 z-[56] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in sm:p-4" onClick={() => setOrdersOpen(false)}>
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-serif text-xl font-normal text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-dark" /> Twoje zamówienia
              </h3>
              <button onClick={() => setOrdersOpen(false)} className="p-2 -mr-1 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Zamknij">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {ordersLoading && ordersCount === 0 ? (
                <div className="py-16 text-center">
                  <Loader2 className="w-8 h-8 mx-auto text-brand animate-spin" />
                </div>
              ) : ordersCount === 0 ? (
                <div className="py-16 text-center px-6">
                  <Package className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                  <p className="font-semibold text-gray-900">Brak zamówień</p>
                  <p className="text-sm text-gray-500 mt-1">Zamówienia złożone przez PetVio pojawią się tutaj wraz ze statusem realizacji.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100/80">
                  {(serverOrders || []).map((o) => {
                    const st = ORDER_STATUS[o.status] || { label: o.status, cls: 'bg-gray-100 text-gray-500' };
                    const ps = PAYMENT_STATUS[o.payment_status];
                    return (
                      <div key={o.id} className="px-5 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">#{o.id}</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${st.cls}`}>{st.label}</span>
                          {ps && <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${ps.cls}`}>{ps.label}</span>}
                          <span className="ml-auto font-bold text-brand-dark whitespace-nowrap">{money(o.total)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                          {o.created_at ? new Date(o.created_at.replace(' ', 'T') + (o.created_at.includes('Z') ? '' : 'Z')).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' }) : ''}
                          {' · '}
                          {(o.items || []).map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                        </p>
                      </div>
                    );
                  })}
                  {localOrders
                    .filter((o) => !(serverOrders || []).some((s) => s.id === o.id))
                    .map((o) => (
                      <div key={`local-${o.id}`} className="px-5 py-4 opacity-70">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900">#{o.id}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-500">Złożone</span>
                          <span className="ml-auto font-bold text-brand-dark whitespace-nowrap">{money(o.total)}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                          {new Date(o.createdAt).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
                          {' · '}
                          {o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 flex-shrink-0 space-y-3">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Realizacją zamówień zajmuje się sklep Przystań Pupila. W razie pytań napisz na{' '}
                <a href="mailto:sklep@przystan-pupila.pl" className="text-brand-dark underline">sklep@przystan-pupila.pl</a> podając numer zamówienia.
              </p>
              <button onClick={() => setOrdersOpen(false)} className="w-full pv-btn border border-gray-200 px-5 py-3 text-sm text-gray-600">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== MODAL: ZWROTY I REKLAMACJE ====== */}
      {returnsOpen && (
        <div className="fixed inset-0 z-[56] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in sm:p-4" onClick={() => setReturnsOpen(false)}>
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[88dvh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
              <h3 className="font-serif text-xl font-normal text-gray-900 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-brand-dark" /> Zwroty i reklamacje
              </h3>
              <button onClick={() => setReturnsOpen(false)} className="p-2 -mr-1 rounded-xl text-gray-500 hover:bg-gray-100" aria-label="Zamknij">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain p-5 space-y-4">
              <div className="p-4 rounded-2xl bg-brand-mint/50 border border-brand-light/60">
                <p className="font-semibold text-gray-900 text-sm">14 dni na zwrot</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Zamówienia obsługuje sklep Przystań Pupila — zgodnie z regulaminem masz 14 dni na odstąpienie od umowy bez podania przyczyny.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="font-semibold text-gray-900 text-sm">Jak zgłosić zwrot lub reklamację?</p>
                <ul className="text-xs text-gray-600 mt-2 space-y-1.5 leading-relaxed">
                  <li className="flex gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />Napisz na <a href="mailto:sklep@przystan-pupila.pl" className="text-brand-dark underline">sklep@przystan-pupila.pl</a></li>
                  <li className="flex gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />Podaj numer zamówienia (znajdziesz go w „Twoje zamówienia")</li>
                  <li className="flex gap-2"><span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />Sklep odpowie i poda instrukcje zwrotu lub reklamacji</li>
                </ul>
              </div>
              <a
                href="https://przystan-pupila.pl/regulamin"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 p-4 rounded-2xl border border-gray-200 hover:border-brand-dark/40 transition-all"
              >
                <ExternalLink className="w-4 h-4 text-brand-dark flex-shrink-0" />
                <span className="text-sm font-semibold text-gray-800">Regulamin sklepu Przystań Pupila</span>
              </a>
            </div>

            <div className="p-5 border-t border-gray-100 flex-shrink-0">
              <button onClick={() => setReturnsOpen(false)} className="w-full pv-btn border border-gray-200 px-5 py-3 text-sm text-gray-600">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lewitujący koszyk — zawsze pod ręką przy długiej liście produktów */}
      {cartCount > 0 && !cartOpen && !checkoutOpen && !detail && !ordersOpen && !returnsOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed z-[45] right-4 sm:right-6 bottom-[max(9rem,calc(env(safe-area-inset-bottom)+7rem))] lg:bottom-8 pv-btn-primary pl-4 pr-5 py-3.5 rounded-full shadow-2xl flex items-center gap-3 animate-scale-in"
          aria-label={`Otwórz koszyk — ${cartCount} produktów`}
        >
          <span className="relative">
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {cartCount}
            </span>
          </span>
          <span className="text-sm font-bold">{money(cartTotal)}</span>
        </button>
      )}

      {/* Toast błędu */}
      {shopError && (
        <div className="fixed z-[70] bottom-[max(9rem,calc(env(safe-area-inset-bottom)+7rem))] lg:bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-2xl bg-gray-900 text-white text-sm font-medium shadow-2xl animate-pop-in max-w-[92vw]">
          {shopError}
        </div>
      )}
    </div>
  );
}

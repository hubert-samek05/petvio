'use client';

import { useEffect, useState } from 'react';
import { Ban, Eye, Globe, Loader2, Lock, MessageCircle, Settings2, Users, X } from 'lucide-react';
import { Avatar } from './shared';
import { friendsApi } from '@/lib/api';

interface Settings {
  bio: string;
  city: string;
  birthday: string;
  birthday_visibility: 'public' | 'friends' | 'private';
  wall_setting: 'friends' | 'nobody';
  messages_from: 'everyone' | 'friends';
}

interface BlockedUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

const Opt = ({
  value, label, desc, active, onClick,
}: { value: string; label: string; desc: string; active: boolean; onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-[120px] p-3 rounded-2xl border-2 text-left transition-all ${
      active ? 'border-brand-dark bg-brand-mint/40' : 'border-gray-200 hover:border-gray-300'
    }`}
  >
    <span className="block font-semibold text-gray-900 text-sm">{label}</span>
    <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
  </button>
);

export default function ProfileSettingsModal({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<Settings | null>(null);
  const [blocked, setBlocked] = useState<BlockedUser[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [unblockBusy, setUnblockBusy] = useState<string | null>(null);

  useEffect(() => {
    document.body.classList.add('modal-open');
    Promise.all([friendsApi.getSettings(), friendsApi.blocked()])
      .then(([res, bl]) => {
        const st = res.settings || {};
        setS({
          bio: st.bio || '',
          city: st.city || '',
          birthday: st.birthday ? String(st.birthday).slice(0, 10) : '',
          birthday_visibility: st.birthday_visibility || 'friends',
          wall_setting: st.wall_setting || 'friends',
          messages_from: st.messages_from || 'everyone',
        });
        setBlocked(bl.blocked || []);
      })
      .catch(() => setS({ bio: '', city: '', birthday: '', birthday_visibility: 'friends', wall_setting: 'friends', messages_from: 'everyone' }));
    return () => document.body.classList.remove('modal-open');
  }, []);

  const save = async () => {
    if (!s || saving) return;
    setSaving(true);
    try {
      await friendsApi.updateSettings({
        bio: s.bio,
        city: s.city,
        birthday: s.birthday || undefined,
        birthday_visibility: s.birthday_visibility,
        wall_setting: s.wall_setting,
        messages_from: s.messages_from,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      alert(e?.response?.data?.error?.message || 'Nie udało się zapisać ustawień.');
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (id: string) => {
    setUnblockBusy(id);
    try {
      await friendsApi.unblock(id);
      setBlocked((l) => l.filter((b) => b.id !== id));
    } catch {} finally {
      setUnblockBusy(null);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-brand-dark focus:ring-4 focus:ring-brand/10';
  const labelCls = 'block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl z-10">
          <h3 className="font-serif text-xl font-normal text-gray-900 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-brand-dark" /> Ustawienia tablicy
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100" aria-label="Zamknij">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!s ? (
          <div className="py-16 text-center"><Loader2 className="w-7 h-7 mx-auto text-brand animate-spin" /></div>
        ) : (
          <div className="p-4 sm:p-5 space-y-6">
            {/* Dane profilu */}
            <div className="space-y-3">
              <h4 className={labelCls}>Informacje o Tobie</h4>
              <textarea
                value={s.bio}
                onChange={(e) => setS({ ...s, bio: e.target.value })}
                placeholder="Napisz kilka słów o sobie i swoich pupilach..."
                maxLength={500}
                rows={3}
                className={`${inputCls} resize-none`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={s.city}
                  onChange={(e) => setS({ ...s, city: e.target.value })}
                  placeholder="Miasto"
                  maxLength={120}
                  className={inputCls}
                />
                <input
                  type="date"
                  value={s.birthday}
                  onChange={(e) => setS({ ...s, birthday: e.target.value })}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Widoczność urodzin */}
            <div>
              <h4 className={labelCls}>Kto widzi Twoją datę urodzin</h4>
              <div className="flex gap-2 flex-wrap">
                <Opt value="public" label="Wszyscy" desc="widoczne na profilu" active={s.birthday_visibility === 'public'} onClick={() => setS({ ...s, birthday_visibility: 'public' })} />
                <Opt value="friends" label="Znajomi" desc="tylko znajomi" active={s.birthday_visibility === 'friends'} onClick={() => setS({ ...s, birthday_visibility: 'friends' })} />
                <Opt value="private" label="Tylko ja" desc="ukryte" active={s.birthday_visibility === 'private'} onClick={() => setS({ ...s, birthday_visibility: 'private' })} />
              </div>
            </div>

            {/* Publikowanie na tablicy */}
            <div>
              <h4 className={labelCls}>Kto może publikować na Twojej tablicy</h4>
              <div className="flex gap-2 flex-wrap">
                <Opt value="friends" label="Znajomi" desc="znajomi mogą Ci coś zostawić" active={s.wall_setting === 'friends'} onClick={() => setS({ ...s, wall_setting: 'friends' })} />
                <Opt value="nobody" label="Tylko ja" desc="tablica wyłącznie dla Ciebie" active={s.wall_setting === 'nobody'} onClick={() => setS({ ...s, wall_setting: 'nobody' })} />
              </div>
            </div>

            {/* Wiadomości */}
            <div>
              <h4 className={labelCls}>Kto może wysyłać Ci wiadomości</h4>
              <div className="flex gap-2 flex-wrap">
                <Opt value="everyone" label="Wszyscy" desc="każdy użytkownik PetVio" active={s.messages_from === 'everyone'} onClick={() => setS({ ...s, messages_from: 'everyone' })} />
                <Opt value="friends" label="Tylko znajomi" desc="pozostali nie rozpoczną rozmowy" active={s.messages_from === 'friends'} onClick={() => setS({ ...s, messages_from: 'friends' })} />
              </div>
            </div>

            {/* Zablokowani */}
            <div>
              <h4 className={labelCls}>Zablokowani użytkownicy ({blocked.length})</h4>
              {blocked.length === 0 ? (
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Ban className="w-4 h-4" /> Nie masz zablokowanych osób.
                </p>
              ) : (
                <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {blocked.map((b) => (
                    <div key={b.id} className="flex items-center gap-3 px-4 py-2.5">
                      <Avatar name={b.name} url={b.avatarUrl} size="sm" />
                      <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{b.name}</span>
                      <button
                        onClick={() => unblock(b.id)}
                        disabled={unblockBusy === b.id}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:border-brand-dark hover:text-brand-dark transition-all disabled:opacity-50"
                      >
                        {unblockBusy === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Odblokuj'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full pv-btn-primary px-5 py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {saved ? 'Zapisano!' : 'Zapisz ustawienia'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

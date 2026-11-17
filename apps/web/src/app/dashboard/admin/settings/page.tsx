'use client';
import PageHeader from '@/components/PageHeader';

import { useEffect, useState } from 'react';
import { Settings, Save, Bell, Shield, Palette, Globe } from 'lucide-react';
import { api } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    siteName: 'Petvio',
    siteDescription: 'Zarządzaj zdrowiem swojego pupila',
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    defaultLanguage: 'pl',
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/api/admin/settings');
        if (res.data?.settings) setSettings((s) => ({ ...s, ...res.data.settings }));
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      await api.put('/api/admin/settings', settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error('Error saving settings:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
            <PageHeader title="Ustawienia" description="Konfiguracja systemu" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
              <Globe className="w-5 h-5 text-brand-dark" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Ustawienia strony</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nazwa strony</label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Opis strony</label>
              <textarea
                value={settings.siteDescription}
                onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Domyślny język</label>
              <select
                value={settings.defaultLanguage}
                onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="pl">Polski</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Bezpieczeństwo</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Tryb konserwacji</p>
                <p className="text-sm text-gray-500">Tylko administratorzy mają dostęp</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-brand-dark' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Pozwól na rejestrację</p>
                <p className="text-sm text-gray-500">Nowi użytkownicy mogą się rejestrować</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allowRegistration: !settings.allowRegistration })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.allowRegistration ? 'bg-brand-dark' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.allowRegistration ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
              <Bell className="w-5 h-5 text-brand-dark" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Powiadomienia</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Powiadomienia email</p>
                <p className="text-sm text-gray-500">Wysyłaj powiadomienia na email</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, emailNotifications: !settings.emailNotifications })}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.emailNotifications ? 'bg-brand-dark' : 'bg-gray-300'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    settings.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="pv-card p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center">
              <Palette className="w-5 h-5 text-brand-dark" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Wygląd</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kolor główny</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand-dark border-2 border-gray-300" />
                <input
                  type="text"
                  value="#1B6B4A"
                  className="px-4 py-2 border border-gray-300 rounded-lg w-32"
                  readOnly
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kolor akcentowy</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-brand border-2 border-gray-300" />
                <input
                  type="text"
                  value="#2A8A5C"
                  className="px-4 py-2 border border-gray-300 rounded-lg w-32"
                  readOnly
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-brand-dark text-white font-medium hover:bg-brand transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Zapisywanie...' : 'Zapisz ustawienia'}
        </button>
        {saved && <span className="text-sm text-brand-dark font-medium">Zapisano ✓</span>}
      </div>
    </div>
  );
}

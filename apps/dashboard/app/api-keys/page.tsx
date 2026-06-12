'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch, clearToken, getToken } from '../lib/api';
import { Nav } from '../components/nav';

type Channel = 'email' | 'whatsapp';

interface Tenant {
  id: string;
  name: string;
  isActive: boolean;
}

interface ApiKey {
  id: string;
  name: string;
  tenantId: string | null;
  isActive: boolean;
  allowedChannels: Channel[] | null;
  rateLimitPerMinute: number | null;
  createdAt: string;
  lastUsedAt: string | null;
}

const ALL_CHANNELS: Channel[] = ['email', 'whatsapp'];

export default function ApiKeysPage() {
  const router = useRouter();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [channels, setChannels] = useState<Channel[]>([...ALL_CHANNELS]);
  const [rateLimit, setRateLimit] = useState('');

  // Plaintext is shown exactly once, right after creation
  const [newKey, setNewKey] = useState<{ name: string; key: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [keyList, tenantList] = await Promise.all([
        apiFetch<ApiKey[]>('/api-keys'),
        apiFetch<Tenant[]>('/tenants'),
      ]);
      setKeys(keyList);
      setTenants(tenantList);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    refresh();
  }, [refresh, router]);

  function toggleChannel(c: Channel) {
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (channels.length === 0) {
      setError('Select at least one channel');
      return;
    }
    setSaving(true);
    try {
      const created = await apiFetch<ApiKey & { key: string }>('/api-keys', {
        method: 'POST',
        body: JSON.stringify({
          name,
          ...(tenantId && { tenantId }),
          // All channels selected = no restriction
          ...(channels.length < ALL_CHANNELS.length && { allowedChannels: channels }),
          ...(rateLimit && { rateLimitPerMinute: Number(rateLimit) }),
        }),
      });
      setNewKey({ name: created.name, key: created.key });
      setCopied(false);
      setName('');
      setTenantId('');
      setChannels([...ALL_CHANNELS]);
      setRateLimit('');
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(k: ApiKey) {
    try {
      await apiFetch(`/api-keys/${k.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !k.isActive }),
      });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function remove(k: ApiKey) {
    if (!confirm(`Delete API key "${k.name}"? Integrations using it will stop working.`)) return;
    try {
      await apiFetch(`/api-keys/${k.id}`, { method: 'DELETE' });
      setError(null);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function copyNewKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const tenantName = (id: string | null) =>
    id === null ? null : (tenants.find((t) => t.id === id)?.name ?? id);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Nav subtitle="Integration keys for the send API (X-API-Key)" />

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {newKey && (
          <div className="mt-4 rounded-md bg-amber-50 border border-amber-300 p-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-amber-800">
                  Key &quot;{newKey.name}&quot; created — copy it now
                </p>
                <p className="mt-1 text-amber-700">
                  This is the only time the key is shown. Only a hash is stored on the server.
                </p>
                <code className="mt-2 block break-all rounded bg-white px-3 py-2 font-mono text-xs border border-amber-200">
                  {newKey.key}
                </code>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={copyNewKey}
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={() => setNewKey(null)}
                  className="rounded-md border border-amber-300 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={create} className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">New API key</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-end">
            <label className="block text-sm">
              <span className="text-gray-600">Name</span>
              <input
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="my-product-production"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Tenant</span>
              <select
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white"
              >
                <option value="">Platform (no tenant)</option>
                {tenants
                  .filter((t) => t.isActive)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
            </label>
            <div className="flex items-center gap-4 pb-2 text-sm">
              {ALL_CHANNELS.map((c) => (
                <label key={c} className="flex items-center gap-1.5 text-gray-700">
                  <input type="checkbox" checked={channels.includes(c)} onChange={() => toggleChannel(c)} />
                  {c}
                </label>
              ))}
            </div>
            <label className="block text-sm">
              <span className="text-gray-600">Rate limit/min</span>
              <input
                type="number"
                min={1}
                value={rateLimit}
                onChange={(e) => setRateLimit(e.target.value)}
                placeholder="default"
                className="mt-1 w-24 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </form>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold">API keys</h2>
            <span className="text-sm text-gray-500">{keys ? `${keys.length} total` : 'loading…'}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Tenant</th>
                <th className="px-4 py-2 font-medium">Channels</th>
                <th className="px-4 py-2 font-medium">Rate limit</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Last used</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {keys?.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No API keys yet — create one above
                  </td>
                </tr>
              )}
              {keys?.map((k) => (
                <tr key={k.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{k.name}</td>
                  <td className="px-4 py-2">
                    {tenantName(k.tenantId) ?? <span className="text-gray-400">platform</span>}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(k.allowedChannels ?? ALL_CHANNELS).map((c) => (
                        <span
                          key={c}
                          className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {k.rateLimitPerMinute ?? <span className="text-gray-400">default</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        k.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {k.isActive ? 'active' : 'paused'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : 'never'}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(k)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                    >
                      {k.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => remove(k)}
                      className="ml-2 rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

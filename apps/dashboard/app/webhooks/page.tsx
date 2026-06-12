'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch, clearToken, getToken } from '../lib/api';
import { Nav } from '../components/nav';

type WebhookEvent = 'message.sent' | 'message.failed';

interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

const ALL_EVENTS: WebhookEvent[] = ['message.sent', 'message.failed'];

export default function WebhooksPage() {
  const router = useRouter();
  const [webhooks, setWebhooks] = useState<Webhook[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<WebhookEvent[]>([...ALL_EVENTS]);
  const [saving, setSaving] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setWebhooks(await apiFetch<Webhook[]>('/webhooks'));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load webhooks');
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    refresh();
  }, [refresh, router]);

  function toggleEvent(ev: WebhookEvent) {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev]));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (events.length === 0) {
      setError('Select at least one event');
      return;
    }
    setSaving(true);
    try {
      await apiFetch('/webhooks', { method: 'POST', body: JSON.stringify({ url, events }) });
      setUrl('');
      setEvents([...ALL_EVENTS]);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Create failed');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(w: Webhook) {
    try {
      await apiFetch(`/webhooks/${w.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !w.isActive }),
      });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }

  async function remove(w: Webhook) {
    if (!confirm(`Delete webhook for ${w.url}?`)) return;
    try {
      await apiFetch(`/webhooks/${w.id}`, { method: 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  async function copySecret(w: Webhook) {
    await navigator.clipboard.writeText(w.secret);
    setCopiedId(w.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Nav subtitle="Delivery status callbacks (HMAC-SHA256 signed)" />

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={create} className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">New webhook</h2>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1 text-sm">
              <span className="text-gray-600">Callback URL</span>
              <input
                required
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/hooks/communication"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="flex items-center gap-4 pb-2 text-sm">
              {ALL_EVENTS.map((ev) => (
                <label key={ev} className="flex items-center gap-1.5 text-gray-700">
                  <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} />
                  {ev}
                </label>
              ))}
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              Register
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Deliveries are POSTs with <code>X-Webhook-Event</code> and{' '}
            <code>X-Webhook-Signature: sha256=&lt;HMAC of body&gt;</code> headers, signed with the
            webhook&apos;s secret.
          </p>
        </form>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold">Webhooks</h2>
            <span className="text-sm text-gray-500">
              {webhooks ? `${webhooks.length} total` : 'loading…'}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">URL</th>
                <th className="px-4 py-2 font-medium">Events</th>
                <th className="px-4 py-2 font-medium">Secret</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No webhooks yet — register one above
                  </td>
                </tr>
              )}
              {webhooks?.map((w) => (
                <tr key={w.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 max-w-xs truncate font-mono text-xs" title={w.url}>
                    {w.url}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {w.events.map((ev) => (
                        <span
                          key={ev}
                          className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap font-mono text-xs">
                    {revealedId === w.id ? w.secret : `${w.secret.slice(0, 10)}…`}
                    <button
                      onClick={() => setRevealedId(revealedId === w.id ? null : w.id)}
                      className="ml-2 rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      {revealedId === w.id ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => copySecret(w)}
                      className="ml-1 rounded border border-gray-300 px-1.5 py-0.5 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      {copiedId === w.id ? 'Copied!' : 'Copy'}
                    </button>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        w.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {w.isActive ? 'active' : 'paused'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(w.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => toggleActive(w)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                    >
                      {w.isActive ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => remove(w)}
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

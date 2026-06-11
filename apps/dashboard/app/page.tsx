'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch, clearToken, getToken } from './lib/api';

interface ProvidersStatus {
  email: { connected: boolean; error: string | null; queue: QueueCounts };
  whatsapp: { status: string; queue: QueueCounts };
}

interface QueueCounts {
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
}

interface MessageRow {
  id: string;
  channel: string;
  to: string;
  subject: string | null;
  status: string;
  errorMessage: string | null;
  retryCount: number;
  createdAt: string;
  sentAt: string | null;
  failedAt: string | null;
}

interface MessageList {
  total: number;
  items: MessageRow[];
}

interface FailedJob {
  jobId: string;
  messageId: string;
  channel: string;
  to: string;
  subject?: string;
  failedReason: string | null;
  attemptsMade: number;
  failedAt: string | null;
}

interface DlqList {
  email: FailedJob[];
  whatsapp: FailedJob[];
}

const REFRESH_MS = 10_000;

const statusColors: Record<string, string> = {
  sent: 'bg-green-100 text-green-700',
  delivered: 'bg-green-100 text-green-700',
  queued: 'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  failed: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const router = useRouter();
  const [providers, setProviders] = useState<ProvidersStatus | null>(null);
  const [messages, setMessages] = useState<MessageList | null>(null);
  const [dlq, setDlq] = useState<DlqList | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [prov, msgs, failed] = await Promise.all([
        apiFetch<ProvidersStatus>('/providers/status'),
        apiFetch<MessageList>('/messages?limit=25'),
        apiFetch<DlqList>('/dlq'),
      ]);
      setProviders(prov);
      setMessages(msgs);
      setDlq(failed);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load data');
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    refresh();
    const interval = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(interval);
  }, [refresh, router]);

  function logout() {
    clearToken();
    router.replace('/login');
  }

  async function dlqAction(path: string) {
    try {
      await apiFetch(path, { method: path.endsWith('/retry') || path.endsWith('/retry-all') ? 'POST' : 'DELETE' });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  }

  const failedJobs = dlq ? [...dlq.email, ...dlq.whatsapp] : [];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Communication Service</h1>
            <p className="text-sm text-gray-500">Provider status and message log</p>
          </div>
          <button
            onClick={logout}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <ProviderCard
            title="Email (SMTP)"
            ok={providers?.email.connected ?? null}
            statusText={
              providers ? (providers.email.connected ? 'connected' : (providers.email.error ?? 'disconnected')) : '…'
            }
            queue={providers?.email.queue}
          />
          <ProviderCard
            title="WhatsApp"
            ok={providers ? providers.whatsapp.status === 'connected' : null}
            statusText={providers?.whatsapp.status ?? '…'}
            queue={providers?.whatsapp.queue}
          />
        </div>

        {failedJobs.length > 0 && (
          <div className="mt-8 rounded-xl border border-red-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-3">
              <h2 className="font-semibold text-red-700">Dead-letter queue ({failedJobs.length})</h2>
              <div className="flex gap-2">
                {dlq!.email.length > 0 && (
                  <button
                    onClick={() => dlqAction('/dlq/email/retry-all')}
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Retry all email
                  </button>
                )}
                {dlq!.whatsapp.length > 0 && (
                  <button
                    onClick={() => dlqAction('/dlq/whatsapp/retry-all')}
                    className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Retry all WhatsApp
                  </button>
                )}
              </div>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Channel</th>
                  <th className="px-4 py-2 font-medium">To</th>
                  <th className="px-4 py-2 font-medium">Reason</th>
                  <th className="px-4 py-2 font-medium">Attempts</th>
                  <th className="px-4 py-2 font-medium">Failed at</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {failedJobs.map((j) => (
                  <tr key={`${j.channel}-${j.jobId}`} className="border-t border-gray-100">
                    <td className="px-4 py-2 capitalize">{j.channel}</td>
                    <td className="px-4 py-2 font-mono text-xs">{j.to}</td>
                    <td className="px-4 py-2 max-w-xs truncate text-red-600" title={j.failedReason ?? ''}>
                      {j.failedReason ?? '—'}
                    </td>
                    <td className="px-4 py-2">{j.attemptsMade}</td>
                    <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                      {j.failedAt ? new Date(j.failedAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        onClick={() => dlqAction(`/dlq/${j.channel}/${j.jobId}/retry`)}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                      >
                        Retry
                      </button>
                      <button
                        onClick={() => dlqAction(`/dlq/${j.channel}/${j.jobId}`)}
                        className="ml-2 rounded-md border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                      >
                        Discard
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold">Recent messages</h2>
            <span className="text-sm text-gray-500">
              {messages ? `${messages.total} total` : 'loading…'}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">To</th>
                <th className="px-4 py-2 font-medium">Subject</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Created</th>
                <th className="px-4 py-2 font-medium">Error</th>
              </tr>
            </thead>
            <tbody>
              {messages?.items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No messages yet
                  </td>
                </tr>
              )}
              {messages?.items.map((m) => (
                <tr key={m.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 capitalize">{m.channel}</td>
                  <td className="px-4 py-2 font-mono text-xs">{m.to}</td>
                  <td className="px-4 py-2 text-gray-600">{m.subject ?? '—'}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[m.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {m.status}
                      {m.retryCount > 0 && ` (retry ${m.retryCount})`}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 max-w-xs truncate text-red-600" title={m.errorMessage ?? ''}>
                    {m.errorMessage ?? ''}
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

function ProviderCard({
  title,
  ok,
  statusText,
  queue,
}: {
  title: string;
  ok: boolean | null;
  statusText: string;
  queue?: QueueCounts;
}) {
  const dot = ok === null ? 'bg-gray-300' : ok ? 'bg-green-500' : 'bg-red-500';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <span className="flex items-center gap-2 text-sm text-gray-600">
          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
          {statusText}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
        {(['waiting', 'active', 'delayed', 'failed'] as const).map((k) => (
          <div key={k} className="rounded-md bg-gray-50 py-2">
            <div className="font-semibold">{queue?.[k] ?? '—'}</div>
            <div className="text-xs text-gray-500 capitalize">{k}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

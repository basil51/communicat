'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiFetch, clearToken, getToken } from '../lib/api';
import { Nav } from '../components/nav';

interface Template {
  id: string;
  name: string;
  channel: 'email' | 'whatsapp';
  subject: string | null;
  body: string;
  updatedAt: string;
}

const emptyForm = { name: '', channel: 'email' as 'email' | 'whatsapp', subject: '', body: '' };

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setTemplates(await apiFetch<Template[]>('/templates'));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearToken();
        router.replace('/login');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    }
  }, [router]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    refresh();
  }, [refresh, router]);

  function startEdit(t: Template) {
    setEditingId(t.id);
    setForm({ name: t.name, channel: t.channel, subject: t.subject ?? '', body: t.body });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      name: form.name,
      channel: form.channel,
      body: form.body,
    };
    if (form.channel === 'email' && form.subject) payload.subject = form.subject;
    try {
      if (editingId) {
        await apiFetch(`/templates/${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      } else {
        await apiFetch('/templates', { method: 'POST', body: JSON.stringify(payload) });
      }
      cancelEdit();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function remove(t: Template) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await apiFetch(`/templates/${t.id}`, { method: 'DELETE' });
      if (editingId === t.id) cancelEdit();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-6xl">
        <Nav subtitle="Reusable message templates with {{variable}} placeholders" />

        {error && (
          <div className="mt-4 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={save} className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="font-semibold">{editingId ? 'Edit template' : 'New template'}</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-600">Name</span>
              <input
                required
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="order-confirmation"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Channel</span>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value as 'email' | 'whatsapp' })}
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
              >
                <option value="email">email</option>
                <option value="whatsapp">whatsapp</option>
              </select>
            </label>
            {form.channel === 'email' && (
              <label className="block text-sm sm:col-span-2">
                <span className="text-gray-600">Subject (optional, supports placeholders)</span>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  placeholder="Order {{orderId}} shipped"
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
            )}
            <label className="block text-sm sm:col-span-2">
              <span className="text-gray-600">Body</span>
              <textarea
                required
                rows={4}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Hi {{name}}, your order {{orderId}} has shipped."
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </label>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              {editingId ? 'Save changes' : 'Create template'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-md border border-gray-300 px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <h2 className="font-semibold">Templates</h2>
            <span className="text-sm text-gray-500">
              {templates ? `${templates.length} total` : 'loading…'}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Channel</th>
                <th className="px-4 py-2 font-medium">Subject</th>
                <th className="px-4 py-2 font-medium">Body</th>
                <th className="px-4 py-2 font-medium">Updated</th>
                <th className="px-4 py-2 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    No templates yet — create one above
                  </td>
                </tr>
              )}
              {templates?.map((t) => (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="px-4 py-2 font-medium">{t.name}</td>
                  <td className="px-4 py-2 capitalize">{t.channel}</td>
                  <td className="px-4 py-2 max-w-xs truncate text-gray-600" title={t.subject ?? ''}>
                    {t.subject ?? '—'}
                  </td>
                  <td className="px-4 py-2 max-w-sm truncate font-mono text-xs text-gray-600" title={t.body}>
                    {t.body}
                  </td>
                  <td className="px-4 py-2 text-gray-500 whitespace-nowrap">
                    {new Date(t.updatedAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(t)}
                      className="rounded-md border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(t)}
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import PanelShell, { PanelAccount } from '@/components/PanelShell';

const BLUE    = '#1C1512';
const BLUE_LT = '#FEF6D8';
const BLUE_MD = '#F3DC8C';
const PAGE_SIZE = 100;

async function adminLogout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location.href = '/bakchod_ad/login';
}

type StatusFilter = 'all' | 'success' | 'pending' | 'failed';
type AdminTab = 'payments' | 'subscriptions' | 'marketing' | 'mediaBuyers';
type MarketingTab = 'overview' | 'campaigns';

/* ── Types ─────────────────────────────────────────────── */
interface PaymentRow {
  user_id: number;
  user_number: string;
  user_payment: number;
  payment_status: 'success' | 'pending' | 'failed';
  date_time: string;
  txn_id: string;
  campaign_slug: string | null;
  media_buyer_name: string | null;
  pixel_id: string | null;
  ad_account_id: string | null;
  meta_campaign_id: string | null;
  meta_campaign_name: string | null;
}

interface Stats {
  total_payments: string;
  total_successful: string;
  total_pending: string;
  total_failed: string;
  total_users: string;
}

interface Client {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  has_password: boolean;
  created_at: string;
}

interface Pixel {
  id: number;
  slug: string;
  label: string;
  pixel_id: string;
  access_token: string;
  ad_account_id: string | null;
  is_default: boolean;
  client_id: number | null;
  client_name: string | null;
}

interface MarketingOverview {
  total_purchases: string;
  capi_sent: string;
  capi_issues: string;
  organic: string;
}

interface PixelStat {
  id: number;
  slug: string;
  label: string;
  pixel_id: string;
  ad_account_id: string | null;
  is_default: boolean;
  client_id: number | null;
  client_name: string | null;
  purchases: string;
  capi_sent: string;
  capi_issues: string;
}

interface MetaCampaignStat {
  meta_campaign_id: string;
  meta_campaign_name: string | null;
  campaign_slug: string | null;
  pixel_label: string | null;
  pixel_id: string | null;
  ad_account_id: string | null;
  client_name: string | null;
  purchases: string;
  capi_sent: string;
  capi_issues: string;
}

/* ── Helpers ───────────────────────────────────────────── */
const STATUS_CFG: Record<string, { bg: string; color: string; border: string; label: string }> = {
  success: { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Success' },
  pending: { bg: '#FEFCE8', color: '#A16207', border: '#FEF08A', label: 'Pending' },
  failed:  { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'Failed'  },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_CFG[status] ?? { bg: '#F1EDE6', color: '#5A5148', border: '#D5CDC0', label: status };
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

const FILTER_TABS: { key: StatusFilter; label: string; color: string; bg: string; border: string }[] = [
  { key: 'all',     label: 'All',     color: '#5A5148', bg: '#F1EDE6', border: '#D5CDC0' },
  { key: 'success', label: 'Success', color: '#15803D', bg: '#F0FDF4', border: '#86EFAC' },
  { key: 'pending', label: 'Pending', color: '#A16207', bg: '#FEFCE8', border: '#FDE047' },
  { key: 'failed',  label: 'Failed',  color: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5' },
];

/* ── Shared styles ──────────────────────────────────────── */
const inputCls  = 'w-full px-3 py-2 rounded-[8px] text-[12px] text-stone-800 bg-white border outline-none transition-all focus:ring-2 focus:ring-amber-200';
const inputStyle = { borderColor: '#D5CDC0' };
const labelCls  = 'text-[10px] text-stone-500 font-bold uppercase tracking-widest block mb-1';

const card = {
  background: '#FFFFFF',
  border: '1px solid #E6E0D6',
  borderRadius: 10,
};

/* ── Client Form ────────────────────────────────────────── */
const EMPTY_CLIENT = { name: '', email: '', password: '' };

function ClientForm({ initial = EMPTY_CLIENT, isEdit = false, onSave, onCancel, saving }: {
  initial?: typeof EMPTY_CLIENT;
  isEdit?: boolean;
  onSave: (data: typeof EMPTY_CLIENT) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm]         = useState(initial);
  const [showPass, setShowPass] = useState(false);
  const set = (k: keyof typeof EMPTY_CLIENT, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="rounded-[10px] p-5 mb-4" style={{ ...card, background: '#FAF8F4', border: `1.5px solid ${isEdit ? BLUE_MD : '#E6E0D6'}` }}>
      <p className="text-[13px] font-bold text-stone-800 mb-4">{isEdit ? 'Edit media buyer' : 'Add media buyer'}</p>

      {/* Row 1: name + email (email = login id) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className={labelCls}>Name <span style={{ color: BLUE }}>*</span></label>
          <input value={form.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Rahul Sharma" autoFocus={!isEdit} autoComplete="off"
            className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls}>
            Email <span className="text-stone-300 font-normal normal-case tracking-normal">(used for portal login)</span>
          </label>
          <input value={form.email} onChange={(e) => set('email', e.target.value)}
            placeholder="rahul@example.com" type="email" autoComplete="off"
            className={inputCls} style={inputStyle} />
        </div>
      </div>

      {/* Row 2: password */}
      <div className="mb-4">
        <label className={labelCls}>
          Password{isEdit && <span className="text-stone-300 font-normal normal-case tracking-normal"> (leave blank to keep existing)</span>}
        </label>
        <div className="relative max-w-xs">
          <input value={form.password} onChange={(e) => set('password', e.target.value)}
            type={showPass ? 'text' : 'password'} autoComplete="new-password"
            placeholder={isEdit ? '••••••••' : 'Set login password'}
            className={inputCls + ' pr-9'} style={inputStyle} />
          <button type="button" onClick={() => setShowPass((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
            {showPass
              ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
              : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
            }
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-[8px] text-[12px] font-bold text-white transition-all disabled:opacity-40"
          style={{ background: BLUE }}>
          {saving ? 'Saving…' : isEdit ? 'Update' : 'Save'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-stone-500 transition-colors hover:bg-stone-100"
          style={{ background: '#F1EDE6', border: '1px solid #E6E0D6' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Pixel Form ─────────────────────────────────────────── */
const EMPTY_FORM = { slug: '', label: '', pixel_id: '', access_token: '', ad_account_id: '', client_id: '' };

function PixelForm({
  initial, onSave, onCancel, saving, clients,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => void;
  onCancel: () => void;
  saving: boolean;
  clients: Client[];
}) {
  const [form, setForm]       = useState(initial);
  const [showToken, setShowToken] = useState(false);
  const set = (k: keyof typeof EMPTY_FORM, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));
  const canSave = form.slug && form.label && form.pixel_id && form.access_token && form.client_id;

  return (
    <div className="rounded-[10px] p-5 mb-4" style={{ ...card, background: '#FAF8F4' }}>
      <p className="text-[13px] font-bold text-stone-800 mb-4">{initial.slug ? 'Edit pixel' : 'Add pixel'}</p>

      <div className="mb-3">
        <label className={labelCls}>User <span style={{ color: BLUE }}>*</span></label>
        <select value={form.client_id} onChange={(e) => set('client_id', e.target.value)}
          className={inputCls} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="" disabled>— select user —</option>
          {clients.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.name}</option>
          ))}
        </select>
        {clients.length === 0 && (
          <p className="text-[10px] mt-1 text-red-500">No users yet — create a user first in the Users tab.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div>
          <label className={labelCls}>Slug (used in ?c=)</label>
          <input value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
            placeholder="e.g. summer-a" autoComplete="new-password" name="px-slug" className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls}>Label</label>
          <input value={form.label} onChange={(e) => set('label', e.target.value)}
            placeholder="e.g. Summer Campaign A" autoComplete="new-password" name="px-label" className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls}>Meta Pixel ID</label>
          <input value={form.pixel_id} onChange={(e) => set('pixel_id', e.target.value.trim())}
            placeholder="15-16 digit pixel id" autoComplete="new-password" name="px-pixel-id" className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls}>CAPI Access Token</label>
          <div className="relative">
            <input value={form.access_token} onChange={(e) => set('access_token', e.target.value.trim())}
              placeholder="System User token" type={showToken ? 'text' : 'password'} autoComplete="new-password" name="px-token"
              className={inputCls + ' pr-9'} style={inputStyle} />
            <button type="button" onClick={() => setShowToken((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors">
              {showToken
                ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
              }
            </button>
          </div>
        </div>
        <div>
          <label className={labelCls}>Ad Account ID <span className="text-stone-300 font-normal normal-case tracking-normal">(optional)</span></label>
          <input value={form.ad_account_id} onChange={(e) => set('ad_account_id', e.target.value.trim())}
            placeholder="act_123456789" autoComplete="new-password" name="px-ad-account" className={inputCls} style={inputStyle} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => onSave(form)} disabled={saving || !canSave}
          className="px-4 py-2 rounded-[8px] text-[12px] font-bold text-white transition-all disabled:opacity-40"
          style={{ background: BLUE }}>
          {saving ? 'Saving…' : 'Save pixel'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-stone-500 hover:bg-stone-100 transition-colors"
          style={{ background: '#F1EDE6', border: '1px solid #E6E0D6' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ── Breakdown Table ────────────────────────────────────── */
function BreakdownTable({
  title, cols, loading, empty, emptyMsg, children,
}: {
  title: string; cols: string[]; loading: boolean;
  empty: boolean; emptyMsg: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[10px] overflow-hidden" style={card}>
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #F1EDE6', background: '#FAF8F4' }}>
        <p className="text-[11px] font-bold uppercase tracking-[.15em] text-stone-400">{title}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid #F1EDE6', background: '#FAF8F4' }}>
              {cols.map((h) => (
                <th key={h} className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-[.16em] text-stone-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #FAF8F4' }}>
                  {cols.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3.5 rounded animate-pulse bg-stone-100" style={{ width: j === 0 ? 100 : 40 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : empty ? (
              <tr><td colSpan={cols.length} className="px-4 py-6 text-center text-[12px] text-stone-400">{emptyMsg}</td></tr>
            ) : children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── MediaBuyers Panel ──────────────────────────────────── */
function MediaBuyersPanel() {
  const [clients, setClients]         = useState<Client[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [editClient, setEditClient]   = useState<Client | null>(null);
  const [saving, setSaving]           = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/clients');
    if (res.status === 401) { adminLogout(); return; }
    const json = await res.json();
    if (json.success) setClients(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  async function handleSave(form: typeof EMPTY_CLIENT) {
    setSaving(true);
    const res  = await fetch('/api/admin/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    setSaving(false);
    if (json.success) { setShowForm(false); fetchClients(); }
    else { alert(json.message ?? 'Error saving media buyer'); }
  }

  async function handleUpdate(form: typeof EMPTY_CLIENT) {
    if (!editClient) return;
    setSaving(true);
    const res  = await fetch(`/api/admin/clients?id=${editClient.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const json = await res.json();
    setSaving(false);
    if (json.success) { setEditClient(null); fetchClients(); }
    else { alert(json.message ?? 'Error updating media buyer'); }
  }

  async function handleDelete(id: number) {
    const res  = await fetch(`/api/admin/clients?id=${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) { setDeleteConfirm(null); fetchClients(); }
    else { alert(json.message ?? 'Delete failed'); }
  }

  return (
    <div className="fu">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[12px] text-stone-500">{clients.length} media buyer{clients.length !== 1 ? 's' : ''} registered</p>
        {!showForm && !editClient && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold text-white shrink-0 transition-all hover:opacity-90"
            style={{ background: BLUE }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            New media buyer
          </button>
        )}
      </div>

      {showForm && (
        <ClientForm onSave={handleSave} onCancel={() => setShowForm(false)} saving={saving} />
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-[8px] animate-pulse bg-stone-100" />)}
        </div>
      ) : clients.length === 0 && !showForm ? (
        <div className="rounded-[10px] px-6 py-12 text-center" style={card}>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ background: BLUE_LT }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth={2} strokeLinecap="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
          </div>
          <p className="text-[13px] font-semibold text-stone-500">No media buyers yet</p>
          <p className="text-[11px] text-stone-400 mt-1">Add one to start assigning pixels.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((cl) => (
            <div key={cl.id}>
              {/* Edit form — inline under the row */}
              {editClient?.id === cl.id ? (
                <ClientForm
                  initial={{ name: cl.name, email: cl.email ?? '', password: '' }}
                  isEdit
                  onSave={handleUpdate}
                  onCancel={() => setEditClient(null)}
                  saving={saving}
                />
              ) : (
                <div className="flex items-center gap-4 px-4 py-3.5 rounded-[8px] hover:shadow-sm transition-all"
                  style={card}>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-[14px] text-white"
                    style={{ background: BLUE, color: '#FACC15' }}>
                    {cl.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-stone-800">{cl.name}</span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: cl.is_active ? '#F0FDF4' : '#F1EDE6', color: cl.is_active ? '#15803D' : '#776D62', border: `1px solid ${cl.is_active ? '#BBF7D0' : '#E6E0D6'}` }}>
                        {cl.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1"
                        style={{ background: cl.has_password ? '#F0FDF4' : '#FEF2F2', color: cl.has_password ? '#15803D' : '#B91C1C', border: `1px solid ${cl.has_password ? '#BBF7D0' : '#FECACA'}` }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
                        </svg>
                        {cl.has_password ? 'Password set' : 'No password'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 flex-wrap">
                      {cl.email && (
                        <span className="flex items-center gap-1 text-[11px] text-stone-400">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
                          {cl.email}
                        </span>
                      )}
                      <span className="text-[10px] text-stone-300">Added {formatDate(cl.created_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deleteConfirm === cl.id ? (
                      <>
                        <span className="text-[11px] text-stone-500">Delete?</span>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold text-stone-500" style={{ background: '#F1EDE6', border: '1px solid #E6E0D6' }}>No</button>
                        <button onClick={() => handleDelete(cl.id)} className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold text-white" style={{ background: '#DC2626' }}>Yes</button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditClient(cl); setShowForm(false); setDeleteConfirm(null); }}
                          className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold transition-colors"
                          style={{ background: BLUE_LT, color: BLUE, border: `1px solid ${BLUE_MD}` }}>
                          Edit
                        </button>
                        <button onClick={() => setDeleteConfirm(cl.id)}
                          className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold transition-colors"
                          style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Subscriptions Panel ────────────────────────────────── */
type SubState = 'active' | 'expired' | 'cancelled' | 'all';

interface SubRow {
  id: number;
  user_id: number;
  mobile: string;
  plan_name: string;
  amount: number | null;
  start_date: string;
  end_date: string;
  source: 'payment' | 'admin';
  note: string | null;
  state: 'active' | 'expired' | 'cancelled';
  days_left: number;
}

interface SubStats { active: string; expired: string; active_paid: string; active_granted: string }
interface PlanOpt { id: number; name: string; price: number; duration_days: number }

const SUB_STATE_CFG: Record<SubRow['state'], { bg: string; color: string; border: string; label: string }> = {
  active:    { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0', label: 'Active' },
  expired:   { bg: '#F1EDE6', color: '#776D62', border: '#D5CDC0', label: 'Expired' },
  cancelled: { bg: '#FEF2F2', color: '#B91C1C', border: '#FECACA', label: 'Replaced / Revoked' },
};

const SUB_FILTERS: { key: SubState; label: string }[] = [
  { key: 'active',    label: 'Active' },
  { key: 'expired',   label: 'Expired' },
  { key: 'cancelled', label: 'Replaced / Revoked' },
  { key: 'all',       label: 'All' },
];

function GrantForm({ plans, onDone, onCancel }: { plans: PlanOpt[]; onDone: () => void; onCancel: () => void }) {
  const [mobile, setMobile] = useState('');
  const [planId, setPlanId] = useState(plans[plans.length - 1]?.id ?? 0);
  const [days, setDays]     = useState(String(plans[plans.length - 1]?.duration_days ?? 30));
  const [note, setNote]     = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const pickPlan = (id: number) => {
    setPlanId(id);
    const p = plans.find((x) => x.id === id);
    if (p) setDays(String(p.duration_days));
  };

  async function submit() {
    setSaving(true);
    setError('');
    const res  = await fetch('/api/admin/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, planId, days: Number(days), note }),
    });
    if (res.status === 401) { adminLogout(); return; }
    const json = await res.json();
    setSaving(false);
    if (json.success) onDone();
    else setError(json.message ?? 'Could not grant subscription');
  }

  return (
    <div className="rounded-[10px] p-5 mb-4" style={{ ...card, background: '#FAF8F4', border: `1.5px solid ${BLUE_MD}` }}>
      <p className="text-[13px] font-bold text-stone-800">Grant subscription</p>
      <p className="text-[11px] text-stone-400 mb-4">
        Free access for any mobile number. If they already have an active plan, these days are added on top.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <label className={labelCls}>Mobile <span style={{ color: BLUE }}>*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-stone-400">+91</span>
            <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
              placeholder="9876543210" inputMode="numeric" autoFocus autoComplete="off"
              className={inputCls + ' pl-10'} style={inputStyle} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Plan</label>
          <select value={planId} onChange={(e) => pickPlan(Number(e.target.value))} className={inputCls} style={inputStyle}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — ₹{p.price} / {p.duration_days}d</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Days <span className="text-stone-300 font-normal normal-case tracking-normal">(editable)</span></label>
          <input value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric" className={inputCls} style={inputStyle} />
        </div>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Note <span className="text-stone-300 font-normal normal-case tracking-normal">(optional — e.g. reason)</span></label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Payment deducted but not activated"
          className={inputCls} style={inputStyle} />
      </div>

      {error && <p className="text-[11px] font-semibold text-red-600 mb-3">{error}</p>}

      <div className="flex items-center gap-2">
        <button onClick={submit} disabled={saving || mobile.length !== 10 || !days}
          className="px-4 py-2 rounded-[8px] text-[12px] font-bold text-white transition-all disabled:opacity-40"
          style={{ background: BLUE }}>
          {saving ? 'Granting…' : `Grant ${days || 0} days`}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 rounded-[8px] text-[12px] font-semibold text-stone-500 transition-colors hover:bg-stone-100"
          style={{ background: '#F1EDE6', border: '1px solid #E6E0D6' }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

function SubscriptionsPanel() {
  const [rows, setRows]         = useState<SubRow[]>([]);
  const [stats, setStats]       = useState<SubStats | null>(null);
  const [plans, setPlans]       = useState<PlanOpt[]>([]);
  const [state, setState]       = useState<SubState>('active');
  const [source, setSource]     = useState('');
  const [search, setSearch]     = useState('');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [showGrant, setShowGrant] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<number | null>(null);
  const [flash, setFlash]       = useState('');

  const fetchSubs = useCallback(async (st: SubState, src: string, q: string, pg: number) => {
    setLoading(true);
    const params = new URLSearchParams({ state: st, page: String(pg), ...(src && { source: src }), ...(q && { search: q }) });
    const res = await fetch(`/api/admin/subscriptions?${params}`);
    if (res.status === 401) { adminLogout(); return; }
    const json = await res.json();
    if (json.success) {
      setRows(json.data); setStats(json.stats); setPlans(json.plans);
      setTotal(json.total); setTotalPages(json.totalPages);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubs(state, source, search, page); }, [state, source, search, page, fetchSubs]);

  async function revoke(id: number) {
    const res  = await fetch(`/api/admin/subscriptions?id=${id}`, { method: 'DELETE' });
    const json = await res.json();
    setRevokeConfirm(null);
    if (json.success) fetchSubs(state, source, search, page);
    else alert(json.message ?? 'Revoke failed');
  }

  const statCards = stats ? [
    { label: 'Active now',     value: stats.active,         color: '#15803D', bg: '#F0FDF4' },
    { label: 'Active · Paid',  value: stats.active_paid,    color: BLUE,      bg: BLUE_LT },
    { label: 'Active · Granted', value: stats.active_granted, color: '#7C3AED', bg: '#F5F3FF' },
    { label: 'Expired',        value: stats.expired,        color: '#776D62', bg: '#FAF8F4' },
  ] : [];

  return (
    <div className="fu">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div />
        {!showGrant && (
          <button onClick={() => { setShowGrant(true); setFlash(''); }} disabled={plans.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold text-white shrink-0 transition-all hover:opacity-90 disabled:opacity-40"
            style={{ background: BLUE }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            Grant subscription
          </button>
        )}
      </div>

      {flash && (
        <div className="rounded-[10px] px-4 py-2.5 mb-4 text-[12px] font-semibold" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
          {flash}
        </div>
      )}

      {showGrant && (
        <GrantForm
          plans={plans}
          onCancel={() => setShowGrant(false)}
          onDone={() => {
            setShowGrant(false);
            setFlash('Subscription granted. User gets access on their next login or page refresh.');
            setState('active'); setSource(''); setSearch(''); setPage(1);
            fetchSubs('active', '', '', 1);
          }}
        />
      )}

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {statCards.map((c) => (
            <div key={c.label} className="rounded-[10px] px-4 py-3.5" style={{ background: c.bg, border: `1px solid ${c.color}22` }}>
              <p className="text-[9px] font-bold uppercase tracking-[.12em] mb-0.5" style={{ color: c.color + '99' }}>{c.label}</p>
              <p className="k-display text-[28px] leading-none" style={{ color: c.color }}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[10px] overflow-hidden" style={{ background: '#FFFFFF', border: '1px solid #E6E0D6', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #F1EDE6', background: '#FAF8F4' }}>
          <div className="flex items-center gap-1.5 flex-wrap">
            {SUB_FILTERS.map((f) => (
              <button key={f.key} onClick={() => { setState(f.key); setPage(1); }}
                className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold uppercase tracking-wide transition-all"
                style={{
                  background: state === f.key ? BLUE_MD : '#FFFFFF',
                  border: `1.5px solid ${state === f.key ? BLUE : '#E6E0D6'}`,
                  color: state === f.key ? BLUE : '#A39A8E',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <select value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none"
            style={{ background: source ? BLUE_LT : '#FFFFFF', border: `1.5px solid ${source ? BLUE : '#E6E0D6'}`, color: source ? BLUE : '#A39A8E' }}>
            <option value="">Paid + Granted</option>
            <option value="payment">Paid only</option>
            <option value="admin">Granted only</option>
          </select>
          <div className="relative">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A39A8E" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
            <input value={search} onChange={(e) => { setSearch(e.target.value.replace(/\D/g, '')); setPage(1); }}
              placeholder="Search mobile…" inputMode="numeric" autoComplete="off"
              className="pl-7 pr-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
              style={{ background: search ? BLUE_LT : '#FFFFFF', border: `1.5px solid ${search ? BLUE : '#E6E0D6'}`, color: '#3A322C', width: 140 }} />
          </div>
          <span className="ml-auto text-[11px] text-stone-400 hidden sm:block">{total} results · Page {page}/{totalPages}</span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr style={{ borderBottom: '1px solid #F1EDE6', background: '#FAF8F4' }}>
                {['Mobile', 'Plan', 'Source', 'Status', 'Started', 'Ends', 'Note', ''].map((h) => (
                  <th key={h} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.16em] text-stone-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #FAF8F4' }}>
                    {[110, 90, 70, 70, 120, 120, 120, 60].map((w, j) => (
                      <td key={j} className="px-5 py-3.5"><div className="h-4 rounded-lg animate-pulse bg-stone-100" style={{ width: w }} /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-[13px] text-stone-400">No subscriptions found</td></tr>
              ) : (
                rows.map((r) => {
                  const st = SUB_STATE_CFG[r.state];
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #FAF8F4' }}>
                      <td className="px-5 py-3.5">
                        <span className="block text-[13px] font-semibold text-stone-800">+91 {r.mobile}</span>
                        <span className="text-[10px] text-stone-400">User #{r.user_id}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block text-[12px] font-bold text-stone-700">{r.plan_name}</span>
                        {r.amount != null && <span className="text-[10px] text-stone-400">₹{Number(r.amount).toLocaleString('en-IN')}</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={r.source === 'admin'
                            ? { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' }
                            : { background: BLUE_LT, color: BLUE, border: `1px solid ${BLUE_MD}` }}>
                          {r.source === 'admin' ? 'Granted' : 'Paid'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                          style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                          {st.label}
                        </span>
                        {r.state === 'active' && <span className="block text-[10px] text-stone-400 mt-1">{r.days_left} day{r.days_left === 1 ? '' : 's'} left</span>}
                      </td>
                      <td className="px-5 py-3.5"><span className="text-[11px] text-stone-500">{formatDate(r.start_date)}</span></td>
                      <td className="px-5 py-3.5"><span className="text-[11px] text-stone-500">{formatDate(r.end_date)}</span></td>
                      <td className="px-5 py-3.5 max-w-[200px]"><span className="text-[11px] text-stone-500">{r.note || '—'}</span></td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {r.state === 'active' && (revokeConfirm === r.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-[11px] text-stone-500">Revoke?</span>
                            <button onClick={() => setRevokeConfirm(null)} className="px-2 py-1 rounded-[6px] text-[11px] font-bold text-stone-500" style={{ background: '#F1EDE6', border: '1px solid #E6E0D6' }}>No</button>
                            <button onClick={() => revoke(r.id)} className="px-2 py-1 rounded-[6px] text-[11px] font-bold text-white" style={{ background: '#DC2626' }}>Yes</button>
                          </span>
                        ) : (
                          <button onClick={() => setRevokeConfirm(r.id)}
                            className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold"
                            style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>
                            Revoke
                          </button>
                        ))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: '1px solid #F1EDE6', background: '#FAF8F4' }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}
              className="px-3.5 py-2 rounded-[10px] text-[12px] font-bold disabled:opacity-30"
              style={{ background: '#FFFFFF', border: '1.5px solid #E6E0D6', color: '#776D62' }}>← Prev</button>
            <span className="text-[12px] font-semibold text-stone-500">Page {page} of {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
              className="px-3.5 py-2 rounded-[10px] text-[12px] font-bold disabled:opacity-30"
              style={{ background: '#FFFFFF', border: '1.5px solid #E6E0D6', color: '#776D62' }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Marketing Panel ────────────────────────────────────── */
function MarketingPanel() {
  const [tab, setTab]       = useState<MarketingTab>('overview');
  const [brkTab, setBrkTab] = useState<'campaign' | 'meta'>('campaign');
  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate]     = useState(todayStr);
  const [allTime, setAllTime]   = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [overviewSlugSearch, setOverviewSlugSearch] = useState('');
  const [overview, setOverview] = useState<MarketingOverview | null>(null);
  const [byPixel, setByPixel]             = useState<PixelStat[]>([]);
  const [byMetaCampaign, setByMetaCampaign] = useState<MetaCampaignStat[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [pixels, setPixels]         = useState<Pixel[]>([]);
  const [adAccountFilter, setAdAccountFilter]     = useState('');
  const [pixelClientFilter, setPixelClientFilter] = useState('');
  const [pixelSlugSearch, setPixelSlugSearch]     = useState('');
  const [pxList, setPxList]                       = useState<Pixel[]>([]);
  const [pxListPage, setPxListPage]               = useState(1);
  const [pxListTotalPages, setPxListTotalPages]   = useState(1);
  const [pxListTotal, setPxListTotal]             = useState(0);
  const [pxListLoading, setPxListLoading]         = useState(false);
  const [loadingStats, setLoadingStats]   = useState(true);
  const [loadingPixels, setLoadingPixels] = useState(true);
  const [showPixelForm, setShowPixelForm] = useState(false);
  const [editPixel, setEditPixel]         = useState<Pixel | null>(null);
  const [saving, setSaving]               = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [copiedSlug, setCopiedSlug]       = useState<string | null>(null);

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? '');

  const metaUrl = (slug: string) =>
    `${baseUrl}/?c=${slug}&meta_campaign_id={{campaign.id}}&meta_campaign_name={{campaign.name}}`;

  function copyLink(slug: string) {
    const url = metaUrl(slug);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    });
  }

  const fetchClients = useCallback(async () => {
    const res = await fetch('/api/admin/clients');
    if (res.status === 401) { adminLogout(); return; }
    const json = await res.json();
    if (json.success) setClients(json.data);
  }, []);

  const fetchStats = useCallback(async (from: string, to: string, clientId: string, slugSearch: string, adAccount: string) => {
    setLoadingStats(true);
    const params = new URLSearchParams();
    if (from)       params.set('from', from);
    if (to)         params.set('to', to);
    if (clientId)   params.set('client_id', clientId);
    if (slugSearch) params.set('slug_search', slugSearch);
    if (adAccount)  params.set('ad_account_id', adAccount);
    const res = await fetch(`/api/admin/marketing?${params}`);
    if (res.status === 401) { adminLogout(); return; }
    const json = await res.json();
    if (json.success) {
      setOverview(json.overview);
      setByPixel(json.by_pixel);
      setByMetaCampaign(json.by_meta_campaign ?? []);
    }
    setLoadingStats(false);
  }, []);

  const fetchPixels = useCallback(async () => {
    setLoadingPixels(true);
    const res = await fetch('/api/admin/pixels');
    if (res.status === 401) { adminLogout(); return; }
    const json = await res.json();
    if (json.success) setPixels(json.data);
    setLoadingPixels(false);
  }, []);

  const fetchPxList = useCallback(async (search: string, clientId: string, page: number) => {
    setPxListLoading(true);
    const params = new URLSearchParams({ page: String(page), ...(search && { search }), ...(clientId && { client_id: clientId }) });
    const res = await fetch(`/api/admin/pixels?${params}`);
    if (res.status === 401) { adminLogout(); return; }
    const json = await res.json();
    if (json.success) { setPxList(json.data); setPxListTotal(json.total); setPxListTotalPages(json.totalPages); }
    setPxListLoading(false);
  }, []);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => {
    fetchStats(allTime ? '' : fromDate, allTime ? '' : toDate, selectedClient, overviewSlugSearch, adAccountFilter);
  }, [fromDate, toDate, allTime, selectedClient, overviewSlugSearch, adAccountFilter, fetchStats]);
  useEffect(() => { fetchPixels(); }, [fetchPixels]);
  useEffect(() => { if (tab === 'campaigns') fetchPxList(pixelSlugSearch, pixelClientFilter, pxListPage); }, [tab, pixelSlugSearch, pixelClientFilter, pxListPage, fetchPxList]);

  async function handleSavePixel(form: typeof EMPTY_FORM) {
    setSaving(true);
    const body = {
      slug: form.slug, label: form.label, pixel_id: form.pixel_id,
      access_token: form.access_token, ad_account_id: form.ad_account_id || null,
      is_default: false, client_id: form.client_id,
    };
    console.log('[handleSavePixel] body:', JSON.stringify({ ...body, access_token: '***' }));
    const url    = editPixel ? `/api/admin/pixels/${editPixel.id}` : '/api/admin/pixels';
    const method = editPixel ? 'PUT' : 'POST';
    const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json   = await res.json();
    console.log('[handleSavePixel] response:', JSON.stringify(json));
    setSaving(false);
    if (json.success) {
      setShowPixelForm(false); setEditPixel(null);
      fetchPixels();
      fetchPxList(pixelSlugSearch, pixelClientFilter, pxListPage);
      fetchStats(allTime ? '' : fromDate, allTime ? '' : toDate, selectedClient, overviewSlugSearch, adAccountFilter);
    } else { alert(json.message ?? 'Error saving pixel'); }
  }

  async function handleDeletePixel(id: number) {
    const res  = await fetch(`/api/admin/pixels/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      setDeleteConfirm(null); fetchPixels();
      fetchPxList(pixelSlugSearch, pixelClientFilter, pxListPage);
      fetchStats(allTime ? '' : fromDate, allTime ? '' : toDate, selectedClient, overviewSlugSearch, adAccountFilter);
    } else { alert(json.message ?? 'Delete failed'); }
  }

  const statCards = overview
    ? [
        { label: 'Purchases',   value: overview.total_purchases, color: '#15803D', bg: '#F0FDF4', icon: 'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z' },
        { label: 'CAPI Sent',   value: overview.capi_sent,       color: '#1D4ED8', bg: BLUE_LT,   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
        { label: 'CAPI Issues', value: overview.capi_issues,     color: '#B91C1C', bg: '#FEF2F2', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
        { label: 'Organic (No Pixel)', value: overview.organic,  color: '#5A5148', bg: '#FAF8F4', icon: 'M12 4.5c-4.5 0-8 3.5-8 7.5s3.5 7.5 8 7.5 8-3.5 8-7.5-3.5-7.5-8-7.5zm0 0v15M4 12h16' },
      ]
    : [];

  return (
    <div>
      {/* Sub-tab nav */}
      <div className="flex items-center gap-1 mb-6">
        {(['overview', 'campaigns'] as MarketingTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-[8px] text-[11px] font-bold tracking-wide transition-all"
            style={{
              background: tab === t ? BLUE_MD : '#F1EDE6',
              border: `1.5px solid ${tab === t ? BLUE : '#E6E0D6'}`,
              color: tab === t ? BLUE : '#776D62',
            }}>
            {t === 'campaigns' ? 'Meta' : 'Overview'}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <>
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <button onClick={() => setAllTime((p) => !p)}
              className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold transition-all"
              style={{
                background: allTime ? '#FEF6D8' : '#F1EDE6',
                border: `1.5px solid ${allTime ? '#D4A800' : '#E6E0D6'}`,
                color: allTime ? '#6B5000' : '#776D62',
              }}>
              All time
            </button>

            {(['from', 'to'] as const).map((side) => (
              <div key={side} className="relative flex items-center" style={{ opacity: allTime ? 0.4 : 1, transition: 'opacity .2s' }}>
                <svg className="absolute left-2.5 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A39A8E" strokeWidth={2} strokeLinecap="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                <input type="date"
                  value={side === 'from' ? fromDate : toDate}
                  max={side === 'from' ? toDate : undefined}
                  min={side === 'to' ? fromDate : undefined}
                  disabled={allTime}
                  onChange={(e) => side === 'from' ? setFromDate(e.target.value) : setToDate(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-stone-600 outline-none focus:ring-2 focus:ring-amber-200"
                  style={{ background: '#FAF8F4', border: '1.5px solid #E6E0D6', cursor: allTime ? 'not-allowed' : 'pointer' }}
                />
                {side === 'from' && <span className="mx-1.5 text-[11px] font-semibold text-stone-400">to</span>}
              </div>
            ))}

            <select value={selectedClient} onChange={(e) => { setSelectedClient(e.target.value); setAdAccountFilter(''); }}
              className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
              style={{
                background: selectedClient ? BLUE_LT : '#FAF8F4',
                border: `1.5px solid ${selectedClient ? BLUE : '#E6E0D6'}`,
                color: selectedClient ? BLUE : '#776D62',
                cursor: 'pointer',
              }}>
              <option value="">All MediaBuyers</option>
              {clients.map((c) => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>

            {/* Ad Account filter — scoped to selected media buyer */}
            {(() => {
              const filteredPixels = selectedClient
                ? pixels.filter((p) => String(p.client_id) === selectedClient)
                : pixels;
              return filteredPixels.some((p) => p.ad_account_id) ? (
                <select value={adAccountFilter} onChange={(e) => setAdAccountFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                  style={{
                    background: adAccountFilter ? '#FFF7ED' : '#FAF8F4',
                    border: `1.5px solid ${adAccountFilter ? '#F97316' : '#E6E0D6'}`,
                    color: adAccountFilter ? '#C2410C' : '#776D62',
                    cursor: 'pointer',
                  }}>
                  <option value="">All Ad Accounts</option>
                  {[...new Set(filteredPixels.map((p) => p.ad_account_id).filter((a): a is string => !!a))].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              ) : null;
            })()}

            {/* Slug search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={overviewSlugSearch}
                onChange={(e) => setOverviewSlugSearch(e.target.value)}
                placeholder="Search slug, pixel, act…"
                autoComplete="off"
                className="pl-7 pr-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                style={{
                  background: overviewSlugSearch ? BLUE_LT : '#FAF8F4',
                  border: `1.5px solid ${overviewSlugSearch ? BLUE : '#E6E0D6'}`,
                  color: '#3A322C',
                  width: 175,
                }}
              />
            </div>

            {(selectedClient || overviewSlugSearch || adAccountFilter) && (
              <button onClick={() => { setSelectedClient(''); setOverviewSlugSearch(''); setAdAccountFilter(''); }}
                className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-stone-500 hover:bg-stone-100 transition-colors"
                style={{ border: '1.5px solid #E6E0D6' }}>
                Clear
              </button>
            )}
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {loadingStats
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-[10px] px-4 py-4 animate-pulse bg-stone-100" style={{ height: 80 }} />
                ))
              : statCards.map((c) => (
                  <div key={c.label} className="rounded-[10px] px-4 py-4 flex items-center gap-3" style={{ background: c.bg, border: `1px solid ${c.color}22` }}>
                    <div className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: c.color + '18' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth={2} strokeLinecap="round"><path d={c.icon} /></svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.15em] mb-0.5" style={{ color: c.color + 'AA' }}>{c.label}</p>
                      <p className="k-display text-[30px] leading-none" style={{ color: c.color }}>{c.value}</p>
                    </div>
                  </div>
                ))}
          </div>

          <div className="flex flex-col gap-4">
            {/* Tab switcher */}
            <div className="flex gap-2">
              {([{ key: 'campaign', label: 'By Campaign' }, { key: 'meta', label: 'By Meta Campaign' }] as const).map((t) => (
                <button key={t.key} onClick={() => setBrkTab(t.key)}
                  className="px-4 py-1.5 rounded-[8px] text-[11px] font-bold transition-all"
                  style={{
                    background: brkTab === t.key ? BLUE : '#FFFFFF',
                    border: `1.5px solid ${brkTab === t.key ? BLUE : '#E6E0D6'}`,
                    color: brkTab === t.key ? '#FFFFFF' : '#776D62',
                    
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {brkTab === 'campaign' && (
              <BreakdownTable title="By Campaign" cols={['Campaign', 'MediaBuyer', 'Pixel / Ad Account', 'Purchases', 'CAPI', 'Issues']}
                loading={loadingStats} empty={byPixel.length === 0} emptyMsg="No pixels configured yet.">
                {byPixel.map((row) => (
                  <tr key={row.id} className="hover:bg-amber-50 transition-colors" style={{ borderBottom: '1px solid #FAF8F4' }}>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-bold text-stone-800 block">{row.label}</span>
                      <span className="text-[10px] text-stone-400 block mt-0.5">?c={row.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.client_name
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: BLUE_LT, color: BLUE, border: `1px solid ${BLUE_MD}` }}>{row.client_name}</span>
                        : <span className="text-[12px] text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-stone-400 font-mono block">{row.pixel_id}</span>
                      {row.ad_account_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                          {row.ad_account_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-black text-stone-800">{row.purchases}</td>
                    <td className="px-4 py-3 text-[12px] font-bold text-stone-900">{row.capi_sent}</td>
                    <td className="px-4 py-3">
                      {Number(row.capi_issues) > 0
                        ? <span className="text-[12px] font-bold text-red-500">{row.capi_issues}</span>
                        : <span className="text-[12px] text-stone-300">—</span>}
                    </td>
                  </tr>
                ))}
              </BreakdownTable>
            )}

            {brkTab === 'meta' && (
              <BreakdownTable title="By Meta Campaign" cols={['Meta Cmp Name / ID', 'Campaign', 'MediaBuyer', 'Pixel / Ad Account', 'Purchases', 'CAPI', 'Issues']}
                loading={loadingStats} empty={byMetaCampaign.length === 0} emptyMsg="No Meta campaign data yet.">
                {byMetaCampaign.map((row) => (
                  <tr key={row.meta_campaign_id} className="hover:bg-amber-50 transition-colors" style={{ borderBottom: '1px solid #FAF8F4' }}>
                    <td className="px-4 py-3">
                      <span className="text-[12px] font-bold text-stone-800 block">{row.meta_campaign_name ?? '—'}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded inline-block mt-0.5 w-fit" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>{row.meta_campaign_id}</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.campaign_slug ? (
                        <>
                          <span className="text-[12px] font-bold text-stone-800 block">{row.pixel_label ?? row.campaign_slug}</span>
                          <span className="text-[10px] text-stone-400 block mt-0.5">?c={row.campaign_slug}</span>
                        </>
                      ) : <span className="text-[12px] text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {row.client_name
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: BLUE_LT, color: BLUE, border: `1px solid ${BLUE_MD}` }}>{row.client_name}</span>
                        : <span className="text-[12px] text-stone-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] text-stone-400 font-mono block">{row.pixel_id ?? '—'}</span>
                      {row.ad_account_id && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                          {row.ad_account_id}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[13px] font-black text-stone-800">{row.purchases}</td>
                    <td className="px-4 py-3 text-[12px] font-bold text-stone-900">{row.capi_sent}</td>
                    <td className="px-4 py-3">
                      {Number(row.capi_issues) > 0
                        ? <span className="text-[12px] font-bold text-red-500">{row.capi_issues}</span>
                        : <span className="text-[12px] text-stone-300">—</span>}
                    </td>
                  </tr>
                ))}
              </BreakdownTable>
            )}
          </div>
        </>
      )}

      {/* ── PIXELS TAB ── */}
      {tab === 'campaigns' && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select
              value={pixelClientFilter}
              onChange={(e) => { setPixelClientFilter(e.target.value); setPxListPage(1); }}
              className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
              style={{
                background: pixelClientFilter ? BLUE_LT : '#FFFFFF',
                border: `1.5px solid ${pixelClientFilter ? BLUE : '#E6E0D6'}`,
                color: pixelClientFilter ? BLUE : '#A39A8E',
                cursor: clients.length === 0 ? 'not-allowed' : 'pointer',
              }}
              disabled={clients.length === 0}
            >
              <option value="">{clients.length === 0 ? 'No MediaBuyers' : 'All MediaBuyers'}</option>
              {clients.map((c) => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>

            {/* Slug search */}
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                value={pixelSlugSearch}
                onChange={(e) => { setPixelSlugSearch(e.target.value); setPxListPage(1); }}
                placeholder="Search slug, pixel, act…"
                className="pl-7 pr-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                style={{
                  background: pixelSlugSearch ? BLUE_LT : '#FFFFFF',
                  border: `1.5px solid ${pixelSlugSearch ? BLUE : '#E6E0D6'}`,
                  color: '#3A322C',
                  width: 175,
                }}
                autoComplete="off"
              />
            </div>

            {(pixelClientFilter || pixelSlugSearch) && (
              <button onClick={() => { setPixelClientFilter(''); setPixelSlugSearch(''); setPxListPage(1); }}
                className="px-2.5 py-1.5 rounded-[8px] text-[11px] font-semibold text-stone-500 hover:bg-stone-100 transition-colors"
                style={{ border: '1.5px solid #E6E0D6' }}>
                Clear
              </button>
            )}

            {!showPixelForm && !editPixel && (
              <button onClick={() => setShowPixelForm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold text-white shrink-0 transition-all hover:opacity-90 ml-auto"
                style={{ background: BLUE }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                New pixel
              </button>
            )}
          </div>

          {showPixelForm && (
            <PixelForm initial={EMPTY_FORM} onSave={handleSavePixel} onCancel={() => setShowPixelForm(false)} saving={saving} clients={clients} />
          )}
          {editPixel && (
            <PixelForm
              initial={{ slug: editPixel.slug, label: editPixel.label, pixel_id: editPixel.pixel_id,
                access_token: editPixel.access_token, ad_account_id: editPixel.ad_account_id ?? '',
                client_id: editPixel.client_id ? String(editPixel.client_id) : '' }}
              onSave={handleSavePixel} onCancel={() => setEditPixel(null)} saving={saving} clients={clients}
            />
          )}

          {pxListLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 rounded-[8px] animate-pulse bg-stone-100" />
              ))}
            </div>
          ) : pxList.length === 0 && !showPixelForm ? (
            <p className="text-[13px] text-stone-400 py-6">No pixels configured yet. Add one to start tracking.</p>
          ) : (
            <div className="space-y-2">
              {pxList.map((px) => (
                <div key={px.id} className="flex items-center gap-4 px-4 py-3.5 rounded-[8px] hover:shadow-sm transition-all"
                  style={card}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-stone-800">{px.label}</span>
                      {px.is_default && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: BLUE_MD, color: BLUE }}>DEFAULT</span>
                      )}
                      {px.client_name && (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>{px.client_name}</span>
                      )}
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#FAF8F4', color: '#776D62', border: '1px solid #E6E0D6' }}>{px.slug}</span>
                    </div>

                    {/* Full campaign link with copy */}
                    <div className="flex items-center gap-2 mt-1.5">
                      <code className="text-[11px] px-2 py-1 rounded-[6px] font-mono truncate max-w-xs sm:max-w-sm md:max-w-md select-all"
                        style={{ background: BLUE_LT, color: BLUE, border: `1px solid ${BLUE_MD}` }}>
                        {baseUrl}/?c={px.slug}&amp;meta_campaign_id={'{{campaign.id}}'}&amp;meta_campaign_name={'{{campaign.name}}'}
                      </code>
                      <button
                        onClick={() => copyLink(px.slug)}
                        title="Copy link"
                        className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] font-bold shrink-0 transition-all"
                        style={{
                          background: copiedSlug === px.slug ? '#F0FDF4' : BLUE_LT,
                          color: copiedSlug === px.slug ? '#15803D' : BLUE,
                          border: `1px solid ${copiedSlug === px.slug ? '#BBF7D0' : BLUE_MD}`,
                        }}>
                        {copiedSlug === px.slug ? (
                          <>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                            Copied!
                          </>
                        ) : (
                          <>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-stone-400 font-mono px-2 py-0.5 rounded" style={{ background: '#FAF8F4', border: '1px solid #E6E0D6' }}>
                        Pixel: {px.pixel_id}
                      </span>
                      {px.ad_account_id && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                          Act: {px.ad_account_id}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {deleteConfirm === px.id ? (
                      <>
                        <span className="text-[11px] text-stone-500">Delete?</span>
                        <button onClick={() => setDeleteConfirm(null)} className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold text-stone-500" style={{ background: '#F1EDE6', border: '1px solid #E6E0D6' }}>No</button>
                        <button onClick={() => handleDeletePixel(px.id)} className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold text-white" style={{ background: '#DC2626' }}>Yes</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => { setEditPixel(px); setShowPixelForm(false); }}
                          className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold text-stone-600 hover:bg-stone-100 transition-colors"
                          style={{ background: '#F1EDE6', border: '1px solid #E6E0D6' }}>Edit</button>
                        <button onClick={() => setDeleteConfirm(px.id)}
                          className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold transition-colors"
                          style={{ background: '#FEF2F2', color: '#B91C1C', border: '1px solid #FECACA' }}>Delete</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {pxListTotalPages > 1 && (
            <div className="mt-3 flex items-center justify-between px-1">
              <button disabled={pxListPage <= 1} onClick={() => setPxListPage(p => p - 1)}
                className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-stone-500 disabled:opacity-40 hover:bg-stone-100 transition-colors"
                style={{ border: '1.5px solid #E6E0D6' }}>← Prev</button>
              <span className="text-[11px] text-stone-400">Page {pxListPage} / {pxListTotalPages} · {pxListTotal} total</span>
              <button disabled={pxListPage >= pxListTotalPages} onClick={() => setPxListPage(p => p + 1)}
                className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-stone-500 disabled:opacity-40 hover:bg-stone-100 transition-colors"
                style={{ border: '1.5px solid #E6E0D6' }}>Next →</button>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

const ADMIN_NAV: { key: AdminTab; label: string; icon: string }[] = [
            { key: 'payments',    label: 'Payments',    icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
            { key: 'subscriptions', label: 'Subscriptions', icon: 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z' },
            { key: 'marketing',   label: 'Marketing',   icon: 'M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z' },
            { key: 'mediaBuyers', label: 'Media Buyers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
];

const ADMIN_TITLES: Record<AdminTab, [string, string]> = {
  payments:      ['Payments', 'Har payment — status, campaign aur source ke saath.'],
  subscriptions: ['Subscriptions', 'Kiske paas access hai, kab tak — aur kisi ko bhi free access do.'],
  marketing:     ['Marketing', 'Pixels, attribution aur conversion analytics.'],
  mediaBuyers:   ['Media Buyers', 'Media buyers jo pixels aur campaigns chalate hain.'],
};

/* ── Main Admin Dashboard ───────────────────────────────── */
export default function AdminDashboard() {
  const [adminTab, setAdminTab]             = useState<AdminTab>('payments');
  const [rows, setRows]                     = useState<PaymentRow[]>([]);
  const [stats, setStats]                   = useState<Stats | null>(null);
  const [page, setPage]                     = useState(1);
  const [total, setTotal]                   = useState(0);
  const [loading, setLoading]               = useState(true);
  const [logoutConfirm, setLogoutConfirm]   = useState(false);
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('success');
  const [fromDate, setFromDate]             = useState(todayStr);
  const [toDate, setToDate]                 = useState(todayStr);
  const [allTime, setAllTime]               = useState(false);
  const [mediaBuyerFilter, setMediaBuyerFilter] = useState('');
  const [slugFilter, setSlugFilter]             = useState('');
  const [mobileFilter, setMobileFilter]         = useState('');
  const [filterClients, setFilterClients]       = useState<Client[]>([]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchData = useCallback(async (
    pg: number, status: StatusFilter, from: string, to: string, isAllTime: boolean, clientId: string, slug: string, mobile: string,
  ) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pg), status,
        ...(!isAllTime && from && { from }),
        ...(!isAllTime && to   && { to   }),
        ...(clientId && { client_id: clientId }),
        ...(slug     && { slug_search: slug }),
        ...(mobile   && { mobile }),
      });
      const res = await fetch(`/api/admin/data?${params}`);
      if (res.status === 401) { adminLogout(); return; }
      const json = await res.json();
      if (json.success) { setRows(json.data); setStats(json.stats); setTotal(json.total); }
    } catch { adminLogout(); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (adminTab === 'payments') fetchData(page, statusFilter, fromDate, toDate, allTime, mediaBuyerFilter, slugFilter, mobileFilter);
  }, [page, statusFilter, fromDate, toDate, allTime, mediaBuyerFilter, slugFilter, mobileFilter, adminTab, fetchData]);

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((json) => { if (json.success) setFilterClients(json.data); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.href = '/bakchod_ad/login';
  };

  const statCards = stats ? [
    { label: 'Total Users',    value: stats.total_users,      color: BLUE,      bg: BLUE_LT,   icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
    { label: 'Total Payments', value: stats.total_payments,   color: '#5A5148',  bg: '#FAF8F4', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
    { label: 'Successful',     value: stats.total_successful, color: '#15803D',  bg: '#F0FDF4', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Pending',        value: stats.total_pending,    color: '#A16207',  bg: '#FEFCE8', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Failed',         value: stats.total_failed,     color: '#B91C1C',  bg: '#FEF2F2', icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ] : [];

  return (
    <PanelShell
      role="Admin"
      nav={ADMIN_NAV}
      active={adminTab}
      onNav={setAdminTab}
      title={ADMIN_TITLES[adminTab][0]}
      subtitle={ADMIN_TITLES[adminTab][1]}
      account={<PanelAccount name="Admin" detail="Kaama OTT" onLogout={handleLogout} confirm={logoutConfirm} onConfirmChange={setLogoutConfirm} />}
    >
        {/* ── PAYMENTS TAB ── */}
        {adminTab === 'payments' && (
          <>
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6 fu">
                {statCards.map((c) => (
                  <div key={c.label} className="rounded-[10px] px-4 py-3.5 flex items-center gap-3" style={{ background: c.bg, border: `1px solid ${c.color}22` }}>
                    <div className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0" style={{ background: c.color + '18' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c.color} strokeWidth={2} strokeLinecap="round"><path d={c.icon} /></svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[.12em] mb-0.5" style={{ color: c.color + '99' }}>{c.label}</p>
                      <p className="k-display text-[28px] leading-none" style={{ color: c.color }}>{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-[10px] overflow-hidden fu" style={{ background: '#FFFFFF', border: '1px solid #E6E0D6', animationDelay: '.06s', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 px-5 py-3.5" style={{ borderBottom: '1px solid #F1EDE6', background: '#FAF8F4' }}>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FILTER_TABS.map((tab) => {
                    const active = statusFilter === tab.key;
                    return (
                      <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1); }}
                        className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold uppercase tracking-wide transition-all"
                        style={{
                          background: active ? tab.bg : '#FFFFFF',
                          border: `1.5px solid ${active ? tab.border : '#E6E0D6'}`,
                          color: active ? tab.color : '#A39A8E',
                        }}>
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="hidden sm:block w-px h-5 self-center bg-stone-200" />

                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => { setAllTime((p) => !p); setPage(1); }}
                    className="px-3 py-1.5 rounded-[8px] text-[11px] font-bold uppercase tracking-wide transition-all"
                    style={{
                      background: allTime ? '#FEF6D8' : '#FFFFFF',
                      border: `1.5px solid ${allTime ? '#D4A800' : '#E6E0D6'}`,
                      color: allTime ? '#6B5000' : '#A39A8E',
                    }}>
                    All Time
                  </button>

                  {['from', 'to'].map((side) => (
                    <div key={side} className="relative flex items-center" style={{ opacity: allTime ? 0.35 : 1, transition: 'opacity .2s' }}>
                      <svg className="absolute left-2.5 pointer-events-none" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#A39A8E" strokeWidth={2} strokeLinecap="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      <input type="date"
                        value={side === 'from' ? fromDate : toDate}
                        max={side === 'from' ? toDate : undefined}
                        min={side === 'to' ? fromDate : undefined}
                        disabled={allTime}
                        onChange={(e) => { side === 'from' ? setFromDate(e.target.value) : setToDate(e.target.value); setPage(1); }}
                        className="pl-8 pr-3 py-1.5 rounded-[8px] text-[11px] font-semibold text-stone-600 outline-none"
                        style={{ background: '#FFFFFF', border: '1.5px solid #E6E0D6', cursor: allTime ? 'not-allowed' : 'pointer' }} />
                      {side === 'from' && <span className="mx-1 text-[11px] font-semibold text-stone-400">to</span>}
                    </div>
                  ))}
                </div>

                <>
                  <div className="hidden sm:block w-px h-5 self-center bg-stone-200" />
                  <select
                    value={mediaBuyerFilter}
                    onChange={(e) => { setMediaBuyerFilter(e.target.value); setPage(1); }}
                    className="px-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                    style={{
                      background: mediaBuyerFilter ? BLUE_LT : '#FFFFFF',
                      border: `1.5px solid ${mediaBuyerFilter ? BLUE : '#E6E0D6'}`,
                      color: mediaBuyerFilter ? BLUE : '#A39A8E',
                      cursor: filterClients.length === 0 ? 'not-allowed' : 'pointer',
                    }}
                    disabled={filterClients.length === 0}
                  >
                    <option value="">{filterClients.length === 0 ? 'No MediaBuyers' : 'All MediaBuyers'}</option>
                    <option value="organic">Organic (No Pixel)</option>
                    {filterClients.map((c) => (
                      <option key={c.id} value={String(c.id)}>{c.name}</option>
                    ))}
                  </select>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A39A8E" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                      value={slugFilter}
                      onChange={(e) => { setSlugFilter(e.target.value); setPage(1); }}
                      placeholder="Search slug…"
                      autoComplete="off"
                      className="pl-7 pr-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                      style={{
                        background: slugFilter ? BLUE_LT : '#FFFFFF',
                        border: `1.5px solid ${slugFilter ? BLUE : '#E6E0D6'}`,
                        color: '#3A322C',
                        width: 130,
                      }}
                    />
                  </div>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#A39A8E" strokeWidth={2.5} strokeLinecap="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    <input
                      value={mobileFilter}
                      onChange={(e) => { setMobileFilter(e.target.value.replace(/\D/g, '').slice(0, 10)); setPage(1); }}
                      placeholder="Search mobile…"
                      inputMode="numeric"
                      autoComplete="off"
                      className="pl-7 pr-3 py-1.5 rounded-[8px] text-[11px] font-semibold outline-none focus:ring-2 focus:ring-amber-200"
                      style={{
                        background: mobileFilter ? BLUE_LT : '#FFFFFF',
                        border: `1.5px solid ${mobileFilter ? BLUE : '#E6E0D6'}`,
                        color: '#3A322C',
                        width: 140,
                      }}
                    />
                  </div>
                </>

                <span className="ml-auto text-[11px] text-stone-400 hidden sm:block">
                  {total} results · Page {page}/{totalPages || 1}
                </span>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[900px]">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #F1EDE6', background: '#FAF8F4' }}>
                      {['SN', 'User ID', 'Mobile', 'Amount', 'Status', 'MediaBuyer', 'Campaign', 'Meta Cmp Name / ID', 'Date & Time'].map((h) => (
                        <th key={h} className="px-5 py-3 text-[9px] font-bold uppercase tracking-[.16em] text-stone-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #FAF8F4' }}>
                          {[30, 60, 110, 55, 70, 90, 160, 140, 130].map((w, j) => (
                            <td key={j} className="px-5 py-3.5">
                              <div className="h-4 rounded-lg animate-pulse bg-stone-100" style={{ width: w }} />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : rows.length === 0 ? (
                      <tr><td colSpan={9} className="px-5 py-10 text-center text-[13px] text-stone-400">No payments found</td></tr>
                    ) : (
                      rows.map((row, i) => (
                        <tr key={`${row.user_id}-${row.txn_id}-${i}`} style={{ borderBottom: '1px solid #FAF8F4', transition: 'background .12s' }}>
                          <td className="px-5 py-3.5"><span className="text-[12px] font-semibold text-stone-300">{(page - 1) * PAGE_SIZE + i + 1}</span></td>
                          <td className="px-5 py-3.5"><span className="text-[12px] font-bold text-stone-400">#{row.user_id}</span></td>
                          <td className="px-5 py-3.5"><span className="text-[13px] font-semibold text-stone-800">+91 {row.user_number}</span></td>
                          <td className="px-5 py-3.5"><span className="text-[13px] font-black" style={{ color: STATUS_CFG[row.payment_status]?.color ?? '#5A5148' }}>₹{Number(row.user_payment).toLocaleString('en-IN')}</span></td>
                          <td className="px-5 py-3.5"><StatusBadge status={row.payment_status} /></td>
                          <td className="px-5 py-3.5">
                            {row.media_buyer_name ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: BLUE_LT, color: BLUE, border: `1px solid ${BLUE_MD}` }}>
                                {row.media_buyer_name}
                              </span>
                            ) : (
                              <span className="text-[12px] text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 max-w-[180px]">
                            {row.campaign_slug ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-[11px] font-mono font-semibold text-stone-700">{row.campaign_slug}</span>
                                {row.pixel_id && (
                                  <span className="text-[9px] font-mono text-stone-400">Pixel: {row.pixel_id}</span>
                                )}
                                {row.ad_account_id && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded inline-block w-fit" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                                    {row.ad_account_id}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[12px] text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 max-w-[180px]">
                            {row.meta_campaign_id ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded inline-block w-fit" style={{ background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>
                                  {row.meta_campaign_id}
                                </span>
                                {row.meta_campaign_name && (
                                  <span className="text-[10px] font-semibold text-stone-600">{row.meta_campaign_name}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[12px] text-stone-300">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5"><span className="text-[11px] text-stone-400">{formatDate(row.date_time)}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3.5" style={{ borderTop: '1px solid #F1EDE6', background: '#FAF8F4' }}>
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold transition-all disabled:opacity-30"
                    style={{ background: '#FFFFFF', border: '1.5px solid #E6E0D6', color: '#776D62' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
                    Prev
                  </button>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let pg: number;
                      if (totalPages <= 7)             pg = i + 1;
                      else if (page <= 4)              pg = i + 1;
                      else if (page >= totalPages - 3) pg = totalPages - 6 + i;
                      else                             pg = page - 3 + i;
                      return (
                        <button key={pg} onClick={() => setPage(pg)}
                          className="w-8 h-8 rounded-[8px] text-[12px] font-bold transition-all"
                          style={{
                            background: pg === page ? BLUE : '#FFFFFF',
                            border: pg === page ? 'none' : '1.5px solid #E6E0D6',
                            color: pg === page ? 'white' : '#776D62',
                            
                          }}>
                          {pg}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[12px] font-bold transition-all disabled:opacity-30"
                    style={{ background: '#FFFFFF', border: '1.5px solid #E6E0D6', color: '#776D62' }}>
                    Next
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── SUBSCRIPTIONS TAB ── */}
        {adminTab === 'subscriptions' && (
          <SubscriptionsPanel />
        )}

        {/* ── MARKETING TAB ── */}
        {adminTab === 'marketing' && (
          <div className="fu">
            <MarketingPanel />
          </div>
        )}

        {/* ── MEDIABUYER TAB ── */}
        {adminTab === 'mediaBuyers' && (
          <MediaBuyersPanel />
        )}
    </PanelShell>
  );
}

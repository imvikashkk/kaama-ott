'use client';

import { useState } from 'react';
import { EyeToggle, PanelLoginButton, PanelLoginFrame, panelInputCls, panelInputStyle } from '@/components/PanelShell';

export default function AdminAuthPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (data.success) {
        window.location.href = '/bakchod_ad';
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelLoginFrame role="Admin" title="Admin login" subtitle="Kaama OTT — sirf authorised logon ke liye">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[.16em] text-white/45 mb-1.5">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            autoComplete="username"
            required
            autoFocus
            className={panelInputCls}
            style={panelInputStyle}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[.16em] text-white/45 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              required
              className={panelInputCls + ' pr-10'}
              style={panelInputStyle}
            />
            <EyeToggle shown={showPass} onToggle={() => setShowPass(!showPass)} />
          </div>
        </div>

        {error && (
          <p className="m-0 rounded-md px-3 py-2 text-[12px] font-semibold" style={{ background: 'rgba(239,35,60,.12)', border: '1px solid rgba(239,35,60,.35)', color: '#ff8a98' }}>
            {error}
          </p>
        )}

        <PanelLoginButton loading={loading} label="Login →" loadingLabel="Logging in..." />
      </form>
    </PanelLoginFrame>
  );
}

'use client';

import { useState } from 'react';
import { EyeToggle, PanelLoginButton, PanelLoginFrame, panelInputCls, panelInputStyle } from '@/components/PanelShell';

export default function MBLoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch('/api/mediabuyer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/bakchod_mb';
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch {
      setError('Network error. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PanelLoginFrame role="Media Buyer" title="Partner login" subtitle="Kaama OTT · Campaign dashboard">
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[.16em] text-white/45 mb-1.5">Email</label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            autoFocus
            required
            className={panelInputCls}
            style={panelInputStyle}
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-[.16em] text-white/45 mb-1.5">Password</label>
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className={panelInputCls + ' pr-10'}
              style={panelInputStyle}
            />
            <EyeToggle shown={showPass} onToggle={() => setShowPass((v) => !v)} />
          </div>
        </div>

        {error && (
          <p className="m-0 rounded-md px-3 py-2 text-[12px] font-semibold" style={{ background: 'rgba(239,35,60,.12)', border: '1px solid rgba(239,35,60,.35)', color: '#ff8a98' }}>
            {error}
          </p>
        )}

        <PanelLoginButton loading={loading} disabled={!email || !password} label="Sign in →" loadingLabel="Signing in…" />
      </form>
    </PanelLoginFrame>
  );
}

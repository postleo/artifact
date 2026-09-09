import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { login } from '../services/auth';

interface LoginScreenProps {
  onAuthed: () => void;
}

/**
 * Password gate for the studio. Posts the password to the backend, which verifies
 * it and returns a short-lived JWT (stored by the auth service). No secret is ever
 * held in the frontend bundle.
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthed }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await login(password);
      onAuthed();
    } catch (err: any) {
      setError(err?.message || 'Login failed');
      setPassword('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F4EC] dark:bg-[#0D1514] flex items-center justify-center p-4 font-sans text-[#12201F] dark:text-[#EDF5F3]">
      <form
        onSubmit={submit}
        className="w-full max-w-sm bg-white dark:bg-[#12201F] border border-[#E2DCCF] dark:border-[#22302E] rounded-2xl shadow-xl p-8"
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-[#12201F] dark:bg-[#EDF5F3] flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-[#F7F4EC] dark:text-[#0D1514]" />
          </div>
          <h1 className="text-xl font-semibold">Artifact Studio</h1>
          <p className="font-mono-tag text-xs tracking-wider uppercase text-[#48605E] dark:text-[#8BA4A1] mt-1">
            Restricted — enter access password
          </p>
        </div>

        <label className="block text-sm font-medium mb-2" htmlFor="access-password">
          Access password
        </label>
        <input
          id="access-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-[#D8D1C2] dark:border-[#2A3937] bg-[#F7F4EC] dark:bg-[#0D1514] px-3 py-2 outline-none focus:ring-2 focus:ring-[#12201F] dark:focus:ring-[#EDF5F3]"
          placeholder="••••••••"
        />

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 mt-3" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !password}
          className="mt-6 w-full rounded-lg bg-[#12201F] dark:bg-[#EDF5F3] text-[#F7F4EC] dark:text-[#0D1514] py-2.5 font-medium disabled:opacity-50 transition-opacity"
        >
          {busy ? 'Signing in…' : 'Enter Studio'}
        </button>
      </form>
    </div>
  );
};

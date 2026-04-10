import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function CandidateVerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = new URLSearchParams(location.search).get('email') || '';

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (code.trim().length !== 6) return;
    setBusy(true);
    setError('');
    try {
      const payload = await applicationService.verifyEmail({ email, code: code.trim() });
      const data = payload?.data || {};
      applicationService.setCandidateSession(data);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Code invalide.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto pb-10">
      <div className="mb-3">
        <div className="text-sm text-gray-500">Espace candidat</div>
        <div className="text-3xl sm:text-2xl font-extrabold text-gray-900">Vérification email</div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-5 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h1 className="text-2xl font-extrabold">Confirmez votre email</h1>
          <p className="mt-2 text-white/90 text-sm">Un code à 6 chiffres a été envoyé à <strong>{email}</strong>. Il expire dans 15 minutes.</p>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Code de vérification</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-2xl tracking-widest text-center"
              placeholder="000000"
              maxLength={6}
            />
          </div>

          <button
            type="button"
            disabled={busy || code.trim().length !== 6}
            onClick={submit}
            className="w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60"
          >
            {busy ? 'Vérification…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}

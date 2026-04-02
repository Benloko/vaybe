import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function CandidateLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const created = params.get('created') === '1';
  const prefillIdentifier = params.get('identifier') || '';
  const reason = params.get('reason') || '';
  const next = params.get('next') || '';

  const [identifier, setIdentifier] = useState(prefillIdentifier);
  const [password, setPassword] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => {
    return identifier.trim() !== '' && password.trim() !== '';
  }, [identifier, password]);

  const submit = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setError('');

    try {
      const payload = await applicationService.loginCandidate({
        identifier: identifier.trim(),
        password,
      });

      const data = payload?.data || {};
      applicationService.setCandidateSession(data);

      // Évite un flash d'ancien profil (lastApplicationId) quand l'utilisateur clique sur "Candidature".
      try {
        localStorage.removeItem('lastApplicationId');
        localStorage.removeItem('lastApplicationStatus');
        window.dispatchEvent(new Event('lastApplicationIdChanged'));
      } catch {
        // ignore
      }

      if (next && next.startsWith('/')) {
        navigate(next);
      } else {
        navigate('/candidature');
      }
    } catch (err) {
      setError(err?.message || 'Impossible de se connecter.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm sm:text-sm text-gray-500">Espace candidat</div>
          <div className="text-2xl sm:text-xl font-extrabold text-gray-900">Connexion</div>
        </div>
        <Link
          to="/"
          className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl border bg-white hover:bg-gray-50 text-base sm:text-sm font-semibold whitespace-nowrap"
        >
          Retour
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-sm sm:text-sm text-white/90">Accéder à votre compte</div>
          <h1 className="text-2xl sm:text-2xl font-extrabold">Candidat</h1>
          <p className="mt-1 text-sm sm:text-base text-white/90">Email ou téléphone + mot de passe.</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {reason === 'apply' && !error && (
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-sm">
              Connectez-vous pour postuler à cette offre.
            </div>
          )}
          {created && !error && (
            <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm">
              Compte créé. Connectez-vous pour continuer.
            </div>
          )}
          {error && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm sm:text-sm font-semibold text-gray-700 mb-1">Email ou téléphone</label>
            <input
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-4 py-3 sm:px-4 sm:py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-base sm:text-sm"
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label className="block text-sm sm:text-sm font-semibold text-gray-700 mb-1">Mot de passe</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              className="w-full px-4 py-3 sm:px-4 sm:py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-base sm:text-sm"
              placeholder="Votre mot de passe"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Link
              to={`/inscription${next || reason ? `?${new URLSearchParams({ ...(next ? { next } : {}), ...(reason ? { reason } : {}) }).toString()}` : ''}`}
              className="text-base sm:text-sm font-semibold text-blue-700 hover:underline"
            >
              Pas de compte ? Inscription
            </Link>
            <button
              type="button"
              disabled={busy || !canSubmit}
              onClick={submit}
              className="w-full sm:w-auto px-4 py-3 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
            >
              Se connecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

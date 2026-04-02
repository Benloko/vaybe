import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const next = params.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Si déjà connecté, on redirige.
    try {
      const token = localStorage.getItem('adminToken');
      if (token) navigate(next, { replace: true });
    } catch {
      // ignore
    }
  }, [navigate, next]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = await applicationService.loginAdmin({ email, password });
      applicationService.setAdminSession({ token: payload?.data?.token, email: payload?.data?.email });
      navigate(next, { replace: true });
    } catch (err) {
      setError(err?.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="w-full flex items-start justify-center pt-6 sm:pt-12 pb-10">
        <div className="w-full max-w-md">
          <div className="rounded-3xl border bg-white shadow-sm overflow-hidden ring-1 ring-black/5">
            <div className="px-5 py-5 sm:px-6 sm:py-6 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <div className="text-xs font-semibold text-white/90">Espace admin</div>
              <div className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">Connexion</div>
              <div className="mt-2 text-sm text-white/90 leading-snug">
                Accès réservé à l'administration. Connectez-vous pour gérer candidatures, offres et notifications.
              </div>
            </div>

            <form className="p-4 sm:p-6 space-y-4" onSubmit={submit}>
              {error && (
                <div className="p-3 rounded-2xl border border-red-200 bg-red-50 text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-700">Email</div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="admin@exemple.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">Mot de passe</div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold disabled:opacity-60"
                >
                  {loading ? 'Connexion…' : 'Se connecter'}
                </button>
              </div>

              <div className="text-[12px] text-gray-500 leading-relaxed">
                Astuce: si la session expire, vous serez automatiquement redirigé ici.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

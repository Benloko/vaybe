import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function CandidateCandidatureSpace() {
  const navigate = useNavigate();

  const [candidateAccountId, setCandidateAccountId] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountId');
    } catch {
      return null;
    }
  });

  const [candidateEmail, setCandidateEmail] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountEmail') || '';
    } catch {
      return '';
    }
  });

  const [lastApplicationId, setLastApplicationId] = useState(() => {
    try {
      return localStorage.getItem('lastApplicationId');
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    const refresh = () => {
      try {
        setCandidateAccountId(localStorage.getItem('candidateAccountId'));
        setCandidateEmail(localStorage.getItem('candidateAccountEmail') || '');
        setLastApplicationId(localStorage.getItem('lastApplicationId'));
      } catch {
        setCandidateAccountId(null);
        setCandidateEmail('');
        setLastApplicationId(null);
      }
    };

    window.addEventListener('candidateSessionChanged', refresh);
    window.addEventListener('lastApplicationIdChanged', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('candidateSessionChanged', refresh);
      window.removeEventListener('lastApplicationIdChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!candidateAccountId) {
      navigate('/connexion');
      return;
    }

    // Si on a déjà un lastApplicationId, on vérifie simplement qu'il appartient bien au compte connecté.
    // Sinon, on nettoie le contexte pour éviter d'afficher des candidatures d'un autre compte.
    let alive = true;

    // Vérifie que lastApplicationId appartient bien au compte connecté (en arrière-plan)
    if (lastApplicationId) {
      const expectedEmail = String(candidateEmail || '').trim().toLowerCase();
      if (expectedEmail) {
        (async () => {
          try {
            const payload = await applicationService.getApplication(lastApplicationId);
            if (!alive) return;
            const appEmail = String(payload?.data?.email || '').trim().toLowerCase();
            if (appEmail && appEmail !== expectedEmail) {
              try {
                localStorage.removeItem('lastApplicationId');
                localStorage.removeItem('lastApplicationStatus');
                window.dispatchEvent(new Event('lastApplicationIdChanged'));
              } catch { /* ignore */ }
            }
          } catch {
            try {
              localStorage.removeItem('lastApplicationId');
              localStorage.removeItem('lastApplicationStatus');
              window.dispatchEvent(new Event('lastApplicationIdChanged'));
            } catch { /* ignore */ }
          }
        })();
      }
 }

    async function load() {
      setLoading(true);
      setError('');
      try {
        if (!candidateEmail) {
          setApplications([]);
          return;
        }
        const payload = await applicationService.getCandidateApplicationsByEmail(candidateEmail);
        if (!alive) return;
        const list = payload?.data || [];
        const next = Array.isArray(list) ? list : [];
        setApplications(next);

        // Si on a un lastApplicationId, on met à jour son statut si besoin.
        if (lastApplicationId) {
          const match = next.find((a) => String(a?.id || '') === String(lastApplicationId));
          const status = String(match?.status || '').trim();
          if (status) {
            try {
              const prev = localStorage.getItem('lastApplicationStatus');
              if (String(prev || '') !== status) {
                localStorage.setItem('lastApplicationStatus', status);
                window.dispatchEvent(new Event('lastApplicationIdChanged'));
              }
            } catch {
              // ignore
            }
          }
        }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Impossible de charger vos candidatures.');
        setApplications([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [candidateAccountId, candidateEmail, lastApplicationId, navigate]);

  const myApplications = useMemo(() => {
    const email = String(candidateEmail || '').trim().toLowerCase();
    if (!email) return [];
    return applications.filter((a) => String(a?.email || '').trim().toLowerCase() === email);
  }, [applications, candidateEmail]);

  const sortedMyApplications = useMemo(() => {
    return (Array.isArray(myApplications) ? myApplications : [])
      .slice()
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
  }, [myApplications]);

  useEffect(() => {
    // Si on retrouve des candidatures, on garde la plus récente comme contexte (badge messages/notifications),
    // mais on n'ouvre plus automatiquement le profil.
    if (lastApplicationId) return;
    if (loading || error) return;
    if (!sortedMyApplications || sortedMyApplications.length === 0) return;
    const latest = sortedMyApplications[0];
    if (!latest?.id) return;

    try {
      localStorage.setItem('lastApplicationId', String(latest.id));
      if (latest?.status) localStorage.setItem('lastApplicationStatus', String(latest.status));
      window.dispatchEvent(new Event('lastApplicationIdChanged'));
    } catch {
      // ignore
    }
  }, [error, lastApplicationId, loading, sortedMyApplications]);

  const logout = () => {
    applicationService.clearCandidateLogoutContext();
    navigate('/');
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-base sm:text-sm text-gray-500">Espace candidat</div>
          <div className="text-xl sm:text-xl font-extrabold text-gray-900">Candidature</div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/" className="px-4 py-3 sm:py-2 rounded-2xl border bg-white hover:bg-gray-50 text-base sm:text-sm font-semibold">
            Opportunités
          </Link>
          <button
            type="button"
            onClick={logout}
            className="px-4 py-3 sm:py-2 rounded-2xl border bg-white hover:bg-gray-50 text-base sm:text-sm font-semibold"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5 sm:p-6 border-b">
          <div className="text-base sm:text-sm text-gray-500">Mes candidatures</div>
          <div className="text-lg sm:text-lg font-extrabold text-gray-900">Suivi</div>
        </div>

        <div className="p-5 sm:p-6">
          {loading && <div className="text-sm sm:text-sm text-gray-600">Chargement…</div>}
          {error && <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm sm:text-sm">{error}</div>}

          {!loading && !error && myApplications.length === 0 && (
            <div className="p-6 rounded-2xl border bg-gray-50">
              <div className="text-sm sm:text-sm text-gray-600">Aucune candidature pour le moment.</div>
              <div className="mt-2 text-sm sm:text-sm text-gray-600">Choisissez une opportunité pour postuler.</div>
              <div className="mt-4">
                <Link
                  to="/"
                  className="inline-flex px-5 py-3 sm:px-4 sm:py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-sm font-semibold"
                >
                  Voir les opportunités
                </Link>
              </div>
            </div>
          )}

          {!loading && !error && myApplications.length > 0 && (
            <div className="space-y-3">
              {sortedMyApplications.map((a) => {
                const currentLastId = (() => { try { return localStorage.getItem('lastApplicationId'); } catch { return null; } })();
                const isActive = String(a?.id || '') === String(currentLastId || '');
                console.log('id:', a?.id, 'currentLastId:', currentLastId, 'isActive:', isActive);
                return (
                  <Link
                    key={String(a?.id || '')}
                    to={`/profil/${encodeURIComponent(String(a?.id || ''))}`}
                    className={`block rounded-2xl border p-4 ${
                      isActive
                        ? 'border-red-400 bg-red-50 hover:bg-red-100'
                        : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className={`text-sm font-extrabold truncate ${isActive ? 'text-red-700' : 'text-gray-900'}`}>
                          {a?.offer_title || a?.offre || 'Candidature'}
                        </div>
                        <div className="mt-1 text-sm text-gray-600 truncate">{a?.offer_type_label || a?.role_label || a?.role || ''}</div>
                      </div>
                      <div className={`shrink-0 text-sm font-semibold ${isActive ? 'text-red-600' : 'text-blue-700'}`}>
                        {isActive ? 'Déjà connecté' : 'Voir →'}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

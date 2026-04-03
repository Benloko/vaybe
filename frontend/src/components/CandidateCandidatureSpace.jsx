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

    // Si on a déjà un lastApplicationId, on ne l'ouvre que s'il appartient bien au compte connecté.
    // Sinon, on nettoie le contexte pour éviter d'afficher des candidatures d'un autre compte.
    if (lastApplicationId) {
      const expectedEmail = String(candidateEmail || '').trim().toLowerCase();
      if (!expectedEmail) {
        try {
          localStorage.removeItem('lastApplicationId');
          localStorage.removeItem('lastApplicationStatus');
          window.dispatchEvent(new Event('lastApplicationIdChanged'));
        } catch {
          // ignore
        }
      } else {
        let alive = true;

        (async () => {
          try {
            const payload = await applicationService.getApplication(lastApplicationId);
            if (!alive) return;
            const appEmail = String(payload?.data?.email || '').trim().toLowerCase();
            if (appEmail && appEmail === expectedEmail) {
              navigate(`/profil/${lastApplicationId}`);
              return;
            }

            try {
              localStorage.removeItem('lastApplicationId');
              localStorage.removeItem('lastApplicationStatus');
              window.dispatchEvent(new Event('lastApplicationIdChanged'));
            } catch {
              // ignore
            }
          } catch {
            try {
              localStorage.removeItem('lastApplicationId');
              localStorage.removeItem('lastApplicationStatus');
              window.dispatchEvent(new Event('lastApplicationIdChanged'));
            } catch {
              // ignore
            }
          }
        })();

        return () => {
          alive = false;
        };
      }
    }

    let alive = true;

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
        setApplications(Array.isArray(list) ? list : []);
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

  useEffect(() => {
    // Si on retrouve des candidatures, on ouvre la plus récente automatiquement.
    if (lastApplicationId) return;
    if (loading || error) return;
    if (!myApplications || myApplications.length === 0) return;

    const sorted = myApplications
      .slice()
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));
    const latest = sorted[0];
    if (!latest?.id) return;

    try {
      localStorage.setItem('lastApplicationId', String(latest.id));
      if (latest?.status) localStorage.setItem('lastApplicationStatus', String(latest.status));
      window.dispatchEvent(new Event('lastApplicationIdChanged'));
    } catch {
      // ignore
    }

    navigate(`/profil/${latest.id}`);
  }, [error, lastApplicationId, loading, myApplications, navigate]);

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
            <div className="p-6 rounded-2xl border bg-gray-50">
              <div className="text-sm sm:text-sm text-gray-600">Ouverture de votre candidature…</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

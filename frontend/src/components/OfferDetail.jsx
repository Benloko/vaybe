import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function OfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const payload = await applicationService.getOffer(id);
        if (!alive) return;
        setOffer(payload?.data || null);
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Impossible de charger l'offre.");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [id]);

  const isOpen = Boolean(offer?.is_open);

  const typeLabel = useMemo(() => {
    if (!offer) return '';
    if (offer.type === 'designer') return 'Designer';
    if (offer.type === 'dev') return 'Développeur';
    return String(offer.type || '').trim();
  }, [offer]);

  const onApply = () => {
    const offerId = offer?.id ? String(offer.id) : '';
    const next = offerId ? `/postuler?offer=${encodeURIComponent(offerId)}` : '/postuler';

    let candidateAccountId = null;
    try {
      candidateAccountId = localStorage.getItem('candidateAccountId');
    } catch {
      candidateAccountId = null;
    }

    if (!candidateAccountId) {
      navigate(`/connexion?reason=apply&next=${encodeURIComponent(next)}`);
      return;
    }

    navigate(next);
  };

  return (
    <div className="w-full sm:max-w-3xl sm:mx-auto pb-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Carrières</div>
          <div className="text-3xl sm:text-2xl font-extrabold text-gray-900">Détails de l'offre</div>
        </div>
        <Link
          to="/"
          className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl border bg-white hover:bg-gray-50 text-base sm:text-sm font-semibold whitespace-nowrap"
        >
          Retour
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-5 py-6 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-base sm:text-sm text-white/90">Opportunité</div>
          <h1 className="text-3xl sm:text-3xl font-extrabold leading-tight">
            {offer?.title || (loading ? 'Chargement…' : '—')}
          </h1>
          {typeLabel && <p className="mt-2 text-base sm:text-base text-white/90">{typeLabel}</p>}
        </div>

        <div className="p-5 sm:p-6">
          {loading ? (
            <div className="p-4 rounded-xl border bg-gray-50 text-gray-700 text-base">Chargement…</div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <div className="font-bold">Oups…</div>
              <div className="text-base sm:text-sm mt-1">{error}</div>
            </div>
          ) : !offer ? (
            <div className="p-4 rounded-xl border bg-gray-50 text-gray-700 text-base">Offre introuvable.</div>
          ) : (
            <div className="space-y-5">
              <div
                className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-base sm:text-sm font-semibold ring-1 ${
                  isOpen ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : 'bg-gray-50 text-gray-800 ring-gray-200'
                }`}
              >
                {isOpen ? 'Ouverte' : 'Fermée'}
              </div>

              {offer.description ? (
                <div className="rounded-2xl border p-4 sm:p-5 bg-white">
                  <div className="text-base sm:text-sm font-extrabold text-gray-900">Description</div>
                  <div className="mt-2 text-base text-gray-700 whitespace-pre-wrap">{offer.description}</div>
                </div>
              ) : (
                <div className="rounded-2xl border p-4 sm:p-5 bg-gray-50 text-gray-700 text-base">Aucun détail renseigné.</div>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
                {isOpen ? (
                  <button
                    type="button"
                    onClick={onApply}
                    className="w-full sm:w-auto px-5 py-3.5 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-lg sm:text-sm font-extrabold"
                  >
                    Postuler
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="w-full sm:w-auto px-5 py-3.5 sm:px-5 sm:py-2.5 rounded-xl bg-gray-200 text-gray-500 text-lg sm:text-sm font-extrabold cursor-not-allowed"
                  >
                    Offre fermée
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function Opportunities() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const payload = await applicationService.getOffers();
        if (!alive) return;
        setOffers(payload?.data || []);
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Impossible de charger les opportunités.');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, []);

  const openedOffers = useMemo(() => {
    return (offers || []).filter((o) => o?.is_open);
  }, [offers]);

  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-sm sm:text-sm text-white/90">Carrières</div>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Opportunités</h1>
          <p className="mt-1 text-sm sm:text-base text-white/90">Découvrez les opportunités et postulez en quelques minutes.</p>
        </div>

        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {loading ? (
            <div className="p-4 rounded-xl border bg-gray-50 text-gray-700">Chargement…</div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <div className="font-bold">Oups…</div>
              <div className="text-base sm:text-sm mt-1">{error}</div>
            </div>
          ) : openedOffers.length === 0 ? (
            <div className="rounded-2xl border bg-gray-50 p-4 sm:p-5 text-gray-700">Aucune opportunité ouverte pour le moment.</div>
          ) : (
            <div className="space-y-3">
              {openedOffers.map((offer) => (
                <Link
                  key={offer.id}
                  to={`/opportunites/${encodeURIComponent(String(offer.id))}`}
                  className="group relative block overflow-hidden rounded-2xl border bg-white p-4 sm:p-6 shadow-sm transition hover:shadow-md hover:border-gray-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />

                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                          Ouverte
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                          {offer.type_label || (offer.type === 'designer' ? 'Designer' : offer.type === 'dev' ? 'Développeur' : offer.type ? String(offer.type).charAt(0).toUpperCase() + String(offer.type).slice(1) : 'Autre')}
                        </span>
                      </div>

                      <div className="mt-2 text-base sm:text-lg font-extrabold text-gray-900 leading-snug break-words">
                        {offer.title}
                      </div>

                      {offer.description && (
                        <div className="mt-2 text-base sm:text-sm text-gray-700 line-clamp-2 whitespace-pre-wrap">
                          {offer.description}
                        </div>
                      )}

                      <div className="mt-3 inline-flex items-center text-base sm:text-sm font-semibold text-blue-700 transition group-hover:text-blue-800">
                        Voir les détails <span aria-hidden="true" className="ml-1">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="rounded-2xl border bg-gray-50 p-4 sm:p-5 text-gray-700">
            L’entreprise pourra ajouter d’autres opportunités ici.
          </div>
        </div>
      </div>
    </div>
  );
}

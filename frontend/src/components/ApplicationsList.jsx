import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { applicationService } from '../services/api';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getOfferTitle = (app) => app?.offer?.title || app?.offer_title || '—';

const getRoleLabel = (role) => (role === 'designer' ? 'Designer' : 'Dev');

const getRoleBadge = (role) =>
  role === 'designer'
    ? 'bg-indigo-50 text-indigo-800 ring-indigo-200'
    : 'bg-blue-50 text-blue-800 ring-blue-200';

const getStatusLabel = (status) => {
  const value = String(status || 'pending');
  if (value === 'approved') return 'Approuvée';
  if (value === 'rejected') return 'Rejetée';
  return 'En attente';
};

const getStatusBadge = (status) => {
  const value = String(status || 'pending');
  if (value === 'approved') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (value === 'rejected') return 'bg-rose-50 text-rose-800 ring-rose-200';
  return 'bg-gray-50 text-gray-800 ring-gray-200';
};

const getScoreBadge = (score) => {
  const value = Number(score || 0);
  if (value >= 4) return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (value >= 2) return 'bg-amber-50 text-amber-800 ring-amber-200';
  return 'bg-rose-50 text-rose-800 ring-rose-200';
};

export default function ApplicationsList() {
  const [applications, setApplications] = useState([]);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all'); // all | dev | designer
  const [filterOffer, setFilterOffer] = useState('all'); // all | offerId
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | approved | rejected

  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null); // 'role' | 'status' | 'offer' | null
  const [mobileFiltersPos, setMobileFiltersPos] = useState(null);
  const mobileFilterButtonRef = useRef(null);
  const mobileFiltersPopoverRef = useRef(null);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const result = await applicationService.getApplications();
      setApplications(result.data || []);
      setError('');
    } catch (err) {
      setError(err?.message || 'Erreur au chargement des candidatures');
    } finally {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    try {
      const result = await applicationService.getOffers();
      setOffers(result.data || []);
    } catch {
      setOffers([]);
    }
  };

  useEffect(() => {
    loadApplications();
    loadOffers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredApps = useMemo(() => {
    let result = [...applications];

    const q = String(searchQuery || '').trim().toLowerCase();
    if (q) {
      result = result.filter((app) => {
        const offerTitle = String(getOfferTitle(app)).toLowerCase();
        const roleLabel = getRoleLabel(app?.role).toLowerCase();
        const statusLabel = getStatusLabel(app?.status).toLowerCase();
        const haystack = [
          app?.nom,
          app?.email,
          app?.telephone,
          app?.ville,
          offerTitle,
          roleLabel,
          statusLabel,
        ]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())
          .join(' ');
        return haystack.includes(q);
      });
    }

    if (filterOffer !== 'all') {
      result = result.filter((app) => String(app?.offer_id || app?.offer?.id || '') === String(filterOffer));
    }

    if (filterRole !== 'all') {
      result = result.filter((app) => String(app?.role || '') === String(filterRole));
    }

    if (filterStatus !== 'all') {
      result = result.filter((app) => String(app?.status || 'pending') === String(filterStatus));
    }

    return result;
  }, [applications, filterOffer, filterRole, filterStatus, searchQuery]);

  const handleRefresh = async () => {
    setSearchQuery('');
    setFilterRole('all');
    setFilterStatus('all');
    setFilterOffer('all');
    setMobileFiltersOpen(false);
    setMobileDropdownOpen(null);
    await Promise.all([loadApplications(), loadOffers()]);
  };

  const openMobileFilters = () => {
    const btn = mobileFilterButtonRef.current;
    if (!btn) {
      setMobileFiltersPos({ left: 12, top: 80, width: Math.min(320, window.innerWidth - 24) });
      setMobileFiltersOpen(true);
      return;
    }

    const rect = btn.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.left, window.innerWidth - width - 12));
    const top = Math.min(rect.bottom + 10, window.innerHeight - 12);
    setMobileFiltersPos({ left, top, width });
    setMobileFiltersOpen(true);
  };

  useEffect(() => {
    if (!mobileFiltersOpen) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const btn = mobileFilterButtonRef.current;
      const pop = mobileFiltersPopoverRef.current;
      if (btn && btn.contains(target)) return;
      if (pop && pop.contains(target)) return;

      setMobileFiltersOpen(false);
      setMobileDropdownOpen(null);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setMobileFiltersOpen(false);
      setMobileDropdownOpen(null);
    };

    const onAnyScrollOrResize = () => {
      setMobileFiltersOpen(false);
      setMobileDropdownOpen(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onAnyScrollOrResize, true);
    window.addEventListener('resize', onAnyScrollOrResize);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onAnyScrollOrResize, true);
      window.removeEventListener('resize', onAnyScrollOrResize);
    };
  }, [mobileFiltersOpen]);

  const MobileDropdown = ({ id, label, valueLabel, children }) => {
    const isOpen = mobileDropdownOpen === id;
    return (
      <div className="relative">
        <div className="text-[11px] font-semibold text-gray-600 mb-1">{label}</div>
        <button
          type="button"
          onClick={() => setMobileDropdownOpen((curr) => (curr === id ? null : id))}
          className={`w-full inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none ${isOpen ? 'ring-2 ring-blue-200' : ''}`}
          aria-expanded={isOpen}
        >
          <span className="truncate text-gray-900">{valueLabel}</span>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 text-gray-500 transition ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute left-0 right-0 mt-2 z-30 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="max-h-56 overflow-auto py-1">{children}</div>
          </div>
        )}
      </div>
    );
  };

  const MobileOption = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm ${active ? 'bg-gray-50 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
    >
      <span className="block truncate">{children}</span>
    </button>
  );

  return (
    <div className="w-full sm:max-w-6xl sm:mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="bg-white sm:rounded-2xl rounded-none shadow-sm border-y sm:border overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm text-white/90">Espace admin</div>
              <h1 className="text-xl sm:text-3xl font-extrabold">Candidatures</h1>
              <p className="mt-1 text-white/90 hidden sm:block">Recherche, filtres, et accès aux détails.</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-white/90">Affichées</div>
              <div className="text-xl sm:text-2xl font-extrabold">{filteredApps.length}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 sm:hidden">
              <button
                type="button"
                ref={mobileFilterButtonRef}
                onClick={() => (mobileFiltersOpen ? (setMobileFiltersOpen(false), setMobileDropdownOpen(null)) : openMobileFilters())}
                className={`inline-flex items-center justify-center rounded-xl p-2 border border-white/20 bg-white/10 hover:bg-white/15 focus:outline-none ${mobileFiltersOpen ? 'ring-2 ring-white/40' : ''}`}
                aria-label="Filtres"
                title="Filtres"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M22 3H2l8 9v7l4 2v-9l8-9z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-white/20 bg-white text-blue-700 hover:bg-white/90 font-semibold"
              >
                Rafraîchir
              </button>
            </div>

            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl bg-white border border-white/40 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-white/70"
                placeholder="Candidat, email, offre, ville…"
              />
            </div>

            {mobileFiltersOpen && mobileFiltersPos && (
              <div className="fixed inset-0 z-40 sm:hidden">
                <div
                  ref={mobileFiltersPopoverRef}
                  className="fixed rounded-2xl border border-white/20 bg-white shadow-xl overflow-visible"
                  style={{ left: mobileFiltersPos.left, top: mobileFiltersPos.top, width: mobileFiltersPos.width }}
                  role="dialog"
                  aria-label="Filtres"
                >
                  <div className="p-2.5">
                    <div className="grid grid-cols-1 gap-2">
                      <MobileDropdown
                        id="role"
                        label="Rôle"
                        valueLabel={filterRole === 'all' ? 'Tous' : filterRole === 'designer' ? 'Designer' : 'Dev'}
                      >
                        <MobileOption
                          active={filterRole === 'all'}
                          onClick={() => {
                            setFilterRole('all');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          Tous
                        </MobileOption>
                        <MobileOption
                          active={filterRole === 'dev'}
                          onClick={() => {
                            setFilterRole('dev');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          Dev
                        </MobileOption>
                        <MobileOption
                          active={filterRole === 'designer'}
                          onClick={() => {
                            setFilterRole('designer');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          Designer
                        </MobileOption>
                      </MobileDropdown>

                      <MobileDropdown
                        id="status"
                        label="Statut"
                        valueLabel={
                          filterStatus === 'approved'
                            ? 'Approuvées'
                            : filterStatus === 'rejected'
                              ? 'Rejetées'
                              : filterStatus === 'pending'
                                ? 'En attente'
                                : 'Tous'
                        }
                      >
                        <MobileOption
                          active={filterStatus === 'all'}
                          onClick={() => {
                            setFilterStatus('all');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          Tous
                        </MobileOption>
                        <MobileOption
                          active={filterStatus === 'pending'}
                          onClick={() => {
                            setFilterStatus('pending');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          En attente
                        </MobileOption>
                        <MobileOption
                          active={filterStatus === 'approved'}
                          onClick={() => {
                            setFilterStatus('approved');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          Approuvées
                        </MobileOption>
                        <MobileOption
                          active={filterStatus === 'rejected'}
                          onClick={() => {
                            setFilterStatus('rejected');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          Rejetées
                        </MobileOption>
                      </MobileDropdown>

                      <MobileDropdown
                        id="offer"
                        label="Offre"
                        valueLabel={
                          filterOffer === 'all'
                            ? 'Toutes les offres'
                            : String((offers || []).find((o) => String(o.id) === String(filterOffer))?.title || 'Offre')
                        }
                      >
                        <MobileOption
                          active={filterOffer === 'all'}
                          onClick={() => {
                            setFilterOffer('all');
                            setMobileDropdownOpen(null);
                          }}
                        >
                          Toutes les offres
                        </MobileOption>
                        {(offers || []).map((o) => (
                          <MobileOption
                            key={o.id}
                            active={String(filterOffer) === String(o.id)}
                            onClick={() => {
                              setFilterOffer(String(o.id));
                              setMobileDropdownOpen(null);
                            }}
                          >
                            {o.title}
                          </MobileOption>
                        ))}
                      </MobileDropdown>

                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="hidden sm:flex flex-wrap items-end gap-3">
              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-white/90 mb-1">Rôle</label>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full sm:w-48 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <option value="all" className="text-gray-900">Tous</option>
                  <option value="dev" className="text-gray-900">Dev</option>
                  <option value="designer" className="text-gray-900">Designer</option>
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-white/90 mb-1">Statut</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full sm:w-56 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <option value="all" className="text-gray-900">Tous</option>
                  <option value="pending" className="text-gray-900">En attente</option>
                  <option value="approved" className="text-gray-900">Approuvées</option>
                  <option value="rejected" className="text-gray-900">Rejetées</option>
                </select>
              </div>

              <div className="w-full sm:w-auto">
                <label className="block text-xs font-semibold text-white/90 mb-1">Offre</label>
                <select
                  value={filterOffer}
                  onChange={(e) => setFilterOffer(e.target.value)}
                  className="w-full sm:w-72 px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <option value="all" className="text-gray-900">Toutes les offres</option>
                  {(offers || []).map((o) => (
                    <option key={o.id} value={String(o.id)} className="text-gray-900">
                      {o.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white text-blue-700 hover:bg-white/90 font-semibold transition"
              >
                Rafraîchir
              </button>
            </div>
          </div>
        </div>

        <div className="px-0 py-4 sm:p-6">
          {error && (
            <div className="mb-5 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <div className="font-bold">Erreur</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
              <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="rounded-2xl border bg-gray-50 p-8 text-center">
              <div className="text-xl font-extrabold text-gray-900">Aucune candidature</div>
              <div className="mt-1 text-gray-600">Quand quelqu’un postule, elle apparaîtra ici.</div>
            </div>
          ) : (
            <>
              <div className="sm:hidden grid gap-3">
                {filteredApps.map((app) => (
                  <Link
                    key={app.id}
                    to={`/admin/candidatures/${app.id}`}
                    aria-label={`Ouvrir la candidature de ${app?.nom || 'candidat'}`}
                    className="block rounded-2xl border bg-white shadow-sm overflow-hidden hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  >
                    <div aria-hidden="true" className="h-0.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
                    <div className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-extrabold text-gray-900 truncate">{app?.nom || '—'}</div>
                          <div className="text-xs text-gray-600 truncate">{app?.email || '—'}</div>
                        </div>

                        <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${getStatusBadge(app?.status)}`}>
                          {getStatusLabel(app?.status)}
                        </span>
                      </div>

                      <div className="mt-1 text-sm font-semibold text-gray-900 truncate">{getOfferTitle(app)}</div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${getRoleBadge(app?.role)}`}>
                          {getRoleLabel(app?.role)}
                        </span>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold ring-1 ${getScoreBadge(app?.score)}`}>
                          {Number(app?.score || 0)}/4
                        </span>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 bg-gray-50 text-gray-700 ring-gray-200">
                          {formatDate(app?.created_at)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="hidden sm:block rounded-2xl border bg-white overflow-hidden shadow-sm">
                <div aria-hidden="true" className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Candidat</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Offre</th>
                      <th className="hidden lg:table-cell px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Rôle</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Statut</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider text-center">Score</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredApps.map((app) => (
                      <tr key={app.id} className="transition hover:bg-gray-50 even:bg-gray-50/30">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{app?.nom || '—'}</div>
                          <div className="text-sm text-gray-600">{app?.email || '—'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{getOfferTitle(app)}</div>
                        </td>
                        <td className="hidden lg:table-cell px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">{app?.telephone || '—'}</div>
                          <div className="text-sm text-gray-600">{app?.ville || '—'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getRoleBadge(app?.role)}`}>
                            {getRoleLabel(app?.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ${getStatusBadge(app?.status)}`}>
                            {getStatusLabel(app?.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-sm font-extrabold ring-1 ${getScoreBadge(app?.score)}`}>
                            {Number(app?.score || 0)}/4
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{formatDate(app?.created_at)}</td>
                        <td className="px-6 py-4">
                          <Link
                            to={`/admin/candidatures/${app.id}`}
                            className="inline-flex items-center px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                          >
                            Voir
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

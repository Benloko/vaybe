import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function ApplicationProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const avatarModalRef = useRef(null);
  const [application, setApplication] = useState(null);

  const isStaleApplication = useMemo(() => {
    const routeId = String(id || '').trim();
    const loadedId = String(application?.id || '').trim();
    if (!routeId || !loadedId) return false;
    return routeId !== loadedId;
  }, [application?.id, id]);

  const [candidateAccount, setCandidateAccount] = useState(() => {
    try {
      return {
        id: localStorage.getItem('candidateAccountId') || '',
        full_name: localStorage.getItem('candidateAccountFullName') || '',
        email: localStorage.getItem('candidateAccountEmail') || '',
        phone: localStorage.getItem('candidateAccountPhone') || '',
        city: localStorage.getItem('candidateAccountCity') || '',
      };
    } catch {
      return {
        id: '',
        full_name: '',
        email: '',
        phone: '',
        city: '',
      };
    }
  });

  const isOwnProfile = useMemo(() => {
    try {
      return String(localStorage.getItem('lastApplicationId') || '') === String(id || '');
    } catch {
      return false;
    }
  }, [id]);

  const [activeTab, setActiveTab] = useState('infos');

  const canEditProfile = useMemo(() => {
    return isOwnProfile && String(candidateAccount?.id || '').trim() !== '';
  }, [candidateAccount?.id, isOwnProfile]);

  const [editingField, setEditingField] = useState(null);
  const [profileDraft, setProfileDraft] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
  });
  const [profileSaveBusy, setProfileSaveBusy] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState('');

  const fileInputRef = useRef(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarSaveError, setAvatarSaveError] = useState('');

  const openAvatarModal = () => {
    if (!avatarDataUrl) return;
    setAvatarModalOpen(true);
  };

  useEffect(() => {
    if (!avatarModalOpen) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const root = avatarModalRef.current;
      if (!root) return;
      if (root.contains(target)) return;
      setAvatarModalOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setAvatarModalOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [avatarModalOpen]);


  const [showCreatedBanner, setShowCreatedBanner] = useState(false);

  const [myAppsLoading, setMyAppsLoading] = useState(true);
  const [myAppsError, setMyAppsError] = useState('');
  const [myApplications, setMyApplications] = useState([]);
  const [myAppsStatusFilter, setMyAppsStatusFilter] = useState('all');
  const [myAppsFilterOpen, setMyAppsFilterOpen] = useState(false);
  const myAppsFilterRef = useRef(null);

  const currentOfferTitle = useMemo(() => {
    return String(application?.offer_title || application?.offre || '').trim();
  }, [application?.offer_title, application?.offre]);

  const currentRoleLabel = useMemo(() => {
    const role = String(application?.role || '').trim();
    if (!role) return '';
    return role === 'designer' ? 'Designer' : 'Développeur';
  }, [application?.role]);

  const currentStatusLabel = useMemo(() => {
    return application?.status === 'approved'
      ? '✅ Approuvée'
      : application?.status === 'rejected'
        ? '❌ Rejetée'
        : '⏳ En attente';
  }, [application?.status]);

  const logout = () => {
    applicationService.clearCandidateLogoutContext();
    try {
      if (id) localStorage.removeItem(`candidateAvatar:${id}`);
    } catch {
      // ignore
    }
    navigate('/');
  };

  const loadAll = async ({ isAlive } = {}) => {
    const alive = typeof isAlive === 'function' ? isAlive : () => true;

    setLoading(true);
    setError('');
    setMyAppsError('');

    let appEmail = '';

    try {
      const payload = await applicationService.getApplication(id);
      if (!alive()) return;
      const appData = payload?.data || null;
      setApplication(appData);

      const apiAvatarUrl = String(appData?.avatar_url || appData?.avatarUrl || '').trim();
      if (apiAvatarUrl) {
        const normalized = applicationService.normalizePublicAssetUrl(apiAvatarUrl);
        setAvatarDataUrl(normalized);
        try {
          localStorage.setItem(`candidateAvatar:${id}`, normalized);
        } catch {
          // ignore
        }
      }

      appEmail = String(appData?.email || '').trim().toLowerCase();
    } catch (err) {
      if (!alive()) return;
      setError(err?.message || 'Impossible de charger votre candidature.');
    } finally {
      if (!alive()) return;
      setLoading(false);
    }

    if (!appEmail) return;

    try {
      setMyAppsLoading(true);
      const payload = await applicationService.getCandidateApplicationsByEmail(appEmail);
      if (!alive()) return;
      const all = payload?.data || [];
      const sorted = [...all].sort((a, b) => {
        const aT = new Date(a?.created_at || 0).getTime();
        const bT = new Date(b?.created_at || 0).getTime();
        return bT - aT;
      });
      setMyApplications(sorted);
    } catch (err) {
      if (!alive()) return;
      setMyAppsError(err?.message || 'Impossible de charger vos candidatures.');
      setMyApplications([]);
    } finally {
      if (!alive()) return;
      setMyAppsLoading(false);
    }

    try {
      const payload = await applicationService.getApplicationMessages(id);
      if (!alive()) return;
      const loadedMessages = payload?.data || [];

      // Badge "nouveaux messages" — on compte uniquement les vrais messages admin (hors changements de statut).
      try {
        const isLikelyStatusBody = (body) => {
          const text = String(body || '').toLowerCase();
          if (!text.includes('candidature')) return false;
          return text.includes('approuv') || text.includes('rejet');
        };

        const seenKey = `candidateNotificationsSeenAt:${String(id)}`;
        const unreadKey = `candidateUnreadCount:${String(id)}`;
        const lastSeenAt = localStorage.getItem(seenKey);
        const lastSeenTs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;
        let unread = 0;

        for (const m of Array.isArray(loadedMessages) ? loadedMessages : []) {
          if (m?.sender !== 'admin') continue;
          const kind = String(m?.kind || 'message');
          if (kind !== 'message') continue;
          if (isLikelyStatusBody(m?.body)) continue;
          const ts = new Date(m?.created_at || 0).getTime();
          if (!Number.isFinite(ts) || ts <= 0) continue;
          if (ts > lastSeenTs) unread += 1;
        }

        localStorage.setItem(unreadKey, String(unread));
        window.dispatchEvent(new Event('candidateNotificationsChanged'));
      } catch {
        // ignore
      }
    } catch {
      if (!alive()) return;
    }
  };

  useEffect(() => {
    let alive = true;

    try {
      const stored = localStorage.getItem(`candidateAvatar:${id}`);
      if (stored) setAvatarDataUrl(applicationService.normalizePublicAssetUrl(stored));
    } catch {
      // ignore
    }

    loadAll({ isAlive: () => alive });

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Affiche une bannière de confirmation après postulation, puis nettoie l'URL.
    const params = new URLSearchParams(location.search || '');
    if (params.get('created') !== '1') return;

    setShowCreatedBanner(true);
    setActiveTab('candidatures');
    try {
      params.delete('created');
      const nextSearch = params.toString();
      navigate(`${location.pathname}${nextSearch ? `?${nextSearch}` : ''}`, { replace: true });
    } catch {
      // ignore
    }
  }, [location.pathname, location.search, navigate]);

  const startEditProfile = (field) => {
    if (!canEditProfile) return;
    setProfileSaveError('');
    setEditingField(field);

    setProfileDraft({
      full_name: String(candidateAccount?.full_name || application?.nom || '').trim(),
      email: String(candidateAccount?.email || application?.email || '').trim(),
      phone: String(candidateAccount?.phone || application?.telephone || '').trim(),
      city: String(candidateAccount?.city || application?.ville || '').trim(),
    });
  };

  const cancelEditProfile = () => {
    setProfileSaveError('');
    setEditingField(null);
  };

  const saveProfile = async () => {
    if (!canEditProfile) return;

    const accountId = String(candidateAccount?.id || '').trim();
    if (!accountId) {
      setProfileSaveError('Compte candidat introuvable.');
      return;
    }

    setProfileSaveBusy(true);
    setProfileSaveError('');

    try {
      const payload = await applicationService.updateCandidateAccount(accountId, {
        full_name: String(profileDraft.full_name || '').trim(),
        email: String(profileDraft.email || '').trim(),
        phone: String(profileDraft.phone || '').trim(),
        city: String(profileDraft.city || '').trim() || null,
      });

      const data = payload?.data || null;
      if (data) {
        applicationService.setCandidateSession(data);
        setCandidateAccount({
          id: String(data.id || ''),
          full_name: String(data.full_name || ''),
          email: String(data.email || ''),
          phone: String(data.phone || ''),
          city: String(data.city || ''),
        });
        setApplication((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            nom: data.full_name ?? prev.nom,
            email: data.email ?? prev.email,
            telephone: data.phone ?? prev.telephone,
            ville: data.city ?? prev.ville,
          };
        });
      }

      setEditingField(null);
    } catch (err) {
      setProfileSaveError(err?.message || 'Impossible de sauvegarder.');
    } finally {
      setProfileSaveBusy(false);
    }
  };

  const isEditing = (field) => editingField === field;

  useEffect(() => {
    if (!myAppsFilterOpen) return;

    const onPointerDown = (event) => {
      const root = myAppsFilterRef.current;
      if (!root) return;
      if (root.contains(event.target)) return;
      setMyAppsFilterOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMyAppsFilterOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [myAppsFilterOpen]);

  const selectMyAppsFilter = (value) => {
    setMyAppsStatusFilter(value);
    setMyAppsFilterOpen(false);
  };

  const filteredMyApplications = useMemo(() => {
    const list = Array.isArray(myApplications) ? myApplications : [];
    const filter = String(myAppsStatusFilter || 'all');
    if (filter === 'all') return list;
    if (filter === 'approved') return list.filter((a) => String(a?.status || '') === 'approved');
    if (filter === 'rejected') return list.filter((a) => String(a?.status || '') === 'rejected');
    if (filter === 'in_progress') return list.filter((a) => {
      const status = String(a?.status || '');
      return status !== 'approved' && status !== 'rejected';
    });
    return list;
  }, [myApplications, myAppsStatusFilter]);

  const getStatusBadge = (status) => {
    const value = String(status || 'pending');
    if (value === 'approved') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
    if (value === 'rejected') return 'bg-rose-50 text-rose-800 ring-rose-200';
    return 'bg-gray-50 text-gray-800 ring-gray-200';
  };

  const getStatusLabel = (status) => {
    if (status === 'approved') return 'Approuvée';
    if (status === 'rejected') return 'Rejetée';
    return 'En cours';
  };

  const onPickAvatar = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onAvatarSelected = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setAvatarSaveError('');

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      setAvatarDataUrl(result);
      try {
        localStorage.setItem(`candidateAvatar:${id}`, result);
      } catch {
        // ignore
      }
    };
    reader.readAsDataURL(file);

    // Upload vers backend pour que l'admin voie la photo
    (async () => {
      setAvatarSaving(true);
      try {
        const payload = await applicationService.uploadApplicationAvatar(id, file);
        const url = String(payload?.data?.avatar_url || payload?.data?.avatarUrl || '').trim();
        if (url) {
          const normalized = applicationService.normalizePublicAssetUrl(url);
          setAvatarDataUrl(normalized);
          try {
            localStorage.setItem(`candidateAvatar:${id}`, normalized);
          } catch {
            // ignore
          }
        }
      } catch (err) {
        setAvatarSaveError(err?.message || 'Impossible d\'uploader la photo.');
      } finally {
        setAvatarSaving(false);
      }
    })();
  };

  const onDeleteAvatar = () => {
    if (!id) return;
    setAvatarSaveError('');

    (async () => {
      setAvatarSaving(true);
      try {
        await applicationService.deleteApplicationAvatar(id);
        setAvatarDataUrl('');
        setAvatarModalOpen(false);
        try {
          localStorage.removeItem(`candidateAvatar:${id}`);
        } catch {
          // ignore
        }
      } catch (err) {
        setAvatarSaveError(err?.message || 'Impossible de supprimer la photo.');
      } finally {
        setAvatarSaving(false);
      }
    })();
  };


  return (
    <div className="w-full">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="h-20 sm:h-28 bg-gradient-to-r from-emerald-600 to-teal-600" />

        <div className="px-4 sm:px-6 pb-5 sm:pb-6 -mt-8 sm:-mt-10">
          {(loading || isStaleApplication) && (
            <div className="p-4 rounded-xl border bg-gray-50 text-gray-700">
              Chargement…
            </div>
          )}

          {!loading && !isStaleApplication && error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <div className="font-bold">Oups…</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          )}

          {!loading && !isStaleApplication && !error && application && (
            <div>
              {showCreatedBanner && (
                <div className="mb-4 sm:mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 text-emerald-900">
                  <div className="font-extrabold">Candidature envoyée</div>
                  <div className="text-sm mt-1">Merci, nous avons bien reçu votre candidature. Vous pouvez suivre l’avancement ici.</div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                <div>
                  <div className="flex items-end gap-1">
                    {avatarDataUrl ? (
                      <button
                        type="button"
                        onClick={openAvatarModal}
                        className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-white ring-4 ring-white overflow-hidden shadow-sm border flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Voir la photo de profil"
                        title="Voir"
                      >
                        <img src={avatarDataUrl} alt="Profil" className="h-full w-full object-cover" />
                      </button>
                    ) : (
                      <div
                        className="relative h-28 w-28 sm:h-32 sm:w-32 rounded-full bg-white ring-4 ring-white overflow-hidden shadow-sm border flex items-center justify-center"
                        aria-label="Photo de profil"
                      >
                        <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-600 font-extrabold text-lg sm:text-xl">
                          {String(application.nom || 'P').trim().slice(0, 1).toUpperCase()}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={onPickAvatar}
                      disabled={avatarSaving}
                      className="-ml-1 h-10 w-10 sm:h-11 sm:w-11 rounded-full border bg-white hover:bg-gray-50 text-gray-700 font-extrabold flex items-center justify-center disabled:opacity-60"
                      aria-label="Modifier la photo de profil"
                      title="Modifier"
                    >
                      ✎
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={onAvatarSelected}
                  />

                  {avatarSaving ? (
                    <div className="mt-2 text-sm text-gray-600">Upload en cours…</div>
                  ) : avatarSaveError ? (
                    <div className="mt-2 text-sm text-rose-700">{avatarSaveError}</div>
                  ) : null}
                </div>

                <div className="flex-1">
                  <div className="text-sm sm:text-base text-gray-600">Profil</div>
                  <h1 className="text-lg sm:text-2xl font-extrabold text-gray-900 leading-tight">{application.nom}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm sm:text-sm font-semibold ring-1 ${getStatusBadge(application.status)}`}>
                      {currentStatusLabel}
                    </span>
                    {currentOfferTitle && (
                      <span className="text-sm sm:text-base text-gray-600">• {currentOfferTitle}</span>
                    )}
                    {currentRoleLabel && (
                      <span className="text-sm sm:text-base text-gray-600">• {currentRoleLabel}</span>
                    )}
                  </div>
                </div>

              </div>
              {avatarModalOpen && avatarDataUrl && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
                  <div ref={avatarModalRef} className="w-full max-w-2xl rounded-2xl bg-white border shadow-sm overflow-hidden">
                    <div className="px-4 py-3 border-b flex items-center justify-between gap-3">
                      <div className="text-sm font-extrabold text-gray-900">Photo de profil</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={onPickAvatar}
                          disabled={avatarSaving}
                          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900 disabled:opacity-60"
                        >
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteAvatar();
                            setAvatarModalOpen(false);
                          }}
                          disabled={avatarSaving}
                          className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold text-rose-700 disabled:opacity-60"
                        >
                          Supprimer
                        </button>
                        <button
                          type="button"
                          onClick={() => setAvatarModalOpen(false)}
                          className="h-10 w-10 rounded-xl border bg-white hover:bg-gray-50 text-gray-700 font-extrabold inline-flex items-center justify-center"
                          aria-label="Fermer"
                          title="Fermer"
                        >
                          ×
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="rounded-2xl overflow-hidden bg-gray-50 border">
                        <img src={avatarDataUrl} alt="Profil" className="w-full h-auto object-contain" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 sm:mt-6 flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('infos')}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-sm font-semibold border ${
                    activeTab === 'infos' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  Informations
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('candidatures')}
                  className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl text-sm sm:text-sm font-semibold border ${
                    activeTab === 'candidatures' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  Mes candidatures
                </button>
              </div>

              {activeTab === 'infos' && (
                <div className="mt-5 space-y-5">
                  <div className="rounded-2xl border p-4 sm:p-5 bg-white">
                    <div className="text-sm sm:text-base font-extrabold text-gray-900">Informations</div>
                    {(currentOfferTitle || currentRoleLabel) && (
                      <div className="mt-2 text-sm sm:text-base text-gray-700">
                        Vous consultez votre candidature{currentOfferTitle ? ` pour l’offre “${currentOfferTitle}”` : ''}
                        {currentRoleLabel ? ` (${currentRoleLabel}).` : '.'}
                      </div>
                    )}
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {currentOfferTitle && (
                        <div className="rounded-xl border p-3 sm:p-4">
                          <div className="text-sm text-gray-500">Offre</div>
                          <div className="text-sm sm:text-base font-semibold text-gray-900">{currentOfferTitle}</div>
                        </div>
                      )}

                      {currentRoleLabel && (
                        <div className="rounded-xl border p-3 sm:p-4">
                          <div className="text-sm text-gray-500">Type</div>
                          <div className="text-sm sm:text-base font-semibold text-gray-900">{currentRoleLabel}</div>
                        </div>
                      )}

                      <div className="rounded-xl border p-3 sm:p-4">
                        {isEditing('full_name') ? (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-500">Nom complet</div>
                            <input
                              value={profileDraft.full_name}
                              onChange={(e) => setProfileDraft((prev) => ({ ...prev, full_name: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                              placeholder="Votre nom"
                            />

                            {canEditProfile && profileSaveError && (
                              <div className="text-sm text-rose-700">{profileSaveError}</div>
                            )}

                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEditProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={saveProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold"
                              >
                                {profileSaveBusy ? '…' : 'Appliquer'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-500">Nom complet</div>
                              <div className="font-semibold text-gray-900 break-words">{candidateAccount.full_name || application.nom}</div>
                            </div>
                            {canEditProfile && (
                              <button
                                type="button"
                                onClick={() => startEditProfile('full_name')}
                                className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 whitespace-nowrap"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border p-3 sm:p-4">
                        {isEditing('email') ? (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-500">Email</div>
                            <input
                              value={profileDraft.email}
                              onChange={(e) => setProfileDraft((prev) => ({ ...prev, email: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                              placeholder="vous@exemple.com"
                            />

                            {canEditProfile && profileSaveError && (
                              <div className="text-sm text-rose-700">{profileSaveError}</div>
                            )}

                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEditProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={saveProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold"
                              >
                                {profileSaveBusy ? '…' : 'Appliquer'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-500">Email</div>
                              <div className="font-semibold text-gray-900 break-words">{candidateAccount.email || application.email || '—'}</div>
                            </div>
                            {canEditProfile && (
                              <button
                                type="button"
                                onClick={() => startEditProfile('email')}
                                className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 whitespace-nowrap"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border p-3 sm:p-4">
                        {isEditing('phone') ? (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-500">Numéro</div>
                            <input
                              value={profileDraft.phone}
                              onChange={(e) => setProfileDraft((prev) => ({ ...prev, phone: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                              placeholder="06 12 34 56 78"
                            />

                            {canEditProfile && profileSaveError && (
                              <div className="text-sm text-rose-700">{profileSaveError}</div>
                            )}

                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEditProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={saveProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold"
                              >
                                {profileSaveBusy ? '…' : 'Appliquer'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-500">Numéro</div>
                              <div className="font-semibold text-gray-900 break-words">{candidateAccount.phone || application.telephone || '—'}</div>
                            </div>
                            {canEditProfile && (
                              <button
                                type="button"
                                onClick={() => startEditProfile('phone')}
                                className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 whitespace-nowrap"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-xl border p-3 sm:p-4">
                        {isEditing('city') ? (
                          <div className="space-y-2">
                            <div className="text-sm text-gray-500">Ville de résidence</div>
                            <input
                              value={profileDraft.city}
                              onChange={(e) => setProfileDraft((prev) => ({ ...prev, city: e.target.value }))}
                              className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                              placeholder="Ex: Paris"
                            />

                            {canEditProfile && profileSaveError && (
                              <div className="text-sm text-rose-700">{profileSaveError}</div>
                            )}

                            <div className="flex items-center gap-2 justify-end">
                              <button
                                type="button"
                                onClick={cancelEditProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold"
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={saveProfile}
                                disabled={profileSaveBusy}
                                className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold"
                              >
                                {profileSaveBusy ? '…' : 'Appliquer'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-gray-500">Ville de résidence</div>
                              <div className="font-semibold text-gray-900 break-words">{candidateAccount.city || application.ville || '—'}</div>
                            </div>
                            {canEditProfile && (
                              <button
                                type="button"
                                onClick={() => startEditProfile('city')}
                                className="px-2 py-1 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-700 whitespace-nowrap"
                              >
                                ✎
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'candidatures' && (
                <div className="mt-5 space-y-4">
                  <div className="rounded-2xl border p-4 sm:p-5 bg-white">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm sm:text-base font-extrabold text-gray-900">Toutes mes candidatures</div>
                      <div className="relative" ref={myAppsFilterRef}>
                        <button
                          type="button"
                          onClick={() => setMyAppsFilterOpen((v) => !v)}
                          className="text-sm px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 font-semibold whitespace-nowrap"
                          aria-haspopup="menu"
                          aria-expanded={myAppsFilterOpen}
                        >
                          Filtrer ▾
                        </button>

                        {myAppsFilterOpen && (
                          <div
                            role="menu"
                            className="absolute right-0 mt-2 w-40 rounded-xl border bg-white shadow-sm overflow-hidden z-10"
                          >
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => selectMyAppsFilter('all')}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                myAppsStatusFilter === 'all' ? 'bg-gray-50 font-semibold' : ''
                              }`}
                            >
                              Toutes
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => selectMyAppsFilter('approved')}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                myAppsStatusFilter === 'approved' ? 'bg-gray-50 font-semibold' : ''
                              }`}
                            >
                              Approuvée
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => selectMyAppsFilter('rejected')}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                myAppsStatusFilter === 'rejected' ? 'bg-gray-50 font-semibold' : ''
                              }`}
                            >
                              Rejetée
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => selectMyAppsFilter('in_progress')}
                              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                                myAppsStatusFilter === 'in_progress' ? 'bg-gray-50 font-semibold' : ''
                              }`}
                            >
                              En cours
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {myAppsLoading ? (
                    <div className="p-4 rounded-xl border bg-gray-50 text-gray-700">
                      Chargement de vos candidatures…
                    </div>
                  ) : myAppsError ? (
                    <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
                      <div className="font-bold">Oups…</div>
                      <div className="text-sm mt-1">{myAppsError}</div>
                    </div>
                  ) : (filteredMyApplications?.length || 0) === 0 ? (
                    <div className="rounded-2xl border bg-gray-50 p-5 text-gray-700">
                      Aucune candidature pour ce filtre.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredMyApplications.map((a) => (
                        <Link
                          key={a.id}
                          to={`/candidatures/${a.id}`}
                          className="block rounded-2xl border bg-white p-4 sm:p-5 hover:bg-gray-50 transition"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="text-sm sm:text-base font-extrabold text-gray-900 leading-snug">{a.offer_title || 'Candidature'}</div>
                              <div className="mt-1 text-sm sm:text-base text-gray-600">
                                {a.role === 'designer' ? 'Designer' : 'Développeur'}
                              </div>
                            </div>
                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm sm:text-sm font-semibold ring-1 ${getStatusBadge(a.status)}`}>
                              {getStatusLabel(a.status)}
                            </span>
                          </div>
                          <div className="mt-3 text-sm sm:text-sm text-gray-700">
                            Accéder à cette candidature
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  <div className="pt-2">
                    <Link
                      to="/"
                      className="block w-full text-center px-4 py-3 rounded-2xl border bg-white hover:bg-gray-50 font-extrabold"
                    >
                      Voir les offres
                    </Link>
                  </div>
                </div>
              )}

              {isOwnProfile && (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full px-4 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold"
                  >
                    Se déconnecter
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {avatarModalOpen && avatarDataUrl ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            ref={avatarModalRef}
            className="w-full max-w-lg bg-white rounded-2xl shadow-sm border overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Photo de profil"
          >
            <div className="flex items-center justify-between gap-2 p-3 border-b bg-white">
              <button
                type="button"
                onClick={onPickAvatar}
                disabled={avatarSaving}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold disabled:opacity-60"
              >
                Modifier
              </button>

              <button
                type="button"
                onClick={onDeleteAvatar}
                disabled={avatarSaving}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-rose-700 text-sm font-bold disabled:opacity-60"
              >
                Supprimer
              </button>

              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold"
              >
                Fermer
              </button>
            </div>

            <div className="p-4 bg-gray-50">
              <div className="rounded-2xl overflow-hidden border bg-white">
                <img src={avatarDataUrl} alt="Profil" className="w-full h-auto object-contain" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

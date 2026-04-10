import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { applicationService } from '../services/api';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function statusLabel(status) {
  if (status === 'approved') return 'Approuvée';
  if (status === 'rejected') return 'Rejetée';
  return 'En attente';
}

function statusStyles(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (status === 'rejected') return 'bg-rose-50 text-rose-800 ring-rose-200';
  return 'bg-gray-50 text-gray-800 ring-gray-200';
}

export default function AdminApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const backTo = useMemo(() => {
    const value = location?.state?.backTo;
    return typeof value === 'string' ? value : '';
  }, [location?.state?.backTo]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);
  const [decisionMessage, setDecisionMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const avatarModalRef = useRef(null);

  const createdAtLabel = useMemo(() => formatDate(application?.created_at), [application?.created_at]);
  const isPending = application?.status === 'pending' || !application?.status;
  const isApproved = application?.status === 'approved';
  const apiAvatarUrl = useMemo(() => {
    return String(application?.avatar_url || application?.avatarUrl || '').trim();
  }, [application?.avatar_url, application?.avatarUrl]);
  const avatarSrc = useMemo(() => {
    if (apiAvatarUrl) return applicationService.normalizePublicAssetUrl(apiAvatarUrl);
    if (avatarDataUrl) return applicationService.normalizePublicAssetUrl(avatarDataUrl);
    return '';
  }, [apiAvatarUrl, avatarDataUrl]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarSrc]);

  const openAvatarModal = () => {
    if (!avatarSrc || avatarLoadFailed) return;
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

  const loadAll = async () => {
    setError('');

    try {
      setLoading(true);
      const payload = await applicationService.getApplication(id);
      setApplication(payload?.data || null);
    } catch (err) {
      setError(err?.message || 'Impossible de charger la candidature.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();

    try {
      const stored = localStorage.getItem(`candidateAvatar:${id}`);
      setAvatarDataUrl(stored ? String(stored) : '');
    } catch {
      setAvatarDataUrl('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const updateStatus = async (status) => {
    if (!isPending) return;

    const optionalMessage = decisionMessage.trim();

    if (status === 'rejected' && !optionalMessage) {
      setError('Ajoutez un message avant de rejeter (le candidat ne pourra pas répondre).');
      return;
    }

    setUpdatingStatus(true);
    setError('');

    try {
      const payload = await applicationService.updateApplicationStatus(id, {
        status,
        message: optionalMessage || undefined,
      });

      setApplication(payload?.data || application);
      if (optionalMessage) setDecisionMessage('');
      await loadAll();
    } catch (err) {
      setError(err?.message || 'Impossible de mettre à jour le statut.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex-1 min-h-0 flex flex-col">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Admin</div>
          <div className="text-xl font-extrabold text-gray-900">Détail candidature</div>
        </div>
        <button
          type="button"
          onClick={() => navigate(backTo || '/admin')}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900"
        >
          Retour
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="h-20 sm:h-28 bg-gradient-to-r from-emerald-600 to-teal-600" />

        <div className="px-4 sm:px-6 pb-5 sm:pb-6 -mt-8 sm:-mt-10">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="flex items-end gap-2">
              {avatarSrc && !avatarLoadFailed ? (
                <button
                  type="button"
                  onClick={openAvatarModal}
                  className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-white ring-4 ring-white overflow-hidden shadow-sm border flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label="Voir la photo de profil"
                  title="Voir"
                >
                  <img
                    src={avatarSrc}
                    alt="Profil"
                    className="h-full w-full object-cover"
                    onError={() => setAvatarLoadFailed(true)}
                  />
                </button>
              ) : (
                <div
                  className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-white ring-4 ring-white overflow-hidden shadow-sm border flex items-center justify-center"
                  aria-label="Photo de profil"
                >
                  <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-600 font-extrabold text-lg sm:text-xl">
                    {String(application?.nom || 'P').trim().slice(0, 1).toUpperCase()}
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="text-xs sm:text-sm text-gray-600">Profil</div>
              <div className="text-xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
                {application?.nom || (loading ? 'Chargement…' : '—')}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ring-1 ${statusStyles(application?.status)}`}>
                  {statusLabel(application?.status)}
                </span>
                {application?.offer_title ? (
                  <span className="text-xs sm:text-sm text-gray-600">• {application.offer_title}</span>
                ) : null}
                <span className="text-xs sm:text-sm text-gray-600">• {application?.offer_type_label || application?.role_label || (application?.role === 'designer' ? 'Designer' : 'Développeur')}</span>
              </div>
              {application?.email ? <div className="mt-2 text-sm text-gray-600 break-all">{application.email}</div> : null}
            </div>

            {application ? (
              <div className="sm:text-right">
                <div className="text-xs sm:text-sm text-gray-600">Score</div>
                <div className="mt-1 flex items-center justify-start sm:justify-end gap-3">
                  <div className="text-2xl font-extrabold text-gray-900">{application.score}/4</div>
                  {isApproved ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/messages/${id}`)}
                      className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold text-gray-900"
                      aria-label="Ouvrir la conversation"
                      title="Messages"
                    >
                      Messages
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-auto">
          {error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <div className="font-bold">Oups…</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          )}

          {!loading && application && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-2xl border bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-extrabold text-gray-900">Informations</div>
                        <div className="mt-1 text-sm text-gray-600">Les infos essentielles, rangées et lisibles.</div>
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <dt className="text-xs font-semibold text-gray-600">Offre</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{application.offer_title || '—'}</dd>
                        {application.offer_slug ? <div className="text-sm text-gray-600">{application.offer_slug}</div> : null}
                      </div>
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <dt className="text-xs font-semibold text-gray-600">Envoyée</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{createdAtLabel || '—'}</dd>
                      </div>
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <dt className="text-xs font-semibold text-gray-600">Téléphone</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{application.telephone || '—'}</dd>
                      </div>
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <dt className="text-xs font-semibold text-gray-600">Ville</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{application.ville || '—'}</dd>
                      </div>
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <dt className="text-xs font-semibold text-gray-600">Rôle</dt>
                        <dd className="mt-1 font-semibold text-gray-900">{application.offer_type_label || application.role_label || (application.role === 'designer' ? 'Designer' : 'Développeur')}</dd>
                      </div>
                      <div className="rounded-xl border bg-gray-50 p-4">
                        <dt className="text-xs font-semibold text-gray-600">Email</dt>
                        <dd className="mt-1 font-semibold text-gray-900 break-all">{application.email || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border bg-white p-5">
                    <div className="text-sm font-extrabold text-gray-900">Décision</div>
                    {isPending ? (
                      <>
                        <div className="mt-1 text-sm text-gray-600">
                          Approuver pour activer la messagerie candidat ↔ admin. Rejeter en envoyant un message (le candidat ne pourra pas répondre).
                        </div>

                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3 items-end">
                          <div className="lg:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Message (optionnel pour approuver, requis pour rejeter)</label>
                            <textarea
                              value={decisionMessage}
                              onChange={(e) => setDecisionMessage(e.target.value)}
                              rows={3}
                              className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                              placeholder="Ex: Votre candidature est approuvée. On vous recontacte pour la suite…"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row gap-2 justify-end">
                            <button
                              type="button"
                              disabled={updatingStatus}
                              onClick={() => updateStatus('approved')}
                              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-60"
                            >
                              Approuver
                            </button>
                            <button
                              type="button"
                              disabled={updatingStatus}
                              onClick={() => updateStatus('rejected')}
                              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold disabled:opacity-60"
                            >
                              Rejeter
                            </button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="mt-1 text-sm text-gray-600">
                        Décision déjà prise : cette candidature est <span className="font-semibold">{statusLabel(application?.status)}</span>.
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="rounded-2xl border bg-white p-5">
                    <div className="text-sm font-extrabold text-gray-900">Documents</div>
                    <div className="mt-1 text-sm text-gray-600">Accès direct aux fichiers du candidat.</div>
                    <div className="mt-4 grid grid-cols-1 gap-2">
                      <a
                        href={application.portfolio || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-semibold ${application.portfolio ? 'bg-white hover:bg-gray-50 text-blue-700' : 'bg-gray-50 text-gray-500 cursor-not-allowed pointer-events-none'}`}
                        aria-disabled={!application.portfolio}
                      >
                        <span>Portfolio</span>
                        <span className="text-xs">{application.portfolio ? 'Ouvrir' : '—'}</span>
                      </a>
                      <a
                        href={application.cv ? applicationService.normalizePublicAssetUrl(application.cv) : '#'}
                        target="_blank"
                        rel="noreferrer"
                        className={`inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl border text-sm font-semibold ${application.cv ? 'bg-white hover:bg-gray-50 text-blue-700' : 'bg-gray-50 text-gray-500 cursor-not-allowed pointer-events-none'}`}
                        aria-disabled={!application.cv}
                      >
                        <span>CV</span>
                        <span className="text-xs">{application.cv ? 'Ouvrir' : '—'}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {avatarModalOpen && avatarSrc && !avatarLoadFailed ? (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div
            ref={avatarModalRef}
            className="w-full max-w-lg bg-white rounded-2xl shadow-sm border overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Photo de profil"
          >
            <div className="flex items-center justify-end p-3 border-b bg-white">
              <button
                type="button"
                onClick={() => setAvatarModalOpen(false)}
                className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-gray-800 text-sm font-bold"
              >
                Retour
              </button>
            </div>

            <div className="p-4 bg-gray-50">
              <div className="rounded-2xl overflow-hidden border bg-white">
                <img src={avatarSrc} alt="Profil" className="w-full h-auto object-contain" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

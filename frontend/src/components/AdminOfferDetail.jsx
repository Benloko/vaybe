import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function AdminOfferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offer, setOffer] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deletePanelOpen, setDeletePanelOpen] = useState(false);
  const [deleteCheckLoading, setDeleteCheckLoading] = useState(false);
  const [deleteCheckError, setDeleteCheckError] = useState('');
  const [deleteCheck, setDeleteCheck] = useState(null);
  const [notifyBody, setNotifyBody] = useState('');
  const [notifyBusy, setNotifyBusy] = useState(false);
  const [notifyResult, setNotifyResult] = useState('');

  const toastTimerRef = useRef(null);
  const [toast, setToast] = useState(null); // { kind: 'success' | 'error', message: string }

  const showToast = ({ kind, message }) => {
    const k = kind === 'error' ? 'error' : 'success';
    const m = String(message || '').trim();
    if (!m) return;

    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToast({ kind: k, message: m });
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, 3800);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, []);

  const [offerTypes, setOfferTypes] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editDraft, setEditDraft] = useState({
    title: '',
    type: 'dev',
    description: '',
    is_open: true,
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');

      try {
        const [offerPayload, typesPayload] = await Promise.all([
          applicationService.getOffer(id),
          applicationService.getOfferTypes().catch(() => null),
        ]);
        if (!alive) return;
        setOffer(offerPayload?.data || null);
        setOfferTypes(Array.isArray(typesPayload?.data) ? typesPayload.data : []);
      } catch (err) {
        if (!alive) return;
        setError(err?.message || "Impossible de charger l'offre.");
        setOffer(null);
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

  useEffect(() => {
    if (!offer) return;
    setEditDraft({
      title: String(offer?.title || ''),
      type: String(offer?.type || 'dev') || 'dev',
      description: String(offer?.description || ''),
      is_open: Boolean(offer?.is_open),
    });
  }, [offer]);

  const typeLabelMap = useMemo(() => {
    const map = new Map();
    for (const t of offerTypes || []) {
      const k = String(t?.key || '').trim();
      const label = String(t?.label || '').trim();
      if (!k) continue;
      if (!label) continue;
      map.set(k, label);
    }
    return map;
  }, [offerTypes]);

  const typeLabel = useMemo(() => {
    const key = String(offer?.type || '').trim();
    if (!key) return '—';
    const label = String(typeLabelMap.get(key) || '').trim();
    if (label) return label;
    return key.charAt(0).toUpperCase() + key.slice(1);
  }, [offer?.type, typeLabelMap]);

  const isOpen = Boolean(offer?.is_open);

  const openEdit = () => {
    if (!offer?.id) return;
    setEditError('');
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditError('');
  };

  const saveEdit = async () => {
    if (!offer?.id) return;
    if (editSaving) return;
    const title = String(editDraft?.title || '').trim();
    if (!title) {
      setEditError('Le titre est obligatoire.');
      return;
    }

    setEditSaving(true);
    setEditError('');
    try {
      await applicationService.updateOffer(offer.id, {
        title,
        type: String(editDraft?.type || 'dev') || 'dev',
        description: String(editDraft?.description || '').trim() || null,
        is_open: Boolean(editDraft?.is_open),
      });

      // Refresh offer details and keep the user on this page.
      const payload = await applicationService.getOffer(offer.id);
      setOffer(payload?.data || null);

      closeEdit();
      showToast({ kind: 'success', message: 'Offre mise à jour.' });
    } catch (err) {
      setEditError(err?.message || "Impossible de mettre à jour l'offre.");
      showToast({ kind: 'error', message: err?.message || "Impossible de mettre à jour l'offre." });
    } finally {
      setEditSaving(false);
    }
  };

  const openDeletePanel = async () => {
    if (!offer?.id) return;
    if (deleteCheckLoading) return;
    setDeleteError('');
    setDeleteCheckError('');
    setNotifyResult('');
    setNotifyBody('');
    setDeletePanelOpen(true);
    setDeleteCheckLoading(true);
    try {
      const payload = await applicationService.getOfferDeletionCheck(offer.id);
      setDeleteCheck(payload?.data || null);
    } catch (err) {
      setDeleteCheck(null);
      setDeleteCheckError(err?.message || 'Impossible de vérifier l\'impact de la suppression.');
    } finally {
      setDeleteCheckLoading(false);
    }
  };

  const sendOfferNotification = async () => {
    if (!offer?.id) return;
    const body = String(notifyBody || '').trim();
    if (!body) {
      setNotifyResult('Le message de notification est obligatoire.');
      return;
    }
    if (notifyBusy) return;
    setNotifyResult('');
    setNotifyBusy(true);
    try {
      const payload = await applicationService.sendAdminNotification({
        body,
        scope: 'offer',
        offer_id: offer.id,
      });
      const count = payload?.data?.count;
      setNotifyResult(`Avertissement envoyé${typeof count === 'number' ? ` (${count})` : ''}.`);

      // Important: envoyer = avertir seulement, puis fermer sans supprimer.
      setDeletePanelOpen(false);
      setDeleteCheckError('');
      showToast({
        kind: 'success',
        message: "Avertissement envoyé. L'offre n'a pas été supprimée.",
      });
    } catch (err) {
      setNotifyResult(err?.message || 'Impossible d\'envoyer la notification.');
      showToast({
        kind: 'error',
        message: err?.message || "Impossible d'envoyer l'avertissement.",
      });
    } finally {
      setNotifyBusy(false);
    }
  };

  const forceDeleteOffer = async ({ withoutNotify } = {}) => {
    if (!offer?.id) return;
    if (deleting) return;

    const title = String(offer?.title || '').trim() || 'cette offre';
    const total = Number(deleteCheck?.applications_total || 0);
    const approved = Number(deleteCheck?.applications_approved || 0);

    const extra = total > 0 ? `\n\nCela supprimera aussi ${total} profil(s) lié(s) (dont ${approved} approuvé(s)).` : '';
    const skip = withoutNotify ? "\n\nAucune notification ne sera envoyée aux candidats." : '';

    if (!window.confirm(`Supprimer définitivement ${title} ?${extra}${skip}`)) return;

    setDeleteError('');
    setDeleting(true);
    try {
      await applicationService.deleteOffer(offer.id, { force: true });

      try {
        sessionStorage.setItem(
          'adminOffersFlash',
          JSON.stringify({
            kind: 'success',
            message: `Vous venez de supprimer l'offre “${title}”.`,
          })
        );
      } catch {
        // ignore
      }

      navigate('/admin/offres', { replace: true });
    } catch (err) {
      setDeleteError(err?.message || 'Impossible de supprimer cette offre.');
      showToast({
        kind: 'error',
        message: err?.message || "Impossible de supprimer l'offre.",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full sm:max-w-4xl sm:mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      {editOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-lg rounded-2xl border bg-white shadow-sm overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Modifier l'offre"
          >
            <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-white/90">Espace admin</div>
                  <div className="text-base sm:text-lg font-extrabold">Modifier l'offre</div>
                </div>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="inline-flex items-center justify-center rounded-xl p-2 border border-white/20 bg-white/10 hover:bg-white/15"
                  aria-label="Fermer"
                  title="Fermer"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[78vh] overflow-auto">
              {editError && (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{editError}</div>
              )}

              <div>
                <div className="text-xs font-semibold text-gray-700">Titre</div>
                <input
                  value={editDraft.title}
                  onChange={(e) => setEditDraft((d) => ({ ...d, title: e.target.value }))}
                  className="mt-2 w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-sm"
                  placeholder="Titre de l'offre"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-xs font-semibold text-gray-700">Type</div>
                  <select
                    value={editDraft.type}
                    onChange={(e) => setEditDraft((d) => ({ ...d, type: e.target.value }))}
                    className="mt-2 w-full px-3 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                  >
                    {(offerTypes || []).map((t) => (
                      <option key={String(t?.key || t?.id)} value={String(t?.key || '')}>
                        {String(t?.label || t?.key || '').trim() || String(t?.key || '').trim()}
                      </option>
                    ))}
                    {/* fallback */}
                    {!Array.isArray(offerTypes) || offerTypes.length === 0 ? (
                      <>
                        <option value="dev">Dev</option>
                        <option value="designer">Designer</option>
                      </>
                    ) : null}
                  </select>
                </div>

                <div>
                  <div className="text-xs font-semibold text-gray-700">Statut</div>
                  <button
                    type="button"
                    onClick={() => setEditDraft((d) => ({ ...d, is_open: !Boolean(d?.is_open) }))}
                    className={`mt-2 w-full inline-flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 border text-sm font-semibold ${
                      editDraft.is_open
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-gray-200 bg-gray-50 text-gray-900'
                    }`}
                  >
                    <span>{editDraft.is_open ? 'Ouverte' : 'Fermée'}</span>
                    <span className="text-xs opacity-80">Changer</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">Description</div>
                <textarea
                  value={editDraft.description}
                  onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                  className="mt-2 w-full min-h-[120px] px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-sm"
                  placeholder="Description de l'offre"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={editSaving}
                  className="px-4 py-2.5 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold disabled:opacity-60"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold disabled:opacity-60"
                >
                  {editSaving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed left-1/2 -translate-x-1/2 bottom-6 z-[60] px-4">
          <div
            className={`max-w-[92vw] sm:max-w-md rounded-2xl border shadow-sm px-4 py-3 text-sm font-semibold ${
              toast.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900'
            }`}
            role="status"
            aria-live="polite"
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="bg-white sm:rounded-2xl rounded-none shadow-sm border-y sm:border overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm text-white/90">Espace admin</div>
              <h1 className="text-xl sm:text-3xl font-extrabold truncate sm:whitespace-normal">
                {offer?.title || (loading ? 'Chargement…' : "Détails de l'offre")}
              </h1>
              {!loading && offer && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                    Type : {typeLabel}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${
                      isOpen
                        ? 'bg-emerald-400/15 text-emerald-50 ring-emerald-200/30'
                        : 'bg-white/10 text-white/90 ring-white/15'
                    }`}
                  >
                    {isOpen ? 'Ouverte' : 'Fermée'}
                  </span>
                </div>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                to="/admin/offres"
                className="inline-flex items-center justify-center rounded-xl p-2 border border-white/20 bg-white/10 hover:bg-white/15"
                aria-label="Retour aux offres"
                title="Retour"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
              {!loading && offer?.id && (
                <>
                  <button
                    type="button"
                    onClick={openEdit}
                    className="inline-flex items-center justify-center rounded-xl p-2 bg-white text-blue-700 hover:bg-white/90"
                    aria-label="Modifier"
                    title="Modifier"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={openDeletePanel}
                    disabled={deleting}
                    className="inline-flex items-center justify-center rounded-xl p-2 bg-white text-red-600 hover:bg-white/90 disabled:opacity-60"
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M19 6l-1 14H6L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-0 py-4 sm:p-6 space-y-4">
          {deleteError && (
            <div className="px-5 sm:px-0">
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800">
                <div className="font-extrabold">Suppression impossible</div>
                <div className="mt-1 text-sm">{deleteError}</div>
              </div>
            </div>
          )}

          {deletePanelOpen && !loading && offer && (
            <div className="px-5 sm:px-0">
              <div className="rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-amber-200 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-amber-900">Suppression d'une offre</div>
                    <div className="text-xs text-amber-800">Vérifie l'impact avant de forcer la suppression.</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDeletePanelOpen(false);
                      setDeleteCheckError('');
                      setNotifyResult('');
                    }}
                    className="inline-flex items-center justify-center rounded-xl p-2 border border-amber-200 bg-white/60 hover:bg-white"
                    aria-label="Fermer"
                    title="Fermer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-amber-900" aria-hidden="true">
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {deleteCheckLoading ? (
                    <div className="text-sm text-amber-900">Chargement…</div>
                  ) : deleteCheckError ? (
                    <div className="text-sm text-red-800">{deleteCheckError}</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="rounded-xl border border-amber-200 bg-white/60 p-3">
                        <div className="text-[11px] font-semibold text-amber-800">Profils liés</div>
                        <div className="mt-1 text-sm font-extrabold text-amber-950">{Number(deleteCheck?.applications_total || 0)}</div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-white/60 p-3">
                        <div className="text-[11px] font-semibold text-amber-800">En cours</div>
                        <div className="mt-1 text-sm font-extrabold text-amber-950">{Number(deleteCheck?.applications_pending || 0)}</div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-white/60 p-3">
                        <div className="text-[11px] font-semibold text-amber-800">Approuvés</div>
                        <div className="mt-1 text-sm font-extrabold text-amber-950">{Number(deleteCheck?.applications_approved || 0)}</div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-white/60 p-3">
                        <div className="text-[11px] font-semibold text-amber-800">Rejetés</div>
                        <div className="mt-1 text-sm font-extrabold text-amber-950">{Number(deleteCheck?.applications_rejected || 0)}</div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-amber-200 bg-white/60 p-4">
                    <div className="text-sm font-extrabold text-amber-950">Envoyer seulement un avertissement (optionnel)</div>
                    <div className="mt-1 text-xs text-amber-800">
                      Envoie une notification à tous les profils qui ont postulé à cette offre, puis ferme ce panneau (sans supprimer).
                    </div>
                    <textarea
                      value={notifyBody}
                      onChange={(e) => setNotifyBody(e.target.value)}
                      className="mt-3 w-full min-h-[96px] px-3 py-2.5 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                      placeholder="Ex: Cette offre a été retirée. Votre profil lié à cette offre sera supprimé."
                    />

                    {notifyResult && (
                      <div className={`mt-2 text-sm ${notifyResult.toLowerCase().includes('envoy') ? 'text-emerald-800' : 'text-amber-900'}`}>{notifyResult}</div>
                    )}

                    <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={sendOfferNotification}
                        disabled={notifyBusy || deleteCheckLoading}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-white/90 border border-amber-200 text-amber-900 text-sm font-extrabold disabled:opacity-60"
                      >
                        Envoyer un avertissement
                      </button>
                      <button
                        type="button"
                        onClick={() => forceDeleteOffer({ withoutNotify: true })}
                        disabled={deleting || deleteCheckLoading}
                        className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-extrabold disabled:opacity-60"
                      >
                        Forcer la suppression
                      </button>
                    </div>
                    <div className="mt-2 text-xs text-amber-800">
                      La suppression forcée supprime directement (sans envoyer de message) et supprimera aussi les profils liés à cette offre (admin + côté candidats).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="px-5 sm:px-0">
              <div className="p-4 rounded-2xl border bg-gray-50 text-gray-700">Chargement…</div>
            </div>
          ) : error ? (
            <div className="px-5 sm:px-0">
              <div className="p-4 rounded-2xl border border-red-200 bg-red-50 text-red-800">
                <div className="font-extrabold">Oups…</div>
                <div className="mt-1 text-sm">{error}</div>
              </div>
            </div>
          ) : !offer ? (
            <div className="px-5 sm:px-0">
              <div className="p-4 rounded-2xl border bg-gray-50 text-gray-700">Offre introuvable.</div>
            </div>
          ) : (
            <div className="px-5 sm:px-0 space-y-4">
              <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-4 py-3 border-b bg-gray-50">
                  <div className="text-sm font-extrabold text-gray-900">Détails</div>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-[11px] font-semibold text-gray-600">Type</div>
                      <div className="mt-1 text-sm font-extrabold text-gray-900">{typeLabel}</div>
                    </div>
                    <div className="rounded-xl border border-gray-200 bg-white p-3">
                      <div className="text-[11px] font-semibold text-gray-600">Statut</div>
                      <div className="mt-1">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                            isOpen
                              ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                              : 'bg-gray-50 text-gray-800 ring-gray-200'
                          }`}
                        >
                          {isOpen ? 'Ouverte' : 'Fermée'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-3">
                    <div className="text-[11px] font-semibold text-gray-600">Description</div>
                    {String(offer.description || '').trim() ? (
                      <div className="mt-2 text-sm text-gray-800 whitespace-pre-wrap">{offer.description}</div>
                    ) : (
                      <div className="mt-2 text-sm text-gray-500">Aucun détail renseigné.</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

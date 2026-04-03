import { useEffect, useMemo, useState } from 'react';
import { applicationService } from '../services/api';

const LS_KEYS = {
  adminNotesLegacy: 'adminNotes',
  adminNotesV2: 'adminNotesV2',
};

function safeGet(key, fallback = '') {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : String(v);
  } catch {
    return fallback;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

function safeGetJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function safeSetJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function makeId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `note_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function formatShortDate(iso) {
  try {
    const d = new Date(String(iso || ''));
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Modal({ open, title, subtitle, onClose, children, tone = 'default', headerActions = null }) {
  if (!open) return null;

  const toneBar =
    tone === 'violet'
      ? 'from-violet-600 to-fuchsia-600'
      : tone === 'blue'
        ? 'from-blue-600 to-indigo-600'
        : tone === 'rose'
          ? 'from-rose-500 to-pink-500'
          : 'from-gray-800 to-gray-700';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-full sm:max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl border overflow-hidden max-h-[85vh] flex flex-col">
          <div className={`px-5 py-4 bg-gradient-to-r ${toneBar} text-white`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base sm:text-lg font-extrabold truncate">{title}</div>
                {subtitle ? <div className="mt-0.5 text-xs text-white/90">{subtitle}</div> : null}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm font-semibold"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  const [activeAction, setActiveAction] = useState('profile');
  const [serverEmail, setServerEmail] = useState(() => safeGet('adminEmail', ''));
  const [adminEmail, setAdminEmail] = useState(() => safeGet('adminEmail', ''));

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [profileModal, setProfileModal] = useState({ open: false, mode: null });
  const openProfileModal = (mode) => {
    setProfileError('');
    setProfileSuccess('');
    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirmation('');
    setAdminEmail((v) => String(v || '').trim() || String(serverEmail || '').trim());
    setProfileModal({ open: true, mode });
  };
  const closeProfileModal = () => setProfileModal({ open: false, mode: null });

  const [notes, setNotes] = useState(() => {
    const v2 = safeGetJson(LS_KEYS.adminNotesV2, null);
    if (Array.isArray(v2)) return v2;

    const legacy = safeGet(LS_KEYS.adminNotesLegacy, '').trim();
    if (legacy) {
      const migrated = [
        {
          id: makeId(),
          title: 'Note importée',
          body: legacy,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      safeSetJson(LS_KEYS.adminNotesV2, migrated);
      safeSet(LS_KEYS.adminNotesLegacy, '');
      return migrated;
    }

    return [];
  });
  const [notesQuery, setNotesQuery] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(() => {
    const v2 = safeGetJson(LS_KEYS.adminNotesV2, null);
    if (Array.isArray(v2) && v2[0]?.id) return String(v2[0].id);
    return null;
  });

  const filteredNotes = useMemo(() => {
    const q = String(notesQuery || '').trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => {
      const title = String(n?.title || '').toLowerCase();
      const body = String(n?.body || '').toLowerCase();
      return title.includes(q) || body.includes(q);
    });
  }, [notes, notesQuery]);

  const [noteModal, setNoteModal] = useState({ open: false, mode: null, id: null });
  const [noteEditMode, setNoteEditMode] = useState(false);
  const [noteDraftTitle, setNoteDraftTitle] = useState('');
  const [noteDraftBody, setNoteDraftBody] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const activeModalNote = useMemo(() => {
    if (!noteModal?.open) return null;
    if (!noteModal?.id) return null;
    return notes.find((n) => String(n?.id) === String(noteModal.id)) || null;
  }, [noteModal?.open, noteModal?.id, notes]);

  const openNewNoteModal = () => {
    const id = makeId();
    setNoteDraftTitle('');
    setNoteDraftBody('');
    setNoteEditMode(true);
    setNoteModal({ open: true, mode: 'create', id });
  };

  const openExistingNoteModal = (id) => {
    const n = notes.find((x) => String(x?.id) === String(id));
    if (!n) return;
    setNoteDraftTitle(String(n?.title || ''));
    setNoteDraftBody(String(n?.body || ''));
    setNoteEditMode(false);
    setNoteModal({ open: true, mode: 'view', id: String(id) });
  };

  const closeNoteModal = () => {
    setNoteModal({ open: false, mode: null, id: null });
    setNoteEditMode(false);
  };

  const persistNotes = (next) => {
    setNotes(next);
    safeSetJson(LS_KEYS.adminNotesV2, next);
  };

  const updateNote = (id, patch) => {
    const targetId = String(id || '').trim();
    if (!targetId) return;

    const now = new Date().toISOString();
    const nextNotes = notes.map((n) => {
      if (String(n?.id) !== targetId) return n;
      return {
        ...n,
        ...patch,
        updatedAt: now,
      };
    });
    persistNotes(nextNotes);
  };

  const requestDeleteNote = (id) => {
    const targetId = String(id || '').trim();
    if (!targetId) return;
    setConfirmDelete({ open: true, id: targetId });
  };

  const performDeleteNote = (id) => {
    const targetId = String(id || '').trim();
    if (!targetId) return;

    const nextNotes = notes.filter((n) => String(n?.id) !== targetId);
    persistNotes(nextNotes);
    if (String(selectedNoteId) === targetId) {
      setSelectedNoteId(nextNotes[0]?.id ? String(nextNotes[0].id) : null);
    }

    if (noteModal?.open && String(noteModal?.id) === targetId) {
      closeNoteModal();
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setProfileLoading(true);
      setProfileError('');
      setProfileSuccess('');

      try {
        const payload = await applicationService.getAdminProfile();
        const email = String(payload?.data?.email || '').trim();
        if (!cancelled && email) {
          setServerEmail(email);
          setAdminEmail(email);
          safeSet('adminEmail', email);
          try {
            window.dispatchEvent(new Event('adminSessionChanged'));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        if (!cancelled) setProfileError(err?.message || 'Erreur lors du chargement');
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activeAction !== 'notes') return;
    if (notes.length === 0) return;
    if (selectedNoteId) return;
    if (notes[0]?.id) setSelectedNoteId(String(notes[0].id));
  }, [activeAction, notes, selectedNoteId]);

  const copyAdminEmail = async () => {
    const text = String(adminEmail || '').trim();
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return;
      }
    } catch {
      // ignore
    }

    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand('copy');
      ta.remove();
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full sm:max-w-6xl sm:mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="bg-white sm:rounded-2xl rounded-none shadow-sm border-y sm:border overflow-hidden">
        <div className="px-4 py-3 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-sm text-white/90">Espace admin</div>
          <h1 className="text-xl sm:text-3xl font-extrabold">Paramètres</h1>
          <p className="mt-1 text-white/90">Profil admin et notes.</p>
        </div>

        <div className="px-0 py-4 sm:p-6">
          <div className="mx-4 sm:mx-0">
            <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div aria-hidden="true" className="h-1 bg-gradient-to-r from-slate-900 to-slate-700" />
              <div className="p-4">
                <div className="text-sm font-extrabold text-gray-900">Actions</div>
                <div className="mt-1 text-sm text-gray-600">Choisis ce que tu veux gérer.</div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveAction('profile')}
                    className={
                      'rounded-2xl border px-4 py-3 text-left ' +
                      (activeAction === 'profile'
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50')
                    }
                  >
                    <div className="text-sm font-extrabold text-gray-900">Profil</div>
                    <div className="mt-1 text-xs text-gray-600">Email, mot de passe, identité</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAction('notes')}
                    className={
                      'rounded-2xl border px-4 py-3 text-left ' +
                      (activeAction === 'notes'
                        ? 'border-violet-200 bg-violet-50'
                        : 'border-gray-200 bg-white hover:bg-gray-50')
                    }
                  >
                    <div className="text-sm font-extrabold text-gray-900">Notes</div>
                    <div className="mt-1 text-xs text-gray-600">Créer, lire, modifier, rechercher</div>
                  </button>
                </div>
              </div>
            </div>

            {activeAction === 'profile' ? (
              <div className="mt-3 rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div aria-hidden="true" className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
                <div className="p-4">
                  <div className="text-sm font-extrabold text-gray-900">Profil admin</div>
                  <div className="mt-1 text-sm text-gray-600">Modifie chaque information proprement.</div>

                  {(profileLoading || profileError || profileSuccess) && (
                    <div className="mt-3 space-y-2">
                      {profileLoading && (
                        <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm">Chargement…</div>
                      )}
                      {profileError && (
                        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{profileError}</div>
                      )}
                      {profileSuccess && (
                        <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
                          {profileSuccess}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 space-y-2">
                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-500">Email (serveur)</div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="text-sm font-extrabold text-gray-900 truncate">{serverEmail || adminEmail || '—'}</div>
                            <button
                              type="button"
                              onClick={copyAdminEmail}
                              className="inline-flex items-center justify-center rounded-xl px-2.5 py-1.5 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold"
                            >
                              Copier
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openProfileModal('email')}
                          className="shrink-0 inline-flex items-center justify-center rounded-xl px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        >
                          Modifier
                        </button>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-200 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-500">Mot de passe (serveur)</div>
                          <div className="mt-1 text-sm font-extrabold text-gray-900">••••••••</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openProfileModal('password')}
                          className="shrink-0 inline-flex items-center justify-center rounded-xl px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                        >
                          Changer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeAction === 'notes' ? (
              <div className="mt-3 rounded-2xl border bg-white shadow-sm overflow-hidden">
                <div aria-hidden="true" className="h-1 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
                <div className="p-4">
                  <div className="text-sm font-extrabold text-gray-900">Notes admin</div>
                  <div className="mt-1 text-sm text-gray-600">Tout se fait dans une petite fenêtre propre.</div>

                  <div className="mt-3 flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          <path
                            d="M16.4 16.4 21 21"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      <input
                        value={notesQuery}
                        onChange={(e) => setNotesQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border rounded-2xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent border-gray-200 text-sm"
                        placeholder="Rechercher une note…"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={openNewNoteModal}
                      className="shrink-0 inline-flex items-center justify-center rounded-2xl px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm"
                    >
                      Ajouter
                    </button>
                  </div>

                  {filteredNotes.length === 0 ? (
                    <div className="mt-3 p-4 rounded-2xl border border-dashed bg-gray-50 text-sm text-gray-700">
                      Aucune note pour l’instant.
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      {filteredNotes.map((n) => {
                        const id = String(n?.id);
                        const title = String(n?.title || '').trim() || 'Sans titre';
                        const body = String(n?.body || '').trim();
                        const snippet = body.length > 120 ? `${body.slice(0, 120)}…` : body;

                        return (
                          <div
                            key={id}
                            className="group rounded-2xl border border-gray-200 bg-white p-4 hover:bg-gray-50 hover:shadow-sm transition-shadow"
                            role="button"
                            tabIndex={0}
                            onClick={() => openExistingNoteModal(id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openExistingNoteModal(id);
                              }
                            }}
                          >
                            <div aria-hidden="true" className="-mx-4 -mt-4 mb-3 h-1 bg-gradient-to-r from-violet-600/70 to-fuchsia-600/70" />
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-extrabold text-gray-900 truncate">{title}</div>
                                <div className="mt-1 text-xs text-gray-500">{formatShortDate(n?.updatedAt || n?.createdAt)}</div>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <button
                                  type="button"
                                  aria-label="Éditer"
                                  title="Éditer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openExistingNoteModal(id);
                                    setNoteEditMode(true);
                                  }}
                                  className="inline-flex items-center justify-center rounded-xl p-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 shadow-sm"
                                >
                                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                      d="M12 20h9"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                                <button
                                  type="button"
                                  aria-label="Supprimer"
                                  title="Supprimer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    requestDeleteNote(id);
                                  }}
                                  className="inline-flex items-center justify-center rounded-xl p-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-sm"
                                >
                                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                      d="M3 6h18"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M8 6V4h8v2"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M19 6l-1 14H6L5 6"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M10 11v6"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                    <path
                                      d="M14 11v6"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            {snippet ? <div className="mt-2 text-sm text-gray-700">{snippet}</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-3 text-xs text-gray-500">Stocké sur cet appareil (localStorage).</div>
                </div>
              </div>
            ) : null}

            <div className="mt-3 rounded-2xl border bg-white shadow-sm overflow-hidden">
              <div aria-hidden="true" className="h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
              <div className="p-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold text-gray-900">Sécurité</div>
                  <div className="text-sm text-gray-600">Nettoyer la session admin sur cet appareil</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    applicationService.clearAdminSession();
                    try {
                      applicationService.clearCandidateLogoutContext();
                    } catch {
                      // ignore
                    }

                    try {
                      window.location.replace('/onboarding');
                    } catch {
                      // ignore
                    }
                  }}
                  className="shrink-0 inline-flex items-center justify-center rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          <div className="mx-4 sm:mx-0 mt-4 text-xs text-gray-500">
            Astuce: si une page admin affiche “Session admin expirée”, reconnecte-toi.
          </div>
        </div>
      </div>

      <Modal
        open={profileModal.open}
        title={
          profileModal.mode === 'email'
              ? 'Modifier l’email'
              : profileModal.mode === 'password'
                ? 'Changer le mot de passe'
                : 'Profil'
        }
        subtitle={'Modifications côté serveur'}
        tone="blue"
        onClose={closeProfileModal}
      >
        {profileError ? (
          <div className="mb-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{profileError}</div>
        ) : null}
        {profileSuccess ? (
          <div className="mb-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">{profileSuccess}</div>
        ) : null}

        {profileModal.mode === 'email' ? (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-700">Nouvel email</div>
              <input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                placeholder="admin@exemple.com"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
              />
              <div className="mt-1 text-xs text-gray-500">Email actuel: <span className="font-semibold text-gray-700">{serverEmail || '—'}</span></div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-700">Mot de passe actuel</div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={profileSaving}
                onClick={async () => {
                  setProfileSaving(true);
                  setProfileError('');
                  setProfileSuccess('');
                  try {
                    const trimmedEmail = String(adminEmail || '').trim();
                    if (!trimmedEmail) throw new Error('Email manquant.');
                    if (trimmedEmail === String(serverEmail || '').trim()) throw new Error('Aucune modification.');
                    if (!String(currentPassword || '').trim()) throw new Error('Mot de passe actuel requis.');

                    const payload = await applicationService.updateAdminProfile({
                      email: trimmedEmail,
                      current_password: currentPassword,
                    });

                    const email = String(payload?.data?.email || '').trim();
                    if (email) {
                      setServerEmail(email);
                      setAdminEmail(email);
                      safeSet('adminEmail', email);
                      try {
                        window.dispatchEvent(new Event('adminSessionChanged'));
                      } catch {
                        // ignore
                      }
                    }

                    setCurrentPassword('');
                    setProfileSuccess('Email mis à jour.');
                    closeProfileModal();
                  } catch (err) {
                    setProfileError(err?.message || 'Erreur lors de la mise à jour');
                  } finally {
                    setProfileSaving(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {profileSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : null}

        {profileModal.mode === 'password' ? (
          <div className="space-y-3">
            <div>
              <div className="text-xs font-semibold text-gray-700">Mot de passe actuel</div>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-700">Nouveau mot de passe</div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                  placeholder="Min. 8 caractères"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700">Confirmation</div>
                <input
                  type="password"
                  value={newPasswordConfirmation}
                  onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                  className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                  placeholder="Répéter"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={profileSaving}
                onClick={async () => {
                  setProfileSaving(true);
                  setProfileError('');
                  setProfileSuccess('');
                  try {
                    if (!String(currentPassword || '').trim()) throw new Error('Mot de passe actuel requis.');
                    const nextPassword = String(newPassword || '');
                    if (!nextPassword.trim()) throw new Error('Nouveau mot de passe manquant.');
                    if (nextPassword.length < 8) throw new Error('Le mot de passe doit faire au moins 8 caractères.');
                    if (String(newPasswordConfirmation || '') !== nextPassword) {
                      throw new Error('La confirmation du mot de passe ne correspond pas.');
                    }

                    await applicationService.updateAdminProfile({
                      current_password: currentPassword,
                      new_password: nextPassword,
                      new_password_confirmation: newPasswordConfirmation,
                    });

                    setCurrentPassword('');
                    setNewPassword('');
                    setNewPasswordConfirmation('');
                    setProfileSuccess('Mot de passe mis à jour.');
                    closeProfileModal();
                  } catch (err) {
                    setProfileError(err?.message || 'Erreur lors de la mise à jour');
                  } finally {
                    setProfileSaving(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
              >
                {profileSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={noteModal.open}
        title={
          noteModal.mode === 'create'
            ? 'Nouvelle note'
            : (String(activeModalNote?.title || '').trim() || 'Note')
        }
        subtitle={noteModal.mode === 'create' ? 'Remplis les infos puis enregistre' : (noteEditMode ? 'Modification' : 'Lecture')}
        tone="violet"
        headerActions={
          noteModal.mode !== 'create' && activeModalNote ? (
            <>
              {!noteEditMode ? (
                <button
                  type="button"
                  aria-label="Modifier"
                  title="Modifier"
                  onClick={() => setNoteEditMode(true)}
                  className="inline-flex items-center justify-center rounded-xl p-2 bg-white/10 hover:bg-white/20 text-white"
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 20h9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Supprimer"
                title="Supprimer"
                onClick={() => requestDeleteNote(activeModalNote.id)}
                className="inline-flex items-center justify-center rounded-xl p-2 bg-white/10 hover:bg-white/20 text-white ring-1 ring-white/20"
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M3 6h18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 6V4h8v2"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 6l-1 14H6L5 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M10 11v6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 11v6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          ) : null
        }
        onClose={closeNoteModal}
      >
        {(() => {
          const existing = activeModalNote;
          const updatedAt = existing?.updatedAt || existing?.createdAt;

          return (
            <div className="space-y-3">
              {noteModal.mode !== 'create' && existing ? (
                <div className="text-xs text-gray-500">{updatedAt ? `Mis à jour: ${formatShortDate(updatedAt)}` : ''}</div>
              ) : null}

              {noteEditMode || noteModal.mode === 'create' ? (
                <>
                  <div>
                    <div className="text-xs font-semibold text-gray-700">Titre</div>
                    <input
                      value={noteDraftTitle}
                      onChange={(e) => setNoteDraftTitle(e.target.value)}
                      className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent border-gray-300"
                      placeholder="Ex: À faire demain"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-gray-700">Contenu</div>
                    <textarea
                      value={noteDraftBody}
                      onChange={(e) => setNoteDraftBody(e.target.value)}
                      rows={6}
                      className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-transparent border-gray-300"
                      placeholder="Écris ici…"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (noteModal.mode === 'create') {
                          closeNoteModal();
                          return;
                        }
                        if (!existing) {
                          closeNoteModal();
                          return;
                        }
                        setNoteDraftTitle(String(existing?.title || ''));
                        setNoteDraftBody(String(existing?.body || ''));
                        setNoteEditMode(false);
                      }}
                      className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date().toISOString();
                        const title = String(noteDraftTitle || '').trim();
                        const body = String(noteDraftBody || '').trim();

                        if (noteModal.mode === 'create') {
                          const id = String(noteModal.id);
                          const next = {
                            id,
                            title,
                            body,
                            createdAt: now,
                            updatedAt: now,
                          };
                          const nextNotes = [next, ...notes];
                          persistNotes(nextNotes);
                          setSelectedNoteId(String(id));
                          closeNoteModal();
                          return;
                        }

                        if (existing) {
                          updateNote(existing.id, { title, body });
                          setSelectedNoteId(String(existing.id));
                          setNoteEditMode(false);
                          closeNoteModal();
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold"
                    >
                      Enregistrer
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-lg font-extrabold text-gray-900">{String(existing?.title || '').trim() || 'Sans titre'}</div>
                  {String(existing?.body || '').trim() ? (
                    <div className="whitespace-pre-wrap text-sm text-gray-700">{String(existing?.body || '')}</div>
                  ) : (
                    <div className="text-sm text-gray-500">(Vide)</div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      <Modal
        open={confirmDelete.open}
        title="Supprimer la note ?"
        subtitle="Cette action est définitive."
        tone="rose"
        onClose={() => setConfirmDelete({ open: false, id: null })}
      >
        <div className="text-sm text-gray-700">Tu es sûr de vouloir supprimer cette note ?</div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete({ open: false, id: null })}
            className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => {
              const id = confirmDelete?.id;
              setConfirmDelete({ open: false, id: null });
              performDeleteNote(id);
            }}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold"
          >
            Supprimer
          </button>
        </div>
      </Modal>
    </div>
  );
}

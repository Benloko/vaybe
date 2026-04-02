import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { applicationService } from '../services/api';

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminOffers() {
  const location = useLocation();

  const uiDensity = useMemo(() => {
    try {
      return localStorage.getItem('adminUiDensity') || 'compact';
    } catch {
      return 'compact';
    }
  }, []);

  const uiMotion = useMemo(() => {
    try {
      return localStorage.getItem('adminUiMotion') || 'on';
    } catch {
      return 'on';
    }
  }, []);

  const isCompact = uiDensity !== 'comfortable';
  const motionOn = uiMotion !== 'off';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState([]);

  const [offerTypes, setOfferTypes] = useState([]);
  const [offerTypesError, setOfferTypesError] = useState('');
  const [offerTypesLoading, setOfferTypesLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [openFilter, setOpenFilter] = useState('all');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('dev');
  const [description, setDescription] = useState('');
  const [isOpen, setIsOpen] = useState(true);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [formTypeOpen, setFormTypeOpen] = useState(false);
  const [formTypePos, setFormTypePos] = useState(null);

  const previewSlug = useMemo(() => slugify(title), [title]);
  const isEditing = editingId !== null;

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null); // 'type' | 'status' | null
  const mobileControlsRef = useRef(null);
  const formModalRef = useRef(null);
  const formTypeButtonRef = useRef(null);
  const formTypePopoverRef = useRef(null);

  const [showTypesModal, setShowTypesModal] = useState(false);
  const typesModalRef = useRef(null);
  const [typesFormName, setTypesFormName] = useState('');
  const [typesEditingId, setTypesEditingId] = useState(null);
  const [typesEditingName, setTypesEditingName] = useState('');
  const [typesBusyId, setTypesBusyId] = useState(null);
  const [typesCreateLoading, setTypesCreateLoading] = useState(false);
  const [typesModalError, setTypesModalError] = useState('');

  const filteredOffers = useMemo(() => {
    const query = String(search || '').trim().toLowerCase();
    return (offers || []).filter((offer) => {
      if (typeFilter !== 'all' && String(offer?.type || '') !== typeFilter) return false;
      if (openFilter !== 'all') {
        const isOpenValue = Boolean(offer?.is_open);
        if (openFilter === 'open' && !isOpenValue) return false;
        if (openFilter === 'closed' && isOpenValue) return false;
      }

      if (!query) return true;
      const haystack = `${offer?.title || ''} ${offer?.type || ''} ${offer?.description || ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [offers, search, typeFilter, openFilter]);

  const load = async () => {
    setError('');
    try {
      setLoading(true);
      const payload = await applicationService.getOffers();
      setOffers(payload?.data || []);
    } catch (err) {
      setError(err?.message || 'Impossible de charger les offres.');
    } finally {
      setLoading(false);
    }
  };

  const loadOfferTypes = async () => {
    setOfferTypesError('');
    try {
      setOfferTypesLoading(true);
      const payload = await applicationService.getOfferTypes();
      setOfferTypes(Array.isArray(payload?.data) ? payload.data : []);
    } catch (err) {
      setOfferTypesError(err?.message || 'Impossible de charger les types.');
      setOfferTypes([]);
    } finally {
      setOfferTypesLoading(false);
    }
  };

  const handleRefresh = async () => {
    setSearch('');
    setTypeFilter('all');
    setOpenFilter('all');
    setMobileSearchOpen(false);
    setMobileFiltersOpen(false);
    setMobileDropdownOpen(null);
    await Promise.all([load(), loadOfferTypes()]);
  };

  useEffect(() => {
    load();
    loadOfferTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showTypesModal) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const root = typesModalRef.current;
      if (!root) return;
      if (root.contains(target)) return;

      setShowTypesModal(false);
      setTypesModalError('');
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setShowTypesModal(false);
      setTypesModalError('');
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showTypesModal]);

  useEffect(() => {
    if (!mobileSearchOpen && !mobileFiltersOpen && !mobileDropdownOpen) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const root = mobileControlsRef.current;
      if (!root) return;
      if (root.contains(target)) return;

      setMobileSearchOpen(false);
      setMobileFiltersOpen(false);
      setMobileDropdownOpen(null);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setMobileSearchOpen(false);
      setMobileFiltersOpen(false);
      setMobileDropdownOpen(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileDropdownOpen, mobileFiltersOpen, mobileSearchOpen]);

  useEffect(() => {
    if (!showForm) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const root = formModalRef.current;
      if (!root) return;
      if (root.contains(target)) return;

      closeForm();
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      closeForm();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showForm]);

  const openFormTypePopover = () => {
    const btn = formTypeButtonRef.current;
    if (!btn) {
      setFormTypePos(null);
      setFormTypeOpen(true);
      return;
    }

    const rect = btn.getBoundingClientRect();
    const maxWidth = 240;
    const minWidth = 180;
    const width = Math.min(maxWidth, Math.max(minWidth, rect.width));
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    const top = Math.min(rect.bottom + 8, window.innerHeight - 12);

    setFormTypePos({ left, top, width });
    setFormTypeOpen(true);
  };

  useEffect(() => {
    if (!formTypeOpen) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const pop = formTypePopoverRef.current;
      const btn = formTypeButtonRef.current;
      if (btn && btn.contains(target)) return;
      if (pop && pop.contains(target)) return;

      setFormTypeOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setFormTypeOpen(false);
    };

    const onAnyScrollOrResize = () => {
      setFormTypeOpen(false);
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
  }, [formTypeOpen]);

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

  const typeLabel = (value) => {
    const key = String(value || '').trim();
    if (!key) return '—';
    const label = String(typeLabelMap.get(key) || '').trim();
    if (label) return label;
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const allTypeKeys = useMemo(() => {
    const keys = new Set();
    for (const t of offerTypes || []) {
      const k = String(t?.key || '').trim();
      if (k) keys.add(k);
    }
    for (const o of offers || []) {
      const k = String(o?.type || '').trim();
      if (k) keys.add(k);
    }
    return Array.from(keys);
  }, [offerTypes, offers]);

  const allTypeOptions = useMemo(() => {
    const arr = allTypeKeys.map((key) => {
      const label = String(typeLabelMap.get(key) || '').trim() || (key.charAt(0).toUpperCase() + key.slice(1));
      return { key, label };
    });
    arr.sort((a, b) => String(a.label).localeCompare(String(b.label)));
    return arr;
  }, [allTypeKeys, typeLabelMap]);

  const resetForm = () => {
    setTitle('');
    setType('dev');
    setDescription('');
    setIsOpen(true);
    setEditingId(null);
    setCreateError('');
    setFormTypeOpen(false);
    setFormTypePos(null);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('new') === '1' && !showForm) {
      startCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const closeForm = () => {
    resetForm();
    setShowForm(false);
  };

  const submit = async () => {
    const safeTitle = title.trim();
    if (!safeTitle) {
      setCreateError('Le titre est obligatoire.');
      return;
    }

    setCreating(true);
    setCreateError('');

    try {
      if (isEditing) {
        await applicationService.updateOffer(editingId, {
          title: safeTitle,
          type,
          description: description.trim() || null,
          is_open: Boolean(isOpen),
        });
      } else {
        await applicationService.createOffer({
          title: safeTitle,
          type,
          description: description.trim() || null,
          is_open: Boolean(isOpen),
        });
      }

      closeForm();

      await load();
    } catch (err) {
      setCreateError(err?.message || (isEditing ? 'Impossible de mettre à jour l\'offre.' : 'Impossible de créer l\'offre.'));
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (offer) => {
    if (!offer) return;
    setEditingId(offer.id);
    setTitle(String(offer.title || ''));
    setType(String(offer.type || 'dev'));
    setDescription(String(offer.description || ''));
    setIsOpen(Boolean(offer.is_open));
    setCreateError('');
    setShowForm(true);
  };

  const openTypesModal = () => {
    setTypesModalError('');
    setTypesFormName('');
    setTypesEditingId(null);
    setTypesEditingName('');
    setShowTypesModal(true);
  };

  const typeKeyFromName = (name) => {
    return String(name || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 50);
  };

  const createType = async () => {
    const name = String(typesFormName || '').trim();
    if (!name) {
      setTypesModalError('Le nom du type est obligatoire.');
      return;
    }

    const key = typeKeyFromName(name);
    if (!key || key.length < 2) {
      setTypesModalError('Nom invalide: essaie un nom plus long (au moins 2 caractères).');
      return;
    }

    setTypesModalError('');
    setTypesCreateLoading(true);
    try {
      await applicationService.createOfferType({ key, label: name });
      await loadOfferTypes();
      setTypesFormName('');
    } catch (err) {
      setTypesModalError(err?.message || 'Impossible d\'ajouter ce type.');
    } finally {
      setTypesCreateLoading(false);
    }
  };

  const startEditType = (t) => {
    if (!t?.id) return;
    setTypesModalError('');
    setTypesEditingId(String(t.id));
    setTypesEditingName(String(t?.label || ''));
  };

  const cancelEditType = () => {
    setTypesEditingId(null);
    setTypesEditingName('');
  };

  const saveEditType = async () => {
    const id = String(typesEditingId || '').trim();
    const name = String(typesEditingName || '').trim();
    if (!id) return;
    if (!name) {
      setTypesModalError('Le nom ne peut pas être vide.');
      return;
    }

    setTypesModalError('');
    setTypesBusyId(id);
    try {
      await applicationService.updateOfferType(id, { label: name });
      await loadOfferTypes();
      cancelEditType();
    } catch (err) {
      setTypesModalError(err?.message || 'Impossible de mettre à jour.');
    } finally {
      setTypesBusyId(null);
    }
  };

  const deleteType = async (t) => {
    if (!t?.id) return;
    const name = String(t?.label || '').trim() || 'ce type';
    if (!window.confirm(`Supprimer ${name} ?`)) return;

    setTypesModalError('');
    setTypesBusyId(String(t.id));
    try {
      await applicationService.deleteOfferType(t.id);
      await loadOfferTypes();

      // Si le type sélectionné disparaît, on remet sur des valeurs safe.
      if (String(type || '') === String(t.key || '')) setType('dev');
      if (String(typeFilter || '') === String(t.key || '')) setTypeFilter('all');
    } catch (err) {
      setTypesModalError(err?.message || 'Impossible de supprimer.');
    } finally {
      setTypesBusyId(null);
    }
  };

  return (
    <div className="w-full sm:max-w-4xl sm:mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="bg-white sm:rounded-2xl rounded-none shadow-sm border-y sm:border overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-sm text-white/90">Espace admin</div>
          <h1 className="text-xl sm:text-3xl font-extrabold">Offres</h1>
          <p className="mt-1 text-white/90 hidden sm:block">Ajoutez des opportunités et leurs détails.</p>
        </div>

        <div className="px-0 py-4 sm:p-6 space-y-6">
          {showTypesModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" />
              <div
                ref={typesModalRef}
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-lg rounded-2xl border bg-white shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-white/90">Espace admin</div>
                      <div className="text-base sm:text-lg font-extrabold">Types d'offre</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowTypesModal(false);
                        setTypesModalError('');
                      }}
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

                <div className="p-5 max-h-[78vh] overflow-auto">
                  {typesModalError && (
                    <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                      {typesModalError}
                    </div>
                  )}

                  {offerTypesError && (
                    <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                      {offerTypesError}
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="text-sm font-extrabold text-gray-900">Ajouter un type</div>
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-gray-700">Nom du type</div>
                      <div className="mt-2 flex flex-col sm:flex-row gap-2">
                        <input
                          value={typesFormName}
                          onChange={(e) => setTypesFormName(e.target.value)}
                          className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-sm"
                          placeholder="Ex: Marketing"
                          autoCorrect="off"
                        />
                        <button
                          type="button"
                          disabled={typesCreateLoading || offerTypesLoading}
                          onClick={createType}
                          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                        >
                          Ajouter
                        </button>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Le système génère automatiquement un code interne (à partir du nom).
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <div className="px-4 py-3 border-b bg-gray-50">
                      <div className="text-sm font-extrabold text-gray-900">Types existants</div>
                    </div>

                    <div className="divide-y">
                      {(offerTypes || []).map((t) => (
                        <div key={t.id} className="p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              {String(typesEditingId || '') === String(t.id) ? (
                                <input
                                  value={typesEditingName}
                                  onChange={(e) => setTypesEditingName(e.target.value)}
                                  className="w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-sm"
                                  placeholder="Nom du type"
                                  autoFocus
                                />
                              ) : (
                                <div className="text-sm font-extrabold text-gray-900 truncate">{String(t?.label || '')}</div>
                              )}
                            </div>

                            <div className="shrink-0 flex items-center gap-2">
                              {String(typesEditingId || '') === String(t.id) ? (
                                <>
                                  <button
                                    type="button"
                                    disabled={String(typesBusyId || '') === String(t.id) || offerTypesLoading}
                                    onClick={saveEditType}
                                    className="inline-flex items-center justify-center rounded-xl p-2 border bg-white hover:bg-gray-50 disabled:opacity-60"
                                    aria-label="Valider"
                                    title="Valider"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-emerald-700" aria-hidden="true">
                                      <path d="M20 6 9 17l-5-5" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={String(typesBusyId || '') === String(t.id) || offerTypesLoading}
                                    onClick={cancelEditType}
                                    className="inline-flex items-center justify-center rounded-xl p-2 border bg-white hover:bg-gray-50 disabled:opacity-60"
                                    aria-label="Annuler"
                                    title="Annuler"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-600" aria-hidden="true">
                                      <path d="M18 6 6 18" />
                                      <path d="m6 6 12 12" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={offerTypesLoading}
                                    onClick={() => startEditType(t)}
                                    className="inline-flex items-center justify-center rounded-xl p-2 border bg-white hover:bg-gray-50 disabled:opacity-60"
                                    aria-label="Éditer"
                                    title="Éditer"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                                      <path d="M12 20h9" />
                                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={String(typesBusyId || '') === String(t.id) || offerTypesLoading}
                                    onClick={() => deleteType(t)}
                                    className="inline-flex items-center justify-center rounded-xl p-2 border bg-white hover:bg-gray-50 disabled:opacity-60"
                                    aria-label="Supprimer"
                                    title="Supprimer"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-red-700" aria-hidden="true">
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
                      ))}
                      {(offerTypes || []).length === 0 ? (
                        <div className="p-4 text-sm text-gray-600">Aucun type.</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" />
              <div
                ref={formModalRef}
                role="dialog"
                aria-modal="true"
                className="relative w-full max-w-xl rounded-2xl border bg-white shadow-sm overflow-hidden"
              >
                <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-white/90">Espace admin</div>
                      <div className="text-base sm:text-lg font-extrabold">
                        {isEditing ? 'Modifier une offre' : 'Ajouter une offre'}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={creating}
                      onClick={closeForm}
                      className="inline-flex items-center justify-center rounded-xl p-2 border border-white/20 bg-white/10 hover:bg-white/15 disabled:opacity-60"
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

                <div className="p-5 max-h-[78vh] overflow-auto">
                  {createError && (
                    <div className="mb-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                      {createError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Titre</label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                        placeholder="Ex: Développeur — Candidature"
                      />
                      <div className="mt-1 text-xs text-gray-500">
                        {isEditing ? 'Slug: inchangé (créé automatiquement)' : `Slug généré: ${previewSlug || '—'}`}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Type</label>
                      <button
                        type="button"
                        ref={formTypeButtonRef}
                        onClick={() => (formTypeOpen ? setFormTypeOpen(false) : openFormTypePopover())}
                        className={`w-full inline-flex items-center justify-between gap-2 px-4 py-2.5 border rounded-xl bg-white hover:bg-gray-50 focus:outline-none ${formTypeOpen ? 'ring-2 ring-blue-200 border-transparent' : 'border-gray-300'}`}
                        aria-expanded={formTypeOpen ? 'true' : 'false'}
                      >
                        <span className="text-sm font-semibold text-gray-900">
                          {typeLabel(type)}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`h-4 w-4 text-gray-500 transition ${formTypeOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </button>
                    </div>

                    <div className="lg:col-span-3">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Détails</label>
                      <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                        placeholder="Description du poste, missions, profil recherché, etc."
                      />
                    </div>

                    <div className="lg:col-span-3 flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
                        <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} />
                        Offre ouverte
                      </label>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={creating}
                          onClick={closeForm}
                          className="px-4 py-2.5 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold disabled:opacity-60"
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          disabled={creating}
                          onClick={submit}
                          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                        >
                          {isEditing ? 'Enregistrer' : 'Ajouter'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showForm && formTypeOpen && (
            <div
              ref={formTypePopoverRef}
              className="fixed z-[60] rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
              style={formTypePos ? { left: formTypePos.left, top: formTypePos.top, width: formTypePos.width } : undefined}
              role="menu"
              aria-label="Sélection du type"
            >
              <div className="max-h-56 overflow-auto py-1">
                {(allTypeOptions || []).map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setType(opt.key);
                      setFormTypeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm ${String(type) === String(opt.key) ? 'bg-gray-50 text-gray-900 font-semibold' : 'text-gray-700 hover:bg-gray-50'}`}
                    role="menuitem"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sm:rounded-2xl rounded-none border-y sm:border bg-white overflow-hidden">
            <div className="px-5 py-4 border-b">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-extrabold text-gray-900">Liste des offres</div>

                <div className="hidden sm:flex items-center gap-2">
                  <button
                    type="button"
                    onClick={openTypesModal}
                    className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold"
                  >
                    Types
                  </button>
                  <button
                    type="button"
                    onClick={startCreate}
                    className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
                  >
                    Ajouter une offre
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm font-semibold"
                  >
                    Actualiser
                  </button>
                </div>
              </div>

              <div className="mt-3 sm:hidden" ref={mobileControlsRef}>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen((v) => !v);
                      setMobileFiltersOpen(false);
                      setMobileDropdownOpen(null);
                    }}
                    className={`inline-flex items-center justify-center rounded-xl p-2 border border-gray-200 bg-white hover:bg-gray-50 ${mobileSearchOpen ? 'ring-2 ring-blue-200' : ''}`}
                    aria-label="Rechercher"
                    title="Rechercher"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileFiltersOpen((v) => !v);
                      setMobileSearchOpen(false);
                      setMobileDropdownOpen(null);
                    }}
                    className={`inline-flex items-center justify-center rounded-xl p-2 border border-gray-200 bg-white hover:bg-gray-50 ${mobileFiltersOpen ? 'ring-2 ring-blue-200' : ''}`}
                    aria-label="Filtres"
                    title="Filtres"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                      <path d="M22 3H2l8 9v7l4 2v-9l8-9z" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50"
                    aria-label="Actualiser"
                    title="Actualiser"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                      <path d="M21 12a9 9 0 1 1-3-6.7" />
                      <path d="M21 3v6h-6" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setMobileFiltersOpen(false);
                      setMobileDropdownOpen(null);
                      openTypesModal();
                    }}
                    className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50"
                    aria-label="Types d'offre"
                    title="Types"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6" />
                      <path d="M4 8V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" />
                      <path d="M12 12v8" />
                      <path d="M8 12v8" />
                      <path d="M16 12v8" />
                    </svg>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMobileSearchOpen(false);
                      setMobileFiltersOpen(false);
                      setMobileDropdownOpen(null);
                      startCreate();
                    }}
                    className="ml-auto inline-flex items-center justify-center rounded-xl px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                    aria-label="Ajouter une offre"
                    title="Ajouter"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 5v14" />
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                </div>

                {mobileSearchOpen && (
                  <div className="mt-2">
                    <div className="relative">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true">
                        <circle cx="11" cy="11" r="8" />
                        <path d="m21 21-4.3-4.3" />
                      </svg>
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Rechercher…"
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {mobileFiltersOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    <MobileDropdown
                      id="type"
                      label="Type"
                      valueLabel={typeFilter === 'all' ? 'Tous types' : typeLabel(typeFilter)}
                    >
                      <MobileOption
                        active={typeFilter === 'all'}
                        onClick={() => {
                          setTypeFilter('all');
                          setMobileDropdownOpen(null);
                        }}
                      >
                        Tous types
                      </MobileOption>
                      {(allTypeOptions || []).map((opt) => (
                        <MobileOption
                          key={opt.key}
                          active={typeFilter === opt.key}
                          onClick={() => {
                            setTypeFilter(opt.key);
                            setMobileDropdownOpen(null);
                          }}
                        >
                          {opt.label}
                        </MobileOption>
                      ))}
                    </MobileDropdown>

                    <MobileDropdown
                      id="status"
                      label="Statut"
                      valueLabel={openFilter === 'open' ? 'Ouvertes' : openFilter === 'closed' ? 'Fermées' : 'Tous statuts'}
                    >
                      <MobileOption
                        active={openFilter === 'all'}
                        onClick={() => {
                          setOpenFilter('all');
                          setMobileDropdownOpen(null);
                        }}
                      >
                        Tous statuts
                      </MobileOption>
                      <MobileOption
                        active={openFilter === 'open'}
                        onClick={() => {
                          setOpenFilter('open');
                          setMobileDropdownOpen(null);
                        }}
                      >
                        Ouvertes
                      </MobileOption>
                      <MobileOption
                        active={openFilter === 'closed'}
                        onClick={() => {
                          setOpenFilter('closed');
                          setMobileDropdownOpen(null);
                        }}
                      >
                        Fermées
                      </MobileOption>
                    </MobileDropdown>
                  </div>
                )}

                <div className="mt-2 text-xs text-gray-500">
                  {filteredOffers.length} offre{filteredOffers.length > 1 ? 's' : ''}
                  {search.trim() ? ` (recherche “${search.trim()}”)` : ''}
                </div>
              </div>

              <div className="mt-3 hidden sm:block">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="lg:col-span-2">
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                      placeholder="Rechercher (titre, description)…"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                      aria-label="Filtrer par type"
                    >
                      <option value="all">Tous types</option>
                      {(allTypeOptions || []).map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <select
                      value={openFilter}
                      onChange={(e) => setOpenFilter(e.target.value)}
                      className="w-full px-3 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                      aria-label="Filtrer par statut"
                    >
                      <option value="all">Tous statuts</option>
                      <option value="open">Ouvertes</option>
                      <option value="closed">Fermées</option>
                    </select>
                  </div>
                </div>

                <div className="mt-1 text-xs text-gray-500">
                  {filteredOffers.length} offre{filteredOffers.length > 1 ? 's' : ''}
                  {search.trim() ? ` (recherche “${search.trim()}”)` : ''}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="p-5 text-gray-700">Chargement…</div>
            ) : error ? (
              <div className="p-5 text-red-800">{error}</div>
            ) : filteredOffers.length === 0 ? (
              <div className="p-5 text-gray-700">Aucune offre.</div>
            ) : (
              <div className={`px-0 py-3 sm:p-4 ${isCompact ? 'space-y-3 sm:space-y-4' : 'space-y-4 sm:space-y-5'} bg-gray-50/50`}>
                {filteredOffers.map((o) => (
                  <div
                    key={o.id}
                    className={`group relative overflow-hidden sm:rounded-2xl rounded-none border-y sm:border bg-white shadow-sm hover:border-gray-300 ${
                      isCompact ? 'px-4 py-3 sm:p-5' : 'px-4 py-4 sm:p-6'
                    } ${motionOn ? 'transition hover:shadow-md' : ''}`}
                  >
                    <div
                      aria-hidden="true"
                      className={`absolute left-0 top-0 bottom-0 w-1 ${o.is_open ? 'bg-gradient-to-b from-emerald-500 to-teal-500' : 'bg-gradient-to-b from-gray-300 to-gray-400'}`}
                    />

                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-extrabold text-gray-900 leading-snug truncate sm:break-words">
                          {o.title}
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-0.5 text-[10px] font-semibold text-gray-700 ring-1 ring-gray-200">
                            Type : {typeLabel(String(o.type || ''))}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold ring-1 ${
                              o.is_open
                                ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
                                : 'bg-gray-50 text-gray-800 ring-gray-200'
                            }`}
                          >
                            {o.is_open ? 'Ouverte' : 'Fermée'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(o)}
                          className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 border bg-white hover:bg-gray-50 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          Modifier
                        </button>
                      </div>
                    </div>

                    {o.description && (
                      <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap line-clamp-2 sm:line-clamp-3">
                        {o.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

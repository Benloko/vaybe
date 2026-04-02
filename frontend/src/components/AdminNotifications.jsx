import { useEffect, useMemo, useRef, useState } from 'react';
import { applicationService } from '../services/api';

function useOutsideClose({ open, onClose, refs = [] }) {
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      for (const ref of refs) {
        const el = ref?.current;
        if (el && el.contains(target)) return;
      }
      onClose?.();
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, onClose, refs]);
}

function PopoverSelect({ label, value, options, onChange, placeholder = 'Sélectionner…' }) {
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ left: 0, top: null, bottom: null, width: 0, maxHeight: 288 });

  useOutsideClose({ open, onClose: () => setOpen(false), refs: [rootRef] });

  useEffect(() => {
    if (!open) return;

    const compute = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth || 0;
      const vh = window.innerHeight || 0;

      const width = Math.max(0, Math.min(rect.width, vw - 16));
      const left = Math.max(8, Math.min(rect.left, vw - width - 8));

      const roomBelow = Math.max(0, vh - rect.bottom);
      const roomAbove = Math.max(0, rect.top);
      const direction = roomBelow < 220 && roomAbove > roomBelow ? 'up' : 'down';
      const maxHeight = Math.max(160, Math.min(320, (direction === 'down' ? roomBelow : roomAbove) - 16));

      if (direction === 'down') {
        setMenuPos({ left, top: rect.bottom + 8, bottom: null, width, maxHeight });
      } else {
        setMenuPos({ left, top: null, bottom: vh - rect.top + 8, width, maxHeight });
      }
    };

    compute();

    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const selected = useMemo(() => {
    return (options || []).find((o) => String(o.value) === String(value)) || null;
  }, [options, value]);

  return (
    <div ref={rootRef} className="relative">
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        ref={buttonRef}
        className="mt-2 w-full px-3 py-2.5 border rounded-xl bg-white hover:bg-gray-50 text-sm text-left flex items-center justify-between gap-3 border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <span className="min-w-0 truncate text-gray-900">
          {selected ? selected.label : placeholder}
        </span>
        <span className="shrink-0 text-gray-400" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          className="fixed z-[60] rounded-2xl border bg-white shadow-lg overflow-hidden"
          style={{
            left: menuPos.left,
            top: menuPos.top ?? undefined,
            bottom: menuPos.bottom ?? undefined,
            width: menuPos.width,
          }}
        >
          <div className="overflow-auto" style={{ maxHeight: menuPos.maxHeight }}>
            {(options || []).map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                className={
                  'w-full text-left px-3 py-2 text-sm font-semibold ' +
                  (String(opt.value) === String(value) ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50')
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProfileAutocomplete({ label, value, applications, onChange, placeholder = 'Tapez un nom…' }) {
  const rootRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [menuPos, setMenuPos] = useState({ left: 0, top: null, bottom: null, width: 0, maxHeight: 320 });

  useOutsideClose({ open, onClose: () => setOpen(false), refs: [rootRef] });

  const options = useMemo(() => {
    const q = String(query || '').trim().toLowerCase();
    const list = Array.isArray(applications) ? applications : [];
    const mapped = list
      .filter((a) => a?.id)
      .map((a) => {
        const id = String(a.id);
        const nom = String(a?.nom || '').trim();
        const email = String(a?.email || '').trim();
        const offer = String(a?.offer_title || a?.offer?.title || '').trim();
        const status = String(a?.status || '').trim();
        const label = [nom || '—', email || '', offer ? `• ${offer}` : '', status ? `• ${status}` : ''].filter(Boolean).join(' ');
        return { value: id, label, search: `${nom} ${email} ${offer} ${status}`.toLowerCase() };
      });

    if (!q) return [];
    return mapped.filter((o) => o.search.includes(q)).slice(0, 60);
  }, [applications, query]);

  useEffect(() => {
    const v = String(value ?? '').trim();
    if (!v) {
      setSelectedLabel('');
      // On ne force pas query ici: l'utilisateur peut être en train de taper.
      return;
    }

    const list = Array.isArray(applications) ? applications : [];
    const a = list.find((x) => String(x?.id) === v);
    if (!a) {
      setSelectedLabel(`Profil #${v}`);
      return;
    }
    const nom = String(a?.nom || '').trim();
    const email = String(a?.email || '').trim();
    setSelectedLabel([nom || '—', email].filter(Boolean).join(' • '));
  }, [applications, value]);

  useEffect(() => {
    const v = String(value ?? '').trim();
    if (!v) return;
    if (!selectedLabel) return;
    const input = inputRef.current;
    const isFocused = input && document.activeElement === input;
    if (isFocused) return;
    setQuery(selectedLabel);
  }, [value, selectedLabel]);

  useEffect(() => {
    if (!open) return;

    const compute = () => {
      const input = inputRef.current;
      if (!input) return;
      const rect = input.getBoundingClientRect();
      const vw = window.innerWidth || 0;
      const vh = window.innerHeight || 0;

      const width = Math.max(0, Math.min(rect.width, vw - 16));
      const left = Math.max(8, Math.min(rect.left, vw - width - 8));
      const roomBelow = Math.max(0, vh - rect.bottom);
      const roomAbove = Math.max(0, rect.top);
      const direction = roomBelow < 240 && roomAbove > roomBelow ? 'up' : 'down';
      const maxHeight = Math.max(180, Math.min(380, (direction === 'down' ? roomBelow : roomAbove) - 16));

      if (direction === 'down') {
        setMenuPos({ left, top: rect.bottom + 8, bottom: null, width, maxHeight });
      } else {
        setMenuPos({ left, top: null, bottom: vh - rect.top + 8, width, maxHeight });
      }
    };

    compute();
    const onScroll = () => compute();
    const onResize = () => compute();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <div className="mt-2 relative">
        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16.4 16.4 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            setOpen(Boolean(String(next).trim()));
            if (String(value ?? '').trim()) onChange?.('');
          }}
          onFocus={() => {
            if (String(query || '').trim() && !String(value ?? '').trim()) setOpen(true);
            const input = inputRef.current;
            if (input && String(value ?? '').trim()) {
              try {
                input.setSelectionRange(0, input.value.length);
              } catch {
                // ignore
              }
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setOpen(false);
            if (e.key === 'Enter' && open && options.length > 0) {
              e.preventDefault();
              const first = options[0];
              onChange?.(String(first.value));
              setSelectedLabel(String(first.label));
              setQuery('');
              setOpen(false);
            }
          }}
          className="w-full pl-10 pr-10 py-2.5 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
          placeholder={placeholder}
          autoCapitalize="none"
          autoCorrect="off"
        />

        {String(value ?? '').trim() ? (
          <button
            type="button"
            onClick={() => {
              onChange?.('');
              setSelectedLabel('');
              setQuery('');
              setOpen(false);
              inputRef.current?.focus?.();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
            aria-label="Effacer le profil sélectionné"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {!String(value ?? '').trim() ? (
        <div className="mt-1 text-xs text-gray-500">Commence à taper pour voir des suggestions.</div>
      ) : null}

      {open ? (
        <div
          className="fixed z-[60] rounded-2xl border bg-white shadow-lg overflow-hidden"
          style={{
            left: menuPos.left,
            top: menuPos.top ?? undefined,
            bottom: menuPos.bottom ?? undefined,
            width: menuPos.width,
          }}
        >
          <div className="overflow-auto" style={{ maxHeight: menuPos.maxHeight }}>
            {options.length === 0 ? (
              <div className="p-3 text-sm text-gray-600">Aucun profil trouvé.</div>
            ) : (
              options.map((opt) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => {
                    onChange?.(opt.value);
                    setSelectedLabel(String(opt.label));
                    setQuery('');
                    setOpen(false);
                  }}
                  className={
                    'w-full text-left px-3 py-2 text-sm font-semibold ' +
                    (String(opt.value) === String(value) ? 'bg-blue-50 text-blue-800' : 'text-gray-700 hover:bg-gray-50')
                  }
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function statusLabel(status) {
  if (status === 'approved') return 'Approuvées';
  if (status === 'rejected') return 'Rejetées';
  return 'En attente';
}

export default function AdminNotifications() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);

  const [scope, setScope] = useState('application');
  const [applicationId, setApplicationId] = useState('');
  const [offerId, setOfferId] = useState('');
  const [status, setStatus] = useState('pending');
  const [body, setBody] = useState('');

  const [sending, setSending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError('');
      try {
        const [offersPayload, appsPayload] = await Promise.all([
          applicationService.getOffers(),
          applicationService.getApplications(),
        ]);

        if (!cancelled) {
          setOffers(Array.isArray(offersPayload?.data) ? offersPayload.data : []);
          setApplications(Array.isArray(appsPayload?.data) ? appsPayload.data : []);
        }
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Impossible de charger les offres.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const scopeOptions = useMemo(
    () => [
      { value: 'application', label: 'Individu (profil)' },
      { value: 'status', label: 'Groupe (par statut)' },
      { value: 'offer', label: 'Groupe (dans une offre)' },
      { value: 'offer_status', label: 'Offre + statut' },
      { value: 'all_active', label: 'Tous (hors rejetées)' },
    ],
    []
  );

  const offerOptions = useMemo(() => {
    return [
      { value: '', label: 'Sélectionner une offre…' },
      ...offers.map((o) => ({
        value: String(o?.id ?? ''),
        label: String(o?.title || '').trim() || `Offre #${String(o?.id)}`,
      })),
    ];
  }, [offers]);

  const statusOptions = useMemo(
    () => [
      { value: 'pending', label: statusLabel('pending') },
      { value: 'approved', label: statusLabel('approved') },
      { value: 'rejected', label: statusLabel('rejected') },
    ],
    []
  );

  const canSend = useMemo(() => {
    if (sending) return false;
    if (!String(body || '').trim()) return false;

    if (scope === 'application') return Boolean(String(applicationId || '').trim());
    if (scope === 'status') return Boolean(String(status || '').trim());
    if (scope === 'offer') return Boolean(String(offerId || '').trim());
    if (scope === 'offer_status') return Boolean(String(offerId || '').trim()) && Boolean(String(status || '').trim());
    if (scope === 'all_active') return true;
    return false;
  }, [sending, body, scope, applicationId, offerId, status]);

  const send = async () => {
    if (!canSend) return;

    setSending(true);
    setError('');
    setSuccess('');

    try {
      const payload = await applicationService.sendAdminNotification({
        body: String(body || '').trim(),
        scope,
        application_id: scope === 'application' ? Number(applicationId) : undefined,
        offer_id: scope === 'offer' || scope === 'offer_status' ? Number(offerId) : undefined,
        status: scope === 'status' || scope === 'offer_status' ? String(status || '').trim() : undefined,
      });

      const count = payload?.data?.count;
      setSuccess(typeof count === 'number' ? `Notification envoyée à ${count} profils.` : 'Notification envoyée.');
      setBody('');
    } catch (err) {
      setError(err?.message || 'Impossible d\'envoyer la notification.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="w-full sm:max-w-6xl sm:mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="bg-white sm:rounded-2xl rounded-none shadow-sm border-y sm:border">
        <div className="px-4 py-3 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-sm text-white/90">Espace admin</div>
          <h1 className="text-xl sm:text-3xl font-extrabold">Notifications</h1>
          <p className="mt-1 text-white/90">Envoie une notification ciblée (individu / statut / offre).</p>
        </div>

        <div className="px-4 py-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="p-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-800 text-sm">Chargement…</div>
          ) : null}

          {error ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
          ) : null}

          {success ? (
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">{success}</div>
          ) : null}

          <div className="rounded-2xl border bg-white shadow-sm overflow-visible">
            <div aria-hidden="true" className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-4">
              <div className="text-sm font-extrabold text-gray-900">Cible</div>
              <div className="mt-1 text-sm text-gray-600">Choisis à qui envoyer.</div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PopoverSelect
                  label="Type"
                  value={scope}
                  options={scopeOptions}
                  onChange={(v) => {
                    setSuccess('');
                    setError('');
                    setScope(String(v));
                  }}
                />

                {scope === 'application' ? (
                  <ProfileAutocomplete
                    label="Profil"
                    value={applicationId}
                    applications={applications}
                    onChange={(v) => setApplicationId(String(v))}
                    placeholder="Tapez le nom du profil…"
                  />
                ) : null}

                {scope === 'status' ? (
                  <PopoverSelect label="Statut" value={status} options={statusOptions} onChange={(v) => setStatus(String(v))} />
                ) : null}

                {scope === 'offer' || scope === 'offer_status' ? (
                  <PopoverSelect
                    label="Offre"
                    value={offerId}
                    options={offerOptions}
                    onChange={(v) => setOfferId(String(v))}
                    placeholder="Choisir une offre…"
                  />
                ) : null}

                {scope === 'offer_status' ? (
                  <PopoverSelect label="Statut" value={status} options={statusOptions} onChange={(v) => setStatus(String(v))} />
                ) : null}
              </div>

              <div className="mt-4">
                <div className="text-xs font-semibold text-gray-700">Message</div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  className="mt-2 w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                  placeholder="Ex: Bonjour, votre candidature avance. Merci !"
                />
              </div>

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={!canSend}
                  onClick={send}
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60"
                >
                  {sending ? 'Envoi…' : 'Envoyer la notification'}
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">Les notifications apparaissent côté candidat dans son onglet Notifications.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

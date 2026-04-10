import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import { applicationService } from '../services/api';

function dayKey(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full' }).format(date);
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

export default function AdminMessenger() {
  const { id } = useParams();
  const navigate = useNavigate();
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

  const broadcastTemplate = useMemo(() => {
    try {
      return localStorage.getItem('adminBroadcastTemplate') || '';
    } catch {
      return '';
    }
  }, []);

  const isCompact = uiDensity !== 'comfortable';
  const motionOn = uiMotion !== 'off';

  const seenAtStorageKey = (applicationId) => `admin_messenger_seen_at:${String(applicationId)}`;

  const getSeenAt = (applicationId) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return 0;
      const raw = window.localStorage.getItem(seenAtStorageKey(applicationId));
      const value = Number(raw);
      return Number.isFinite(value) ? value : 0;
    } catch {
      return 0;
    }
  };

  const setSeenAt = (applicationId, timestamp) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      const value = Number(timestamp);
      if (!Number.isFinite(value)) return;
      window.localStorage.setItem(seenAtStorageKey(applicationId), String(value));
    } catch {
      // ignore
    }
  };

  const getLastCandidateMessageTs = (list) => {
    const messagesList = Array.isArray(list) ? list : [];
    let lastTs = 0;
    for (const m of messagesList) {
      if (!m) continue;
      if (String(m?.sender || '') === 'admin') continue;
      const ts = new Date(m?.created_at || 0).getTime();
      if (Number.isFinite(ts) && ts > lastTs) lastTs = ts;
    }
    return lastTs;
  };

  const [appsLoading, setAppsLoading] = useState(true);
  const [appsError, setAppsError] = useState('');
  const [applications, setApplications] = useState([]);

  const [metaByAppId, setMetaByAppId] = useState({});
  const metaFetchRunRef = useRef(0);

  const [activeLoading, setActiveLoading] = useState(false);
  const [activeError, setActiveError] = useState('');
  const [active, setActive] = useState(null);

  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [messages, setMessages] = useState([]);

  const [appSearch, setAppSearch] = useState('');
  const [offerFilter, setOfferFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [desktopSearchOpen, setDesktopSearchOpen] = useState(false);
  const desktopSearchRef = useRef(null);

  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [mobileBroadcastOpen, setMobileBroadcastOpen] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null); // 'offer' | 'type' | null
  const mobileControlsRef = useRef(null);

  const desktopBroadcastRef = useRef(null);
  const mobileBroadcastRef = useRef(null);
  const desktopBroadcastCardRef = useRef(null);

  const desktopChatScrollRef = useRef(null);
  const mobileChatScrollRef = useRef(null);
  const desktopChatBottomRef = useRef(null);
  const mobileChatBottomRef = useRef(null);

  const [scrollRequest, setScrollRequest] = useState({ token: 0, behavior: 'auto' });

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [decisionMessage, setDecisionMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const desktopSearchVisible = desktopSearchOpen || Boolean(String(appSearch || '').trim());

  useEffect(() => {
    if (!desktopSearchVisible) return;
    window.setTimeout(() => {
      try {
        desktopSearchRef.current?.focus?.();
      } catch {
        // ignore
      }
    }, 0);
  }, [desktopSearchVisible]);

  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastError, setBroadcastError] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState('');

  const activeId = id ? String(id) : null;
  const isApproved = active?.status === 'approved';
  const isRejected = active?.status === 'rejected';
  const isPending = active?.status === 'pending' || !active?.status;

  const rejectionReason = useMemo(() => {
    if (!isRejected) return '';
    const lastAdmin = [...messages]
      .reverse()
      .find((m) => m?.sender === 'admin' && String(m?.kind || '') === 'status' && String(m?.body || '').trim() !== '');
    return String(lastAdmin?.body || '').trim();
  }, [isRejected, messages]);

  const handleRefreshAll = async () => {
    setAppSearch('');
    setOfferFilter('all');
    setTypeFilter('all');
    setMobileSearchOpen(false);
    setMobileFiltersOpen(false);
    setMobileBroadcastOpen(false);
    setMobileDropdownOpen(null);
    setMetaByAppId({});
    await loadApplications();
    if (activeId) await loadConversation(activeId);
  };

  useEffect(() => {
    if (!mobileSearchOpen && !mobileFiltersOpen && !mobileBroadcastOpen && !mobileDropdownOpen) return;

    const onPointerDown = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const root = mobileControlsRef.current;
      if (!root) return;
      if (root.contains(target)) return;

      setMobileSearchOpen(false);
      setMobileFiltersOpen(false);
      setMobileBroadcastOpen(false);
      setMobileDropdownOpen(null);
    };

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setMobileSearchOpen(false);
      setMobileFiltersOpen(false);
      setMobileBroadcastOpen(false);
      setMobileDropdownOpen(null);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileBroadcastOpen, mobileDropdownOpen, mobileFiltersOpen, mobileSearchOpen]);

  const prefillBroadcastIfEmpty = () => {
    const current = String(broadcastBody || '').trim();
    const tpl = String(broadcastTemplate || '').trim();
    if (!current && tpl) setBroadcastBody(tpl);
  };

  useEffect(() => {
    if (!mobileBroadcastOpen) return;
    prefillBroadcastIfEmpty();
    window.setTimeout(() => {
      if (mobileBroadcastRef.current) mobileBroadcastRef.current.focus();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mobileBroadcastOpen]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    if (params.get('broadcast') !== '1') return;

    setMobileSearchOpen(false);
    setMobileFiltersOpen(false);
    setMobileDropdownOpen(null);

    const isDesktop = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 640px)').matches;
    if (!isDesktop) setMobileBroadcastOpen(true);

    prefillBroadcastIfEmpty();

    window.setTimeout(() => {
      if (desktopBroadcastCardRef.current && typeof desktopBroadcastCardRef.current.scrollIntoView === 'function') {
        try {
          desktopBroadcastCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch {
          // ignore
        }
      }

      const ref = isDesktop ? desktopBroadcastRef.current : mobileBroadcastRef.current;
      if (ref) ref.focus();
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const loadApplications = async () => {
    setAppsError('');
    try {
      setAppsLoading(true);
      const payload = await applicationService.getApplications();
      setApplications(payload?.data || []);
    } catch (err) {
      setAppsError(err?.message || 'Impossible de charger les candidatures.');
    } finally {
      setAppsLoading(false);
    }
  };

  const loadConversation = async (applicationId) => {
    if (!applicationId) return;

    setActiveError('');
    setMessagesError('');

    try {
      setActiveLoading(true);
      const payload = await applicationService.getApplication(applicationId);
      setActive(payload?.data || null);
    } catch (err) {
      setActiveError(err?.message || 'Impossible de charger la candidature.');
    } finally {
      setActiveLoading(false);
    }

    try {
      setMessagesLoading(true);
      const payload = await applicationService.getApplicationMessages(applicationId);
      const list = payload?.data || [];
      setMessages(list);

      const lastCandidateTs = getLastCandidateMessageTs(list);
      if (lastCandidateTs) {
        setSeenAt(applicationId, lastCandidateTs);
        setMetaByAppId((prev) => ({
          ...prev,
          [String(applicationId)]: { lastCandidateTs, lastCheckedAt: Date.now() },
        }));
      }
    } catch (err) {
      setMessagesError(err?.message || 'Impossible de charger les messages.');
    } finally {
      setMessagesLoading(false);
    }
  };

  const requestScrollToBottom = (behavior = 'auto') => {
    setScrollRequest((prev) => ({ token: prev.token + 1, behavior }));
  };

  const scrollToBottom = (behavior = 'auto') => {
    const isDesktop = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
    const container = (isDesktop ? desktopChatScrollRef.current : mobileChatScrollRef.current);
    // Important: éviter scrollIntoView() ici.
    // Sur mobile (clavier), certains navigateurs scrollent le document entier
    // ce qui fait "glisser" le header. On scroll uniquement le conteneur.
    const el = container;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    // Sur mobile, l'overlay est en fixed. On verrouille le scroll du document
    // pour empêcher le navigateur de scroller le haut de page quand le clavier apparaît.
    if (!activeId) return;
    const isDesktop = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) return;

    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyOverscroll = document.body.style.overscrollBehavior;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.overscrollBehavior = prevBodyOverscroll;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.overscrollBehavior = prevHtmlOverscroll;
    };
  }, [activeId]);

  useEffect(() => {
    loadApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onFocus = () => {
      loadApplications();
      if (activeId) loadConversation(activeId);
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  useEffect(() => {
    if (!activeId) return;
    if (messagesLoading) return;
    window.setTimeout(() => requestScrollToBottom('auto'), 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, messagesLoading]);

  const displayMessages = useMemo(() => {
    const list = Array.isArray(messages) ? messages : [];
    const toTs = (value) => {
      const ts = new Date(value || 0).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };
    // Les messages "status" (approbation/rejet) sont des notifications, pas du chat.
    // On les masque ici pour éviter qu'ils polluent la conversation admin.
    return list
      .filter((m) => String(m?.kind || 'message') === 'message')
      .slice()
      .sort((a, b) => toTs(a?.created_at) - toTs(b?.created_at));
  }, [messages]);

  useEffect(() => {
    if (!activeId) return;
    if (messagesLoading) return;
    if (!scrollRequest.token) return;
    window.requestAnimationFrame(() => {
      scrollToBottom(scrollRequest.behavior);
      window.requestAnimationFrame(() => scrollToBottom(scrollRequest.behavior));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollRequest.token, activeId, messagesLoading, displayMessages.length]);

  useEffect(() => {
    if (!activeId) {
      setActive(null);
      setMessages([]);
      return;
    }

    loadConversation(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const offerOptions = useMemo(() => {
    const list = Array.isArray(applications) ? applications : [];
    const approvedOnly = list.filter((a) => String(a?.status || 'pending') === 'approved');

    const byKey = new Map();
    for (const a of approvedOnly) {
      const id = a?.offer?.id ?? a?.offer_id ?? '';
      const title = a?.offer?.title ?? a?.offer_title ?? '';
      const slug = a?.offer?.slug ?? a?.offer_slug ?? '';

      const key = String(id || slug || title || '').trim();
      const label = String(title || slug || 'Offre').trim();
      if (!key) continue;
      if (!byKey.has(key)) byKey.set(key, label);
    }

    return Array.from(byKey.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => new Intl.Collator('fr-FR', { sensitivity: 'base' }).compare(a.label, b.label));
  }, [applications]);

  const offerFilterLabel = useMemo(() => {
    if (offerFilter === 'all') return 'Toutes les offres';
    const found = offerOptions.find((o) => String(o.key) === String(offerFilter));
    return String(found?.label || 'Offre');
  }, [offerFilter, offerOptions]);

  const typeFilterLabel = useMemo(() => {
    if (typeFilter === 'designer') return 'Designer';
    if (typeFilter === 'dev') return 'Dev';
    return 'Tous les types';
  }, [typeFilter]);

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

  const filteredApplications = useMemo(() => {
    const list = Array.isArray(applications) ? applications : [];
    const approvedOnly = list.filter((a) => String(a?.status || 'pending') === 'approved');

    const filtered = approvedOnly.filter((a) => {
      if (typeFilter !== 'all') {
        const role = a?.role === 'designer' ? 'designer' : 'dev';
        if (role !== typeFilter) return false;
      }

      if (offerFilter !== 'all') {
        const id = a?.offer?.id ?? a?.offer_id ?? '';
        const slug = a?.offer?.slug ?? a?.offer_slug ?? '';
        const title = a?.offer?.title ?? a?.offer_title ?? '';
        const key = String(id || slug || title || '').trim();
        if (key !== offerFilter) return false;
      }

      const query = String(appSearch || '').trim().toLowerCase();
      if (!query) return true;
      const name = String(a?.nom || '').toLowerCase();
      return name.includes(query);
    });

    return filtered.sort((a, b) => new Date(b?.created_at || 0) - new Date(a?.created_at || 0));
  }, [applications, appSearch, offerFilter, typeFilter]);

  useEffect(() => {
    const list = Array.isArray(filteredApplications) ? filteredApplications : [];
    if (list.length === 0) return;

    const runId = metaFetchRunRef.current + 1;
    metaFetchRunRef.current = runId;

    const META_TTL_MS = 30_000;
    const now = Date.now();
    const toFetch = list
      .map((a) => String(a?.id || ''))
      .filter(Boolean)
      .filter((appId) => {
        const meta = metaByAppId?.[appId];
        if (!meta) return true;
        if (!meta.lastCheckedAt) return true;
        return (now - meta.lastCheckedAt) > META_TTL_MS;
      });

    if (toFetch.length === 0) return;

    const CONCURRENCY = 3;
    let index = 0;

    const worker = async () => {
      while (index < toFetch.length) {
        const appId = toFetch[index];
        index += 1;

        if (metaFetchRunRef.current !== runId) return;

        try {
          const payload = await applicationService.getApplicationMessages(appId);
          const messagesList = payload?.data || [];
          const lastCandidateTs = getLastCandidateMessageTs(messagesList);
          if (metaFetchRunRef.current !== runId) return;

          setMetaByAppId((prev) => ({
            ...prev,
            [String(appId)]: { lastCandidateTs, lastCheckedAt: Date.now() },
          }));
        } catch {
          if (metaFetchRunRef.current !== runId) return;
          setMetaByAppId((prev) => ({
            ...prev,
            [String(appId)]: { lastCandidateTs: 0, lastCheckedAt: Date.now() },
          }));
        }
      }
    };

    for (let i = 0; i < Math.min(CONCURRENCY, toFetch.length); i += 1) {
      worker();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredApplications]);

  const sendAdminMessage = async () => {
    if (!activeId) return;
    if (isRejected) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    setMessagesError('');

    try {
      const payload = await applicationService.sendAdminMessage(activeId, body);
      setDraft('');
      setMessages((prev) => [...prev, payload?.data].filter(Boolean));
      requestScrollToBottom('smooth');
    } catch (err) {
      setMessagesError(err?.message || 'Impossible d\'envoyer le message.');
    } finally {
      setSending(false);
    }
  };

  const updateStatus = async (status) => {
    if (!activeId) return;
    if (isRejected) return;
    if (!isPending) return;

    const optionalMessage = decisionMessage.trim();
    if (status === 'rejected' && !optionalMessage) {
      setActiveError('Ajoutez un message de rejet (motif) avant de rejeter.');
      return;
    }

    setUpdatingStatus(true);
    setActiveError('');

    try {
      const payload = await applicationService.updateApplicationStatus(activeId, {
        status,
        message: optionalMessage || undefined,
      });

      setActive(payload?.data || active);
      if (optionalMessage) setDecisionMessage('');

      await loadApplications();
      await loadConversation(activeId);
    } catch (err) {
      setActiveError(err?.message || 'Impossible de mettre à jour le statut.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const onSelect = (applicationId) => {
    setMobileSearchOpen(false);
    setMobileFiltersOpen(false);
    setMobileBroadcastOpen(false);
    setMobileDropdownOpen(null);
    navigate(`/admin/messages/${applicationId}`);
  };

  const closeMobileConversation = () => {
    navigate('/admin/messages');
  };

  const sendBroadcast = async () => {
    const body = String(broadcastBody || '').trim();
    if (!body) return;

    setBroadcastSending(true);
    setBroadcastError('');
    setBroadcastSuccess('');

    try {
      const payload = await applicationService.broadcastAdminNotification(body);
      const count = payload?.data?.count;
      setBroadcastBody('');
      setBroadcastSuccess(
        typeof count === 'number' ? `Notification envoyée à ${count} candidatures.` : 'Notification envoyée.'
      );
      await loadApplications();
      if (activeId) await loadConversation(activeId);
    } catch (err) {
      setBroadcastError(err?.message || 'Impossible d\'envoyer la notification.');
    } finally {
      setBroadcastSending(false);
    }
  };

  return (
    <div className="w-full flex-1 min-h-0 sm:max-w-6xl sm:mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] flex flex-col">
      <div className="bg-white sm:rounded-2xl rounded-none shadow-sm border-y sm:border overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg sm:text-xl font-extrabold leading-tight">Conversations</h1>
              <p className="mt-0.5 text-sm text-white/90 sm:block lg:hidden">Sélectionnez un candidat.</p>
            </div>

            {activeId ? (
              <div className="hidden lg:flex min-w-0 items-center justify-end">
                <div className="min-w-0 text-right text-lg font-extrabold truncate leading-tight">
                  {active?.nom || (activeLoading ? 'Chargement…' : '—')}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-1 flex-1 min-h-0 overflow-hidden">
          {/* Liste conversations */}
          <div className="border-b lg:border-b-0 lg:border-r px-0 py-2 sm:p-2 flex flex-col min-h-0">
            <div ref={desktopBroadcastCardRef} className="hidden sm:block rounded-2xl border bg-white p-3">
              <div className="text-xs font-extrabold text-gray-900">Notification globale</div>
              <div className="text-xs text-gray-600">Envoyer une notification à toutes les candidatures (hors rejetées).</div>

              {broadcastError && (
                <div className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                  {broadcastError}
                </div>
              )}

              {broadcastSuccess && (
                <div className="mt-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">
                  {broadcastSuccess}
                </div>
              )}

              <div className="mt-2">
                <textarea
                  ref={desktopBroadcastRef}
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  rows={1}
                  className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                  placeholder="Ex: Merci, nous revenons vers vous très vite."
                />
              </div>

              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  disabled={broadcastSending || !String(broadcastBody || '').trim()}
                  onClick={sendBroadcast}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                >
                  {broadcastSending ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            </div>

            <div className="mt-3 sm:hidden px-4" ref={mobileControlsRef}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileBroadcastOpen((v) => !v);
                    setMobileSearchOpen(false);
                    setMobileFiltersOpen(false);
                    setMobileDropdownOpen(null);
                  }}
                  className={`inline-flex items-center justify-center rounded-xl p-2 border border-gray-200 bg-white hover:bg-gray-50 ${mobileBroadcastOpen ? 'ring-2 ring-blue-200' : ''}`}
                  aria-label="Notification globale"
                  title="Notification"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22l-4-9-9-4Z" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMobileSearchOpen((v) => !v);
                    setMobileBroadcastOpen(false);
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
                    setMobileBroadcastOpen(false);
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
                  onClick={handleRefreshAll}
                  className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50"
                  aria-label="Rafraîchir"
                  title="Rafraîchir"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </button>
              </div>

              {mobileBroadcastOpen && (
                <div className="mt-3 rounded-2xl border bg-white p-4">
                  <div className="text-sm font-extrabold text-gray-900">Notification globale</div>
                  <div className="text-sm text-gray-600">Envoyer une notification à toutes les candidatures (hors rejetées).</div>

                  {broadcastError && (
                    <div className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                      {broadcastError}
                    </div>
                  )}

                  {broadcastSuccess && (
                    <div className="mt-3 p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm">
                      {broadcastSuccess}
                    </div>
                  )}

                  <div className="mt-3">
                    <textarea
                      ref={mobileBroadcastRef}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300"
                      placeholder="Ex: Merci, nous revenons vers vous très vite."
                    />
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={broadcastSending || !String(broadcastBody || '').trim()}
                      onClick={sendBroadcast}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                    >
                      {broadcastSending ? 'Envoi…' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              )}

              {mobileSearchOpen && (
                <div className="mt-2">
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Rechercher par nom…"
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {mobileFiltersOpen && (
                <div className="mt-3 grid grid-cols-1 gap-2">
                  <MobileDropdown id="offer" label="Offre" valueLabel={offerFilterLabel}>
                    <MobileOption
                      active={offerFilter === 'all'}
                      onClick={() => {
                        setOfferFilter('all');
                        setMobileDropdownOpen(null);
                      }}
                    >
                      Toutes les offres
                    </MobileOption>
                    {offerOptions.map((o) => (
                      <MobileOption
                        key={o.key}
                        active={String(offerFilter) === String(o.key)}
                        onClick={() => {
                          setOfferFilter(o.key);
                          setMobileDropdownOpen(null);
                        }}
                      >
                        {o.label}
                      </MobileOption>
                    ))}
                  </MobileDropdown>

                  <MobileDropdown id="type" label="Type" valueLabel={typeFilterLabel}>
                    <MobileOption
                      active={typeFilter === 'all'}
                      onClick={() => {
                        setTypeFilter('all');
                        setMobileDropdownOpen(null);
                      }}
                    >
                      Tous les types
                    </MobileOption>
                    <MobileOption
                      active={typeFilter === 'dev'}
                      onClick={() => {
                        setTypeFilter('dev');
                        setMobileDropdownOpen(null);
                      }}
                    >
                      Dev
                    </MobileOption>
                    <MobileOption
                      active={typeFilter === 'designer'}
                      onClick={() => {
                        setTypeFilter('designer');
                        setMobileDropdownOpen(null);
                      }}
                    >
                      Designer
                    </MobileOption>
                  </MobileDropdown>
                </div>
              )}

              <div className="mt-2 text-xs text-gray-500">
                {filteredApplications.length} candidature{filteredApplications.length > 1 ? 's' : ''}
                {appSearch.trim() ? ` (filtre “${appSearch.trim()}”)` : ''}
              </div>
            </div>

            <div className="mt-1 hidden sm:block">
              {desktopSearchVisible ? (
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 min-w-0">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
                      aria-hidden="true"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                    <input
                      ref={desktopSearchRef}
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="w-full pl-9 pr-9 py-2 text-sm rounded-xl bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                      placeholder="Rechercher par nom…"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAppSearch('');
                        setDesktopSearchOpen(false);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 hover:bg-gray-50"
                      aria-label="Fermer la recherche"
                      title="Fermer"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setDesktopSearchOpen(true)}
                    className="inline-flex items-center justify-center rounded-xl p-2 border border-gray-200 bg-white hover:bg-gray-50"
                    aria-label="Rechercher"
                    title="Rechercher"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 text-gray-700" aria-hidden="true">
                      <circle cx="11" cy="11" r="8" />
                      <path d="m21 21-4.3-4.3" />
                    </svg>
                  </button>

                  <select
                    value={offerFilter}
                    onChange={(e) => setOfferFilter(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 border rounded-xl bg-white border-gray-300 text-sm font-semibold text-gray-900"
                    aria-label="Filtrer par offre"
                  >
                    <option value="all">Toutes les offres</option>
                    {offerOptions.map((o) => (
                      <option key={o.key} value={o.key}>{o.label}</option>
                    ))}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="flex-1 min-w-0 px-3 py-2 border rounded-xl bg-white border-gray-300 text-sm font-semibold text-gray-900"
                    aria-label="Filtrer par type"
                  >
                    <option value="all">Tous les types</option>
                    <option value="dev">Dev</option>
                    <option value="designer">Designer</option>
                  </select>
                </div>
              )}

              <div className="mt-1 text-xs text-gray-500">
                {filteredApplications.length} candidature{filteredApplications.length > 1 ? 's' : ''}
                {appSearch.trim() ? ` (filtre “${appSearch.trim()}”)` : ''}
              </div>
            </div>

            {appsError && (
              <div className="mt-3 mx-4 sm:mx-0 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                {appsError}
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-auto">
              {appsLoading ? (
                <div className="mt-4 mx-4 sm:mx-0 space-y-2">
                  <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
                  <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
                </div>
              ) : filteredApplications.length === 0 ? (
                <div className="mt-4 mx-4 sm:mx-0 rounded-xl border bg-gray-50 p-4 text-gray-700">
                  Aucune candidature approuvée.
                </div>
              ) : (
                <div className="mt-2 border-t sm:border-t-0 sm:space-y-2">
                  {filteredApplications.map((app) => {
                    const isActive = activeId && String(app.id) === activeId;
                    const appId = String(app?.id || '');
                    const meta = appId ? metaByAppId?.[appId] : null;
                    const lastCandidateTs = Number(meta?.lastCandidateTs || 0);
                    const seenAt = appId ? getSeenAt(appId) : 0;
                    const hasNewCandidateMessage = lastCandidateTs > seenAt;
                    return (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => onSelect(app.id)}
                        className={`w-full text-left sm:rounded-2xl rounded-none border-b sm:border ${
                          isCompact ? 'px-3 py-2.5' : 'px-3 py-3'
                        } bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                          motionOn
                            ? 'transition-all duration-200 ease-out active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:shadow-md'
                            : ''
                        } ${isActive ? 'sm:border-blue-300 border-blue-200 bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              {hasNewCandidateMessage && (
                                <span className="inline-flex items-center" title="Nouveau message candidat">
                                  <span className="h-2.5 w-2.5 rounded-full bg-red-600" aria-hidden="true" />
                                  <span className="sr-only">Nouveau message candidat</span>
                                </span>
                              )}
                              <div className="font-semibold text-gray-900">{app.nom}</div>
                            </div>
                            <div className="text-xs text-gray-600">
                              {app.role === 'designer' ? 'Designer' : 'Dev'}
                            </div>
                          </div>
                          <div className="shrink-0 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles(app.status)}`}
                            >
                              {statusLabel(app.status)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Chat */}
          <div className="hidden lg:col-span-2 lg:flex lg:flex-col p-2 min-h-0 overflow-hidden">
            {!activeId ? (
              <div className="rounded-2xl border bg-gray-50 p-8 text-center text-gray-700">
                Sélectionnez une conversation pour commencer.
              </div>
            ) : (
              <>
                <div className="mt-2 rounded-2xl border bg-white flex-1 min-h-0 flex flex-col overflow-hidden">
                  {activeError && (
                    <div className="p-3 border-b bg-red-50 text-red-800 text-sm">
                      {activeError}
                    </div>
                  )}

                  {active && isPending && (
                    <div className="p-3 border-b bg-white">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 items-end">
                        <div className="lg:col-span-2">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">Motif (pour rejeter)</label>
                          <textarea
                            value={decisionMessage}
                            onChange={(e) => setDecisionMessage(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm"
                            placeholder="Requis uniquement si vous rejetez."
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 justify-end">
                          <button
                            type="button"
                            disabled={updatingStatus}
                            onClick={() => updateStatus('approved')}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
                          >
                            Approuver
                          </button>
                          <button
                            type="button"
                            disabled={updatingStatus}
                            onClick={() => updateStatus('rejected')}
                            className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-60"
                          >
                            Rejeter
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {active && isRejected && (
                    <div className="p-4 border-b bg-rose-50 text-rose-900 text-sm">
                      <div className="font-extrabold">Motif de rejet</div>
                      <div className="mt-1 whitespace-pre-wrap">{rejectionReason || '—'}</div>
                    </div>
                  )}

                  {messagesError && (
                    <div className="p-3 border-b bg-red-50 text-red-800 text-sm">{messagesError}</div>
                  )}

                  {!isRejected && (
                    <div ref={desktopChatScrollRef} className="p-3 flex-1 min-h-0 overflow-auto bg-gray-50">
                      {messagesLoading ? (
                        <div className="space-y-2">
                          <div className="h-10 rounded-xl bg-white animate-pulse" />
                          <div className="h-10 rounded-xl bg-white animate-pulse" />
                        </div>
                      ) : displayMessages.length === 0 ? (
                        <div className="rounded-xl border bg-white p-4 text-gray-700">Aucun message.</div>
                      ) : (
                        <div className="space-y-2">
                          {displayMessages.map((m, idx) => {
                            const isAdmin = m.sender === 'admin';
                            const prev = displayMessages[idx - 1];
                            const showDay = dayKey(prev?.created_at) !== dayKey(m?.created_at);
                            return (
                              <div key={m.id}>
                                {showDay && (
                                  <div className="flex justify-center py-1">
                                    <span className="text-[11px] font-semibold text-gray-500 bg-white/80 border rounded-full px-3 py-1">
                                      {formatDayLabel(m.created_at)}
                                    </span>
                                  </div>
                                )}
                                <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 border ${
                                      isAdmin ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-900'
                                    }`}
                                  >
                                    <div className={`text-xs ${isAdmin ? 'text-white/80' : 'text-gray-500'}`}>
                                      <span className="font-semibold">{isAdmin ? 'Vous' : 'Candidat'}</span>
                                    </div>
                                    <div className="mt-1 whitespace-pre-wrap text-sm">{m.body}</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      <div ref={desktopChatBottomRef} className="h-0" />
                    </div>
                  )}

                  {isRejected ? (
                    <div className="p-4 border-t bg-gray-50 text-gray-700">
                      Rejet final : pas de conversation.
                    </div>
                  ) : (
                    <div className="p-2 border-t bg-white shrink-0">
                      <div className="rounded-2xl border border-gray-200 bg-white p-2">
                        <div className="flex items-end gap-2">
                          <textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            rows={2}
                            className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-2xl bg-gray-50 text-sm resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent"
                            placeholder={isApproved ? 'Écrivez un message…' : 'Écrivez une notification…'}
                          />
                          <button
                            type="button"
                            disabled={sending || !draft.trim()}
                            onClick={sendAdminMessage}
                            className="shrink-0 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                            aria-label="Envoyer"
                            title="Envoyer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                              <path d="M22 2 11 13" />
                              <path d="M22 2 15 22 11 13 2 9 22 2Z" />
                            </svg>
                            <span className="hidden sm:inline">Envoyer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {activeId && (
          <div className="lg:hidden fixed inset-0 z-50 bg-white flex flex-col">
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  onClick={closeMobileConversation}
                  className="inline-flex items-center justify-center rounded-xl p-2 border border-white/20 bg-white/10 hover:bg-white/15"
                  aria-label="Retour"
                  title="Retour"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>

                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-white/90">{isApproved ? 'Conversation' : 'Notifications'}</div>
                  {activeId ? (
                    <NavLink
                      to={`/admin/candidatures/${activeId}`}
                      state={{ backTo: `${location.pathname}${location.search || ''}` }}
                      className="block text-base font-extrabold truncate hover:underline"
                      title="Voir la candidature"
                    >
                      {active?.nom || (activeLoading ? 'Chargement…' : 'Messagerie')}
                    </NavLink>
                  ) : (
                    <div className="text-base font-extrabold truncate">{active?.nom || (activeLoading ? 'Chargement…' : 'Messagerie')}</div>
                  )}
                </div>

                {active && (
                  <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles(active.status)} bg-white/90`}>
                    {statusLabel(active.status)}
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => loadConversation(activeId)}
                  className="inline-flex items-center justify-center rounded-xl p-2 border border-white/20 bg-white/10 hover:bg-white/15"
                  aria-label="Actualiser"
                  title="Actualiser"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                    <path d="M21 12a9 9 0 1 1-3-6.7" />
                    <path d="M21 3v6h-6" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 px-0 py-4 flex flex-col overflow-hidden">
              {activeError && (
                <div className="mb-3 mx-4 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">
                  {activeError}
                </div>
              )}

              <div className="sm:rounded-2xl rounded-none border-y sm:border bg-white overflow-hidden flex-1 min-h-0 flex flex-col">
                {active && isRejected && (
                  <div className="p-4 border-b bg-rose-50 text-rose-900 text-sm">
                    <div className="font-extrabold">Motif de rejet</div>
                    <div className="mt-1 whitespace-pre-wrap">{rejectionReason || '—'}</div>
                  </div>
                )}

                {messagesError && (
                  <div className="p-3 border-b bg-red-50 text-red-800 text-sm">{messagesError}</div>
                )}

                {!isRejected && (
                  <div ref={mobileChatScrollRef} className={`p-3 flex-1 min-h-0 overflow-auto ${isApproved ? 'bg-blue-50' : 'bg-gray-50'}`}>
                    {messagesLoading ? (
                      <div className="space-y-2">
                        <div className="h-10 rounded-xl bg-white animate-pulse" />
                        <div className="h-10 rounded-xl bg-white animate-pulse" />
                      </div>
                    ) : displayMessages.length === 0 ? (
                      <div className="rounded-xl border bg-white p-4 text-gray-700">Aucun message.</div>
                    ) : (
                      <div className="space-y-2">
                        {displayMessages.map((m, idx) => {
                          const isAdmin = m.sender === 'admin';
                          const prev = displayMessages[idx - 1];
                          const showDay = dayKey(prev?.created_at) !== dayKey(m?.created_at);
                          return (
                            <div key={m.id}>
                              {showDay && (
                                <div className="flex justify-center py-1">
                                  <span className="text-[11px] font-semibold text-gray-500 bg-white/80 border rounded-full px-3 py-1">
                                    {formatDayLabel(m.created_at)}
                                  </span>
                                </div>
                              )}
                              <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                <div
                                  className={`max-w-[88%] rounded-2xl px-3 py-2.5 border ${
                                    isAdmin ? 'bg-blue-600 text-white border-blue-700' : 'bg-white text-gray-900'
                                  }`}
                                >
                                  <div className={`text-[11px] ${isAdmin ? 'text-white/80' : 'text-gray-500'}`}>
                                    <span className="font-semibold">{isAdmin ? 'Vous' : 'Candidat'}</span>
                                  </div>
                                  <div className="mt-1 whitespace-pre-wrap text-sm break-words">{m.body}</div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    <div ref={mobileChatBottomRef} className="h-0" />
                  </div>
                )}

                {isRejected ? (
                  <div className="p-4 border-t bg-gray-50 text-gray-700">
                    Rejet final : pas de conversation.
                  </div>
                ) : (
                  <div className="shrink-0 border-t bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
                    <div className="flex items-end gap-2">
                      <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onFocus={() => window.setTimeout(() => scrollToBottom('auto'), 0)}
                        rows={2}
                        className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-2xl bg-gray-50 text-sm resize-none placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-transparent"
                        placeholder={isApproved ? 'Écrivez un message…' : 'Écrivez une notification…'}
                      />
                      <button
                        type="button"
                        disabled={sending || !draft.trim()}
                        onClick={sendAdminMessage}
                        className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
                        aria-label="Envoyer"
                        title="Envoyer"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">
                          <path d="M22 2 11 13" />
                          <path d="M22 2 15 22 11 13 2 9 22 2Z" />
                        </svg>
                        <span className="hidden sm:inline">Envoyer</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

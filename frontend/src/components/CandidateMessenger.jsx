import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { applicationService } from '../services/api';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function dayKey(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDayLabel(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
  }).format(date);
}

function statusLabel(status) {
  if (status === 'approved') return 'Approuvée';
  if (status === 'rejected') return 'Rejetée';
  return 'En attente';
}

function isStatusBodyApproved(body) {
  const text = String(body || '').toLowerCase();
  return text.includes('approuv');
}

function isStatusBodyRejected(body) {
  const text = String(body || '').toLowerCase();
  return text.includes('rejet');
}

function statusFromBody(body) {
  if (isStatusBodyApproved(body)) return 'approved';
  if (isStatusBodyRejected(body)) return 'rejected';
  return 'pending';
}

function isLikelyStatusBody(body) {
  const text = String(body || '').toLowerCase();
  if (!text.includes('candidature')) return false;
  return text.includes('approuv') || text.includes('rejet');
}

function statusStyles(status) {
  if (status === 'approved') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (status === 'rejected') return 'bg-rose-50 text-rose-800 ring-rose-200';
  return 'bg-gray-50 text-gray-800 ring-gray-200';
}

function previewText(body, maxLen = 140) {
  const text = String(body || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1))}…`;
}

function notificationCardClass({ kind, status }) {
  if (kind === 'status') {
    if (status === 'approved') return 'bg-emerald-50 border-emerald-200';
    if (status === 'rejected') return 'bg-rose-50 border-rose-200';
    return 'bg-gray-50 border-gray-200';
  }

  if (kind === 'notification') return 'bg-blue-50 border-blue-200';
  return 'bg-white border-gray-200';
}

function notificationTitleClass({ kind, status }) {
  if (kind === 'status') {
    if (status === 'approved') return 'text-emerald-900';
    if (status === 'rejected') return 'text-rose-900';
    return 'text-gray-900';
  }
  if (kind === 'notification') return 'text-blue-900';
  return 'text-gray-900';
}

function iconButtonClass({ kind, status }) {
  if (kind === 'status') {
    if (status === 'approved') return 'text-emerald-800 hover:bg-emerald-100';
    if (status === 'rejected') return 'text-rose-800 hover:bg-rose-100';
    return 'text-gray-700 hover:bg-gray-100';
  }
  if (kind === 'notification') return 'text-blue-800 hover:bg-blue-100';
  return 'text-gray-700 hover:bg-gray-100';
}

export default function CandidateMessenger() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const scrollRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);

  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState('');
  const [messages, setMessages] = useState([]);

  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [openNotificationKey, setOpenNotificationKey] = useState(null);
  const [pressTimer, setPressTimer] = useState(null);
  const [suppressClickKey, setSuppressClickKey] = useState(null);

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const isNotificationsRoute = location.pathname.startsWith('/notifications/');
  const requestedMode = isNotificationsRoute ? 'notifications' : 'conversation';
  const displayMode = application?.status === 'approved'
    ? (requestedMode === 'notifications' ? 'notifications' : 'conversation')
    : 'notifications';
  const isConversation = displayMode === 'conversation';
  const canReply = application?.status === 'approved' && isConversation;

  const displayMessages = useMemo(() => {
    if (isConversation) {
      const list = (messages || []).filter((m) => {
        const kind = String(m?.kind || 'message');
        const fallbackStatus = kind === 'message' && isLikelyStatusBody(m?.body);
        return kind === 'message' && !fallbackStatus;
      });

      const toTs = (value) => {
        const ts = new Date(value || 0).getTime();
        return Number.isFinite(ts) ? ts : 0;
      };

      // Conversation: ordre chronologique (anciens en haut, récents en bas)
      return list.slice().sort((a, b) => toTs(a?.created_at) - toTs(b?.created_at));
    }

    const list = (messages || []).filter((m) => m?.sender === 'admin');

    const toTs = (value) => {
      const ts = new Date(value || 0).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };

    return [...list].sort((a, b) => toTs(b?.created_at) - toTs(a?.created_at));
  }, [isConversation, messages]);

  const scrollToBottom = (behavior = 'auto') => {
    const el = scrollRef.current;
    if (!el) return;
    try {
      el.scrollTo({ top: el.scrollHeight, behavior });
    } catch {
      el.scrollTop = el.scrollHeight;
    }
  };

  const displayNotifications = useMemo(() => {
    const list = Array.isArray(notifications) && notifications.length > 0
      ? notifications
      : (Array.isArray(messages) ? messages : [])
        .filter((m) => m?.sender === 'admin')
        .filter((m) => {
          const kind = String(m?.kind || 'message');
          if (kind !== 'message') return true;
          return isLikelyStatusBody(m?.body);
        })
        .map((m) => ({
          key: `${String(application?.id || id)}:${String(m?.id || '')}`,
          applicationId: application?.id || id,
          applicationStatus: application?.status,
          offerTitle: application?.offer?.title,
          message: m,
        }));

    const toTs = (value) => {
      const ts = new Date(value || 0).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };

    return list
      .slice()
      .sort((a, b) => toTs(b?.message?.created_at) - toTs(a?.message?.created_at));
  }, [application?.id, application?.offer?.title, application?.status, id, messages, notifications]);

  const dismissNotification = async ({ email, entry }) => {
    const e = String(email || '').trim();
    const key = String(entry?.key || '').trim();
    const mid = entry?.message?.id;

    if (!e || !key || !mid) return;

    setNotificationsError('');
    setSuppressClickKey(key);

    try {
      await applicationService.dismissCandidateNotification(mid, e);
      setNotifications((prev) => (Array.isArray(prev) ? prev.filter((x) => String(x?.key || '') !== key) : []));
      setOpenNotificationKey((prev) => (prev === key ? null : prev));
    } catch (err) {
      setNotificationsError(err?.message || 'Impossible de supprimer la notification.');
    } finally {
      window.setTimeout(() => setSuppressClickKey(null), 300);
    }
  };

  const startLongPress = (handler) => {
    if (pressTimer) {
      window.clearTimeout(pressTimer);
      setPressTimer(null);
    }
    const id = window.setTimeout(() => {
      handler();
      setPressTimer(null);
    }, 650);
    setPressTimer(id);
  };

  const cancelLongPress = () => {
    if (!pressTimer) return;
    window.clearTimeout(pressTimer);
    setPressTimer(null);
  };

  const loadAll = async () => {
    let appData = null;

    setError('');
    setMessagesError('');
    setNotificationsError('');

    try {
      setLoading(true);
      const payload = await applicationService.getApplication(id);
      appData = payload?.data || null;
      setApplication(appData);
    } catch (err) {
      setError(err?.message || 'Impossible de charger la candidature.');
    } finally {
      setLoading(false);
    }

    try {
      setMessagesLoading(true);
      setNotificationsLoading(true);
      const candidateEmail = String(appData?.email || '').trim();
      const payload = await applicationService.getApplicationMessages(id, {
        candidateEmail: candidateEmail || undefined,
      });
      const loadedMessages = payload?.data || [];
      setMessages(loadedMessages);

      // Notifications affichées ici: uniquement les notifications "statut" (pas les messages de chat)
      try {
        const offerTitle = String(appData?.offer?.title || appData?.offer_title || '').trim();
        const appStatus = appData?.status;
        const list = (Array.isArray(loadedMessages) ? loadedMessages : [])
          .filter((m) => m?.sender === 'admin')
          .filter((m) => {
            const kind = String(m?.kind || 'message');
            if (kind !== 'message') return true;
            return isLikelyStatusBody(m?.body);
          })
          .map((m) => ({
            key: `${String(appData?.id || id)}:${String(m?.id || '')}`,
            applicationId: appData?.id || id,
            applicationStatus: appStatus,
            offerTitle,
            message: m,
          }));

        setNotifications(list);
      } catch {
        setNotifications([]);
      }

      // Badge "nouveaux messages" — on le remet à zéro uniquement si on ouvre la conversation.
      try {
        const isApproved = String(appData?.status || '') === 'approved';
        const isConversationRoute = !isNotificationsRoute;
        if (isApproved && isConversationRoute) {

          const seenKey = `candidateNotificationsSeenAt:${String(id)}`;
          const unreadKey = `candidateUnreadCount:${String(id)}`;

          let newestAdminTs = 0;
          for (const m of Array.isArray(loadedMessages) ? loadedMessages : []) {
            if (m?.sender !== 'admin') continue;
            const kind = String(m?.kind || 'message');
            if (kind !== 'message') continue;
            if (isLikelyStatusBody(m?.body)) continue;
            const ts = new Date(m?.created_at || 0).getTime();
            if (!Number.isFinite(ts) || ts <= 0) continue;
            if (ts > newestAdminTs) newestAdminTs = ts;
          }

          localStorage.setItem(seenKey, new Date(newestAdminTs > 0 ? newestAdminTs : Date.now()).toISOString());
          localStorage.setItem(unreadKey, '0');
          window.dispatchEvent(new Event('candidateNotificationsChanged'));
        }
      } catch {
        // ignore
      }

      // Badge "notifications" (statut) — on le remet à zéro quand on ouvre l'écran Notifications.
      try {
        if (isNotificationsRoute) {

          const seenKey = `candidateStatusSeenAt:${String(id)}`;
          const unreadKey = `candidateStatusUnreadCount:${String(id)}`;

          let newestTs = 0;
          for (const m of Array.isArray(loadedMessages) ? loadedMessages : []) {
            if (m?.sender !== 'admin') continue;
            const kind = String(m?.kind || 'message');
            const isStatusNotification = kind !== 'message' || isLikelyStatusBody(m?.body);
            if (!isStatusNotification) continue;
            const ts = new Date(m?.created_at || 0).getTime();
            if (!Number.isFinite(ts) || ts <= 0) continue;
            if (ts > newestTs) newestTs = ts;
          }

          localStorage.setItem(seenKey, new Date(newestTs > 0 ? newestTs : Date.now()).toISOString());
          localStorage.setItem(unreadKey, '0');
          window.dispatchEvent(new Event('candidateNotificationsChanged'));
        }
      } catch {
        // ignore
      }
    } catch (err) {
      setMessagesError(err?.message || 'Impossible de charger les messages.');
    } finally {
      setMessagesLoading(false);
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (messagesLoading) return;
    const raw = String(location.hash || '');
    const targetId = raw.startsWith('#') ? raw.slice(1) : raw;
    if (!targetId) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    el.scrollIntoView({ block: 'center' });
  }, [location.hash, messagesLoading]);

  useEffect(() => {
    if (!isConversation) return;
    if (messagesLoading) return;
    scrollToBottom('auto');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConversation, messagesLoading, id]);

  const sendCandidate = async () => {
    const body = draft.trim();
    if (!body) return;

    const optimisticId = `tmp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      sender: 'candidate',
      body,
      kind: 'message',
      created_at: new Date().toISOString(),
    };

    setSending(true);
    setMessagesError('');
    setDraft('');
    setMessages((prev) => [...(Array.isArray(prev) ? prev : []), optimisticMessage]);
    setTimeout(() => scrollToBottom('smooth'), 0);

    try {
      const payload = await applicationService.sendCandidateMessage(id, body);
      const saved = payload?.data || null;

      setMessages((prev) => {
        const list = Array.isArray(prev) ? prev.slice() : [];
        const idx = list.findIndex((m) => String(m?.id) === optimisticId);
        if (idx >= 0) {
          if (saved) list[idx] = saved;
          else list.splice(idx, 1);
          return list;
        }
        return saved ? [...list, saved] : list;
      });
      setTimeout(() => scrollToBottom('smooth'), 0);
    } catch (err) {
      setMessages((prev) => (Array.isArray(prev) ? prev.filter((m) => String(m?.id) !== optimisticId) : prev));
      setDraft(body);
      setMessagesError(err?.message || 'Impossible d\'envoyer le message.');
    } finally {
      setSending(false);
    }
  };

  const goToMessage = (applicationId, messageId) => {
    const appId = String(applicationId || application?.id || id);
    const mid = String(messageId || '').trim();
    if (!appId || !mid) return;
    navigate(`/messages/${encodeURIComponent(appId)}#message-${encodeURIComponent(mid)}`);
  };

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col">
      <div className="rounded-2xl border bg-white overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={application?.id ? `/profil/${application.id}` : '/'}
              className="inline-flex items-center justify-center rounded-xl p-2 border border-white/20 bg-white/10 hover:bg-white/15"
              aria-label="Retour"
              title="Retour"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>

            <div className="min-w-0 flex-1">
              <div className="text-base sm:text-lg font-extrabold truncate">
                {isConversation ? 'Messages' : 'Notifications'}
              </div>
            </div>

            {application ? (
              <span className={`shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ring-1 ${statusStyles(application.status)} bg-white/90`}>
                {statusLabel(application.status)}
              </span>
            ) : null}
          </div>
        </div>

        <div className="p-3 sm:p-6 flex-1 min-h-0 flex flex-col">
          {loading && (
            <div className="p-4 rounded-xl border bg-gray-50 text-gray-700">Chargement…</div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <div className="font-bold">Oups…</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          )}

          {!loading && !error && application && (
            <div className={`rounded-xl sm:rounded-2xl border overflow-hidden flex-1 min-h-0 flex flex-col relative ${isConversation ? 'bg-emerald-50' : 'bg-white'}`}>
              {isConversation && (
                <>
                  <span aria-hidden="true" className="pointer-events-none select-none absolute -top-4 -left-3 text-6xl opacity-10">
                    💬
                  </span>
                  <span aria-hidden="true" className="pointer-events-none select-none absolute top-12 right-2 text-5xl opacity-10">
                    ✨
                  </span>
                  <span aria-hidden="true" className="pointer-events-none select-none absolute bottom-10 left-8 text-6xl opacity-10">
                    🌿
                  </span>
                </>
              )}
              {messagesError && (isConversation || displayNotifications.length === 0) && (
                <div className="px-5 py-3 border-b bg-red-50 text-red-800 text-sm">{messagesError}</div>
              )}

              {!isConversation && notificationsError && (
                <div className="px-5 py-3 border-b bg-red-50 text-red-800 text-sm">{notificationsError}</div>
              )}

              <div
                ref={scrollRef}
                className={`p-2.5 sm:p-5 relative ${isConversation ? 'bg-transparent' : 'bg-gray-50'} flex-1 min-h-0 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]`}
              >
                {(isConversation ? messagesLoading : notificationsLoading) ? (
                  <div className="space-y-2">
                    <div className="h-10 rounded-xl bg-white animate-pulse" />
                    <div className="h-10 rounded-xl bg-white animate-pulse" />
                  </div>
                ) : (isConversation ? displayMessages.length === 0 : displayNotifications.length === 0) ? (
                  <div className="rounded-xl border bg-white p-4 text-gray-700">
                    {isConversation ? 'Aucun message.' : 'Aucune notification pour le moment.'}
                  </div>
                ) : (
                  isConversation ? (
                    <div className="space-y-2">
                      {displayMessages.map((m, idx) => {
                        const isCandidate = m.sender === 'candidate';
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
                            <div id={`message-${m.id}`} className={`flex ${isCandidate ? 'justify-end' : 'justify-start'}`}>
                              <div
                                className={`max-w-[88%] rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 border ${
                                  isCandidate ? 'bg-emerald-100 text-emerald-950 border-emerald-200' : 'bg-white text-gray-900'
                                }`}
                              >
                                <div className={`text-[11px] ${isCandidate ? 'text-emerald-700' : 'text-gray-500'}`}>
                                  <span className={`font-semibold ${isCandidate ? 'text-emerald-800' : 'text-gray-500'}`}>{isCandidate ? 'Vous' : 'Admin'}</span>
                                </div>
                                <div className="mt-1 whitespace-pre-wrap text-sm">
                                  <span className="break-words">{m.body}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayNotifications.map((entry) => {
                        const m = entry?.message || {};
                        const offerTitle = String(entry?.offerTitle || '').trim();
                        const kind = String(m?.kind || 'message');
                        const fallbackStatus = kind === 'message' && isLikelyStatusBody(m?.body);
                        const isChatMessage = kind === 'message' && !fallbackStatus;
                        const isStatus = kind === 'status' || fallbackStatus;
                        const normalizedKind = isStatus ? 'status' : kind;
                        const status = isStatus ? (entry?.applicationStatus || statusFromBody(m?.body)) : null;
                        const isOpen = openNotificationKey === entry.key;

                        const email = application?.email;
                        const cardBase = `block rounded-xl sm:rounded-2xl border p-3 sm:p-4 transition`;
                        const cardClass = `${cardBase} ${notificationCardClass({ kind: normalizedKind, status })}`;
                        const titleClass = `flex items-center gap-2 text-sm font-extrabold ${notificationTitleClass({ kind: normalizedKind, status })}`;
                        const deleteBtnClass = `inline-flex items-center justify-center rounded-lg p-2 ${iconButtonClass({ kind: normalizedKind, status })}`;

                        if (isChatMessage) {
                          return (
                            <div
                              key={entry.key}
                              role="link"
                              tabIndex={0}
                              className={`${cardClass} hover:bg-gray-50 cursor-pointer`}
                              id={`message-${m.id}`}
                              onClick={(ev) => {
                                if (suppressClickKey === entry.key) return;
                                goToMessage(entry?.applicationId || application?.id || id, m.id);
                              }}
                              onKeyDown={(ev) => {
                                if (suppressClickKey === entry.key) return;
                                if (ev.key === 'Enter' || ev.key === ' ') {
                                  ev.preventDefault();
                                  goToMessage(entry?.applicationId || application?.id || id, m.id);
                                }
                              }}
                              onPointerDown={(e) => {
                                // Long-press pour supprimer (sans naviguer)
                                if (e.pointerType === 'mouse') return;
                                startLongPress(() => dismissNotification({ email, entry }));
                              }}
                              onPointerUp={cancelLongPress}
                              onPointerCancel={cancelLongPress}
                              onPointerLeave={cancelLongPress}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className={titleClass}>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4 text-blue-700"
                                    aria-hidden="true"
                                  >
                                    <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                                  </svg>
                                  Nouveau message
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className={deleteBtnClass}
                                    aria-label="Supprimer la notification"
                                    title="Supprimer"
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      dismissNotification({ email, entry });
                                    }}
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    >
                                      <path d="M3 6h18" />
                                      <path d="M8 6V4h8v2" />
                                      <path d="M19 6l-1 14H6L5 6" />
                                      <path d="M10 11v6" />
                                      <path d="M14 11v6" />
                                    </svg>
                                  </button>
                                  <div className="text-xs text-gray-500">{formatDate(m.created_at)}</div>
                                </div>
                              </div>
                              {offerTitle && (
                                <div className="mt-1 text-xs font-semibold text-gray-700">Offre : {offerTitle}</div>
                              )}
                              <div className="mt-2 text-sm text-gray-700">
                                Vous avez reçu un nouveau message de l'équipe. Cliquez pour ouvrir la messagerie.
                              </div>
                            </div>
                          );
                        }

                        const emoji = isStatus
                          ? (isStatusBodyApproved(m?.body) ? '✅' : isStatusBodyRejected(m?.body) ? '❌' : '📌')
                          : '📣';

                        const onToggle = () => setOpenNotificationKey((prev) => (prev === entry.key ? null : entry.key));

                        return (
                          <div
                            key={entry.key}
                            onClick={onToggle}
                            role="button"
                            tabIndex={0}
                            className={`w-full text-left ${cardClass} cursor-pointer`}
                            id={`message-${m.id}`}
                            onKeyDown={(ev) => {
                              if (ev.key === 'Enter' || ev.key === ' ') {
                                ev.preventDefault();
                                onToggle();
                              }
                            }}
                            onPointerDown={(e) => {
                              if (e.pointerType === 'mouse') return;
                              startLongPress(() => dismissNotification({ email, entry }));
                            }}
                            onPointerUp={cancelLongPress}
                            onPointerCancel={cancelLongPress}
                            onPointerLeave={cancelLongPress}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className={titleClass}>
                                <span aria-hidden="true">{emoji}</span>
                                {isStatus ? 'Statut de candidature' : 'Notification'}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className={deleteBtnClass}
                                  aria-label="Supprimer la notification"
                                  title="Supprimer"
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    dismissNotification({ email, entry });
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4h8v2" />
                                    <path d="M19 6l-1 14H6L5 6" />
                                    <path d="M10 11v6" />
                                    <path d="M14 11v6" />
                                  </svg>
                                </button>
                                <div className="text-xs text-gray-500">{formatDate(m.created_at)}</div>
                              </div>
                            </div>
                            {offerTitle && (
                              <div className="mt-1 text-xs font-semibold text-gray-700">Offre : {offerTitle}</div>
                            )}

                            {!isOpen ? (
                              <>
                                <div className="mt-2 text-sm text-gray-700">
                                  {previewText(m?.body) || 'Cliquez pour lire la notification.'}
                                </div>
                                <div className="mt-2 text-xs font-semibold text-blue-700">Lire</div>
                              </>
                            ) : (
                              <>
                                <div className="mt-2 whitespace-pre-wrap text-sm text-gray-900 break-words">{m.body}</div>
                                <div className="mt-2 text-xs font-semibold text-blue-700">Fermer</div>
                              </>
                            )}
                          </div>
                        );

                      })}
                    </div>
                  )
                )}
              </div>

              {canReply ? (
                <div className="shrink-0 border-t bg-white p-2.5 sm:p-5 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={1}
                      className="flex-1 min-w-0 px-3 py-2 sm:px-4 sm:py-3 border rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-sm resize-none"
                      placeholder="Écrivez votre message…"
                    />
                    <button
                      type="button"
                      disabled={sending || !draft.trim()}
                      onClick={sendCandidate}
                      className="shrink-0 inline-flex items-center justify-center gap-2 h-10 sm:h-11 px-3 sm:px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                        aria-hidden="true"
                      >
                        <path d="M22 2 11 13" />
                        <path d="M22 2 15 22 11 13 2 9 22 2Z" />
                      </svg>
                      <span className="hidden sm:inline">Envoyer</span>
                    </button>
                  </div>
                </div>
              ) : (
                (application.status === 'approved' && !isConversation) ? null : (
                  <div className="shrink-0 p-5 border-t bg-gray-50 text-gray-700">
                    {application.status === 'rejected'
                      ? 'Votre candidature a été rejetée : vous pouvez lire le message, mais vous ne pouvez pas répondre.'
                      : 'Vous pouvez lire les notifications. La conversation s\'activera une fois la candidature approuvée.'}
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

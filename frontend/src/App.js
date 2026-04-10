import './App.css';
import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import ApplicationForm from './components/ApplicationForm';
import ApplicationsList from './components/ApplicationsList';
import ApplicationProfile from './components/ApplicationProfile';
import AdminApplicationDetail from './components/AdminApplicationDetail';
import AdminMessenger from './components/AdminMessenger';
import CandidateMessenger from './components/CandidateMessenger';
import Opportunities from './components/Opportunities';
import ApplicationSubmissionDetail from './components/ApplicationSubmissionDetail';
import OfferDetail from './components/OfferDetail';
import Onboarding from './components/Onboarding';
import AdminOffers from './components/AdminOffers';
import AdminOfferDetail from './components/AdminOfferDetail';
import AdminSettings from './components/AdminSettings';
import AdminStats from './components/AdminStats';
import AdminNotifications from './components/AdminNotifications';
import CandidateLogin from './components/CandidateLogin';
import CandidateRegister from './components/CandidateRegister';
import CandidateSettings from './components/CandidateSettings';
import CandidateForgotPassword from './components/CandidateForgotPassword';
import CandidateVerifyEmail from './components/CandidateVerifyEmail';
import CandidateCandidatureSpace from './components/CandidateCandidatureSpace';
import AdminLogin from './components/AdminLogin';
import { applicationService } from './services/api';

function CandidateProfileRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;

    (async () => {
      let hasCandidate = false;
      try {
        const candidateId = localStorage.getItem('candidateAccountId');
        if (!candidateId) {
          navigate('/connexion', { replace: true });
          return;
        }
        hasCandidate = true;

        const candidateEmail = (() => {
          try {
            return localStorage.getItem('candidateAccountEmail');
          } catch {
            return null;
          }
        })();

        const canUseEmail = Boolean(String(candidateEmail || '').trim());

        // Si une dernière candidature est connue, on ouvre toujours celle-ci.
        // (Même si elle est en cours/rejetée.)
        const lastId = (() => {
          try {
            return localStorage.getItem('lastApplicationId');
          } catch {
            return null;
          }
        })();

        if (lastId) {
          try {
            const payload = await applicationService.getApplication(String(lastId));
            if (!alive) return;
            const appId = payload?.data?.id;
            const status = payload?.data?.status;
            if (appId) {
              try {
                localStorage.setItem('lastApplicationId', String(appId));
                if (status) localStorage.setItem('lastApplicationStatus', String(status));
                window.dispatchEvent(new Event('lastApplicationIdChanged'));
              } catch {
                // ignore
              }
              navigate(`/profil/${encodeURIComponent(String(appId))}`, { replace: true });
              return;
            }
          } catch {
            // lastApplicationId invalide: on continue avec le fallback (liste candidatures)
            try {
              localStorage.removeItem('lastApplicationId');
              localStorage.removeItem('lastApplicationStatus');
              window.dispatchEvent(new Event('lastApplicationIdChanged'));
            } catch {
              // ignore
            }
          }
        }

        // Pas de lastApplicationId (ou invalide): si on a un email, on tente de retrouver les candidatures.
        if (canUseEmail) {
          try {
            const listPayload = await applicationService.getCandidateApplicationsByEmail(String(candidateEmail));
            if (!alive) return;
            const list = Array.isArray(listPayload?.data) ? listPayload.data : [];
            const sorted = list
              .filter((a) => a?.id)
              .slice()
              .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0));

            if (sorted.length > 0) {
              const latest = sorted[0];
              try {
                localStorage.setItem('lastApplicationId', String(latest.id));
                if (latest?.status) localStorage.setItem('lastApplicationStatus', String(latest.status));
                window.dispatchEvent(new Event('lastApplicationIdChanged'));
              } catch {
                // ignore
              }

              navigate(`/profil/${encodeURIComponent(String(latest.id))}`, { replace: true });
              return;
            }
          } catch {
            // ignore: si ça échoue, on tombera sur le profil par défaut.
          }
        }

        const profileId = localStorage.getItem('candidateProfileApplicationId');
        if (profileId) {
          try {
            await applicationService.getApplication(String(profileId));
            if (!alive) return;
            navigate(`/profil/${encodeURIComponent(String(profileId))}`, { replace: true });
            return;
          } catch {
            try {
              localStorage.removeItem('candidateProfileApplicationId');
            } catch {
              // ignore
            }
          }
        }

        // Crée/charge un profil "par défaut" (brouillon sans offre), séparé des candidatures.
        const payload = await applicationService.getOrCreateCandidateProfile(candidateId);
        if (!alive) return;

        const appId = payload?.data?.id;
        if (!appId) {
          navigate('/candidature', { replace: true });
          return;
        }

        try {
          localStorage.setItem('candidateProfileApplicationId', String(appId));
        } catch {
          // ignore
        }

        navigate(`/profil/${encodeURIComponent(String(appId))}`, { replace: true });
      } catch {
        // Fallback: si le profil "par défaut" échoue, on tombe sur l'espace candidature.
        navigate(hasCandidate ? '/candidature' : '/connexion', { replace: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <div className="h-6 w-6 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
    </div>
  );
}

function RequireAdmin({ children }) {
  const location = useLocation();
  const token = (() => {
    try {
      return localStorage.getItem('adminToken');
    } catch {
      return null;
    }
  })();

  if (!token) {
    const next = encodeURIComponent(`${location.pathname}${location.search || ''}`);
    return <Navigate to={`/admin/connexion?next=${next}`} replace />;
  }

  return children;
}

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminMessengerRoute = location.pathname.startsWith('/admin/messages');
  const [lastApplicationId, setLastApplicationId] = useState(() => {
    try {
      return localStorage.getItem('lastApplicationId');
    } catch {
      return null;
    }
  });

  const [lastApplicationStatus, setLastApplicationStatus] = useState(() => {
    try {
      return localStorage.getItem('lastApplicationStatus');
    } catch {
      return null;
    }
  });

  const [candidateAccountId, setCandidateAccountId] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountId');
    } catch {
      return null;
    }
  });

  const [candidateAccountEmail, setCandidateAccountEmail] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountEmail');
    } catch {
      return null;
    }
  });

  const [candidateUnreadCount, setCandidateUnreadCount] = useState(() => {
    try {
      const lastId = localStorage.getItem('lastApplicationId');
      if (!lastId) return 0;
      const v = localStorage.getItem(`candidateUnreadCount:${String(lastId)}`);
      return v ? Number(v) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [candidateStatusUnreadCount, setCandidateStatusUnreadCount] = useState(() => {
    try {
      const lastId = localStorage.getItem('lastApplicationId');
      if (!lastId) return 0;
      const v = localStorage.getItem(`candidateStatusUnreadCount:${String(lastId)}`);
      return v ? Number(v) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [adminToken, setAdminToken] = useState(() => {
    try {
      return localStorage.getItem('adminToken');
    } catch {
      return null;
    }
  });

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef(null);

  const isAdminRoute = location.pathname.startsWith('/admin');
  const showAdminNav = isAdminRoute && Boolean(adminToken);
  const isCandidateMessengerRoute = location.pathname.startsWith('/messages/') || location.pathname.startsWith('/notifications/');
  const isOnboardingRoute = location.pathname.startsWith('/onboarding');

  useEffect(() => {
    if (isAdminRoute || isOnboardingRoute) return;
    try {
      const seen = localStorage.getItem('onboardingSeen');
      if (!seen) navigate('/onboarding', { replace: true });
    } catch {
      // ignore
    }
  }, [isAdminRoute, isOnboardingRoute, navigate]);
  const isCandidateProfileRoute =
    location.pathname.startsWith('/profil') ||
    location.pathname.startsWith('/candidature') ||
    location.pathname.startsWith('/candidatures');

  const isLikelyStatusBody = (body) => {
    const text = String(body || '').toLowerCase();
    if (!text.includes('candidature')) return false;
    return text.includes('approuv') || text.includes('rejet');
  };

  useEffect(() => {
    setAdminMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isCandidateMessengerRoute) return undefined;

    const prev = window.history.scrollRestoration;
    try {
      window.history.scrollRestoration = 'manual';
    } catch {
      // ignore
    }

    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } catch {
      window.scrollTo(0, 0);
    }

    return () => {
      try {
        window.history.scrollRestoration = prev;
      } catch {
        // ignore
      }
    };
  }, [isCandidateMessengerRoute]);

  useEffect(() => {
    if (!isCandidateMessengerRoute) return undefined;

    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isCandidateMessengerRoute]);

  useEffect(() => {
    if (!adminMenuOpen) return undefined;

    const onPointerDown = (e) => {
      const el = adminMenuRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setAdminMenuOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setAdminMenuOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [adminMenuOpen]);

  useEffect(() => {
    const refresh = () => {
      try {
        const nextLastId = localStorage.getItem('lastApplicationId');
        setLastApplicationId(nextLastId);
        setLastApplicationStatus(localStorage.getItem('lastApplicationStatus'));
        const nextCandidateId = localStorage.getItem('candidateAccountId');
        setCandidateAccountId(nextCandidateId);
        setCandidateAccountEmail(localStorage.getItem('candidateAccountEmail'));
        setAdminToken(localStorage.getItem('adminToken'));

        if (nextLastId) {
          const v = localStorage.getItem(`candidateUnreadCount:${String(nextLastId)}`);
          setCandidateUnreadCount(v ? Number(v) || 0 : 0);

          const vn = localStorage.getItem(`candidateStatusUnreadCount:${String(nextLastId)}`);
          setCandidateStatusUnreadCount(vn ? Number(vn) || 0 : 0);
        } else {
          setCandidateUnreadCount(0);
          setCandidateStatusUnreadCount(0);
        }
      } catch {
        setLastApplicationId(null);
        setLastApplicationStatus(null);
        setCandidateAccountId(null);
        setCandidateAccountEmail(null);
        setAdminToken(null);
        setCandidateUnreadCount(0);
        setCandidateStatusUnreadCount(0);
      }
    };

    window.addEventListener('storage', refresh);
    window.addEventListener('lastApplicationIdChanged', refresh);
    window.addEventListener('candidateSessionChanged', refresh);
    window.addEventListener('adminSessionChanged', refresh);
    window.addEventListener('candidateNotificationsChanged', refresh);

    return () => {
      window.removeEventListener('storage', refresh);
      window.removeEventListener('lastApplicationIdChanged', refresh);
      window.removeEventListener('candidateSessionChanged', refresh);
      window.removeEventListener('adminSessionChanged', refresh);
      window.removeEventListener('candidateNotificationsChanged', refresh);
    };
  }, []);

  useEffect(() => {
    // Polling léger: met à jour le badge de notifications (dernière candidature) côté candidat.
    if (isAdminRoute) return undefined;
    if (!lastApplicationId) return undefined;

    let cancelled = false;

    const tick = async () => {
      try {
        const payload = await applicationService.getApplicationMessages(lastApplicationId, {
          candidateEmail: candidateAccountEmail || undefined,
        });
        if (cancelled) return;

        const list = payload?.data || [];
        const seenKey = `candidateNotificationsSeenAt:${String(lastApplicationId)}`;
        const unreadKey = `candidateUnreadCount:${String(lastApplicationId)}`;
        const statusSeenKey = `candidateStatusSeenAt:${String(lastApplicationId)}`;
        const statusUnreadKey = `candidateStatusUnreadCount:${String(lastApplicationId)}`;
        const lastSeenAt = (() => {
          try {
            return localStorage.getItem(seenKey);
          } catch {
            return null;
          }
        })();

        // Première visite : on initialise seenAt à maintenant pour ne pas compter les anciens messages
        if (!lastSeenAt) {
          try {
            localStorage.setItem(seenKey, new Date().toISOString());
            localStorage.setItem(statusSeenKey, new Date().toISOString());
          } catch {
            // ignore
          }
          return;
        }

        const lastSeenTs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;

        const lastStatusSeenAt = (() => {
          try {
            return localStorage.getItem(statusSeenKey);
          } catch {
            return null;
          }
        })();
        const lastStatusSeenTs = lastStatusSeenAt ? new Date(lastStatusSeenAt).getTime() : 0;

        let unread = 0;
        let unreadStatus = 0;
        for (const m of Array.isArray(list) ? list : []) {
          if (m?.sender !== 'admin') continue;
          const kind = String(m?.kind || 'message');
          const ts = new Date(m?.created_at || 0).getTime();
          if (!Number.isFinite(ts) || ts <= 0) continue;

          const isStatusNotification = kind !== 'message' || isLikelyStatusBody(m?.body);
          if (isStatusNotification) {
            if (ts > lastStatusSeenTs) unreadStatus += 1;
            continue;
          }

          if (ts > lastSeenTs) unread += 1;
        }

        try {
          localStorage.setItem(unreadKey, String(unread));
          localStorage.setItem(statusUnreadKey, String(unreadStatus));
          window.dispatchEvent(new Event('candidateNotificationsChanged'));
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    };

    tick();
    const id = window.setInterval(tick, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [candidateAccountEmail, isAdminRoute, lastApplicationId]);

  useEffect(() => {
    // Polling léger: synchronise le statut de la dernière candidature.
    // Objectif: afficher "Messagerie" dès que le statut passe à approved,
    // sans nécessiter un passage par /profil.
    if (isAdminRoute) return undefined;
    if (!candidateAccountId) return undefined;
    if (!lastApplicationId) return undefined;

    let cancelled = false;

    const tick = async () => {
      try {
        const payload = await applicationService.getApplication(lastApplicationId);
        if (cancelled) return;

        const status = String(payload?.data?.status || '').trim();
        if (!status) return;

        const stored = (() => {
          try {
            return localStorage.getItem('lastApplicationStatus');
          } catch {
            return null;
          }
        })();

        if (String(stored || '') === status) return;

        try {
          localStorage.setItem('lastApplicationStatus', status);
          window.dispatchEvent(new Event('lastApplicationIdChanged'));
        } catch {
          // ignore
        }
      } catch {
        // ignore
      }
    };

    const onFocus = () => tick();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };

    tick();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    const id = window.setInterval(tick, 20000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(id);
    };
  }, [candidateAccountId, isAdminRoute, lastApplicationId]);

  const adminLogout = () => {
    applicationService.clearAdminSession();
    // Empêche de retomber sur une session candidat encore stockée sur l'appareil.
    // Objectif UX: après déconnexion admin, revenir en mode « invité » (onboarding).
    try {
      applicationService.clearCandidateLogoutContext();
    } catch {
      // ignore
    }
    try {
      window.location.replace('/onboarding');
    } catch {
      navigate('/onboarding', { replace: true });
    }
  };

  return (
    <div
      className={
        isCandidateMessengerRoute || isAdminMessengerRoute
          ? 'h-[100dvh] bg-gray-100 flex flex-col overflow-hidden'
          : 'min-h-[100dvh] bg-gray-100 flex flex-col'
      }
    >
      {!isOnboardingRoute && (
        <header className="sticky top-0 z-50 bg-white border-b">
          <div
            className="max-w-6xl mx-auto pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 py-3 sm:py-4 flex items-center justify-between gap-3 w-full"
          >
            <div
              className={`shrink-0 font-extrabold tracking-tight text-gray-900 leading-none whitespace-nowrap ${
                isAdminRoute ? 'text-lg sm:text-lg' : 'text-xl sm:text-lg'
              }`}
            >
              Vaybe{isAdminRoute ? <span className="text-gray-500"> (Admin)</span> : <></>}
              {!isAdminRoute ? <span className="hidden sm:inline"> • Candidatures</span> : <></>}
            </div>
            <nav
              className={
                isAdminRoute
                  ? 'flex items-center gap-2 flex-1 min-w-0 justify-end'
                  : 'flex items-center gap-2 flex-1 min-w-0 justify-end'
              }
            >
              {!isAdminRoute ? (
                <div className="flex flex-nowrap gap-1.5 sm:gap-2 sm:justify-end overflow-x-auto no-scrollbar [-webkit-overflow-scrolling:touch] pb-1">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:px-4 sm:py-2 rounded-xl border text-sm sm:text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                    }`
                  }
                  end
                >
                  Offres
                </NavLink>

                {candidateAccountId && (
                  <NavLink
                    to="/profil"
                    className={({ isActive }) =>
                      `shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:px-4 sm:py-2 rounded-xl border text-sm sm:text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                      }`
                    }
                  >
                    Profil
                  </NavLink>
                )}

                {candidateAccountId && (
                  <NavLink
                    to="/parametres"
                    className={({ isActive }) =>
                      `shrink-0 min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:px-3 sm:py-2 rounded-xl border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                      }`
                    }
                    aria-label="Paramètres"
                    title="Paramètres"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 3.4 17l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 6.04 3.4l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 9 2.28V2a2 2 0 0 1 4 0v.09c0 .66.39 1.26 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 1 1 20.6 6l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01c.26.61.85 1 1.51 1H22a2 2 0 0 1 0 4h-.09c-.66 0-1.26.39-1.51 1Z" />
                    </svg>
                  </NavLink>
                )}

                {candidateAccountId && lastApplicationId && (
                  <NavLink
                    to={`/notifications/${lastApplicationId}`}
                    className={({ isActive }) =>
                      `relative shrink-0 min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:px-3 sm:py-2 rounded-xl border text-sm sm:text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                      }`
                    }
                    onClick={() => {
                      try {
                        const seenKey = `candidateStatusSeenAt:${String(lastApplicationId)}`;
                        const unreadKey = `candidateStatusUnreadCount:${String(lastApplicationId)}`;
                        localStorage.setItem(seenKey, new Date().toISOString());
                        localStorage.setItem(unreadKey, '0');
                        window.dispatchEvent(new Event('candidateNotificationsChanged'));
                      } catch {
                        // ignore
                      }
                    }}
                    aria-label="Notifications"
                    title="Notifications"
                  >
                    {candidateStatusUnreadCount > 0 && (
                      <span className="absolute left-2 -bottom-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-extrabold ring-2 ring-white px-1 animate-pulse">
                        {candidateStatusUnreadCount > 9 ? '9+' : String(candidateStatusUnreadCount)}
                      </span>
                    )}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 sm:h-5 sm:w-5"
                      aria-hidden="true"
                    >
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                  </NavLink>
                )}

                {!candidateAccountId ? (
                  <>
                    <NavLink
                      to="/connexion"
                      className={({ isActive }) =>
                        `shrink-0 whitespace-nowrap min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:px-4 sm:py-2 rounded-xl border text-sm sm:text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                          isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                        }`
                      }
                    >
                      Connexion
                    </NavLink>
                  </>
                ) : (
                  <></>
                )}

                {candidateAccountId && lastApplicationId && lastApplicationStatus === 'approved' && (
                  <NavLink
                    to={`/messages/${lastApplicationId}`}
                    className={({ isActive }) =>
                      `relative shrink-0 min-h-[44px] sm:min-h-0 px-3 py-2.5 sm:px-4 sm:py-2 rounded-xl border text-sm sm:text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-800 border-gray-200 hover:bg-gray-100'
                      }`
                    }
                    aria-label="Messages"
                    title="Messages"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-6 w-6 sm:h-5 sm:w-5"
                      aria-hidden="true"
                    >
                      <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                    </svg>
                    {candidateUnreadCount > 0 && (
                      <span className="absolute left-2 -bottom-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-extrabold ring-2 ring-white px-1 animate-pulse">
                        {candidateUnreadCount > 9 ? '9+' : String(candidateUnreadCount)}
                      </span>
                    )}
                  </NavLink>
                )}
                </div>
              ) : showAdminNav ? (
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 min-w-0 flex flex-nowrap gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar [-webkit-overflow-scrolling:touch]">
                  <NavLink
                    to="/admin"
                    className={({ isActive }) =>
                      `shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    end
                  >
                    Candidatures
                  </NavLink>
                  <NavLink
                    to="/admin/offres"
                    className={({ isActive }) =>
                      `shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    Offres
                  </NavLink>
                  <NavLink
                    to="/admin/messages"
                    className={({ isActive }) =>
                      `shrink-0 inline-flex items-center justify-center px-3 py-2 sm:px-3 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    aria-label="Messagerie"
                    title="Messagerie"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-5 w-5"
                      aria-hidden="true"
                    >
                      <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
                    </svg>
                  </NavLink>
                  </div>

                {adminToken && (
                  <div ref={adminMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setAdminMenuOpen((v) => !v)}
                      className={`inline-flex items-center justify-center rounded-xl p-2 border border-gray-200 bg-white hover:bg-gray-50 transition ${
                        adminMenuOpen ? 'ring-2 ring-blue-200' : ''
                      } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
                      aria-haspopup="menu"
                      aria-expanded={adminMenuOpen ? 'true' : 'false'}
                      aria-label="Paramètres admin"
                      title="Paramètres"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5 text-gray-700"
                        aria-hidden="true"
                      >
                        <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 3.4 17l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 6.04 3.4l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 9 2.28V2a2 2 0 0 1 4 0v.09c0 .66.39 1.26 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06A2 2 0 1 1 20.6 6l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01c.26.61.85 1 1.51 1H22a2 2 0 0 1 0 4h-.09c-.66 0-1.26.39-1.51 1Z" />
                      </svg>
                    </button>

                    {adminMenuOpen && (
                      <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl border bg-white shadow-sm overflow-hidden">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAdminMenuOpen(false);
                            navigate('/admin/parametres');
                          }}
                          className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Paramètres
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAdminMenuOpen(false);
                            navigate('/admin/statistiques');
                          }}
                          className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Statistiques
                        </button>

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAdminMenuOpen(false);
                            navigate('/admin/notifications');
                          }}
                          className="w-full text-left px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                          Notifications
                        </button>

                        <div className="my-1 h-px bg-gray-100" />

                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setAdminMenuOpen(false);
                            adminLogout();
                          }}
                          className="w-full text-left px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Déconnexion
                        </button>
                      </div>
                    )}
                  </div>
                )}
                </div>
              ) : (
                <></>
              )}
            </nav>
          </div>
        </header>
      )}

      <main
        className={
          isCandidateMessengerRoute
            ? 'max-w-6xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-4 py-2 sm:py-6 flex flex-col overflow-hidden'
            : isAdminMessengerRoute
              ? 'max-w-6xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-4 py-2 sm:py-6 flex flex-col overflow-hidden'
            : isOnboardingRoute
              ? 'w-full flex-1 min-h-0 flex flex-col'
            : isCandidateProfileRoute
              ? 'w-full flex-1 min-h-0 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-6 py-4 sm:py-10 flex flex-col'
              : 'max-w-6xl mx-auto w-full flex-1 min-h-0 px-3 sm:px-4 py-4 sm:py-10 flex flex-col'
        }
      >
        <div className="flex-1 min-h-0 flex flex-col">
          <Routes>
            <Route path="/onboarding" element={<Onboarding />} />

            <Route
              path="/"
              element={<Opportunities />}
            />
            <Route
              path="/opportunites"
              element={<Opportunities />}
            />
            <Route
              path="/opportunites/:id"
              element={<OfferDetail />}
            />
            <Route path="/connexion" element={<CandidateLogin />} />
            <Route path="/inscription" element={<CandidateRegister />} />
            <Route path="/mot-de-passe-oublie" element={<CandidateForgotPassword />} />
            <Route path="/verification-email" element={<CandidateVerifyEmail />} />
            <Route path="/parametres" element={<CandidateSettings />} />
            <Route path="/profil" element={<CandidateProfileRedirect />} />
            <Route path="/candidature" element={<CandidateCandidatureSpace />} />
            <Route path="/postuler" element={<ApplicationForm />} />
            <Route path="/admin/connexion" element={<AdminLogin />} />

            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <ApplicationsList />
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/parametres"
              element={
                <RequireAdmin>
                  <AdminSettings />
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/statistiques"
              element={
                <RequireAdmin>
                  <AdminStats />
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/notifications"
              element={
                <RequireAdmin>
                  <AdminNotifications />
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/offres"
              element={
                <RequireAdmin>
                  <AdminOffers />
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/offres/:id"
              element={
                <RequireAdmin>
                  <AdminOfferDetail />
                </RequireAdmin>
              }
            />

            <Route path="/profil/:id" element={<ApplicationProfile />} />

            <Route
              path="/admin/candidatures/:id"
              element={
                <RequireAdmin>
                  <AdminApplicationDetail />
                </RequireAdmin>
              }
            />

            <Route
              path="/admin/messages"
              element={
                <RequireAdmin>
                  <AdminMessenger />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/messages/:id"
              element={
                <RequireAdmin>
                  <AdminMessenger />
                </RequireAdmin>
              }
            />

            <Route path="/notifications/:id" element={<CandidateMessenger />} />
            <Route path="/messages/:id" element={<CandidateMessenger />} />
            <Route path="/candidatures/:id" element={<ApplicationSubmissionDetail />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;

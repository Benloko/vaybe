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
import AdminOffers from './components/AdminOffers';
import AdminSettings from './components/AdminSettings';
import AdminStats from './components/AdminStats';
import AdminNotifications from './components/AdminNotifications';
import CandidateLogin from './components/CandidateLogin';
import CandidateRegister from './components/CandidateRegister';
import CandidateAccountProfile from './components/CandidateAccountProfile';
import CandidateCandidatureSpace from './components/CandidateCandidatureSpace';
import AdminLogin from './components/AdminLogin';
import { applicationService } from './services/api';

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
        setCandidateAccountId(localStorage.getItem('candidateAccountId'));
        setCandidateAccountEmail(localStorage.getItem('candidateAccountEmail'));
        setAdminToken(localStorage.getItem('adminToken'));

        if (nextLastId) {
          const v = localStorage.getItem(`candidateUnreadCount:${String(nextLastId)}`);
          setCandidateUnreadCount(v ? Number(v) || 0 : 0);
        } else {
          setCandidateUnreadCount(0);
        }
      } catch {
        setLastApplicationId(null);
        setLastApplicationStatus(null);
        setCandidateAccountId(null);
        setCandidateAccountEmail(null);
        setAdminToken(null);
        setCandidateUnreadCount(0);
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
        const lastSeenAt = (() => {
          try {
            return localStorage.getItem(seenKey);
          } catch {
            return null;
          }
        })();
        const lastSeenTs = lastSeenAt ? new Date(lastSeenAt).getTime() : 0;

        let unread = 0;
        for (const m of Array.isArray(list) ? list : []) {
          if (m?.sender !== 'admin') continue;
          const ts = new Date(m?.created_at || 0).getTime();
          if (!Number.isFinite(ts) || ts <= 0) continue;
          if (ts > lastSeenTs) unread += 1;
        }

        try {
          localStorage.setItem(unreadKey, String(unread));
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

  const adminLogout = () => {
    applicationService.clearAdminSession();
    navigate('/admin/connexion', { replace: true });
  };

  return (
    <div
      className={
        isCandidateMessengerRoute
          ? 'h-[100dvh] bg-gray-100 flex flex-col overflow-hidden'
          : 'min-h-[100dvh] bg-gray-100 flex flex-col'
      }
    >
      <header className="sticky top-0 z-50 bg-white border-b">
        <div className="max-w-6xl mx-auto pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4 py-2.5 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 sm:justify-between">
          <div className="text-base sm:text-base font-bold text-gray-800 leading-none whitespace-nowrap">
            Vaybe
            <span className="hidden sm:inline"> • {isAdminRoute ? 'Admin' : 'Candidatures'}</span>
          </div>
          <nav className="flex items-center gap-2 sm:justify-end">
            {!isAdminRoute ? (
              <div className="flex flex-nowrap gap-1.5 sm:gap-2 sm:justify-end overflow-x-auto [-webkit-overflow-scrolling:touch]">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `shrink-0 whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                      isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  end
                >
                  Offres
                </NavLink>

                {(candidateAccountId || lastApplicationId) && (
                  <NavLink
                    to="/candidature"
                    className={({ isActive }) =>
                      `shrink-0 whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    Profil
                  </NavLink>
                )}

                {(candidateAccountId || lastApplicationId) && (
                  <NavLink
                    to={lastApplicationId ? `/notifications/${lastApplicationId}` : '/candidature'}
                    className={({ isActive }) =>
                      `relative shrink-0 px-2.5 py-2 sm:px-3 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                    aria-label="Notifications"
                    title="Notifications"
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
                      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    {candidateUnreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 text-white text-[11px] font-extrabold ring-2 ring-white px-1">
                        {candidateUnreadCount > 9 ? '9+' : String(candidateUnreadCount)}
                      </span>
                    )}
                  </NavLink>
                )}

                {!candidateAccountId ? (
                  <>
                    <NavLink
                      to="/connexion"
                      className={({ isActive }) =>
                        `shrink-0 whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                          isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                        }`
                      }
                    >
                      Connexion
                    </NavLink>
                  </>
                ) : (
                  <></>
                )}

                {lastApplicationId && lastApplicationStatus === 'approved' && (
                  <NavLink
                    to={`/messages/${lastApplicationId}`}
                    className={({ isActive }) =>
                      `shrink-0 whitespace-nowrap px-2.5 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    Messages
                  </NavLink>
                )}
              </div>
            ) : showAdminNav ? (
              <div className="flex items-center gap-2 w-full">
                <div className="flex-1 min-w-0 flex flex-nowrap gap-1.5 sm:gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
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
                      `shrink-0 whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white ${
                        isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    Messages
                  </NavLink>
                </div>

                {adminToken && (
                  <div ref={adminMenuRef} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setAdminMenuOpen((v) => !v)}
                      className={`whitespace-nowrap px-3 py-2 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-sm font-medium transition ${
                        adminMenuOpen ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-100'
                      } focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white`}
                      aria-haspopup="menu"
                      aria-expanded={adminMenuOpen ? 'true' : 'false'}
                    >
                      Admin
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

      <main
        className={
          isCandidateMessengerRoute
            ? 'max-w-6xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-4 py-2 sm:py-6 flex flex-col overflow-hidden'
            : 'max-w-6xl mx-auto w-full flex-1 min-h-0 px-3 sm:px-4 py-4 sm:py-10 flex flex-col'
        }
      >
        <div className="flex-1 min-h-0 flex flex-col">
          <Routes>
            <Route path="/" element={<Opportunities />} />
            <Route path="/opportunites" element={<Opportunities />} />
            <Route path="/opportunites/:id" element={<OfferDetail />} />
            <Route path="/connexion" element={<CandidateLogin />} />
            <Route path="/inscription" element={<CandidateRegister />} />
            <Route path="/profil" element={<CandidateAccountProfile />} />
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

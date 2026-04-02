import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
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

function getStatusBadge(status) {
  const value = String(status || 'pending');
  if (value === 'approved') return 'bg-emerald-50 text-emerald-800 ring-emerald-200';
  if (value === 'rejected') return 'bg-rose-50 text-rose-800 ring-rose-200';
  return 'bg-gray-50 text-gray-800 ring-gray-200';
}

export default function ApplicationSubmissionDetail() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [application, setApplication] = useState(null);

  const [messagesLoading, setMessagesLoading] = useState(true);
  const [messagesError, setMessagesError] = useState('');
  const [messages, setMessages] = useState([]);

  const lastAdminMessage = useMemo(() => {
    for (let i = (messages?.length || 0) - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m?.sender === 'admin') return m;
    }
    return null;
  }, [messages]);

  const headerBadgeLabel = useMemo(() => {
    return application?.status === 'approved' ? 'Offre activée' : 'Espace activé';
  }, [application?.status]);

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setError('');
      setMessagesError('');

      try {
        const payload = await applicationService.getApplication(id);
        if (!alive) return;
        setApplication(payload?.data || null);

        const loadedId = payload?.data?.id;
        const loadedStatus = payload?.data?.status;
        if (loadedId) {
          try {
            localStorage.setItem('lastApplicationId', String(loadedId));
            if (loadedStatus) localStorage.setItem('lastApplicationStatus', String(loadedStatus));
            window.dispatchEvent(new Event('lastApplicationIdChanged'));
          } catch {
            // ignore
          }
        }
      } catch (err) {
        if (!alive) return;
        setError(err?.message || 'Impossible de charger la candidature.');
      } finally {
        if (!alive) return;
        setLoading(false);
      }

      try {
        setMessagesLoading(true);
        const payload = await applicationService.getApplicationMessages(id);
        if (!alive) return;
        setMessages(payload?.data || []);
      } catch (err) {
        if (!alive) return;
        setMessagesError(err?.message || 'Impossible de charger les messages.');
      } finally {
        if (!alive) return;
        setMessagesLoading(false);
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [id]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-r from-slate-900 to-slate-700 text-white">
          <div className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-white/10 ring-1 ring-white/20">
            {headerBadgeLabel}
          </div>
          <h1 className="mt-2 text-xl sm:text-3xl font-extrabold">Détails de la candidature</h1>
          <p className="mt-1 text-sm text-white/90">Consultable, non modifiable.</p>
        </div>

        <div className="p-4 sm:p-6">
          {loading && (
            <div className="p-4 rounded-xl border bg-gray-50 text-gray-700">
              Chargement…
            </div>
          )}

          {!loading && error && (
            <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-800">
              <div className="font-bold">Oups…</div>
              <div className="text-sm mt-1">{error}</div>
            </div>
          )}

          {!loading && !error && application && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <div className="text-xs text-gray-500">Candidat</div>
                  <div className="text-lg sm:text-xl font-extrabold text-gray-900 leading-snug">{application.nom}</div>
                  <div className="mt-1 text-sm text-gray-600">
                    {application.offer_title ? application.offer_title : (application.role === 'designer' ? 'Designer' : 'Développeur')}
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end sm:gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs sm:text-sm font-semibold ring-1 ${getStatusBadge(application.status)}`}>
                    {application.status === 'approved'
                      ? '✅ Approuvée'
                      : application.status === 'rejected'
                        ? '❌ Rejetée'
                        : '⏳ En cours'}
                  </span>
                  <Link
                    to={`/profil/${application.id}`}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl border bg-white hover:bg-gray-50 text-xs sm:text-sm font-semibold whitespace-nowrap"
                  >
                    Retour au profil
                  </Link>
                </div>
              </div>

              {application.status === 'approved' && (
                <div className="rounded-2xl border p-4 sm:p-5 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-extrabold text-gray-900">Messages</div>
                    <div className="text-sm text-gray-600">Conversation disponible car la candidature est approuvée.</div>
                  </div>
                  <Link
                    to={`/messages/${application.id}`}
                    className="w-full sm:w-auto text-center px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    Ouvrir
                  </Link>
                </div>
              )}

              {application.status === 'rejected' && (
                <div className="rounded-2xl border p-5 bg-rose-50 border-rose-200 text-rose-900">
                  <div className="font-extrabold">Message de l’équipe</div>
                  <div className="text-sm mt-1">Cette candidature a été rejetée.</div>
                  {messagesError ? (
                    <div className="text-sm mt-2">{messagesError}</div>
                  ) : messagesLoading ? (
                    <div className="text-sm mt-2">Chargement…</div>
                  ) : lastAdminMessage ? (
                    <div className="mt-3 rounded-xl border bg-white p-4">
                      <div className="text-xs text-gray-500">{formatDate(lastAdminMessage.created_at)}</div>
                      <div className="mt-1 whitespace-pre-wrap text-gray-900 text-sm">{lastAdminMessage.body}</div>
                    </div>
                  ) : (
                    <div className="text-sm mt-2">Aucun message.</div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border p-5 bg-white">
                <div className="text-sm font-extrabold text-gray-900">Informations soumises</div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">Email</div>
                    <div className="font-semibold text-gray-900">{application.email}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">Téléphone</div>
                    <div className="font-semibold text-gray-900">{application.telephone || '—'}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">Ville</div>
                    <div className="font-semibold text-gray-900">{application.ville || '—'}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">Score</div>
                    <div className="font-semibold text-gray-900">{application.score}/4</div>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border p-4">
                  <div className="text-xs text-gray-500">Message</div>
                  <div className="mt-2 whitespace-pre-wrap text-gray-900">{application.message}</div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">Portfolio</div>
                    {application.portfolio ? (
                      <a
                        href={application.portfolio}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-blue-700 hover:underline break-all"
                      >
                        {application.portfolio}
                      </a>
                    ) : (
                      <div className="mt-1 text-gray-700">Non renseigné</div>
                    )}
                  </div>

                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">CV</div>
                    {application.cv ? (
                      <a
                        href={application.cv}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-blue-700 hover:underline break-all"
                      >
                        {application.cv}
                      </a>
                    ) : (
                      <div className="mt-1 text-gray-700">Non renseigné</div>
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

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function CandidateAccountProfile() {
  const navigate = useNavigate();

  const [accountId, setAccountId] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountId');
    } catch {
      return null;
    }
  });

  const [fullName, setFullName] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountFullName') || '';
    } catch {
      return '';
    }
  });

  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountEmail') || '';
    } catch {
      return '';
    }
  });

  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem('candidateAccountPhone') || '';
    } catch {
      return '';
    }
  });

  useEffect(() => {
    const refresh = () => {
      try {
        setAccountId(localStorage.getItem('candidateAccountId'));
        setFullName(localStorage.getItem('candidateAccountFullName') || '');
        setEmail(localStorage.getItem('candidateAccountEmail') || '');
        setPhone(localStorage.getItem('candidateAccountPhone') || '');
      } catch {
        setAccountId(null);
        setFullName('');
        setEmail('');
        setPhone('');
      }
    };

    window.addEventListener('candidateSessionChanged', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('candidateSessionChanged', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!accountId) {
      navigate('/connexion');
    }
  }, [accountId, navigate]);

  const initials = useMemo(() => {
    const src = (fullName || email || '').trim();
    if (!src) return 'C';
    const parts = src.split(/\s+/).filter(Boolean);
    const letters = parts.slice(0, 2).map((p) => p[0].toUpperCase());
    return letters.join('') || 'C';
  }, [fullName, email]);

  const logout = () => {
    applicationService.clearCandidateLogoutContext();
    navigate('/');
  };

  if (!accountId) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Espace candidat</div>
          <div className="text-xl font-extrabold text-gray-900">Profil</div>
        </div>
        <Link to="/" className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
          Opportunités
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-6 flex items-center gap-4 border-b">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white font-extrabold flex items-center justify-center">
            {initials}
          </div>
          <div>
            <div className="text-lg font-extrabold text-gray-900">{fullName || 'Candidat'}</div>
            <div className="text-sm text-gray-500">Compte candidat</div>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-xs uppercase tracking-wide text-gray-500">Email</div>
            <div className="mt-1 font-semibold text-gray-900 break-all">{email || '-'}</div>
          </div>

          <div className="p-4 rounded-2xl border bg-gray-50">
            <div className="text-xs uppercase tracking-wide text-gray-500">Téléphone</div>
            <div className="mt-1 font-semibold text-gray-900">{phone || '-'}</div>
          </div>
        </div>

        <div className="p-6 pt-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold"
          >
            Déconnexion
          </button>
        </div>
      </div>
    </div>
  );
}

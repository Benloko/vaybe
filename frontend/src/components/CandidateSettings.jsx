import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function CandidateSettings() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [account, setAccount] = useState({
    id: localStorage.getItem('candidateAccountId') || '',
    full_name: localStorage.getItem('candidateAccountFullName') || '',
    email: localStorage.getItem('candidateAccountEmail') || '',
    phone: localStorage.getItem('candidateAccountPhone') || '',
    city: localStorage.getItem('candidateAccountCity') || '',
  });

  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [profileAppId, setProfileAppId] = useState(null);

  const [form, setForm] = useState({ full_name: account.full_name, phone: account.phone, city: account.city });
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [busy, setBusy] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [successPassword, setSuccessPassword] = useState('');
  const [errorPassword, setErrorPassword] = useState('');

  useEffect(() => {
    if (!account.id) { navigate('/connexion'); return; }
    
    // Utilise le profil déjà connu depuis le localStorage
    const storedProfileId = localStorage.getItem('candidateProfileApplicationId');
    if (storedProfileId) {
      setProfileAppId(storedProfileId);
      applicationService.getApplication(storedProfileId).then(p => {
        const url = applicationService.normalizePublicAssetUrl(p?.data?.avatar_url);
        if (url) setAvatarPreview(url);
      }).catch(() => {});
    } else {
      applicationService.getOrCreateCandidateProfile(account.id).then(p => {
        const appId = p?.data?.id;
        if (appId) {
          setProfileAppId(String(appId));
          const url = applicationService.normalizePublicAssetUrl(p?.data?.avatar_url);
          if (url) setAvatarPreview(url);
        }
      }).catch(() => {});
    }
  }, [account.id, navigate]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const deleteAvatar = async () => {
    if (!profileAppId) return;
    setBusyAvatar(true);
    setError('');
    try {
      const listPayload = await applicationService.getCandidateApplicationsByEmail(account.email);
      const apps = listPayload?.data || [];
      const ids = [...new Set([profileAppId, ...apps.map(a => a?.id).filter(Boolean)].filter(Boolean))];
      await Promise.all(ids.map(id => applicationService.deleteApplicationAvatar(id).catch(() => {})));
      // Vide le cache localStorage
      ids.forEach(id => { try { localStorage.removeItem(`candidateAvatar:${id}`); } catch {} });
      setAvatarPreview(null);
      setAvatarFile(null);
      setSuccess('Photo supprimée !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setBusyAvatar(false);
    }
  };

  const saveAvatar = async () => {
    if (!avatarFile || !account.id) return;
    setBusyAvatar(true);
    setError('');
    try {
      // Récupère toutes les candidatures du candidat
      const listPayload = await applicationService.getCandidateApplicationsByEmail(account.email);
      const apps = listPayload?.data || [];

      // Upload sur toutes les candidatures + le profil par défaut
      const ids = [...new Set([
        profileAppId,
        ...apps.map(a => a?.id).filter(Boolean)
      ].filter(Boolean))];

      await Promise.all(ids.map(id => applicationService.uploadApplicationAvatar(id, avatarFile)));
      // Vide le cache localStorage
      ids.forEach(id => { try { localStorage.removeItem(`candidateAvatar:${id}`); } catch {} });
      setAvatarFile(null);
      setSuccess('Photo mise à jour sur tous vos profils !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Erreur lors de l\'upload.');
    } finally {
      setBusyAvatar(false);
    }
  };

  const saveInfo = async () => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await applicationService.updateCandidateAccount(account.id, {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        city: form.city.trim(),
        email: account.email,
      });
      applicationService.setCandidateSession({
        id: account.id,
        full_name: form.full_name.trim(),
        email: account.email,
        phone: form.phone.trim(),
        city: form.city.trim(),
      });
      setAccount(a => ({ ...a, full_name: form.full_name.trim(), phone: form.phone.trim(), city: form.city.trim() }));
      setSuccess('Informations mises à jour !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.message || 'Erreur lors de la mise à jour.');
    } finally {
      setBusy(false);
    }
  };

  const savePassword = async () => {
    if (password.trim().length < 6 || password !== passwordConfirmation) return;
    setBusyPassword(true);
    setErrorPassword('');
    setSuccessPassword('');
    try {
      await applicationService.updateCandidateAccount(account.id, {
        full_name: account.full_name,
        email: account.email,
        phone: account.phone,
        password: password,
        password_confirmation: passwordConfirmation,
      });
      setPassword('');
      setPasswordConfirmation('');
      setSuccessPassword('Mot de passe mis à jour !');
      setTimeout(() => setSuccessPassword(''), 3000);
    } catch (err) {
      setErrorPassword(err?.message || 'Erreur.');
    } finally {
      setBusyPassword(false);
    }
  };

  const logout = () => {
    applicationService.clearCandidateLogoutContext();
    navigate('/');
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-3 sm:px-6 pb-16">

      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Espace candidat</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-gray-900">Paramètres</div>
        </div>
        <button onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
          ← Retour
        </button>
      </div>

      {/* Photo de profil */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-4">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="text-white font-extrabold text-base">Photo de profil</div>
          <div className="text-white/80 text-sm">Visible sur toutes vos candidatures</div>
        </div>
        <div className="p-6 flex flex-col items-center gap-4">
          <div className="relative">
            {avatarPreview ? (
              <img src={avatarPreview} alt="profil"
                className="h-36 w-36 rounded-full object-cover border-4 border-blue-100 shadow-md" />
            ) : (
              <div className="h-36 w-36 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-4 border-blue-100 flex items-center justify-center text-6xl shadow-md">
                👤
              </div>
            )}
            {/* Bouton caméra */}
            <button onClick={() => fileRef.current?.click()} disabled={busyAvatar}
              className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md border-2 border-white disabled:opacity-60"
              title="Changer la photo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </button>
            {/* Bouton supprimer */}
            {avatarPreview && !avatarFile && (
              <button onClick={deleteAvatar} disabled={busyAvatar}
                className="absolute bottom-1 left-1 h-9 w-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md border-2 border-white disabled:opacity-60"
                title="Supprimer la photo">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/>
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          {avatarFile && (
            <button onClick={saveAvatar} disabled={busyAvatar}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold disabled:opacity-60">
              {busyAvatar ? 'Enregistrement…' : '✅ Enregistrer la photo'}
            </button>
          )}
          {success && <div className="text-sm text-green-700 font-semibold">{success}</div>}
          {error && <div className="text-sm text-red-700">{error}</div>}
        </div>
      </div>

      {/* Informations personnelles */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-4">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-slate-700 to-slate-600">
          <div className="text-white font-extrabold text-base">Informations personnelles</div>
          <div className="text-white/80 text-sm">Nom, téléphone et ville</div>
        </div>
        <div className="p-5 space-y-4">
          {error && <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>}
          {success && <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm">{success}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nom complet</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
              placeholder="Votre nom complet" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <div className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 text-sm">
              {account.email}
            </div>
            <div className="mt-1 text-xs text-gray-400">L'email ne peut pas être modifié.</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
              placeholder="Votre numéro" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Ville de résidence</label>
            <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
              placeholder="Votre ville" />
          </div>

          <button onClick={saveInfo} disabled={busy || !form.full_name.trim()}
            className="w-full px-5 py-3 rounded-xl bg-slate-700 hover:bg-slate-800 text-white font-extrabold text-sm disabled:opacity-60">
            {busy ? 'Enregistrement…' : 'Enregistrer les modifications'}
          </button>
        </div>
      </div>

      {/* Mot de passe */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-4">
        <div className="px-5 py-4 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
          <div className="text-white font-extrabold text-base">Mot de passe</div>
          <div className="text-white/80 text-sm">Modifiez votre mot de passe</div>
        </div>
        <div className="p-5 space-y-4">
          {errorPassword && <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{errorPassword}</div>}
          {successPassword && <div className="p-3 rounded-xl border border-green-200 bg-green-50 text-green-800 text-sm">{successPassword}</div>}

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nouveau mot de passe</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
              placeholder="Minimum 6 caractères" />
            {password.trim() !== '' && password.trim().length < 6 && (
              <div className="mt-1 text-xs text-red-700">Minimum 6 caractères.</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmer le mot de passe</label>
            <input value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} type="password"
              className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300 text-sm"
              placeholder="Répétez le mot de passe" />
            {passwordConfirmation !== '' && password !== passwordConfirmation && (
              <div className="mt-1 text-xs text-red-700">Les mots de passe ne correspondent pas.</div>
            )}
          </div>

          <button onClick={savePassword}
            disabled={busyPassword || password.trim().length < 6 || password !== passwordConfirmation}
            className="w-full px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm disabled:opacity-60">
            {busyPassword ? 'Enregistrement…' : 'Changer le mot de passe'}
          </button>
        </div>
      </div>

      {/* Déconnexion */}
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="p-5">
          <button onClick={logout}
            className="w-full px-5 py-3 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-extrabold text-sm">
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

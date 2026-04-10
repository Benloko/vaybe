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
        <div className="p-5 flex flex-col sm:flex-row items-center gap-5">
          <div className="shrink-0">
            {avatarPreview ? (
              <img src={avatarPreview} alt="profil"
                className="h-24 w-24 rounded-full object-cover border-4 border-blue-100 shadow" />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 border-4 border-blue-100 flex items-center justify-center text-4xl shadow">
                👤
              </div>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-3 w-full">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold">
              {avatarPreview ? '📷 Changer la photo' : '📷 Ajouter une photo'}
            </button>
            {avatarFile && (
              <button onClick={saveAvatar} disabled={busyAvatar}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold disabled:opacity-60">
                {busyAvatar ? 'Enregistrement…' : '✅ Enregistrer la photo'}
              </button>
            )}
          </div>
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

import { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function CandidateRegister() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const reason = params.get('reason') || '';
  const next = params.get('next') || '';

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const loginHref = useMemo(() => {
    const qs = new URLSearchParams({ ...(next ? { next } : {}), ...(reason ? { reason } : {}) }).toString();
    return qs ? `/connexion?${qs}` : '/connexion';
  }, [next, reason]);

  // Étape 1 → envoyer le code
  const sendCode = async () => {
    if (!email.trim()) return;
    setBusy(true);
    setError('');
    try {
      await applicationService.sendVerificationCode({ email: email.trim() });
      setStep(3);
    } catch (err) {
      setError(err?.message || 'Erreur.');
    } finally {
      setBusy(false);
    }
  };

  // Étape 3 → vérifier le code
  const verifyCode = async () => {
    if (code.trim().length !== 6) return;
    setBusy(true);
    setError('');
    try {
      await applicationService.checkVerificationCode({ email: email.trim(), code: code.trim() });
      setStep(4);
    } catch (err) {
      setError(err?.message || 'Code invalide.');
    } finally {
      setBusy(false);
    }
  };

  // Étape 3 → photo (optionnelle)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatar(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  // Étape 4 → créer le compte
  const submit = async () => {
    if (password.trim().length < 6 || password !== passwordConfirmation) return;
    setBusy(true);
    setError('');
    try {
      const payload = await applicationService.registerCandidate({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });

      const data = payload?.data || {};
      applicationService.setCandidateSession(data);

      // Upload avatar si fourni
      if (avatar && data.id) {
        try {
          const profile = await applicationService.getOrCreateCandidateProfile(data.id);
          const appId = profile?.data?.id;
          if (appId) await applicationService.uploadApplicationAvatar(appId, avatar);
        } catch {
          // ignore
        }
      }

      navigate('/', { replace: true });
    } catch (err) {
      setError(err?.message || 'Impossible de créer le compte.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto pb-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Espace candidat</div>
          <div className="text-3xl sm:text-2xl font-extrabold text-gray-900">Inscription</div>
        </div>
        <Link to={loginHref} className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
          Retour
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-5 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h1 className="text-2xl font-extrabold">Créer un compte</h1>
          <p className="mt-1 text-white/90 text-sm">Étape {step} sur 5</p>
          <div className="mt-3 flex gap-1">
            {[1,2,3,4,5].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>}

          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nom complet *</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300"
                  placeholder="Votre nom complet" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Téléphone *</label>
                <input value={phone} onChange={e => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300"
                  placeholder="Votre numéro" />
              </div>
              <button type="button" disabled={!fullName.trim() || !phone.trim()}
                onClick={() => { setError(''); setStep(2); }}
                className="w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60">
                Suivant
              </button>
              <Link to={loginHref} className="block text-center text-sm font-semibold text-blue-700 hover:underline">
                Déjà un compte ? Connexion
              </Link>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-gray-600">Entrez votre adresse email. Un code de vérification vous sera envoyé.</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300"
                  placeholder="vous@exemple.com" />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setError(''); setStep(1); }}
                  className="flex-1 px-4 py-3 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
                  Retour
                </button>
                <button type="button" disabled={busy || !email.trim()} onClick={sendCode}
                  className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60">
                  {busy ? 'Envoi…' : 'Envoyer le code'}
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-gray-600">Un code à 6 chiffres a été envoyé à <strong>{email}</strong>. Il expire dans 15 minutes.</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Code de vérification *</label>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300 text-2xl tracking-widest text-center"
                  placeholder="000000" maxLength={6} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setError(''); setStep(2); }}
                  className="flex-1 px-4 py-3 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
                  Retour
                </button>
                <button type="button" disabled={busy || code.trim().length !== 6} onClick={verifyCode}
                  className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60">
                  {busy ? 'Vérification…' : 'Confirmer'}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-gray-600">Ajoutez une photo de profil (optionnel).</p>
              <div className="flex flex-col items-center gap-4">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="aperçu" className="h-24 w-24 rounded-full object-cover border-2 border-blue-500" />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-3xl">
                    👤
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
                  {avatarPreview ? 'Changer la photo' : 'Choisir une photo'}
                </button>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setError(''); setStep(3); }}
                  className="flex-1 px-4 py-3 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
                  Retour
                </button>
                <button type="button" onClick={() => { setError(''); setStep(5); }}
                  className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold">
                  {avatarPreview ? 'Continuer' : 'Passer'}
                </button>
              </div>
            </>
          )}

          {step === 5 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Mot de passe *</label>
                <input value={password} onChange={e => setPassword(e.target.value)} type="password"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300"
                  placeholder="Minimum 6 caractères" />
                {password.trim() !== '' && password.trim().length < 6 && (
                  <div className="mt-1 text-sm text-red-700">Minimum 6 caractères.</div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmer le mot de passe *</label>
                <input value={passwordConfirmation} onChange={e => setPasswordConfirmation(e.target.value)} type="password"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300"
                  placeholder="Répétez le mot de passe" />
                {passwordConfirmation !== '' && password !== passwordConfirmation && (
                  <div className="mt-1 text-sm text-red-700">Les mots de passe ne correspondent pas.</div>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setError(''); setStep(4); }}
                  className="flex-1 px-4 py-3 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
                  Retour
                </button>
                <button type="button"
                  disabled={busy || password.trim().length < 6 || password !== passwordConfirmation}
                  onClick={submit}
                  className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60">
                  {busy ? 'Création…' : 'Créer mon compte'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { applicationService } from '../services/api';

export default function CandidateForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sendCode = async () => {
    if (!identifier.trim()) return;
    setBusy(true);
    setError('');
    try {
      const payload = await applicationService.forgotPassword({ identifier: identifier.trim() });
      setEmail(payload?.data?.email || '');
      setStep(2);
    } catch (err) {
      setError(err?.message || 'Erreur.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length !== 6) return;
    setBusy(true);
    setError('');
    try {
      await applicationService.checkResetCode({ email, code: code.trim() });
      setStep(3);
    } catch (err) {
      setError(err?.message || 'Code invalide.');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async () => {
    if (password.trim().length < 6 || password !== passwordConfirmation) return;
    setBusy(true);
    setError('');
    try {
      await applicationService.resetPassword({
        email,
        code: code.trim(),
        password,
        password_confirmation: passwordConfirmation,
      });
      navigate('/connexion?reset=1', { replace: true });
    } catch (err) {
      setError(err?.message || 'Erreur.');
      if (err?.message?.includes('Code')) setStep(2);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="w-full sm:max-w-lg sm:mx-auto pb-10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-gray-500">Espace candidat</div>
          <div className="text-3xl sm:text-2xl font-extrabold text-gray-900">Mot de passe oublié</div>
        </div>
        <Link to="/connexion" className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
          Retour
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-md border overflow-hidden">
        <div className="px-5 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <h1 className="text-2xl font-extrabold">Récupérer mon compte</h1>
          <p className="mt-1 text-white/90 text-sm">Étape {step} sur 3</p>
          <div className="mt-3 flex gap-1">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>}

          {step === 1 && (
            <>
              <p className="text-sm text-gray-600">Entrez votre adresse email pour recevoir un code de réinitialisation.</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input value={identifier} onChange={e => setIdentifier(e.target.value)} type="email"
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300"
                  placeholder="vous@exemple.com" />
              </div>
              <button type="button" disabled={busy || !identifier.trim()} onClick={sendCode}
                className="w-full px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60">
                {busy ? 'Envoi…' : 'Envoyer le code'}
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-gray-600">Un code à 6 chiffres a été envoyé à <strong>{email}</strong>.</p>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Code de vérification *</label>
                <input value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 border-gray-300 text-2xl tracking-widest text-center"
                  placeholder="000000" maxLength={6} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setError(''); setStep(1); }}
                  className="flex-1 px-4 py-3 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
                  Retour
                </button>
                <button type="button" disabled={busy || code.trim().length !== 6} onClick={verifyCode}
                  className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60">
                  Confirmer
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nouveau mot de passe *</label>
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
                <button type="button" onClick={() => { setError(''); setStep(2); }}
                  className="flex-1 px-4 py-3 rounded-xl border bg-white hover:bg-gray-50 text-sm font-semibold">
                  Retour
                </button>
                <button type="button"
                  disabled={busy || password.trim().length < 6 || password !== passwordConfirmation}
                  onClick={resetPassword}
                  className="flex-1 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold disabled:opacity-60">
                  {busy ? 'Enregistrement…' : 'Réinitialiser'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

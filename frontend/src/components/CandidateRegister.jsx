import { useMemo, useState } from 'react';
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
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const step1Ready = useMemo(() => {
    if (fullName.trim() === '') return false;
    if (email.trim() === '') return false;
    if (phone.trim() === '') return false;
    return true;
  }, [fullName, email, phone]);

  const step2Ready = useMemo(() => {
    if (password.trim().length < 6) return false;
    if (passwordConfirmation.trim() === '') return false;
    if (password !== passwordConfirmation) return false;
    return true;
  }, [password, passwordConfirmation]);

  const canSubmit = step1Ready && step2Ready;

  const submit = async () => {
    if (!canSubmit) return;

    setBusy(true);
    setError('');

    try {
      await applicationService.registerCandidate({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password: password,
        password_confirmation: passwordConfirmation,
      });

      const qs = new URLSearchParams({
        created: '1',
        identifier: email.trim(),
        ...(next ? { next } : {}),
        ...(reason ? { reason } : {}),
      }).toString();
      navigate(`/connexion?${qs}`);
    } catch (err) {
      setError(err?.message || 'Impossible de créer le compte.');
    } finally {
      setBusy(false);
    }
  };

  const loginHref = useMemo(() => {
    const qs = new URLSearchParams({
      ...(next ? { next } : {}),
      ...(reason ? { reason } : {}),
    }).toString();

    return qs ? `/connexion?${qs}` : '/connexion';
  }, [next, reason]);

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm sm:text-sm text-gray-500">Espace candidat</div>
          <div className="text-2xl sm:text-xl font-extrabold text-gray-900">Inscription</div>
        </div>
        <Link
          to={loginHref}
          className="px-3 py-2 sm:px-4 sm:py-2 rounded-xl border bg-white hover:bg-gray-50 text-base sm:text-sm font-semibold whitespace-nowrap"
        >
          Retour
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-sm sm:text-sm text-white/90">Créer un compte</div>
          <h1 className="text-2xl sm:text-2xl font-extrabold">Candidat</h1>
          <p className="mt-1 text-sm sm:text-base text-white/90">Vous pouvez créer un compte avant de postuler.</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
          )}

          <div className="text-base sm:text-sm text-gray-500">Étape {step} sur 2</div>

          {step === 1 ? (
            <>
              <div>
                <label className="block text-sm sm:text-sm font-semibold text-gray-700 mb-1">Nom complet *</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 sm:px-4 sm:py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-base sm:text-sm"
                  placeholder="Votre nom complet"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-sm font-semibold text-gray-700 mb-1">Email *</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  className="w-full px-4 py-3 sm:px-4 sm:py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-base sm:text-sm"
                  placeholder="vous@exemple.com"
                />
              </div>

              <div>
                <label className="block text-sm sm:text-sm font-semibold text-gray-700 mb-1">Téléphone *</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 sm:px-4 sm:py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-base sm:text-sm"
                  placeholder="Votre numéro"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <Link to={loginHref} className="text-sm font-semibold text-blue-700 hover:underline">
                  Déjà un compte ? Connexion
                </Link>
                <button
                  type="button"
                  disabled={busy || !step1Ready}
                  onClick={() => {
                    setError('');
                    setStep(2);
                  }}
                  className="w-full sm:w-auto px-4 py-3 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                >
                  Suivant
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm sm:text-sm font-semibold text-gray-700 mb-1">Mot de passe *</label>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  className="w-full px-4 py-3 sm:px-4 sm:py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-base sm:text-sm"
                  placeholder="Minimum 6 caractères"
                />
                {password.trim() !== '' && password.trim().length < 6 && (
                  <div className="mt-2 text-sm text-red-700">Minimum 6 caractères.</div>
                )}
              </div>

              <div>
                <label className="block text-sm sm:text-sm font-semibold text-gray-700 mb-1">Confirmer le mot de passe *</label>
                <input
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  type="password"
                  className="w-full px-4 py-3 sm:px-4 sm:py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 text-base sm:text-sm"
                  placeholder="Répétez le mot de passe"
                />
                {passwordConfirmation.trim() !== '' && password !== passwordConfirmation && (
                  <div className="mt-2 text-sm text-red-700">Les mots de passe ne correspondent pas.</div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError('');
                    setStep(1);
                  }}
                  className="w-full sm:w-auto px-4 py-3 sm:py-2.5 rounded-xl border bg-white hover:bg-gray-50 text-base sm:text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                >
                  Retour
                </button>

                <button
                  type="button"
                  disabled={busy || !canSubmit}
                  onClick={submit}
                  className="w-full sm:w-auto px-4 py-3 sm:px-5 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-base sm:text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                >
                  Créer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

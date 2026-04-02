import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { applicationService } from '../services/api';

const steps = [
  { key: 'infos', title: 'Vos infos', subtitle: 'Quelques détails pour vous recontacter.' },
  { key: 'motivation', title: 'Votre motivation', subtitle: 'Dites-nous ce qui vous anime.' },
  { key: 'liens', title: 'Liens & pièces', subtitle: 'Optionnel, mais ça aide beaucoup.' },
];

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export default function ApplicationForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [offersLoading, setOffersLoading] = useState(true);
  const [offersError, setOffersError] = useState('');
  const [offers, setOffers] = useState([]);
  const offerParam = searchParams.get('offer');

  useEffect(() => {
    let candidateAccountId = null;
    try {
      candidateAccountId = localStorage.getItem('candidateAccountId');
    } catch {
      candidateAccountId = null;
    }

    if (!candidateAccountId) {
      const next = offerParam
        ? `/postuler?offer=${encodeURIComponent(String(offerParam))}`
        : '/postuler';
      navigate(`/connexion?reason=apply&next=${encodeURIComponent(next)}`);
    }
  }, [navigate, offerParam]);

  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState(() => {
    let candidateFullName = '';
    let candidateEmail = '';
    let candidatePhone = '';
    let candidateCity = '';
    try {
      candidateFullName = localStorage.getItem('candidateAccountFullName') || '';
      candidateEmail = localStorage.getItem('candidateAccountEmail') || '';
      candidatePhone = localStorage.getItem('candidateAccountPhone') || '';
      candidateCity = localStorage.getItem('candidateAccountCity') || '';
    } catch {
      // ignore
    }

    return {
      offer_id: '',
      nom: candidateFullName,
      email: candidateEmail,
      telephone: candidatePhone,
      ville: candidateCity,
      role: 'dev',
      message: '',
      portfolio: '',
      cv: '',
    };
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitArmed, setSubmitArmed] = useState(false);

  useEffect(() => {
    let alive = true;

    async function loadOffers() {
      setOffersLoading(true);
      setOffersError('');
      try {
        const payload = await applicationService.getOffers();
        if (!alive) return;
        const list = payload?.data || [];
        setOffers(list);

        const initialOfferId = offerParam ? String(offerParam) : '';
        const found = initialOfferId ? list.find((o) => String(o.id) === initialOfferId) : null;

        setFormData((prev) => {
          const next = { ...prev };
          if (found) {
            next.offer_id = String(found.id);
            if (found.type === 'designer' || found.type === 'dev') next.role = found.type;
          } else if (!prev.offer_id && list[0]) {
            // Par défaut on pré-sélectionne la 1ère offre ouverte
            const opened = list.find((o) => o?.is_open) || list[0];
            next.offer_id = String(opened.id);
            if (opened.type === 'designer' || opened.type === 'dev') next.role = opened.type;
          }
          return next;
        });
      } catch (err) {
        if (!alive) return;
        setOffersError(err?.message || 'Impossible de charger les offres.');
        setOffers([]);
      } finally {
        if (!alive) return;
        setOffersLoading(false);
      }
    }

    loadOffers();

    return () => {
      alive = false;
    };
  }, [offerParam]);

  const progress = useMemo(() => {
    return Math.round(((step + 1) / steps.length) * 100);
  }, [step]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const getErrorsForStep = (currentStep, data) => {
    const nextErrors = {};

    if (currentStep === 0) {
      if (!String(data.offer_id || '').trim()) nextErrors.offer_id = 'Choisissez une opportunité.';
      if (!data.nom.trim()) nextErrors.nom = 'Votre nom est requis.';
      if (!data.email.trim()) nextErrors.email = 'Votre email est requis.';
      else if (!isValidEmail(data.email)) nextErrors.email = 'Email invalide (ex: prenom.nom@mail.com).';
      if (!String(data.telephone || '').trim()) nextErrors.telephone = 'Votre numéro est requis.';
      if (!String(data.ville || '').trim()) nextErrors.ville = 'Votre ville est requise.';
      if (!['dev', 'designer'].includes(data.role)) nextErrors.role = 'Choisissez un rôle.';
    }

    if (currentStep === 1) {
      const message = data.message.trim();
      if (!message) nextErrors.message = 'Un petit message est requis.';
      else if (message.length < 10) nextErrors.message = 'Ajoutez un peu de contexte (min. 10 caractères).';
    }

    // Step 2: URLs optionnelles — le backend fera la validation finale.
    return nextErrors;
  };

  const validateStep = (currentStep) => {
    const nextErrors = getErrorsForStep(currentStep, formData);
    setFieldErrors((prev) => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const validateAll = () => {
    const allErrors = {
      ...getErrorsForStep(0, formData),
      ...getErrorsForStep(1, formData),
      ...getErrorsForStep(2, formData),
    };
    setFieldErrors(allErrors);
    return Object.keys(allErrors).length === 0;
  };

  const goNext = () => {
    setError('');
    setSubmitArmed(false);

    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, steps.length - 1));
  };

  const goBack = () => {
    setError('');
    setSubmitArmed(false);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleFormKeyDown = (e) => {
    // Empêche les soumissions involontaires au clavier (Enter) dans les inputs.
    // - Dans un textarea, Enter doit juste faire un retour à la ligne.
    // - Dans les autres champs, Enter = Continuer (si pas dernière étape), et jamais "Envoyer".
    if (e.key !== 'Enter') return;
    if (e.target && e.target.tagName === 'TEXTAREA') return;

    e.preventDefault();

    if (step < steps.length - 1) {
      goNext();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // IMPORTANT: Avant la dernière étape, on ne soumet jamais.
    // Si l'utilisateur appuie sur Entrée, on avance simplement (et on valide l'étape).
    if (step < steps.length - 1) {
      goNext();
      return;
    }

    // Dernière étape: on envoie uniquement si l'utilisateur a explicitement cliqué sur le bouton.
    if (!submitArmed) {
      setError('Cliquez sur « Envoyer ma candidature » pour finaliser.');
      return;
    }

    setLoading(true);
    setError('');

    if (!validateAll()) {
      setLoading(false);
      return;
    }

    try {
      const payload = await applicationService.submitApplication({
        ...formData,
        offer_id: Number(formData.offer_id),
        nom: formData.nom.trim(),
        email: formData.email.trim(),
        telephone: String(formData.telephone || '').trim(),
        ville: String(formData.ville || '').trim(),
        message: formData.message.trim(),
      });

      setSubmitArmed(false);
      const createdId = payload?.data?.id;
      if (createdId) {
        try {
          localStorage.setItem('lastApplicationId', String(createdId));
          localStorage.setItem('lastApplicationStatus', 'pending');
          window.dispatchEvent(new Event('lastApplicationIdChanged'));
        } catch {
          // ignore
        }
        navigate(`/profil/${createdId}?created=1`);
        return;
      }

      setError("Candidature enregistrée, mais l'identifiant est introuvable. Réessayez.");
    } catch (err) {
      setError(err.message || 'Une erreur est survenue. Réessayez dans un instant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="px-6 py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Postulez chez Vaybe</h1>
              <p className="mt-1 text-white/90">
                Une candidature claire, en quelques étapes — simple, rapide, efficace.
              </p>
            </div>
            <div className="hidden sm:block text-right">
              <div className="text-sm text-white/90">Progression</div>
              <div className="text-2xl font-extrabold">{progress}%</div>
            </div>
          </div>

          <div className="mt-5">
            <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {steps.map((s, idx) => {
                const active = idx === step;
                const done = idx < step;
                return (
                  <div
                    key={s.key}
                    className={`rounded-lg px-3 py-2 text-xs sm:text-sm border transition ${
                      active
                        ? 'bg-white/15 border-white/40'
                        : done
                          ? 'bg-white/10 border-white/20'
                          : 'bg-transparent border-white/10'
                    }`}
                  >
                    <div className="font-semibold">
                      {done ? '✓ ' : ''}{idx + 1}. {s.title}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl">
              <div className="font-bold">Oups…</div>
              <div className="text-sm">{error}</div>
            </div>
          )}

          <div className="mb-6">
            <div className="text-xl font-bold text-gray-900">{steps[step].title}</div>
            <div className="text-gray-600">{steps[step].subtitle}</div>
          </div>

          <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} className="space-y-5">
            {step === 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Opportunité <span className="text-red-600">*</span></label>
                  <select
                    name="offer_id"
                    value={formData.offer_id}
                    onChange={(e) => {
                      const nextId = e.target.value;
                      const found = offers.find((o) => String(o.id) === String(nextId));
                      setFormData((prev) => ({
                        ...prev,
                        offer_id: nextId,
                        role: found?.type === 'designer' || found?.type === 'dev' ? found.type : prev.role,
                      }));
                      setFieldErrors((prev) => ({ ...prev, offer_id: undefined }));
                    }}
                    disabled={offersLoading || offers.length === 0}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.offer_id ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    {offersLoading ? (
                      <option>Chargement…</option>
                    ) : offers.length === 0 ? (
                      <option>Aucune offre</option>
                    ) : (
                      offers.filter((o) => o?.is_open).map((o) => (
                        <option key={o.id} value={String(o.id)}>
                          {o.title}
                        </option>
                      ))
                    )}
                  </select>
                  {offersError && <div className="mt-1 text-sm text-red-700">{offersError}</div>}
                  {fieldErrors.offer_id && <div className="mt-1 text-sm text-red-700">{fieldErrors.offer_id}</div>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.nom ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Jean Dupont"
                    autoComplete="name"
                  />
                  {fieldErrors.nom && <div className="mt-1 text-sm text-red-700">{fieldErrors.nom}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-600">*</span></label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ex: jean.dupont@mail.com"
                    autoComplete="email"
                  />
                  {fieldErrors.email && <div className="mt-1 text-sm text-red-700">{fieldErrors.email}</div>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone <span className="text-red-600">*</span></label>
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.telephone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ex: 06 12 34 56 78"
                    autoComplete="tel"
                  />
                  {fieldErrors.telephone && (
                    <div className="mt-1 text-sm text-red-700">{fieldErrors.telephone}</div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville de résidence <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    name="ville"
                    value={formData.ville}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.ville ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Paris"
                    autoComplete="address-level2"
                  />
                  {fieldErrors.ville && <div className="mt-1 text-sm text-red-700">{fieldErrors.ville}</div>}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rôle <span className="text-red-600">*</span></label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      fieldErrors.role ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="dev">💻 Développeur</option>
                    <option value="designer">🎨 Designer</option>
                  </select>
                  {fieldErrors.role && <div className="mt-1 text-sm text-red-700">{fieldErrors.role}</div>}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Message de motivation <span className="text-red-600">*</span></label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows={7}
                  className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    fieldErrors.message ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="En quelques lignes : pourquoi Vaybe, et comment vous pouvez apporter de la valeur (impact, rigueur, curiosité, esprit d'équipe…)."
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                  <span>Astuce : une phrase sur vous + une phrase sur le poste + un exemple concret.</span>
                  <span>{formData.message.trim().length}/10+</span>
                </div>
                {fieldErrors.message && <div className="mt-1 text-sm text-red-700">{fieldErrors.message}</div>}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio (URL)</label>
                  <input
                    type="url"
                    name="portfolio"
                    value={formData.portfolio}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                  <div className="mt-1 text-xs text-gray-500">Site, Behance, GitHub, Dribbble…</div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CV (URL)</label>
                  <input
                    type="url"
                    name="cv"
                    value={formData.cv}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://.../cv.pdf"
                  />
                  <div className="mt-1 text-xs text-gray-500">Lien Drive, Notion, PDF hébergé…</div>
                </div>

                <div className="sm:col-span-2 p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="font-semibold text-gray-900">Récapitulatif</div>
                  <div className="mt-2 text-sm text-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div><span className="text-gray-500">Nom :</span> {formData.nom || '—'}</div>
                    <div><span className="text-gray-500">Email :</span> {formData.email || '—'}</div>
                    <div><span className="text-gray-500">Rôle :</span> {formData.role === 'dev' ? 'Développeur' : 'Designer'}</div>
                    <div><span className="text-gray-500">Portfolio :</span> {formData.portfolio || '—'}</div>
                    <div><span className="text-gray-500">CV :</span> {formData.cv || '—'}</div>
                    <div className="sm:col-span-2"><span className="text-gray-500">Message :</span> {formData.message ? 'OK' : '—'}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0 || loading}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                Retour
              </button>

              <div className="flex-1" />

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={goNext}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                >
                  Continuer
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={() => setSubmitArmed(true)}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-60"
                >
                  {loading ? 'Envoi…' : 'Envoyer ma candidature'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function markOnboardingCompleted() {
  try {
    const id = String(localStorage.getItem('candidateAccountId') || '').trim();
    if (id) localStorage.setItem(`candidateOnboardingSeen:${id}`, '1');
    window.dispatchEvent(new Event('onboardingCompleted'));
  } catch {
    // ignore
  }
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const backgroundImageUrl = '/onboarding-bg.jpg';

  const items =
    step === 0
      ? [
          {
            n: 1,
            icon: '🔎',
            title: 'Explorez les offres',
            body: 'Repérez en un clin d’œil ce qui vous correspond.',
          },
          {
            n: 2,
            icon: '📩',
            title: 'Postulez facilement',
            body: 'Un CV, un message… et vous y êtes.',
          },
          {
            n: 3,
            icon: '✅',
            title: 'Suivez vos candidatures',
            body: 'Le statut, les retours, tout au même endroit.',
          },
        ]
      : [
          {
            n: 1,
            icon: '⚡',
            title: 'C’est rapide',
            body: 'Choisissez une offre et postulez en quelques secondes.',
          },
          {
            n: 2,
            icon: '📄',
            title: 'Un CV suffit',
            body: 'PDF + un petit mot (si vous voulez).',
          },
          {
            n: 3,
            icon: '💬',
            title: 'Gardez le fil',
            body: 'Suivez l’avancement et échangez au besoin.',
          },
        ];

  const goToOffers = () => {
    markOnboardingCompleted();
    navigate('/', { replace: true });
  };

  const onLeft = () => {
    if (step === 0) {
      goToOffers();
      return;
    }
    setStep(0);
  };

  const onRight = () => {
    if (step === 0) {
      setStep(1);
      return;
    }
    goToOffers();
  };

  const rightLabel = step === 0 ? 'Découvrir' : 'Accéder aux offres';

  return (
    <div
      className="w-full min-h-[100dvh] relative bg-gray-900"
      style={{
        backgroundImage: `url(${backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.38) 55%, rgba(0,0,0,0.58) 100%)',
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-3xl mx-auto w-full min-h-[100dvh] flex flex-col px-5 sm:px-8">
        <div className="pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="text-lg sm:text-xl font-extrabold tracking-tight text-white leading-none drop-shadow-[0_8px_22px_rgba(0,0,0,0.60)]">
            Vaybe
          </div>
        </div>

        <div className="mt-9 flex-1 min-h-0 flex flex-col">
          <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.05] whitespace-pre-line drop-shadow-[0_6px_18px_rgba(0,0,0,0.55)]">
            {step === 0
              ? 'Votre prochaine opportunité\ncommence ici ✨'
              : 'On va droit\nau but'}
          </div>

          <div className="mt-3 text-sm sm:text-base text-white/85 max-w-xl drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
            {step === 0
              ? 'Des offres claires, une candidature simple, et un suivi propre — sur mobile, comme il faut.'
              : 'Deux tap et c’est parti. Vous gardez la main du début à la fin.'}
          </div>

          <div className="mt-8">
            <div className="space-y-4">
              {items.map((it) => (
                <div key={it.n} className="flex items-start gap-4">
                  <div className="shrink-0 flex items-center justify-center h-8 w-8 rounded-full border border-white/35 text-white/90 text-sm font-bold">
                    {it.n}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-white font-extrabold text-base sm:text-lg drop-shadow-[0_4px_14px_rgba(0,0,0,0.50)]">
                      <span className="text-lg" aria-hidden="true">
                        {it.icon}
                      </span>
                      <span className="truncate">{it.title}</span>
                    </div>
                    <div className="mt-1 text-sm sm:text-base text-white/80 drop-shadow-[0_4px_14px_rgba(0,0,0,0.40)]">
                      {it.body}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div
              className={`mt-6 flex items-center gap-3 ${step === 0 ? 'justify-end' : 'justify-between'}`}
            >
              {step !== 0 && (
                <button
                  type="button"
                  onClick={onLeft}
                  className="rounded-full border border-white/35 bg-white/10 hover:bg-white/15 text-white text-sm font-extrabold px-5 py-2.5 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                >
                  Retour
                </button>
              )}

              <button
                type="button"
                onClick={onRight}
                className="rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-extrabold px-6 py-3 shadow-sm"
              >
                {rightLabel}
              </button>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <div className="text-xs sm:text-sm text-white/75 drop-shadow-[0_4px_14px_rgba(0,0,0,0.45)]">
              Tout est pensé pour que ça reste rapide, clair et agréable.
            </div>

            {step === 0 && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={goToOffers}
                  className="rounded-full border border-white/35 bg-white/10 hover:bg-white/15 text-white text-sm font-extrabold px-5 py-2.5 drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
                >
                  Accéder aux offres
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pb-[max(1.25rem,env(safe-area-inset-bottom))]" />
      </div>
    </div>
  );
}

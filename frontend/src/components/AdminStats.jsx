import { useEffect, useMemo, useRef, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { applicationService } from '../services/api';

function clamp01(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function CircleKpi({ label, value, max, colorClass = 'text-blue-600', trackClass = 'text-blue-100' }) {
  const v = Number(value) || 0;
  const m = Number(max) || 0;
  const ratio = m > 0 ? clamp01(v / m) : 0;

  const size = 86;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * ratio;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className={trackClass}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              className={colorClass}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-lg font-extrabold text-gray-900 leading-none">{String(v)}</div>
              <div className="mt-0.5 text-[11px] text-gray-500 leading-none">{m > 0 ? `${Math.round(ratio * 100)}%` : '—'}</div>
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-500">Stat</div>
          <div className="text-sm font-extrabold text-gray-900">{label}</div>
          <div className="mt-1 text-xs text-gray-600">{m > 0 ? `${v} / ${m}` : `${v}`}</div>
        </div>
      </div>
    </div>
  );
}

function MiniRing({ value, max, colorClass = 'text-violet-600', trackClass = 'text-violet-100' }) {
  const v = Number(value) || 0;
  const m = Number(max) || 0;
  const ratio = m > 0 ? clamp01(v / m) : 0;

  const size = 46;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * ratio;

  return (
    <div className="relative" style={{ width: size, height: size }} aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className={trackClass}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={colorClass}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-sm font-extrabold text-gray-900">{String(v)}</div>
      </div>
    </div>
  );
}

function normalizeStatus(raw) {
  const s = String(raw || '').trim().toLowerCase();
  if (s === 'pending' || s === 'approved' || s === 'rejected') return s;
  return 'pending';
}

function formatDateFr(iso) {
  try {
    const d = new Date(String(iso || ''));
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return '';
  }
}

function Dropdown({ label, value, onChange, options, placeholder = '—' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ left: 0, top: null, bottom: null, width: 0, maxHeight: 256 });

  const current = useMemo(() => {
    const v = String(value ?? '');
    return options.find((o) => String(o.value) === v) || null;
  }, [options, value]);

  useEffect(() => {
    if (!open) return;

    const compute = () => {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const vw = window.innerWidth || 0;
      const vh = window.innerHeight || 0;

      const width = Math.max(0, Math.min(rect.width, vw - 16));
      const left = Math.max(8, Math.min(rect.left, vw - width - 8));

      const roomBelow = Math.max(0, vh - rect.bottom);
      const roomAbove = Math.max(0, rect.top);
      const direction = roomBelow < 220 && roomAbove > roomBelow ? 'up' : 'down';
      const maxHeight = Math.max(160, Math.min(320, (direction === 'down' ? roomBelow : roomAbove) - 16));

      if (direction === 'down') {
        setMenuPos({ left, top: rect.bottom + 8, bottom: null, width, maxHeight });
      } else {
        setMenuPos({ left, top: null, bottom: vh - rect.top + 8, width, maxHeight });
      }
    };

    compute();

    const onScroll = () => compute();
    const onResize = () => compute();

    const onDocMouseDown = (e) => {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setOpen(false);
    };

    const onDocKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', onDocMouseDown);
    document.addEventListener('keydown', onDocKeyDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('pointerdown', onDocMouseDown);
      document.removeEventListener('keydown', onDocKeyDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div className="text-xs font-semibold text-gray-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        ref={buttonRef}
        className="mt-2 w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-sm flex items-center justify-between gap-2"
        aria-haspopup="listbox"
        aria-expanded={open ? 'true' : 'false'}
      >
        <span className="min-w-0 truncate text-left text-gray-900">
          {current ? String(current.label) : placeholder}
        </span>
        <span className="shrink-0 text-gray-400" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open ? (
        <div
          role="listbox"
          className="fixed z-[60] rounded-2xl border border-gray-200 bg-white shadow-lg overflow-hidden"
          style={{
            left: menuPos.left,
            top: menuPos.top ?? undefined,
            bottom: menuPos.bottom ?? undefined,
            width: menuPos.width,
          }}
        >
          <div className="overflow-auto py-1" style={{ maxHeight: menuPos.maxHeight }}>
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value ?? '');
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={isSelected ? 'true' : 'false'}
                  onClick={() => {
                    onChange?.(String(opt.value));
                    setOpen(false);
                  }}
                  className={
                    'w-full text-left px-3 py-2 text-sm font-semibold ' +
                    (isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50')
                  }
                >
                  {String(opt.label)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AdminStats() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [offers, setOffers] = useState([]);
  const [applications, setApplications] = useState([]);

  const [exportOfferId, setExportOfferId] = useState('');
  const [exportStatus, setExportStatus] = useState('');
  const [exportLimit, setExportLimit] = useState('200');
  const [exporting, setExporting] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [offersPayload, appsPayload] = await Promise.all([
        applicationService.getOffers(),
        applicationService.getApplications(),
      ]);

      setOffers(Array.isArray(offersPayload?.data) ? offersPayload.data : []);
      setApplications(Array.isArray(appsPayload?.data) ? appsPayload.data : []);
    } catch (err) {
      setError(err?.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const totalOffers = offers.length;
    const openOffers = offers.filter((o) => Boolean(o?.is_open)).length;
    const closedOffers = Math.max(0, totalOffers - openOffers);

    const totalApps = applications.length;
    const pending = applications.filter((a) => normalizeStatus(a?.status) === 'pending').length;
    const approved = applications.filter((a) => normalizeStatus(a?.status) === 'approved').length;
    const rejected = applications.filter((a) => normalizeStatus(a?.status) === 'rejected').length;

    return {
      totalOffers,
      openOffers,
      closedOffers,
      totalApps,
      pending,
      approved,
      rejected,
    };
  }, [offers, applications]);

  const offerEffectifs = useMemo(() => {
    const counts = new Map();

    for (const app of applications) {
      const offerId = String(app?.offer_id ?? app?.offer?.id ?? '').trim();
      if (!offerId) continue;
      const prev = counts.get(offerId) || 0;
      counts.set(offerId, prev + 1);
    }

    const rows = offers.map((o) => {
      const id = String(o?.id ?? '').trim();
      return {
        id,
        title: String(o?.title || '').trim() || `Offre #${id}`,
        isOpen: Boolean(o?.is_open),
        count: counts.get(id) || 0,
      };
    });

    rows.sort((a, b) => b.count - a.count);
    const max = rows.reduce((acc, r) => Math.max(acc, r.count), 0);
    return { rows, max };
  }, [offers, applications]);

  const exportLimitNum = useMemo(() => {
    const n = Number(exportLimit);
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.max(1, Math.min(5000, Math.floor(n)));
  }, [exportLimit]);

  const exportAvailableApps = useMemo(() => {
    const offerId = String(exportOfferId || '').trim();
    const status = String(exportStatus || '').trim().toLowerCase();

    let list = applications.slice();

    if (offerId) {
      list = list.filter((a) => String(a?.offer_id ?? a?.offer?.id ?? '').trim() === offerId);
    }
    if (status) {
      list = list.filter((a) => normalizeStatus(a?.status) === status);
    }

    // On exporte du plus récent au plus ancien
    list.sort((a, b) => {
      const da = new Date(String(a?.created_at || '')).getTime();
      const db = new Date(String(b?.created_at || '')).getTime();
      return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
    });

    return list;
  }, [applications, exportOfferId, exportStatus]);

  const filteredExportApps = useMemo(() => {
    return exportAvailableApps.slice(0, exportLimitNum);
  }, [exportAvailableApps, exportLimitNum]);

  const canDownloadPdf = useMemo(() => {
    if (exporting) return false;
    if (exportAvailableApps.length === 0) return false;
    return exportAvailableApps.length >= exportLimitNum;
  }, [exporting, exportAvailableApps.length, exportLimitNum]);

  const exportPdf = async () => {
    setExporting(true);
    setError('');
    try {
      const offerId = String(exportOfferId || '').trim();
      const offer = offerId ? offers.find((o) => String(o?.id) === offerId) : null;
      const offerTitle = offer ? String(offer?.title || '').trim() : '';
      const statusLabel = exportStatus ? String(exportStatus).toUpperCase() : 'TOUS';

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 40;
      const headerH = 74;

      // Bandeau titre (plus "pro")
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, pageWidth, headerH, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.text('Export — Candidatures', marginX, 36);

      doc.setFontSize(10);
      const meta = `Offre: ${offerTitle || 'Toutes'}    Statut: ${statusLabel}    Généré: ${new Date().toLocaleString()}`;
      doc.text(meta, marginX, 58);

      doc.setTextColor(0, 0, 0);

      const head = [["Date", "Offre", "Nom", "Email", "Téléphone", "Ville", "Rôle", "Statut", "Score"]];
      const body = filteredExportApps.map((a) => {
        const status = normalizeStatus(a?.status);
        const offerT = String(a?.offer_title || a?.offer?.title || '').trim();
        return [
          formatDateFr(a?.created_at),
          offerT || '—',
          String(a?.nom || '').trim(),
          String(a?.email || '').trim(),
          String(a?.telephone || '').trim(),
          String(a?.ville || '').trim(),
          String(a?.role || '').trim(),
          status,
          String(a?.score ?? ''),
        ];
      });

      // Largeurs fixes qui tiennent dans A4 paysage (évite la coupe à droite)
      // A4 paysage ~ 842pt de large; avec marges 40/40 => ~762pt utiles.
      const columnStyles = {
        0: { cellWidth: 60 }, // Date
        1: { cellWidth: 120 }, // Offre
        2: { cellWidth: 70 }, // Nom
        3: { cellWidth: 130 }, // Email
        4: { cellWidth: 80 }, // Téléphone
        5: { cellWidth: 60 }, // Ville
        6: { cellWidth: 70 }, // Rôle
        7: { cellWidth: 65 }, // Statut
        8: { cellWidth: 45 }, // Score
      };

      autoTable(doc, {
        startY: headerH + 18,
        head,
        body,
        theme: 'striped',
        styles: {
          fontSize: 9,
          cellPadding: 5,
          overflow: 'linebreak',
          valign: 'middle',
        },
        headStyles: {
          fillColor: [30, 64, 175],
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: { fillColor: [245, 247, 251] },
        columnStyles,
        margin: { left: marginX, right: marginX, top: headerH + 18, bottom: 56 },
        didDrawPage: (data) => {
          // Footer simple (évite la coupe en bas et rend le PDF plus pro)
          const page = doc.internal.getNumberOfPages();
          doc.setFontSize(9);
          doc.setTextColor(100);
          doc.text(`Page ${page}`, marginX, pageHeight - 26);
          doc.text(`Total exporté: ${filteredExportApps.length}`, pageWidth - marginX, pageHeight - 26, { align: 'right' });
          doc.setTextColor(0);
        },
      });

      const safeOffer = (offerTitle || 'toutes_offres').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const filename = `export_candidatures_${safeOffer}_${statusLabel.toLowerCase()}_${Date.now()}.pdf`;
      doc.save(filename);
    } catch (err) {
      setError(err?.message || 'Erreur lors de la génération du PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full sm:max-w-6xl sm:mx-auto pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="bg-white sm:rounded-2xl rounded-none shadow-sm border-y sm:border">
        <div className="px-4 py-3 sm:px-6 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="text-sm text-white/90">Espace admin</div>
          <h1 className="text-xl sm:text-3xl font-extrabold">Statistiques</h1>
          <p className="mt-1 text-white/90">Vue rapide + export PDF.</p>
        </div>

        <div className="px-4 py-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-extrabold text-gray-900">Résumé</div>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl px-3 py-2 border border-gray-200 bg-white hover:bg-gray-50 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? 'Chargement…' : 'Rafraîchir'}
            </button>
          </div>

          {error ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm">{error}</div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <CircleKpi label="Candidatures (total)" value={stats.totalApps} max={stats.totalApps || 1} colorClass="text-indigo-600" trackClass="text-indigo-100" />
            <CircleKpi label="En attente" value={stats.pending} max={stats.totalApps || 1} colorClass="text-amber-500" trackClass="text-amber-100" />
            <CircleKpi label="Approuvées" value={stats.approved} max={stats.totalApps || 1} colorClass="text-emerald-600" trackClass="text-emerald-100" />
            <CircleKpi label="Rejetées" value={stats.rejected} max={stats.totalApps || 1} colorClass="text-rose-600" trackClass="text-rose-100" />
            <CircleKpi label="Offres ouvertes" value={stats.openOffers} max={stats.totalOffers || 1} colorClass="text-blue-600" trackClass="text-blue-100" />
            <CircleKpi label="Offres fermées" value={stats.closedOffers} max={stats.totalOffers || 1} colorClass="text-slate-700" trackClass="text-slate-200" />
          </div>

          <div className="rounded-2xl border bg-white shadow-sm">
            <div aria-hidden="true" className="h-1 bg-gradient-to-r from-violet-600 to-fuchsia-600" />
            <div className="p-4">
              <div className="text-sm font-extrabold text-gray-900">Effectif par offre</div>
              <div className="mt-1 text-sm text-gray-600">Nombre de candidatures par offre.</div>

              {offerEffectifs.rows.length === 0 ? (
                <div className="mt-3 p-4 rounded-2xl border border-dashed bg-gray-50 text-sm text-gray-700">Aucune offre.</div>
              ) : (
                <div className="mt-3 max-h-[45vh] overflow-auto space-y-2">
                  {offerEffectifs.rows.map((row) => (
                    <div key={row.id} className="rounded-2xl border border-gray-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-extrabold text-gray-900 truncate">{row.title}</div>
                          <div className="mt-0.5 text-xs text-gray-500">{row.isOpen ? 'Ouverte' : 'Fermée'}</div>
                        </div>
                        <div className="shrink-0">
                          <MiniRing value={row.count} max={offerEffectifs.max || 1} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border bg-white shadow-sm">
            <div aria-hidden="true" className="h-1 bg-gradient-to-r from-blue-600 to-indigo-600" />
            <div className="p-4">
              <div className="text-sm font-extrabold text-gray-900">Export</div>
              <div className="mt-1 text-sm text-gray-600">Filtre ce que tu veux exporter puis génère un PDF.</div>

              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Dropdown
                  label="Offre"
                  value={exportOfferId}
                  onChange={(v) => setExportOfferId(v === 'ALL' ? '' : v)}
                  options={[
                    { value: 'ALL', label: 'Toutes les offres' },
                    ...offers.map((o) => ({
                      value: String(o?.id ?? ''),
                      label: String(o?.title || '').trim() || `Offre #${String(o?.id)}`,
                    })),
                  ].filter((o) => String(o.value).trim() !== '')}
                  placeholder="Toutes les offres"
                />

                <Dropdown
                  label="Statut"
                  value={exportStatus || 'ALL'}
                  onChange={(v) => setExportStatus(v === 'ALL' ? '' : v)}
                  options={[
                    { value: 'ALL', label: 'Tous' },
                    { value: 'pending', label: 'En attente' },
                    { value: 'approved', label: 'Approuvées' },
                    { value: 'rejected', label: 'Rejetées' },
                  ]}
                  placeholder="Tous"
                />

                <div>
                  <div className="text-xs font-semibold text-gray-700">Nombre (max)</div>
                  <input
                    type="number"
                    min={1}
                    max={5000}
                    value={exportLimit}
                    onChange={(e) => setExportLimit(e.target.value)}
                    className="mt-2 w-full px-3 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent border-gray-300 bg-white text-sm"
                    placeholder="200"
                  />
                  <div className="mt-1 text-xs text-gray-500">
                    Disponible: <span className="font-semibold text-gray-700">{exportAvailableApps.length}</span>.
                    {' '}Export du plus récent au plus ancien.
                  </div>
                  {!canDownloadPdf && exportAvailableApps.length > 0 ? (
                    <div className="mt-1 text-xs text-rose-700">
                      Le nombre demandé ({exportLimitNum}) dépasse le disponible ({exportAvailableApps.length}).
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="text-sm text-gray-700">
                  Sélection: <span className="font-extrabold">{filteredExportApps.length}</span>
                </div>
                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={!canDownloadPdf}
                  className="inline-flex items-center justify-center rounded-2xl px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm disabled:opacity-60"
                >
                  {exporting ? 'Génération…' : 'Télécharger PDF'}
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">Astuce: filtre par offre pour exporter toutes les candidatures d’une offre.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

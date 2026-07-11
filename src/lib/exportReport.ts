import i18n from '../i18n'
import type { Elder, Log } from '../types'
import { CARD_ACCENTS } from '../types'
import { checkAlert } from './alerts'

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  id: 'id-ID',
}

const INK = '#2A2218'
const MUTED = '#8A7E72'
const HAIRLINE = '#EDE9E2'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

interface TrendSeries {
  color: string
  label: string
  points: { t: number; v: number }[]
}

// Minimal inline-SVG line chart so the printable report needs no JS or
// external chart library. Matches the soft look of the History tab charts.
function svgTrend(series: TrendSeries[], w = 300, h = 110): string {
  const all = series.flatMap((s) => s.points)
  if (all.length === 0) return ''

  const minT = Math.min(...all.map((p) => p.t))
  const maxT = Math.max(...all.map((p) => p.t))
  const minV = Math.min(...all.map((p) => p.v))
  const maxV = Math.max(...all.map((p) => p.v))
  const pad = (maxV - minV) * 0.18 || Math.max(1, maxV * 0.05)
  const lo = minV - pad
  const hi = maxV + pad

  const X = (t: number) => (maxT === minT ? w / 2 : 30 + ((t - minT) / (maxT - minT)) * (w - 38))
  const Y = (v: number) => h - 18 - ((v - lo) / (hi - lo)) * (h - 30)

  const lines = series
    .filter((s) => s.points.length > 0)
    .map((s) => {
      const pts = s.points.map((p) => `${X(p.t).toFixed(1)},${Y(p.v).toFixed(1)}`).join(' ')
      const dots = s.points
        .map((p) => `<circle cx="${X(p.t).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="2.2" fill="${s.color}"/>`)
        .join('')
      const line =
        s.points.length > 1
          ? `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`
          : ''
      return line + dots
    })
    .join('')

  const legend = series
    .filter((s) => s.points.length > 0)
    .map(
      (s, i) =>
        `<circle cx="${34 + i * 92}" cy="${h - 5}" r="3" fill="${s.color}"/>` +
        `<text x="${41 + i * 92}" y="${h - 2}" font-size="9" fill="${MUTED}">${escapeHtml(s.label)}</text>`,
    )
    .join('')

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img">
    <line x1="30" y1="${Y(hi).toFixed(1)}" x2="30" y2="${Y(lo).toFixed(1)}" stroke="${HAIRLINE}" stroke-width="1"/>
    <line x1="30" y1="${h - 18}" x2="${w - 6}" y2="${h - 18}" stroke="${HAIRLINE}" stroke-width="1"/>
    <text x="26" y="${(Y(maxV) + 3).toFixed(1)}" font-size="9" fill="${MUTED}" text-anchor="end">${Math.round(maxV * 10) / 10}</text>
    <text x="26" y="${(Y(minV) + 3).toFixed(1)}" font-size="9" fill="${MUTED}" text-anchor="end">${Math.round(minV * 10) / 10}</text>
    ${lines}
    ${legend}
  </svg>`
}

function svgDonut(percent: number, color: string): string {
  const r = 34
  const c = 2 * Math.PI * r
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * c
  return `<svg viewBox="0 0 100 100" width="96" height="96" role="img">
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${HAIRLINE}" stroke-width="9"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="9"
      stroke-linecap="round" stroke-dasharray="${filled.toFixed(1)} ${c.toFixed(1)}"
      transform="rotate(-90 50 50)"/>
    <text x="50" y="56" font-size="20" font-weight="300" fill="${INK}" text-anchor="middle">${percent}%</text>
  </svg>`
}

// Generates the printable doctor report in the language currently selected
// in the app, styled to match CareTap (cream surface, light type, per-card
// accent chips) while staying restrained enough for a clinical hand-over.
export function generateReportHtml(elder: Elder, logs: Log[], days: number): string {
  const t = i18n.t.bind(i18n)
  const locale = DATE_LOCALES[i18n.language] ?? 'en-US'
  const fmtDateTime = new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
  const fmtDate = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  const since = new Date()
  since.setDate(since.getDate() - days)
  const now = new Date()

  const vitals = logs
    .filter((l) => ['blood_pressure', 'body_temperature', 'blood_sugar'].includes(l.card_type))
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at)) // chronological
  const medicationLogs = logs.filter((l) => l.card_type === 'medications')
  const alerts = logs.filter((l) => checkAlert(l) !== null)

  const expectedDoses = days * 1 // conservative baseline when no schedule data is loaded client-side
  const adherence = medicationLogs.length > 0
    ? Math.min(100, Math.round((medicationLogs.length / Math.max(expectedDoses, medicationLogs.length)) * 100))
    : 0

  // Trend data
  const bpLogs = vitals.filter((l) => l.card_type === 'blood_pressure')
  const bpChart = svgTrend([
    {
      color: CARD_ACCENTS.blood_pressure.dark,
      label: t('report.series_sys'),
      points: bpLogs
        .filter((l) => l.bp_systolic != null)
        .map((l) => ({ t: new Date(l.logged_at).getTime(), v: l.bp_systolic! })),
    },
    {
      color: CARD_ACCENTS.blood_pressure.accent,
      label: t('report.series_dia'),
      points: bpLogs
        .filter((l) => l.bp_diastolic != null)
        .map((l) => ({ t: new Date(l.logged_at).getTime(), v: l.bp_diastolic! })),
    },
  ])
  const tempChart = svgTrend([
    {
      color: CARD_ACCENTS.body_temperature.accent,
      label: '°C',
      points: vitals
        .filter((l) => l.card_type === 'body_temperature' && l.temperature_c != null)
        .map((l) => ({ t: new Date(l.logged_at).getTime(), v: l.temperature_c! })),
    },
  ])

  const typeChip = (cardType: Log['card_type']) => {
    const accent = CARD_ACCENTS[cardType]
    return `<span class="chip" style="background:${accent.accent}22;color:${accent.dark}">${escapeHtml(
      t(`card_types.${cardType}`),
    )}</span>`
  }

  const cell = (v: string | number | null | undefined) =>
    `<td>${v === null || v === undefined || v === '' ? '<span class="empty">—</span>' : escapeHtml(String(v))}</td>`

  // Vitals matrix: one row per reading (chronological), one column per metric.
  const matrixRows = vitals
    .map((l) => {
      const glucose =
        l.glucose_mmol != null
          ? `${l.glucose_mmol}${l.glucose_timing ? ` (${t(`vitals.${l.glucose_timing}`)})` : ''}`
          : null
      return (
        '<tr>' +
        `<td class="when">${escapeHtml(fmtDateTime.format(new Date(l.logged_at)))}</td>` +
        cell(l.bp_systolic) +
        cell(l.bp_diastolic) +
        cell(l.bp_pulse) +
        cell(l.spo2 != null ? `${l.spo2}%` : null) +
        cell(l.temperature_c) +
        cell(glucose) +
        cell(l.note) +
        '</tr>'
      )
    })
    .join('')

  const alertRows = alerts
    .map((l) => {
      const key = checkAlert(l)!
      const message = t(`alerts.${key}`, { name: elder.name })
      return `<tr><td class="when">${escapeHtml(fmtDateTime.format(new Date(l.logged_at)))}</td><td>${typeChip(l.card_type)}</td><td>${escapeHtml(message)}</td></tr>`
    })
    .join('')

  return `<!doctype html>
<html lang="${i18n.language}">
<head>
<meta charset="utf-8">
<title>${escapeHtml(t('report.title'))} — ${escapeHtml(elder.name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@200;300;400&family=Noto+Sans+TC:wght@300;400&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: 'Inter Tight', 'Noto Sans TC', sans-serif;
    font-weight: 300;
    color: ${INK};
    background: #FAFAF7;
    margin: 0;
    padding: 48px 40px;
  }
  .brand { letter-spacing: 0.35em; font-size: 11px; color: ${MUTED}; }
  h1 { font-weight: 200; font-size: 28px; margin: 10px 0 2px; }
  p.meta { color: ${MUTED}; font-size: 13px; margin: 4px 0 0; }
  .cards-row { display: grid; grid-template-columns: 1fr 1.4fr 1.4fr; gap: 14px; margin-top: 20px; }
  @media (max-width: 720px) { .cards-row { grid-template-columns: 1fr; } }
  .card {
    background: #FFFFFF;
    border: 0.5px solid #E2DDD6;
    border-radius: 16px;
    padding: 18px 20px;
    margin-top: 20px;
    box-shadow: 0 1px 4px rgba(42,34,24,0.04);
  }
  .cards-row .card { margin-top: 0; text-align: center; }
  h2 { font-weight: 300; font-size: 14px; color: ${MUTED}; margin: 0 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12.5px; }
  th, td { text-align: left; padding: 8px 8px; border-bottom: 0.5px solid ${HAIRLINE}; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  th { color: ${MUTED}; font-weight: 400; font-size: 11.5px; white-space: nowrap; }
  td.when { white-space: nowrap; color: ${MUTED}; font-size: 11.5px; }
  .chip { display: inline-block; border-radius: 999px; padding: 3px 10px; font-size: 12px; white-space: nowrap; }
  .empty { color: #C8BCA8; }
  .table-wrap { overflow-x: auto; }
  footer { margin-top: 28px; font-size: 11px; color: ${MUTED}; letter-spacing: 0.08em; }
  @media print { body { padding: 24px; } .cards-row { grid-template-columns: 1fr 1.4fr 1.4fr; } }
</style>
</head>
<body>
  <p class="brand">CARETAP</p>
  <h1>${escapeHtml(t('report.title'))} — ${escapeHtml(elder.name)}</h1>
  <p class="meta">${escapeHtml(fmtDate.format(since))} – ${escapeHtml(fmtDate.format(now))} · ${escapeHtml(t('report.period', { count: days }))}</p>

  <div class="cards-row">
    <div class="card">
      <h2>${escapeHtml(t('report.adherence'))}</h2>
      ${svgDonut(adherence, CARD_ACCENTS.medications.accent)}
    </div>
    <div class="card">
      <h2>${escapeHtml(t('report.bp_trend'))}</h2>
      ${bpChart || `<p class="empty" style="font-size:12px">${escapeHtml(t('report.no_vitals'))}</p>`}
    </div>
    <div class="card">
      <h2>${escapeHtml(t('report.temp_trend'))}</h2>
      ${tempChart || `<p class="empty" style="font-size:12px">${escapeHtml(t('report.no_vitals'))}</p>`}
    </div>
  </div>

  <div class="card">
    <h2>${escapeHtml(t('report.vitals'))}</h2>
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>${escapeHtml(t('report.col_date'))}</th>
          <th>${escapeHtml(t('report.col_sys'))}</th>
          <th>${escapeHtml(t('report.col_dia'))}</th>
          <th>${escapeHtml(t('vitals.pulse'))}</th>
          <th>SpO₂</th>
          <th>${escapeHtml(t('report.col_temp'))}</th>
          <th>${escapeHtml(t('report.col_glucose'))}</th>
          <th>${escapeHtml(t('report.col_note'))}</th>
        </tr></thead>
        <tbody>${matrixRows || `<tr><td colspan="8" class="empty">${escapeHtml(t('report.no_vitals'))}</td></tr>`}</tbody>
      </table>
    </div>
  </div>

  <div class="card">
    <h2>${escapeHtml(t('report.alerts'))}</h2>
    <table>
      <thead><tr><th>${escapeHtml(t('report.col_date'))}</th><th>${escapeHtml(t('report.col_type'))}</th><th>${escapeHtml(t('report.col_alert'))}</th></tr></thead>
      <tbody>${alertRows || `<tr><td colspan="3" class="empty">${escapeHtml(t('report.no_alerts'))}</td></tr>`}</tbody>
    </table>
  </div>

  <footer>${escapeHtml(t('report.generated', { date: fmtDate.format(now) }))}</footer>
</body>
</html>`
}

export function openReportForPrint(elder: Elder, logs: Log[], days: number): void {
  const html = generateReportHtml(elder, logs, days)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  // Give the web fonts a moment to load so the printed page matches the app.
  const doPrint = () => win.print()
  const fonts = (win.document as Document & { fonts?: FontFaceSet }).fonts
  if (fonts?.ready) {
    fonts.ready.then(() => setTimeout(doPrint, 150)).catch(doPrint)
  } else {
    setTimeout(doPrint, 400)
  }
}

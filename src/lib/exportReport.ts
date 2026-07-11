import i18n from '../i18n'
import type { Elder, Log } from '../types'
import { CARD_ACCENTS } from '../types'
import { checkAlert } from './alerts'

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  id: 'id-ID',
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

// Generates the printable doctor report in the language currently selected
// in the app, styled to match CareTap (cream surface, light type, per-card
// accent chips) while staying restrained enough for a clinical hand-over.
export function generateReportHtml(elder: Elder, logs: Log[], days: number): string {
  const t = i18n.t.bind(i18n)
  const locale = DATE_LOCALES[i18n.language] ?? 'en-US'
  const fmtDateTime = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  })
  const fmtDate = new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' })

  const since = new Date()
  since.setDate(since.getDate() - days)
  const now = new Date()

  const vitals = logs.filter((l) =>
    ['blood_pressure', 'body_temperature', 'blood_sugar'].includes(l.card_type),
  )
  const medicationLogs = logs.filter((l) => l.card_type === 'medications')
  const alerts = logs.filter((l) => checkAlert(l) !== null)

  const expectedDoses = days * 1 // conservative baseline when no schedule data is loaded client-side
  const adherence = medicationLogs.length > 0
    ? Math.min(100, Math.round((medicationLogs.length / Math.max(expectedDoses, medicationLogs.length)) * 100))
    : 0

  const typeChip = (cardType: Log['card_type']) => {
    const accent = CARD_ACCENTS[cardType]
    return `<span class="chip" style="background:${accent.accent}22;color:${accent.dark}">${escapeHtml(
      t(`card_types.${cardType}`),
    )}</span>`
  }

  const vitalValue = (l: Log): string => {
    if (l.card_type === 'blood_pressure') {
      const parts = [`${l.bp_systolic}/${l.bp_diastolic} mmHg`]
      if (l.bp_pulse != null) parts.push(`${t('vitals.pulse')} ${l.bp_pulse}`)
      if (l.spo2 != null) parts.push(`SpO₂ ${l.spo2}%`)
      return parts.join(' · ')
    }
    if (l.card_type === 'body_temperature') return `${l.temperature_c}°C`
    if (l.card_type === 'blood_sugar') {
      const timing = l.glucose_timing ? t(`vitals.${l.glucose_timing}`) : ''
      return `${l.glucose_mmol} mmol/L${timing ? ` (${timing})` : ''}`
    }
    return ''
  }

  const vitalRows = vitals
    .slice()
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
    .map(
      (l) =>
        `<tr><td>${escapeHtml(fmtDateTime.format(new Date(l.logged_at)))}</td><td>${typeChip(l.card_type)}</td><td>${escapeHtml(vitalValue(l))}</td></tr>`,
    )
    .join('')

  const alertRows = alerts
    .map((l) => {
      const key = checkAlert(l)!
      const message = t(`alerts.${key}`, { name: elder.name })
      return `<tr><td>${escapeHtml(fmtDateTime.format(new Date(l.logged_at)))}</td><td>${typeChip(l.card_type)}</td><td>${escapeHtml(message)}</td></tr>`
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
    color: #2A2218;
    background: #FAFAF7;
    margin: 0;
    padding: 48px 40px;
  }
  .brand { letter-spacing: 0.35em; font-size: 11px; color: #8A7E72; }
  h1 { font-weight: 200; font-size: 28px; margin: 10px 0 2px; }
  p.meta { color: #8A7E72; font-size: 13px; margin: 4px 0 0; }
  .card {
    background: #FFFFFF;
    border: 0.5px solid #E2DDD6;
    border-radius: 16px;
    padding: 20px 24px;
    margin-top: 20px;
    box-shadow: 0 1px 4px rgba(42,34,24,0.04);
  }
  h2 { font-weight: 300; font-size: 15px; color: #8A7E72; margin: 0 0 4px; }
  .stat { font-size: 34px; font-weight: 200; margin: 4px 0 0; color: #3D6B58; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  th, td { text-align: left; padding: 9px 10px; border-bottom: 0.5px solid #EDE9E2; vertical-align: middle; }
  tr:last-child td { border-bottom: none; }
  th { color: #8A7E72; font-weight: 400; font-size: 12px; }
  .chip {
    display: inline-block;
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 12px;
    white-space: nowrap;
  }
  .empty { color: #8A7E72; }
  footer { margin-top: 28px; font-size: 11px; color: #8A7E72; letter-spacing: 0.08em; }
  @media print { body { padding: 24px; } }
</style>
</head>
<body>
  <p class="brand">CARETAP</p>
  <h1>${escapeHtml(t('report.title'))} — ${escapeHtml(elder.name)}</h1>
  <p class="meta">${escapeHtml(fmtDate.format(since))} – ${escapeHtml(fmtDate.format(now))} · ${escapeHtml(t('report.period', { count: days }))}</p>

  <div class="card">
    <h2>${escapeHtml(t('report.adherence'))}</h2>
    <p class="stat">${adherence}%</p>
  </div>

  <div class="card">
    <h2>${escapeHtml(t('report.vitals'))}</h2>
    <table>
      <thead><tr><th>${escapeHtml(t('report.col_date'))}</th><th>${escapeHtml(t('report.col_type'))}</th><th>${escapeHtml(t('report.col_value'))}</th></tr></thead>
      <tbody>${vitalRows || `<tr><td colspan="3" class="empty">${escapeHtml(t('report.no_vitals'))}</td></tr>`}</tbody>
    </table>
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

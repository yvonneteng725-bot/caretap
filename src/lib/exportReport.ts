import type { Elder, Log } from '../types'
import { checkAlert } from './alerts'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

export function generateReportHtml(elder: Elder, logs: Log[], days: number): string {
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

  const vitalRows = vitals
    .sort((a, b) => b.logged_at.localeCompare(a.logged_at))
    .map((l) => {
      const date = new Date(l.logged_at).toLocaleString()
      let value = ''
      if (l.card_type === 'blood_pressure') value = `${l.bp_systolic}/${l.bp_diastolic} mmHg (pulse ${l.bp_pulse ?? '—'})`
      if (l.card_type === 'body_temperature') value = `${l.temperature_c}°C`
      if (l.card_type === 'blood_sugar') value = `${l.glucose_mmol} mmol/L (${l.glucose_timing ?? ''})`
      return `<tr><td>${escapeHtml(date)}</td><td>${escapeHtml(l.card_type.replace('_', ' '))}</td><td>${escapeHtml(value)}</td></tr>`
    })
    .join('')

  const alertRows = alerts
    .map((l) => `<tr><td>${new Date(l.logged_at).toLocaleString()}</td><td>${escapeHtml(l.card_type.replace('_', ' '))}</td></tr>`)
    .join('')

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>CareTap Report — ${escapeHtml(elder.name)}</title>
<style>
  body { font-family: 'Inter Tight', sans-serif; color: #2A2218; margin: 40px; }
  h1 { font-weight: 300; font-size: 24px; }
  p.meta { color: #8A7E72; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E2DDD6; }
  th { color: #8A7E72; font-weight: 400; }
  h2 { font-weight: 300; font-size: 16px; margin-top: 32px; }
  .stat { font-size: 28px; font-weight: 300; }
</style>
</head>
<body>
  <h1>CareTap Report — ${escapeHtml(elder.name)}</h1>
  <p class="meta">${since.toLocaleDateString()} – ${now.toLocaleDateString()}</p>

  <h2>Medication adherence</h2>
  <p class="stat">${adherence}%</p>

  <h2>Vitals</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th><th>Value</th></tr></thead>
    <tbody>${vitalRows || '<tr><td colspan="3">No vitals recorded</td></tr>'}</tbody>
  </table>

  <h2>Notable alerts</h2>
  <table>
    <thead><tr><th>Date</th><th>Type</th></tr></thead>
    <tbody>${alertRows || '<tr><td colspan="2">No alerts in this period</td></tr>'}</tbody>
  </table>
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
  win.print()
}

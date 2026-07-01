import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Log } from '../../types'

const DATE_LOCALES: Record<string, string> = {
  en: 'en-US',
  'zh-TW': 'zh-TW',
  id: 'id-ID',
}

function formatDate(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short' }).format(new Date(iso))
}

interface Props {
  logs: Log[]
  variant: 'blood_pressure' | 'body_temperature' | 'blood_sugar'
  locale: string
}

export function VitalsChart({ logs, variant, locale: rawLocale }: Props) {
  const locale = DATE_LOCALES[rawLocale] ?? 'en-US'
  const sorted = [...logs].sort((a, b) => a.logged_at.localeCompare(b.logged_at))

  if (variant === 'blood_pressure') {
    const data = sorted.map((l) => ({
      date: formatDate(l.logged_at, locale),
      sys: l.bp_systolic,
      dia: l.bp_diastolic,
    }))
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(200,184,154,0.25)" vertical={false} />
          <ReferenceArea y1={0} y2={120} fill="#B07B7B" fillOpacity={0.08} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8A7E72' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: '#8A7E72' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
          <Line type="monotone" dataKey="sys" stroke="#B07B7B" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="dia" stroke="#B07B7B" strokeWidth={2} strokeDasharray="4 3" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  if (variant === 'body_temperature') {
    const data = sorted.map((l) => ({ date: formatDate(l.logged_at, locale), temp: l.temperature_c }))
    return (
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid stroke="rgba(200,184,154,0.25)" vertical={false} />
          <ReferenceArea y1={36.1} y2={37.2} fill="#C4956A" fillOpacity={0.12} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8A7E72' }} axisLine={false} tickLine={false} />
          <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} tick={{ fontSize: 11, fill: '#8A7E72' }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
          <Line type="monotone" dataKey="temp" stroke="#C4956A" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  const data = sorted.map((l) => ({ date: formatDate(l.logged_at, locale), glucose: l.glucose_mmol }))
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <CartesianGrid stroke="rgba(200,184,154,0.25)" vertical={false} />
        <ReferenceArea y1={3.9} y2={6.1} fill="#6B9B9E" fillOpacity={0.12} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8A7E72' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#8A7E72' }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: 12, border: 'none', fontSize: 12 }} />
        <Line type="monotone" dataKey="glucose" stroke="#6B9B9E" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

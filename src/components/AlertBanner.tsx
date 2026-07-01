import { AlertTriangle } from 'lucide-react'

export function AlertBanner({ message }: { message: string }) {
  return (
    <div className="mx-4 mb-3 flex items-center gap-2 rounded-full bg-[#C4956A]/20 px-4 py-3 text-sm font-light text-[#8A5830]">
      <AlertTriangle size={16} strokeWidth={1.5} />
      <span>{message}</span>
    </div>
  )
}

export function AlertPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#C4956A]/20 px-2.5 py-0.5 text-xs font-light text-[#8A5830]">
      <AlertTriangle size={11} strokeWidth={1.5} />
      {label}
    </span>
  )
}

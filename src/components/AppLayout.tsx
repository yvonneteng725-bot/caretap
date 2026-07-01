import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'

export function AppLayout() {
  return (
    <div className="min-h-screen bg-bg pb-20">
      <Outlet />
      <BottomNav />
    </div>
  )
}

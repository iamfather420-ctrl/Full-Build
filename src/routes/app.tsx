import { Outlet, createFileRoute } from '@tanstack/react-router'
import { DashboardLayout } from '@/components/DashboardLayout'
import { BlinkClientBoundary } from '@/components/BlinkClientBoundary'

export const Route = createFileRoute('/app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <BlinkClientBoundary fallback={
      <div style={{ minHeight: '100vh', background: '#05080F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#D4AF37', fontSize: 12, letterSpacing: '0.2em' }}>
          INITIALIZING 59-PARADOX ENGINE...
        </div>
      </div>
    }>
      <DashboardLayout>
        <Outlet />
      </DashboardLayout>
    </BlinkClientBoundary>
  )
}

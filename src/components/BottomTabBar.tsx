export type MobileTab = 'mes' | 'habitos' | 'stats' | 'cuenta'

interface BottomTabBarProps {
  active: MobileTab
  onSelect: (tab: MobileTab) => void
  userInitial: string
}

function TabIcon({ tab, active }: { tab: MobileTab; active: boolean }) {
  const stroke = active ? 'var(--accent)' : 'var(--text-muted)'
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (tab) {
    case 'mes':
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
      )
    case 'habitos':
      return (
        <svg {...common}>
          <path d="M4 7h10M4 12h10M4 17h6" />
          <path d="M17.5 6.5l1.6 1.6 3-3.2M17.5 15.5l1.6 1.6 3-3.2" stroke="var(--accent)" opacity={active ? 1 : 0.55} />
        </svg>
      )
    case 'stats':
      return (
        <svg {...common}>
          <path d="M5 20V10M12 20V4M19 20v-7" />
        </svg>
      )
    case 'cuenta':
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c0-3.5 3-5.5 7-5.5s7 2 7 5.5" />
        </svg>
      )
  }
}

const TABS: { id: MobileTab; label: string }[] = [
  { id: 'mes', label: 'Mes' },
  { id: 'stats', label: 'Resumen' },
  { id: 'habitos', label: 'Editar' },
  { id: 'cuenta', label: 'Cuenta' },
]

export function BottomTabBar({ active, onSelect, userInitial }: BottomTabBarProps) {
  return (
    <nav
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 45,
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        background: 'color-mix(in oklab, var(--sidebar) 88%, transparent)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        borderTop: '1px solid var(--line)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {TABS.map(t => {
        const on = active === t.id
        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 3, padding: '9px 0 8px', minHeight: 54,
              border: 'none', background: 'transparent', cursor: 'pointer',
              color: on ? 'var(--accent)' : 'var(--text-muted)',
              fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: on ? 600 : 500,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {t.id === 'cuenta' ? (
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: on ? 'linear-gradient(135deg, #4ECDC4, #1F8A5B)' : 'var(--line-strong)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: '#fff',
              }}>{userInitial}</div>
            ) : (
              <TabIcon tab={t.id} active={on} />
            )}
            <span>{t.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

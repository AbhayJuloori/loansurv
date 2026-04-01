import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/',            label: 'Borrower Analysis' },
  { to: '/cohort',      label: 'Cohort Explorer'   },
  { to: '/performance', label: 'Model Performance' },
  { to: '/methodology', label: 'Methodology'       },
]

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 bg-bg border-b border-border"
         style={{ height: 60 }}>
      <div className="flex flex-col justify-center">
        <span className="font-mono font-600 tracking-tight select-none" style={{ fontSize: 16, lineHeight: 1.2 }}>
          Loan<span className="text-accent">Surv</span>
        </span>
        <span className="font-mono text-text-muted" style={{ fontSize: 11, letterSpacing: '0.04em', lineHeight: 1.2 }}>
          Loan Default Risk · Survival Analysis · 1.8M loans
        </span>
      </div>
      <div className="flex items-center gap-7">
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `font-sans transition-all duration-150 pb-px whitespace-nowrap ${
                isActive
                  ? 'text-text-primary font-500 border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`
            }
            aria-current={({ isActive }) => isActive ? 'page' : undefined}
            style={{ fontSize: 14 }}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

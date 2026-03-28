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
         style={{ height: 56 }}>
      <span className="font-mono font-400 tracking-tight select-none" style={{ fontSize: 15 }}>
        Loan<span className="text-accent">Surv</span>
      </span>
      <div className="flex items-center gap-6">
        {LINKS.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `font-sans transition-all duration-150 pb-px whitespace-nowrap ${
                isActive
                  ? 'text-text-primary font-400 border-b-2 border-accent'
                  : 'text-text-muted hover:text-text-primary'
              }`
            }
            style={{ fontSize: 15 }}
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

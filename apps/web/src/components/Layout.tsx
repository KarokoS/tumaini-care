import { useEffect, type ReactNode } from "react"
import { NavLink } from "react-router-dom"
import { useAuthStore } from "../stores/auth.store"
import styles from "./Layout.module.css"

type NavItem = {
  label: string
  path: string
  icon: string
}

type NavSection = {
  label: string
  items: NavItem[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Main",
    items: [
      { label: "Dashboard", path: "/dashboard", icon: "D" },
      { label: "Clients", path: "/clients", icon: "C" },
      { label: "Schedule", path: "/schedule", icon: "S" },
    ],
  },
  {
    label: "Therapy",
    items: [
      ["Sessions", "/sessions", "📝"],
      ["Therapy Plans", "/plans", "🎯"],
      ["Assessments", "/assessments", "📋"],
      ["Reports", "/reports", "📊"],
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Billing", path: "/billing", icon: "B" },
      { label: "Staff", path: "/staff", icon: "T" },
    ],
  },
]

interface LayoutProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export default function Layout({ title, children, action }: LayoutProps) {
  const { user, logout, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <div className={styles.container}>
      <aside className={styles.aside} aria-label="Application sidebar">
        <div className={styles.brand}>
          <div className={styles.logo}>T</div>
          <div>
            <div className={styles.brandTitle}>Tumaini</div>
            <div className={styles.brandSub}>St. Thorlak Centre</div>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className={styles.sectionTitle}>{section.label}</div>
              <ul className={styles.navList}>
                {section.items.map((item) => (
                  <li key={item.path} className={styles.navItem}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                      }
                    >
                      <span className={styles.navIcon}>{item.icon}</span>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.profile}>
          <div className={styles.profileRow}>
            <div className={styles.avatar}>{user?.fullName?.charAt(0) ?? "U"}</div>
            <div className={styles.profileInfo}>
              <div className={styles.userName}>{user?.fullName ?? "User"}</div>
              <div className={styles.userRole}>{user?.role ?? "Member"}</div>
            </div>
          </div>
          <button type="button" onClick={logout} className={styles.signout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.searchBox}>Search clients, sessions...</div>
          <div className={styles.headerActions}>
            <div className={styles.iconBtn} aria-hidden>
              !
              <span className={styles.notificationDot} />
            </div>
            <div className={styles.iconBtn} aria-hidden>
              *
            </div>
          </div>
          {action && <div style={{ marginLeft: 8 }}>{action}</div>}
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}

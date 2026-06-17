import { useEffect } from "react"
import { NavLink } from "react-router-dom"
import { useAuthStore } from "../stores/auth.store"
import styles from "./Layout.module.css"

const NAV_SECTIONS = [
  {
    label: "Main",
    items: [
      ["Dashboard", "/dashboard"],
      ["Clients", "/clients"],
      ["Schedule", "/schedule"],
    ],
  },
  {
    label: "Therapy",
    items: [
      ["Sessions", "/sessions"],
      ["Therapy Plans", "/plans"],
      ["Reports", "/reports"],
    ],
  },
  {
    label: "Operations",
    items: [
      ["Billing", "/billing"],
      ["Staff", "/staff"],
    ],
  },
]

interface LayoutProps {
  title: string
  children: React.ReactNode
  action?: React.ReactNode
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
          {NAV_SECTIONS.map((section, si) => (
            <div key={si}>
              <div className={styles.sectionTitle}>{section.label}</div>
              <ul className={styles.navList}>
                {section.items.map((item, idx) => (
                  <li key={idx} className={styles.navItem}>
                    <NavLink
                      to={item[1]}
                      className={({ isActive }) => isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
                    >
                      {item[0]}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className={styles.profile}>
          <div className={styles.profileRow}>
            <div className={styles.avatar}>{user?.fullName?.charAt(0) ?? 'U'}</div>
            <div className={styles.profileInfo}>
              <div className={styles.userName}>{user?.fullName}</div>
              <div className={styles.userRole}>{user?.role}</div>
            </div>
          </div>
          <button onClick={logout} className={styles.signout}>Sign out</button>
        </div>
      </aside>

      <div className={styles.contentWrapper}>

        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.searchBox}>🔍 Search clients, sessions...</div>
          <div className={styles.headerActions}>
            <div className={styles.iconBtn} aria-hidden>
              🔔
              <span className={styles.notificationDot} />
            </div>
            <div className={styles.iconBtn} aria-hidden>⚙️</div>
          </div>
          {action && <div style={{ marginLeft: 8 }}>{action}</div>}
        </header>

        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
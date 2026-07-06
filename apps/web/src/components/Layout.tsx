import { useEffect, useState, type ReactNode } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useAuthStore } from "../stores/auth.store"
import styles from "./Layout.module.css"

type NavItem = { label: string; path: string; icon: string }
type NavSection = { label: string; items: NavItem[] }

function getNavSections(role: string): NavSection[] {
  const all: NavSection[] = [
    {
      label: "Main",
      items: [
        { label: "Dashboard",      path: "/dashboard",      icon: "⊞" },
        { label: "Clients",        path: "/clients",        icon: "👥" },
        { label: "Import Clients", path: "/clients/import", icon: "📥" },
        { label: "Schedule",       path: "/schedule",       icon: "📅" },
      ]
    },
    {
      label: "Therapy",
      items: [
        { label: "Sessions",       path: "/sessions",       icon: "📝" },
        { label: "Therapy Plans",  path: "/plans",          icon: "🎯" },
        { label: "Assessments",    path: "/assessments",    icon: "📋" },
        { label: "Reports",        path: "/reports",        icon: "📊" },
      ]
    },
    {
      label: "Operations",
      items: [
        { label: "Billing",            path: "/billing",           icon: "💳" },
        { label: "Staff",              path: "/staff",             icon: "👤" },
        { label: "Inventory",          path: "/inventory",         icon: "📦" },
        { label: "Import Attendance",  path: "/attendance/import", icon: "📋" },
      ]
    }
  ]

  if (role === "THERAPIST") {
    return [
      {
        label: "Main",
        items: [
          { label: "Dashboard",     path: "/dashboard",  icon: "⊞" },
          { label: "Clients",       path: "/clients",    icon: "👥" },
          { label: "Schedule",      path: "/schedule",   icon: "📅" },
        ]
      },
      {
        label: "Therapy",
        items: [
          { label: "Sessions",      path: "/sessions",      icon: "📝" },
          { label: "Therapy Plans", path: "/plans",         icon: "🎯" },
          { label: "Assessments",   path: "/assessments",   icon: "📋" },
        ]
      },
      {
        label: "Operations",
        items: [
          { label: "Inventory",     path: "/inventory",     icon: "📦" },
        ]
      }
    ]
  }

  if (role === "RECEPTIONIST") {
    return [
      {
        label: "Main",
        items: [
          { label: "Dashboard",     path: "/dashboard",  icon: "⊞" },
          { label: "Clients",       path: "/clients",    icon: "👥" },
          { label: "Schedule",      path: "/schedule",   icon: "📅" },
        ]
      },
      {
        label: "Operations",
        items: [
          { label: "Billing",       path: "/billing",    icon: "💳" },
          { label: "Inventory",     path: "/inventory",  icon: "📦" },
        ]
      }
    ]
  }

  if (role === "FINANCE") {
    return [
      {
        label: "Main",
        items: [
          { label: "Dashboard",     path: "/dashboard",  icon: "⊞" },
        ]
      },
      {
        label: "Operations",
        items: [
          { label: "Billing",       path: "/billing",    icon: "💳" },
          { label: "Reports",       path: "/reports",    icon: "📊" },
        ]
      }
    ]
  }

  return all
}

interface LayoutProps {
  title: string
  children: ReactNode
  action?: ReactNode
}

export default function Layout({ title, children, action }: LayoutProps) {
  const { user, logout, initialize } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => { initialize() }, [initialize])
  useEffect(() => { setSidebarOpen(false) }, [title])
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [sidebarOpen])

  const navSections = getNavSections(user?.role ?? "")

  return (
    <div className={styles.container}>
      <div
        className={`${styles.overlay} ${sidebarOpen ? styles.overlayVisible : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`${styles.aside} ${sidebarOpen ? styles.asideOpen : ""}`} aria-label="Application sidebar">
        <div className={styles.brand}>
          <img src="/logo.png" alt="Tumaini Logo" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />
          <div>
            <div className={styles.brandTitle}>Tumaini</div>
            <div className={styles.brandSub}>St. Thorlak Centre</div>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Primary navigation">
          {navSections.map((section) => (
            <div key={section.label}>
              <div className={styles.sectionTitle}>{section.label}</div>
              <ul className={styles.navList}>
                {section.items.map((item) => (
                  <li key={item.path} className={styles.navItem}>
                    <NavLink
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
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
          <button type="button" onClick={logout} className={styles.signout}>Sign out</button>
        </div>
      </aside>

      <div className={styles.contentWrapper}>
        <header className={styles.header}>
          <button
            className={styles.hamburger}
            onClick={() => setSidebarOpen(s => !s)}
            aria-label="Open navigation"
          >
            ☰
          </button>
          <h1 className={styles.title}>{title}</h1>
          <div className={styles.searchBox}>Search clients, sessions...</div>
          <div className={styles.headerActions}>
            <div className={styles.iconBtn} title="Messages" onClick={() => alert("Messaging coming soon")} style={{ cursor: "pointer" }}>💬</div>
            <div className={styles.iconBtn} title="Notifications" onClick={() => alert("No new notifications")} style={{ cursor: "pointer", position: "relative" }}>
              🔔<span className={styles.notificationDot} />
            </div>
            <div className={styles.iconBtn} title="Settings" onClick={() => navigate("/staff")} style={{ cursor: "pointer" }}>⚙️</div>
          </div>
          {action && <div style={{ marginLeft: 8 }}>{action}</div>}
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  )
}
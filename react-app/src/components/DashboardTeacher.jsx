import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import CoursesManagementSection from './CoursesManagementSection'
import AISection from './AISection'
import FeedbacksViewSection from './FeedbacksViewSection'
import './Dashboard.css'

// ─── Sections disponibles dans la sidebar ────────────────────────────────────
const NAV_ITEMS = [
  { id: 'courses',   icon: '📚', label: 'Mes cours'       },
  { id: 'ai',        icon: '🤖', label: 'Assistant IA'    },
  { id: 'feedbacks', icon: '📊', label: 'Feedbacks'       },
]

function DashboardTeacher() {
  const navigate    = useNavigate()
  const headerRef   = useRef(null)
  const statsRef    = useRef([])
  const sidebarRef  = useRef(null)

  const [activeSection, setActiveSection] = useState('courses')
  const [sidebarOpen,   setSidebarOpen]   = useState(false)

  // Récupère le nom du prof depuis localStorage
  const user     = (() => { try { return JSON.parse(localStorage.getItem('user')) } catch { return null } })()
  const userName = user?.prenom || user?.nom || user?.email?.split('@')[0] || 'Professeur'
  const initials = userName.slice(0, 2).toUpperCase()

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  // ── Animations d'entrée ─────────────────────────────────────────────────────
  useEffect(() => {
    // Forcer la visibilité initiale AVANT d'animer — évite le flash blanc ou invisible
    if (sidebarRef.current) gsap.set(sidebarRef.current, { opacity: 1, x: 0 })
    if (headerRef.current)  gsap.set(headerRef.current,  { opacity: 1, y: 0 })
    statsRef.current.forEach(el => { if (el) gsap.set(el, { opacity: 1, y: 0 }) })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (sidebarRef.current) {
      tl.from(sidebarRef.current, { x: -30, opacity: 0, duration: 0.5 })
    }
    if (headerRef.current) {
      tl.from(headerRef.current, { y: -20, opacity: 0, duration: 0.5 }, '-=0.3')
    }
    const validStats = statsRef.current.filter(Boolean)
    if (validStats.length > 0) {
      tl.from(validStats, { y: 24, opacity: 0, duration: 0.4, stagger: 0.08 }, '-=0.2')
    }
  }, [])

  const handleLogout = (e) => {
    e?.preventDefault()
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  const sectionTitle = NAV_ITEMS.find(n => n.id === activeSection)?.label || ''

  return (
    <div className="dashboard-page">

      {/* ── Mobile header ─────────────────────────────────────────────────── */}
      <div className="db-mobile-header">
        <button className="db-hamburger" onClick={() => setSidebarOpen(v => !v)}>☰</button>
        <span className="db-mobile-logo">🎓 CT Platform</span>
        <span style={{ width: 32 }} />
      </div>

      {/* ── Sidebar overlay (mobile) ───────────────────────────────────────── */}
      <div
        className={`db-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ════════════════════════════════════════════════════════════════════
          SIDEBAR
      ════════════════════════════════════════════════════════════════════ */}
      <aside ref={sidebarRef} className={`db-sidebar ${sidebarOpen ? 'open' : ''}`} style={{ opacity: 1 }}>

        {/* Logo */}
        <div className="db-logo">
          <div className="db-logo-icon">🎓</div>
          <div className="db-logo-text">
            <span className="db-logo-name">CT Platform</span>
            <span className="db-logo-sub">UM6P · e-learning</span>
          </div>
        </div>

        {/* Profil */}
        <div className="db-user">
          <div
            className="db-avatar"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #8B5CF6)' }}
          >
            {initials}
          </div>
          <div className="db-user-info">
            <div className="db-user-name">{userName}</div>
            <div className="db-user-role">Professeur</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="db-nav">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.id}
              className={`db-nav-item ${activeSection === item.id ? 'active' : ''}`}
              style={{ animationDelay: `${0.05 * i}s` }}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false) }}
            >
              <span className="db-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="db-logout">
          <button className="db-logout-btn" onClick={handleLogout}>
            <span>🚪</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════════════════ */}
      <main className="db-main">

        {/* ── Greeting header ──────────────────────────────────────────────── */}
        <div className="db-greeting" ref={headerRef} style={{ opacity: 1 }}>
          <div className="db-greeting-left">
            <h1 className="db-greeting-title">Bonjour, {userName} 👋</h1>
            <p className="db-greeting-sub">Tableau de bord professeur — gérez vos cours et suivez vos étudiants</p>
            <p className="db-greeting-quote">
              "Enseigner, c'est apprendre deux fois." — Joseph Joubert
            </p>
          </div>
          <div className="db-greeting-right">
            <span className="db-greeting-date">{today}</span>
            <span className="db-greeting-badge">
              <span>●</span> Professeur actif
            </span>
          </div>
        </div>

        {/* ── Stats rapides ─────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {[
            { icon: '📚', label: 'Modules créés',     value: '—', color: '#3B82F6', id: 0 },
            { icon: '👥', label: 'Étudiants inscrits', value: '—', color: '#10B981', id: 1 },
            { icon: '🎯', label: 'Séances actives',    value: '—', color: '#F59E0B', id: 2 },
            { icon: '📊', label: 'Feedbacks reçus',    value: '—', color: '#8B5CF6', id: 3 },
          ].map((stat) => (
            <div
              key={stat.id}
              ref={el => statsRef.current[stat.id] = el}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-card)',
                padding: '1.25rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                borderLeft: `3px solid ${stat.color}`,
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-3px)'
                e.currentTarget.style.boxShadow = `0 12px 28px rgba(0,0,0,0.25)`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: `${stat.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.35rem', fontWeight: 700, color: stat.color, lineHeight: 1.2 }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── AI Banner ─────────────────────────────────────────────────────── */}
        <div className="db-ai-banner">
          <div className="db-ai-banner-left">
            <span className="db-ai-tag">✨ IA · Computational Thinking</span>
            <h2 className="db-ai-title">Générez quiz & exercices<br />avec l'IA en un clic</h2>
            <p className="db-ai-desc">
              L'assistant IA analyse le contenu de vos séances et génère automatiquement des activités
              alignées sur les 4 piliers du CT — décomposition, abstraction, généralisation, algorithme.
            </p>
            <button className="db-ai-cta" onClick={() => setActiveSection('ai')}>
              Ouvrir l'assistant IA →
            </button>
            <p className="db-ai-footer"> UM6P PFE 2025</p>
          </div>
          <div className="db-ai-banner-right db-ai-illustration">
            <span style={{ fontSize: '5rem', filter: 'drop-shadow(0 0 24px rgba(139,92,246,0.5))' }}>🤖</span>
          </div>
        </div>

        {/* ── Section active ────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Breadcrumb section */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.6rem',
            paddingBottom: '1rem', borderBottom: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Dashboard
            </span>
            <span style={{ color: 'var(--border-medium)' }}>›</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>
              {sectionTitle}
            </span>

            {/* Tab pills */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  style={{
                    padding: '0.3rem 0.8rem',
                    borderRadius: 999,
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    border: '1px solid',
                    transition: 'all 0.18s',
                    ...(activeSection === item.id
                      ? { background: 'var(--accent-blue)', borderColor: 'var(--accent-blue)', color: 'white' }
                      : { background: 'transparent', borderColor: 'var(--border-medium)', color: 'var(--text-secondary)' }
                    )
                  }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenu de la section */}
          {activeSection === 'courses'   && <CoursesManagementSection />}
          {activeSection === 'ai'        && <AISection userType="teacher" />}
          {activeSection === 'feedbacks' && <FeedbacksViewSection />}
        </div>

      </main>
    </div>
  )
}

export default DashboardTeacher;
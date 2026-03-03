import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import CoursesSection from './CoursesSection'
import AISection from './AISection'
import FeedbackSection from './FeedbackSection'
import './Dashboard.css'

/* ── Helpers ─────────────────────────────────────── */
const QUOTES = [
  'Préparez-vous pour une semaine d\'excellence.',       // 0 Dimanche
  'Une nouvelle semaine, de nouvelles opportunités d\'apprendre.', // 1 Lundi
  'La persévérance est la clé de toute réussite académique.',      // 2 Mardi
  'Chaque quiz est une chance de progresser.',           // 3 Mercredi
  'La connaissance est le seul trésor qu\'on ne peut pas perdre.', // 4 Jeudi
  'Terminez la semaine plus savant qu\'au début.',       // 5 Vendredi
  'Le week-end est parfait pour consolider vos acquis.', // 6 Samedi
]

const ICONS = ['📐', '📊', '🔬', '💻', '📖', '🧮', '🌍', '⚗️']

function getGreeting(prenom) {
  const h = new Date().getHours()
  if (h >= 6  && h < 12) return `Bonjour, ${prenom} ☀️`
  if (h >= 12 && h < 18) return `Bon après-midi, ${prenom} 📖`
  return `Bonsoir, ${prenom} 🌙`
}

function getInitials(name = '') {
  return name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

function hashColor(name = '') {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 42%)`
}

/* ── Nav items ───────────────────────────────────── */
const NAV_ITEMS = [
  { icon: '🏠', label: 'Tableau de bord', href: '/dashboard/student' },
  { icon: '📚', label: 'Mes Modules',      href: '#courses' },
  { icon: '🎯', label: 'Quiz & Évaluations', href: '#courses' },
  { icon: '✏️', label: 'Exercices',         href: '#courses' },
  { icon: '💬', label: 'Feedbacks',         href: '#courses' },
]

/* ══════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════ */
function DashboardStudent() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const coursesRef = useRef(null)

  /* User data from localStorage */
  const rawUser   = localStorage.getItem('user')
  const user      = rawUser ? JSON.parse(rawUser) : {}
  const fullName  = user.nom || user.name || user.prenom || 'Étudiant'
  const prenom    = (user.prenom || user.firstName || fullName.split(' ')[0] || 'Étudiant')
  const filiere   = user.filiere || user.specialite || 'EM Mines Paris'
  const initials  = getInitials(fullName)
  const avatarBg  = hashColor(fullName)

  /* Date */
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
  const quote = QUOTES[new Date().getDay()]

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/'
  }

  const handleNavClick = (href) => {
    setSidebarOpen(false)
    if (href === '#courses') {
      coursesRef.current?.scrollIntoView({ behavior: 'smooth' })
    } else {
      navigate(href)
    }
  }

  return (
    <div className="dashboard-page">

      {/* ── Mobile Header ─────────────────────────── */}
      <div className="db-mobile-header">
        <button className="db-hamburger" onClick={() => setSidebarOpen(v => !v)}>☰</button>
        <span className="db-mobile-logo">EM Mines</span>
        <div
          className="db-avatar"
          style={{ background: avatarBg, width: 32, height: 32, fontSize: '0.72rem' }}
        >
          {initials}
        </div>
      </div>

      {/* ── Sidebar overlay (mobile) ───────────────── */}
      <div
        className={`db-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Sidebar ───────────────────────────────── */}
      <aside className={`db-sidebar ${sidebarOpen ? 'open' : ''}`}>

        {/* Logo */}
        <div className="db-logo">
          <div className="db-logo-icon">🎓</div>
          <div className="db-logo-text">
            <div className="db-logo-name">EM Mines</div>
            <div className="db-logo-sub">UMR6P · e-learning</div>
          </div>
        </div>

        {/* User */}
        <div className="db-user">
          <div className="db-avatar" style={{ background: avatarBg }}>{initials}</div>
          <div className="db-user-info">
            <div className="db-user-name">{fullName}</div>
            <div className="db-user-role">{filiere}</div>
          </div>
        </div>

        {/* Nav */}
        <nav className="db-nav">
          {NAV_ITEMS.map((item, i) => (
            <button
              key={item.label}
              className={`db-nav-item ${item.href === '/dashboard/student' && location.pathname === '/dashboard/student' ? 'active' : ''}`}
              style={{ animationDelay: `${i * 0.05}s` }}
              onClick={() => handleNavClick(item.href)}
            >
              <span className="db-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="db-logout">
          <button className="db-logout-btn" onClick={handleLogout}>
            <span>⎋</span> Déconnexion
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────── */}
      <main className="db-main">

        {/* Bloc 1 — Greeting */}
        <div className="db-greeting">
          <div className="db-greeting-left">
            <h1 className="db-greeting-title">{getGreeting(prenom)}</h1>
            <p className="db-greeting-sub">
              Votre espace d'apprentissage personnel — EM Mines UMR6P
            </p>
            <p className="db-greeting-quote">"{quote}"</p>
          </div>
          <div className="db-greeting-right">
            <span className="db-greeting-date">{today}</span>
            <span className="db-greeting-badge">🎓 Étudiant</span>
          </div>
        </div>

        {/* Bloc 2 — AI Banner */}
        <div className="db-ai-banner">
          <div className="db-ai-banner-left">
            <span className="db-ai-tag">🤖 Intelligence Artificielle</span>
            <h2 className="db-ai-title">Générez vos Quiz &amp; Exercices en un clic</h2>
            <p className="db-ai-desc">
              Notre IA Gemini analyse vos PDFs de cours et génère des évaluations
              personnalisées en quelques secondes.
            </p>
            <button
              className="db-ai-cta"
              onClick={() => coursesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            >
              Accéder à mes cours →
            </button>
            <p className="db-ai-footer">✦ Propulsé par Google Gemini</p>
          </div>

          <div className="db-ai-banner-right db-ai-illustration">
            <svg width="120" height="110" viewBox="0 0 120 110" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Card 1 — back */}
              <rect x="30" y="30" width="80" height="52" rx="10" fill="#1E293B" stroke="rgba(139,92,246,0.25)" strokeWidth="1.5"/>
              <rect x="40" y="42" width="35" height="5" rx="2.5" fill="rgba(139,92,246,0.4)"/>
              <rect x="40" y="52" width="50" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
              <rect x="40" y="60" width="42" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>
              {/* Card 2 — mid */}
              <rect x="20" y="20" width="80" height="52" rx="10" fill="#1E3A5F" stroke="rgba(59,130,246,0.3)" strokeWidth="1.5"/>
              <rect x="30" y="32" width="35" height="5" rx="2.5" fill="rgba(59,130,246,0.5)"/>
              <rect x="30" y="42" width="50" height="4" rx="2" fill="rgba(255,255,255,0.1)"/>
              <rect x="30" y="50" width="38" height="4" rx="2" fill="rgba(255,255,255,0.07)"/>
              {/* Card 3 — front */}
              <rect x="10" y="10" width="80" height="52" rx="10" fill="#161F2E" stroke="rgba(59,130,246,0.5)" strokeWidth="1.5"/>
              <rect x="20" y="20" width="35" height="5" rx="2.5" fill="#3B82F6"/>
              <rect x="20" y="30" width="50" height="4" rx="2" fill="rgba(255,255,255,0.12)"/>
              <rect x="20" y="38" width="44" height="4" rx="2" fill="rgba(255,255,255,0.08)"/>
              <rect x="20" y="46" width="30" height="4" rx="2" fill="rgba(255,255,255,0.06)"/>
              {/* Check badge */}
              <circle cx="82" cy="72" r="12" fill="#10B981"/>
              <text x="82" y="77" textAnchor="middle" fontSize="13" fill="white">✓</text>
            </svg>
          </div>
        </div>

        {/* Bloc 3 — Courses */}
        <div ref={coursesRef} id="courses">
          <CoursesSection userType="student" />
        </div>

        {/* Bloc 4 — AI Info (repurposed as info banner) */}
        <AISection userType="student" />

        {/* Bloc 5 — Feedback info */}
        <FeedbackSection userType="student" />

      </main>
    </div>
  )
}

export default DashboardStudent
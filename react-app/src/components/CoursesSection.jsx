import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { modulesAPI } from '../services/api'
import './Dashboard.css'

/* ── Helpers ── */
const MODULE_ICONS = ['📐', '📊', '🔬', '💻', '📖', '🧮', '🌍', '⚗️']

function moduleColor(index) {
  const hue = (index * 137) % 360
  return `hsl(${hue}, 60%, 55%)`
}

/* ── Skeleton Card ── */
function SkeletonCard() {
  return (
    <div className="db-skeleton-card">
      <div className="db-skeleton-top db-skeleton" />
      <div className="db-skeleton-body">
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <div className="db-skeleton" style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div className="db-skeleton db-skeleton-title" />
            <div className="db-skeleton db-skeleton-sub" style={{ marginTop: 8 }} />
          </div>
        </div>
        <div className="db-skeleton db-skeleton-line" />
        <div className="db-skeleton db-skeleton-line-short" />
        <div className="db-skeleton db-skeleton-btn" />
      </div>
    </div>
  )
}

/* ── Module Card ── */
function ModuleCard({ module, index, onAccess }) {
  const color = moduleColor(index)
  const icon  = MODULE_ICONS[index % MODULE_ICONS.length]

  return (
    <div
      className="db-module-card"
      style={{ animationDelay: `${index * 0.08}s` }}
    >
      <div className="db-module-top-bar" style={{ background: color }} />

      <div className="db-module-body">
        <div className="db-module-title-row">
          <span className="db-module-icon">{icon}</span>
          <div>
            <div className="db-module-title">{module.titre}</div>
            <div className="db-module-meta">
              {module.sub_modules?.length
                ? `${module.sub_modules.length} cours disponible${module.sub_modules.length > 1 ? 's' : ''}`
                : module.professeur_nom
                  ? `Prof. ${module.professeur_nom}`
                  : 'Module de cours'}
            </div>
          </div>
        </div>

        {module.description && (
          <p className="db-module-desc">{module.description}</p>
        )}

        <div className="db-module-progress-wrap">
          <div className="db-module-progress-info">
            <span className="db-module-progress-label">Progression</span>
            <span className="db-module-progress-pct">0%</span>
          </div>
          <div className="db-module-progress-bar">
            <div
              className="db-module-progress-fill"
              style={{ width: '0%', background: color }}
            />
          </div>
        </div>
      </div>

      <div className="db-module-footer">
        <button
          className="db-module-btn"
          onClick={() => onAccess(module._id)}
          style={{ '--accent-blue': color }}
        >
          Accéder au cours
        </button>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */
function CoursesSection({ userType }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await modulesAPI.getAll()
      setModules(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccessCourse = (moduleId) => {
    navigate(`/module/${moduleId}`)
  }

  return (
    <section className="db-courses-section">

      {/* Section header */}
      <div className="db-section-header">
        <h2 className="db-section-title">📚 Mes Modules</h2>
        {!loading && !error && (
          <span className="db-section-badge">
            {modules.length} module{modules.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Loading — skeleton grid */}
      {loading && (
        <div className="db-modules-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="db-error">
          <div className="db-error-badge">⚠️ Erreur de chargement</div>
          <p className="db-error-msg">
            Impossible de récupérer vos modules. Vérifiez votre connexion.
          </p>
          <button className="db-retry-btn" onClick={loadModules}>
            🔄 Réessayer
          </button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && modules.length === 0 && (
        <div className="db-empty">
          <div className="db-empty-icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <rect x="8" y="16" width="48" height="36" rx="6" stroke="rgba(255,255,255,0.15)" strokeWidth="2" fill="none"/>
              <path d="M20 28h24M20 36h16" stroke="rgba(255,255,255,0.12)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="44" cy="44" r="8" fill="#161F2E" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5"/>
              <path d="M44 41v6M41 44h6" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <p className="db-empty-title">Aucun module disponible</p>
          <p className="db-empty-sub">
            Vous n'êtes inscrit à aucun module pour le moment.
            Contactez votre enseignant pour obtenir accès.
          </p>
        </div>
      )}

      {/* Modules grid */}
      {!loading && !error && modules.length > 0 && (
        <div className="db-modules-grid">
          {modules.map((module, index) => (
            <ModuleCard
              key={module._id}
              module={module}
              index={index}
              onAccess={handleAccessCourse}
            />
          ))}
        </div>
      )}

    </section>
  )
}

export default CoursesSection
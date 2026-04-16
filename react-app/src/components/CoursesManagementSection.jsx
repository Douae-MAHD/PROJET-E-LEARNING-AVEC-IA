import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { modulesAPI } from '../services/api'
import './Dashboard.css'

const MODULE_COLORS = [
  { bar: '#3B82F6', icon: '💻', bg: 'rgba(59,130,246,0.1)' },
  { bar: '#10B981', icon: '🧬', bg: 'rgba(16,185,129,0.1)' },
  { bar: '#F59E0B', icon: '📐', bg: 'rgba(245,158,11,0.1)'  },
  { bar: '#8B5CF6', icon: '🔬', bg: 'rgba(139,92,246,0.1)'  },
  { bar: '#EF4444', icon: '🌐', bg: 'rgba(239,68,68,0.1)'   },
  { bar: '#06B6D4', icon: '⚡', bg: 'rgba(6,182,212,0.1)'   },
]

function CoursesManagementSection() {
  const [modules,     setModules]     = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [creating,    setCreating]    = useState(false)
  const [newModule,   setNewModule]   = useState({ titre: '', description: '' })
  const navigate = useNavigate()

  useEffect(() => { loadModules() }, [])

  const loadModules = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await modulesAPI.getAll()
      setModules(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newModule.titre.trim()) { alert('Le titre est requis'); return }
    try {
      setCreating(true)
      await modulesAPI.create(newModule)
      setNewModule({ titre: '', description: '' })
      setShowForm(false)
      await loadModules()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="db-courses-section">
      <div className="db-section-header">
        <h2 className="db-section-title">📚 Gestion des cours</h2>
      </div>
      <div className="db-modules-grid">
        {[1, 2, 3].map(i => (
          <div key={i} className="db-skeleton-card">
            <div className="db-skeleton-top" />
            <div className="db-skeleton-body">
              <div className="db-skeleton db-skeleton-title" />
              <div className="db-skeleton db-skeleton-sub" />
              <div className="db-skeleton db-skeleton-line" />
              <div className="db-skeleton db-skeleton-line-short" />
              <div className="db-skeleton db-skeleton-btn" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div className="db-courses-section">

      {/* ── Header section ──────────────────────────────────────────────── */}
      <div className="db-section-header">
        <h2 className="db-section-title">📚 Gestion des cours</h2>
        <span className="db-section-badge">{modules.length} module{modules.length !== 1 ? 's' : ''}</span>
        <button
          className="db-ai-cta"
          style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem', animation: 'none' }}
          onClick={() => setShowForm(v => !v)}
        >
          {showForm ? '✕ Annuler' : '+ Nouveau module'}
        </button>
      </div>

      {/* ── Erreur ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="db-error">
          <span className="db-error-badge">⚠️ Erreur</span>
          <p className="db-error-msg">{error}</p>
          <button className="db-retry-btn" onClick={loadModules}>↻ Réessayer</button>
        </div>
      )}

      {/* ── Formulaire création ─────────────────────────────────────────── */}
      {showForm && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-card)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          borderLeft: '3px solid var(--accent-blue)',
        }}>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            Nouveau module
          </h3>
          <input
            type="text"
            placeholder="Titre du module *"
            value={newModule.titre}
            onChange={e => setNewModule({ ...newModule, titre: e.target.value })}
            style={{
              background: 'var(--bg-base)', border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-btn)', padding: '0.7rem 1rem',
              color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
              outline: 'none', width: '100%', boxSizing: 'border-box',
            }}
          />
          <textarea
            placeholder="Description (optionnel)"
            value={newModule.description}
            onChange={e => setNewModule({ ...newModule, description: e.target.value })}
            rows={3}
            style={{
              background: 'var(--bg-base)', border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-btn)', padding: '0.7rem 1rem',
              color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', fontSize: '0.9rem',
              outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="db-ai-cta"
              style={{ padding: '0.6rem 1.4rem', fontSize: '0.875rem', animation: 'none' }}
            >
              {creating ? '⏳ Création...' : '✓ Créer le module'}
            </button>
            <button
              onClick={() => { setShowForm(false); setNewModule({ titre: '', description: '' }) }}
              style={{
                padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-btn)',
                border: '1px solid var(--border-medium)', background: 'transparent',
                color: 'var(--text-secondary)', fontFamily: 'var(--font-sans)',
                fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Liste modules ───────────────────────────────────────────────── */}
      {modules.length === 0 && !error ? (
        <div className="db-empty">
          <div className="db-empty-icon">📭</div>
          <h3 className="db-empty-title">Aucun module créé</h3>
          <p className="db-empty-sub">Créez votre premier module pour commencer à organiser vos séances et activités.</p>
        </div>
      ) : (
        <div className="db-modules-grid">
          {modules.map((module, idx) => {
            const palette = MODULE_COLORS[idx % MODULE_COLORS.length]
            return (
              <div key={module._id} className="db-module-card">
                {/* Barre colorée en haut */}
                <div className="db-module-top-bar" />

                <div className="db-module-body">
                  <div className="db-module-title-row">
                    {/* Icône dans un cercle coloré */}
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: palette.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.4rem', flexShrink: 0,
                    }}>
                      {palette.icon}
                    </div>
                    <div>
                      <h3 className="db-module-title">{module.titre}</h3>
                      <span className="db-module-meta">
                        Module #{idx + 1}
                        {module.seancesCount != null ? ` · ${module.seancesCount} séances` : ''}
                      </span>
                    </div>
                  </div>

                  {module.description && (
                    <p className="db-module-desc">{module.description}</p>
                  )}

                  {/* Tags */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: 'auto' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                      background: palette.bg, color: palette.bar,
                      padding: '0.2rem 0.6rem', borderRadius: 999,
                      border: `1px solid ${palette.bar}40`,
                    }}>
                      CT Platform
                    </span>
                    {module.subModulesCount > 0 && (
                      <span style={{
                        fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                        background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)',
                        padding: '0.2rem 0.6rem', borderRadius: 999,
                        border: '1px solid var(--border-subtle)',
                      }}>
                        {module.subModulesCount} chapitres
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer bouton */}
                <div className="db-module-footer">
                  <button
                    className="db-module-btn"
                    style={{ borderColor: palette.bar, color: palette.bar }}
                    onClick={() => navigate(`/teacher/module/${module._id}`)}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = palette.bar
                      e.currentTarget.style.color = 'white'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = palette.bar
                    }}
                  >
                    Gérer ce module →
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default CoursesManagementSection
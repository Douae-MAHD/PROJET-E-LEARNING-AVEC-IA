import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { modulesAPI, seancesAPI, pdfsAPI } from '../services/api'
import StudentEnrollment from './StudentEnrollment'
import './Dashboard.css'

/* ── Palette cohérente avec le dashboard ─────────────────────────────────── */
const PALETTE = [
  { accent: '#3B82F6', glow: 'rgba(59,130,246,0.15)',  label: 'blue'   },
  { accent: '#10B981', glow: 'rgba(16,185,129,0.15)',  label: 'green'  },
  { accent: '#F59E0B', glow: 'rgba(245,158,11,0.15)',  label: 'amber'  },
  { accent: '#8B5CF6', glow: 'rgba(139,92,246,0.15)',  label: 'violet' },
  { accent: '#EC4899', glow: 'rgba(236,72,153,0.15)',  label: 'pink'   },
  { accent: '#06B6D4', glow: 'rgba(6,182,212,0.15)',   label: 'cyan'   },
]

const TYPE_CONFIG = {
  presentielle: { label: 'Présentielle', icon: '🏫', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  distanciel:   { label: 'Distanciel',   icon: '💻', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
}

/* ── Composants UI réutilisables ─────────────────────────────────────────── */
const Field = ({ as: Tag = 'input', label, icon, ...props }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
    {label && (
      <label style={{
        fontSize: '0.75rem', color: 'var(--text-secondary)',
        fontFamily: 'var(--font-mono)', letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}>
        {icon && <span style={{ marginRight: '0.3rem' }}>{icon}</span>}
        {label}
      </label>
    )}
    <Tag
      {...props}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid var(--border-medium)',
        borderRadius: 10, padding: '0.7rem 1rem',
        color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
        fontSize: '0.875rem', outline: 'none', width: '100%',
        boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
        resize: Tag === 'textarea' ? 'vertical' : undefined,
        ...props.style,
      }}
      onFocus={e => {
        e.currentTarget.style.borderColor = 'var(--accent-blue)'
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
      }}
      onBlur={e => {
        e.currentTarget.style.borderColor = 'var(--border-medium)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    />
  </div>
)

const Btn = ({ children, variant = 'primary', color, size = 'md', ...props }) => {
  const sizes = { sm: '0.4rem 0.85rem', md: '0.6rem 1.25rem', lg: '0.75rem 1.6rem' }
  const isPrimary = variant === 'primary'
  const bg = isPrimary ? (color || 'var(--accent-blue)') : 'transparent'
  return (
    <button
      {...props}
      style={{
        padding: sizes[size], borderRadius: 10,
        background: bg,
        border: isPrimary ? 'none' : '1px solid var(--border-medium)',
        color: isPrimary ? 'white' : 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)', fontSize: size === 'sm' ? '0.8rem' : '0.875rem',
        fontWeight: 600, cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.45 : 1, transition: 'all 0.18s',
        display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
        whiteSpace: 'nowrap',
        ...props.style,
      }}
      onMouseEnter={e => { if (!props.disabled) {
        e.currentTarget.style.filter = 'brightness(1.12)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}}
      onMouseLeave={e => {
        e.currentTarget.style.filter = 'none'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {children}
    </button>
  )
}

/* Badge pill */
const Badge = ({ children, color = '#3B82F6' }) => (
  <span style={{
    fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
    background: `${color}18`, color, padding: '0.2rem 0.65rem',
    borderRadius: 999, border: `1px solid ${color}30`, letterSpacing: '0.02em',
  }}>
    {children}
  </span>
)

/* Card container */
const Card = ({ children, accent, style, ...props }) => (
  <div
    {...props}
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderLeft: accent ? `3px solid ${accent}` : undefined,
      borderRadius: 'var(--radius-card)',
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
)

/* Section header inside a card */
const CardHeader = ({ title, subtitle, actions, icon }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '1.1rem 1.5rem',
    borderBottom: '1px solid var(--border-subtle)',
    background: 'rgba(255,255,255,0.02)',
  }}>
    {icon && <span style={{ fontSize: '1.1rem' }}>{icon}</span>}
    <div style={{ flex: 1 }}>
      <div style={{
        fontFamily: 'var(--font-sans)', fontSize: '0.95rem',
        fontWeight: 700, color: 'var(--text-primary)',
      }}>{title}</div>
      {subtitle && <div style={{
        fontSize: '0.75rem', color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)', marginTop: 2,
      }}>{subtitle}</div>}
    </div>
    {actions && <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>{actions}</div>}
  </div>
)

/* ══════════════════════════════════════════════════════════════════════════
   VUE DÉTAIL SUBMODULE
══════════════════════════════════════════════════════════════════════════ */
function SubModuleDetail({ moduleId, subModule, onBack }) {
  const [seances,          setSeances]          = useState([])
  const [selectedSeanceId, setSelectedSeanceId] = useState('')
  const [showAddSeance,    setShowAddSeance]    = useState(false)
  const [newSeance,        setNewSeance]        = useState({
    titre: '', type: 'presentielle', dateSeance: '', duree: '',
  })
  const [uploading,  setUploading]  = useState(false)
  const [creating,   setCreating]   = useState(false)
  const [error,      setError]      = useState('')
  const [pdfs,       setPdfs]       = useState(subModule.pdfs || [])
  const fileRef = useRef(null)

  useEffect(() => { loadSeances() }, [subModule._id])

  const loadSeances = async () => {
    try {
      const data = await seancesAPI.getBySubModule(subModule._id)
      const sorted = (Array.isArray(data) ? data : [])
        .slice().sort((a, b) => (a?.ordre ?? 999) - (b?.ordre ?? 999))
      setSeances(sorted)
    } catch (err) { setError(err.message) }
  }

  const handleCreateSeance = async () => {
    if (!newSeance.titre.trim()) { alert('Le titre est requis'); return }
    try {
      setCreating(true)
      await seancesAPI.create({
        moduleId, subModuleId: subModule._id,
        titre: newSeance.titre.trim(), type: newSeance.type,
        ...(newSeance.dateSeance ? { dateSeance: newSeance.dateSeance } : {}),
        ...(newSeance.duree ? { duree: Number(newSeance.duree) } : {}),
      })
      setNewSeance({ titre: '', type: 'presentielle', dateSeance: '', duree: '' })
      setShowAddSeance(false)
      await loadSeances()
    } catch (err) { setError(err.message) }
    finally { setCreating(false) }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!selectedSeanceId) { alert('Sélectionnez une séance d\'abord'); return }
    try {
      setUploading(true)
      const result = await pdfsAPI.upload(selectedSeanceId, file)
      setPdfs(prev => [...prev, result])
    } catch (err) { setError(err.message) }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleDeletePdf = async (pdfId) => {
    if (!window.confirm('Supprimer ce PDF définitivement ?')) return
    try {
      await pdfsAPI.delete(pdfId)
      setPdfs(prev => prev.filter(p => p._id !== pdfId))
    } catch (err) { setError(err.message) }
  }

  const selectedSeance = seances.find(s => s._id === selectedSeanceId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Breadcrumb ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <Btn variant="ghost" size="sm" onClick={onBack}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)', borderRadius: 10,
          }}
        >
          ← Retour
        </Btn>
        <span style={{ color: 'var(--border-medium)' }}>›</span>
        <span style={{
          fontFamily: 'var(--font-sans)', fontSize: '1rem',
          color: 'var(--text-primary)', fontWeight: 700,
        }}>
          {subModule.titre}
        </span>
        {subModule.description && (
          <span style={{
            fontSize: '0.78rem', color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)', marginLeft: '0.25rem',
          }}>
            — {subModule.description}
          </span>
        )}
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1.25rem', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#FCA5A5', fontSize: '0.875rem',
        }}>
          ⚠️ {error}
          <button onClick={() => setError('')}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#FCA5A5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════
          SÉANCES
      ════════════════════════════════════════════════════════════ */}
      <Card accent="#3B82F6">
        <CardHeader
          icon="🎯"
          title="Séances"
          subtitle={`${seances.length} séance${seances.length !== 1 ? 's' : ''} dans ce chapitre`}
          actions={
            <Btn
              size="sm"
              variant={showAddSeance ? 'secondary' : 'primary'}
              onClick={() => setShowAddSeance(v => !v)}
              style={showAddSeance ? {
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-secondary)',
              } : {}}
            >
              {showAddSeance ? '✕ Annuler' : '+ Nouvelle séance'}
            </Btn>
          }
        />

        <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Formulaire nouvelle séance */}
          {showAddSeance && (
            <div style={{
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: 12, padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: '0.85rem',
            }}>
              <div style={{
                fontSize: '0.8rem', color: '#60A5FA',
                fontFamily: 'var(--font-mono)', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                marginBottom: '0.25rem',
              }}>
                ✦ Nouvelle séance
              </div>
              <Field label="Titre" icon="📌" placeholder="Ex: Introduction aux variables"
                value={newSeance.titre}
                onChange={e => setNewSeance({ ...newSeance, titre: e.target.value })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{
                    fontSize: '0.75rem', color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)', letterSpacing: '0.04em', textTransform: 'uppercase',
                  }}>⚡ Type</label>
                  <select
                    value={newSeance.type}
                    onChange={e => setNewSeance({ ...newSeance, type: e.target.value })}
                    style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-medium)',
                      borderRadius: 10, padding: '0.7rem 1rem',
                      color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
                      fontSize: '0.875rem', outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="presentielle">🏫 Présentielle</option>
                    <option value="distanciel">💻 Distanciel</option>
                  </select>
                </div>
                <Field label="Durée (min)" icon="⏱" type="number" min="1" placeholder="90"
                  value={newSeance.duree}
                  onChange={e => setNewSeance({ ...newSeance, duree: e.target.value })} />
                <Field label="Date" icon="📅" type="date"
                  value={newSeance.dateSeance}
                  onChange={e => setNewSeance({ ...newSeance, dateSeance: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Btn onClick={handleCreateSeance} disabled={creating}>
                  {creating ? '⏳ Création...' : '✓ Créer la séance'}
                </Btn>
                <Btn variant="secondary" onClick={() => setShowAddSeance(false)}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-medium)',
                    color: 'var(--text-secondary)',
                  }}>
                  Annuler
                </Btn>
              </div>
            </div>
          )}

          {/* Liste des séances */}
          {seances.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '2rem',
              color: 'var(--text-muted)', fontSize: '0.875rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
              <div>Aucune séance — créez-en une pour commencer</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {seances.map((s, idx) => {
                const tc = TYPE_CONFIG[s.type] || TYPE_CONFIG.presentielle
                const isSelected = selectedSeanceId === s._id
                return (
                  <div
                    key={s._id}
                    onClick={() => setSelectedSeanceId(isSelected ? '' : s._id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '1rem',
                      padding: '0.85rem 1.1rem', borderRadius: 10, cursor: 'pointer',
                      border: `1px solid ${isSelected ? tc.color + '50' : 'var(--border-subtle)'}`,
                      background: isSelected ? tc.bg : 'rgba(255,255,255,0.02)',
                      transition: 'all 0.18s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
                    }}
                  >
                    {/* Ordre */}
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: `${tc.color}20`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: tc.color,
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {s.ordre ?? idx + 1}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.875rem', fontWeight: 600,
                        color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {s.titre}
                      </div>
                      <div style={{
                        fontSize: '0.72rem', color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)', marginTop: 2,
                      }}>
                        {s.dateSeance ? new Date(s.dateSeance).toLocaleDateString('fr-FR') : '—'}
                        {s.duree ? ` · ${s.duree} min` : ''}
                      </div>
                    </div>

                    {/* Badges */}
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.65rem',
                        borderRadius: 999, background: tc.bg, color: tc.color,
                        border: `1px solid ${tc.color}30`, fontFamily: 'var(--font-mono)',
                      }}>
                        {tc.icon} {tc.label}
                      </span>
                      {isSelected && (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.65rem',
                          borderRadius: 999, background: 'rgba(59,130,246,0.15)',
                          color: '#60A5FA', border: '1px solid rgba(59,130,246,0.3)',
                          fontFamily: 'var(--font-mono)',
                        }}>
                          ✓ Active
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════
          UPLOAD PDF
      ════════════════════════════════════════════════════════════ */}
      <Card accent={selectedSeanceId ? '#10B981' : 'var(--border-subtle)'}
        style={{ opacity: selectedSeanceId ? 1 : 0.55, transition: 'opacity 0.25s' }}>
        <CardHeader
          icon="📎"
          title="Upload PDF"
          subtitle={selectedSeanceId
            ? `Séance sélectionnée : ${selectedSeance?.titre}`
            : 'Sélectionnez une séance ci-dessus pour activer l\'upload'}
        />
        <div style={{ padding: '1.25rem 1.5rem' }}>
          <label style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.75rem', padding: '1.5rem',
            borderRadius: 12, cursor: selectedSeanceId ? 'pointer' : 'not-allowed',
            border: `2px dashed ${selectedSeanceId ? '#10B981' : 'var(--border-subtle)'}`,
            background: selectedSeanceId ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.01)',
            transition: 'all 0.2s', color: 'var(--text-secondary)',
          }}
            onMouseEnter={e => {
              if (selectedSeanceId && !uploading) {
                e.currentTarget.style.background = 'rgba(16,185,129,0.1)'
                e.currentTarget.style.borderColor = '#10B981'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = selectedSeanceId ? 'rgba(16,185,129,0.05)' : 'rgba(255,255,255,0.01)'
              e.currentTarget.style.borderColor = selectedSeanceId ? '#10B981' : 'var(--border-subtle)'
            }}
          >
            <span style={{ fontSize: '1.75rem' }}>{uploading ? '⏳' : '📄'}</span>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: '0.9rem', fontWeight: 600,
                color: selectedSeanceId ? 'var(--text-primary)' : 'var(--text-muted)',
              }}>
                {uploading ? 'Upload en cours...' : 'Cliquer pour choisir un PDF'}
              </div>
              <div style={{
                fontSize: '0.75rem', color: 'var(--text-muted)',
                fontFamily: 'var(--font-mono)', marginTop: 3,
              }}>
                Format accepté : .pdf · Max 10 MB
              </div>
            </div>
            <input
              ref={fileRef}
              type="file" accept=".pdf"
              onChange={handleUpload}
              disabled={uploading || !selectedSeanceId}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </Card>

      {/* ════════════════════════════════════════════════════════════
          PDFs DISPONIBLES
      ════════════════════════════════════════════════════════════ */}
      {pdfs.length > 0 && (
        <Card accent="#8B5CF6">
          <CardHeader
            icon="📚"
            title="PDFs disponibles"
            subtitle={`${pdfs.length} document${pdfs.length !== 1 ? 's' : ''} uploadé${pdfs.length !== 1 ? 's' : ''}`}
          />
          <div style={{ padding: '0.75rem 1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {pdfs.map((pdf, idx) => (
              <div key={pdf._id} style={{
                display: 'flex', alignItems: 'center', gap: '1rem',
                padding: '0.85rem 1.1rem', borderRadius: 10,
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-subtle)',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.045)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: 'rgba(139,92,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem',
                }}>
                  📄
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: '0.875rem', fontWeight: 600,
                    color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {pdf.nomFichier}
                  </div>
                  <div style={{
                    fontSize: '0.72rem', color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)', marginTop: 2,
                  }}>
                    {(pdf.tailleFichier / 1024).toFixed(1)} KB
                    {pdf.createdAt && ` · ${new Date(pdf.createdAt).toLocaleDateString('fr-FR')}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <Btn size="sm" variant="secondary"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                    }}
                    onClick={() => pdfsAPI.download(pdf._id)}
                  >
                    ⬇ Télécharger
                  </Btn>
                  <Btn size="sm" color="#EF4444"
                    style={{ fontSize: '0.78rem' }}
                    onClick={() => handleDeletePdf(pdf._id)}
                  >
                    🗑
                  </Btn>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════
   VUE PRINCIPALE MODULE
══════════════════════════════════════════════════════════════════════════ */
function SubModuleManagement() {
  const { moduleId } = useParams()
  const navigate     = useNavigate()

  const [module,            setModule]           = useState(null)
  const [selectedSubModule, setSelectedSubModule] = useState(null)
  const [showAddSubModule,  setShowAddSubModule]  = useState(false)
  const [newSubModule,      setNewSubModule]      = useState({ titre: '', description: '' })
  const [creating,          setCreating]          = useState(false)
  const [loading,           setLoading]           = useState(true)
  const [error,             setError]             = useState('')
  const [activeTab,         setActiveTab]         = useState('chapitres') // 'chapitres' | 'etudiants'

  useEffect(() => { loadModule() }, [moduleId])

  const loadModule = async () => {
    try {
      setLoading(true); setError('')
      const data = await modulesAPI.getById(moduleId)
      setModule(data)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const handleAddSubModule = async () => {
    if (!newSubModule.titre.trim()) { alert('Le titre est requis'); return }
    try {
      setCreating(true)
      await modulesAPI.createSubModule(moduleId, newSubModule)
      setNewSubModule({ titre: '', description: '' })
      setShowAddSubModule(false)
      await loadModule()
    } catch (err) { setError(err.message) }
    finally { setCreating(false) }
  }

  const handleSubModuleClick = async (subModuleId) => {
    try {
      const data = await modulesAPI.getSubModule(subModuleId)
      setSelectedSubModule(data)
    } catch (err) { setError(err.message) }
  }

  /* ── Loading state ──────────────────────────────────────────────────── */
  if (loading) return (
    <div className="db-courses-section">
      {[1, 2, 3].map(i => (
        <div key={i} className="db-skeleton-card" style={{ height: 120, borderRadius: 'var(--radius-card)' }}>
          <div className="db-skeleton-top" />
          <div className="db-skeleton-body">
            <div className="db-skeleton db-skeleton-title" />
            <div className="db-skeleton db-skeleton-sub" />
          </div>
        </div>
      ))}
    </div>
  )

  if (error && !module) return (
    <div className="db-courses-section">
      <div className="db-error">
        <span className="db-error-badge">⚠️ Erreur</span>
        <p className="db-error-msg">{error}</p>
        <button className="db-retry-btn" onClick={loadModule}>↻ Réessayer</button>
      </div>
    </div>
  )

  /* ── Vue détail submodule ────────────────────────────────────────────── */
  if (selectedSubModule) return (
    <div className="db-courses-section">
      <SubModuleDetail
        moduleId={moduleId}
        subModule={selectedSubModule}
        onBack={() => setSelectedSubModule(null)}
      />
    </div>
  )

  /* ── Vue principale ──────────────────────────────────────────────────── */
  const subModules = module?.sub_modules || []

  return (
    <div className="db-courses-section">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)', padding: '0.45rem 1rem',
            borderRadius: 10, cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: '0.85rem', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          ← Retour
        </button>
        <span style={{ color: 'var(--border-medium)' }}>›</span>
        <div>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-sans)',
            fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)',
          }}>
            🗂 {module?.titre}
          </h2>
          {module?.description && (
            <p style={{
              margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)', marginTop: 2,
            }}>
              {module.description}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          marginLeft: 'auto', display: 'flex', gap: '0.35rem',
          background: 'rgba(255,255,255,0.04)', padding: '0.3rem',
          borderRadius: 10, border: '1px solid var(--border-subtle)',
        }}>
          {[
            { id: 'chapitres',  label: '📚 Chapitres',  count: subModules.length },
            { id: 'etudiants',  label: '👥 Étudiants' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.35rem 0.9rem', borderRadius: 8,
                fontSize: '0.8rem', fontWeight: 600,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
                border: 'none', transition: 'all 0.18s',
                background: activeTab === tab.id ? 'var(--accent-blue)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span style={{
                  marginLeft: '0.35rem', fontSize: '0.7rem',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                  padding: '0.1rem 0.45rem', borderRadius: 999,
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1.25rem', borderRadius: 10,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#FCA5A5', fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Tab : Chapitres ──────────────────────────────────────────────── */}
      {activeTab === 'chapitres' && (
        <>
          {/* Formulaire nouveau chapitre */}
          {showAddSubModule && (
            <Card accent="#3B82F6">
              <CardHeader icon="✦" title="Nouveau chapitre" />
              <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <Field label="Titre" icon="📌" placeholder="Ex: Introduction, Variables, Fonctions..."
                  value={newSubModule.titre}
                  onChange={e => setNewSubModule({ ...newSubModule, titre: e.target.value })} />
                <Field as="textarea" label="Description (optionnel)" icon="📝"
                  placeholder="Décrivez le contenu de ce chapitre..." rows={3}
                  value={newSubModule.description}
                  onChange={e => setNewSubModule({ ...newSubModule, description: e.target.value })} />
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <Btn onClick={handleAddSubModule} disabled={creating}>
                    {creating ? '⏳ Création...' : '✓ Créer le chapitre'}
                  </Btn>
                  <Btn variant="secondary"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border-medium)',
                      color: 'var(--text-secondary)',
                    }}
                    onClick={() => { setShowAddSubModule(false); setNewSubModule({ titre: '', description: '' }) }}
                  >
                    Annuler
                  </Btn>
                </div>
              </div>
            </Card>
          )}

          {/* Barre d'action */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border-subtle)', borderRadius: 10,
          }}>
            <span style={{
              fontSize: '0.78rem', color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
            }}>
              {subModules.length === 0
                ? 'Aucun chapitre — commencez par en créer un'
                : `${subModules.length} chapitre${subModules.length !== 1 ? 's' : ''} dans ce module`}
            </span>
            <Btn size="sm" onClick={() => setShowAddSubModule(v => !v)}>
              {showAddSubModule ? '✕ Annuler' : '+ Nouveau chapitre'}
            </Btn>
          </div>

          {/* Grille des chapitres */}
          {subModules.length === 0 ? (
            <div className="db-empty">
              <div className="db-empty-icon">📭</div>
              <h3 className="db-empty-title">Aucun chapitre créé</h3>
              <p className="db-empty-sub">
                Ajoutez des chapitres pour organiser les séances et le contenu de ce module.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '1rem',
            }}>
              {subModules.map((sm, idx) => {
                const p = PALETTE[idx % PALETTE.length]
                return (
                  <div
                    key={sm._id}
                    onClick={() => handleSubModuleClick(sm._id)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-card)',
                      overflow: 'hidden', cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-3px)'
                      e.currentTarget.style.boxShadow = `0 12px 32px ${p.glow}`
                      e.currentTarget.style.borderColor = `${p.accent}50`
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    }}
                  >
                    {/* Barre colorée */}
                    <div style={{ height: 3, background: p.accent }} />

                    <div style={{ padding: '1.25rem' }}>
                      {/* Row: numéro + titre */}
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                          background: p.glow, border: `1px solid ${p.accent}30`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.8rem', fontWeight: 800,
                          color: p.accent, fontFamily: 'var(--font-mono)',
                        }}>
                          {String(idx + 1).padStart(2, '0')}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{
                            margin: 0, fontSize: '0.95rem', fontWeight: 700,
                            color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
                            lineHeight: 1.3,
                          }}>
                            {sm.titre}
                          </h3>
                          {sm.description && (
                            <p style={{
                              margin: '0.35rem 0 0', fontSize: '0.78rem',
                              color: 'var(--text-muted)', fontFamily: 'var(--font-sans)',
                              lineHeight: 1.5,
                              display: '-webkit-box', WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                              {sm.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: '1rem', paddingTop: '0.85rem',
                        borderTop: '1px solid var(--border-subtle)',
                      }}>
                        <Badge color={p.accent}>Chapitre {idx + 1}</Badge>
                        <span style={{
                          fontSize: '0.78rem', color: p.accent, fontWeight: 600,
                          fontFamily: 'var(--font-sans)',
                        }}>
                          Ouvrir →
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Tab : Étudiants ──────────────────────────────────────────────── */}
      {activeTab === 'etudiants' && (
        <Card accent="#10B981">
          <CardHeader icon="👥" title="Gestion des étudiants" subtitle="Inscriptions au module" />
          <div style={{ padding: '1.25rem 1.5rem' }}>
            <StudentEnrollment moduleId={moduleId} />
          </div>
        </Card>
      )}

    </div>
  )
}

export default SubModuleManagement
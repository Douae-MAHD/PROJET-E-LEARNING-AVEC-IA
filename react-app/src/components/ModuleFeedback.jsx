import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { feedbackAPI } from '../services/api'
import './ModuleFeedback.css'

function ModuleFeedback() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState({ quizzes: [], exercises: [], statistics: null, globalSummary: null })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    if (!moduleId) {
      setError("Identifiant du module manquant dans l'URL.")
      setLoading(false)
      return
    }
    load()
  }, [moduleId])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const resp = await feedbackAPI.getModuleFeedback(moduleId)
      if (!resp) { setData({ quizzes: [], exercises: [], statistics: null, globalSummary: null }); return }

      // ✅ Support des deux formats : { quizzes, exercises } ou { data: { quizzes, exercises } }
      const payload = resp.data || resp
      setData({
        quizzes:       Array.isArray(payload.quizzes)   ? payload.quizzes   : [],
        exercises:     Array.isArray(payload.exercises) ? payload.exercises : [],
        statistics:    payload.statistics    || null,
        globalSummary: payload.globalSummary || null
      })
    } catch (err) {
      console.error('[ModuleFeedback] Erreur:', err)
      const msg = err?.response?.data?.error?.message
        || err?.response?.data?.message
        || err?.message
        || 'Erreur lors du chargement des feedbacks.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }))

  const truncate = (text, max = 130) => {
    if (!text || typeof text !== 'string') return null
    return text.length <= max ? text : text.substring(0, max).trim() + '…'
  }

  const getNoteColor = (note) => {
    const n = parseFloat(note)
    if (isNaN(n)) return '#94A3B8'
    if (n >= 14) return '#10B981'
    if (n >= 10) return '#3B82F6'
    return '#F97316'
  }

  const getSummaryAccent = (label) => {
    const map = { excellent: '#10B981', 'très bien': '#10B981', bien: '#3B82F6', passable: '#F59E0B', insuffisant: '#EF4444' }
    return map[label] || '#3B82F6'
  }

  // ─── RENDER ITEM (quiz ou exercice) ───────────────────────
  const renderItem = (item, typeLabel) => {
    if (!item) return null
    const key = `${typeLabel}-${item.id}`
    const isExpanded = !!expanded[key]
    const appreciationFull = item.correction_detail?.appreciation || item.appreciation || ''
    const displayAppreciation = isExpanded ? appreciationFull : truncate(appreciationFull)

    return (
      <div className="mf-row" key={key}>

        {/* ── Ligne principale ── */}
        <div className="mf-row-main">
          <div className="mf-title">
            <div className={`mf-tag mf-tag-${typeLabel === 'Quiz' ? 'quiz' : 'exo'}`}>
              {typeLabel === 'Quiz' ? '📝' : '✏️'} {typeLabel}
            </div>
            <div className="mf-name" title={item.titre}>{item.titre}</div>
          </div>

          <div className="mf-note">
            <span className="mf-note-label">Note</span>
            <span className="mf-note-value" style={{ color: getNoteColor(item.note) }}>
              {item.note !== null && item.note !== undefined ? `${item.note}/20` : '—'}
            </span>
            {item.scoreLabel && (
              <span className="mf-score-label" style={{ color: getNoteColor(item.note) }}>
                {item.scoreLabel}
              </span>
            )}
          </div>

          <div className="mf-appreciation">
            <span className="mf-app-label">Appréciation IA</span>
            <span className="mf-app-text">
              {displayAppreciation || <span className="mf-no-data">Non disponible</span>}
            </span>
          </div>

          <button className="mf-toggle-btn" onClick={() => toggle(key)}>
            {isExpanded ? '▲ Masquer' : '▼ Détails'}
          </button>
        </div>

        {/* ── Points forts / faibles ── */}
        <div className="mf-bullets">
          <div className="mf-bullet-col mf-bullet-green">
            <div className="mf-subtitle">✅ Points forts</div>
            <ul>
              {item.points_forts?.length > 0
                ? item.points_forts.map((p, i) => <li key={i}>{p}</li>)
                : <li className="mf-no-data">Non renseigné</li>
              }
            </ul>
          </div>
          <div className="mf-bullet-col mf-bullet-red">
            <div className="mf-subtitle">⚠️ Points à améliorer</div>
            <ul>
              {item.points_faibles?.length > 0
                ? item.points_faibles.map((p, i) => <li key={i}>{p}</li>)
                : <li className="mf-no-data">Non renseigné</li>
              }
            </ul>
          </div>
        </div>

        {/* ── Détails expandables ── */}
        {isExpanded && (
          <div className="mf-details">

            {/* Recommandations IA (quiz seulement) */}
            {item.recommendations?.length > 0 && (
              <>
                <div className="mf-subtitle">💡 Recommandations</div>
                <ul className="mf-reco-list">
                  {item.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </>
            )}

            {/* Détail par question (quiz) */}
            {item.corrections?.length > 0 && (
              <>
                <div className="mf-subtitle">📋 Détail par question</div>
                <div className="mf-corrections">
                  {item.corrections.map((c, idx) => (
                    <div key={idx} className={`mf-correction ${c.correct ? 'ok' : 'ko'}`}>
                      <div className="mf-correction-title">
                        {c.correct ? '✓' : '✗'} Question {(c.questionIndex ?? idx) + 1}
                        {c.question && <span className="mf-correction-q"> — {c.question}</span>}
                      </div>
                      <div className="mf-correction-text">{c.commentaire}</div>
                    </div>
                  ))}
                </div>
                {item.totalQuestions > 0 && (
                  <div className="mf-score-recap">
                    Score : {item.correctAnswers}/{item.totalQuestions} bonnes réponses
                  </div>
                )}
              </>
            )}

            {/* Correction complète (exercice) */}
            {item.correction_detail && (
              <>
                {item.correction_detail.appreciation && (
                  <>
                    <div className="mf-subtitle">💬 Appréciation complète</div>
                    <div className="mf-full-appreciation">{item.correction_detail.appreciation}</div>
                  </>
                )}
                {item.correction_detail.correction && (
                  <>
                    <div className="mf-subtitle" style={{ marginTop: '0.75rem' }}>📄 Correction détaillée</div>
                    <div className="mf-full-correction">{item.correction_detail.correction}</div>
                  </>
                )}
              </>
            )}

            {/* Aucun détail */}
            {!item.corrections?.length && !item.correction_detail && !item.recommendations?.length && (
              <p className="mf-no-data" style={{ textAlign: 'center', padding: '0.75rem 0' }}>
                Aucun détail disponible pour cette évaluation.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── RENDER GLOBAL SUMMARY ────────────────────────────────
  const renderGlobalSummary = () => {
    const s = data.globalSummary
    if (!s) return null
    const accent = getSummaryAccent(s.scoreLabel)

    return (
      <div className="mf-global-summary">
        <div className="mf-gs-header">
          <span className="mf-gs-icon">🤖</span>
          <div>
            <div className="mf-gs-title">Bilan Global du Module</div>
            <div className="mf-gs-sub">Synthèse de toutes vos évaluations</div>
          </div>
        </div>

        {/* KPIs */}
        <div className="mf-gs-kpis">
          <div className="mf-gs-kpi">
            <span className="mf-gs-kpi-val" style={{ color: accent }}>
              {s.moyenneGlobale}/20
            </span>
            <span className="mf-gs-kpi-label">Moyenne globale</span>
          </div>
          <div className="mf-gs-kpi">
            <span className="mf-gs-kpi-val" style={{ color: s.tauxReussite >= 50 ? '#10B981' : '#F97316' }}>
              {s.tauxReussite}%
            </span>
            <span className="mf-gs-kpi-label">Taux de réussite</span>
          </div>
          <div className="mf-gs-kpi">
            <span className="mf-gs-kpi-val">{s.totalQuiz}</span>
            <span className="mf-gs-kpi-label">Quiz</span>
          </div>
          <div className="mf-gs-kpi">
            <span className="mf-gs-kpi-val">{s.totalExercices}</span>
            <span className="mf-gs-kpi-label">Exercices</span>
          </div>
        </div>

        {/* Message d'encouragement */}
        {s.message && (
          <div className="mf-gs-message" style={{ borderLeftColor: accent }}>
            {s.message}
          </div>
        )}

        {/* Points forts / faibles globaux */}
        {(s.points_forts?.length > 0 || s.points_faibles?.length > 0) && (
          <div className="mf-gs-bullets">
            {s.points_forts?.length > 0 && (
              <div className="mf-gs-bullet-col">
                <div className="mf-subtitle">✅ Vos points forts</div>
                <ul>
                  {s.points_forts.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
            {s.points_faibles?.length > 0 && (
              <div className="mf-gs-bullet-col">
                <div className="mf-subtitle">📌 À travailler</div>
                <ul>
                  {s.points_faibles.map((p, i) => <li key={i}>{p}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // ─── RENDER PRINCIPAL ─────────────────────────────────────
  return (
    <div className="module-feedback-page">

      {/* Header */}
      <div className="mf-header">
        <button className="mf-back-btn" onClick={() => navigate(-1)}>← Retour</button>
        <div className="mf-header-text">
          <h1>💬 Feedback du module</h1>
          <p className="mf-header-sub">Retrouvez vos résultats et analyses IA pour ce module</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="mf-loading-state">
          <div className="mf-loader-ring"></div>
          <p>Chargement des feedbacks<span className="mf-dots"></span></p>
        </div>
      )}

      {/* Erreur */}
      {!loading && error && (
        <div className="mf-error-state">
          <div className="mf-error-icon">⚠️</div>
          <div className="mf-error-content">
            <strong>Erreur de chargement</strong>
            <p>{error}</p>
            <p className="mf-error-hint">
              Endpoint attendu : <code>GET /api/feedback/module/{moduleId}/student</code>
            </p>
          </div>
          <button className="mf-retry-btn" onClick={load}>🔄 Réessayer</button>
        </div>
      )}

      {/* Contenu */}
      {!loading && !error && (
        <div className="mf-grid">

          {/* ── Bilan global ── */}
          {renderGlobalSummary()}

          {/* ── Statistiques rapides ── */}
          {data.statistics && (
            <div className="mf-stats-row">
              {data.statistics.averageQuizScore !== null && (
                <div className="mf-stat-chip">
                  <span className="mf-stat-chip-val" style={{ color: getNoteColor(data.statistics.averageQuizScore) }}>
                    {data.statistics.averageQuizScore}/20
                  </span>
                  <span className="mf-stat-chip-label">Moy. Quiz</span>
                </div>
              )}
              {data.statistics.averageExerciseScore !== null && (
                <div className="mf-stat-chip">
                  <span className="mf-stat-chip-val" style={{ color: getNoteColor(data.statistics.averageExerciseScore) }}>
                    {data.statistics.averageExerciseScore}/20
                  </span>
                  <span className="mf-stat-chip-label">Moy. Exercices</span>
                </div>
              )}
              <div className="mf-stat-chip">
                <span className="mf-stat-chip-val">{data.quizzes.length + data.exercises.length}</span>
                <span className="mf-stat-chip-label">Total évaluations</span>
              </div>
            </div>
          )}

          {/* ── Carte Quiz ── */}
          <div className="mf-card mf-card-quiz">
            <div className="mf-card-header">
              <span className="mf-card-icon">📝</span>
              <div>
                <h2>Quiz du module</h2>
                <span className="mf-card-count">
                  {data.quizzes.length} évaluation{data.quizzes.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="mf-card-body">
              {data.quizzes.length > 0
                ? data.quizzes.map(q => renderItem(q, 'Quiz'))
                : (
                  <div className="mf-empty-state">
                    <div className="mf-empty-icon">📭</div>
                    <p>Aucun quiz complété pour ce module.</p>
                    <p className="mf-empty-sub">
                      Générez et soumettez un quiz depuis la vue module pour voir vos résultats ici.
                    </p>
                  </div>
                )
              }
            </div>
          </div>

          {/* ── Carte Exercices ── */}
          <div className="mf-card mf-card-exo">
            <div className="mf-card-header">
              <span className="mf-card-icon">✏️</span>
              <div>
                <h2>Exercices du module</h2>
                <span className="mf-card-count">
                  {data.exercises.length} évaluation{data.exercises.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
            <div className="mf-card-body">
              {data.exercises.length > 0
                ? data.exercises.map(e => renderItem(e, 'Exercice'))
                : (
                  <div className="mf-empty-state">
                    <div className="mf-empty-icon">📭</div>
                    <p>Aucun exercice complété pour ce module.</p>
                    <p className="mf-empty-sub">
                      Soumettez un exercice depuis la vue module pour voir vos résultats ici.
                    </p>
                  </div>
                )
              }
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default ModuleFeedback
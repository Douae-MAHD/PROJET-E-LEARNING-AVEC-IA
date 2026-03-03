import { useState, useEffect } from 'react'
import { feedbackAPI } from '../services/api'
import './FeedbacksViewSection.css'

function FeedbacksViewSection() {
  const [results, setResults] = useState({ quiz: [], exercises: [] })
  const [globalFeedback, setGlobalFeedback] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showStudents, setShowStudents] = useState(false)

  useEffect(() => {
    loadResults()
    loadGlobalFeedback()
  }, [])

  const loadResults = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await feedbackAPI.getTeacherResults()
      const normalizeNote = (it) => {
        if (!it) return it
        const note = it.note ?? it.note_quiz ?? it.note_exercice ?? it.note_exercises ?? it.score
        const points_forts = it.points_forts ?? it.points_forts_globaux ?? it.forces ?? it.strengths
        const points_faibles = it.points_faibles ?? it.points_faibles_globaux ?? it.points_faibles_exo ?? it.points_amelioration ?? it.weaknesses
        return { ...it, note, points_forts, points_faibles }
      }
      const quizSources = data?.quiz || data?.quizzes || data?.quizz || []
      const exerciseSources = data?.exercises || data?.exercices || data?.exercice || []
      setResults({
        quiz: Array.isArray(quizSources) ? quizSources.map(normalizeNote) : [],
        exercises: Array.isArray(exerciseSources) ? exerciseSources.map(normalizeNote) : []
      })
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des résultats')
    } finally {
      setLoading(false)
    }
  }

  const loadGlobalFeedback = async () => {
    try {
      const data = await feedbackAPI.getGlobalFeedback()
      if (data.feedback) setGlobalFeedback(data.feedback)
    } catch (err) {
      console.error('Erreur feedback global:', err)
    }
  }

  const handleGenerateGlobalFeedback = async () => {
    try {
      setGenerating(true)
      setError('')
      const data = await feedbackAPI.generateGlobalFeedback()
      setGlobalFeedback(data.feedback)
      await loadResults()
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération du feedback global')
    } finally {
      setGenerating(false)
    }
  }

  const totalQuiz = results.quiz.length
  const totalExercises = results.exercises.length
  const avgQuizScore = totalQuiz > 0
    ? (results.quiz.reduce((s, q) => s + (parseFloat(q.note) || 0), 0) / totalQuiz).toFixed(1)
    : '—'
  const avgExerciseScore = totalExercises > 0
    ? (results.exercises.reduce((s, e) => s + (parseFloat(e.note) || 0), 0) / totalExercises).toFixed(1)
    : '—'

  const getScoreColor = (val) => {
    const n = parseFloat(val)
    if (isNaN(n)) return ''
    if (n >= 14) return 'fv-score-green'
    if (n >= 10) return 'fv-score-blue'
    return 'fv-score-orange'
  }

  return (
    <div className="fv-wrap">

      {/* ── Header ── */}
      <div className="fv-header">
        <div className="fv-header-left">
          <div className="fv-header-icon">📊</div>
          <div>
            <h2 className="fv-title">Résultats des Étudiants</h2>
            <p className="fv-subtitle">Vue d'ensemble des performances de la classe</p>
          </div>
        </div>
        <div className="fv-header-actions">
          <button
            className="fv-btn fv-btn-ghost"
            onClick={loadResults}
            disabled={loading}
          >
            {loading ? <span className="fv-spinner"></span> : '🔄'} Actualiser
          </button>
          <button
            className={`fv-btn fv-btn-gold ${generating ? 'fv-btn-loading' : ''}`}
            onClick={handleGenerateGlobalFeedback}
            disabled={generating}
          >
            {generating
              ? <><span className="fv-spinner fv-spinner-dark"></span> Génération...</>
              : '🤖 Feedback Global IA'}
          </button>
        </div>
      </div>

      {error && (
        <div className="fv-error-banner">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* ── Generating Overlay ── */}
      {generating && (
        <div className="fv-generating-bar">
          <div className="fv-generating-fill"></div>
        </div>
      )}

      {/* ── Stats Grid ── */}
      {loading ? (
        <div className="fv-loading">
          <div className="fv-loader-ring"></div>
          <p>Chargement des données<span className="fv-dots"></span></p>
        </div>
      ) : (
        <>
          <div className="fv-stats-grid">
            <div className="fv-stat-card fv-stat-blue">
              <div className="fv-stat-icon">📝</div>
              <div className="fv-stat-value fv-font-mono">{totalQuiz}</div>
              <div className="fv-stat-label">Quiz complétés</div>
            </div>
            <div className="fv-stat-card fv-stat-violet">
              <div className="fv-stat-icon">📊</div>
              <div className={`fv-stat-value fv-font-mono ${getScoreColor(avgQuizScore)}`}>{avgQuizScore}</div>
              <div className="fv-stat-label">Moyenne Quiz /20</div>
            </div>
            <div className="fv-stat-card fv-stat-green">
              <div className="fv-stat-icon">✏️</div>
              <div className="fv-stat-value fv-font-mono">{totalExercises}</div>
              <div className="fv-stat-label">Exercices complétés</div>
            </div>
            <div className="fv-stat-card fv-stat-gold">
              <div className="fv-stat-icon">⭐</div>
              <div className={`fv-stat-value fv-font-mono ${getScoreColor(avgExerciseScore)}`}>{avgExerciseScore}</div>
              <div className="fv-stat-label">Moyenne Exercices /20</div>
            </div>
          </div>

          {/* ── Global Feedback ── */}
          {globalFeedback ? (
            <div className="fv-global-section">
              <div className="fv-section-label">
                <span className="fv-section-dot fv-dot-gold"></span>
                Feedback Global IA
              </div>

              {/* Stats from feedback */}
              {globalFeedback.statistiques && (
                <div className="fv-inline-stats">
                  {typeof globalFeedback.statistiques.moyenne_generale !== 'undefined' && (
                    <div className="fv-inline-stat">
                      <span className="fv-inline-stat-val fv-font-mono">
                        {globalFeedback.statistiques.moyenne_generale}
                      </span>
                      <span className="fv-inline-stat-label">Moyenne générale</span>
                    </div>
                  )}
                  {typeof globalFeedback.statistiques.taux_reussite !== 'undefined' && (
                    <div className="fv-inline-stat">
                      <span className="fv-inline-stat-val fv-font-mono">
                        {globalFeedback.statistiques.taux_reussite}%
                      </span>
                      <span className="fv-inline-stat-label">Taux de réussite</span>
                    </div>
                  )}
                </div>
              )}

              {/* Feedback blocks */}
              <div className="fv-feedback-grid">
                {globalFeedback.points_assimiles && globalFeedback.points_assimiles.length > 0 && (
                  <div className="fv-feedback-block fv-fb-green">
                    <div className="fv-fb-icon">✓</div>
                    <h4>Points bien assimilés</h4>
                    <ul>
                      {globalFeedback.points_assimiles.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {globalFeedback.points_faibles_globaux && globalFeedback.points_faibles_globaux.length > 0 && (
                  <div className="fv-feedback-block fv-fb-red">
                    <div className="fv-fb-icon">↓</div>
                    <h4>Points faibles globaux</h4>
                    <ul>
                      {globalFeedback.points_faibles_globaux.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {globalFeedback.erreurs_recurrentes && globalFeedback.erreurs_recurrentes.length > 0 && (
                  <div className="fv-feedback-block fv-fb-orange">
                    <div className="fv-fb-icon">⚠</div>
                    <h4>Erreurs récurrentes</h4>
                    <ul>
                      {globalFeedback.erreurs_recurrentes.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Per-student detail */}
              {globalFeedback.eleves && (
                <div className="fv-students-section">
                  <div className="fv-students-header">
                    <div className="fv-section-label" style={{ margin: 0 }}>
                      <span className="fv-section-dot fv-dot-blue"></span>
                      Détail par étudiant
                    </div>
                    <button
                      className="fv-btn fv-btn-ghost fv-btn-sm"
                      onClick={() => setShowStudents(v => !v)}
                    >
                      {showStudents ? 'Masquer' : 'Voir les détails'}
                    </button>
                  </div>

                  {showStudents && (
                    <div className="fv-students-wrap">
                      {/* Quiz table */}
                      <div className="fv-table-label">Quiz</div>
                      <div className="fv-table">
                        <div className="fv-table-head">
                          <span>Étudiant</span>
                          <span>Note</span>
                          <span>Points forts</span>
                          <span>Points faibles</span>
                        </div>
                        {globalFeedback.eleves.map((e, idx) =>
                          e.quizz ? (
                            <div key={`${idx}-q`} className="fv-table-row">
                              <span className="fv-table-name">{e.nom}</span>
                              <span className={`fv-table-score fv-font-mono ${getScoreColor(e.quizz.note)}`}>
                                {e.quizz.note ?? '—'}/20
                              </span>
                              <span className="fv-table-cell">
                                {(e.quizz.points_forts || []).map((p, i) => (
                                  <span key={i} className="fv-tag fv-tag-green">{p}</span>
                                ))}
                              </span>
                              <span className="fv-table-cell">
                                {(e.quizz.points_faibles || []).map((p, i) => (
                                  <span key={i} className="fv-tag fv-tag-red">{p}</span>
                                ))}
                              </span>
                            </div>
                          ) : null
                        )}
                      </div>

                      {/* Exercises table */}
                      <div className="fv-table-label" style={{ marginTop: '1.5rem' }}>Exercices</div>
                      <div className="fv-table">
                        <div className="fv-table-head">
                          <span>Étudiant</span>
                          <span>Note</span>
                          <span>Points forts</span>
                          <span>Points faibles</span>
                        </div>
                        {globalFeedback.eleves.map((e, idx) =>
                          e.exercices ? (
                            <div key={`${idx}-e`} className="fv-table-row">
                              <span className="fv-table-name">{e.nom}</span>
                              <span className={`fv-table-score fv-font-mono ${getScoreColor(e.exercices.note)}`}>
                                {e.exercices.note ?? '—'}/20
                              </span>
                              <span className="fv-table-cell">
                                {(e.exercices.points_forts || []).map((p, i) => (
                                  <span key={i} className="fv-tag fv-tag-green">{p}</span>
                                ))}
                              </span>
                              <span className="fv-table-cell">
                                {(e.exercices.points_faibles || []).map((p, i) => (
                                  <span key={i} className="fv-tag fv-tag-red">{p}</span>
                                ))}
                              </span>
                            </div>
                          ) : null
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="fv-empty-feedback">
              <div className="fv-empty-icon">🤖</div>
              <p>Aucun feedback global généré pour le moment.</p>
              <p className="fv-empty-sub">Cliquez sur "Feedback Global IA" pour analyser les résultats de la classe.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default FeedbacksViewSection
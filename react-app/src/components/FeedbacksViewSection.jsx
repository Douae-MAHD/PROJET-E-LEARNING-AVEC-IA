import { useState, useEffect } from 'react'
import { feedbackAPI } from '../services/api'
import './Card.css'

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
      setResults(data)
    } catch (err) {
      console.error('Erreur lors du chargement des résultats:', err)
      setError(err.message || 'Erreur lors du chargement des résultats')
    } finally {
      setLoading(false)
    }
  }

  const loadGlobalFeedback = async () => {
    try {
      setError('')
      const data = await feedbackAPI.getGlobalFeedback()
      if (data.feedback) setGlobalFeedback(data.feedback)
    } catch (err) {
      console.error('Erreur lors du chargement du feedback global:', err)
      setError(err.message || 'Erreur lors du chargement du feedback global')
    }
  }

  const handleGenerateGlobalFeedback = async () => {
    try {
      setGenerating(true)
      setError('')
      const data = await feedbackAPI.generateGlobalFeedback()
      setGlobalFeedback(data.feedback)
      // Rafraîchir les résultats pour mettre à jour les statistiques
      await loadResults()
      alert('Feedback global généré avec succès!')
    } catch (err) {
      setError(err.message || 'Erreur lors de la génération du feedback global')
      alert('Erreur: ' + (err.message || 'Feedback global'))
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return (
    <section className="dashboard-card feedbacks-section">
      <div className="card-header">
        <h2>📊 Résultats des Étudiants</h2>
      </div>
      <div className="card-content">
        <p>Chargement...</p>
      </div>
    </section>
  )

  const totalQuiz = results.quiz.length
  const totalExercises = results.exercises.length
  const avgQuizScore = totalQuiz > 0 
    ? (results.quiz.reduce((sum, q) => sum + (parseFloat(q.note) || 0), 0) / totalQuiz).toFixed(2)
    : 0
  const avgExerciseScore = totalExercises > 0
    ? (results.exercises.reduce((sum, e) => sum + (parseFloat(e.note) || 0), 0) / totalExercises).toFixed(2)
    : 0

  return (
    <section className="dashboard-card feedbacks-section">
      <div className="card-header">
        <h2>📊 Résultats des Étudiants</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary btn-small" 
            onClick={loadResults}
            disabled={loading}
          >
            🔄 Actualiser
          </button>
          <button 
            className="btn btn-primary btn-small" 
            onClick={handleGenerateGlobalFeedback}
            disabled={generating}
          >
            {generating ? 'Génération...' : 'Générer Feedback Global'}
          </button>
        </div>
      </div>
      <div className="card-content">
        {error && <p className="error">{error}</p>}
        <div className="feedbacks-stats">
          <div className="stat-item">
            <span className="stat-number">{totalQuiz}</span>
            <span className="stat-label">Quiz complétés</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{avgQuizScore}</span>
            <span className="stat-label">Moyenne Quiz (/20)</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{totalExercises}</span>
            <span className="stat-label">Exercices complétés</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{avgExerciseScore}</span>
            <span className="stat-label">Moyenne Exercices (/20)</span>
          </div>
        </div>

        {globalFeedback && (
          <div className="global-feedback expanded">
            <h3>Feedback Global</h3>
            {globalFeedback.points_faibles_globaux && (
              <div className="feedback-section">
                <h4>Points faibles globaux</h4>
                <ul>
                  {globalFeedback.points_faibles_globaux.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {globalFeedback.erreurs_recurrentes && (
              <div className="feedback-section">
                <h4>Erreurs récurrentes</h4>
                <ul>
                  {globalFeedback.erreurs_recurrentes.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {globalFeedback.points_assimiles && (
              <div className="feedback-section">
                <h4>Points bien assimilés</h4>
                <ul>
                  {globalFeedback.points_assimiles.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {globalFeedback.statistiques && (
              <div className="feedback-section">
                <h4>Statistiques</h4>
                <ul>
                  {typeof globalFeedback.statistiques.moyenne_generale !== 'undefined' && (
                    <li>Moyenne générale : {globalFeedback.statistiques.moyenne_generale}</li>
                  )}
                  {typeof globalFeedback.statistiques.taux_reussite !== 'undefined' && (
                    <li>Taux de réussite : {globalFeedback.statistiques.taux_reussite}%</li>
                  )}
                </ul>
              </div>
            )}

            {globalFeedback.eleves && (
              <div className="feedback-section">
                <div className="feedback-section-header">
                  <h4>Détail par élève (quiz et exercices)</h4>
                  <button className="btn btn-secondary btn-small" onClick={() => setShowStudents(v => !v)}>
                    {showStudents ? 'Masquer les détails' : 'Voir détails'}
                  </button>
                </div>
                {showStudents && (
                  <div className="students-tables-stack">
                    <div className="students-table">
                      <div className="students-header">
                        <span>Élève</span>
                        <span>Note (Quiz)</span>
                        <span>Forces</span>
                        <span>Faiblesses</span>
                      </div>
                      {globalFeedback.eleves.map((e, idx) => (
                        e.quizz ? (
                          <div key={`${idx}-quiz`} className="students-row">
                            <span>{e.nom}</span>
                            <span className="score">{e.quizz.note ?? '—'}/20</span>
                            <span className="mini-col">
                              <ul>
                                {(e.quizz.points_forts || []).map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </span>
                            <span className="mini-col">
                              <ul>
                                {(e.quizz.points_faibles || []).map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </span>
                          </div>
                        ) : null
                      ))}
                    </div>

                    <div className="students-table">
                      <div className="students-header">
                        <span>Élève</span>
                        <span>Note (Exercice)</span>
                        <span>Forces</span>
                        <span>Faiblesses</span>
                      </div>
                      {globalFeedback.eleves.map((e, idx) => (
                        e.exercices ? (
                          <div key={`${idx}-exo`} className="students-row">
                            <span>{e.nom}</span>
                            <span className="score">{e.exercices.note ?? '—'}/20</span>
                            <span className="mini-col">
                              <ul>
                                {(e.exercices.points_forts || []).map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </span>
                            <span className="mini-col">
                              <ul>
                                {(e.exercices.points_faibles || []).map((p, i) => <li key={i}>{p}</li>)}
                              </ul>
                            </span>
                          </div>
                        ) : null
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </section>
  )
}

export default FeedbacksViewSection




import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { exercisesAPI } from '../services/api'
import './ExerciseView.css'

function ExerciseView() {
  const { exerciseId } = useParams()
  const navigate = useNavigate()
  const [exercise, setExercise] = useState(null)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    loadExercise()
  }, [exerciseId])

  const loadExercise = async () => {
    try {
      setLoading(true)
      const data = await exercisesAPI.getById(exerciseId)
      setExercise(data)

      const studentResponse = data.reponse_etudiante || data.reponseEtudiante || data.reponse || ''
      const correctionObj = data.correction_ia || data.correction_detail || null

      if (studentResponse) {
        setAnswer(studentResponse)
        setSubmitted(true)
      }

      if (correctionObj && typeof correctionObj === 'object') {
        setResult({
          note: correctionObj.note || data.note || null,
          correction: correctionObj.correction || correctionObj.commentaire || '',
          appreciation: correctionObj.appreciation || data.feedback || data.appreciation || '',
          points_forts: correctionObj.points_forts || data.points_forts || [],
          points_amelioration: correctionObj.points_amelioration || data.points_amelioration || []
        })
      } else if (data.correction && typeof data.correction === 'string') {
        setResult({
          note: data.note || null,
          correction: data.correction || '',
          appreciation: data.feedback || data.appreciation || '',
          points_forts: data.points_forts || [],
          points_amelioration: data.points_amelioration || []
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!answer.trim()) {
      alert('Veuillez fournir une réponse')
      return
    }
    setShowConfirmModal(false)

    try {
      setSubmitting(true)
      setError('')
      const data = await exercisesAPI.submit(exerciseId, answer)

      if (data.correction && typeof data.correction === 'object') {
        const c = data.correction
        setResult({
          note: data.note || c.note || null,
          correction: c.correction || c.commentaire || '',
          appreciation: c.appreciation || data.feedback || '',
          points_forts: c.points_forts || data.points_forts || [],
          points_amelioration: c.points_amelioration || data.points_amelioration || []
        })
      } else {
        setResult({
          note: data.note || null,
          correction: data.correction || data.correction_ia || '',
          appreciation: data.feedback || data.appreciation || '',
          points_forts: data.points_forts || [],
          points_amelioration: data.points_amelioration || []
        })
      }
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const getScoreInfo = (note) => {
    if (note === null || note === undefined) return null
    const pct = (note / 20) * 100
    if (pct >= 80) return { msg: 'Excellent travail ! 🎓', cls: 'ev-result-excellent' }
    if (pct >= 60) return { msg: 'Bien joué ! 📚 Continuez ainsi', cls: 'ev-result-good' }
    return { msg: 'Courage ! 💪 Revoyez ce sujet', cls: 'ev-result-low' }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="ev-loading-screen">
        <div className="ev-loader-ring"></div>
        <p>Chargement de l'exercice<span className="ev-dots"></span></p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="ev-error-screen">
        <div className="ev-error-icon">⚠️</div>
        <p>{error}</p>
        <button className="ev-btn ev-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="ev-error-screen">
        <p>Exercice non trouvé</p>
        <button className="ev-btn ev-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
      </div>
    )
  }

  const scoreInfo = result ? getScoreInfo(result.note) : null
  const charCount = answer.length

  return (
    <div className="ev-wrap">

      {/* ── Confirm Modal ── */}
      {showConfirmModal && (
        <div className="ev-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="ev-modal" onClick={e => e.stopPropagation()}>
            <div className="ev-modal-icon">✏️</div>
            <h3>Soumettre votre réponse ?</h3>
            <p>L'IA va corriger votre travail. Cette action est irréversible.</p>
            <div className="ev-modal-actions">
              <button className="ev-btn ev-btn-secondary" onClick={() => setShowConfirmModal(false)}>
                Annuler
              </button>
              <button className="ev-btn ev-btn-gold" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <span className="ev-spinner"></span> : '✓ Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Correction Overlay ── */}
      {submitting && (
        <div className="ev-correcting-overlay">
          <div className="ev-correcting-box">
            <div className="ev-correcting-ring"></div>
            <p>🤖 L'IA corrige votre réponse<span className="ev-dots"></span></p>
            <div className="ev-correcting-bar"></div>
          </div>
        </div>
      )}

      <div className="ev-container">

        {/* ── Header ── */}
        <div className="ev-header">
          <button className="ev-back-btn" onClick={() => navigate(-1)}>
            ← Retour
          </button>
          <div className="ev-header-title">
            <h1>Exercice</h1>
            <span className="ev-ai-badge">Corrigé par IA 🤖</span>
          </div>
          {submitted && result && result.note !== null && (
            <div className="ev-header-score">
              <span className="ev-header-note">{result.note}/20</span>
              <span className="ev-header-note-label">Note finale</span>
            </div>
          )}
        </div>

        {/* ── Énoncé ── */}
        <div className="ev-enonce-card">
          <div className="ev-enonce-label">
            <span className="ev-enonce-icon">📋</span>
            Énoncé
          </div>
          <p className="ev-enonce-text">{exercise.enonce}</p>
        </div>

        {/* ── Answer Section ── */}
        <div className="ev-answer-section">
          <div className="ev-answer-header">
            <h2>Votre réponse</h2>
            {!submitted && (
              <span className="ev-char-count">{charCount} caractère{charCount !== 1 ? 's' : ''}</span>
            )}
            {submitted && (
              <span className="ev-submitted-badge">✓ Soumis</span>
            )}
          </div>
          <textarea
            value={answer}
            onChange={(e) => !submitted && setAnswer(e.target.value)}
            placeholder="Développez votre réponse ici. Soyez précis et structuré..."
            className={`ev-textarea ${submitted ? 'ev-textarea-readonly' : ''}`}
            rows={10}
            disabled={submitted}
          />
        </div>

        {/* ── Submit Button ── */}
        {!submitted && (
          <div className="ev-submit-zone">
            <div className="ev-submit-hint">
              {!answer.trim()
                ? '⚠️ Votre réponse est vide'
                : '✓ Réponse prête à être soumise'}
            </div>
            <button
              className="ev-btn ev-btn-gold ev-btn-submit"
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting || !answer.trim()}
            >
              {submitting
                ? <><span className="ev-spinner"></span> Correction en cours...</>
                : '🎓 Soumettre pour correction'}
            </button>
          </div>
        )}

        {/* ── Result & Feedback ── */}
        {submitted && result && (
          <div className="ev-result-section">

            {/* Score Card */}
            {result.note !== null && scoreInfo && (
              <div className="ev-score-card">
                <div className="ev-score-display">
                  <span className="ev-score-value">{result.note}</span>
                  <span className="ev-score-total">/20</span>
                </div>
                <div className="ev-score-right">
                  <div className={`ev-score-msg ${scoreInfo.cls}`}>{scoreInfo.msg}</div>
                  {result.appreciation && (
                    <p className="ev-appreciation">{result.appreciation}</p>
                  )}
                </div>
              </div>
            )}

            {/* Correction */}
            {result.correction && (
              <div className="ev-correction-card">
                <div className="ev-correction-label">
                  <span>📝</span> Correction détaillée
                </div>
                <p className="ev-correction-text">{result.correction}</p>
              </div>
            )}

            {/* Points Grid */}
            {((result.points_forts && result.points_forts.length > 0) ||
              (result.points_amelioration && result.points_amelioration.length > 0)) && (
              <div className="ev-points-grid">
                {result.points_forts && result.points_forts.length > 0 && (
                  <div className="ev-points-block ev-points-forts">
                    <div className="ev-points-icon">✓</div>
                    <h4>Points forts</h4>
                    <ul>
                      {result.points_forts.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.points_amelioration && result.points_amelioration.length > 0 && (
                  <div className="ev-points-block ev-points-amelio">
                    <div className="ev-points-icon">↑</div>
                    <h4>Points à améliorer</h4>
                    <ul>
                      {result.points_amelioration.map((point, i) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Footer ── */}
        <div className="ev-footer-actions">
          <button className="ev-btn ev-btn-secondary" onClick={() => navigate(-1)}>
            ← Retour aux modules
          </button>
        </div>

      </div>
    </div>
  )
}

export default ExerciseView
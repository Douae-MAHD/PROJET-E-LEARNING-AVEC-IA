import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { feedbackAPI } from '../services/api'
import './ModuleFeedback.css'

function ModuleFeedback() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState({ quizzes: [], exercises: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState({})

  useEffect(() => {
    load()
  }, [moduleId])

  const load = async () => {
    try {
      setLoading(true)
      setError('')
      const resp = await feedbackAPI.getModuleFeedback(moduleId)
      setData(resp)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des feedbacks')
    } finally {
      setLoading(false)
    }
  }

  const toggle = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const truncateText = (text, maxLength = 150) => {
    if (!text || text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  const renderItem = (item, typeLabel) => {
    const isExpanded = expanded[`${typeLabel}-${item.id}`]
    // Pour les exercices, utiliser l'appréciation de correction_detail si disponible
    const appreciationText = item.correction_detail?.appreciation || item.appreciation || ''
    const displayAppreciation = isExpanded ? appreciationText : truncateText(appreciationText)
    
    return (
    <div className="mf-row" key={`${typeLabel}-${item.id}`}>
      <div className="mf-row-main">
        <div className="mf-title">
          <div className="mf-tag">{typeLabel}</div>
          <div className="mf-name">{item.titre}</div>
        </div>
        <div className="mf-note">
          <span className="mf-note-label">Note</span>
          <span className="mf-note-value">{item.note ?? '—'}/20</span>
        </div>
        <div className="mf-appreciation">
          <span className="mf-app-label">Appréciation</span>
          <span className="mf-app-text">{displayAppreciation}</span>
        </div>
        <button className="btn btn-secondary mf-btn" onClick={() => toggle(`${typeLabel}-${item.id}`)}>
          {isExpanded ? 'Masquer les détails' : 'Voir détails'}
        </button>
      </div>

      <div className="mf-bullets">
        <div>
          <div className="mf-subtitle">Points forts</div>
          <ul>
            {(item.points_forts || ['—']).map((p, idx) => (
              <li key={`pf-${idx}`}>- {p}</li>
            ))}
          </ul>
        </div>
        <div>
          <div className="mf-subtitle">Points faibles</div>
          <ul>
            {(item.points_faibles || ['—']).map((p, idx) => (
              <li key={`pfa-${idx}`}>- {p}</li>
            ))}
          </ul>
        </div>
      </div>

      {isExpanded && (
        <div className="mf-details">
          {item.corrections && (
            <>
              <div className="mf-subtitle">Détails par question</div>
              <div className="mf-corrections">
                {item.corrections.map((c, idx) => (
                  <div key={idx} className={`mf-correction ${c.correct ? 'ok' : 'ko'}`}>
                    <div className="mf-correction-title">Question {c.questionIndex + 1}</div>
                    <div className="mf-correction-text">{c.commentaire}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {item.correction_detail && (
            <>
              <div className="mf-subtitle">Appréciation complète</div>
              <div className="mf-full-appreciation">
                {item.correction_detail.appreciation || item.appreciation || 'Aucune appréciation disponible.'}
              </div>
              {item.correction_detail.correction && (
                <>
                  <div className="mf-subtitle" style={{ marginTop: '0.75rem' }}>Correction détaillée</div>
                  <div className="mf-full-correction">
                    {item.correction_detail.correction}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
    )
  }

  return (
    <div className="module-feedback-page">
      <div className="mf-header">
        <button className="back-button" onClick={() => navigate(-1)}>← Retour</button>
        <h1>Feedback du module</h1>
      </div>

      {loading && <div className="loading">Chargement des feedbacks...</div>}
      {error && <div className="error">Erreur: {error}</div>}

      {!loading && !error && (
        <div className="mf-grid">
          <div className="mf-card">
            <div className="mf-card-header">
              <h2>Quiz (cours & global)</h2>
            </div>
            <div className="mf-card-body">
              {data.quizzes?.length ? data.quizzes.map((q) => renderItem(q, 'Quiz')) : <p>Aucun quiz pour ce module.</p>}
            </div>
          </div>

          <div className="mf-card">
            <div className="mf-card-header">
              <h2>Exercices (cours & globaux)</h2>
            </div>
            <div className="mf-card-body">
              {data.exercises?.length ? data.exercises.map((e) => renderItem(e, 'Exercice')) : <p>Aucun exercice pour ce module.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ModuleFeedback


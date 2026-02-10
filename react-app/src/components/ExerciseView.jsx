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

  useEffect(() => {
    loadExercise()
  }, [exerciseId])

  const loadExercise = async () => {
    try {
      setLoading(true)
      const data = await exercisesAPI.getById(exerciseId)
      setExercise(data)
      if (data.reponse_etudiante) {
        setAnswer(data.reponse_etudiante)
        setSubmitted(true)
        if (data.correction_ia) {
          setResult(data.correction_ia)
        }
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

    try {
      setSubmitting(true)
      setError('')
      const data = await exercisesAPI.submit(exerciseId, answer)
      setResult(data)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="loading">Chargement de l'exercice...</div>
  if (error) return <div className="error">Erreur: {error}</div>
  if (!exercise) return <div className="error">Exercice non trouvé</div>

  return (
    <div className="exercise-view">
      <div className="exercise-header">
        <h1>Exercice</h1>
        {submitted && result && (
          <div className="exercise-score">
            <h2>Note: {result.note}/20</h2>
          </div>
        )}
      </div>

      <div className="exercise-card">
        <h2>Énoncé</h2>
        <p className="exercise-enonce">{exercise.enonce}</p>
      </div>

      <div className="answer-section">
        <h3>Votre réponse</h3>
        <textarea
          value={answer}
          onChange={(e) => !submitted && setAnswer(e.target.value)}
          placeholder="Écrivez votre réponse ici..."
          className="answer-textarea"
          rows={10}
          disabled={submitted}
        />
      </div>

      {!submitted && (
        <div className="exercise-actions">
          <button 
            onClick={handleSubmit} 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Correction en cours...' : 'Soumettre la réponse'}
          </button>
        </div>
      )}

      {submitted && result && (
        <div className="exercise-feedback">
          <h3>Correction</h3>
          <div className="feedback-content">
            <p>{result.correction}</p>
            
            {result.points_forts && result.points_forts.length > 0 && (
              <div className="points-section points-forts">
                <h4>Points forts</h4>
                <ul>
                  {result.points_forts.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.points_amelioration && result.points_amelioration.length > 0 && (
              <div className="points-section points-amelioration">
                <h4>Points à améliorer</h4>
                <ul>
                  {result.points_amelioration.map((point, index) => (
                    <li key={index}>{point}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="exercise-actions">
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Retour
        </button>
      </div>
    </div>
  )
}

export default ExerciseView





import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { quizAPI } from '../services/api'
import './QuizView.css'

function QuizView() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    loadQuiz()
  }, [quizId])

  const loadQuiz = async () => {
    try {
      setLoading(true)
      const data = await quizAPI.getById(quizId)
      setQuiz(data)
      if (data.reponses_etudiant) {
        // Convertir les réponses en objet indexé si c'est un tableau
        const answersObj = Array.isArray(data.reponses_etudiant)
          ? data.reponses_etudiant.reduce((acc, answer, index) => {
              acc[index] = answer
              return acc
            }, {})
          : data.reponses_etudiant
        setAnswers(answersObj)
        setSubmitted(true)
        // Charger les résultats si déjà soumis
        if (data.result) {
          setResult(data.result)
        } else if (data.note !== null && data.note !== undefined) {
          // Si pas de result mais note disponible, reconstruire les corrections
          const reponsesArray = Array.isArray(data.reponses_etudiant) 
            ? data.reponses_etudiant 
            : Object.values(answersObj)
          const corrections = data.questions?.map((q, idx) => {
            const studentAnswer = reponsesArray[idx]
            const isCorrect = q.correctAnswer === studentAnswer
            return {
              questionIndex: idx,
              correct: isCorrect,
              commentaire: isCorrect ? 'Bonne réponse' : `Réponse attendue: ${q.correctAnswer || 'N/A'}`,
              correctAnswer: q.correctAnswer,
              studentAnswer: studentAnswer
            }
          }) || []
          setResult({
            note: data.note,
            feedback: 'Quiz déjà complété',
            corrections: corrections
          })
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers({
      ...answers,
      [questionIndex]: answer
    })
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== quiz.questions.length) {
      alert('Veuillez répondre à toutes les questions')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const reponses = Object.keys(answers).map(key => answers[key])
      const data = await quizAPI.submit(quizId, reponses)
      setResult(data)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const buildSections = () => {
    const total = quiz?.questions?.length || 0
    if (total === 0) return []
    const mid = Math.ceil(total / 2)
    const ranges = [
      { label: 'Section 1', start: 0, end: mid - 1 },
      { label: 'Section 2', start: mid, end: total - 1 }
    ]

    // Si on n'a pas de corrections dans result, les calculer depuis les questions et réponses
    let corrections = result?.corrections
    if (!corrections && quiz?.questions && answers) {
      corrections = quiz.questions.map((q, idx) => {
        const studentAnswer = answers[idx]
        const isCorrect = q.correctAnswer === studentAnswer
        return {
          questionIndex: idx,
          correct: isCorrect
        }
      })
    }

    return ranges
      .filter((r) => r.start <= r.end)
      .map((range) => {
        const inRange =
          corrections?.filter(
            (c) => c.questionIndex >= range.start && c.questionIndex <= range.end
          ) || []
        const correctCount = inRange.filter((c) => c.correct).length
        const sectionTotal = range.end - range.start + 1
        const score = sectionTotal > 0 ? ((correctCount / sectionTotal) * 20).toFixed(1) : '0'
        return { ...range, correctCount, sectionTotal, score }
      })
  }

  if (loading) return <div className="loading">Chargement du quiz...</div>
  if (error) return <div className="error">Erreur: {error}</div>
  if (!quiz) return <div className="error">Quiz non trouvé</div>

  return (
    <div className="quiz-view">
      <div className="quiz-header">
        <h1>Quiz</h1>
        {submitted && result && (
          <div className="quiz-score">
            <h2>Note: {result.note}/20</h2>
          </div>
        )}
      </div>

      {quiz.questions && quiz.questions.map((question, index) => (
        <div key={index} className="question-card">
          <h3>Question {index + 1}</h3>
          <p className="question-text">{question.question}</p>
          
          <div className="options">
            {Object.entries(question.options).map(([key, value]) => {
              const isSelected = answers[index] === key
              const isCorrect = question.correctAnswer === key
              const showAnswer = submitted && result
              
              // Déterminer les classes CSS
              let optionClasses = 'option'
              if (showAnswer) {
                // Après soumission, prioriser correct/incorrect
                if (isCorrect) {
                  optionClasses += ' correct'
                } else if (isSelected && !isCorrect) {
                  optionClasses += ' incorrect'
                }
              } else if (isSelected) {
                // Avant soumission, utiliser selected
                optionClasses += ' selected'
              }
              
              return (
                <label 
                  key={key} 
                  className={optionClasses}
                >
                  <input
                    type="radio"
                    name={`question-${index}`}
                    value={key}
                    checked={isSelected}
                    onChange={() => !submitted && handleAnswerChange(index, key)}
                    disabled={submitted}
                  />
                  <span className="option-label">{key}: {value}</span>
                  {showAnswer && isCorrect && <span className="checkmark">✓</span>}
                  {showAnswer && isSelected && !isCorrect && <span className="crossmark">✗</span>}
                </label>
              )
            })}
          </div>
        </div>
      ))}

      {!submitted && (
        <div className="quiz-actions">
          <button 
            onClick={handleSubmit} 
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Soumission en cours...' : 'Soumettre le quiz'}
          </button>
        </div>
      )}

      {submitted && result && (
        <div className="quiz-feedback">
          <div className="feedback-header-row">
            <h3>Feedback</h3>
            <span className="feedback-badge">Résumé</span>
          </div>

          <div className="feedback-summary compact">
            <div className="feedback-note">
              <span className="note-label">Note</span>
              <span className="note-value">{result.note}/20</span>
            </div>
            <div className="feedback-message">
              {result.note >= 15
                ? 'Excellent travail !'
                : result.note >= 10
                  ? 'Bon début, continue !'
                  : 'Ne te décourage pas, tu progresses.'}
            </div>
            <button
              className="btn btn-secondary"
              onClick={() => setShowDetails((v) => !v)}
            >
              {showDetails ? 'Masquer les détails' : 'Voir le feedback complet'}
            </button>
          </div>

          {showDetails && (
            <>
              <div className="section-notes">
                {buildSections().map((section) => (
                  <div key={section.label} className="section-card">
                    <div className="section-title">{section.label}</div>
                    <div className="section-score">{section.score}/20</div>
                    <div className="section-detail">
                      {section.correctCount} bonnes réponses sur {section.sectionTotal}
                    </div>
                  </div>
                ))}
              </div>

              <div className="feedback-details">
                <p className="feedback-text">{result.feedback}</p>
                {result.corrections && (
                  <div className="corrections">
                    {result.corrections.map((correction, index) => (
                      <div
                        key={index}
                        className={`correction-item ${correction.correct ? 'ok' : 'ko'}`}
                      >
                        <div className="correction-title">
                          Question {correction.questionIndex + 1}
                        </div>
                        <div className="correction-comment">{correction.commentaire}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="quiz-actions">
        <button onClick={() => navigate(-1)} className="btn btn-secondary">
          Retour
        </button>
      </div>
    </div>
  )
}

export default QuizView





import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { quizAPI } from '../services/api'

function EvaluationPage() {
  const { id: seanceId } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await quizAPI.generateForSeance(seanceId)
        console.log('EvaluationPage.generateForSeance response:', response)
        setQuiz(response)
      } catch (err) {
        console.error('EvaluationPage.generateForSeance error:', err)
        setError(err.message || 'Erreur lors du chargement de l\'evaluation')
      } finally {
        setLoading(false)
      }
    }

    if (seanceId) {
      loadQuiz()
    }
  }, [seanceId])

  const getQuizId = () => {
    return quiz?._id || quiz?.quizId || quiz?.quiz?._id || null
  }

  const getQuestionList = () => {
    if (!quiz) return []
    if (Array.isArray(quiz.questions)) return quiz.questions
    if (Array.isArray(quiz.quiz?.questions)) return quiz.quiz.questions
    return []
  }

  const getOptions = (question) => {
    if (!question?.options) return []

    if (Array.isArray(question.options)) {
      return question.options.map((value, index) => ({
        key: String(index),
        label: value,
      }))
    }

    if (typeof question.options === 'object') {
      return Object.entries(question.options).map(([key, value]) => ({
        key,
        label: value,
      }))
    }

    return []
  }

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers((prev) => ({ ...prev, [questionIndex]: value }))
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError('')

      const questions = getQuestionList()
      const quizId = getQuizId()

      if (!quizId) {
        throw new Error('Quiz introuvable pour soumission')
      }

      const reponses = questions.map((question, index) => ({
        questionId: question._id || question.id,
        reponse: answers[index],
      }))

      const response = await quizAPI.submit(quizId, reponses)
      console.log('EvaluationPage.submit response:', response)
      setResult(response)
    } catch (err) {
      console.error('EvaluationPage.submit error:', err)
      setError(err.message || 'Erreur lors de la soumission')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>PostLab Evaluation</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (error && !quiz) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>PostLab Evaluation</h1>
        <p>{error}</p>
      </div>
    )
  }

  const questions = getQuestionList()
  const score = result?.note ?? result?.score
  const feedbackMessage = typeof result?.feedback === 'string'
    ? result.feedback
    : result?.feedback?.message || result?.message

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>PostLab Evaluation</h1>
      <p>Seance: {seanceId}</p>

      {error ? <p>{error}</p> : null}

      {questions.length === 0 ? (
        <p>Aucune question disponible.</p>
      ) : (
        <div>
          {questions.map((question, qIndex) => {
            const options = getOptions(question)
            const questionText = question.question || question.questionText || `Question ${qIndex + 1}`

            return (
              <div
                key={question._id || question.id || qIndex}
                style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}
              >
                <h3 style={{ marginTop: 0 }}>{qIndex + 1}. {questionText}</h3>

                {options.map((option) => (
                  <label key={`${qIndex}-${option.key}`} style={{ display: 'block', marginBottom: '8px' }}>
                    <input
                      type="radio"
                      name={`eval-q-${qIndex}`}
                      value={option.key}
                      checked={answers[qIndex] === option.key}
                      onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
                      disabled={submitting}
                    />
                    <span style={{ marginLeft: '8px' }}>{String(option.label)}</span>
                  </label>
                ))}
              </div>
            )
          })}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            style={{ padding: '10px 16px', cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? 'Submitting...' : 'Submit Evaluation'}
          </button>
        </div>
      )}

      {result ? (
        <div style={{ marginTop: '24px', padding: '16px', border: '1px solid #cfe8d6', borderRadius: '8px', background: '#f7fffa' }}>
          <h2>Result</h2>
          <p><strong>Score:</strong> {score ?? 'N/A'}</p>
          <p><strong>Feedback:</strong> {feedbackMessage || 'Aucun feedback disponible.'}</p>
        </div>
      ) : null}
    </div>
  )
}

export default EvaluationPage

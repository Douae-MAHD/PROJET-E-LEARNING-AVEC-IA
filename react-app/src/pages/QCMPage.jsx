import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { quizAPI } from '../services/api'

function QCMPage() {
  const { moduleId } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadQuiz = async () => {
      try {
        setLoading(true)
        setError('')
        const response = await quizAPI.generateGlobal(moduleId)
        console.log('QCMPage.generateGlobal response:', response)
        setQuiz(response)
      } catch (err) {
        console.error('QCMPage.generateGlobal error:', err)
        setError(err.message || 'Erreur lors du chargement du QCM')
      } finally {
        setLoading(false)
      }
    }

    if (moduleId) {
      loadQuiz()
    }
  }, [moduleId])

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

  const handleSubmit = () => {
    console.log('QCMPage submitted answers:', answers)
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>PreLab QCM</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>PreLab QCM</h1>
        <p>{error}</p>
      </div>
    )
  }

  const questions = getQuestionList()

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <h1>PreLab QCM</h1>
      <p>Module: {moduleId}</p>

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
                      name={`q-${qIndex}`}
                      value={option.key}
                      checked={answers[qIndex] === option.key}
                      onChange={(e) => handleAnswerChange(qIndex, e.target.value)}
                    />
                    <span style={{ marginLeft: '8px' }}>{String(option.label)}</span>
                  </label>
                ))}
              </div>
            )
          })}

          <button type="button" onClick={handleSubmit} style={{ padding: '10px 16px', cursor: 'pointer' }}>
            Submit
          </button>
        </div>
      )}
    </div>
  )
}

export default QCMPage

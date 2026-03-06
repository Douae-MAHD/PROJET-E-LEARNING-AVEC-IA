import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { quizAPI } from '../services/api'
import './QuizView.css'

function QuizView() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const showFeedbackOnly = searchParams.get('showFeedbackOnly') === 'true'
  const [quiz, setQuiz] = useState(null)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const getOptionTextByKey = (question, key) => {
    const options = question?.options
    if (!options) return key

    if (Array.isArray(options)) {
      const normalized = String(key).toUpperCase()
      const indexMap = { A: 0, B: 1, C: 2, D: 3 }
      const index = /^\d+$/.test(normalized) ? Number(normalized) : indexMap[normalized]
      return Number.isInteger(index) && index >= 0 && index < options.length
        ? options[index]
        : key
    }

    if (typeof options === 'object') {
      return options[key] ?? options[String(key).toUpperCase()] ?? options[String(key).toLowerCase()] ?? key
    }

    return key
  }

  const getOptionEntries = (question) => {
    const options = question?.options
    if (!options) return []
    if (Array.isArray(options)) return options.map((value, idx) => [String(idx), value])
    if (typeof options === 'object') return Object.entries(options)
    return []
  }

  const normalizeAnswer = (value) => {
    if (value === null || value === undefined) return ''
    const raw = String(value).trim().toUpperCase()
    const indexToLetter = { '0': 'A', '1': 'B', '2': 'C', '3': 'D' }
    return indexToLetter[raw] || raw
  }

  const answersMatch = (studentAnswer, correctAnswer) => {
    return normalizeAnswer(studentAnswer) === normalizeAnswer(correctAnswer)
  }

  const extractAnswersByIndex = (questions = [], rawAnswers = []) => {
    if (!Array.isArray(rawAnswers)) return {}

    const questionIndexById = new Map(
      questions.map((q, idx) => [String(q._id || q.id || idx), idx])
    )

    const parsed = {}
    rawAnswers.forEach((item, idx) => {
      if (item && typeof item === 'object' && 'reponse' in item) {
        const key = String(item.questionId ?? '')
        const questionIndex = questionIndexById.has(key) ? questionIndexById.get(key) : idx
        parsed[questionIndex] = item.reponse
      } else {
        parsed[idx] = item
      }
    })

    return parsed
  }

  const generateFeedback = (corrections, note, total) => {
    const correctCount = corrections.filter(c => c.correct).length
    const scorePercentage = total > 0 ? (correctCount / total) * 100 : 0
    const strengths = []
    const weaknesses = []
    const recommendations = []

    if (scorePercentage >= 90) {
      strengths.push('Excellent score! Vous maîtrisez bien ce sujet.')
    } else if (scorePercentage >= 80) {
      strengths.push('Bon score. Vous avez une bonne compréhension du contenu.')
    } else if (scorePercentage >= 70) {
      strengths.push('Score acceptable. Vous comprenez les concepts principaux.')
    } else if (scorePercentage > 0) {
      strengths.push('Vous avez quelques bonnes réponses. Continuez vos efforts!')
    }

    if (scorePercentage < 100) {
      const errorCount = total - correctCount
      weaknesses.push(`${errorCount} erreur(s) identifiée(s) (${errorCount}/${total}).`)
      if (scorePercentage < 50) {
        recommendations.push('Réviser attentivement le matériel de cours.')
        recommendations.push('Relire les sections importantes du PDF.')
      } else if (scorePercentage < 70) {
        recommendations.push('Renforcer votre compréhension des points faibles.')
        recommendations.push('Revoir les questions que vous avez manquées.')
      } else {
        recommendations.push('Un peu plus de pratique et vous maîtriserez parfaitement.')
      }
    } else {
      strengths.push('Vous avez répondu correctement à toutes les questions!')
      recommendations.push('Continuez cet excellent travail!')
    }

    return { strengths, weaknesses, recommendations }
  }

  useEffect(() => {
    loadQuiz()
  }, [quizId])

  const loadQuiz = async () => {
    try {
      setLoading(true)
      const data = await quizAPI.getById(quizId)
      setQuiz(data)
      const hasSubmittedAnswers = Array.isArray(data.reponses_etudiant)
        ? data.reponses_etudiant.length > 0
        : !!data.reponses_etudiant && Object.keys(data.reponses_etudiant).length > 0

      const isSubmittedQuiz = data.isSubmitted === true || hasSubmittedAnswers || (data.note !== null && data.note !== undefined)

      if (isSubmittedQuiz) {
        setSubmitted(true)

        if (hasSubmittedAnswers) {
          const answersObj = Array.isArray(data.reponses_etudiant)
            ? extractAnswersByIndex(data.questions || [], data.reponses_etudiant)
            : data.reponses_etudiant
          setAnswers(answersObj)
        }

        if (data.result) {
          const scoringDetails = data.result.scoringDetails || []
          const correctionsFromScoring = scoringDetails.map((detail, idx) => ({
            questionIndex: idx,
            correct: !!detail.correct,
            commentaire: detail.explanation || (detail.correct ? 'Bonne réponse' : `Réponse attendue: ${detail.correctAnswer || 'N/A'}`),
            correctAnswer: detail.correctAnswer,
            studentAnswer: detail.studentAnswer
          }))

          const computedCorrect = correctionsFromScoring.length > 0
            ? correctionsFromScoring.filter(c => c.correct).length
            : (data.result.correct || 0)

          setResult({
            ...data.result,
            correct: computedCorrect,
            total: data.result.total || data.questions?.length || 0,
            corrections: correctionsFromScoring
          })
        } else if (data.note !== null && data.note !== undefined) {
          const answersByIndex = hasSubmittedAnswers
            ? (Array.isArray(data.reponses_etudiant)
            ? extractAnswersByIndex(data.questions || [], data.reponses_etudiant)
            : (data.reponses_etudiant || {}))
            : {}

          const corrections = data.questions?.map((q, idx) => {
            const studentAnswer = answersByIndex[idx]
            const isCorrect = answersMatch(studentAnswer, q.correctAnswer)
            return {
              questionIndex: idx,
              correct: isCorrect,
              commentaire: isCorrect ? 'Bonne réponse' : `Réponse attendue: ${q.correctAnswer || 'N/A'}`,
              correctAnswer: q.correctAnswer,
              studentAnswer: studentAnswer
            }
          }) || []

          const correctCount = corrections.filter(c => c.correct).length
          const generatedFeedback = generateFeedback(corrections, data.note, data.questions?.length || 0)

          setResult({
            note: data.note,
            feedback: data.feedback || generatedFeedback,
            corrections: corrections,
            correct: correctCount,
            total: data.questions?.length || 0
          })
        }
      } else {
        setSubmitted(false)
        setResult(null)
        setAnswers({})
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionIndex, answer) => {
    setAnswers({ ...answers, [questionIndex]: answer })
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== quiz.questions.length) {
      alert('Veuillez répondre à toutes les questions')
      return
    }
    setShowConfirmModal(false)

    try {
      setSubmitting(true)
      setError('')
      const reponsesFormatted = quiz.questions.map((question, index) => ({
        questionId: question._id || question.id,
        reponse: answers[index]
      }))
      const data = await quizAPI.submit(quizId, reponsesFormatted)

      const normalizedResult = {
        note: data.note ?? data.score ?? null,
        correct: data.correct || 0,
        total: data.total || quiz.questions.length,
        scoringDetails: data.scoringDetails || [],
        feedback: data.feedback || { strengths: [], weaknesses: [], recommendations: [] },
        corrections: data.scoringDetails?.map((detail, idx) => ({
          questionIndex: idx,
          correct: detail.correct,
          commentaire: detail.explanation || (detail.correct ? 'Bonne réponse' : `Réponse attendue: ${detail.correctAnswer}`)
        })) || []
      }
      setResult(normalizedResult)
      setSubmitted(true)
    } catch (err) {
      if (err.message && err.message.includes('already submitted')) {
        setSubmitted(true)
        if (quiz && quiz.reponses_etudiant) {
          const answersByIndex = Array.isArray(quiz.reponses_etudiant)
            ? extractAnswersByIndex(quiz.questions || [], quiz.reponses_etudiant)
            : quiz.reponses_etudiant

          const corrections = quiz.questions?.map((q, idx) => {
            const studentAnswer = answersByIndex[idx]
            const isCorrect = answersMatch(studentAnswer, q.correctAnswer)
            return {
              questionIndex: idx,
              correct: isCorrect,
              commentaire: isCorrect ? 'Bonne réponse' : `Réponse attendue: ${q.correctAnswer || 'N/A'}`,
              correctAnswer: q.correctAnswer,
              studentAnswer: studentAnswer
            }
          }) || []

          const normalizedResult = {
            note: quiz.note ?? quiz.result?.note ?? null,
            correct: quiz.result?.correct || corrections.filter(c => c.correct).length,
            total: quiz.questions?.length || 0,
            feedback: quiz.result?.feedback || { strengths: [], weaknesses: [], recommendations: [] },
            corrections: corrections
          }
          setResult(normalizedResult)
        }
      } else {
        setError(err.message)
      }
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

    let corrections = result?.corrections
    if (!corrections && quiz?.questions && answers) {
      corrections = quiz.questions.map((q, idx) => {
        const studentAnswer = answers[idx]
        const isCorrect = q.correctAnswer === studentAnswer
        return { questionIndex: idx, correct: isCorrect }
      })
    }

    return ranges
      .filter((r) => r.start <= r.end)
      .map((range) => {
        const inRange = corrections?.filter(
          (c) => c.questionIndex >= range.start && c.questionIndex <= range.end
        ) || []
        const correctCount = inRange.filter((c) => c.correct).length
        const sectionTotal = range.end - range.start + 1
        const sectionPercentage = sectionTotal > 0 ? (correctCount / sectionTotal) * 100 : 0
        const score = (sectionPercentage / 100 * 20).toFixed(1)
        return { ...range, correctCount, sectionTotal, score }
      })
  }

  const getScoreMessage = (note) => {
    const pct = (note / 20) * 100
    if (pct >= 80) return { msg: 'Excellent ! 🎓 Maîtrise confirmée', cls: 'result-excellent' }
    if (pct >= 60) return { msg: 'Bien joué ! 📚 Continuez à réviser', cls: 'result-good' }
    return { msg: 'Courage ! 💪 Revoyez ce module', cls: 'result-low' }
  }

  const answeredCount = Object.keys(answers).length
  const totalQuestions = quiz?.questions?.length || 0
  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  if (loading) {
    return (
      <div className="qv-loading-screen">
        <div className="qv-loader-ring"></div>
        <p>Chargement du quiz<span className="qv-dots">...</span></p>
      </div>
    )
  }
  if (error && !submitted && !result) {
    return (
      <div className="qv-error-screen">
        <div className="qv-error-icon">⚠️</div>
        <p>{error}</p>
        <button className="qv-btn qv-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
      </div>
    )
  }
  if (!quiz) {
    return (
      <div className="qv-error-screen">
        <p>Quiz non trouvé</p>
        <button className="qv-btn qv-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
      </div>
    )
  }

  // ─── FEEDBACK ONLY ───────────────────────────────────────────────────────────
  if (showFeedbackOnly) {
    let displayResult = result
    const hasStoredAnswers = Array.isArray(quiz.reponses_etudiant)
      ? quiz.reponses_etudiant.length > 0
      : !!quiz.reponses_etudiant && Object.keys(quiz.reponses_etudiant).length > 0

    const hasFeedbackData = quiz && (
      quiz.isSubmitted === true ||
      hasStoredAnswers ||
      (quiz.note !== null && quiz.note !== undefined)
    )

    if (!displayResult && hasFeedbackData) {
      const answersByIndex = Array.isArray(quiz.reponses_etudiant)
        ? extractAnswersByIndex(quiz.questions || [], quiz.reponses_etudiant)
        : (quiz.reponses_etudiant || {})

      const corrections = quiz.questions?.map((q, idx) => {
        const studentAnswer = answersByIndex[idx]
        const isCorrect = answersMatch(studentAnswer, q.correctAnswer)
        return {
          questionIndex: idx,
          correct: isCorrect,
          commentaire: isCorrect ? 'Bonne réponse' : `Réponse attendue: ${q.correctAnswer || 'N/A'}`,
          correctAnswer: q.correctAnswer,
          studentAnswer: studentAnswer
        }
      }) || []

      const correctCount = corrections.filter(c => c.correct).length
      const generatedFeedback = generateFeedback(corrections, quiz.note ?? 0, quiz.questions?.length || 0)

      displayResult = {
        note: quiz.note ?? 0,
        correct: correctCount,
        total: quiz.questions?.length || 0,
        feedback: quiz.feedback || quiz.result?.feedback || generatedFeedback,
        corrections: corrections
      }
    }

    if (!displayResult && !hasFeedbackData) {
      return (
        <div className="qv-error-screen">
          <p>Ce quiz n'est pas encore soumis. Passez le quiz avant d'afficher le feedback.</p>
          <button className="qv-btn qv-btn-secondary" onClick={() => navigate(`/quiz/${quizId}`)}>Passer le quiz</button>
        </div>
      )
    }

    if (displayResult) {
      const percentage = displayResult.total > 0
        ? Math.round((displayResult.correct / displayResult.total) * 100)
        : 0
      const scoreInfo = getScoreMessage(displayResult.note)
      const radius = 54
      const circ = 2 * Math.PI * radius
      const offset = circ - (percentage / 100) * circ

      return (
        <div className="qv-wrap">
          <div className="qv-container qv-feedback-only">
            {/* Header */}
            <div className="qv-header">
              <button className="qv-back-btn" onClick={() => navigate(-1)}>
                <span>←</span> Retour
              </button>
              <div className="qv-header-title">
                <h1>Résultats du Quiz</h1>
                <span className="qv-ai-badge">Généré par IA 🤖</span>
              </div>
            </div>

            {/* Score Card */}
            <div className="qv-result-card">
              <div className="qv-score-circle-wrap">
                <svg viewBox="0 0 120 120" className="qv-score-svg">
                  <circle cx="60" cy="60" r={radius} className="qv-circle-bg" />
                  <circle
                    cx="60" cy="60" r={radius}
                    className="qv-circle-fill"
                    strokeDasharray={circ}
                    strokeDashoffset={offset}
                  />
                </svg>
                <div className="qv-score-inner">
                  <span className="qv-score-pct">{percentage}%</span>
                  <span className="qv-score-label">{displayResult.correct}/{displayResult.total}</span>
                </div>
              </div>
              <div className="qv-result-info">
                <div className="qv-note-big">{displayResult.note}<span>/20</span></div>
                <div className={`qv-result-msg ${scoreInfo.cls}`}>{scoreInfo.msg}</div>
                <div className="qv-result-actions">
                  <button className="qv-btn qv-btn-secondary" onClick={() => navigate(-1)}>
                    ← Retour aux modules
                  </button>
                </div>
              </div>
            </div>

            {/* Feedback Sections */}
            {displayResult.feedback && typeof displayResult.feedback === 'object' && (
              <div className="qv-feedback-grid">
                {displayResult.feedback.strengths && displayResult.feedback.strengths.length > 0 && (
                  <div className="qv-feedback-block qv-fb-strength">
                    <div className="qv-fb-icon">✓</div>
                    <h4>Points forts</h4>
                    <ul>{displayResult.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                  </div>
                )}
                {displayResult.feedback.weaknesses && displayResult.feedback.weaknesses.length > 0 && (
                  <div className="qv-feedback-block qv-fb-weak">
                    <div className="qv-fb-icon">✗</div>
                    <h4>Points à améliorer</h4>
                    <ul>{displayResult.feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                  </div>
                )}
                {displayResult.feedback.recommendations && displayResult.feedback.recommendations.length > 0 && (
                  <div className="qv-feedback-block qv-fb-reco">
                    <div className="qv-fb-icon">💡</div>
                    <h4>Recommandations</h4>
                    <ul>{displayResult.feedback.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            {/* Corrections */}
            {displayResult.corrections && (
              <div className="qv-corrections">
                <h3>Détail des réponses</h3>
                <div className="qv-corrections-list">
                  {displayResult.corrections.map((correction, index) => {
                    const question = quiz.questions?.[correction.questionIndex]
                    return (
                      <div key={index} className={`qv-correction-item ${correction.correct ? 'ok' : 'ko'}`}>
                        <div className="qv-correction-header">
                          <span className={`qv-status-icon ${correction.correct ? 'correct' : 'incorrect'}`}>
                            {correction.correct ? '✓' : '✗'}
                          </span>
                          <div className="qv-correction-title">
                            Q{correction.questionIndex + 1} — {question?.question}
                          </div>
                        </div>
                        <div className="qv-correction-details">
                          {correction.studentAnswer && (
                            <div className="qv-student-answer">
                              <strong>Votre réponse :</strong> {correction.studentAnswer}: {getOptionTextByKey(question, correction.studentAnswer)}
                            </div>
                          )}
                          {!correction.correct && (
                            <div className="qv-correct-answer">
                              <strong>Bonne réponse :</strong> {correction.correctAnswer}: {getOptionTextByKey(question, correction.correctAnswer)}
                            </div>
                          )}
                        </div>
                        <div className="qv-correction-comment">{correction.commentaire}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )
    }
  }

  // ─── QUIZ IN PROGRESS ─────────────────────────────────────────────────────────
  return (
    <div className="qv-wrap">
      {/* Confirm Submit Modal */}
      {showConfirmModal && (
        <div className="qv-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="qv-modal" onClick={e => e.stopPropagation()}>
            <div className="qv-modal-icon">📝</div>
            <h3>Soumettre le quiz ?</h3>
            <p>Vous avez répondu à <strong>{answeredCount}/{totalQuestions}</strong> questions. Cette action est irréversible.</p>
            <div className="qv-modal-actions">
              <button className="qv-btn qv-btn-secondary" onClick={() => setShowConfirmModal(false)}>Annuler</button>
              <button className="qv-btn qv-btn-gold" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <span className="qv-spinner"></span> : '✓ Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="qv-container">
        {/* Header */}
        <div className="qv-header">
          <button className="qv-back-btn" onClick={() => navigate(-1)}>
            <span>←</span> Retour
          </button>
          <div className="qv-header-title">
            <h1>Quiz</h1>
            <span className="qv-ai-badge">Généré par IA 🤖</span>
          </div>
          {submitted && result && (
            <div className="qv-header-score">
              <span className="qv-header-note">{result.note}/20</span>
              <span className="qv-header-note-label">Note finale</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {!submitted && (
          <div className="qv-progress-wrap">
            <div className="qv-progress-info">
              <span>{answeredCount} / {totalQuestions} réponses</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="qv-progress-bar">
              <div className="qv-progress-fill" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="qv-questions">
          {quiz.questions && quiz.questions.map((question, index) => {
            const isAnswered = answers[index] !== undefined
            const showAnswer = submitted && result

            return (
              <div
                key={index}
                className={`qv-question-card ${isAnswered && !submitted ? 'answered' : ''}`}
                style={{ animationDelay: `${index * 0.06}s` }}
              >
                <div className="qv-question-num">
                  <span>{index + 1}</span>
                </div>
                <div className="qv-question-body">
                  <p className="qv-question-text">{question.question}</p>
                  <div className="qv-options">
                    {getOptionEntries(question).map(([key, value]) => {
                      const isSelected = answers[index] === key
                      const isCorrect = question.correctAnswer === key

                      let optionClass = 'qv-option'
                      if (showAnswer) {
                        if (isCorrect) optionClass += ' qv-opt-correct'
                        else if (isSelected && !isCorrect) optionClass += ' qv-opt-incorrect'
                      } else if (isSelected) {
                        optionClass += ' qv-opt-selected'
                      }

                      return (
                        <label key={key} className={optionClass}>
                          <input
                            type="radio"
                            name={`question-${index}`}
                            value={key}
                            checked={isSelected}
                            onChange={() => !submitted && handleAnswerChange(index, key)}
                            disabled={submitted}
                          />
                          <span className="qv-opt-letter">{key}</span>
                          <span className="qv-opt-text">{value}</span>
                          {showAnswer && isCorrect && <span className="qv-opt-mark qv-opt-check">✓</span>}
                          {showAnswer && isSelected && !isCorrect && <span className="qv-opt-mark qv-opt-cross">✗</span>}
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Submit Button */}
        {!submitted && (
          <div className="qv-submit-zone">
            <div className="qv-submit-hint">
              {answeredCount < totalQuestions
                ? `⚠️ ${totalQuestions - answeredCount} question(s) sans réponse`
                : '✓ Toutes les questions sont répondues'}
            </div>
            <button
              className="qv-btn qv-btn-gold qv-btn-submit"
              onClick={() => setShowConfirmModal(true)}
              disabled={submitting || answeredCount < totalQuestions}
            >
              {submitting
                ? <><span className="qv-spinner"></span> Soumission...</>
                : '🎓 Soumettre le quiz'}
            </button>
          </div>
        )}

        {/* Result Summary (after submit) */}
        {submitted && result && (
          <div className="qv-result-summary">
            {(() => {
              const percentage = result.total > 0
                ? Math.round((result.correct / result.total) * 100)
                : 0
              const scoreInfo = getScoreMessage(result.note)
              const radius = 54
              const circ = 2 * Math.PI * radius
              const offset = circ - (percentage / 100) * circ

              return (
                <>
                  <div className="qv-result-card">
                    <div className="qv-score-circle-wrap">
                      <svg viewBox="0 0 120 120" className="qv-score-svg">
                        <circle cx="60" cy="60" r={radius} className="qv-circle-bg" />
                        <circle
                          cx="60" cy="60" r={radius}
                          className="qv-circle-fill"
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                        />
                      </svg>
                      <div className="qv-score-inner">
                        <span className="qv-score-pct">{percentage}%</span>
                        <span className="qv-score-label">{result.correct}/{result.total}</span>
                      </div>
                    </div>
                    <div className="qv-result-info">
                      <div className="qv-note-big">{result.note}<span>/20</span></div>
                      <div className={`qv-result-msg ${scoreInfo.cls}`}>{scoreInfo.msg}</div>
                      <button
                        className="qv-btn qv-btn-secondary"
                        onClick={() => setShowDetails(v => !v)}
                      >
                        {showDetails ? 'Masquer le feedback' : 'Voir le feedback complet'}
                      </button>
                    </div>
                  </div>

                  {showDetails && (
                    <>
                      <div className="qv-section-notes">
                        {buildSections().map((section) => (
                          <div key={section.label} className="qv-section-card">
                            <div className="qv-section-label">{section.label}</div>
                            <div className="qv-section-score">{section.score}/20</div>
                            <div className="qv-section-detail">{section.correctCount} / {section.sectionTotal} correctes</div>
                          </div>
                        ))}
                      </div>

                      {result.feedback && (
                        <div className="qv-feedback-grid">
                          {result.feedback.strengths && result.feedback.strengths.length > 0 && (
                            <div className="qv-feedback-block qv-fb-strength">
                              <div className="qv-fb-icon">✓</div>
                              <h4>Points forts</h4>
                              <ul>{result.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                          )}
                          {result.feedback.weaknesses && result.feedback.weaknesses.length > 0 && (
                            <div className="qv-feedback-block qv-fb-weak">
                              <div className="qv-fb-icon">✗</div>
                              <h4>Points à améliorer</h4>
                              <ul>{result.feedback.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                            </div>
                          )}
                          {result.feedback.recommendations && result.feedback.recommendations.length > 0 && (
                            <div className="qv-feedback-block qv-fb-reco">
                              <div className="qv-fb-icon">💡</div>
                              <h4>Recommandations</h4>
                              <ul>{result.feedback.recommendations.map((r, i) => <li key={i}>{r}</li>)}</ul>
                            </div>
                          )}
                        </div>
                      )}

                      {result.corrections && (
                        <div className="qv-corrections">
                          <h3>Détail des réponses</h3>
                          <div className="qv-corrections-list">
                            {result.corrections.map((correction, index) => {
                              const question = quiz.questions?.[correction.questionIndex]
                              return (
                                <div key={index} className={`qv-correction-item ${correction.correct ? 'ok' : 'ko'}`}>
                                  <div className="qv-correction-header">
                                    <span className={`qv-status-icon ${correction.correct ? 'correct' : 'incorrect'}`}>
                                      {correction.correct ? '✓' : '✗'}
                                    </span>
                                    <div className="qv-correction-title">
                                      Q{correction.questionIndex + 1} — {question?.question}
                                    </div>
                                  </div>
                                  <div className="qv-correction-details">
                                    {correction.studentAnswer && (
                                      <div className="qv-student-answer">
                                        <strong>Votre réponse :</strong> {correction.studentAnswer}: {getOptionTextByKey(question, correction.studentAnswer)}
                                      </div>
                                    )}
                                    {!correction.correct && (
                                      <div className="qv-correct-answer">
                                        <strong>Bonne réponse :</strong> {correction.correctAnswer}: {getOptionTextByKey(question, correction.correctAnswer)}
                                      </div>
                                    )}
                                  </div>
                                  <div className="qv-correction-comment">{correction.commentaire}</div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )
            })()}
          </div>
        )}

        <div className="qv-footer-actions">
          <button className="qv-btn qv-btn-secondary" onClick={() => navigate(-1)}>
            ← Retour aux modules
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuizView
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { modulesAPI, pdfsAPI, quizAPI, exercisesAPI } from '../services/api'
import './ModuleView.css'

function ModuleView() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [module, setModule] = useState(null)
  const [selectedSubModule, setSelectedSubModule] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(null) // store key of what's generating
  const [error, setError] = useState('')
  const [globalActionError, setGlobalActionError] = useState('')

  useEffect(() => {
    loadModule()
  }, [moduleId])

  const loadModule = async () => {
    try {
      setLoading(true)
      const data = await modulesAPI.getById(moduleId)
      setModule(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubModuleClick = async (subModuleId) => {
    try {
      const data = await modulesAPI.getSubModule(subModuleId)
      setSelectedSubModule(data)
    } catch (err) {
      setError(err.message)
    }
  }

  const handlePDFClick = async (pdf) => {
    try {
      await pdfsAPI.download(pdf._id)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors du téléchargement du PDF: ' + err.message)
    }
  }

  const handleGenerateQuiz = async (pdfId) => {
    try {
      setError('')
      setGenerating(`pdf-quiz-${pdfId}`)
      const response = await quizAPI.generate(pdfId)
      const quiz = response?.quiz || response
      const { _id, isExisting } = response
      if (!quiz || !_id) throw new Error('Impossible de récupérer l\'ID du quiz généré')
      if (isExisting) {
        navigate(`/quiz/${_id}?showFeedbackOnly=true`)
      } else {
        navigate(`/quiz/${_id}`)
      }
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération du quiz: ' + err.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleGenerateExercises = async (pdfId) => {
    try {
      setError('')
      setGenerating(`pdf-ex-${pdfId}`)
      const response = await exercisesAPI.generate(pdfId)
      const exercises = Array.isArray(response) ? response : (response?.exercises || [])
      if (!exercises || exercises.length === 0) throw new Error('Aucun exercice n\'a pu être généré')
      const firstExerciseId = exercises[0]._id || exercises[0].id
      setTimeout(() => navigate(`/exercises/${firstExerciseId}`), 500)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération des exercices: ' + err.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleGenerateQuizForCourse = async (subModuleId) => {
    try {
      setError('')
      setGenerating(`course-quiz-${subModuleId}`)
      const response = await quizAPI.generateForCourse(subModuleId)
      const { _id, isExisting } = response
      if (isExisting) {
        navigate(`/quiz/${_id}?showFeedbackOnly=true`)
      } else {
        navigate(`/quiz/${_id}`)
      }
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération du quiz: ' + err.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleGenerateExercisesForCourse = async (subModuleId) => {
    try {
      setError('')
      setGenerating(`course-ex-${subModuleId}`)
      const response = await exercisesAPI.generateForCourse(subModuleId)
      const exercises = Array.isArray(response) ? response : (response?.exercises || [])
      if (!exercises || exercises.length === 0) throw new Error('Aucun exercice n\'a pu être généré')
      const firstExerciseId = exercises[0]._id || exercises[0].id
      setTimeout(() => navigate(`/exercises/${firstExerciseId}`), 500)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération des exercices: ' + err.message)
    } finally {
      setGenerating(null)
    }
  }

  const handleQuizGlobal = async () => {
    try {
      setGlobalActionError('')
      setGenerating('global-quiz')

      const existing = await quizAPI.checkModuleExisting(moduleId)
      if (existing?.exists && existing?.quizId) {
        navigate(`/quiz/${existing.quizId}`)
        return
      }

      const response = await quizAPI.generateGlobal(moduleId)
      const quizId = response?._id || response?.quizId || response?.quiz?._id
      if (!quizId) throw new Error('Impossible de récupérer l\'ID du quiz global')

      navigate(`/quiz/${quizId}`)
    } catch (err) {
      setGlobalActionError(err.message || 'Erreur lors du chargement du quiz global')
    } finally {
      setGenerating(null)
    }
  }

  const handleExercicesGlobaux = async () => {
    try {
      setGlobalActionError('')
      setGenerating('global-ex')

      const existing = await exercisesAPI.checkModuleExisting(moduleId)
      if (existing?.exists && existing?.exerciseId) {
        navigate(`/exercise/${existing.exerciseId}`)
        return
      }

      const response = await exercisesAPI.generateGlobal(moduleId)
      const exercises = Array.isArray(response) ? response : (response?.exercises || [])
      if (!exercises || exercises.length === 0) throw new Error('Aucun exercice global trouvé')

      const firstExerciseId = exercises[0]._id || exercises[0].id
      if (!firstExerciseId) throw new Error('Impossible de récupérer l\'ID de l\'exercice global')

      navigate(`/exercise/${firstExerciseId}`)
    } catch (err) {
      setGlobalActionError(err.message || 'Erreur lors du chargement des exercices globaux')
    } finally {
      setGenerating(null)
    }
  }

  const handleFeedbacks = () => {
    setGlobalActionError('')
    navigate(`/feedback/module/${moduleId}`)
  }

  const isGenerating = generating !== null

  // ─── LOADING / ERROR ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mv-loading-screen">
        <div className="mv-loader-ring"></div>
        <p>Chargement du module<span className="mv-dots">...</span></p>
      </div>
    )
  }

  if (error && !module) {
    return (
      <div className="mv-error-screen">
        <div className="mv-error-icon">⚠️</div>
        <p>{error}</p>
        <button className="mv-btn mv-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
      </div>
    )
  }

  if (!module) {
    return (
      <div className="mv-error-screen">
        <p>Module non trouvé</p>
        <button className="mv-btn mv-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
      </div>
    )
  }

  // ─── SUB-MODULE DETAIL VIEW ─────────────────────────────────────────────────
  if (selectedSubModule) {
    const courseKey = selectedSubModule._id
    const isGenCourseQuiz = generating === `course-quiz-${courseKey}`
    const isGenCourseEx = generating === `course-ex-${courseKey}`

    return (
      <div className="mv-wrap">
        <div className="mv-container">
          {/* Breadcrumb */}
          <div className="mv-breadcrumb">
            <button onClick={() => navigate('/dashboard/student')} className="mv-bc-link">Dashboard</button>
            <span className="mv-bc-sep">›</span>
            <button onClick={() => setSelectedSubModule(null)} className="mv-bc-link">{module.titre}</button>
            <span className="mv-bc-sep">›</span>
            <span className="mv-bc-current">{selectedSubModule.titre}</span>
          </div>

          {/* Header */}
          <div className="mv-header">
            <button className="mv-back-btn" onClick={() => setSelectedSubModule(null)}>
              ← Retour au module
            </button>
            <div className="mv-header-body">
              <div className="mv-header-icon">📖</div>
              <div>
                <h1 className="mv-title">{selectedSubModule.titre}</h1>
                {selectedSubModule.description && (
                  <p className="mv-subtitle">{selectedSubModule.description}</p>
                )}
              </div>
            </div>
          </div>

          {/* Course-level Generation */}
          {selectedSubModule.pdfs && selectedSubModule.pdfs.length > 0 && (
            <div className="mv-global-banner">
              <div className="mv-global-banner-left">
                <div className="mv-global-icon">🎯</div>
                <div>
                  <h3>Évaluation du Cours</h3>
                  <p>Couvre <strong>tous les PDFs</strong> de ce cours</p>
                </div>
              </div>
              <div className="mv-global-buttons">
                <button
                  className={`mv-btn mv-btn-outline-blue ${isGenCourseQuiz ? 'mv-btn-loading' : ''}`}
                  onClick={() => handleGenerateQuizForCourse(courseKey)}
                  disabled={isGenerating}
                >
                  {isGenCourseQuiz ? <><span className="mv-spinner"></span> Génération...</> : '📝 Quiz du Cours'}
                </button>
                <button
                  className={`mv-btn mv-btn-outline-violet ${isGenCourseEx ? 'mv-btn-loading' : ''}`}
                  onClick={() => handleGenerateExercisesForCourse(courseKey)}
                  disabled={isGenerating}
                >
                  {isGenCourseEx ? <><span className="mv-spinner"></span> Génération...</> : '✏️ Exercices du Cours'}
                </button>
              </div>
            </div>
          )}

          {/* PDFs Grid */}
          <div className="mv-section">
            <h2 className="mv-section-title">Fichiers PDF</h2>
            {selectedSubModule.pdfs && selectedSubModule.pdfs.length > 0 ? (
              <div className="mv-pdfs-grid">
                {selectedSubModule.pdfs.map(pdf => {
                  const pdfKey = pdf._id || pdf.id
                  const isGenPdfQuiz = generating === `pdf-quiz-${pdfKey}`
                  const isGenPdfEx = generating === `pdf-ex-${pdfKey}`

                  return (
                    <div key={pdfKey} className={`mv-pdf-card ${isGenPdfQuiz || isGenPdfEx ? 'mv-generating' : ''}`}>
                      {(isGenPdfQuiz || isGenPdfEx) && (
                        <div className="mv-gen-overlay">
                          <div className="mv-gen-pulse"></div>
                          <span>🤖 L'IA génère<span className="mv-dots">...</span></span>
                          <div className="mv-gen-bar"></div>
                        </div>
                      )}
                      <div className="mv-pdf-card-top">
                        <div className="mv-pdf-icon">📄</div>
                        <div className="mv-pdf-info">
                          <div className="mv-pdf-name">{pdf.nom_fichier}</div>
                          <div className="mv-pdf-size">{(pdf.taille_fichier / 1024).toFixed(1)} KB</div>
                        </div>
                        <span className="mv-badge mv-badge-green">PDF disponible</span>
                      </div>
                      <div className="mv-pdf-actions">
                        <button
                          className="mv-btn mv-btn-ghost"
                          onClick={() => handlePDFClick(pdf)}
                          disabled={isGenerating}
                        >
                          Voir
                        </button>
                        <button
                          className={`mv-btn mv-btn-outline-blue mv-btn-sm ${isGenPdfQuiz ? 'mv-btn-loading' : ''}`}
                          onClick={() => handleGenerateQuiz(pdfKey)}
                          disabled={isGenerating}
                        >
                          {isGenPdfQuiz ? <span className="mv-spinner mv-spinner-sm"></span> : '📝 Quiz PDF'}
                        </button>
                        <button
                          className={`mv-btn mv-btn-outline-violet mv-btn-sm ${isGenPdfEx ? 'mv-btn-loading' : ''}`}
                          onClick={() => handleGenerateExercises(pdfKey)}
                          disabled={isGenerating}
                        >
                          {isGenPdfEx ? <span className="mv-spinner mv-spinner-sm"></span> : '✏️ Exercices'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mv-empty">Aucun PDF disponible pour ce cours.</div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN MODULE VIEW ───────────────────────────────────────────────────────
  const isGenGlobalQuiz = generating === 'global-quiz'
  const isGenGlobalEx = generating === 'global-ex'

  return (
    <div className="mv-wrap">
      <div className="mv-container">
        {/* Breadcrumb */}
        <div className="mv-breadcrumb">
          <button onClick={() => navigate('/dashboard/student')} className="mv-bc-link">Dashboard</button>
          <span className="mv-bc-sep">›</span>
          <button onClick={() => navigate(-1)} className="mv-bc-link">Modules</button>
          <span className="mv-bc-sep">›</span>
          <span className="mv-bc-current">{module.titre}</span>
        </div>

        {/* Page Header */}
        <div className="mv-page-header">
          <div className="mv-header-body">
            <div className="mv-header-icon mv-header-icon-lg">🎓</div>
            <div>
              <h1 className="mv-title mv-title-lg">{module.titre}</h1>
              <p className="mv-subtitle">
                {module.description || 'Explorez vos cours et générez vos quiz personnalisés'}
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions Banner */}
        <div className="mv-global-banner mv-global-banner-main">
          <div className="mv-global-banner-left">
            <div className="mv-global-icon">🎯</div>
            <div>
              <h3>Évaluation Globale du Module</h3>
              <p>Couvre <strong>tous les cours</strong> de ce module</p>
            </div>
          </div>
          <div className="mv-global-buttons">
            <button
              className={`mv-btn mv-btn-outline-blue ${isGenGlobalQuiz ? 'mv-btn-loading' : ''}`}
              onClick={handleQuizGlobal}
              disabled={isGenerating}
            >
              {isGenGlobalQuiz ? <><span className="mv-spinner"></span> Chargement...</> : '📝 Quiz Global'}
            </button>
            <button
              className={`mv-btn mv-btn-outline-violet ${isGenGlobalEx ? 'mv-btn-loading' : ''}`}
              onClick={handleExercicesGlobaux}
              disabled={isGenerating}
            >
              {isGenGlobalEx ? <><span className="mv-spinner"></span> Chargement...</> : '✏️ Exercices Globaux'}
            </button>
            <button
              className="mv-btn mv-btn-ghost"
              onClick={handleFeedbacks}
              disabled={isGenerating}
            >
              👀 Feedbacks
            </button>
          </div>
          {globalActionError && (
            <p className="error" style={{ marginTop: '0.75rem' }}>Erreur: {globalActionError}</p>
          )}
        </div>

        {/* Sub-modules */}
        <div className="mv-section">
          <h2 className="mv-section-title">Cours disponibles</h2>
          <p className="mv-section-sub">Sélectionnez un cours pour explorer les PDFs et générer des évaluations ciblées.</p>

          {module.sub_modules && module.sub_modules.length > 0 ? (
            <div className="mv-sub-modules-grid">
              {module.sub_modules.map((subModule, i) => (
                <div
                  key={subModule._id}
                  className="mv-sub-card"
                  style={{ animationDelay: `${i * 0.07}s` }}
                >
                  <div className="mv-sub-card-header">
                    <div className="mv-sub-icon">📚</div>
                    <div className="mv-sub-info">
                      <h3 className="mv-sub-title">{subModule.titre}</h3>
                      {subModule.description && (
                        <p className="mv-sub-desc">{subModule.description}</p>
                      )}
                    </div>
                  </div>

                  {subModule.sous_modules && subModule.sous_modules.length > 0 && (
                    <div className="mv-sub-sub-list">
                      <div className="mv-sub-sub-label">Sous-cours</div>
                      {subModule.sous_modules.map(subSub => (
                        <button
                          key={subSub._id}
                          className="mv-sub-sub-item"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSubModuleClick(subSub._id)
                          }}
                        >
                          <span className="mv-sub-sub-dot"></span>
                          {subSub.titre}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mv-sub-card-footer">
                    <button
                      className="mv-btn mv-btn-primary-full"
                      onClick={() => handleSubModuleClick(subModule._id)}
                    >
                      Explorer ce cours →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mv-empty">Aucun cours disponible pour ce module.</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModuleView
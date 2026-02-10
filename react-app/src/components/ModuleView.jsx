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
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

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
      await pdfsAPI.download(pdf.id)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors du téléchargement du PDF: ' + err.message)
    }
  }

  const handleGenerateQuiz = async (pdfId) => {
    try {
      setError('')
      setGenerating(true)
      
      const { quiz } = await quizAPI.generate(pdfId)
      
      alert('Quiz généré avec succès! Vous allez être redirigé vers le quiz.')
      // Rediriger vers la page du quiz
      navigate(`/quiz/${quiz.id}`)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération du quiz: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateExercises = async (pdfId) => {
    try {
      setError('')
      setGenerating(true)
      
      const { exercises } = await exercisesAPI.generate(pdfId)
      alert(`${exercises.length} exercices générés avec succès! Vous allez être redirigé vers le premier exercice.`)
      // Rediriger vers les exercices
      navigate(`/exercises/${exercises[0].id}`)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération des exercices: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (loading) return <div className="loading">Chargement...</div>
  if (error) return <div className="error">Erreur: {error}</div>
  if (!module) return <div className="error">Module non trouvé</div>

  const handleGenerateQuizForCourse = async (subModuleId) => {
    try {
      setError('')
      setGenerating(true)
      
      const response = await quizAPI.generateForCourse(subModuleId)
      const { quiz, message } = response
      
      if (message && message.includes('déjà')) {
        // Quiz déjà généré
        alert('Quiz déjà généré pour ce cours! Vous allez être redirigé vers le quiz pour voir votre travail et la correction.')
      } else {
        alert('Quiz généré avec succès pour ce cours! Il couvre tous les PDFs du cours. Vous allez être redirigé vers le quiz.')
      }
      navigate(`/quiz/${quiz.id}`)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération du quiz: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateExercisesForCourse = async (subModuleId) => {
    try {
      setError('')
      setGenerating(true)
      
      const response = await exercisesAPI.generateForCourse(subModuleId)
      const { exercises, message } = response
      
      if (message && message.includes('déjà')) {
        // Exercices déjà générés
        alert(`Exercices déjà générés pour ce cours! Vous allez être redirigé vers le premier exercice pour voir votre travail et la correction.`)
      } else {
        alert(`${exercises.length} exercices générés avec succès pour ce cours! Ils couvrent tous les PDFs du cours. Vous allez être redirigé vers le premier exercice.`)
      }
      navigate(`/exercises/${exercises[0].id}`)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération des exercices: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  if (selectedSubModule) {
    return (
      <div className="module-view">
        <button className="back-button" onClick={() => setSelectedSubModule(null)}>
          ← Retour au module
        </button>
        <h2>{selectedSubModule.titre}</h2>
        {selectedSubModule.description && <p>{selectedSubModule.description}</p>}
        
        {/* Boutons de génération pour le cours */}
        {selectedSubModule.pdfs && selectedSubModule.pdfs.length > 0 && (
          <div className="course-actions-section" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
            <h3>🎯 Évaluation du Cours</h3>
            <p style={{ marginBottom: '1rem', color: '#666' }}>
              Générez un quiz ou des exercices qui couvrent <strong>tous les PDFs</strong> de ce cours.
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => handleGenerateQuizForCourse(selectedSubModule.id)} 
                className="btn btn-primary"
                disabled={generating}
              >
                {generating ? 'Génération...' : '📝 Générer Quiz du Cours'}
              </button>
              <button 
                onClick={() => handleGenerateExercisesForCourse(selectedSubModule.id)} 
                className="btn btn-primary"
                disabled={generating}
              >
                {generating ? 'Génération...' : '✏️ Générer Exercices du Cours'}
              </button>
            </div>
          </div>
        )}
        
        <div className="pdfs-section">
          <h3>Fichiers PDF</h3>
          {selectedSubModule.pdfs && selectedSubModule.pdfs.length > 0 ? (
            <div className="pdfs-grid">
              {selectedSubModule.pdfs.map(pdf => (
                <div key={pdf.id} className="pdf-card">
                  <div className="pdf-icon">📄</div>
                  <h4>{pdf.nom_fichier}</h4>
                  <p>{(pdf.taille_fichier / 1024).toFixed(2)} KB</p>
                  <div className="pdf-actions">
                    <button onClick={() => handlePDFClick(pdf)} className="btn btn-primary">
                      Voir le PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>Aucun PDF disponible</p>
          )}
        </div>
      </div>
    )
  }

  const handleGenerateGlobalQuiz = async () => {
    try {
      setError('')
      setGenerating(true)
      
      const { quiz } = await quizAPI.generateGlobal(moduleId)
      
      alert('Quiz global généré avec succès! Il couvre tous les cours. Vous allez être redirigé vers le quiz.')
      navigate(`/quiz/${quiz.id}`)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération du quiz global: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateGlobalExercises = async () => {
    try {
      setError('')
      setGenerating(true)
      
      const { exercises } = await exercisesAPI.generateGlobal(moduleId)
      alert(`${exercises.length} exercices globaux générés avec succès! Ils couvrent tous les cours. Vous allez être redirigé vers le premier exercice.`)
      navigate(`/exercises/${exercises[0].id}`)
    } catch (err) {
      setError(err.message)
      alert('Erreur lors de la génération des exercices globaux: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="module-view">
      <h1>{module.titre}</h1>
      {module.description && <p className="module-description">{module.description}</p>}
      
      {/* Boutons de génération globale */}
      <div className="global-actions">
        <h2>🎯 Évaluation Globale du Module</h2>
        <p className="info-text">
          Générez un quiz ou des exercices qui couvrent <strong>tous les cours</strong> de ce module.
        </p>
        <div className="global-buttons">
          <button 
            onClick={handleGenerateGlobalQuiz} 
            className="btn btn-primary"
            disabled={generating}
          >
            {generating ? 'Génération...' : '📝 Générer Quiz Global'}
          </button>
          <button 
            onClick={handleGenerateGlobalExercises} 
            className="btn btn-primary"
            disabled={generating}
          >
            {generating ? 'Génération...' : '✏️ Générer Exercices Globaux'}
          </button>
          <button
            onClick={() => navigate(`/module/${moduleId}/feedback`)}
            className="btn btn-secondary"
          >
            👀 Voir feedbacks
          </button>
        </div>
      </div>
      
      <div className="sub-modules-section">
        <h2>Cours</h2>
        {module.sub_modules && module.sub_modules.length > 0 ? (
          <div className="sub-modules-grid">
            {module.sub_modules.map(subModule => (
              <div 
                key={subModule.id} 
                className="sub-module-card"
                onClick={() => handleSubModuleClick(subModule.id)}
              >
                <h3>{subModule.titre}</h3>
                {subModule.description && <p>{subModule.description}</p>}
                {subModule.sous_modules && subModule.sous_modules.length > 0 && (
                  <div className="sub-sub-modules">
                    <strong>Sous-cours:</strong>
                    <ul>
                      {subModule.sous_modules.map(subSub => (
                        <li key={subSub.id} onClick={(e) => {
                          e.stopPropagation()
                          handleSubModuleClick(subSub.id)
                        }}>
                          {subSub.titre}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>Aucun cours disponible</p>
        )}
      </div>
    </div>
  )
}

export default ModuleView


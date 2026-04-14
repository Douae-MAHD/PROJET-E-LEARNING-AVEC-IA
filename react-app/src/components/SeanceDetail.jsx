import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { seancesAPI, pdfsAPI, progressionAPI, quizAPI, exercisesAPI } from '../services/api'
import './SeanceDetail.css'

function SeanceDetail() {
  const { seanceId } = useParams()
  const navigate = useNavigate()

  const [seance, setSeance] = useState(null)
  const [progression, setProgression] = useState(null)
  const [pdfs, setPdfs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloadingId, setDownloadingId] = useState(null)
  const [checkingAccess, setCheckingAccess] = useState(false)

  useEffect(() => {
    loadData()
  }, [seanceId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      // ─── GARDE D'ACCÈS BACKEND ───────────────────────────────────────
      // Vérifie avec le serveur AVANT de charger quoi que ce soit.
      // Empêche l'accès par URL directe (/seance/:id tapé dans le navigateur).
      let accesData
      try {
        accesData = await progressionAPI.verifierAcces(seanceId)
      } catch (accesErr) {
        setError('🔒 Séance bloquée. Vous devez valider la séance précédente.')
        setLoading(false)
        return
      }

      if (!accesData?.accessible) {
        setError('🔒 Séance bloquée. Vous devez valider la séance précédente.')
        setLoading(false)
        return
      }
      // ─────────────────────────────────────────────────────────────────

      const [seanceData, progressionData, pdfsData] = await Promise.all([
        seancesAPI.getById(seanceId),
        progressionAPI.getBySeance(seanceId),
        typeof pdfsAPI.getBySeance === 'function'
          ? pdfsAPI.getBySeance(seanceId)
          : Promise.resolve([])
      ])

      let resolvedPdfs = Array.isArray(pdfsData) ? pdfsData : []

      if (!resolvedPdfs.length && typeof pdfsAPI.getBySubModule === 'function') {
        const subModuleId = typeof seanceData?.subModuleId === 'object'
          ? seanceData?.subModuleId?._id
          : seanceData?.subModuleId

        if (subModuleId) {
          const submodulePdfs = await pdfsAPI.getBySubModule(subModuleId)
          const allSubmodulePdfs = Array.isArray(submodulePdfs) ? submodulePdfs : []
          resolvedPdfs = allSubmodulePdfs.filter((pdf) => {
            const pdfSeanceId = typeof pdf?.seanceId === 'object' ? pdf?.seanceId?._id : pdf?.seanceId
            return pdfSeanceId ? pdfSeanceId === seanceId : true
          })
        }
      }

      setSeance(seanceData || null)
      setProgression(progressionData || null)
      setPdfs(resolvedPdfs)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement de la séance')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPdf = async (pdfId) => {
    try {
      setDownloadingId(pdfId)
      await pdfsAPI.download(pdfId)
    } catch (err) {
      setError(err.message || 'Erreur lors du téléchargement')
    } finally {
      setDownloadingId(null)
    }
  }

  // ─── NAVIGATION QUIZ — vérification backend obligatoire avant navigate ──
  const handleGoQuiz = async () => {
    try {
      setCheckingAccess(true)
      const accesData = await progressionAPI.verifierAcces(seanceId)
      if (!accesData?.accessible) {
        alert('🔒 Accès refusé. Validez la séance précédente.')
        return
      }

      const response = await quizAPI.generateForSeance(seanceId)
      const quizId = response?._id || response?.quizId || response?.quiz?._id
      if (!quizId) {
        throw new Error('Impossible de récupérer le quiz généré')
      }

      if (response?.isExisting && response?.isSubmitted) {
        navigate(`/quiz/${quizId}?showFeedbackOnly=true`)
      } else {
        navigate(`/quiz/${quizId}`)
      }
    } catch (err) {
      alert(err?.message || 'Erreur lors de la génération du quiz.')
    } finally {
      setCheckingAccess(false)
    }
  }

  // ─── NAVIGATION EXERCISE — vérification backend obligatoire avant navigate
  const handleGoExercise = async () => {
    try {
      setCheckingAccess(true)
      const accesData = await progressionAPI.verifierAcces(seanceId)
      if (!accesData?.accessible) {
        alert('🔒 Accès refusé. Validez la séance précédente.')
        return
      }

      const response = await exercisesAPI.generateForSeance(seanceId)
      const exercises = Array.isArray(response) ? response : (response?.exercises || [])
      const firstExerciseId = exercises?.[0]?._id || exercises?.[0]?.id

      if (!firstExerciseId) {
        throw new Error('Aucun exercice généré pour cette séance')
      }

      navigate(`/exercise/${firstExerciseId}`)
    } catch (err) {
      alert(err?.message || 'Erreur lors de la génération de l\'exercice.')
    } finally {
      setCheckingAccess(false)
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const getStatut = () => progression?.statut || 'non_commencee'

  const getStatutLabel = (statut) => {
    if (statut === 'validee') return '✅ Validée'
    if (statut === 'en_cours') return '🔓 En cours'
    return '🔒 Bloquée'
  }

  const getTypeLabel = (type) => (type === 'presentielle' ? 'Présentielle' : 'Distanciel')

  const formatDate = (value) => {
    if (!value) return null
    return new Date(value).toLocaleString('fr-FR')
  }

  const statut = getStatut()
  const isBlocked = statut === 'non_commencee'
  const isBusy = loading || downloadingId !== null || checkingAccess

  if (loading) {
    return (
      <div className="sd-loading-screen">
        <div className="sd-loader-ring"></div>
        <p>Chargement de la séance<span className="sd-dots">...</span></p>
      </div>
    )
  }

  // Séance bloquée — écran dédié, pas d'accès aux activités
  if (error && error.includes('🔒')) {
    return (
      <div className="sd-error-screen">
        <div className="sd-error-icon">🔒</div>
        <p>{error}</p>
        <div className="sd-error-actions">
          <button className="sd-btn sd-btn-secondary" onClick={() => navigate(-1)}>
            ← Retour aux séances
          </button>
        </div>
      </div>
    )
  }

  if (error && !seance) {
    return (
      <div className="sd-error-screen">
        <div className="sd-error-icon">⚠️</div>
        <p>{error}</p>
        <div className="sd-error-actions">
          <button className="sd-btn sd-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
          <button className="sd-btn sd-btn-primary" onClick={loadData}>Réessayer</button>
        </div>
      </div>
    )
  }

  if (!seance) {
    return (
      <div className="sd-error-screen">
        <p>Séance non trouvée</p>
        <button className="sd-btn sd-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
      </div>
    )
  }

  return (
    <div className="sd-wrap">
      <div className="sd-container">
        <button className="sd-back-btn" onClick={() => navigate(-1)} disabled={isBusy}>
          ← Retour
        </button>

        {error && <div className="sd-inline-error">{error}</div>}

        <div className="sd-header-card">
          <h1 className="sd-title">{seance.titre}</h1>
          <div className="sd-badges">
            <span className="sd-badge sd-badge-type">{getTypeLabel(seance.type)}</span>
            <span className={`sd-badge ${statut === 'validee' ? 'sd-badge-done' : statut === 'en_cours' ? 'sd-badge-current' : 'sd-badge-locked'}`}>
              {getStatutLabel(statut)}
            </span>
          </div>
          {seance.duree ? <p className="sd-meta">Durée: {seance.duree} min</p> : null}
        </div>

        <section className="sd-section">
          <h2 className="sd-section-title">📄 Supports de cours</h2>
          {pdfs.length === 0 ? (
            <div className="sd-empty">Aucun PDF disponible</div>
          ) : (
            <div className="sd-pdfs-list">
              {pdfs.map((pdf) => (
                <div key={pdf._id} className="sd-pdf-item">
                  <div>
                    <strong>{pdf.nomFichier || pdf.nom_fichier || 'PDF'}</strong>
                  </div>
                  <button
                    className="sd-btn sd-btn-secondary"
                    onClick={() => handleDownloadPdf(pdf._id)}
                    disabled={isBusy}
                  >
                    {downloadingId === pdf._id ? 'Téléchargement...' : 'Télécharger'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="sd-section">
          <h2 className="sd-section-title">📝 Activités</h2>
          {isBlocked ? (
            <div className="sd-blocked-notice">
              🔒 Les activités sont bloquées. Complétez la séance précédente pour y accéder.
            </div>
          ) : (
            <div className="sd-actions-grid">
              <button
                className="sd-btn sd-btn-primary sd-btn-big"
                disabled={isBusy}
                onClick={handleGoQuiz}
              >
                {checkingAccess ? '⏳ Vérification...' : 'Faire le Quiz'}
              </button>

              <button
                className="sd-btn sd-btn-primary sd-btn-big"
                disabled={isBusy}
                onClick={handleGoExercise}
              >
                {checkingAccess ? '⏳ Vérification...' : "Faire l'Exercice"}
              </button>
            </div>
          )}
        </section>

        {progression && (
          <section className="sd-section">
            <h2 className="sd-section-title">📊 Progression</h2>
            <div className="sd-progress-grid">
              {progression.scoreQuiz !== null && progression.scoreQuiz !== undefined && (
                <div className="sd-progress-item">
                  <span>Score Quiz</span>
                  <strong>{progression.scoreQuiz}/100</strong>
                </div>
              )}
              {progression.scoreExercice !== null && progression.scoreExercice !== undefined && (
                <div className="sd-progress-item">
                  <span>Score Exercice</span>
                  <strong>{progression.scoreExercice}/100</strong>
                </div>
              )}
              <div className="sd-progress-item">
                <span>Tentatives</span>
                <strong>{progression.tentatives ?? 0}</strong>
              </div>
              {progression.completedAt && (
                <div className="sd-progress-item">
                  <span>Date de validation</span>
                  <strong>{formatDate(progression.completedAt)}</strong>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default SeanceDetail
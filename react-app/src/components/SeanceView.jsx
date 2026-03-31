import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { seancesAPI, progressionAPI } from '../services/api'
import './SeanceView.css'

function SeanceView() {
  const { moduleId } = useParams()
  const navigate = useNavigate()

  const [seances, setSeances] = useState([])
  const [progressions, setProgressions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [moduleId])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [seancesData, progressionsData] = await Promise.all([
        seancesAPI.getByModule(moduleId),
        progressionAPI.getByModule(moduleId)
      ])

      const sortedSeances = (Array.isArray(seancesData) ? seancesData : [])
        .slice()
        .sort((a, b) => (a?.ordre ?? Number.MAX_SAFE_INTEGER) - (b?.ordre ?? Number.MAX_SAFE_INTEGER))

      setSeances(sortedSeances)
      setProgressions(Array.isArray(progressionsData) ? progressionsData : [])
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des séances')
    } finally {
      setLoading(false)
    }
  }

  const getStatut = (seanceId) => {
    const progression = progressions.find((item) => {
      const progressionSeanceId = typeof item?.seanceId === 'object'
        ? item?.seanceId?._id
        : item?.seanceId
      return progressionSeanceId === seanceId
    })

    return progression?.statut || 'non_commencee'
  }

  const getSeanceTypeLabel = (type) => (type === 'presentielle' ? 'Présentielle' : 'Distanciel')

  const getStatutConfig = (statut) => {
    if (statut === 'validee') {
      return {
        cardClass: 'sv-card sv-card-done',
        badgeClass: 'sv-badge sv-badge-done',
        badgeLabel: '✅ Validée',
        buttonClass: 'sv-btn sv-btn-secondary',
        buttonLabel: 'Revoir',
        clickable: true
      }
    }

    if (statut === 'en_cours') {
      return {
        cardClass: 'sv-card sv-card-current',
        badgeClass: 'sv-badge sv-badge-current',
        badgeLabel: '🔓 En cours',
        buttonClass: 'sv-btn sv-btn-primary',
        buttonLabel: 'Accéder',
        clickable: true
      }
    }

    return {
      cardClass: 'sv-card sv-card-locked',
      badgeClass: 'sv-badge sv-badge-locked',
      badgeLabel: '🔒 Bloquée',
      buttonClass: 'sv-btn sv-btn-locked',
      buttonLabel: 'Bloquée',
      clickable: false
    }
  }

  const handleOpenSeance = async (seance) => {
    // 1. Vérification locale rapide (UX)
    const statut = getStatut(seance._id)
    if (statut === 'non_commencee') return

    // 2. Vérification backend obligatoire — source de vérité réelle
    try {
      const accesData = await progressionAPI.verifierAcces(seance._id)
      if (!accesData?.accessible) {
        alert('Séance bloquée. Veuillez valider la séance précédente.')
        return
      }
      navigate(`/seance/${seance._id}`)
    } catch (err) {
      const status = err?.response?.status || err?.status
      if (status === 403) {
        alert('Séance bloquée. Veuillez valider la séance précédente.')
      } else {
        alert('Erreur lors de la vérification. Réessayez.')
      }
    }
  }

  if (loading) {
    return (
      <div className="sv-loading-screen">
        <div className="sv-loader-ring"></div>
        <p>Chargement des séances<span className="sv-dots">...</span></p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="sv-error-screen">
        <div className="sv-error-icon">⚠️</div>
        <p>{error}</p>
        <div className="sv-error-actions">
          <button className="sv-btn sv-btn-secondary" onClick={() => navigate(-1)}>Retour</button>
          <button className="sv-btn sv-btn-primary" onClick={loadData}>Réessayer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="sv-wrap">
      <div className="sv-container">
        <button className="sv-back-btn" onClick={() => navigate(-1)}>
          ← Retour
        </button>

        <div className="sv-header">
          <h1 className="sv-title">Séances du module</h1>
          <p className="sv-subtitle">Suivez votre progression séance par séance</p>
        </div>

        {seances.length === 0 ? (
          <div className="sv-empty">Aucune séance disponible</div>
        ) : (
          <div className="sv-list">
            {seances.map((seance) => {
              const statut = getStatut(seance._id)
              const config = getStatutConfig(statut)

              return (
                <div
                  key={seance._id}
                  className={config.cardClass}
                  onClick={() => config.clickable && handleOpenSeance(seance)}
                  role={config.clickable ? 'button' : undefined}
                  tabIndex={config.clickable ? 0 : -1}
                  onKeyDown={(event) => {
                    if (!config.clickable) return
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      handleOpenSeance(seance)
                    }
                  }}
                >
                  <div className="sv-card-top">
                    <div className="sv-left">
                      <div className="sv-icon">📘</div>
                      <div>
                        <h3 className="sv-card-title">Séance {seance.ordre ?? '-'} — {seance.titre}</h3>
                        <p className="sv-card-meta">
                          {getSeanceTypeLabel(seance.type)}
                          {seance.duree ? ` | ${seance.duree} min` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={config.badgeClass}>{config.badgeLabel}</span>
                  </div>

                  <div className="sv-actions">
                    <button
                      type="button"
                      className={config.buttonClass}
                      disabled={!config.clickable}
                      onClick={(event) => {
                        event.stopPropagation()
                        if (config.clickable) {
                          handleOpenSeance(seance)
                        }
                      }}
                    >
                      {config.buttonLabel}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default SeanceView
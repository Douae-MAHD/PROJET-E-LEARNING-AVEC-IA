import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { exercisesAPI, pdfsAPI, seancesAPI } from '../services/api'

function SeancePage() {
  const { id: seanceId } = useParams()
  const navigate = useNavigate()
  const [seance, setSeance] = useState(null)
  const [pdfs, setPdfs] = useState([])
  const [exercises, setExercises] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        setError('')

        const seanceData = await seancesAPI.getById(seanceId)
        console.log('SeancePage.getById response:', seanceData)
        setSeance(seanceData)

        const phase = seanceData?.phase || 'prelab'
        if (phase === 'prelab') {
          const resolvedSubModuleId = typeof seanceData?.subModuleId === 'object'
            ? seanceData?.subModuleId?._id
            : seanceData?.subModuleId

          if (resolvedSubModuleId) {
            navigate(`/qcm/${resolvedSubModuleId}`, { replace: true })
            return
          }
        }

        if (phase === 'postlab') {
          navigate(`/evaluation/${seanceId}`, { replace: true })
          return
        }

        const resolvedSubModuleId = typeof seanceData?.subModuleId === 'object'
          ? seanceData?.subModuleId?._id
          : seanceData?.subModuleId

        const [pdfResponse, exercisesResponse] = await Promise.all([
          resolvedSubModuleId
            ? pdfsAPI.getBySubModule(resolvedSubModuleId)
            : Promise.resolve([]),
          exercisesAPI.generateForSeance(seanceId),
        ])

        console.log('SeancePage.getBySubModule response:', pdfResponse)
        console.log('SeancePage.generateForSeance response:', exercisesResponse)

        setPdfs(Array.isArray(pdfResponse) ? pdfResponse : [])

        const normalizedExercises = Array.isArray(exercisesResponse)
          ? exercisesResponse
          : Array.isArray(exercisesResponse?.exercises)
            ? exercisesResponse.exercises
            : []

        setExercises(normalizedExercises)
      } catch (err) {
        console.error('SeancePage load error:', err)
        setError(err.message || 'Erreur lors du chargement de la séance')
      } finally {
        setLoading(false)
      }
    }

    if (seanceId) {
      loadData()
    }
  }, [seanceId])

  const phaseLabel = (() => {
    const phase = seance?.phase || 'prelab'
    if (phase === 'prelab') return 'PreLab Seance'
    if (phase === 'postlab') return 'PostLab Seance'
    return 'InLab Seance'
  })()

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>{phaseLabel}</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <h1>{phaseLabel}</h1>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '980px', margin: '0 auto' }}>
      <h1>{phaseLabel}</h1>
      <h2>{seance?.titre || 'Séance'}</h2>

      <section style={{ marginTop: '20px' }}>
        <h3>PDFs</h3>
        {pdfs.length === 0 ? (
          <p>Aucun PDF disponible.</p>
        ) : (
          <ul>
            {pdfs.map((pdf) => {
              const pdfId = pdf._id || pdf.id
              const name = pdf.nomFichier || pdf.nom_fichier || pdf.title || 'PDF'
              const url = pdf.url || pdf.fileUrl

              return (
                <li key={pdfId} style={{ marginBottom: '8px' }}>
                  <span>{name}</span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ marginLeft: '12px' }}
                    >
                      View
                    </a>
                  ) : null}
                  {pdfId ? (
                    <a href={`http://localhost:5000/api/pdfs/${pdfId}/download`} style={{ marginLeft: '12px' }}>
                      Download
                    </a>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section style={{ marginTop: '20px' }}>
        <h3>Exercises</h3>
        {exercises.length === 0 ? (
          <p>Aucun exercice disponible.</p>
        ) : (
          <ol>
            {exercises.map((exercise, index) => (
              <li key={exercise._id || exercise.id || index} style={{ marginBottom: '10px' }}>
                <strong>{exercise.titre || exercise.title || `Exercice ${index + 1}`}</strong>
                <p style={{ margin: '4px 0' }}>{exercise.enonce || exercise.question || exercise.description || ''}</p>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

export default SeancePage

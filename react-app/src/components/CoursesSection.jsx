import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { modulesAPI } from '../services/api'
import './Card.css'

function CoursesSection({ userType }) {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadModules()
  }, [])

  const loadModules = async () => {
    try {
      setLoading(true)
      const data = await modulesAPI.getAll()
      setModules(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAccessCourse = (moduleId) => {
    navigate(`/module/${moduleId}`)
  }

  if (loading) return (
    <section className="dashboard-card courses-section">
      <div className="card-header">
        <h2>📚 Mes Cours</h2>
      </div>
      <div className="card-content">
        <p>Chargement...</p>
      </div>
    </section>
  )

  if (error) return (
    <section className="dashboard-card courses-section">
      <div className="card-header">
        <h2>📚 Mes Cours</h2>
      </div>
      <div className="card-content">
        <p className="error">Erreur: {error}</p>
      </div>
    </section>
  )

  return (
    <section className="dashboard-card courses-section">
      <div className="card-header">
        <h2>📚 Mes Cours</h2>
      </div>
      <div className="card-content">
        {modules.length > 0 ? (
          <div className="course-list">
            {modules.map((module) => (
              <div key={module.id} className="course-item">
                <h3>{module.titre}</h3>
                <p>Professeur: {module.professeur_nom}</p>
                {module.description && <p className="course-description">{module.description}</p>}
                <button
                  className="btn btn-outline"
                  onClick={() => handleAccessCourse(module.id)}
                  data-course={module.id}
                >
                  Accéder au cours
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p>Aucun module disponible</p>
        )}
      </div>
    </section>
  )
}

export default CoursesSection




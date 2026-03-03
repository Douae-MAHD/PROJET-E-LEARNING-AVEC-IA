import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { modulesAPI } from '../services/api'
import './Card.css'

function CoursesManagementSection() {
  const [modules, setModules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newModule, setNewModule] = useState({ titre: '', description: '' })
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

  const handleAddCourse = async () => {
    try {
      if (!newModule.titre.trim()) {
        alert('Le titre est requis')
        return
      }
      await modulesAPI.create(newModule)
      setNewModule({ titre: '', description: '' })
      setShowAddForm(false)
      loadModules()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleAccessModule = (moduleId) => {
    navigate(`/teacher/module/${moduleId}`)
  }

  if (loading) return (
    <section className="dashboard-card courses-management-section">
      <div className="card-header">
        <h2>📚 Gestion des Cours</h2>
      </div>
      <div className="card-content">
        <p>Chargement...</p>
      </div>
    </section>
  )

  return (
    <section className="dashboard-card courses-management-section">
      <div className="card-header">
        <h2>📚 Gestion des Cours</h2>
        <button className="btn btn-primary btn-small" onClick={() => setShowAddForm(!showAddForm)}>
          + Ajouter un module
        </button>
      </div>
      <div className="card-content">
        {error && <p className="error">Erreur: {error}</p>}
        
        {showAddForm && (
          <div className="add-module-form">
            <input
              type="text"
              placeholder="Titre du module"
              value={newModule.titre}
              onChange={(e) => setNewModule({ ...newModule, titre: e.target.value })}
              className="form-input"
            />
            <textarea
              placeholder="Description (optionnel)"
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
              className="form-textarea"
              rows="3"
            />
            <div className="form-actions">
              <button className="btn btn-primary" onClick={handleAddCourse}>
                Créer
              </button>
              <button className="btn btn-secondary" onClick={() => setShowAddForm(false)}>
                Annuler
              </button>
            </div>
          </div>
        )}

        <div className="course-list">
          {modules.length > 0 ? (
            modules.map((module) => (
              <div key={module._id} className="course-item">
                <div className="course-info">
                  <h3>{module.titre}</h3>
                  {module.description && <p>{module.description}</p>}
                </div>
                <div className="course-actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => handleAccessModule(module._id)}
                  >
                    Gérer
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p>Aucun module créé</p>
          )}
        </div>
      </div>
    </section>
  )
}

export default CoursesManagementSection




import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { modulesAPI, pdfsAPI } from '../services/api'
import StudentEnrollment from './StudentEnrollment'
import './SubModuleManagement.css'

function SubModuleManagement() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const [module, setModule] = useState(null)
  const [selectedSubModule, setSelectedSubModule] = useState(null)
  const [showAddSubModule, setShowAddSubModule] = useState(false)
  const [newSubModule, setNewSubModule] = useState({ titre: '', description: '', parentSubModuleId: null })
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
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

  const handleAddSubModule = async () => {
    try {
      if (!newSubModule.titre.trim()) {
        alert('Le titre est requis')
        return
      }
      await modulesAPI.createSubModule(moduleId, newSubModule)
      setNewSubModule({ titre: '', description: '', parentSubModuleId: null })
      setShowAddSubModule(false)
      loadModule()
    } catch (err) {
      setError(err.message)
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (!selectedSubModule) {
      alert('Veuillez sélectionner un cours')
      return
    }

    try {
      setUploading(true)
      setError('')
      await pdfsAPI.upload(selectedSubModule._id, file)
      alert('PDF uploadé avec succès!')
      // Recharger le cours
      await handleSubModuleClick(selectedSubModule._id)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeletePdf = async (pdfId) => {
    if (!window.confirm('Supprimer ce PDF ?')) return
    try {
      setError('')
      await pdfsAPI.delete(pdfId)
      alert('PDF supprimé')
      if (selectedSubModule) {
        await handleSubModuleClick(selectedSubModule._id)
      } else {
        await loadModule()
      }
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div className="loading">Chargement...</div>
  if (error) return <div className="error">Erreur: {error}</div>
  if (!module) return <div className="error">Module non trouvé</div>

  if (selectedSubModule) {
    return (
      <div className="submodule-management">
        <button className="back-button" onClick={() => setSelectedSubModule(null)}>
          ← Retour au module
        </button>
        <h2>{selectedSubModule.titre}</h2>
        
        <div className="upload-section">
          <h3>Uploader un PDF</h3>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            className="file-input"
          />
          {uploading && <p>Upload en cours...</p>}
        </div>

        <div className="pdfs-section">
          <h3>PDFs disponibles</h3>
          {selectedSubModule.pdfs && selectedSubModule.pdfs.length > 0 ? (
            <div className="pdfs-list">
              {selectedSubModule.pdfs.map(pdf => (
                <div key={pdf._id} className="pdf-item">
                  <span>{pdf.nomFichier}</span>
                  <span>{(pdf.tailleFichier / 1024).toFixed(2)} KB</span>
                  <div className="pdf-actions">
                    <button onClick={() => pdfsAPI.download(pdf._id)} className="btn btn-small">
                      Télécharger
                    </button>
                    <button onClick={() => handleDeletePdf(pdf._id)} className="btn btn-small btn-danger">
                      Supprimer
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

  return (
    <div className="submodule-management">
      <h1>{module.titre}</h1>
      
      {/* Section de gestion des étudiants */}
      <div className="enrollment-container" style={{ marginBottom: '2rem', padding: '1.5rem', background: '#f8f9fa', borderRadius: '8px' }}>
        <StudentEnrollment moduleId={moduleId} />
      </div>
      
      <div className="actions">
        <button className="btn btn-primary" onClick={() => setShowAddSubModule(!showAddSubModule)}>
          + Ajouter un cours
        </button>
      </div>

      {showAddSubModule && (
        <div className="add-form">
          <input
            type="text"
            placeholder="Titre du cours"
            value={newSubModule.titre}
            onChange={(e) => setNewSubModule({ ...newSubModule, titre: e.target.value })}
            className="form-input"
          />
          <textarea
            placeholder="Description (optionnel)"
            value={newSubModule.description}
            onChange={(e) => setNewSubModule({ ...newSubModule, description: e.target.value })}
            className="form-textarea"
            rows="3"
          />
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAddSubModule}>
              Créer
            </button>
            <button className="btn btn-secondary" onClick={() => setShowAddSubModule(false)}>
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="sub-modules-list">
        {module.sub_modules && module.sub_modules.length > 0 ? (
          module.sub_modules.map(subModule => (
            <div key={subModule._id} className="sub-module-item" onClick={() => handleSubModuleClick(subModule._id)}>
              <h3>{subModule.titre}</h3>
              {subModule.description && <p>{subModule.description}</p>}
              {subModule.sous_modules && subModule.sous_modules.length > 0 && (
          <div className="sub-sub-modules">
                    <strong>Sous-cours:</strong>
                  <ul>
                    {subModule.sous_modules.map(subSub => (
                      <li key={subSub._id} onClick={(e) => {
                        e.stopPropagation()
                        handleSubModuleClick(subSub._id)
                      }}>
                        {subSub.titre}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (
          <p>Aucun cours créé</p>
        )}
      </div>
    </div>
  )
}

export default SubModuleManagement



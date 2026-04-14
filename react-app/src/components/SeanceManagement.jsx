import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { seancesAPI, pdfsAPI } from '../services/api'
import './SeanceManagement.css'

function SeanceManagement() {
  const { moduleId } = useParams()
  const navigate = useNavigate()

  const [seances, setSeances] = useState([])
  const [selectedSeance, setSelectedSeance] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSeance, setNewSeance] = useState({
    titre: '',
    type: 'presentielle',
    dateSeance: '',
    startTime: '',
    duree: ''
  })
  const [editSeance, setEditSeance] = useState({
    titre: '',
    type: 'presentielle',
    dateSeance: '',
    startTime: '',
    duree: ''
  })
  const [uploading, setUploading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadSeances()
  }, [moduleId])

  const loadSeances = async () => {
    try {
      setLoading(true)
      setError('')
      const seancesData = await seancesAPI.getByModule(moduleId)
      const sortedSeances = (Array.isArray(seancesData) ? seancesData : [])
        .slice()
        .sort((a, b) => (a?.ordre ?? Number.MAX_SAFE_INTEGER) - (b?.ordre ?? Number.MAX_SAFE_INTEGER))
      setSeances(sortedSeances)
    } catch (err) {
      setError(err.message || 'Erreur lors du chargement des séances')
    } finally {
      setLoading(false)
    }
  }

  const toInputDate = (value) => {
    if (!value) return ''
    return new Date(value).toISOString().split('T')[0]
  }

  const handleCreate = async () => {
    try {
      if (!newSeance.titre.trim()) {
        alert('Le titre est requis')
        return
      }

      if (!newSeance.startTime) {
        alert('L\'heure de début est requise')
        return
      }

      setCreating(true)
      setError('')

      const payload = {
        moduleId,
        titre: newSeance.titre.trim(),
        type: newSeance.type,
        ...(newSeance.dateSeance ? { dateSeance: newSeance.dateSeance } : {}),
        startTime: newSeance.startTime,
        ...(newSeance.duree ? { duree: Number(newSeance.duree) } : {})
      }

      await seancesAPI.create(payload)

      alert('Séance créée avec succès')
      setShowAddForm(false)
      setNewSeance({ titre: '', type: 'presentielle', dateSeance: '', startTime: '', duree: '' })
      await loadSeances()
    } catch (err) {
      setError(err.message || 'Erreur lors de la création de la séance')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (seance) => {
    setSelectedSeance(seance)
    setEditSeance({
      titre: seance.titre || '',
      type: seance.type || 'presentielle',
      dateSeance: toInputDate(seance.dateSeance),
      startTime: seance.startTime || '',
      duree: seance.duree ?? ''
    })
  }

  const handleUpdate = async () => {
    if (!selectedSeance?._id) return

    try {
      if (!editSeance.titre.trim()) {
        alert('Le titre est requis')
        return
      }

      if (!editSeance.startTime) {
        alert('L\'heure de début est requise')
        return
      }

      setSavingEdit(true)
      setError('')

      const payload = {
        titre: editSeance.titre.trim(),
        type: editSeance.type,
        ...(editSeance.dateSeance ? { dateSeance: editSeance.dateSeance } : { dateSeance: null }),
        startTime: editSeance.startTime,
        ...(editSeance.duree ? { duree: Number(editSeance.duree) } : { duree: null })
      }

      await seancesAPI.update(selectedSeance._id, payload)

      alert('Séance modifiée avec succès')
      setSelectedSeance(null)
      await loadSeances()
    } catch (err) {
      setError(err.message || 'Erreur lors de la modification de la séance')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async (seanceId) => {
    if (!window.confirm('Supprimer cette séance ?')) return

    try {
      setDeletingId(seanceId)
      setError('')
      await seancesAPI.delete(seanceId)
      alert('Séance supprimée avec succès')
      await loadSeances()
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression de la séance')
    } finally {
      setDeletingId(null)
    }
  }

  const handleUploadPdf = async (seanceId, event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      setUploading(true)
      setError('')
      await pdfsAPI.upload(seanceId, file)
      alert('PDF uploadé avec succès')
    } catch (err) {
      setError(err.message || 'Erreur lors de l\'upload du PDF')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  const formatDate = (value) => {
    if (!value) return 'Date non définie'
    return new Date(value).toLocaleDateString('fr-FR')
  }

  const isBusy = loading || creating || savingEdit || uploading || deletingId !== null

  if (loading) {
    return <div className="sm-loading">Chargement...</div>
  }

  if (error && !seances.length) {
    return <div className="sm-error">Erreur: {error}</div>
  }

  return (
    <div className="seance-management">
      <button className="sm-back-button" onClick={() => navigate(-1)} disabled={isBusy}>
        ← Retour
      </button>

      <h1>Gestion des séances</h1>

      {error && <div className="sm-inline-error">{error}</div>}

      <div className="sm-actions">
        <button className="sm-btn sm-btn-primary" onClick={() => setShowAddForm(!showAddForm)} disabled={isBusy}>
          {showAddForm ? 'Annuler' : '+ Ajouter une séance'}
        </button>
      </div>

      {showAddForm && (
        <div className="sm-add-form">
          <input
            type="text"
            placeholder="Titre"
            className="sm-form-input"
            value={newSeance.titre}
            onChange={(event) => setNewSeance({ ...newSeance, titre: event.target.value })}
            disabled={isBusy}
          />

          <select
            className="sm-form-input"
            value={newSeance.type}
            onChange={(event) => setNewSeance({ ...newSeance, type: event.target.value })}
            disabled={isBusy}
          >
            <option value="presentielle">Présentielle</option>
            <option value="distanciel">Distanciel</option>
          </select>

          <input
            type="date"
            className="sm-form-input"
            value={newSeance.dateSeance}
            onChange={(event) => setNewSeance({ ...newSeance, dateSeance: event.target.value })}
            disabled={isBusy}
          />

          <label className="sm-form-label">
            Heure de début
          </label>

          <input
            type="time"
            className="sm-form-input"
            value={newSeance.startTime}
            onChange={(event) => setNewSeance({ ...newSeance, startTime: event.target.value })}
            disabled={isBusy}
          />

          <input
            type="number"
            min="1"
            placeholder="Durée (minutes)"
            className="sm-form-input"
            value={newSeance.duree}
            onChange={(event) => setNewSeance({ ...newSeance, duree: event.target.value })}
            disabled={isBusy}
          />

          <div className="sm-form-actions">
            <button className="sm-btn sm-btn-primary" onClick={handleCreate} disabled={isBusy}>
              {creating ? 'Création...' : 'Créer'}
            </button>
            <button className="sm-btn sm-btn-secondary" onClick={() => setShowAddForm(false)} disabled={isBusy}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {seances.length === 0 ? (
        <div className="sm-empty">Aucune séance créée</div>
      ) : (
        <div className="sm-list">
          {seances.map((seance) => {
            const isEditing = selectedSeance?._id === seance._id
            return (
              <div key={seance._id} className="sm-card">
                <div className="sm-card-header">
                  <h3>Séance {seance.ordre ?? '-'} — {seance.titre}</h3>
                  <span className="sm-type-badge">{seance.type === 'presentielle' ? 'Présentielle' : 'Distanciel'}</span>
                </div>

                <p className="sm-meta">
                  {formatDate(seance.dateSeance)}
                  {seance.duree ? ` | ${seance.duree} min` : ''}
                </p>

                <div className="sm-card-actions">
                  <button className="sm-btn sm-btn-secondary" onClick={() => startEdit(seance)} disabled={isBusy}>
                    Modifier
                  </button>

                  <button
                    className="sm-btn sm-btn-danger"
                    onClick={() => handleDelete(seance._id)}
                    disabled={isBusy}
                  >
                    {deletingId === seance._id ? 'Suppression...' : 'Supprimer'}
                  </button>

                  <label className={`sm-btn sm-btn-upload ${isBusy ? 'sm-btn-disabled' : ''}`}>
                    Upload PDF
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(event) => handleUploadPdf(seance._id, event)}
                      disabled={isBusy}
                      className="sm-hidden-input"
                    />
                  </label>
                </div>

                {isEditing && (
                  <div className="sm-edit-form">
                    <input
                      type="text"
                      className="sm-form-input"
                      value={editSeance.titre}
                      onChange={(event) => setEditSeance({ ...editSeance, titre: event.target.value })}
                      disabled={isBusy}
                    />

                    <select
                      className="sm-form-input"
                      value={editSeance.type}
                      onChange={(event) => setEditSeance({ ...editSeance, type: event.target.value })}
                      disabled={isBusy}
                    >
                      <option value="presentielle">Présentielle</option>
                      <option value="distanciel">Distanciel</option>
                    </select>

                    <input
                      type="date"
                      className="sm-form-input"
                      value={editSeance.dateSeance}
                      onChange={(event) => setEditSeance({ ...editSeance, dateSeance: event.target.value })}
                      disabled={isBusy}
                    />

                    <label className="sm-form-label">
                      Heure de début
                    </label>

                    <input
                      type="time"
                      className="sm-form-input"
                      value={editSeance.startTime}
                      onChange={(event) => setEditSeance({ ...editSeance, startTime: event.target.value })}
                      disabled={isBusy}
                    />

                    <input
                      type="number"
                      min="1"
                      placeholder="Durée (minutes)"
                      className="sm-form-input"
                      value={editSeance.duree}
                      onChange={(event) => setEditSeance({ ...editSeance, duree: event.target.value })}
                      disabled={isBusy}
                    />

                    <div className="sm-form-actions">
                      <button className="sm-btn sm-btn-primary" onClick={handleUpdate} disabled={isBusy}>
                        {savingEdit ? 'Enregistrement...' : 'Enregistrer'}
                      </button>
                      <button className="sm-btn sm-btn-secondary" onClick={() => setSelectedSeance(null)} disabled={isBusy}>
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SeanceManagement
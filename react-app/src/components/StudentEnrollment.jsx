import { useState, useEffect } from 'react'
import { enrollmentsAPI } from '../services/api'
import './StudentEnrollment.css'

function StudentEnrollment({ moduleId }) {
  const [enrolledStudents, setEnrolledStudents] = useState([])
  const [availableStudents, setAvailableStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadData()
  }, [moduleId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [enrolled, available] = await Promise.all([
        enrollmentsAPI.getModuleStudents(moduleId),
        enrollmentsAPI.getAvailableStudents(moduleId)
      ])
      setEnrolledStudents(Array.isArray(enrolled) ? enrolled : [])
      setAvailableStudents(Array.isArray(available) ? available : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEnrollStudent = async (studentId) => {
    try {
      await enrollmentsAPI.enrollStudent(moduleId, studentId)
      await loadData()
      alert('Étudiant inscrit avec succès')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const handleUnenrollStudent = async (studentId) => {
    try {
      if (!confirm('Voulez-vous vraiment désinscrire cet étudiant ?')) {
        return
      }
      await enrollmentsAPI.unenrollStudent(moduleId, studentId)
      await loadData()
      alert('Étudiant désinscrit avec succès')
    } catch (err) {
      alert('Erreur: ' + err.message)
    }
  }

  const filteredAvailable = availableStudents.filter(student =>
    student.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="enrollment-section">
        <p>Chargement...</p>
      </div>
    )
  }

  return (
    <div className="enrollment-section">
      <h3>👥 Gestion des Étudiants</h3>
      {error && <p className="error">Erreur: {error}</p>}

      {/* Étudiants inscrits */}
      <div className="enrolled-students">
        <h4>Étudiants inscrits ({enrolledStudents.length})</h4>
        {enrolledStudents.length > 0 ? (
          <div className="student-list">
            {enrolledStudents.map(student => (
              <div key={student._id} className="student-item enrolled">
                <div className="student-info">
                  <strong>{student.nom}</strong>
                  <span className="student-email">{student.email}</span>
                  <small>Inscrit le {new Date(student.inscription_date).toLocaleDateString()}</small>
                </div>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => handleUnenrollStudent(student._id)}
                >
                  Retirer
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-students">Aucun étudiant inscrit pour le moment</p>
        )}
      </div>

      {/* Ajouter des étudiants */}
      <div className="available-students">
        <h4>Ajouter des étudiants</h4>
        <input
          type="text"
          placeholder="Rechercher un étudiant..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ marginBottom: '1rem' }}
        />
        {filteredAvailable.length > 0 ? (
          <div className="student-list">
            {filteredAvailable.map(student => (
              <div key={student._id} className="student-item available">
                <div className="student-info">
                  <strong>{student.nom}</strong>
                  <span className="student-email">{student.email}</span>
                </div>
                <button
                  className="btn btn-primary btn-small"
                  onClick={() => handleEnrollStudent(student._id)}
                >
                  Ajouter
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="no-students">
            {searchTerm ? 'Aucun étudiant trouvé' : 'Tous les étudiants sont déjà inscrits'}
          </p>
        )}
      </div>
    </div>
  )
}

export default StudentEnrollment


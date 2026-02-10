import './Card.css'

function AISection({ userType }) {
  return (
    <section className="dashboard-card ai-section">
      <div className="card-header">
        <h2>🤖 Assistant IA</h2>
      </div>
      <div className="card-content">
        <div className="ai-actions">
          <div className="ai-action-item">
            <h3>Génération automatique</h3>
            <p>
              {userType === 'teacher' 
                ? 'Les étudiants peuvent générer des quiz et exercices depuis les modules de cours.'
                : 'Générez des quiz et exercices directement depuis les modules de cours. Allez dans "Mes Cours" et sélectionnez un module pour commencer.'
              }
            </p>
            {userType === 'student' && (
              <p className="info-text">
                💡 <strong>Astuce :</strong> Dans chaque module, vous pouvez générer un quiz global ou des exercices qui couvrent tous les cours.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default AISection




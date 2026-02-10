import './Card.css'

function FeedbackSection() {
  return (
    <section className="dashboard-card feedback-section">
      <div className="card-header">
        <h2>💬 Mes Feedbacks</h2>
      </div>
      <div className="card-content">
        <p className="feedback-message">
          Les feedbacks détaillés sont maintenant visibles directement sur chaque quiz du cours après soumission.
          Consulte ton quiz pour voir ta note par section, un message encourageant et un bouton en bas pour afficher plus de détails.
        </p>
      </div>
    </section>
  )
}

export default FeedbackSection




import './Navbar.css'

function Navbar({ userType, onLogout }) {
  const handleClick = (e) => {
    e.preventDefault()
    if (onLogout) {
      onLogout(e)
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <h2 className="nav-logo">🎓 E-Learning AI</h2>
        <div className="nav-user">
          <span>{userType}</span>
          <button 
            type="button"
            className="btn btn-secondary btn-small" 
            onClick={handleClick}
          >
            Déconnexion
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar




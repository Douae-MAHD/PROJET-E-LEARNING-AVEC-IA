import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import { authAPI } from '../services/api'
import './Login.css'

function Login() {
  const [isLogin, setIsLogin] = useState(true)
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    password: '',
    role: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const cardRef = useRef(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const token = localStorage.getItem('token')
    if (token) {
      authAPI.verify()
        .then(({ user }) => {
          if (user.role === 'etudiant') {
            navigate('/dashboard/student')
          } else if (user.role === 'professeur') {
            navigate('/dashboard/teacher')
          }
        })
        .catch(() => {
          localStorage.removeItem('token')
        })
    }

    // S'assurer que la carte est visible dès le début
    if (cardRef.current) {
      gsap.set(cardRef.current, { opacity: 1, y: 0, visibility: 'visible' })
    }
  }, [navigate])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        // Connexion
        const { token, user } = await authAPI.login(formData.email, formData.password)
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        // Animation de sortie
        if (cardRef.current) {
          gsap.to(cardRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.5,
            onComplete: () => {
              if (user.role === 'etudiant') {
                navigate('/dashboard/student')
              } else if (user.role === 'professeur') {
                navigate('/dashboard/teacher')
              }
            }
          })
        }
      } else {
        // Inscription
        const { token, user } = await authAPI.register(formData)
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        
        if (cardRef.current) {
          gsap.to(cardRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.5,
            onComplete: () => {
              if (user.role === 'etudiant') {
                navigate('/dashboard/student')
              } else if (user.role === 'professeur') {
                navigate('/dashboard/teacher')
              }
            }
          })
        }
      }
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      {/* Section gauche avec fond et informations */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-welcome">
            <h1>Bienvenue</h1>
            <p>Plateforme E-Learning avec Intelligence Artificielle pour EMINES -</p>
            <p className="subtitle">École de Management Industriel</p>
            
            <div className="social-icons">
              <a href="#" className="social-icon" aria-label="Facebook">f</a>
              <a href="#" className="social-icon" aria-label="Twitter">🐦</a>
              <a href="#" className="social-icon" aria-label="Instagram">📷</a>
              <a href="#" className="social-icon" aria-label="LinkedIn">in</a>
            </div>
          </div>
        </div>
      </div>

      {/* Section droite avec formulaire */}
      <div className="login-right">
        <div className="login-container" ref={cardRef}>
          <div className="login-card">
            <h2>{isLogin ? 'Connexion' : 'Inscription'}</h2>
            
            {error && <div className="error">{error}</div>}
            
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <div className="form-group">
                  <label htmlFor="nom">Nom complet</label>
                  <input
                    id="nom"
                    type="text"
                    name="nom"
                    placeholder="Entrez votre nom complet"
                    value={formData.nom}
                    onChange={handleChange}
                    required={!isLogin}
                  />
                </div>
              )}

              <div className="form-group">
                <label htmlFor="email">Adresse email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Entrez votre email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Mot de passe</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Entrez votre mot de passe"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
              </div>

              {!isLogin && (
                <div className="role-selection">
                  <h3>Sélectionnez votre rôle</h3>
                  <div className="role-options">
                    <div 
                      className={`role-option ${formData.role === 'etudiant' ? 'selected' : ''}`}
                      onClick={() => handleChange({ target: { name: 'role', value: 'etudiant' } })}
                    >
                      <div className="role-option-icon">🎓</div>
                      <label>
                        <input
                          type="radio"
                          name="role"
                          value="etudiant"
                          checked={formData.role === 'etudiant'}
                          onChange={handleChange}
                          required
                        />
                        Étudiant
                      </label>
                    </div>
                    
                    <div 
                      className={`role-option ${formData.role === 'professeur' ? 'selected' : ''}`}
                      onClick={() => handleChange({ target: { name: 'role', value: 'professeur' } })}
                    >
                      <div className="role-option-icon">📖</div>
                      <label>
                        <input
                          type="radio"
                          name="role"
                          value="professeur"
                          checked={formData.role === 'professeur'}
                          onChange={handleChange}
                          required
                        />
                        Professeur
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Chargement...' : (isLogin ? 'Se connecter' : 'S\'inscrire')}
              </button>
            </form>
            
            <div className="disclaimer">
              En cliquant sur "{isLogin ? 'Se connecter' : 'S\'inscrire'}", vous acceptez les{' '}
              <a href="#">Conditions d'utilisation</a> | <a href="#">Politique de confidentialité</a>
            </div>
            
            <div className="toggle-form">
              {isLogin ? (
                <p>Pas encore de compte ? <button type="button" onClick={() => {
                  setIsLogin(false)
                  setFormData({ nom: '', email: '', password: '', role: '' })
                }}>S'inscrire</button></p>
              ) : (
                <p>Déjà un compte ? <button type="button" onClick={() => {
                  setIsLogin(true)
                  setFormData({ nom: '', email: '', password: '', role: '' })
                }}>Se connecter</button></p>
              )}
            </div>
          </div>
        </div>
        
        <div className="help-icon" title="Aide">?</div>
      </div>
    </div>
  )
}

export default Login

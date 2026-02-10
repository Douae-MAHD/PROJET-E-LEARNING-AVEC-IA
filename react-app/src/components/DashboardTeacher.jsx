import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gsap } from 'gsap'
import Navbar from './Navbar'
import CoursesManagementSection from './CoursesManagementSection'
import AISection from './AISection'
import FeedbacksViewSection from './FeedbacksViewSection'
import './Dashboard.css'

function DashboardTeacher() {
  const navigate = useNavigate()
  const headerRef = useRef(null)
  const cardsRef = useRef([])

  useEffect(() => {
    // S'assurer que les éléments sont visibles dès le début
    if (headerRef.current) {
      gsap.set(headerRef.current, { opacity: 1, y: 0 })
    }
    cardsRef.current.forEach(card => {
      if (card) {
        gsap.set(card, { opacity: 1, y: 0 })
      }
    })

    // Animation d'entrée
    if (headerRef.current) {
      gsap.from(headerRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.6,
        ease: 'power3.out'
      })
    }

    if (cardsRef.current.length > 0) {
      gsap.from(cardsRef.current, {
        opacity: 0,
        y: 30,
        duration: 0.6,
        stagger: 0.1,
        delay: 0.2,
        ease: 'power3.out'
      })
    }
  }, [])

  const handleLogout = (e) => {
    e?.preventDefault()
    // Supprimer le token et les données utilisateur
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Forcer le rechargement complet pour s'assurer que la page de login s'affiche
    window.location.href = '/'
  }

  return (
    <div className="dashboard-page">
      <Navbar userType="Professeur" onLogout={handleLogout} />
      
      <div className="container">
        <header className="dashboard-header" ref={headerRef}>
          <h1>Tableau de bord professeur</h1>
          <p>Gérez vos cours et interagissez avec vos étudiants</p>
        </header>

        <div className="dashboard-grid">
          <div ref={el => cardsRef.current[0] = el}>
            <CoursesManagementSection />
          </div>
          <div ref={el => cardsRef.current[1] = el}>
            <AISection userType="teacher" />
          </div>
          <div ref={el => cardsRef.current[2] = el} style={{ gridColumn: '1 / -1' }}>
            <FeedbacksViewSection />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardTeacher




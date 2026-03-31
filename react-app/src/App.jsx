import { Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import DashboardStudent from './components/DashboardStudent'
import DashboardTeacher from './components/DashboardTeacher'
import ModuleView from './components/ModuleView'
import SeanceView from './components/SeanceView'
import SeanceDetail from './components/SeanceDetail'
import SeanceManagement from './components/SeanceManagement'
import SubModuleManagement from './components/SubModuleManagement'
import QuizView from './components/QuizView'
import ExerciseView from './components/ExerciseView'
import ModuleFeedback from './components/ModuleFeedback'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard/student" element={<DashboardStudent />} />
      <Route path="/dashboard/teacher" element={<DashboardTeacher />} />
      <Route path="/module/:moduleId" element={<ModuleView />} />
      <Route path="/module/:moduleId/seances" element={<SeanceView />} />
      <Route path="/seance/:seanceId" element={<SeanceDetail />} />
      <Route path="/module/:moduleId/feedback" element={<ModuleFeedback />} />
      <Route path="/feedback/module/:moduleId" element={<ModuleFeedback />} />
      <Route path="/teacher/module/:moduleId" element={<SubModuleManagement />} />
      <Route path="/teacher/module/:moduleId/seances" element={<SeanceManagement />} />
      <Route path="/quiz/:quizId" element={<QuizView />} />
      <Route path="/exercise/:exerciseId" element={<ExerciseView />} />
      <Route path="/exercises/:exerciseId" element={<ExerciseView />} />
    </Routes>
  )
}

export default App




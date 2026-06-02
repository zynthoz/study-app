import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Navbar } from './components/Navbar'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { Subjects } from './pages/Subjects'
import { NoteDetail } from './pages/NoteDetail'
import { Exams } from './pages/Exams'
import { ExamDetail } from './pages/ExamDetail'
import { ExamSession } from './pages/ExamSession'
import { ExamResults } from './pages/ExamResults'
import { HistoryPage } from './pages/History'

const AppLayout: React.FC = () => {
  return (
    <div className="relative min-h-screen bg-[#080c14] text-gray-100 flex flex-col overflow-x-clip">
      {/* Animating Background Gradients */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-brand-500/5 blur-3xl animate-float-slow pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-96 w-96 rounded-full bg-purple-500/5 blur-3xl animate-float-medium pointer-events-none"></div>

      <Navbar />
      
      <main className="flex-1 w-full relative z-10">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/materials" element={<Navigate to="/subjects" replace />} />
          <Route path="/notes" element={<Navigate to="/subjects" replace />} />
          <Route path="/notes/:id" element={<NoteDetail />} />
          <Route path="/exams" element={<Exams />} />
          <Route path="/exams/:id" element={<ExamDetail />} />
          <Route path="/exams/:id/take" element={<ExamSession />} />
          <Route path="/exams/session/:sessionId" element={<ExamResults />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Protected Routes */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App

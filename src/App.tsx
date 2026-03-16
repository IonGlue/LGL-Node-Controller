import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { isAuthenticated, redirectToLogin } from './auth.ts'
import Dashboard from './pages/Dashboard.tsx'
import NodeControl from './pages/NodeControl.tsx'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const [checked, setChecked] = useState(false)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    if (isAuthenticated()) {
      setAuthed(true)
    } else {
      redirectToLogin()
    }
    setChecked(true)
  }, [])

  if (!checked) return null
  if (!authed) return null
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/nodes/:nodeId"
          element={
            <RequireAuth>
              <NodeControl />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

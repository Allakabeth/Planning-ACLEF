import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/router'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = () => {
    try {
      const savedUser = localStorage.getItem('aclef_admin')
      if (savedUser) {
        setUser(JSON.parse(savedUser))
      }
    } catch (error) {
      console.error('Erreur vérification utilisateur:', error)
    } finally {
      setLoading(false)
    }
  }

  const loginAdmin = async (email, password) => {
    try {
      // Vérification admin hardcodée
      if (email === 'aclef@aclef.fr' && password === '12C@millePage') {
        const adminUser = {
          id: 'admin-1',
          email: 'aclef@aclef.fr',
          role: 'admin',
          nom: 'Admin',
          prenom: 'ACLEF'
        }
        localStorage.setItem('aclef_admin', JSON.stringify(adminUser))
        setUser(adminUser)
        return { success: true }
      } else {
        return { success: false, error: 'Identifiants incorrects' }
      }
    } catch (error) {
      console.error('Erreur login:', error)
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('aclef_admin')
    setUser(null)
    router.push('/login')
  }

  const value = {
    user,
    loading,
    loginAdmin,
    logout,
    checkUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// HOC pour protéger les pages admin
export function withAuth(Component, allowedRoles = ['admin']) {
  return function ProtectedComponent(props) {
    const { user, loading } = useAuth()
    const router = useRouter()

    useEffect(() => {
      if (!loading && !user) {
        router.push('/login')
      } else if (!loading && user && !allowedRoles.includes(user.role)) {
        router.push('/unauthorized')
      }
    }, [loading, user, router])

    if (loading) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 15px'
            }}></div>
            <p style={{ color: '#667eea', fontSize: '16px', margin: 0 }}>Chargement...</p>
          </div>
          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )
    }

    if (!user || !allowedRoles.includes(user.role)) {
      return null
    }

    return <Component {...props} />
  }
}
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { useFormateurAuth } from '../contexts/FormateurAuthContext'

export function withAuthFormateur(WrappedComponent, options = {}) {
  return function ProtectedFormateurPage(props) {
    const { user, isLoading, isAuthenticated, logout, mustChangePassword } = useFormateurAuth()
    const router = useRouter()
    const { 
      redirectTo = '/formateur/login',
      allowUnauthenticated = false,
      requirePasswordChange = false
    } = options

    useEffect(() => {
      if (isLoading) return

      // Si pas authentifié et que l'accès non-auth n'est pas autorisé
      if (!isAuthenticated && !allowUnauthenticated) {
        router.push(redirectTo)
        return
      }

      // Si utilisateur doit changer son mot de passe
      if (isAuthenticated && mustChangePassword() && !requirePasswordChange) {
        // Rediriger vers la page de changement de mot de passe
        // sauf si on est déjà sur cette page
        if (router.pathname !== '/formateur/change-password') {
          router.push('/formateur/change-password')
        }
        return
      }

      // Si on est sur la page de changement de mot de passe 
      // mais qu'on n'a plus besoin de changer le mot de passe
      if (isAuthenticated && !mustChangePassword() && router.pathname === '/formateur/change-password') {
        router.push('/formateur')
        return
      }

    }, [isLoading, isAuthenticated, router, mustChangePassword])

    // État de chargement
    if (isLoading) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#667eea'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔄</div>
            <div>Vérification de l'authentification...</div>
          </div>
        </div>
      )
    }

    // Accès non autorisé (redirection en cours)
    if (!isAuthenticated && !allowUnauthenticated) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#666'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔐</div>
            <div>Redirection vers la connexion...</div>
          </div>
        </div>
      )
    }

    // Changement de mot de passe requis (redirection en cours)
    if (isAuthenticated && mustChangePassword() && !requirePasswordChange) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            textAlign: 'center',
            color: '#f59e0b'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '10px' }}>🔑</div>
            <div>Changement de mot de passe requis...</div>
          </div>
        </div>
      )
    }

    // Composant protégé avec authentification JWT
    return <WrappedComponent {...props} user={user} logout={logout} />
  }
}
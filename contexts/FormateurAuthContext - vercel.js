import { createContext, useContext, useState, useEffect } from 'react'
import { useRouter } from 'next/router'

// Contexte d'authentification pour les formateurs
const FormateurAuthContext = createContext({})

export function useFormateurAuth() {
    return useContext(FormateurAuthContext)
}

export function FormateurAuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isAuthenticated, setIsAuthenticated] = useState(false)
    const router = useRouter()

    // Rafraîchir le token automatiquement
    const refreshToken = async () => {
        try {
            const refresh = localStorage.getItem('formateur_refresh')
            if (!refresh) return false

            const response = await fetch('/api/auth/formateur/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: refresh })
            })

            if (!response.ok) {
                throw new Error('Échec du rafraîchissement')
            }

            const data = await response.json()

            // Mettre à jour les tokens
            localStorage.setItem('formateur_token', data.tokens.accessToken)
            localStorage.setItem('formateur_refresh', data.tokens.refreshToken)
            localStorage.setItem('formateur_user', JSON.stringify(data.user))

            setUser(data.user)
            setIsAuthenticated(true)

            return true
        } catch (error) {
            console.error('Erreur rafraîchissement token:', error)
            return false
        }
    }

    // Vérifier le token
    const verifyToken = async () => {
        try {
            const token = localStorage.getItem('formateur_token')
            if (!token) return false

            const response = await fetch('/api/auth/formateur/verify', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (!response.ok) {
                // Tenter un rafraîchissement
                return await refreshToken()
            }

            const data = await response.json()
            
            if (data.valid) {
                setUser(data.user)
                setIsAuthenticated(true)
                
                // Vérifier si le token expire bientôt (moins de 5 minutes)
                if (data.token.expiresIn < 300) {
                    await refreshToken()
                }
                
                return true
            }

            return false
        } catch (error) {
            console.error('Erreur vérification token:', error)
            return false
        }
    }

    // Connexion
    const login = async (username, password) => {
        try {
            const response = await fetch('/api/auth/formateur/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })

            let data
            try {
                data = await response.json()
            } catch (parseError) {
                console.error('❌ Erreur parsing JSON:', parseError)
                return { success: false, error: 'Réponse serveur invalide' }
            }

            if (!response.ok) {
                console.error('❌ Erreur API login:', data.error)
                return { success: false, error: data.error || 'Identifiants incorrects' }
            }

            // Stocker les tokens et infos
            localStorage.setItem('formateur_token', data.tokens.accessToken)
            localStorage.setItem('formateur_refresh', data.tokens.refreshToken)
            localStorage.setItem('formateur_user', JSON.stringify(data.user))
            localStorage.setItem('formateur_session', data.sessionId)

            setUser(data.user)
            setIsAuthenticated(true)

            // Afficher encouragement si connexion avec nom
            if (data.showEncouragement) {
                setTimeout(() => {
                    alert('💡 Conseil sécurité : Vous pouvez définir un mot de passe personnalisé dans votre profil pour plus de sécurité !')
                }, 500)
            }

            // Redirection
            router.push('/formateur')

            return { success: true, user: data.user }

        } catch (error) {
            console.error('💥 Erreur réseau login:', error)
            // Gérer les différents types d'erreurs
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                return { success: false, error: 'Impossible de contacter le serveur. Vérifiez votre connexion.' }
            }
            return { success: false, error: error.message || 'Erreur inattendue lors de la connexion' }
        }
    }

    // Déconnexion
    const logout = async () => {
        try {
            const token = localStorage.getItem('formateur_token')
            
            // Appeler l'API de déconnexion
            if (token) {
                await fetch('/api/auth/formateur/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })
            }
        } catch (error) {
            console.error('Erreur logout API:', error)
        } finally {
            // Nettoyer le localStorage dans tous les cas
            localStorage.removeItem('formateur_token')
            localStorage.removeItem('formateur_refresh')
            localStorage.removeItem('formateur_user')
            localStorage.removeItem('formateur_session')
            localStorage.removeItem('formateur_connecte') // Compatibilité ancien système

            setUser(null)
            setIsAuthenticated(false)

            // Redirection vers login
            router.push('/formateur/login')
        }
    }

    // Changement de mot de passe
    const changePassword = async (currentPassword, newPassword) => {
        try {
            console.log('🔐 [CHANGE-PASSWORD] Début changement mot de passe')
            const token = localStorage.getItem('formateur_token')
            console.log('🔐 [CHANGE-PASSWORD] Token récupéré:', token ? 'EXISTE' : 'MANQUANT')
            
            console.log('🔐 [CHANGE-PASSWORD] Appel API /api/auth/formateur/change-password')
            const response = await fetch('/api/auth/formateur/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ currentPassword, newPassword })
            })

            console.log('🔐 [CHANGE-PASSWORD] Réponse API status:', response.status, response.statusText)
            const data = await response.json()
            console.log('🔐 [CHANGE-PASSWORD] Données API:', data)

            if (!response.ok) {
                console.error('🔐 [CHANGE-PASSWORD] Erreur API:', data.error)
                throw new Error(data.error || 'Erreur lors du changement')
            }

            // Mettre à jour les tokens si fournis
            if (data.tokens) {
                localStorage.setItem('formateur_token', data.tokens.accessToken)
                localStorage.setItem('formateur_refresh', data.tokens.refreshToken)
            }

            // Mettre à jour l'utilisateur
            const updatedUser = { ...user, mustChangePassword: false }
            localStorage.setItem('formateur_user', JSON.stringify(updatedUser))
            setUser(updatedUser)

            return { success: true }

        } catch (error) {
            console.error('Erreur changement mot de passe:', error)
            return { success: false, error: error.message }
        }
    }

    // Récupérer les infos utilisateur depuis le token
    const getUserFromToken = () => {
        try {
            const userData = localStorage.getItem('formateur_user')
            if (userData) {
                return JSON.parse(userData)
            }
            return null
        } catch (error) {
            console.error('Erreur parsing user data:', error)
            return null
        }
    }

    // Vérifier si l'utilisateur doit changer son mot de passe
    const mustChangePassword = () => {
        return user && user.mustChangePassword === true
    }

    // Vérifier si la session est toujours valide (pas expirée côté serveur)
    const checkSessionValidity = async () => {
        try {
            const token = localStorage.getItem('formateur_token')
            const sessionId = localStorage.getItem('formateur_session')
            
            if (!token || !sessionId) return false

            const response = await fetch('/api/auth/formateur/session-check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sessionId })
            })

            if (!response.ok) {
                return false
            }

            const data = await response.json()
            return data.valid || false

        } catch (error) {
            console.error('Erreur vérification session:', error)
            return false
        }
    }

    // Forcer la déconnexion (en cas d'erreur critique)
    const forceLogout = () => {
        localStorage.removeItem('formateur_token')
        localStorage.removeItem('formateur_refresh')
        localStorage.removeItem('formateur_user')
        localStorage.removeItem('formateur_session')
        localStorage.removeItem('formateur_connecte')

        setUser(null)
        setIsAuthenticated(false)
        setIsLoading(false)

        // Redirection immédiate sans appel API
        router.push('/formateur/login')
    }

    // Initialisation au montage
    useEffect(() => {
        const initAuth = async () => {
            setIsLoading(true)

            // Vérifier d'abord le localStorage
            const userData = getUserFromToken()
            if (userData) {
                setUser(userData)
                
                // Vérifier la validité du token
                const isValid = await verifyToken()
                if (!isValid) {
                    // Token invalide, nettoyer et rediriger
                    await logout()
                }
            }

            setIsLoading(false)
        }

        initAuth()
    }, [])

    // Auto-rafraîchissement du token (toutes les 10 minutes)
    useEffect(() => {
        if (!isAuthenticated) return

        const interval = setInterval(async () => {
            const success = await refreshToken()
            if (!success) {
                console.warn('Échec du rafraîchissement automatique')
            }
        }, 10 * 60 * 1000) // 10 minutes

        return () => clearInterval(interval)
    }, [isAuthenticated])

    // Intercepteur pour les erreurs 401
    useEffect(() => {
        const handleUnauthorized = async (event) => {
            if (event.detail?.status === 401) {
                // Tenter un rafraîchissement
                const success = await refreshToken()
                if (!success) {
                    await logout()
                }
            }
        }

        window.addEventListener('unauthorized', handleUnauthorized)
        return () => window.removeEventListener('unauthorized', handleUnauthorized)
    }, [])

    const value = {
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        changePassword,
        refreshToken,
        verifyToken,
        mustChangePassword,
        checkSessionValidity,
        forceLogout,
        getUserFromToken
    }

    return (
        <FormateurAuthContext.Provider value={value}>
            {children}
        </FormateurAuthContext.Provider>
    )
}
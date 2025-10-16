import { useState } from 'react'
import { useRouter } from 'next/router'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function LoginFormateur() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const { login } = useFormateurAuth()
    const router = useRouter()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setErrorMessage('')

        try {
            console.log('📝 [LOGIN PAGE] Appel de la fonction login...')
            const result = await login(username, password)
            console.log('📝 [LOGIN PAGE] Résultat login:', result)
            
            if (result.success) {
                // La redirection est gérée automatiquement par le contexte
                console.log('✅ [LOGIN PAGE] Connexion formateur réussie, attente redirection...')
            } else {
                console.error('❌ [LOGIN PAGE] Échec connexion:', result.error)
                setErrorMessage(result.error || 'Erreur de connexion')
            }

        } catch (error) {
            console.error('💥 [LOGIN PAGE] Erreur de connexion:', error)
            setErrorMessage('Erreur inattendue lors de la connexion')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '40px',
                width: '100%',
                maxWidth: '400px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
                {/* Logo et titre */}
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '10px'
                    }}>
                        ACLEF Planning
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Espace Formateur
                    </p>
                </div>

                {/* Formulaire */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Identifiant
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            placeholder="Nom d'utilisateur"
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    paddingRight: '45px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#6b7280'
                                }}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Message d'erreur */}
                    {errorMessage && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px'
                        }}>
                            {errorMessage}
                        </div>
                    )}

                    {/* Bouton connexion */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'transform 0.2s',
                            transform: isLoading ? 'scale(1)' : 'scale(1)'
                        }}
                        onMouseOver={(e) => !isLoading && (e.target.style.transform = 'scale(1.02)')}
                        onMouseOut={(e) => !isLoading && (e.target.style.transform = 'scale(1)')}
                    >
                        {isLoading ? 'Connexion...' : 'Se connecter'}
                    </button>
                </form>

                {/* Info de connexion */}
                <div style={{
                    marginTop: '30px',
                    padding: '15px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    <strong>Première connexion ?</strong><br />
                    Nom d'utilisateur = votre prénom<br />
                    Mot de passe = votre nom de famille
                </div>
            </div>
        </div>
    )
}
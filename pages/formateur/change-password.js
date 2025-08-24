import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function ChangePassword() {
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const [successMessage, setSuccessMessage] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const { user, changePassword } = useFormateurAuth()
    const router = useRouter()

    useEffect(() => {
        // Si l'utilisateur n'est pas connecté, rediriger vers login
        if (!user) {
            router.push('/formateur/login')
        }
        // Permettre l'accès à la page même si mustChangePassword est false
        // (changement volontaire de mot de passe)
    }, [user, router])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setErrorMessage('')
        setSuccessMessage('')

        // Validation
        if (newPassword !== confirmPassword) {
            setErrorMessage('Les mots de passe ne correspondent pas')
            setIsLoading(false)
            return
        }

        if (newPassword.length < 6) {
            setErrorMessage('Le nouveau mot de passe doit contenir au moins 6 caractères')
            setIsLoading(false)
            return
        }

        try {
            const result = await changePassword(currentPassword, newPassword)
            
            if (result.success) {
                setSuccessMessage('Mot de passe changé avec succès')
                setTimeout(() => {
                    router.push('/formateur')
                }, 1500)
            } else {
                setErrorMessage(result.error || 'Erreur lors du changement de mot de passe')
            }
        } catch (error) {
            console.error('Erreur changement mot de passe:', error)
            setErrorMessage('Erreur inattendue lors du changement')
        } finally {
            setIsLoading(false)
        }
    }

    if (!user) {
        return null
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
                maxWidth: '450px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: '10px'
                    }}>
                        Changement de mot de passe
                    </h1>
                    <p style={{ color: '#6b7280', fontSize: '14px' }}>
                        Première connexion - Veuillez choisir un nouveau mot de passe
                    </p>
                </div>

                <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px'
                }}>
                    <p style={{ color: '#92400e', fontSize: '13px', margin: 0 }}>
                        <strong>Bienvenue {user.prenom} !</strong><br />
                        Pour sécuriser votre compte, veuillez créer un nouveau mot de passe personnel.
                    </p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Mot de passe actuel
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
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
                                placeholder="Votre mot de passe actuel"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#6b7280'
                                }}
                            >
                                {showCurrentPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Nouveau mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
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
                                placeholder="Minimum 6 caractères"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#6b7280'
                                }}
                            >
                                {showNewPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '8px',
                            color: '#374151',
                            fontSize: '14px',
                            fontWeight: '500'
                        }}>
                            Confirmer le nouveau mot de passe
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                                placeholder="Répétez le nouveau mot de passe"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '18px',
                                    color: '#6b7280'
                                }}
                            >
                                {showConfirmPassword ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

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

                    {successMessage && (
                        <div style={{
                            backgroundColor: '#d1fae5',
                            color: '#065f46',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            fontSize: '14px'
                        }}>
                            {successMessage}
                        </div>
                    )}

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
                            transition: 'transform 0.2s'
                        }}
                    >
                        {isLoading ? 'Changement en cours...' : 'Changer mon mot de passe'}
                    </button>

                    <button
                        onClick={() => router.push('/formateur')}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginTop: '16px',
                            transition: 'transform 0.2s'
                        }}
                    >
                        Retour à l'accueil
                    </button>
                </form>
            </div>
        </div>
    )
}
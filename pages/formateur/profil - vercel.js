import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'
import { withAuthFormateur } from '../../components/withAuthFormateur'
import { supabase } from '../../lib/supabaseClient'

function ProfilFormateur() {
    const { user } = useFormateurAuth()
    const [email, setEmail] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [activeSection, setActiveSection] = useState('email')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [showPasswords, setShowPasswords] = useState(false)
    const router = useRouter()

    useEffect(() => {
        if (user) {
            setEmail(user.email || '')
        }
    }, [user])

    const handleUpdateEmail = async () => {
        
        // Si l'email est vide, on veut le supprimer
        if (email === '') {
            setLoading(true)
            try {
                const { error } = await supabase
                    .from('users')
                    .update({ email: null })
                    .eq('id', user.id)

                if (error) throw error

                setMessage('Email supprimé avec succès !')
                setTimeout(() => setMessage(''), 4000)
                
            } catch (error) {
                console.error('Erreur:', error)
                setMessage(`Erreur : ${error.message}`)
                setTimeout(() => setMessage(''), 4000)
            } finally {
                setLoading(false)
            }
            return
        }
        
        // Validation de l'email si non vide
        if (!email.trim()) {
            setMessage('Veuillez saisir un email valide')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        if (!email.includes('@') || !email.includes('.')) {
            setMessage('Format d\'email invalide')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setLoading(true)
        try {
            const { error } = await supabase
                .from('users')
                .update({ email: email.trim() })
                .eq('id', user.id)

            if (error) throw error

            setMessage('Email modifié avec succès !')
            setTimeout(() => setMessage(''), 4000)
            
        } catch (error) {
            console.error('Erreur:', error)
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setLoading(false)
        }
    }

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        
        if (!newPassword || !confirmPassword) {
            setMessage('Veuillez remplir tous les champs')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        if (newPassword !== confirmPassword) {
            setMessage('Les nouveaux mots de passe ne correspondent pas')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        if (newPassword.trim().length === 0) {
            setMessage('Le nouveau mot de passe ne peut pas être vide')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem('formateur_token')
            
            const response = await fetch('/api/formateur/update-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newPassword })
            })

            const data = await response.json()
            
            if (response.ok) {
                setMessage('Mot de passe personnalisé sauvegardé !')
                setNewPassword('')
                setConfirmPassword('')
                setTimeout(() => setMessage(''), 4000)
            } else {
                setMessage(data.error || 'Erreur lors de la sauvegarde')
                setTimeout(() => setMessage(''), 4000)
            }
            
        } catch (error) {
            console.error('Erreur:', error)
            setMessage('Erreur inattendue')
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setLoading(false)
        }
    }

    const sectionButtonStyle = (isActive) => ({
        flex: 1,
        padding: '8px 12px',
        backgroundColor: isActive ? '#3b82f6' : '#e5e7eb',
        color: isActive ? 'white' : '#374151',
        border: 'none',
        borderRadius: '8px',
        fontSize: '12px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.2s'
    })

    const inputStyle = {
        width: '100%',
        padding: '12px',
        border: '2px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '16px',
        marginBottom: '12px'
    }

    const buttonStyle = {
        width: '100%',
        backgroundColor: loading ? '#9ca3af' : '#10b981',
        color: 'white',
        padding: '12px',
        borderRadius: '12px',
        border: 'none',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: loading ? 'not-allowed' : 'pointer',
        marginBottom: '12px'
    }

    if (!user) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f3f4f6',
            padding: '16px'
        }}>
            <div style={{
                maxWidth: '400px',
                margin: '0 auto',
                backgroundColor: 'white',
                borderRadius: '24px',
                padding: '24px'
            }}>
                {/* En-tête */}
                <div style={{ marginBottom: '24px' }}>
                    <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, textAlign: 'center' }}>
                        Mon Profil
                    </h1>
                </div>

                {/* Informations utilisateur */}
                <div style={{ 
                    backgroundColor: '#f8fafc', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    marginBottom: '24px',
                    textAlign: 'center'
                }}>
                    <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#1f2937' }}>
                        {user.prenom} {user.nom}
                    </h2>
                    {user.email && (
                        <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                            {user.email}
                        </p>
                    )}
                </div>

                {/* Navigation sections */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    <button 
                        style={sectionButtonStyle(activeSection === 'email')}
                        onClick={() => setActiveSection('email')}
                    >
                        Email
                    </button>
                    <button 
                        style={sectionButtonStyle(activeSection === 'password')}
                        onClick={() => setActiveSection('password')}
                    >
                        Mot de passe
                    </button>
                </div>

                {/* Messages */}
                {message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        backgroundColor: message.includes('succès') ? '#d1fae5' : '#fee2e2',
                        color: message.includes('succès') ? '#065f46' : '#991b1b',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        whiteSpace: 'pre-line'
                    }}>
                        {message}
                    </div>
                )}

                {/* Section Email */}
                {activeSection === 'email' && (
                    <div>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                            Gérer mes notifications email
                        </h3>
                        
                        {/* Option 1 : Recevoir les emails */}
                        <div 
                            onClick={() => setEmail(userData.email || '')}
                            style={{
                                padding: '15px',
                                marginBottom: '12px',
                                border: '2px solid',
                                borderColor: email ? '#3b82f6' : '#e5e7eb',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                backgroundColor: email ? '#eff6ff' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <input
                                    type="radio"
                                    checked={email !== ''}
                                    onChange={() => {}}
                                    style={{ marginTop: '2px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <strong style={{ fontSize: '14px', color: '#1f2937' }}>
                                        Je souhaite recevoir une copie des messages par email
                                    </strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                        Tous les messages de la messagerie interne vous seront aussi envoyés par email
                                    </p>
                                </div>
                            </div>
                            
                            {email && (
                                <div style={{ marginTop: '12px', marginLeft: '24px' }}>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="votre.email@exemple.fr"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '8px',
                                            fontSize: '14px'
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Option 2 : Pas d'email */}
                        <div 
                            onClick={() => setEmail('')}
                            style={{
                                padding: '15px',
                                marginBottom: '16px',
                                border: '2px solid',
                                borderColor: email === '' ? '#3b82f6' : '#e5e7eb',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                backgroundColor: email === '' ? '#eff6ff' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                                <input
                                    type="radio"
                                    checked={email === ''}
                                    onChange={() => {}}
                                    style={{ marginTop: '2px' }}
                                />
                                <div style={{ flex: 1 }}>
                                    <strong style={{ fontSize: '14px', color: '#1f2937' }}>
                                        Je ne souhaite pas que mon email soit utilisé
                                    </strong>
                                    <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                                        Supprimer mon adresse email du système. Seule la messagerie interne sera utilisée.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleUpdateEmail}
                            disabled={loading}
                            style={{
                                width: '100%',
                                backgroundColor: loading ? '#9ca3af' : '#10b981',
                                color: 'white',
                                padding: '12px',
                                borderRadius: '12px',
                                border: 'none',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: loading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {loading ? 'Enregistrement...' : 'Enregistrer mon choix'}
                        </button>
                    </div>
                )}

                {/* Section Mot de passe */}
                {activeSection === 'password' && (
                    <form onSubmit={handleUpdatePassword}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
                            Définir un mot de passe personnalisé
                        </h3>
                        <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#666' }}>
                            Vous pourrez ensuite vous connecter avec votre prénom et ce mot de passe.
                        </p>
                        
                        
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nouveau mot de passe"
                            style={inputStyle}
                            required
                        />
                        
                        <input
                            type={showPasswords ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirmer le nouveau mot de passe"
                            style={inputStyle}
                            required
                        />

                        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '12px', fontSize: '14px' }}>
                            <input
                                type="checkbox"
                                checked={showPasswords}
                                onChange={(e) => setShowPasswords(e.target.checked)}
                                style={{ marginRight: '8px' }}
                            />
                            Afficher les mots de passe
                        </label>

                        <button type="submit" style={buttonStyle} disabled={loading}>
                            {loading ? 'Modification...' : 'Changer le mot de passe'}
                        </button>
                        
                        <p style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
                            Changement sécurisé sans email de notification
                        </p>
                    </form>
                )}

                {/* Bouton retour */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
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
                </div>
            </div>
        </div>
    )
}

export default withAuthFormateur(ProfilFormateur)
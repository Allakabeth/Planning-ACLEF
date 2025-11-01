import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function LoginAdmin() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [errorMessage, setErrorMessage] = useState('')
    const router = useRouter()

    const generateSessionToken = () => {
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        return `session_${timestamp}_${randomString}`
    }

    const createAdminSession = async (user) => {
        try {
            const sessionToken = generateSessionToken()

            // ✅ Vérifier les sessions de CET utilisateur
            const { data: existingSessions } = await supabase
                .from('admin_sessions')
                .select('*')
                .eq('admin_user_id', user.id)
                .eq('is_active', true)

            if (existingSessions && existingSessions.length > 0) {
                // Mettre à jour la session existante de ce gardien
                const { error: updateError } = await supabase
                    .from('admin_sessions')
                    .update({
                        heartbeat: new Date().toISOString(),
                        session_token: sessionToken
                    })
                    .eq('admin_user_id', user.id)
                    .eq('is_active', true)

                if (updateError) {
                    console.error('Erreur mise à jour session:', updateError)
                    throw new Error('Erreur de mise à jour de session')
                }

                console.log('✅ Session gardien mise à jour:', user.email)
            } else {
                // Créer une nouvelle session pour ce gardien
                const { error: insertError } = await supabase
                    .from('admin_sessions')
                    .insert({
                        admin_user_id: user.id,
                        email_admin: user.email,
                        session_token: sessionToken,
                        session_start: new Date().toISOString(),
                        heartbeat: new Date().toISOString(),
                        is_active: true
                    })

                if (insertError) {
                    console.error('Erreur création session:', insertError)
                    throw new Error('Erreur de création de session')
                }

                console.log('✅ Nouvelle session gardien créée:', user.email)
            }

            // Stocker dans localStorage (compatibility)
            localStorage.setItem('admin_connecte', JSON.stringify({
                id: user.id,
                email: user.email,
                role: 'admin',
                nom: 'Admin',
                prenom: 'ACLEF',
                dateConnexion: new Date().toISOString(),
                sessionToken: sessionToken
            }))

            // Stocker le token de session
            localStorage.setItem('admin_session_token', sessionToken)

            return sessionToken

        } catch (error) {
            console.error('Erreur gestion session:', error)
            throw error
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        setIsLoading(true)
        setErrorMessage('')

        try {
            // Authentification Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            })

            if (error) {
                throw new Error(error.message)
            }

            if (!data.user) {
                throw new Error('Échec de l\'authentification')
            }

            // 🛡️ CRÉER/VÉRIFIER SESSION
            await createAdminSession(data.user)

            console.log('✅ Authentification réussie et accès autorisé pour:', data.user.email)

            // Redirection vers dashboard admin
            router.push('/')

        } catch (error) {
            console.error('Erreur authentification:', error)
            
            // Messages d'erreur plus conviviaux
            let errorMsg = 'Erreur de connexion'
            if (error.message.includes('Invalid login credentials')) {
                errorMsg = 'Email ou mot de passe incorrect'
            } else if (error.message.includes('Email not confirmed')) {
                errorMsg = 'Email non confirmé'
            } else if (error.message.includes('Too many requests')) {
                errorMsg = 'Trop de tentatives. Attendez quelques minutes.'
            } else {
                errorMsg = 'Erreur de connexion. Veuillez réessayer.'
            }
            
            // Afficher seulement dans la zone d'erreur, pas en popup
            setErrorMessage(errorMsg)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                backgroundColor: 'white',
                padding: '40px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                width: '100%',
                maxWidth: '400px'
            }}>
                <h1 style={{
                    textAlign: 'center',
                    marginBottom: '30px',
                    color: '#333',
                    fontSize: '24px'
                }}>
                    ACLEF Planning - Admin
                </h1>

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold',
                            color: '#555'
                        }}>
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '16px',
                                backgroundColor: isLoading ? '#f3f4f6' : 'white'
                            }}
                            placeholder=""
                        />
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                        <label style={{
                            display: 'block',
                            marginBottom: '5px',
                            fontWeight: 'bold',
                            color: '#555'
                        }}>
                            Mot de passe
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '16px',
                                backgroundColor: isLoading ? '#f3f4f6' : 'white'
                            }}
                            placeholder="••••••••"
                        />
                    </div>

                    {errorMessage && (
                        <div style={{
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            padding: '15px',
                            borderRadius: '4px',
                            marginBottom: '20px',
                            fontSize: '13px',
                            lineHeight: '1.4',
                            border: '1px solid #fecaca',
                            whiteSpace: 'pre-line'
                        }}>
                            {errorMessage}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: isLoading ? '#ccc' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {isLoading ? 'Connexion...' : 'CONNEXION'}
                    </button>
                </form>

                <div style={{
                    marginTop: '20px',
                    padding: '10px',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#0369a1',
                    textAlign: 'center'
                }}>
                    <strong>Administrateurs autorisés :</strong><br />
                    albena@aclef.fr, fanny@aclef.fr,<br />
                    mathieu@aclef.fr, sarah@aclef.fr
                    <br />
                    <small style={{ color: '#dc2626', fontSize: '10px', fontWeight: 'bold' }}>
                        UN SEUL ADMINISTRATEUR À LA FOIS !
                    </small>
                </div>
            </div>
        </div>
    )
}
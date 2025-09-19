// pages/formateur/index.js - Accueil Formateur avec nouveau système d'auth
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function AccueilFormateur() {
    const [messagesNonLus, setMessagesNonLus] = useState(0)
    const { user, isLoading, isAuthenticated, logout } = useFormateurAuth()
    const router = useRouter()

    useEffect(() => {
        // Rediriger vers login si pas authentifié
        if (!isLoading && !isAuthenticated) {
            console.log('🔒 [FORMATEUR PAGE] Non authentifié, redirection vers login')
            router.push('/formateur/login')
        }
    }, [isLoading, isAuthenticated, router])

    useEffect(() => {
        if (user) {
            console.log('✅ [FORMATEUR PAGE] Utilisateur connecté:', user)
            checkMessages()
        }
    }, [user])


    const checkMessages = async () => {
        try {
            // Vérifier les messages non lus pour ce formateur
            const { data, error } = await supabase
                .from('messages')
                .select('id')
                .eq('destinataire_id', user.id)
                .eq('lu', false)
                .eq('archive', false)

            if (!error && data) {
                setMessagesNonLus(data.length)
            }
        } catch (error) {
            console.error('Erreur vérification messages:', error)
        }
    }

    const handleFermer = async () => {
        await logout()
    }

    if (isLoading) {
        return (
            <div style={{
                minHeight: '100vh',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}>
                <div style={{
                    padding: '40px',
                    textAlign: 'center'
                }}>
                    <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement...</div>
                </div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
        }}>
            <div style={{
                padding: '30px',
                maxWidth: '400px',
                width: '100%',
                textAlign: 'center'
            }}>
                {/* Titre */}
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '10px',
                    color: '#333'
                }}>
                    Planning ACLEF
                </h1>

                {/* Message personnalisé */}
                <p style={{
                    fontSize: '16px',
                    color: '#666',
                    marginBottom: '30px',
                    lineHeight: '1.4'
                }}>
                    Bonjour <strong>{user?.prenom}</strong>. 
                    Que souhaitez-vous faire ?
                </p>

                {/* Grille de boutons */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '15px',
                    marginBottom: '15px'
                }}>
                    <button
                        onClick={() => router.push('/formateur/mon-planning-hebdo')}
                        style={{
                            backgroundColor: '#6366f1',
                            color: 'white',
                            padding: '20px 15px',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Planning Hebdo
                    </button>

                    <button
                        onClick={() => router.push('/formateur/absence')}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            padding: '20px 15px',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Modifications ponctuelles
                    </button>

                    <button
                        onClick={() => router.push('/formateur/planning-formateur-type')}
                        style={{
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '20px 15px',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Déclarer mon planning type
                    </button>

                    <button
                        onClick={() => router.push('/formateur/mon-planning-type')}
                        style={{
                            backgroundColor: '#8b5cf6',
                            color: 'white',
                            padding: '20px 15px',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Afficher mon planning type
                    </button>

                    <button
                        onClick={() => router.push('/formateur/change-password')}
                        style={{
                            backgroundColor: '#f59e0b',
                            color: 'white',
                            padding: '20px 15px',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Changer de mot de passe
                    </button>

                    <button
                        onClick={() => router.push('/formateur/ma-presence')}
                        style={{
                            backgroundColor: '#059669',
                            color: 'white',
                            padding: '20px 15px',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)',
                            transition: 'transform 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        Ma Présence
                    </button>

                    <button
                        onClick={() => router.push('/formateur/ma-messagerie')}
                        style={{
                            backgroundColor: '#06b6d4',
                            color: 'white',
                            padding: '20px 15px',
                            borderRadius: '15px',
                            border: 'none',
                            fontSize: '14px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            boxShadow: '0 4px 15px rgba(6, 182, 212, 0.3)',
                            transition: 'transform 0.2s ease',
                            position: 'relative'
                        }}
                        onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                        onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                    >
                        {messagesNonLus > 0 ? (
                            <>
                                <div style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '24px',
                                    height: '24px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '12px',
                                    fontWeight: 'bold',
                                    border: '2px solid white'
                                }}>
                                    {messagesNonLus > 9 ? '9+' : messagesNonLus}
                                </div>
                                Messagerie
                            </>
                        ) : (
                            <>
                                Messagerie
                            </>
                        )}
                    </button>
                </div>

                {/* Bouton Fermer */}
                <button
                    onClick={handleFermer}
                    style={{
                        backgroundColor: '#dc3545',
                        color: 'white',
                        padding: '15px 40px',
                        borderRadius: '25px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 4px 15px rgba(220, 53, 69, 0.3)',
                        transition: 'all 0.3s ease',
                        marginTop: '10px'
                    }}
                    onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                    onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                >
                    Fermer
                </button>
            </div>
        </div>
    )
}
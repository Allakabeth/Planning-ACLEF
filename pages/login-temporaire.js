import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'

export default function LoginTemporaire() {
    const [isLoading, setIsLoading] = useState(false)
    const [gardienActuel, setGardienActuel] = useState('')
    const router = useRouter()

    useEffect(() => {
        // Récupérer le nom du gardien depuis l'URL
        const { gardien } = router.query
        if (gardien) {
            setGardienActuel(gardien)
        }
    }, [router.query])

    const handleReessayer = () => {
        setIsLoading(true)
        
        // Simulation d'attente pour faire "naturel"
        setTimeout(() => {
            setIsLoading(false)
            router.push('/login')
        }, 1500)
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
                maxWidth: '450px',
                textAlign: 'center'
            }}>
                {/* Icône de maintenance */}
                <div style={{
                    fontSize: '64px',
                    marginBottom: '20px'
                }}>
                    🔧
                </div>

                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: '#374151',
                    marginBottom: '15px'
                }}>
                    Service temporairement indisponible
                </h1>

                <p style={{
                    color: '#6b7280',
                    fontSize: '16px',
                    lineHeight: '1.5',
                    marginBottom: '25px'
                }}>
                    {gardienActuel ? (
                        <>
                            Notre système est actuellement utilisé par <strong>"{gardienActuel}"</strong>.
                            <br />
                            Veuillez patienter quelques instants puis réessayer.
                        </>
                    ) : (
                        <>
                            Notre système est actuellement utilisé par un autre utilisateur.
                            <br />
                            Veuillez patienter quelques instants puis réessayer.
                        </>
                    )}
                </p>

                <div style={{
                    backgroundColor: '#fef3c7',
                    border: '1px solid #f59e0b',
                    borderRadius: '6px',
                    padding: '15px',
                    marginBottom: '25px'
                }}>
                    <div style={{
                        fontSize: '14px',
                        color: '#92400e',
                        fontWeight: '500'
                    }}>
                        💡 Information
                    </div>
                    <div style={{
                        fontSize: '13px',
                        color: '#92400e',
                        marginTop: '5px'
                    }}>
                        Un seul utilisateur peut être connecté à la fois pour des raisons de sécurité.
                    </div>
                </div>

                <button
                    onClick={handleReessayer}
                    disabled={isLoading}
                    style={{
                        width: '100%',
                        padding: '12px 20px',
                        backgroundColor: isLoading ? '#d1d5db' : '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        transition: 'background-color 0.2s',
                        marginBottom: '15px'
                    }}
                >
                    {isLoading ? 'Redirection...' : 'Réessayer la connexion'}
                </button>

                <div style={{
                    fontSize: '12px',
                    color: '#9ca3af'
                }}>
                    Si le problème persiste, contactez votre administrateur
                </div>
            </div>
        </div>
    )
}
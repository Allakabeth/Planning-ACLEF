import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'
import { logAudit, auditUserAction, getAuditStats, AUDIT_ACTIONS } from '../lib/auditLogger'

function Debug({ user, logout }) {
    const router = useRouter()
    
    // États existants
    const [isConnected, setIsConnected] = useState(false)
    const [connectionMessage, setConnectionMessage] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    
    // 📊 NOUVEAUX ÉTATS POUR LOGS AUDIT
    const [auditStats, setAuditStats] = useState(null)
    const [recentLogs, setRecentLogs] = useState([])
    const [testResult, setTestResult] = useState('')

    useEffect(() => {
        testConnection()
        loadAuditData() // Charger données audit
    }, [])

    // Fonction existante de test connexion
    const testConnection = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('count(*)')
                .limit(1)

            if (error) {
                setConnectionMessage('❌ Erreur de connexion à Supabase')
                setIsConnected(false)
            } else {
                setConnectionMessage('✅ Connexion Supabase opérationnelle')
                setIsConnected(true)
            }
        } catch (error) {
            setConnectionMessage('❌ Erreur critique de connexion')
            setIsConnected(false)
        }
    }

    // 📊 NOUVELLES FONCTIONS AUDIT
    const loadAuditData = async () => {
        try {
            // Charger les stats
            const stats = await getAuditStats()
            setAuditStats(stats)

            // Charger les 10 derniers logs
            const { data: logs } = await supabase
                .from('audit_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(10)

            setRecentLogs(logs || [])
        } catch (error) {
            console.error('Erreur chargement audit:', error)
        }
    }

    // Test du système audit
    const testAuditSystem = async () => {
        setIsLoading(true)
        setTestResult('🧪 Test en cours...')
        
        try {
            // Test 1 : Log simple
            await logAudit(AUDIT_ACTIONS.LOGIN_ADMIN, {
                test: true,
                description: 'Test système audit depuis debug.js'
            })

            // Test 2 : Log action utilisateur
            await auditUserAction(AUDIT_ACTIONS.USER_MODIFIE, {
                id: 'test-id',
                prenom: 'Test',
                nom: 'Audit',
                role: 'test',
                avant: { status: 'ancien' },
                apres: { status: 'nouveau' }
            })

            // Recharger les données
            await loadAuditData()

            setTestResult('✅ Test audit réussi ! Vérifiez les logs ci-dessous.')

        } catch (error) {
            setTestResult(`❌ Erreur test audit: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    // Purger un formateur (fonction existante)
    const purgeFormateur = async () => {
        if (!window.confirm('Voulez-vous vraiment purger le planning d\'un formateur ?')) return
        
        const formateurId = prompt('ID du formateur à purger :')
        if (!formateurId) return

        setIsLoading(true)
        try {
            // Supprimer de planning_type_formateurs
            await supabase.from('planning_type_formateurs').delete().eq('formateur_id', formateurId)
            
            // Supprimer de absences_formateurs
            await supabase.from('absences_formateurs').delete().eq('formateur_id', formateurId)
            
            // Supprimer de planning_formateurs_hebdo
            await supabase.from('planning_formateurs_hebdo').delete().eq('formateur_id', formateurId)

            // 📊 LOG AUDIT - PURGE FORMATEUR
            await auditUserAction(AUDIT_ACTIONS.USER_SUPPRIME, {
                id: formateurId,
                action: 'purge_planning',
                description: 'Purge complète planning formateur'
            })

            setMessage('✅ Planning formateur purgé avec succès')
            setTimeout(() => setMessage(''), 5000)

        } catch (error) {
            setMessage(`❌ Erreur purge: ${error.message}`)
            setTimeout(() => setMessage(''), 5000)
        } finally {
            setIsLoading(false)
        }
    }

    // Formatage pour affichage logs
    const formatLogAction = (action) => {
        const actions = {
            'login_admin': 'Connexion Admin',
            'user_modifie': 'Utilisateur Modifié',
            'user_cree': 'Utilisateur Créé',
            'user_supprime': 'Utilisateur Supprimé',
            'planning_valide': 'Planning Validé'
        }
        return actions[action] || action
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 60px'
        }}>
            {/* Header avec navigation */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '8px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backdropFilter: 'blur(10px)'
            }}>
                <nav style={{ fontSize: '14px' }}>
                    <span style={{ color: '#6b7280' }}>Dashboard</span>
                    <span style={{ margin: '0 10px', color: '#9ca3af' }}>/</span>
                    <span style={{ color: '#ef4444', fontWeight: '500' }}>🔧 Debug & Tests</span>
                </nav>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{
                        fontSize: '12px',
                        color: '#10b981',
                        backgroundColor: '#d1fae5',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '500'
                    }}>
                        🛡️ Temple Protégé
                    </span>
                    <span style={{
                        fontSize: '12px',
                        color: '#3b82f6',
                        backgroundColor: '#dbeafe',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: '500'
                    }}>
                        👤 {user?.email}
                    </span>
                    <button
                        onClick={() => router.push('/')}
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        Accueil
                    </button>
                </div>
            </div>

            {/* Titre principal */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '10px'
                }}>
                    🔧 Debug & Tests Système
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Outils de diagnostic et tests pour développeurs
                </p>
            </div>

            {/* Message de notification */}
            {message && (
                <div style={{
                    backgroundColor: message.includes('✅') ? '#d1fae5' : '#fee2e2',
                    color: message.includes('✅') ? '#065f46' : '#991b1b',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontWeight: '500'
                }}>
                    {message}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* SECTION EXISTANTE - Connexion & Purge */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: '15px'
                    }}>
                        🔌 Tests Connexion
                    </h2>

                    <div style={{ marginBottom: '20px' }}>
                        <div style={{
                            padding: '15px',
                            backgroundColor: isConnected ? '#d1fae5' : '#fee2e2',
                            border: `1px solid ${isConnected ? '#10b981' : '#ef4444'}`,
                            borderRadius: '8px',
                            marginBottom: '15px'
                        }}>
                            <strong>{connectionMessage}</strong>
                        </div>

                        <button
                            onClick={testConnection}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                marginBottom: '15px'
                            }}
                        >
                            🔄 Retester la connexion
                        </button>
                    </div>

                    <div style={{ paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626', marginBottom: '10px' }}>
                            ⚠️ Zone Dangereuse
                        </h3>
                        <button
                            onClick={purgeFormateur}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '12px',
                                backgroundColor: isLoading ? '#9ca3af' : '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? 'Purge...' : '🗑️ Purger Planning Formateur'}
                        </button>
                    </div>
                </div>

                {/* 📊 NOUVELLE SECTION - Tests Logs Audit */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1f2937',
                        marginBottom: '15px'
                    }}>
                        📊 Tests Logs Audit
                    </h2>

                    {/* Stats audit */}
                    {auditStats && (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: '10px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#f0f9ff',
                                borderRadius: '6px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
                                    {auditStats.total_logs}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Total logs</div>
                            </div>
                            <div style={{
                                padding: '10px',
                                backgroundColor: '#f0fdf4',
                                borderRadius: '6px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
                                    {auditStats.actions_today}
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>Aujourd'hui</div>
                            </div>
                        </div>
                    )}

                    {/* Test result */}
                    {testResult && (
                        <div style={{
                            padding: '10px',
                            backgroundColor: testResult.includes('✅') ? '#d1fae5' : '#fef3c7',
                            border: `1px solid ${testResult.includes('✅') ? '#10b981' : '#f59e0b'}`,
                            borderRadius: '6px',
                            marginBottom: '15px',
                            fontSize: '13px'
                        }}>
                            {testResult}
                        </div>
                    )}

                    <button
                        onClick={testAuditSystem}
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: isLoading ? '#9ca3af' : '#8b5cf6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            marginBottom: '20px'
                        }}
                    >
                        {isLoading ? 'Test...' : '🧪 Tester Système Audit'}
                    </button>

                    <button
                        onClick={() => router.push('/logs-audit')}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            marginBottom: '20px'
                        }}
                    >
                        📊 Voir Interface Logs Complète
                    </button>

                    {/* Derniers logs */}
                    {recentLogs.length > 0 && (
                        <div style={{ paddingTop: '15px', borderTop: '1px solid #e5e7eb' }}>
                            <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px' }}>
                                🕐 Derniers logs
                            </h4>
                            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                {recentLogs.slice(0, 5).map((log) => (
                                    <div key={log.id} style={{
                                        padding: '8px',
                                        borderBottom: '1px solid #f3f4f6',
                                        fontSize: '12px'
                                    }}>
                                        <div style={{ fontWeight: '500', color: '#374151' }}>
                                            {formatLogAction(log.action)}
                                        </div>
                                        <div style={{ color: '#6b7280' }}>
                                            {new Date(log.timestamp).toLocaleString('fr-FR')} • {log.admin_email}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// 🛡️ PROTECTION AVEC HOC
export default withAuthAdmin(Debug, "Debug & Tests")
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function PlanningTypeApprenants({ user, logout, inactivityTime }) {
    const router = useRouter()
    
    // États principaux
    const [apprenants, setApprenants] = useState([])
    const [apprenantSelectionne, setApprenantSelectionne] = useState(null)
    const [lieux, setLieux] = useState([])
    const [planningType, setPlanningType] = useState({})
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)

    // Constantes
    const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi']
    const creneaux = ['matin', 'AM']

    // Chargement initial des données
    useEffect(() => {
        fetchApprenants()
        fetchLieux()
    }, [])

    // Fonction pour récupérer les apprenants
    const fetchApprenants = async () => {
        try {
            // Tentative avec vue enrichie
            let { data, error } = await supabase
                .from('apprenants_actifs')
                .select('id, prenom, nom, statut_formation')
                .eq('statut_formation', 'en_cours')
                .order('nom')

            // Fallback sur table users si vue indisponible
            if (error && error.code === 'PGRST106') {
                console.log('Vue apprenants_actifs non disponible, utilisation table users')
                const result = await supabase
                    .from('users')
                    .select('id, prenom, nom, statut_formation')
                    .eq('role', 'apprenant')
                    .eq('archive', false)
                    .order('nom')
                
                data = result.data
                error = result.error
            }

            if (error) throw error
            setApprenants(data || [])
        } catch (err) {
            console.error('Erreur chargement apprenants:', err)
            setMessage({
                type: 'error',
                text: 'Erreur lors du chargement des apprenants'
            })
        }
    }

    // Fonction pour récupérer les lieux
    const fetchLieux = async () => {
        try {
            const { data, error } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)
                .order('nom')

            if (error) throw error
            setLieux(data || [])
        } catch (err) {
            console.error('Erreur chargement lieux:', err)
            setMessage({
                type: 'error',
                text: 'Erreur lors du chargement des lieux'
            })
        }
    }

    // Fonction pour charger le planning existant d'un apprenant
    const fetchPlanningType = async (apprenantId) => {
        if (!apprenantId) return

        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('planning_apprenants')
                .select(`
                    jour, creneau, lieu_id,
                    lieux:lieu_id (nom, couleur, initiale)
                `)
                .eq('apprenant_id', apprenantId)
                .eq('actif', true)

            if (error) throw error

            // Convertir en format grille pour l'interface
            const planning = {}
            data?.forEach(item => {
                const key = `${item.jour}-${item.creneau}`
                planning[key] = {
                    lieu_id: item.lieu_id,
                    lieu_nom: item.lieux?.nom,
                    lieu_couleur: item.lieux?.couleur,
                    lieu_initiale: item.lieux?.initiale
                }
            })

            setPlanningType(planning)
        } catch (err) {
            console.error('Erreur chargement planning:', err)
            setMessage({
                type: 'error',
                text: 'Erreur lors du chargement du planning'
            })
        } finally {
            setLoading(false)
        }
    }

    // Gestion changement d'apprenant sélectionné
    const handleApprenantChange = (apprenantId) => {
        const apprenant = apprenants.find(a => a.id === apprenantId)
        setApprenantSelectionne(apprenant)
        setPlanningType({}) // Reset grille
        setMessage(null)

        if (apprenant) {
            fetchPlanningType(apprenant.id)
        }
    }

    // Gestion changement d'une case de la grille
    const handleCaseChange = (key, lieuId) => {
        if (lieuId) {
            const lieu = lieux.find(l => l.id === lieuId)
            setPlanningType(prev => ({
                ...prev,
                [key]: {
                    lieu_id: lieuId,
                    lieu_nom: lieu?.nom,
                    lieu_couleur: lieu?.couleur,
                    lieu_initiale: lieu?.initiale
                }
            }))
        } else {
            // Retirer la sélection
            setPlanningType(prev => {
                const newPlanning = { ...prev }
                delete newPlanning[key]
                return newPlanning
            })
        }
    }

    // Sauvegarde du planning
    const sauvegarderPlanning = async () => {
        if (!apprenantSelectionne) {
            setMessage({
                type: 'error',
                text: 'Veuillez sélectionner un apprenant'
            })
            return
        }

        setLoading(true)
        try {
            // 1. Supprimer l'ancien planning de cet apprenant
            await supabase
                .from('planning_apprenants')
                .delete()
                .eq('apprenant_id', apprenantSelectionne.id)

            // 2. Insérer le nouveau planning
            const planningArray = Object.entries(planningType)
                .filter(([key, value]) => value.lieu_id) // Seules les cases avec lieu
                .map(([key, value]) => {
                    const [jour, creneau] = key.split('-')
                    return {
                        apprenant_id: apprenantSelectionne.id,
                        jour,
                        creneau,
                        lieu_id: value.lieu_id
                    }
                })

            if (planningArray.length > 0) {
                const { error } = await supabase
                    .from('planning_apprenants')
                    .insert(planningArray)

                if (error) throw error
            }

            setMessage({
                type: 'success',
                text: `✅ Planning sauvegardé pour ${apprenantSelectionne.prenom} ${apprenantSelectionne.nom} (${planningArray.length} créneaux)`
            })

        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            setMessage({
                type: 'error',
                text: '❌ Erreur lors de la sauvegarde'
            })
        } finally {
            setLoading(false)
        }
    }

    // Composant Case de planning
    const CasePlanning = ({ jour, creneau }) => {
        const key = `${jour}-${creneau}`
        const currentValue = planningType[key]

        return (
            <td className="case-planning">
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    <select
                        value={currentValue?.lieu_id || ''}
                        onChange={(e) => handleCaseChange(key, e.target.value)}
                        className="select-lieu"
                        style={{
                            backgroundColor: currentValue?.lieu_couleur || 'rgba(255, 255, 255, 0.9)',
                            color: currentValue?.lieu_couleur ? 'white' : '#374151',
                            fontWeight: currentValue?.lieu_couleur ? 'bold' : 'normal'
                        }}
                        disabled={!apprenantSelectionne}
                    >
                        <option value="">--</option>
                        {lieux.map(lieu => (
                            <option key={lieu.id} value={lieu.id}>
                                {lieu.initiale || lieu.nom}
                            </option>
                        ))}
                    </select>
                </div>
            </td>
        )
    }

    // Statistiques du planning
    const nbCreneaux = Object.keys(planningType).length

    return (
        <>
            {/* Styles CSS intégrés */}
            <style jsx>{`
                .planning-type-apprenants {
                    min-height: 100vh;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 20px;
                }

                .container-planning {
                    max-width: 1200px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 20px;
                    border: 1px solid #e5e7eb;
                    padding: 30px;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }

                .header-title {
                    color: #667eea;
                    font-size: 28px;
                    font-weight: bold;
                    text-align: center;
                    margin-bottom: 30px;
                    text-shadow: 0 2px 4px rgba(255,255,255,0.3);
                }


                .selecteur-section {
                    background: #667eea;
                    border-radius: 15px;
                    padding: 25px;
                    margin-bottom: 30px;
                    border: 1px solid #667eea;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-align: center;
                }

                .selecteur-label {
                    color: white;
                    font-size: 18px;
                    font-weight: bold;
                    margin-bottom: 15px;
                    display: block;
                }

                .select-apprenant {
                    width: 100%;
                    max-width: 400px;
                    padding: 12px 16px;
                    border: none;
                    border-radius: 10px;
                    background: rgba(255, 255, 255, 0.95);
                    font-size: 16px;
                    font-weight: 500;
                    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                    cursor: pointer;
                    text-align: center;
                    margin: 0 auto;
                    display: block;
                }

                .grille-container {
                    background: #667eea;
                    border-radius: 15px;
                    padding: 20px;
                    margin: 20px 0;
                    border: 1px solid #667eea;
                }

                .grille-planning {
                    width: 100%;
                    border-collapse: collapse;
                    background: transparent;
                    border-radius: 15px;
                    overflow: hidden;
                    border: none;
                }

                .header-jour, .header-creneau {
                    background: transparent;
                    color: white;
                    padding: 15px;
                    font-weight: bold;
                    text-align: center;
                    font-size: 14px;
                    border: none;
                }

                .label-creneau {
                    background: transparent;
                    color: white;
                    padding: 15px;
                    font-weight: bold;
                    text-align: center;
                    width: 100px;
                    font-size: 13px;
                    border: none;
                }

                .case-planning {
                    padding: 12px;
                    border: none;
                    text-align: center !important;
                    background: transparent;
                    transition: background-color 0.3s ease;
                    vertical-align: middle;
                    width: auto;
                }

                .case-planning:hover {
                    background: #f9fafb;
                }

                .select-lieu {
                    width: 120px !important;
                    max-width: 120px !important;
                    padding: 6px 4px !important;
                    border: 1px solid #d1d5db;
                    border-radius: 6px;
                    font-size: 12px !important;
                    font-weight: bold !important;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    margin: 0 auto !important;
                    display: inline-block !important;
                    text-align: center !important;
                    text-align-last: center !important;
                    -webkit-appearance: none !important;
                    -moz-appearance: none !important;
                    appearance: none !important;
                    background-repeat: no-repeat;
                    background-position: right 4px center;
                    background-size: 8px;
                    background-image: url("data:image/svg+xml;charset=UTF-8,<svg viewBox='0 0 16 16' fill='%23374151' xmlns='http://www.w3.org/2000/svg'><path d='M4.427 6.427a.75.75 0 011.06 0L8 8.94l2.513-2.513a.75.75 0 111.06 1.06l-3.043 3.044a.75.75 0 01-1.06 0L4.427 7.487a.75.75 0 010-1.06z'/></svg>") !important;
                    padding-right: 16px !important;
                }

                .select-lieu:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .actions-section {
                    background: white;
                    border-radius: 15px;
                    padding: 25px;
                    text-align: center;
                    border: none;
                }

                .btn-sauvegarder {
                    background: linear-gradient(135deg, #4CAF50, #45a049);
                    color: white;
                    border: none;
                    padding: 15px 30px;
                    border-radius: 10px;
                    font-size: 16px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: transform 0.2s ease;
                    box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
                }

                .btn-sauvegarder:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
                }

                .btn-sauvegarder:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                    transform: none;
                }

                .stats-planning {
                    margin-top: 15px;
                    color: #6b7280;
                    font-size: 16px;
                    font-style: italic;
                }

                .message {
                    padding: 15px 20px;
                    border-radius: 10px;
                    margin: 20px 0;
                    font-weight: 500;
                    text-align: center;
                }

                .message.success {
                    background: rgba(76, 175, 80, 0.2);
                    color: #4CAF50;
                    border: 1px solid rgba(76, 175, 80, 0.3);
                }

                .message.error {
                    background: rgba(244, 67, 54, 0.2);
                    color: #f44336;
                    border: 1px solid rgba(244, 67, 54, 0.3);
                }

                .loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 15px;
                }

                @media (max-width: 768px) {
                    .planning-type-apprenants {
                        padding: 10px;
                    }
                    
                    .container-planning {
                        padding: 20px;
                    }
                    
                    .grille-planning {
                        font-size: 12px;
                    }
                    
                    .select-lieu {
                        font-size: 11px;
                        padding: 6px;
                    }
                    
                    .header-jour, .label-creneau {
                        padding: 8px;
                        font-size: 12px;
                    }
                }
            `}</style>

            <div className="planning-type-apprenants">
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
                        <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Planning Type Apprenants</span>
                    </nav>
                    
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                        <div style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '6px',
                            backgroundColor: inactivityTime >= 240 ? '#fee2e2' : inactivityTime >= 180 ? '#fef3c7' : '#d1fae5',
                            color: inactivityTime >= 240 ? '#dc2626' : inactivityTime >= 180 ? '#f59e0b' : '#10b981',
                            border: '1px solid',
                            borderColor: inactivityTime >= 240 ? '#fecaca' : inactivityTime >= 180 ? '#fde68a' : '#bbf7d0'
                        }}>
                            Status : {inactivityTime >= 300 ? '😴 ENDORMI!' : 
                                     inactivityTime >= 240 ? `⚠️ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                     inactivityTime >= 180 ? `⏰ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                     `🟢 ACTIF`}
                        </div>
                        <button
                            onClick={logout}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            🚪 Déconnexion
                        </button>
                    </div>
                </div>

                <div className="container-planning">
                    <h1 className="header-title">
                        Planning Type Apprenants
                    </h1>

                    {/* Sélecteur d'apprenant */}
                    <div className="selecteur-section">
                        <label className="selecteur-label">
                            Sélectionner un apprenant :
                        </label>
                        <select 
                            value={apprenantSelectionne?.id || ''}
                            onChange={(e) => handleApprenantChange(e.target.value)}
                            className="select-apprenant"
                        >
                            <option value="">-- Choisir un apprenant --</option>
                            {apprenants.map(apprenant => (
                                <option key={apprenant.id} value={apprenant.id}>
                                    {apprenant.prenom} {apprenant.nom}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Message d'information */}
                    {message && (
                        <div className={`message ${message.type}`}>
                            {message.text}
                        </div>
                    )}

                    {/* Grille de planning */}
                    <div className="grille-container" style={{ position: 'relative' }}>
                        {loading && (
                            <div className="loading-overlay">
                                <div style={{ color: 'white', fontSize: '18px' }}>
                                    Chargement...
                                </div>
                            </div>
                        )}
                        
                        <table className="grille-planning">
                            <thead>
                                <tr>
                                    <th className="header-creneau"></th>
                                    {jours.map(jour => (
                                        <th key={jour} className="header-jour">
                                            {jour.charAt(0).toUpperCase() + jour.slice(1)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {creneaux.map(creneau => (
                                    <tr key={creneau}>
                                        <td className="label-creneau">
                                            {creneau === 'matin' ? 'Matin' : 'AM'}
                                        </td>
                                        {jours.map(jour => (
                                            <CasePlanning
                                                key={`${jour}-${creneau}`}
                                                jour={jour}
                                                creneau={creneau}
                                            />
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Actions et statistiques */}
                    <div className="actions-section">
                        <button 
                            onClick={sauvegarderPlanning}
                            disabled={!apprenantSelectionne || loading}
                            className="btn-sauvegarder"
                        >
                            {loading ? 'Sauvegarde...' : 'Sauvegarder Planning'}
                        </button>
                        
                        {apprenantSelectionne && (
                            <div className="stats-planning">
                                {nbCreneaux} créneau(s) défini(s) pour {apprenantSelectionne.prenom} {apprenantSelectionne.nom}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

// Protection avec HOC admin
export default withAuthAdmin(PlanningTypeApprenants, "Planning Type Apprenants")
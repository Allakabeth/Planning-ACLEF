import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function MonPlanningType() {
    const { user, isLoading: authLoading, isAuthenticated } = useFormateurAuth()
    const [planningType, setPlanningType] = useState([])
    const [lieux, setLieux] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')
    const router = useRouter()

    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
    const creneaux = ['Matin', 'AM']  // ✅ CORRECTION: AM au lieu d'Après-midi

    // Protection authentification
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/formateur/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (user) {
            loadPlanningType(user.id)
        }
    }, [user])


    const loadPlanningType = async (formateurId) => {
        try {
            console.log('🔍 Chargement planning type pour:', formateurId)

            // Charger les lieux pour affichage
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)

            if (lieuxError) throw lieuxError
            setLieux(lieuxData || [])

            // ✅ MODIFICATION: Charger SEULEMENT les disponibilités NORMALES validées
            const { data: planningData, error: planningError } = await supabase
                .from('planning_type_formateurs')
                .select(`
                    id,
                    jour,
                    creneau,
                    statut,
                    lieu_id,
                    valide,
                    valide_par,
                    date_validation,
                    created_at
                `)
                .eq('formateur_id', formateurId)
                .eq('valide', true)
                .eq('statut', 'disponible')  // ✅ NOUVEAU: Filtre SEULEMENT les dispo normales
                .order('created_at')

            if (planningError) throw planningError

            console.log('✅ Planning type NORMAL validé chargé:', planningData?.length || 0, 'créneaux')
            setPlanningType(planningData || [])

        } catch (error) {
            console.error('Erreur chargement planning:', error)
            setMessage('Erreur lors du chargement de votre planning')
        } finally {
            setIsLoading(false)
        }
    }

    // Fonction pour obtenir les détails d'un créneau
    const getCreneauInfo = (jour, creneau) => {
        return planningType.find(pt => pt.jour === jour && pt.creneau === creneau)
    }

    // Fonction pour obtenir la couleur d'un lieu
    const getLieuCouleur = (lieuId) => {
        if (!lieuId) return '#f3f4f6'
        const lieu = lieux.find(l => l.id === lieuId)
        return lieu?.couleur || '#f3f4f6'
    }

    // Fonction pour obtenir le nom d'un lieu
    const getLieuNom = (lieuId) => {
        if (!lieuId) return 'Sans préférence'
        const lieu = lieux.find(l => l.id === lieuId)
        return lieu?.nom || 'Lieu inconnu'
    }

    // Fonction pour déterminer la couleur du texte
    const getTextColor = (backgroundColor) => {
        if (!backgroundColor || backgroundColor === '#f3f4f6') return '#000000'
        
        const hex = backgroundColor.replace('#', '')
        const r = parseInt(hex.substr(0, 2), 16)
        const g = parseInt(hex.substr(2, 2), 16)
        const b = parseInt(hex.substr(4, 2), 16)
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        return luminance > 0.5 ? '#000000' : '#ffffff'
    }

    if (isLoading || authLoading) {
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
                    <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement de votre planning...</div>
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
            padding: '16px'
        }}>
            <div style={{
                maxWidth: '420px',
                margin: '0 auto',
                backgroundColor: 'white',
                borderRadius: '24px',
                padding: '20px'
            }}>
                {/* En-tête */}
                <div style={{ marginBottom: '16px', textAlign: 'center' }}>
                    <h1 style={{ 
                        fontSize: '20px', 
                        fontWeight: 'bold', 
                        margin: '0 0 6px 0',
                        color: '#1f2937'
                    }}>
                        Mon Planning Type
                    </h1>
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#6b7280',
                        margin: '0'
                    }}>
                        Vos disponibilités habituelles validées
                    </p>
                </div>

                {/* Messages */}
                {message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        fontSize: '14px',
                        textAlign: 'center'
                    }}>
                        {message}
                    </div>
                )}

                {/* Contenu principal */}
                {planningType.length === 0 ? (
                    // Aucun planning validé
                    <div style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        backgroundColor: '#fef3c7',
                        borderRadius: '12px',
                        border: '2px solid #f59e0b'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
                        <h3 style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            color: '#92400e',
                            margin: '0 0 12px 0'
                        }}>
                            Planning en attente
                        </h3>
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#92400e',
                            margin: '0 0 20px 0',
                            lineHeight: '1.5'
                        }}>
                            Vos disponibilités habituelles n'ont pas encore été validées par l'administration.
                        </p>
                        <div style={{
                            backgroundColor: '#fffbeb',
                            padding: '12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#92400e'
                        }}>
                            <strong>Que faire ?</strong><br />
                            Patientez ou contactez l'administration pour connaître le statut de validation.
                        </div>
                    </div>
                ) : (
                    // Planning validé - Affichage grille
                    <>
                        {/* Grille planning */}
                        <div style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            padding: '12px',
                            marginBottom: '16px'
                        }}>
                            <table style={{ 
                                width: '100%', 
                                borderCollapse: 'separate',
                                borderSpacing: '4px'
                            }}>
                                <thead>
                                    <tr>
                                        <th style={{ 
                                            padding: '8px 4px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textAlign: 'center',
                                            width: '60px'
                                        }}>
                                            Créneaux
                                        </th>
                                        {jours.map(jour => (
                                            <th key={jour} style={{ 
                                                padding: '8px 4px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: '#6b7280',
                                                textAlign: 'center'
                                            }}>
                                                {jour.substring(0, 3)}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {creneaux.map(creneau => (
                                        <tr key={creneau}>
                                            <td style={{ 
                                                padding: '8px 4px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                color: '#374151',
                                                textAlign: 'center',
                                                backgroundColor: creneau === 'Matin' ? '#fef3c7' : '#dbeafe',
                                                borderRadius: '6px'
                                            }}>
                                                {creneau === 'Matin' ? 'M' : 'AM'}
                                            </td>
                                            {jours.map(jour => {
                                                const creneauInfo = getCreneauInfo(jour, creneau)
                                                const backgroundColor = creneauInfo ? getLieuCouleur(creneauInfo.lieu_id) : '#f3f4f6'
                                                const textColor = getTextColor(backgroundColor)
                                                
                                                return (
                                                    <td key={`${jour}-${creneau}`} style={{ 
                                                        padding: '0',
                                                        textAlign: 'center'
                                                    }}>
                                                        <div style={{
                                                            minHeight: '50px',
                                                            backgroundColor: creneauInfo ? '#3b82f6' : '#f3f4f6', // ✅ Toujours bleu pour dispo normale
                                                            color: creneauInfo ? 'white' : '#d1d5db',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            padding: '4px',
                                                            border: creneauInfo ? 
                                                                `3px solid ${getLieuCouleur(creneauInfo.lieu_id)}` : 
                                                                '1px solid #e5e7eb',
                                                            position: 'relative'
                                                        }}>
                                                            {creneauInfo ? (
                                                                <div style={{ 
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                    lineHeight: '1.2'
                                                                }}>
                                                                    {lieux.find(l => l.id === creneauInfo.lieu_id)?.initiale || 'S/P'}
                                                                </div>
                                                            ) : (
                                                                <div style={{ 
                                                                    fontSize: '14px',
                                                                    color: '#d1d5db'
                                                                }}>
                                                                    -
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Légende */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '12px',
                            borderRadius: '12px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#374151',
                                margin: '0 0 8px 0'
                            }}>
                                Légende
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#3b82f6',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '8px',
                                        fontWeight: 'bold'
                                    }}>
                                        ✓
                                    </div>
                                    <span style={{ color: '#374151' }}>Disponibilité habituelle validée</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        border: '3px solid #10b981',
                                        borderRadius: '4px'
                                    }} />
                                    <span style={{ color: '#374151' }}>Bordure colorée = lieu d'intervention</span>
                                </div>
                            </div>
                        </div>

                        {/* Détails des créneaux */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '12px',
                            borderRadius: '12px',
                            marginBottom: '16px'
                        }}>
                            <h4 style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#374151',
                                margin: '0 0 8px 0'
                            }}>
                                Vos disponibilités habituelles
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {planningType.map((creneau, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        backgroundColor: '#eff6ff', // ✅ Toujours bleu pour disponibilité normale
                                        borderRadius: '8px',
                                        border: `2px solid ${getLieuCouleur(creneau.lieu_id)}`,
                                        fontSize: '13px'
                                    }}>
                                        <div style={{ 
                                            fontWeight: '600', 
                                            color: '#1e40af' // ✅ Toujours bleu pour disponibilité normale
                                        }}>
                                            {creneau.jour} {creneau.creneau}
                                        </div>
                                        <div style={{ 
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px'
                                        }}>
                                            <div style={{
                                                width: '14px',
                                                height: '14px',
                                                backgroundColor: getLieuCouleur(creneau.lieu_id),
                                                borderRadius: '3px'
                                            }} />
                                            <span style={{ 
                                                color: '#6b7280',
                                                fontSize: '12px'
                                            }}>
                                                {getLieuNom(creneau.lieu_id)}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: '600',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: '#3b82f6', // ✅ Toujours bleu pour disponibilité normale
                                                color: 'white'
                                            }}>
                                                VALIDÉ
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Boutons d'action */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={() => router.push('/formateur')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            background: '#6b7280',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'transform 0.2s'
                        }}
                    >
                        Retour à l'accueil
                    </button>
                    
                    {planningType.length === 0 && (
                        <button
                            onClick={() => router.push('/formateur/planning-formateur-type')}
                            style={{
                                flex: 1,
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                textAlign: 'center',
                                padding: '12px',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Déclarer planning
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function MonPlanningType({ 
    formateurId,
    formateurData,
    onError 
}) {
    const [planningType, setPlanningType] = useState([])
    const [lieux, setLieux] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [statsValidation, setStatsValidation] = useState(null)

    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
    const creneaux = ['Matin', 'AM']

    useEffect(() => {
        if (formateurId) {
            loadPlanningType(formateurId)
        }
    }, [formateurId])

    const loadPlanningType = async (id) => {
        try {
            setIsLoading(true)
            console.log('🔍 Chargement planning type pour:', formateurData?.prenom, formateurData?.nom)

            // Charger les lieux pour affichage
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)

            if (lieuxError) throw lieuxError
            setLieux(lieuxData || [])

            // Charger SEULEMENT les disponibilités NORMALES validées
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
                .eq('formateur_id', id)
                .eq('valide', true)
                .eq('statut', 'disponible')  // Filtre SEULEMENT les dispo normales
                .order('created_at')

            if (planningError) throw planningError

            console.log('✅ Planning type NORMAL validé chargé:', planningData?.length || 0, 'créneaux')
            setPlanningType(planningData || [])

            // Calculer les stats de validation
            if (planningData && planningData.length > 0) {
                const premierElement = planningData[0]
                setStatsValidation({
                    dateValidation: premierElement.date_validation,
                    validePar: premierElement.valide_par,
                    totalCreneaux: planningData.length
                })
            } else {
                setStatsValidation(null)
            }

        } catch (error) {
            console.error('Erreur chargement planning:', error)
            onError?.(`Erreur chargement: ${error.message}`)
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

    // Fonction pour obtenir les initiales d'un lieu
    const getLieuInitiales = (lieuId) => {
        if (!lieuId) return 'SP'
        const lieu = lieux.find(l => l.id === lieuId)
        return lieu?.initiale || 'S/P'
    }

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement du planning type...</div>
            </div>
        )
    }

    if (!formateurId || !formateurData) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px'
            }}>
                <div style={{ color: '#6b7280', fontSize: '16px' }}>Aucun formateur sélectionné</div>
            </div>
        )
    }

    return (
        <div style={{ 
            padding: '20px', 
            fontFamily: 'system-ui',
            maxWidth: '100%',
            height: '100%',
            overflow: 'hidden'
        }}>
            {/* En-tête simplifié */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: '#374151'
                }}>
                    ✅ Planning Type Validé - {formateurData.prenom} {formateurData.nom}
                </h2>
            </div>

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
                        Planning en attente de validation
                    </h3>
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#92400e',
                        margin: '0 0 20px 0',
                        lineHeight: '1.5'
                    }}>
                        Les disponibilités habituelles de ce formateur n'ont pas encore été validées.
                    </p>
                    <div style={{
                        backgroundColor: '#fffbeb',
                        padding: '12px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        color: '#92400e'
                    }}>
                        <strong>Action recommandée :</strong><br />
                        Utilisez l'onglet "Planning Type" pour déclarer ou modifier les disponibilités.
                    </div>
                </div>
            ) : (
                // Planning validé - Layout compact
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: 'calc(100% - 80px)' }}>
                    
                    {/* Colonne gauche - Grille planning */}
                    <div style={{
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        padding: '16px'
                    }}>
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'separate',
                            borderSpacing: '6px'
                        }}>
                            <thead>
                                <tr>
                                    <th style={{ 
                                        padding: '8px 4px',
                                        fontSize: '12px',
                                        fontWeight: '600',
                                        color: '#6b7280',
                                        textAlign: 'center',
                                        width: '80px'
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
                                            
                                            return (
                                                <td key={`${jour}-${creneau}`} style={{ 
                                                    padding: '0',
                                                    textAlign: 'center'
                                                }}>
                                                    <div style={{
                                                        minHeight: '45px',
                                                        backgroundColor: creneauInfo ? '#3b82f6' : '#f3f4f6',
                                                        color: creneauInfo ? 'white' : '#d1d5db',
                                                        borderRadius: '6px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '4px',
                                                        border: creneauInfo ? 
                                                            `3px solid ${getLieuCouleur(creneauInfo.lieu_id)}` : 
                                                            '1px solid #e5e7eb'
                                                    }}>
                                                        {creneauInfo ? (
                                                            <div style={{ 
                                                                fontSize: '12px',
                                                                fontWeight: 'bold',
                                                                textAlign: 'center'
                                                            }}>
                                                                {getLieuInitiales(creneauInfo.lieu_id)}
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

                    {/* Colonne droite - Détails des créneaux */}
                    <div style={{
                        backgroundColor: '#f8fafc',
                        padding: '16px',
                        borderRadius: '12px'
                    }}>
                        <h4 style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#374151',
                            margin: '0 0 12px 0'
                        }}>
                            📅 Détail des disponibilités validées
                        </h4>
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '6px',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            {planningType.map((creneau, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '10px 12px',
                                    backgroundColor: '#eff6ff',
                                    borderRadius: '6px',
                                    border: `2px solid ${getLieuCouleur(creneau.lieu_id)}`,
                                    fontSize: '13px'
                                }}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        color: '#1e40af'
                                    }}>
                                        {creneau.jour} {creneau.creneau === 'Matin' ? 'M' : 'AM'}
                                    </div>
                                    <div style={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <div style={{
                                            width: '12px',
                                            height: '12px',
                                            backgroundColor: getLieuCouleur(creneau.lieu_id),
                                            borderRadius: '2px'
                                        }} />
                                        <span style={{ 
                                            color: '#6b7280',
                                            fontSize: '12px'
                                        }}>
                                            {getLieuNom(creneau.lieu_id)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Stats validation compactes */}
                        {statsValidation && (
                            <div style={{
                                marginTop: '16px',
                                backgroundColor: '#ecfdf5',
                                border: '2px solid #10b981',
                                padding: '12px',
                                borderRadius: '8px'
                            }}>
                                <div style={{ color: '#065f46', fontSize: '12px' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                                        📊 {statsValidation.totalCreneaux} créneaux validés
                                    </div>
                                    {statsValidation.dateValidation && (
                                        <div>Validé le {new Date(statsValidation.dateValidation).toLocaleDateString('fr-FR')}</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
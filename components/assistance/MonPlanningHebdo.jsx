import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function MonPlanningHebdo({ 
    formateurId,
    formateurData,
    onError 
}) {
    const [planningType, setPlanningType] = useState([])
    const [absencesValidees, setAbsencesValidees] = useState([])
    const [planningCoordo, setPlanningCoordo] = useState([])
    const [planningFinal, setPlanningFinal] = useState([])
    const [lieux, setLieux] = useState([])
    const [currentWeek, setCurrentWeek] = useState(new Date())
    const [isLoading, setIsLoading] = useState(true)

    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
    const creneaux = ['Matin', 'AM']

    useEffect(() => {
        if (formateurId) {
            loadPlanningData()
        }
    }, [formateurId, currentWeek])

    const loadPlanningData = async () => {
        if (!formateurId) return
        
        try {
            setIsLoading(true)
            console.log('🔍 Chargement planning hebdomadaire pour:', formateurData?.prenom, formateurData?.nom)

            // Charger les lieux
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)

            if (lieuxError) throw lieuxError
            setLieux(lieuxData || [])

            // 1. Charger SEULEMENT le planning type NORMAL validé
            const { data: planningTypeData, error: planningTypeError } = await supabase
                .from('planning_type_formateurs')
                .select(`
                    id,
                    jour,
                    creneau,
                    statut,
                    lieu_id,
                    valide,
                    created_at
                `)
                .eq('formateur_id', formateurId)
                .eq('valide', true)
                .eq('statut', 'disponible')  // Filtre SEULEMENT les dispo normales

            if (planningTypeError) throw planningTypeError
            setPlanningType(planningTypeData || [])
            console.log('📋 Planning type NORMAL chargé:', planningTypeData?.length || 0, 'créneaux')

            // 2. Charger les absences/modifications validées pour cette semaine
            const weekDates = getWeekDates(currentWeek)
            const startDate = weekDates[0].toISOString().split('T')[0]
            const endDate = weekDates[4].toISOString().split('T')[0]

            console.log('📅 Recherche absences pour la période:', startDate, 'à', endDate)

            const { data: absencesData, error: absencesError } = await supabase
                .from('absences_formateurs')
                .select(`
                    id,
                    date_debut,
                    date_fin,
                    type,
                    statut,
                    motif,
                    created_at
                `)
                .eq('formateur_id', formateurId)
                .eq('statut', 'validé')
                .gte('date_debut', startDate)
                .lte('date_fin', endDate)

            if (absencesError) throw absencesError
            setAbsencesValidees(absencesData || [])
            console.log('🚫 Absences validées chargées:', absencesData?.length || 0)

            // 3. Charger le planning coordo avec filtrage pour ce formateur
            console.log('🔧 Chargement planning coordo pour formateur:', formateurId)
            
            const { data: planningCoordoData, error: coordoError } = await supabase
                .from('planning_hebdomadaire')
                .select(`
                    id,
                    date,
                    jour,
                    creneau,
                    lieu_id,
                    formateurs_ids,
                    created_at
                `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('created_at', { ascending: false }) // Plus récent en premier

            if (coordoError) throw coordoError
            
            // Filtrage côté client pour ce formateur spécifique
            const planningCoordoFormateur = (planningCoordoData || []).filter(pc => {
                const estAffecte = pc.formateurs_ids && pc.formateurs_ids.includes(formateurId)
                console.log('🔧 Planning coordo:', pc.jour, pc.creneau, 'formateurs:', pc.formateurs_ids, 'affecté?', estAffecte)
                return estAffecte
            })

            setPlanningCoordo(planningCoordoFormateur)
            console.log('👨‍💼 Planning coordo chargé:', planningCoordoFormateur?.length || 0, 'affectations')

            // 4. ARBITRAGE : Construire le planning final avec priorités
            const planningArbitre = construirePlanningArbitre(
                planningTypeData || [], 
                absencesData || [], 
                planningCoordoFormateur || [], 
                weekDates
            )
            
            setPlanningFinal(planningArbitre)
            console.log('⚖️ Planning final après arbitrage:', planningArbitre.length, 'créneaux')

        } catch (error) {
            console.error('Erreur chargement planning:', error)
            onError?.(`Erreur chargement: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    // Fonction d'arbitrage - LOGIQUE DE PRIORITÉ PROFESSIONNELLE
    const construirePlanningArbitre = (planningType, absences, planningCoordo, weekDates) => {
        const planningFinal = []

        console.log('🎯 DÉBUT ARBITRAGE - LOGIQUE DE PRIORITÉ PROFESSIONNELLE')
        console.log('🔧 Données planning coordo disponibles:', planningCoordo)

        for (const jour of jours) {
            for (const creneau of creneaux) {
                console.log(`\n🔍 Arbitrage ${jour} ${creneau}:`)

                // Vérifier d'abord les absences validées pour ce jour
                const dateJour = weekDates[jours.indexOf(jour)]
                const dateString = dateJour.toISOString().split('T')[0]
                
                console.log(`📅 Date recherchée: ${dateString}`)
                
                const absenceJour = absences.find(abs => {
                    const debut = new Date(abs.date_debut)
                    const fin = new Date(abs.date_fin)
                    const current = new Date(dateString)
                    
                    console.log(`🔧 Vérification absence: ${abs.date_debut} - ${abs.date_fin} (type: ${abs.type})`)
                    
                    return current >= debut && current <= fin
                })

                if (absenceJour) {
                    console.log(`✅ Absence trouvée pour ${jour}:`, absenceJour.type)
                }

                // PRIORITÉ 1 : Disponibilité exceptionnelle validée (PRIORITÉ ABSOLUE)
                if (absenceJour && absenceJour.type === 'formation') {
                    console.log(`🟡 ÉTAT 1 - DISPONIBILITÉ EXCEPTIONNELLE (VALIDÉE): priorité absolue !`)
                    planningFinal.push({
                        jour,
                        creneau,
                        lieu_id: null,
                        statut: 'dispo_except',
                        source: 'disponibilite_exceptionnelle',
                        priorite: 1,
                        type_absence: absenceJour.type
                    })
                    continue
                }

                // PRIORITÉ 2 : Absence validée (INDISPONIBLE)
                if (absenceJour && absenceJour.type !== 'formation') {
                    console.log(`🔴 ÉTAT 2 - ABSENT VALIDÉ (INDISPONIBLE):`, absenceJour.type)
                    console.log(`🔧 ABSENCE GAGNE - Même si affecté par coordo, l'absence prime !`)
                    planningFinal.push({
                        jour,
                        creneau,
                        lieu_id: null,
                        statut: 'absent',
                        source: 'absence_validee',
                        priorite: 2,
                        type_absence: absenceJour.type
                    })
                    continue
                }

                // PRIORITÉ 3 : Planning coordo (SEULEMENT si pas d'absence)
                const affectationCoordo = planningCoordo.find(pc => {
                    const jourMatch = pc.jour === jour
                    const creneauDB = creneau === 'Matin' ? 'matin' : 'AM'
                    const creneauMatch = pc.creneau === creneauDB
                    
                    console.log(`🔧 Vérification planning coordo: ${pc.jour}==${jour}? ${jourMatch}, ${pc.creneau}==${creneauDB}? ${creneauMatch}`)
                    
                    return jourMatch && creneauMatch
                })

                if (affectationCoordo) {
                    console.log(`🔵 ÉTAT 3 - AFFECTÉ PAR COORDO (TRAVAILLE):`, affectationCoordo.lieu_id)
                    planningFinal.push({
                        jour,
                        creneau,
                        lieu_id: affectationCoordo.lieu_id,
                        statut: 'affecte_coordo',
                        source: 'planning_coordo',
                        priorite: 3
                    })
                    continue
                }

                // PRIORITÉ 4 : Planning type NORMAL → DISPONIBLE MAIS PAS CHOISI
                const creneauType = planningType.find(pt => 
                    pt.jour === jour && pt.creneau === creneau
                )

                if (creneauType) {
                    console.log(`⬜ ÉTAT 4 - DISPONIBLE MAIS PAS CHOISI (EN ATTENTE):`, creneauType.lieu_id || 'Sans préférence')
                    planningFinal.push({
                        jour,
                        creneau,
                        lieu_id: creneauType.lieu_id,
                        statut: 'disponible_non_choisi',
                        source: 'planning_type',
                        priorite: 4
                    })
                    continue
                }

                console.log(`⭕ ÉTAT 5 - PAS DISPONIBLE (pas de planning type)`)
                // Ne rien ajouter = case vide normale
            }
        }

        console.log('🎯 FIN ARBITRAGE - Résultat final:', planningFinal.length, 'créneaux')
        return planningFinal
    }

    // Fonction pour obtenir les infos d'un créneau
    const getCreneauInfo = (jour, creneau) => {
        return planningFinal.find(pf => pf.jour === jour && pf.creneau === creneau)
    }

    // Fonction pour obtenir la couleur d'un lieu
    const getLieuCouleur = (lieuId) => {
        if (!lieuId) return '#6b7280' // Gris pour "Sans préférence"
        const lieu = lieux.find(l => l.id === lieuId)
        return lieu?.couleur || '#6b7280'
    }

    // Fonction pour obtenir le nom d'un lieu
    const getLieuNom = (lieuId) => {
        if (!lieuId) return 'Sans préférence'
        const lieu = lieux.find(l => l.id === lieuId)
        return lieu?.nom || 'Lieu inconnu'
    }

    // FONCTION LABELS SELON LOGIQUE PROFESSIONNELLE
    const getStatutLabel = (creneau) => {
        switch (creneau.statut) {
            case 'dispo_except':
                return 'EXCEPT'
            case 'affecte_coordo':
                return 'TRAVAILLE'
            case 'absent':
                return 'ABSENT'
            case 'disponible_non_choisi':
                return 'DISPONIBLE'
            default:
                return 'NORMAL'
        }
    }

    // FONCTION COULEURS SELON LOGIQUE PROFESSIONNELLE
    const getStatutColor = (creneau) => {
        switch (creneau.statut) {
            case 'dispo_except':
                return '#fbbf24' // JAUNE pour disponibilité exceptionnelle
            case 'affecte_coordo':
                return '#3b82f6' // BLEU pour affectation coordo
            case 'absent':
                return '#ef4444' // ROUGE pour absence
            case 'disponible_non_choisi':
                return '#ffffff' // BLANC avec bordure bleue
            default:
                return '#f3f4f6'
        }
    }

    // FONCTION BORDURE SELON LOGIQUE PROFESSIONNELLE
    const getBorderColor = (creneau) => {
        switch (creneau.statut) {
            case 'dispo_except':
                return '#fbbf24' // Jaune pour exceptionnelle
            case 'affecte_coordo':
                return getLieuCouleur(creneau.lieu_id) // Couleur du lieu
            case 'absent':
                return '#ef4444' // Rouge
            case 'disponible_non_choisi':
                return '#3b82f6' // BORDURE BLEUE = Disponible
            default:
                return '#d1d5db'
        }
    }

    // Fonctions pour navigation semaines
    const getWeekDates = (date) => {
        const startOfWeek = new Date(date)
        const day = startOfWeek.getDay()
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Lundi = début de semaine
        startOfWeek.setDate(diff)

        const dates = []
        for (let i = 0; i < 5; i++) { // Lundi à Vendredi
            const currentDate = new Date(startOfWeek)
            currentDate.setDate(startOfWeek.getDate() + i)
            dates.push(currentDate)
        }
        return dates
    }

    const getWeekNumber = (date) => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
    }

    const previousWeek = () => {
        const newWeek = new Date(currentWeek)
        newWeek.setDate(newWeek.getDate() - 7)
        setCurrentWeek(newWeek)
    }

    const nextWeek = () => {
        const newWeek = new Date(currentWeek)
        newWeek.setDate(newWeek.getDate() + 7)
        setCurrentWeek(newWeek)
    }

    const goToCurrentWeek = () => {
        setCurrentWeek(new Date())
    }

    const weekDates = getWeekDates(currentWeek)
    const weekNumber = getWeekNumber(currentWeek)

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement du planning hebdomadaire...</div>
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
            maxWidth: '100%'
        }}>
            {/* En-tête */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    margin: '0 0 6px 0',
                    color: '#1f2937'
                }}>
                    📊 Planning Hebdomadaire - {formateurData.prenom} {formateurData.nom}
                </h2>
                <p style={{ 
                    fontSize: '14px', 
                    color: '#6b7280',
                    margin: '0'
                }}>
                    Semaine {weekNumber} - {weekDates[0].getFullYear()}
                </p>
            </div>

            {/* Navigation semaines avec flèches */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '12px 20px',
                backgroundColor: '#f8fafc',
                borderRadius: '12px'
            }}>
                <button
                    onClick={previousWeek}
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    ←
                </button>
                
                <button
                    onClick={goToCurrentWeek}
                    style={{
                        padding: '10px 16px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}
                >
                    Semaine actuelle
                </button>
                
                <button
                    onClick={nextWeek}
                    style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#667eea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    →
                </button>
            </div>

            {/* Contenu principal */}
            {planningFinal.length === 0 ? (
                // Aucune affectation ET aucune absence ET aucun planning type
                <div style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f0f9ff',
                    borderRadius: '12px',
                    border: '2px solid #3b82f6'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                    <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: 'bold', 
                        color: '#1e40af',
                        margin: '0 0 12px 0'
                    }}>
                        Aucun planning configuré
                    </h3>
                    <p style={{ 
                        fontSize: '14px', 
                        color: '#1e40af',
                        margin: '0',
                        lineHeight: '1.5'
                    }}>
                        Ce formateur n'a pas encore de planning type déclaré ou validé.
                    </p>
                </div>
            ) : (
                // Planning disponible - Layout desktop
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                    
                    {/* Colonne gauche - Grille planning */}
                    <div style={{
                        backgroundColor: '#f9fafb',
                        borderRadius: '12px',
                        padding: '16px'
                    }}>
                        <table style={{ 
                            width: '100%', 
                            borderCollapse: 'separate',
                            borderSpacing: '8px'
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
                                        &nbsp;
                                    </th>
                                    {jours.map((jour, index) => (
                                        <th key={jour} style={{ 
                                            padding: '4px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            color: '#6b7280',
                                            textAlign: 'center',
                                            lineHeight: '1.2'
                                        }}>
                                            <div>{jour.substring(0, 3)}</div>
                                            <div style={{ 
                                                fontSize: '10px', 
                                                color: '#374151',
                                                marginTop: '2px'
                                            }}>
                                                {weekDates[index].getDate()}/{(weekDates[index].getMonth() + 1).toString().padStart(2, '0')}
                                            </div>
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
                                                        minHeight: '50px',
                                                        backgroundColor: creneauInfo ? 
                                                            getStatutColor(creneauInfo) : '#f3f4f6',
                                                        color: creneauInfo ? 
                                                            (creneauInfo.statut === 'disponible_non_choisi' ? '#374151' : 
                                                             creneauInfo.statut === 'dispo_except' ? '#92400e' : 'white') : '#d1d5db',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '4px',
                                                        border: creneauInfo ? 
                                                            `3px solid ${getBorderColor(creneauInfo)}` : 
                                                            '3px solid #d1d5db',
                                                        position: 'relative'
                                                    }}>
                                                        {creneauInfo ? (
                                                            creneauInfo.statut === 'absent' ? (
                                                                <div style={{ 
                                                                    fontSize: '16px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                    color: 'white'
                                                                }}>
                                                                    ✗
                                                                </div>
                                                            ) : creneauInfo.statut === 'dispo_except' ? (
                                                                <div style={{ 
                                                                    fontSize: '9px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                    lineHeight: '1.2',
                                                                    color: '#92400e'
                                                                }}>
                                                                    EXCEPT
                                                                </div>
                                                            ) : creneauInfo.statut === 'affecte_coordo' ? (
                                                                <div style={{ 
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                    lineHeight: '1.2',
                                                                    color: 'white'
                                                                }}>
                                                                    {lieux.find(l => l.id === creneauInfo.lieu_id)?.initiale || 'S/P'}
                                                                </div>
                                                            ) : creneauInfo.statut === 'disponible_non_choisi' ? (
                                                                <div style={{ 
                                                                    fontSize: '8px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                    lineHeight: '1.2',
                                                                    color: '#3b82f6'
                                                                }}>
                                                                    DISPO
                                                                </div>
                                                            ) : (
                                                                <div style={{ 
                                                                    fontSize: '10px',
                                                                    fontWeight: 'bold',
                                                                    textAlign: 'center',
                                                                    lineHeight: '1.2'
                                                                }}>
                                                                    {lieux.find(l => l.id === creneauInfo.lieu_id)?.initiale || 'S/P'}
                                                                </div>
                                                            )
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

                    {/* Colonne droite - Détails des interventions */}
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
                            📅 Planning cette semaine
                        </h4>
                        <div style={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: '6px',
                            maxHeight: '400px',
                            overflowY: 'auto'
                        }}>
                            {planningFinal.map((creneau, index) => (
                                <div key={index} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px',
                                    backgroundColor: creneau.statut === 'dispo_except' ? '#fffbeb' :
                                                     creneau.statut === 'affecte_coordo' ? '#eff6ff' : 
                                                     creneau.statut === 'absent' ? '#fef2f2' :
                                                     creneau.statut === 'disponible_non_choisi' ? '#f0f9ff' : '#eff6ff',
                                    borderRadius: '8px',
                                    border: `2px solid ${getBorderColor(creneau)}`,
                                    fontSize: '13px'
                                }}>
                                    <div style={{ 
                                        fontWeight: '600', 
                                        color: creneau.statut === 'dispo_except' ? '#92400e' :
                                               creneau.statut === 'affecte_coordo' ? '#1e40af' :
                                               creneau.statut === 'absent' ? '#991b1b' :
                                               creneau.statut === 'disponible_non_choisi' ? '#3b82f6' : '#1e40af'
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
                                            backgroundColor: getStatutColor(creneau),
                                            color: creneau.statut === 'disponible_non_choisi' ? '#3b82f6' : 
                                                   creneau.statut === 'dispo_except' ? '#92400e' : 'white',
                                            border: creneau.statut === 'disponible_non_choisi' ? '1px solid #3b82f6' : 'none'
                                        }}>
                                            {getStatutLabel(creneau)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
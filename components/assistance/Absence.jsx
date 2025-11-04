import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function Absence({ 
    formateurId,
    formateurData,
    onSuccess,
    onError 
}) {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [modeSelection, setModeSelection] = useState('absent')
    const [planningModifie, setPlanningModifie] = useState({})
    const [planningOriginal, setPlanningOriginal] = useState({})
    const [historiqueModi, setHistoriqueModi] = useState([])
    const [lieux, setLieux] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [envoiEnCours, setEnvoiEnCours] = useState(false)
    const [showMessageModal, setShowMessageModal] = useState(false)
    const [messageFacultatif, setMessageFacultatif] = useState('')
    // ✅ NOUVEAU: États pour sélection créneaux M/AM
    const [creneauMatin, setCreneauMatin] = useState(false)
    const [creneauAM, setCreneauAM] = useState(false)

    useEffect(() => {
        if (formateurId) {
            loadPlanningData()
        }
    }, [currentDate, formateurId])

    const loadPlanningData = async () => {
        if (!formateurId) return
        
        try {
            setIsLoading(true)
            
            // Charger les lieux pour affichage
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)

            if (lieuxError) throw lieuxError
            setLieux(lieuxData || [])

            const annee = currentDate.getFullYear()
            const mois = currentDate.getMonth()
            
            // Construire le planning original basé sur le planning type VALIDÉ
            const planning = {}
            
            // Ajouter seulement les jours ouvrés (Lun-Ven) comme "libre" par défaut
            for (let jour = 1; jour <= new Date(annee, mois + 1, 0).getDate(); jour++) {
                const date = new Date(annee, mois, jour)
                const jourSemaine = date.getDay()
                
                // Seulement les jours de travail (lundi à vendredi)
                if (jourSemaine >= 1 && jourSemaine <= 5) {
                    const anneeStr = date.getFullYear()
                    const moisStr = String(date.getMonth() + 1).padStart(2, '0')
                    const jourStr = String(date.getDate()).padStart(2, '0')
                    const dateStr = `${anneeStr}-${moisStr}-${jourStr}`
                    planning[dateStr] = 'libre'
                }
            }

            // Récupérer le planning type VALIDÉ du formateur
            const { data: planningTypeData, error: planningTypeError } = await supabase
                .from('planning_type_formateurs')
                .select('jour, creneau, statut, lieu_id, valide')
                .eq('formateur_id', formateurId)
                .eq('valide', true)

            // Appliquer le planning type VALIDÉ (BASE VERTE)
            if (planningTypeData && !planningTypeError) {
                // Créer un mapping des jours
                const joursMapping = {
                    0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 
                    4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi'
                }

                // Pour chaque jour du mois
                for (let jour = 1; jour <= new Date(annee, mois + 1, 0).getDate(); jour++) {
                    const date = new Date(annee, mois, jour)
                    const jourSemaine = date.getDay()
                    const nomJour = joursMapping[jourSemaine]
                    
                    // Si c'est un jour ouvré
                    if (jourSemaine >= 1 && jourSemaine <= 5) {
                        const anneeStr = date.getFullYear()
                        const moisStr = String(date.getMonth() + 1).padStart(2, '0')
                        const jourStr = String(date.getDate()).padStart(2, '0')
                        const dateStr = `${anneeStr}-${moisStr}-${jourStr}`
                        
                        // Vérifier si le formateur a une disponibilité validée ce jour-là    
                        const disponibiliteJour = planningTypeData.find(pt => 
                            pt.jour === nomJour && pt.statut === 'disponible'
                        )
                        
                        const disponibiliteExcept = planningTypeData.find(pt => 
                            pt.jour === nomJour && pt.statut === 'dispo_except'
                        )
                        
                        if (disponibiliteJour) {
                            planning[dateStr] = 'planning_type' // JOUR VALIDÉ = VERT
                        } else if (disponibiliteExcept) {
                            planning[dateStr] = 'dispo_except' // DISPO EXCEPTIONNELLE = ORANGE
                        }
                    }
                }
                console.log(`✅ Planning type validé appliqué: ${planningTypeData.length} créneaux`)
            }

            // Charger ET afficher TOUTES les absences
            const { data: absencesData, error: absencesError } = await supabase
                .from('absences_formateurs')
                .select('date_debut, date_fin, type, statut, id')
                .eq('formateur_id', formateurId)

            // Appliquer TOUTES les absences (en_attente + validées)
            if (absencesData && !absencesError) {
                console.log(`🔧 CHARGEMENT: ${absencesData.length} absences trouvées:`, absencesData)
                
                absencesData.forEach(absence => {
                    const debut = new Date(absence.date_debut)
                    const fin = new Date(absence.date_fin)
                    
                    console.log(`🔧 Traitement absence: ${absence.date_debut} - ${absence.date_fin}, type: ${absence.type}, statut: ${absence.statut}`)
                    
                    for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
                        const anneeStr = d.getFullYear()
                        const moisStr = String(d.getMonth() + 1).padStart(2, '0')
                        const jourStr = String(d.getDate()).padStart(2, '0')
                        const dateStr = `${anneeStr}-${moisStr}-${jourStr}`
                        
                        if (planning.hasOwnProperty(dateStr)) {
                            // Afficher TOUTES les absences (en_attente ET validées)
                            if (absence.type === 'personnel' || absence.type === 'absence') {
                                planning[dateStr] = 'absent'
                                console.log(`🔴 ${dateStr} marqué ABSENT (${absence.type}, ${absence.statut})`)
                            } else if (absence.type === 'formation' || absence.type === 'dispo_except') {
                                planning[dateStr] = 'dispo'
                                console.log(`🟡 ${dateStr} marqué DISPO EXCEPT (${absence.type}, ${absence.statut})`)
                            }
                        }
                    }
                })
                console.log(`✅ Modifications affichées: ${absencesData.length} (en_attente + validées)`)
            }

            setPlanningOriginal(planning)
            setPlanningModifie({...planning})

        } catch (error) {
            console.error('⚠️ Erreur:', error.message)
            onError?.(`⚠️ Erreur: ${error.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    // Navigation mensuelle
    const changerMois = (direction) => {
        const nouvelleDate = new Date(currentDate)
        nouvelleDate.setMonth(currentDate.getMonth() + direction)
        setCurrentDate(nouvelleDate)
    }

    // Fonction pour obtenir les détails d'un statut
    const getStatutDetails = (statut) => {
        switch (statut) {
            case 'absent':
                return { 
                    backgroundColor: '#ef4444', 
                    color: 'white', 
                    label: 'ABS',
                    nom: 'Absent'
                }
            case 'dispo':
                return { 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    label: 'DISPO',
                    nom: 'Dispo exceptionnelle'
                }
            case 'planning_type':
                return { 
                    backgroundColor: '#22c55e', 
                    color: 'white', 
                    label: 'DISPO',
                    nom: 'Planning habituel'
                }
            case 'dispo_except':
                return { 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    label: 'EXCEPT',
                    nom: 'Dispo exceptionnelle'
                }
            case 'libre':
            default:
                return { 
                    backgroundColor: '#d1d5db', 
                    color: '#374151', 
                    label: '',
                    nom: 'Libre'
                }
        }
    }

    // Fonction pour gérer le clic sur une case
    const gererClicCase = (date) => {
        const annee = date.getFullYear()
        const mois = String(date.getMonth() + 1).padStart(2, '0')
        const jourStr = String(date.getDate()).padStart(2, '0')
        const dateStr = `${annee}-${mois}-${jourStr}`
        
        // Ajouter à l'historique avant de modifier
        setHistoriqueModi(prev => [...prev, { date: dateStr, action: 'modifier', mode: modeSelection }])

        setPlanningModifie(prev => ({
            ...prev,
            [dateStr]: modeSelection
        }))

        const details = getStatutDetails(modeSelection)
        console.log(`📅 ${date.getDate()} ${currentDate.toLocaleDateString('fr-FR', {month: 'long'})} → ${details.nom}`)
    }

    // Fonction ANNULER : annuler la dernière action
    const annulerDerniereAction = () => {
        if (historiqueModi.length === 0) {
            return
        }

        const derniereAction = historiqueModi[historiqueModi.length - 1]
        
        // Supprimer la dernière action de l'historique
        setHistoriqueModi(prev => prev.slice(0, -1))
        
        if (derniereAction.action === 'modifier') {
            // Annuler une modification = remettre l'état original
            setPlanningModifie(prev => ({
                ...prev,
                [derniereAction.date]: planningOriginal[derniereAction.date]
            }))
        } else if (derniereAction.action === 'annuler_case') {
            // Annuler une annulation = remettre la case
            setPlanningModifie(prev => ({
                ...prev,
                [derniereAction.date]: derniereAction.mode || 'planning_type'
            }))
        }
    }

    // Fonction ANNULER UNE CASE : supprimer une case spécifique (mode annuler)
    const annulerModificationCase = (date) => {
        const annee = date.getFullYear()
        const mois = String(date.getMonth() + 1).padStart(2, '0')
        const jourStr = String(date.getDate()).padStart(2, '0')
        const dateStr = `${annee}-${mois}-${jourStr}`
        
        // Ajouter à l'historique avant d'annuler
        setHistoriqueModi(prev => [...prev, { 
            date: dateStr, 
            action: 'annuler_case',
            mode: planningModifie[dateStr]
        }])
        
        // Remettre à l'état original
        setPlanningModifie(prev => ({
            ...prev,
            [dateStr]: planningOriginal[dateStr]
        }))
    }

    // Fonction EFFACER TOUT : effacer toutes les modifications
    const effacerTout = () => {
        setPlanningModifie({...planningOriginal}) // Remettre à l'état original
        setHistoriqueModi([]) // Vider aussi l'historique
    }

    // Fonction pour générer la liste des modifications pour le message
    const genererListeModifications = () => {
        const modificationsDetectees = []
        
        Object.keys(planningModifie).forEach(dateStr => {
            const statutOriginal = planningOriginal[dateStr]
            const statutModifie = planningModifie[dateStr]
            
            if (statutOriginal !== statutModifie) {
                const date = new Date(dateStr)
                const dateFormatee = date.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                })
                
                let typeModification = ''
                if (statutModifie === 'absent') {
                    typeModification = 'Absence'
                } else if (statutModifie === 'dispo') {
                    typeModification = 'Disponibilité exceptionnelle'
                }
                
                if (typeModification) {
                    modificationsDetectees.push(`${dateFormatee} : ${typeModification}`)
                }
            }
        })
        
        return modificationsDetectees
    }

    // ✅ NOUVEAU: Fonction d'envoi de message automatique vers formateur
    const envoyerMessageFormateur = async (messageFacultatif = '') => {
        try {
            if (!formateurData) {
                console.error('Données formateur manquantes')
                return
            }

            const formateurNom = `${formateurData.prenom} ${formateurData.nom}`
            const listeModifications = genererListeModifications()
            
            let contenu = `Bonjour ${formateurData.prenom},\n\nLes administrateurs ont modifié vos absences :\n\n`
            
            // Ajouter la liste des modifications
            if (listeModifications.length > 0) {
                contenu += `MODIFICATIONS EFFECTUÉES :\n`
                listeModifications.forEach((modif, index) => {
                    contenu += `${index + 1}. ${modif}\n`
                })
                contenu += '\n'
            }
            
            // Ajouter le message facultatif s'il existe
            if (messageFacultatif.trim()) {
                contenu += `Message de l'équipe :\n"${messageFacultatif.trim()}"\n\n`
            }
            
            contenu += `Bonne journée !\nL'équipe de coordination`
            
            const { error } = await supabase
                .from('messages')
                .insert({
                    expediteur_id: null, // null = admin
                    destinataire_id: formateurData.id,
                    expediteur: 'Coordination ACLEF',
                    destinataire: formateurNom,
                    objet: 'Modification de vos absences',
                    contenu: contenu,
                    type: 'notification',
                    lu: false,
                    archive: false,
                    statut_validation: null,
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5)
                })

            if (error) {
                console.error('Erreur envoi message formateur:', error)
            } else {
                console.log('✅ Message automatique envoyé au formateur:', formateurNom)
            }

        } catch (error) {
            console.error('Erreur:', error)
        }
    }

    // Gestion de la validation avec modal message facultatif
    const handleValider = async () => {
        const modificationsDetectees = Object.keys(planningModifie).filter(date => 
            planningModifie[date] !== planningOriginal[date]
        )
        
        if (modificationsDetectees.length === 0) {
            onError?.('⚠️ Aucune modification à envoyer')
            return
        }

        // Afficher modal pour message facultatif
        setShowMessageModal(true)
    }

    // Fonction de validation finale avec envoi message
    const handleValidationFinale = async () => {
        setShowMessageModal(false)
        
        // Envoyer message vers formateur AVANT la sauvegarde
        await envoyerMessageFormateur(messageFacultatif)
        
        // Puis sauvegarder le planning
        await envoyerDemande()
        
        // Reset du message facultatif
        setMessageFacultatif('')
    }

    // Fonction ENVOYER LA DEMANDE : sauvegarder en BDD
    const envoyerDemande = async () => {
        try {
            setEnvoiEnCours(true)

            // Détecter les modifications
            const modificationsDetectees = []
            
            Object.keys(planningModifie).forEach(dateStr => {
                const statutOriginal = planningOriginal[dateStr]
                const statutModifie = planningModifie[dateStr]
                
                // Si la case a été modifiée
                if (statutOriginal !== statutModifie) {
                    let type = null
                    
                    if (statutModifie === 'absent') {
                        type = 'personnel'
                    } else if (statutModifie === 'dispo') {
                        type = 'formation'
                    }
                    
                    // Ajouter seulement si c'est un type reconnu
                    if (type) {
                        modificationsDetectees.push({
                            date: dateStr,
                            type: type,
                            statutOriginal: statutOriginal,
                            statutModifie: statutModifie
                        })
                    }
                }
            })

            if (modificationsDetectees.length === 0) {
                onError?.('⚠️ Aucune modification à envoyer')
                setEnvoiEnCours(false)
                return
            }

            console.log(`📤 ${modificationsDetectees.length} modifications détectées:`, modificationsDetectees)

            // ✅ NOUVEAU: Déterminer le créneau
            let creneauValue = null; // Par défaut : journée entière

            if (creneauMatin && !creneauAM) {
                creneauValue = 'M'; // ✅ 'M' (contrainte BDD)
            } else if (creneauAM && !creneauMatin) {
                creneauValue = 'AM'; // ✅ 'AM'
            } else if (creneauMatin && creneauAM) {
                creneauValue = null; // Les deux = journée entière
            }

            console.log(`🕐 Créneau sélectionné: ${creneauValue || 'journée entière'}`);

            // Créer un enregistrement par jour modifié
            const enregistrementsACreer = modificationsDetectees.map(modif => ({
                formateur_id: formateurId,
                date_debut: modif.date,
                date_fin: modif.date, // Même date pour jour par jour
                type: modif.type,
                statut: 'en_attente',
                motif: null, // Optionnel, peut être ajouté plus tard
                creneau: creneauValue, // ✅ AJOUT DU CRÉNEAU
                created_at: new Date().toISOString()
            }))

            // Insérer en BDD
            const { data: resultats, error: erreurInsert } = await supabase
                .from('absences_formateurs')
                .insert(enregistrementsACreer)
                .select()

            if (erreurInsert) {
                throw erreurInsert
            }

            console.log(`✅ ${resultats.length} enregistrements créés en BDD`)

            // Succès !
            onSuccess?.(`✅ Demande envoyée ! ${modificationsDetectees.length} modification(s) pour ${formateurData.prenom} ${formateurData.nom}`)
            
            // Remettre le planning à l'état d'origine après envoi réussi
            setPlanningModifie({...planningOriginal})
            setHistoriqueModi([])

        } catch (error) {
            console.error('⚠️ Erreur lors de l\'envoi:', error)
            onError?.(`⚠️ Erreur lors de l'envoi: ${error.message}`)
        } finally {
            setEnvoiEnCours(false)
        }
    }

    // Génération du calendrier 5 jours ouvrés
    const genererCalendrierComplet = () => {
        const annee = currentDate.getFullYear()
        const mois = currentDate.getMonth()
        
        const nbJoursMois = new Date(annee, mois + 1, 0).getDate()
        const joursOuvres = []
        
        for (let jour = 1; jour <= nbJoursMois; jour++) {
            const date = new Date(annee, mois, jour, 12, 0, 0, 0)
            const jourSemaine = date.getDay()
            
            if (jourSemaine >= 1 && jourSemaine <= 5) {
                joursOuvres.push(date)
            }
        }
        
        const grille = []
        let indexJour = 0
        
        const nbSemaines = Math.ceil(joursOuvres.length / 5)
        
        for (let semaine = 0; semaine < nbSemaines; semaine++) {
            for (let jourSemaine = 0; jourSemaine < 5; jourSemaine++) {
                if (indexJour < joursOuvres.length) {
                    const date = joursOuvres[indexJour]
                    const jourReel = date.getDay()
                    const jourAttendu = jourSemaine + 1
                    
                    if (jourReel === jourAttendu) {
                        grille.push(date)
                        indexJour++
                    } else {
                        grille.push(null)
                    }
                } else {
                    grille.push(null)
                }
            }
        }
        
        return grille
    }

    // Vérifier s'il y a des modifications
    const aDesModifications = () => {
        return JSON.stringify(planningOriginal) !== JSON.stringify(planningModifie)
    }

    if (isLoading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement du planning des absences...</div>
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

    const nomMois = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const casesCalendrier = genererCalendrierComplet()

    return (
        <div style={{ 
            padding: '20px', 
            fontFamily: 'system-ui',
            maxWidth: '100%'
        }}>
            {/* Modal pour message facultatif */}
            {showMessageModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '15px',
                        padding: '25px',
                        maxWidth: '500px',
                        width: '90%'
                    }}>
                        <h3 style={{ 
                            margin: '0 0 15px 0', 
                            fontSize: '18px', 
                            color: '#374151',
                            textAlign: 'center'
                        }}>
                            💬 Message facultatif pour {formateurData.prenom}
                        </h3>
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#6b7280', 
                            margin: '0 0 15px 0',
                            textAlign: 'center',
                            lineHeight: '1.4'
                        }}>
                            Souhaitez-vous ajouter un message personnel ?
                            <br />
                            <em>(ex: "Je serai en formation", "Congés prévus")</em>
                        </p>
                        <textarea
                            value={messageFacultatif}
                            onChange={(e) => setMessageFacultatif(e.target.value)}
                            placeholder="Votre message (optionnel)..."
                            rows={4}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '2px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '14px',
                                resize: 'vertical',
                                boxSizing: 'border-box',
                                marginBottom: '20px'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowMessageModal(false)}
                                style={{
                                    flex: 1,
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleValidationFinale}
                                disabled={envoiEnCours}
                                style={{
                                    flex: 1,
                                    backgroundColor: envoiEnCours ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: envoiEnCours ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {envoiEnCours ? 'Envoi...' : 'Valider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* En-tête */}
            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: '#374151'
                }}>
                    🚫 Absences - {formateurData.prenom} {formateurData.nom}
                </h2>
                <p style={{ 
                    fontSize: '14px', 
                    color: '#6b7280',
                    margin: '0'
                }}>
                    Déclarer les absences et disponibilités exceptionnelles
                </p>
            </div>

            {/* Layout desktop - 2 colonnes */}
            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '20px' }}>
                
                {/* Colonne gauche - Contrôles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Modes de sélection */}
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb'
                    }}>
                        <h4 style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            marginBottom: '12px', 
                            color: '#374151' 
                        }}>
                            🎯 Choisir un mode
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={() => setModeSelection('absent')}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: modeSelection === 'absent' ? '3px solid #fbbf24' : '2px solid #ef4444',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔴 ABSENT
                            </button>
                            
                            <button
                                onClick={() => setModeSelection('dispo')}
                                style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: modeSelection === 'dispo' ? '3px solid #fbbf24' : '2px solid #f59e0b',
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                🟡 DISPO EXCEPT.
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{
                        backgroundColor: '#f9fafb',
                        padding: '16px',
                        borderRadius: '12px',
                        border: '2px solid #e5e7eb'
                    }}>
                        <h4 style={{ 
                            fontSize: '14px', 
                            fontWeight: 'bold', 
                            marginBottom: '12px', 
                            color: '#374151' 
                        }}>
                            ⚡ Actions rapides
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <button
                                onClick={annulerDerniereAction}
                                disabled={historiqueModi.length === 0}
                                style={{
                                    padding: '10px',
                                    backgroundColor: historiqueModi.length === 0 ? '#f3f4f6' : '#6b7280',
                                    color: historiqueModi.length === 0 ? '#9ca3af' : 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    cursor: historiqueModi.length === 0 ? 'not-allowed' : 'pointer'
                                }}
                            >
                                ↶ ANNULER
                            </button>
                            
                            <button
                                onClick={effacerTout}
                                disabled={!aDesModifications()}
                                style={{
                                    padding: '10px',
                                    backgroundColor: !aDesModifications() ? '#f3f4f6' : '#dc2626',
                                    color: !aDesModifications() ? '#9ca3af' : 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    cursor: !aDesModifications() ? 'not-allowed' : 'pointer'
                                }}
                            >
                                🗑️ EFFACER TOUT
                            </button>
                        </div>
                    </div>

                    {/* Compteur modifications */}
                    {aDesModifications() && (
                        <div style={{
                            backgroundColor: '#fef3c7',
                            padding: '12px',
                            borderRadius: '8px',
                            textAlign: 'center',
                            color: '#92400e',
                            fontWeight: 'bold',
                            fontSize: '14px',
                            border: '2px solid #f59e0b'
                        }}>
                            📊 {Object.keys(planningModifie).filter(date => 
                                planningModifie[date] !== planningOriginal[date]
                            ).length} modification(s)
                        </div>
                    )}

                    {/* ✅ NOUVEAU: Sélection créneaux M/AM */}
                    {aDesModifications() && (
                        <div style={{
                            marginTop: '12px',
                            marginBottom: '12px',
                            padding: '12px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db'
                        }}>
                            <div style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: '#374151',
                                marginBottom: '8px',
                                textAlign: 'center'
                            }}>
                                Choisir un créneau (optionnel)
                            </div>
                            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px'}}>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: creneauAM ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    color: creneauAM ? '#9ca3af' : '#374151',
                                    opacity: creneauAM ? 0.5 : 1
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={creneauMatin}
                                        onChange={(e) => {
                                            setCreneauMatin(e.target.checked);
                                            if (e.target.checked) {
                                                setCreneauAM(false);
                                            }
                                        }}
                                        disabled={creneauAM}
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: creneauAM ? 'not-allowed' : 'pointer'
                                        }}
                                    />
                                    <span>Matin (M)</span>
                                </label>

                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: creneauMatin ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    color: creneauMatin ? '#9ca3af' : '#374151',
                                    opacity: creneauMatin ? 0.5 : 1
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={creneauAM}
                                        onChange={(e) => {
                                            setCreneauAM(e.target.checked);
                                            if (e.target.checked) {
                                                setCreneauMatin(false);
                                            }
                                        }}
                                        disabled={creneauMatin}
                                        style={{
                                            width: '18px',
                                            height: '18px',
                                            cursor: creneauMatin ? 'not-allowed' : 'pointer'
                                        }}
                                    />
                                    <span>Après-midi (AM)</span>
                                </label>
                            </div>
                            <div style={{
                                fontSize: '10px',
                                color: '#6b7280',
                                marginTop: '8px',
                                textAlign: 'center'
                            }}>
                                Non coché = journée entière
                            </div>
                        </div>
                    )}

                    {/* Bouton validation */}
                    {aDesModifications() && (
                        <button
                            onClick={handleValider}
                            disabled={envoiEnCours}
                            style={{
                                width: '100%',
                                backgroundColor: envoiEnCours ? '#9ca3af' : '#10b981',
                                color: 'white',
                                padding: '14px',
                                borderRadius: '8px',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                border: 'none',
                                cursor: envoiEnCours ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {envoiEnCours ? '📤 Envoi...' : '✅ Valider les modifications'}
                        </button>
                    )}
                </div>

                {/* Colonne droite - Calendrier */}
                <div style={{
                    backgroundColor: '#ffffff',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px solid #e5e7eb'
                }}>
                    
                    {/* Navigation mensuelle */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px'
                    }}>
                        <button 
                            onClick={() => changerMois(-1)}
                            style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            ←
                        </button>
                        
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            textTransform: 'capitalize',
                            margin: 0,
                            color: '#1e40af'
                        }}>
                            {nomMois}
                        </h3>
                        
                        <button 
                            onClick={() => changerMois(1)}
                            style={{
                                width: '40px',
                                height: '40px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '18px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            →
                        </button>
                    </div>

                    {/* En-têtes des jours */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '8px',
                        marginBottom: '12px'
                    }}>
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven'].map(jour => (
                            <div key={jour} style={{
                                textAlign: 'center',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                color: '#6b7280',
                                padding: '8px'
                            }}>
                                {jour}
                            </div>
                        ))}
                    </div>

                    {/* Grille du calendrier */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(5, 1fr)',
                        gap: '8px'
                    }}>
                        {casesCalendrier.map((date, index) => {
                            if (!date) {
                                return <div key={`empty-${index}`} style={{ height: '50px' }}></div>
                            }

                            const dateStr = date.toISOString().split('T')[0]
                            const statut = planningModifie[dateStr] || 'libre'
                            const details = getStatutDetails(statut)
                            const estAujourdhui = date.toDateString() === new Date().toDateString()
                            const estModifie = planningModifie[dateStr] !== planningOriginal[dateStr]
                            const numeroJour = date.getDate()
                            
                            return (
                                <div
                                    key={date.getTime()}
                                    style={{
                                        height: '50px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '14px',
                                        backgroundColor: details.backgroundColor,
                                        color: details.color,
                                        border: estAujourdhui ? '3px solid #fbbf24' : 
                                               estModifie ? '2px solid #10b981' : '1px solid rgba(0,0,0,0.1)',
                                        cursor: 'pointer',
                                        position: 'relative',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => {
                                        if (modeSelection === 'annuler_case') {
                                            annulerModificationCase(date)
                                        } else {
                                            gererClicCase(date)
                                        }
                                    }}
                                >
                                    <span style={{ fontSize: '16px' }}>{numeroJour}</span>
                                    {details.label && (
                                        <span style={{ fontSize: '8px', marginTop: '1px' }}>{details.label}</span>
                                    )}
                                    {/* Indicateur de modification */}
                                    {estModifie && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '2px',
                                            right: '2px',
                                            width: '6px',
                                            height: '6px',
                                            backgroundColor: '#10b981',
                                            borderRadius: '50%'
                                        }}></div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>
        </div>
    )
}
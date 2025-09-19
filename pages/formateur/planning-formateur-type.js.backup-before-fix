import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function PlanningFormateurType() {
    const { user, isLoading: authLoading, isAuthenticated } = useFormateurAuth()
    const [isLoading, setIsLoading] = useState(true)
    const [lieux, setLieux] = useState([])
    const [planningData, setPlanningData] = useState({})
    const [creneauSelectionne, setCreneauSelectionne] = useState(null)
    const [statutSelectionne, setStatutSelectionne] = useState('')
    const [lieuSelectionne, setLieuSelectionne] = useState(null)
    const [creneauTermine, setCreneauTermine] = useState(false)
    const [showAide, setShowAide] = useState(false)
    const [showInitialPopup, setShowInitialPopup] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    // ✅ NOUVEAU: États pour message facultatif
    const [showMessageModal, setShowMessageModal] = useState(false)
    const [messageFacultatif, setMessageFacultatif] = useState('')
    const router = useRouter()

    // Configuration des jours et créneaux - ✅ AM au lieu d'Après-midi
    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
    const creneaux = ['Matin', 'AM']

    // Configuration des statuts avec couleurs
    const statuts = [
        { 
            key: 'disponible', 
            label: 'DISPONIBLE', 
            couleur: '#3b82f6',
            description: 'disponible'
        },
        { 
            key: 'dispo_except', 
            label: 'DISPO EXCEPT.', 
            couleur: '#fbbf24',
            description: 'dispo exceptionnelle'
        },
        { 
            key: 'indisponible', 
            label: 'INDISPONIBLE', 
            couleur: '#9ca3af',
            description: 'indisponible'
        }
    ]

    // Protection authentification
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/formateur/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (user) {
            chargerDonnees(user.id)
            setIsLoading(false)
        }
    }, [user])


    const chargerDonnees = async (formateurId) => {
        try {
            // Charger les lieux depuis la BDD
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, initiale, couleur')
                .eq('archive', false)
                .order('nom')

            if (lieuxError) {
                console.error('Erreur lieux:', lieuxError)
                setLieux([])
            } else {
                setLieux(lieuxData || [])
            }

            // Charger le planning type existant du formateur
            const { data: planningExistant, error: planningError } = await supabase
                .from('planning_type_formateurs')
                .select(`
                    id,
                    jour,
                    creneau,
                    statut,
                    lieu_id,
                    lieux:lieu_id (
                        id,
                        nom,
                        initiale,
                        couleur
                    )
                `)
                .eq('formateur_id', formateurId)

            if (planningError) {
                console.error('Erreur chargement planning:', planningError)
            }

            // Initialiser le planning avec les données existantes ou valeurs par défaut
            const initialPlanning = {}
            jours.forEach(jour => {
                creneaux.forEach(creneau => {
                    const creneauKey = `${jour}-${creneau}`
                    
                    // Chercher si ce créneau existe déjà     
                    const creneauExistant = planningExistant?.find(
                        p => p.jour === jour && p.creneau === creneau
                    )
                    
                    if (creneauExistant) {
                        const statut = statuts.find(s => s.key === creneauExistant.statut)
                        initialPlanning[creneauKey] = {
                            id: creneauExistant.id,
                            statut: creneauExistant.statut,
                            lieu: creneauExistant.lieux,
                            couleurStatut: statut?.couleur || '#9ca3af',
                            couleurLieu: creneauExistant.lieux?.couleur || null,
                            // ✅ CORRECTION: Marquer explicitement "sans préférence" si lieu_id est null mais statut disponible
                            sansPreference: creneauExistant.lieu_id === null && creneauExistant.statut !== 'indisponible'
                        }
                    } else {
                        // Valeur par défaut : indisponible
                        initialPlanning[creneauKey] = {
                            id: null,
                            statut: 'indisponible',
                            lieu: null,
                            couleurStatut: '#9ca3af',
                            couleurLieu: null,
                            sansPreference: false
                        }
                    }
                })
            })
            
            setPlanningData(initialPlanning)

        } catch (error) {
            console.error('Erreur chargement données:', error)
            setLieux([])
        }
    }

    // Obtenir le message d'instruction selon l'état
    const getInstructionMessage = () => {
        if (creneauTermine) {
            return "✅ Vous souhaitez déclarer un autre créneau ? Choisissez une plage (ex: mardi après-midi). Sinon validez."
        }
        
        if (!creneauSelectionne) {
            return "⬇️ Choisissez une plage du planning où vous souhaitez intervenir"
        }
        
        if (!statutSelectionne) {
            return "⬇️ Choisissez un statut"
        }
        
        if (statutSelectionne && !lieuSelectionne && statutSelectionne !== 'indisponible') {
            return "⬇️ Choisissez un lieu ou 'Sans Préférence'"
        }
        
        return "✅ Vous souhaitez déclarer un autre créneau ? Choisissez une plage (ex: mardi après-midi). Sinon validez."
    }

    // Workflow en 3 étapes : Créneau → Statut → Lieu
    const handleCreneauClick = (jour, creneau) => {
        const creneauKey = `${jour}-${creneau}`
        setCreneauSelectionne(creneauKey)
        setStatutSelectionne('')
        setLieuSelectionne(null)
        setCreneauTermine(false)
    }

    const handleStatutClick = (statutKey) => {
        if (!creneauSelectionne) {
            alert('Veuillez d\'abord sélectionner un créneau (ex: Lundi matin)')
            return
        }
        
        setStatutSelectionne(statutKey)
        
        if (statutKey === 'indisponible') {
            const statut = statuts.find(s => s.key === statutKey)
            setPlanningData(prev => ({
                ...prev,
                [creneauSelectionne]: {
                    ...prev[creneauSelectionne],
                    statut: statutKey,
                    lieu: null,
                    couleurStatut: statut.couleur,
                    couleurLieu: null,
                    sansPreference: false
                }
            }))
            
            setCreneauTermine(true)
            setCreneauSelectionne(null)
            setStatutSelectionne('')
        }
    }

    const handleLieuClick = (lieu) => {
        if (!creneauSelectionne) {
            alert('Veuillez d\'abord sélectionner un créneau')
            return
        }
        
        if (!statutSelectionne) {
            alert('Veuillez d\'abord sélectionner un statut')
            return
        }

        if (statutSelectionne === 'indisponible') {
            alert('Pas besoin de lieu pour "indisponible"')
            return
        }

        const statut = statuts.find(s => s.key === statutSelectionne)
        
        setPlanningData(prev => ({
            ...prev,
            [creneauSelectionne]: {
                ...prev[creneauSelectionne],
                statut: statutSelectionne,
                lieu: lieu,
                couleurStatut: statut.couleur,
                couleurLieu: lieu ? lieu.couleur : null,
                sansPreference: false
            }
        }))

        setCreneauTermine(true)
        setCreneauSelectionne(null)
        setStatutSelectionne('')
        setLieuSelectionne(null)
    }

    // ✅ FONCTION CORRIGÉE : Gestion "Sans Préférence"
    const handleSansPreference = () => {
        if (!creneauSelectionne) {
            alert('Veuillez d\'abord sélectionner un créneau')
            return
        }
        
        if (!statutSelectionne) {
            alert('Veuillez d\'abord sélectionner un statut')
            return
        }

        if (statutSelectionne === 'indisponible') {
            alert('Pas besoin de lieu pour "indisponible"')
            return
        }

        const statut = statuts.find(s => s.key === statutSelectionne)
        
        // ✅ CORRECTION: Marquer explicitement comme "sans préférence"
        setPlanningData(prev => ({
            ...prev,
            [creneauSelectionne]: {
                ...prev[creneauSelectionne],
                statut: statutSelectionne,
                lieu: null, // Sans préférence = lieu_id null
                couleurStatut: statut.couleur,
                couleurLieu: null,
                sansPreference: true // ✅ NOUVEAU: Flag pour identifier "sans préférence"
            }
        }))

        setCreneauTermine(true)
        setCreneauSelectionne(null)
        setStatutSelectionne('')
        setLieuSelectionne(null)
    }

    // ✅ NOUVEAU: Gestion de la validation avec modal message facultatif
    const handleValider = async () => {
        const creneauxModifies = Object.values(planningData).filter(
            data => data.statut !== 'indisponible'
        ).length
        
        if (creneauxModifies === 0) {
            if (!window.confirm('Vous êtes indisponible sur tous les créneaux. Voulez-vous vraiment valider ce planning ?')) {
                return
            }
        }

        // ✅ NOUVEAU: Afficher modal pour message facultatif
        setShowMessageModal(true)
    }

    // ✅ NOUVEAU: Fonction d'envoi de message automatique vers admin
    const envoyerMessageAdmin = async (messageFacultatif = '') => {
        try {
            if (!user) {
                console.error('Données utilisateur manquantes')
                return
            }

            const formateurNom = `${user.prenom} ${user.nom}`
            
            let contenu = `${formateurNom} a déclaré son planning type. Veuillez le valider.`
            
            // Ajouter le message facultatif s'il existe
            if (messageFacultatif.trim()) {
                contenu += `\n\nMessage du formateur :\n"${messageFacultatif.trim()}"`
            }
            
            const { error } = await supabase
                .from('messages')
                .insert({
                    expediteur_id: user.id,
                    destinataire_id: null, // null = admin
                    expediteur: formateurNom,
                    destinataire: 'Coordination ACLEF',
                    objet: 'Validation de planning type',
                    contenu: contenu,
                    type: 'planning',
                    lu: false,
                    archive: false,
                    statut_validation: 'a_traiter',
                    date: new Date().toISOString().split('T')[0],
                    heure: new Date().toTimeString().slice(0, 5)
                })

            if (error) {
                console.error('Erreur envoi message admin:', error)
                // Ne pas faire échouer la sauvegarde pour un problème de message
            } else {
                console.log('✅ Message automatique envoyé à admin:', formateurNom)
            }

        } catch (error) {
            console.error('Erreur:', error)
            // Ne pas faire échouer la sauvegarde pour un problème de message
        }
    }

    // ✅ MODIFIÉ: Fonction de validation finale avec envoi message
    const handleValidationFinale = async () => {
        setShowMessageModal(false)
        
        // Envoyer message vers admin AVANT la sauvegarde
        await envoyerMessageAdmin(messageFacultatif)
        
        // Puis sauvegarder le planning
        await handleSauvegarde()
        
        // Reset du message facultatif
        setMessageFacultatif('')
    }

    // Sauvegarde en BDD SIMPLIFIÉE
    const handleSauvegarde = async () => {
        if (!user) {
            alert('Erreur: utilisateur non connecté')
            return
        }
        
        setIsSaving(true)
        
        try {
            // Préparer les données à insérer/mettre à jour
            const planningEntries = []
            
            jours.forEach(jour => {
                creneaux.forEach(creneau => {
                    const creneauKey = `${jour}-${creneau}`
                    const data = planningData[creneauKey]
                    
                    planningEntries.push({
                        formateur_id: user.id,
                        jour: jour,
                        creneau: creneau,
                        statut: data.statut,
                        lieu_id: data.lieu?.id || null // ✅ Reste null pour "sans préférence"
                    })
                })
            })

            // Supprimer les anciennes déclarations du formateur
            const { error: deleteError } = await supabase
                .from('planning_type_formateurs')
                .delete()
                .eq('formateur_id', user.id)

            if (deleteError) {
                throw new Error(`Erreur suppression: ${deleteError.message}`)
            }

            // Insérer les nouvelles déclarations
            const { error: insertError } = await supabase
                .from('planning_type_formateurs')
                .insert(planningEntries)

            if (insertError) {
                throw new Error(`Erreur insertion: ${insertError.message}`)
            }

            // Afficher confirmation et rediriger
            const confirmationDiv = document.createElement('div')
            confirmationDiv.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 15px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.3);
                z-index: 9999;
                text-align: center;
                font-family: system-ui;
                font-size: 16px;
                font-weight: bold;
                color: #16a34a;
                border: 3px solid #16a34a;
                max-width: 350px;
                line-height: 1.4;
            `
            confirmationDiv.innerHTML = `
                <div style="font-size: 24px; margin-bottom: 15px;">✅</div>
                <div style="margin-bottom: 15px;">
                    Planning type sauvegardé avec succès !
                </div>
                <div style="margin-top: 15px; font-size: 14px; color: #6b7280;">
                    Redirection dans <span id="countdown">3</span> secondes...
                </div>
            `
            
            document.body.appendChild(confirmationDiv)
            
            let seconds = 3
            const countdownElement = document.getElementById('countdown')
            const countdownInterval = setInterval(() => {
                seconds--
                if (countdownElement) {
                    countdownElement.textContent = seconds
                }
                if (seconds <= 0) {
                    clearInterval(countdownInterval)
                    document.body.removeChild(confirmationDiv)
                    router.push('/formateur')
                }
            }, 1000)

        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            alert('Erreur lors de la sauvegarde: ' + error.message)
        } finally {
            setIsSaving(false)
        }
    }

    // Rendu d'une case de créneau
    const renderCreneau = (jour, creneau) => {
        const creneauKey = `${jour}-${creneau}`
        const data = planningData[creneauKey]
        const isSelected = creneauSelectionne === creneauKey
        
        const style = {
            width: '100%',
            height: '60px',
            border: '2px solid #d1d5db',
            borderRadius: '8px',
            backgroundColor: data?.couleurStatut || '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            color: data?.couleurStatut ? '#fff' : '#6b7280',
            position: 'relative',
            transition: 'all 0.2s',
            borderColor: data?.couleurLieu || '#d1d5db',
            borderWidth: data?.couleurLieu ? '3px' : '2px'
        }

        return (
            <div
                key={creneauKey}
                style={style}
                onClick={() => handleCreneauClick(jour, creneau)}
            >
                {/* ✅ AFFICHAGE CORRIGÉ : SP si sans préférence OU initiales du lieu */}
                {data?.lieu?.initiale ? (
                    <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                        {data.lieu.initiale}
                    </span>
                ) : data?.sansPreference ? (
                    <span style={{ fontSize: '12px', fontWeight: 'bold' }}>
                        SP
                    </span>
                ) : null}
                
                {isSelected && (
                    <div style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        fontSize: '16px',
                        color: '#fbbf24'
                    }}>
                        ⭐
                    </div>
                )}
            </div>
        )
    }

    // Guide contextuel mobile et positionné
    const GuideBox = () => (
        <div style={{
            backgroundColor: '#e5f3ff',
            border: '3px solid #3b82f6',
            borderRadius: '10px',
            padding: '10px',
            marginBottom: '12px',
            fontSize: '14px',
            textAlign: 'center',
            fontWeight: 'bold',
            color: '#1d4ed8',
            transition: 'all 0.5s ease-in-out',
            boxShadow: '0 3px 8px rgba(59, 130, 246, 0.2)'
        }}>
            {getInstructionMessage()}
        </div>
    )

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
                <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement...</div>
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div style={{ padding: '15px', maxWidth: '400px', margin: '0 auto', fontFamily: 'system-ui' }}>
            {/* ✅ NOUVEAU: Modal pour message facultatif */}
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
                        maxWidth: '380px',
                        width: '90%'
                    }}>
                        <h3 style={{ 
                            margin: '0 0 15px 0', 
                            fontSize: '18px', 
                            color: '#374151',
                            textAlign: 'center'
                        }}>
                            💬 Message facultatif
                        </h3>
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#6b7280', 
                            margin: '0 0 15px 0',
                            textAlign: 'center',
                            lineHeight: '1.4'
                        }}>
                            Souhaitez-vous ajouter un message pour l'équipe de coordination ?
                            <br />
                            <em>(ex: "Je préfère être sur Châtellerault, CCP ou MPT")</em>
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
                                disabled={isSaving}
                                style={{
                                    flex: 1,
                                    backgroundColor: isSaving ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: isSaving ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isSaving ? 'Envoi...' : 'Valider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Popup d'information initiale */}
            {showInitialPopup && (
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
                        maxWidth: '350px',
                        width: '90%',
                        textAlign: 'center'
                    }}>
                        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px', color: '#d97706' }}>
                            ⚠️ Information importante
                        </h3>
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#374151', 
                            margin: '0 0 15px 0',
                            lineHeight: '1.4'
                        }}>
                            En règle générale, cela ne se fait qu'une seule fois par an, parlez-en au responsable de formation si des modifications sont nécessaires.
                        </p>
                        <p style={{ 
                            fontSize: '14px', 
                            color: '#d97706', 
                            margin: '0 0 20px 0',
                            fontWeight: 'bold',
                            lineHeight: '1.4'
                        }}>
                            ⚠️ Pour vos vacances ou absences temporaires, utilisez "Modifications ponctuelles"
                        </p>
                        <button
                            onClick={() => setShowInitialPopup(false)}
                            style={{
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '12px 24px',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            OK, j'ai compris
                        </button>
                    </div>
                </div>
            )}

            {/* En-tête avec aide */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 'bold' }}>
                    Mon planning type
                </h2>
                <button
                    onClick={() => setShowAide(!showAide)}
                    style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '18px',
                        padding: '6px 14px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}
                >
                    Aide
                </button>
            </div>

            {/* Texte explicatif */}
            <div style={{ 
                padding: '8px', 
                marginBottom: '12px',
                fontSize: '12px',
                lineHeight: '1.2'
            }}>
                <p style={{ margin: 0, textAlign: 'center', fontWeight: 'bold' }}>
                    Vous allez déclarer les créneaux et les lieux de vos interventions régulières pour l'année 2025-2026.
                </p>
            </div>

            {/* Aide contextuelle */}
            {showAide && (
                <div style={{
                    backgroundColor: '#e5f3ff',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '15px',
                    fontSize: '12px'
                }}>
                    <div style={{ marginBottom: '8px' }}>
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '11px' }}>
                            🔘 Disponible : Vous pouvez intervenir sur ce créneau normalement.
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '11px' }}>
                            🟡 Disponible exceptionnellement : Vous pouvez intervenir exceptionnellement sur ce créneau (par exemple, pour remplacer un bénévole absent.)
                        </p>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '11px' }}>
                            🟢 Sans Préférence (SP) : Le lieu d'intervention n'a pas d'importance pour vous.
                        </p>
                    </div>
                </div>
            )}

            {/* Guide contextuel positionné AVANT le planning si pas de créneau sélectionné */}
            {!creneauSelectionne && <GuideBox />}

            {/* Grille du planning */}
            <div style={{ marginBottom: '12px' }}>        
                {/* En-têtes des jours */}
                <div style={{ display: 'grid', gridTemplateColumns: '65px repeat(5, 1fr)', gap: '2px', marginBottom: '4px' }}>
                    <div></div>
                    {jours.map(jour => (
                        <div key={jour} style={{ 
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '10px',
                            color: '#374151'
                        }}>
                            {jour}
                        </div>
                    ))}
                </div>

                {/* Grille des créneaux */}
                {creneaux.map(creneau => (
                    <div key={creneau} style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '65px repeat(5, 1fr)', 
                        gap: '2px', 
                        marginBottom: '4px' 
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            fontSize: '10px', 
                            fontWeight: 'bold',
                            color: '#374151'
                        }}>
                            {creneau}
                        </div>
                        {jours.map(jour => renderCreneau(jour, creneau))}
                    </div>
                ))}
            </div>

            {/* Guide contextuel positionné AVANT les statuts si créneau sélectionné mais pas de statut */}
            {creneauSelectionne && !statutSelectionne && <GuideBox />}

            {/* Boutons de statut colorés */}
            <div style={{ marginBottom: '12px' }}>        
                <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                    {statuts.map(statut => (
                        <button
                            key={statut.key}
                            onClick={() => handleStatutClick(statut.key)}
                            style={{
                                flex: 1,
                                padding: '8px 4px',
                                backgroundColor: statut.couleur,
                                color: 'white',
                                border: statutSelectionne === statut.key ? '3px solid #000' : '2px solid transparent',
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: !creneauSelectionne ? 0.5 : 1
                            }}
                            disabled={!creneauSelectionne}
                        >
                            {statut.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Guide contextuel positionné AVANT les lieux si statut sélectionné mais pas de lieu */}
            {creneauSelectionne && statutSelectionne && statutSelectionne !== 'indisponible' && !lieuSelectionne && <GuideBox />}

            {/* ✅ BOUTONS DE LIEUX CORRIGÉS - SP en premier, tous sur la même ligne */}
            <div style={{ marginBottom: '8px' }}>        
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(5, 1fr)', // ✅ 5 colonnes exactement
                    gap: '4px',
                    marginBottom: '8px'
                }}>
                    {/* ✅ BOUTON SANS PRÉFÉRENCE EN PREMIER */}
                    <button
                        onClick={handleSansPreference}
                        style={{
                            padding: '10px 4px',
                            backgroundColor: 'white',
                            border: '3px solid #6b7280',
                            borderRadius: '6px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: !creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible' ? 0.5 : 1
                        }}
                        disabled={!creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible'}
                    >
                        <div style={{ fontSize: '12px', marginBottom: '1px' }}>
                            SP
                        </div>
                        <div style={{ fontSize: '8px' }}>
                            Sans Préf.
                        </div>
                    </button>

                    {/* ✅ VRAIS LIEUX ENSUITE */}
                    {lieux.map(lieu => (
                        <button
                            key={lieu.id}
                            onClick={() => handleLieuClick(lieu)}
                            style={{
                                padding: '10px 4px',
                                backgroundColor: 'white',
                                border: `3px solid ${lieu.couleur}`,
                                borderRadius: '6px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                color: lieu.couleur,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: !creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible' ? 0.5 : 1,
                                transform: lieuSelectionne?.id === lieu.id ? 'scale(1.05)' : 'scale(1)'
                            }}
                            disabled={!creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible'}
                        >
                            <div style={{ fontSize: '12px', marginBottom: '1px' }}>
                                {lieu.initiale}
                            </div>
                            <div style={{ fontSize: '8px' }}>
                                {lieu.nom}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Guide contextuel positionné AVANT les boutons d'action si créneau terminé */}
            {creneauTermine && <GuideBox />}

            {/* Boutons d'action */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>        
                <button
                    onClick={handleValider}
                    disabled={isSaving}
                    style={{
                        width: '100%',
                        backgroundColor: isSaving ? '#9ca3af' : '#84cc16',
                        color: 'white',
                        border: 'none',
                        borderRadius: '20px',
                        padding: '12px',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isSaving ? 'Sauvegarde...' : 'Valider'}
                </button>
            </div>

            {/* Bouton retour à l'accueil */}
            <div style={{ display: 'flex', gap: '10px' }}>
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

            {/* Stats */}
            {user && (
                <div style={{
                    marginTop: '16px',
                    fontSize: '10px',
                    color: '#6b7280',
                    textAlign: 'center'
                }}>
                    {user.prenom} • {Object.values(planningData).filter(d => d.statut !== 'indisponible').length} créneaux disponibles
                </div>
            )}
        </div>
    )
}
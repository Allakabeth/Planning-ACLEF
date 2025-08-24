import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'

export default function PlanningFormateurType({ 
    formateurId,
    formateurData,
    onSuccess,
    onError 
}) {
    const [isLoading, setIsLoading] = useState(true)
    const [lieux, setLieux] = useState([])
    const [planningData, setPlanningData] = useState({})
    const [creneauSelectionne, setCreneauSelectionne] = useState(null)
    const [statutSelectionne, setStatutSelectionne] = useState('')
    const [lieuSelectionne, setLieuSelectionne] = useState(null)
    const [creneauTermine, setCreneauTermine] = useState(false)
    const [showAide, setShowAide] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showMessageModal, setShowMessageModal] = useState(false)
    const [messageFacultatif, setMessageFacultatif] = useState('')

    // Configuration des jours et créneaux
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

    useEffect(() => {
        if (formateurId) {
            chargerDonnees(formateurId)
        }
    }, [formateurId])

    const chargerDonnees = async (id) => {
        try {
            setIsLoading(true)
            
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
                .eq('formateur_id', id)

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
            onError?.(`Erreur chargement: ${error.message}`)
        } finally {
            setIsLoading(false)
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

    // Gestion "Sans Préférence"
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
        
        setPlanningData(prev => ({
            ...prev,
            [creneauSelectionne]: {
                ...prev[creneauSelectionne],
                statut: statutSelectionne,
                lieu: null,
                couleurStatut: statut.couleur,
                couleurLieu: null,
                sansPreference: true
            }
        }))

        setCreneauTermine(true)
        setCreneauSelectionne(null)
        setStatutSelectionne('')
        setLieuSelectionne(null)
    }

    // Gestion de la validation avec modal message facultatif
    const handleValider = async () => {
        const creneauxModifies = Object.values(planningData).filter(
            data => data.statut !== 'indisponible'
        ).length
        
        if (creneauxModifies === 0) {
            if (!window.confirm('Le formateur sera indisponible sur tous les créneaux. Voulez-vous vraiment valider ce planning ?')) {
                return
            }
        }

        // Afficher modal pour message facultatif
        setShowMessageModal(true)
    }

    // ✅ NOUVEAU: Fonction d'envoi de message automatique vers formateur
    const envoyerMessageFormateur = async (messageFacultatif = '') => {
        try {
            if (!formateurData) {
                console.error('Données formateur manquantes')
                return
            }

            const formateurNom = `${formateurData.prenom} ${formateurData.nom}`
            
            let contenu = `Bonjour ${formateurData.prenom},\n\nLes administrateurs ont modifié votre planning type.`
            
            // Ajouter le message facultatif s'il existe
            if (messageFacultatif.trim()) {
                contenu += `\n\nMessage de l'équipe :\n"${messageFacultatif.trim()}"`
            }
            
            contenu += `\n\nBonne journée !\nL'équipe de coordination`
            
            const { error } = await supabase
                .from('messages')
                .insert({
                    expediteur_id: null, // null = admin
                    destinataire_id: formateurData.id,
                    expediteur: 'Coordination ACLEF',
                    destinataire: formateurNom,
                    objet: 'Modification de votre planning type',
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

    // Fonction de validation finale avec envoi message
    const handleValidationFinale = async () => {
        setShowMessageModal(false)
        
        // Envoyer message vers formateur AVANT la sauvegarde
        await envoyerMessageFormateur(messageFacultatif)
        
        // Puis sauvegarder le planning
        await handleSauvegarde()
        
        // Reset du message facultatif
        setMessageFacultatif('')
    }

    // Sauvegarde en BDD
    const handleSauvegarde = async () => {
        if (!formateurId) {
            onError?.('Erreur: aucun formateur sélectionné')
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
                        formateur_id: formateurId,
                        jour: jour,
                        creneau: creneau,
                        statut: data.statut,
                        lieu_id: data.lieu?.id || null
                    })
                })
            })

            // Supprimer les anciennes déclarations du formateur
            const { error: deleteError } = await supabase
                .from('planning_type_formateurs')
                .delete()
                .eq('formateur_id', formateurId)

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

            // Notifier le succès
            onSuccess?.(`✅ Planning type de ${formateurData?.prenom} ${formateurData?.nom} sauvegardé avec succès !`)

        } catch (error) {
            console.error('Erreur sauvegarde:', error)
            onError?.(`Erreur lors de la sauvegarde: ${error.message}`)
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

    // Guide contextuel
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
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px'
            }}>
                <div style={{ color: '#667eea', fontSize: '18px' }}>Chargement du planning...</div>
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
                            <em>(ex: "Je préfère vous affecter sur Châtellerault, CCP ou MPT")</em>
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
                                {isSaving ? 'Sauvegarde...' : 'Valider'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* En-tête avec aide */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#374151' }}>
                    📅 Planning Type - {formateurData.prenom} {formateurData.nom}
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

            {/* Aide contextuelle */}
            {showAide && (
                <div style={{
                    backgroundColor: '#e5f3ff',
                    border: '2px solid #3b82f6',
                    borderRadius: '8px',
                    padding: '15px',
                    marginBottom: '20px',
                    fontSize: '13px'
                }}>
                    <div style={{ marginBottom: '8px' }}>
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '12px' }}>
                            🔘 Disponible : Le formateur peut intervenir sur ce créneau normalement.
                        </p>
                        <p style={{ margin: '0 0 3px 0', fontWeight: 'bold', fontSize: '12px' }}>
                            🟡 Disponible exceptionnellement : Le formateur peut intervenir exceptionnellement (remplacements).
                        </p>
                        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold', fontSize: '12px' }}>
                            🟢 Sans Préférence (SP) : Le lieu d'intervention n'a pas d'importance.
                        </p>
                    </div>
                </div>
            )}

            {/* Guide contextuel */}
            <GuideBox />

            {/* Grille du planning - Adapté desktop */}
            <div style={{ marginBottom: '20px' }}>        
                {/* En-têtes des jours */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '100px repeat(5, 1fr)', 
                    gap: '8px', 
                    marginBottom: '8px' 
                }}>
                    <div></div>
                    {jours.map(jour => (
                        <div key={jour} style={{ 
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '14px',
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
                        gridTemplateColumns: '100px repeat(5, 1fr)', 
                        gap: '8px', 
                        marginBottom: '8px' 
                    }}>
                        <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            fontSize: '14px', 
                            fontWeight: 'bold',
                            color: '#374151'
                        }}>
                            {creneau}
                        </div>
                        {jours.map(jour => renderCreneau(jour, creneau))}
                    </div>
                ))}
            </div>

            {/* Boutons de statut colorés - Desktop */}
            <div style={{ marginBottom: '20px' }}>        
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>
                    Choisir un statut :
                </h4>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    {statuts.map(statut => (
                        <button
                            key={statut.key}
                            onClick={() => handleStatutClick(statut.key)}
                            style={{
                                flex: 1,
                                padding: '12px 8px',
                                backgroundColor: statut.couleur,
                                color: 'white',
                                border: statutSelectionne === statut.key ? '3px solid #000' : '2px solid transparent',
                                borderRadius: '8px',
                                fontSize: '12px',
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

            {/* Boutons de lieux - Desktop */}
            <div style={{ marginBottom: '20px' }}>        
                <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#374151' }}>
                    Choisir un lieu :
                </h4>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                    gap: '8px',
                    marginBottom: '15px'
                }}>
                    {/* Bouton Sans Préférence */}
                    <button
                        onClick={handleSansPreference}
                        style={{
                            padding: '15px 8px',
                            backgroundColor: 'white',
                            border: '3px solid #6b7280',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            color: '#6b7280',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            opacity: !creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible' ? 0.5 : 1
                        }}
                        disabled={!creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible'}
                    >
                        <div style={{ fontSize: '14px', marginBottom: '2px' }}>SP</div>
                        <div style={{ fontSize: '10px' }}>Sans Préf.</div>
                    </button>

                    {/* Vrais lieux */}
                    {lieux.map(lieu => (
                        <button
                            key={lieu.id}
                            onClick={() => handleLieuClick(lieu)}
                            style={{
                                padding: '15px 8px',
                                backgroundColor: 'white',
                                border: `3px solid ${lieu.couleur}`,
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                color: lieu.couleur,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                opacity: !creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible' ? 0.5 : 1
                            }}
                            disabled={!creneauSelectionne || !statutSelectionne || statutSelectionne === 'indisponible'}
                        >
                            <div style={{ fontSize: '14px', marginBottom: '2px' }}>
                                {lieu.initiale}
                            </div>
                            <div style={{ fontSize: '10px' }}>
                                {lieu.nom}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Bouton de validation */}
            <div style={{ textAlign: 'center' }}>        
                <button
                    onClick={handleValider}
                    disabled={isSaving}
                    style={{
                        backgroundColor: isSaving ? '#9ca3af' : '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '15px 30px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: isSaving ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isSaving ? 'Sauvegarde...' : '✅ Valider le planning type'}
                </button>
            </div>

            {/* Stats */}
            <div style={{
                marginTop: '20px',
                fontSize: '12px',
                color: '#6b7280',
                textAlign: 'center'
            }}>
                {formateurData.prenom} • {Object.values(planningData).filter(d => d.statut !== 'indisponible').length} créneaux disponibles
            </div>
        </div>
    )
}
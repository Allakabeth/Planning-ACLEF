import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function MaPresence() {
    const { user, isLoading: authLoading, isAuthenticated } = useFormateurAuth()
    const [lieux, setLieux] = useState([])
    const [presences, setPresences] = useState({})
    const [presencesLocales, setPresencesLocales] = useState({}) // État local pour les clics
    const [planningType, setPlanningType] = useState([])
    const [absencesValidees, setAbsencesValidees] = useState([])
    const [planningCoordo, setPlanningCoordo] = useState([])
    const [planningFinal, setPlanningFinal] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [showAbsenceForm, setShowAbsenceForm] = useState(false)
    const [absenceForm, setAbsenceForm] = useState({
        date: '',
        creneau: 'matin',
        lieu: ''
    })
    const router = useRouter()

    // Créneaux simples : juste aujourd'hui
    const creneaux = ['Matin', 'AM']
    const aujourdhui = new Date()

    // Protection authentification
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/formateur/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (user) {
            chargerDonnees()
        }
    }, [user])

    const chargerDonnees = async () => {
        if (!user) return

        try {
            setIsLoading(true)
            console.log('📝 Chargement données complètes pour:', user.prenom, user.nom)

            // Charger les lieux
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)
                .order('nom')

            if (lieuxError) throw lieuxError
            setLieux(lieuxData || [])

            // Charger le planning type du formateur
            const { data: planningTypeData, error: planningTypeError } = await supabase
                .from('planning_type_formateurs')
                .select(`
                    id,
                    jour,
                    creneau,
                    statut,
                    lieu_id,
                    valide
                `)
                .eq('formateur_id', user.id)
                .eq('valide', true)
                .eq('statut', 'disponible')

            if (planningTypeError) throw planningTypeError
            setPlanningType(planningTypeData || [])

            // Charger les absences validées pour aujourd'hui
            const dateAujourdhui = aujourdhui.toISOString().split('T')[0]
            const { data: absencesData, error: absencesError } = await supabase
                .from('absences_formateurs')
                .select(`
                    id,
                    date_debut,
                    date_fin,
                    type,
                    statut,
                    motif
                `)
                .eq('formateur_id', user.id)
                .eq('statut', 'validé')
                .gte('date_debut', dateAujourdhui)
                .lte('date_fin', dateAujourdhui)

            if (absencesError) throw absencesError
            setAbsencesValidees(absencesData || [])

            // Charger le planning coordonnateur pour aujourd'hui
            const { data: planningCoordoData, error: coordoError } = await supabase
                .from('planning_hebdomadaire')
                .select(`
                    id,
                    date,
                    jour,
                    creneau,
                    lieu_id,
                    formateurs_ids
                `)
                .eq('date', dateAujourdhui)

            if (coordoError) throw coordoError

            // Filtrer pour ce formateur spécifique
            const planningCoordoFormateur = (planningCoordoData || []).filter(pc => {
                return pc.formateurs_ids && pc.formateurs_ids.includes(user.id)
            })
            setPlanningCoordo(planningCoordoFormateur)

            // Construire le planning final d'aujourd'hui avec la logique d'arbitrage
            const jourAujourdhui = aujourdhui.toLocaleDateString('fr-FR', { weekday: 'long' })
            const jourCapitalized = jourAujourdhui.charAt(0).toUpperCase() + jourAujourdhui.slice(1)

            const planningAujourdhui = construirePlanningJour(
                planningTypeData || [],
                absencesData || [],
                planningCoordoFormateur || [],
                jourCapitalized,
                dateAujourdhui
            )
            setPlanningFinal(planningAujourdhui)

            // Charger les présences d'AUJOURD'HUI
            console.log('📅 Chargement présences pour aujourd\'hui:', dateAujourdhui)

            const { data: presencesData, error: presencesError } = await supabase
                .from('presence_formateurs')
                .select('*')
                .eq('formateur_id', user.id)
                .eq('date', dateAujourdhui)

            if (presencesError) throw presencesError

            // Organiser les présences par créneau
            const presencesMap = {}
            presencesData?.forEach(presence => {
                const creneau = presence.periode === 'matin' ? 'Matin' : 'AM'
                presencesMap[creneau] = presence
            })

            setPresences(presencesMap)

            // Initialiser les présences locales (rouge par défaut, vert si déjà présent en BDD)
            const presencesLocalesInit = {}
            creneaux.forEach(creneau => {
                const presence = presencesMap[creneau]
                presencesLocalesInit[creneau] = presence?.present || false // false = rouge, true = vert
            })
            setPresencesLocales(presencesLocalesInit)

            console.log('📊 Planning final aujourd\'hui:', planningAujourdhui)
            console.log('📊 Présences aujourd\'hui chargées:', Object.keys(presencesMap).length, 'créneaux')
            console.log('🎨 Présences locales initialisées:', presencesLocalesInit)
        } catch (error) {
            console.error('Erreur chargement données:', error)
            setMessage('❌ Erreur lors du chargement')
        } finally {
            setIsLoading(false)
        }
    }

    // Fonction d'arbitrage pour construire le planning d'un jour (adaptée de mon-planning-hebdo.js)
    const construirePlanningJour = (planningType, absences, planningCoordo, jour, dateString) => {
        const planningJour = []

        console.log(`🎯 DÉBUT ARBITRAGE pour ${jour} (${dateString})`)

        for (const creneau of creneaux) {
            console.log(`\n🔍 Arbitrage ${jour} ${creneau}:`)

            // Vérifier d'abord les absences validées pour ce jour
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

            // ★★★ LOGIQUE ROI - PRIORITÉ DISPO EXCEPTIONNELLE ABSOLUE ★★★
            if (absenceJour && absenceJour.type === 'formation') {
                console.log(`🟡 ÉTAT 1 - DISPO EXCEPTIONNELLE (ROI A VALIDÉ): priorité absolue !`)
                planningJour.push({
                    jour,
                    creneau,
                    lieu_id: null,
                    statut: 'dispo_except',
                    source: 'roi_dispo_except',
                    priorite: 1,
                    type_absence: absenceJour.type
                })
                continue
            }

            // 🎯 PRIORITÉ 2 : Absence validée (NOUVELLE RÈGLE - GAGNE TOUJOURS)
            if (absenceJour && absenceJour.type !== 'formation') {
                console.log(`🟥 ÉTAT 2 - ABSENT VALIDÉ (JE NE PEUX PAS VENIR):`, absenceJour.type)
                planningJour.push({
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

            // 🎯 PRIORITÉ 3 : Planning coordo (SEULEMENT si pas d'absence)
            const creneauDB = creneau === 'Matin' ? 'matin' : 'AM'
            const affectationCoordo = planningCoordo.find(pc => {
                const jourMatch = pc.jour === jour
                const creneauMatch = pc.creneau === creneauDB

                console.log(`🔧 Vérification planning coordo: ${pc.jour}==${jour}? ${jourMatch}, ${pc.creneau}==${creneauDB}? ${creneauMatch}`)

                return jourMatch && creneauMatch
            })

            if (affectationCoordo) {
                console.log(`🟦 ÉTAT 3 - AFFECTÉ PAR COORDO (JE VIENS):`, affectationCoordo.lieu_id)
                planningJour.push({
                    jour,
                    creneau,
                    lieu_id: affectationCoordo.lieu_id,
                    statut: 'affecte_coordo',
                    source: 'planning_coordo',
                    priorite: 3
                })
                continue
            }

            // 🎯 PRIORITÉ 4 : Planning type NORMAL → DISPONIBLE MAIS PAS CHOISI
            const creneauType = planningType.find(pt =>
                pt.jour === jour && pt.creneau === creneau
            )

            if (creneauType) {
                console.log(`⬜ ÉTAT 4 - DISPONIBLE MAIS PAS CHOISI (EN ATTENTE):`, creneauType.lieu_id || 'Sans préférence')
                planningJour.push({
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
            // ✅ Ne rien ajouter = pas prévu d'intervenir
        }

        console.log('🎯 FIN ARBITRAGE - Résultat final:', planningJour.length, 'créneaux')
        return planningJour
    }

    // Fonction pour vérifier si le formateur devait intervenir aujourd'hui
    const verifierInterventionPrevue = (creneau) => {
        const creneauPlanifie = planningFinal.find(pf => pf.creneau === creneau)
        return creneauPlanifie ? creneauPlanifie : null
    }

    // Fonction pour basculer la présence LOCALEMENT (pas de sauvegarde)
    const togglePresenceLocale = (creneau) => {
        setPresencesLocales(prev => ({
            ...prev,
            [creneau]: !prev[creneau] // Basculer entre true (vert) et false (rouge)
        }))
        console.log(`🎨 Basculé ${creneau}: ${!presencesLocales[creneau] ? 'VERT' : 'ROUGE'}`)
    }

    // Fonction pour valider et enregistrer toutes les présences
    const validerPresences = async () => {
        if (!user) return

        setIsSaving(true)
        const dateString = aujourdhui.toISOString().split('T')[0]
        const lieuParDefaut = lieux[0]?.initiale || 'ACLEF'

        try {
            console.log('💾 Validation des présences:', presencesLocales)

            // Vérifications avant enregistrement
            const warnings = []
            const erreurs = []
            const presencesBureau = []

            for (const creneau of creneaux) {
                const estPresent = presencesLocales[creneau]

                // ⚠️ VÉRIFICATION : Le formateur devait-il intervenir ?
                const interventionPrevue = verifierInterventionPrevue(creneau)

                if (estPresent && !interventionPrevue) {
                    // Formateur dit présent mais n'était pas prévu
                    // Si formateur n'a PAS de bureau => ERREUR BLOQUANTE
                    if (!user.bureau) {
                        erreurs.push(`❌ ${creneau}: Vous n'êtes pas planifié aujourd'hui.\n\nIl doit y avoir une erreur.\nParlez-en aux responsables de formation.`)
                    } else {
                        // Formateur a un bureau => OK, intervention Bureau
                        console.log(`🏢 ${creneau}: Intervention Bureau autorisée`)
                        presencesBureau.push(creneau)
                    }
                } else if (estPresent && interventionPrevue) {
                    // Formateur dit présent et était effectivement prévu
                    const statutPrevu = interventionPrevue.statut
                    if (statutPrevu === 'absent') {
                        erreurs.push(`❌ ${creneau}: Vous aviez une absence validée`)
                    } else if (statutPrevu === 'affecte_coordo') {
                        console.log(`✅ ${creneau}: Présence cohérente avec affectation coordo`)
                    } else if (statutPrevu === 'dispo_except') {
                        console.log(`✅ ${creneau}: Présence cohérente avec dispo exceptionnelle`)
                    } else if (statutPrevu === 'disponible_non_choisi') {
                        warnings.push(`⚠️ ${creneau}: Vous étiez disponible mais pas affecté`)
                    }
                }
            }

            // Afficher erreurs bloquantes
            if (erreurs.length > 0) {
                setMessage(erreurs.join('\n'))
                setTimeout(() => setMessage(''), 5000)
                setIsSaving(false)
                return
            }

            // Afficher warnings mais continuer
            if (warnings.length > 0) {
                setMessage(warnings.join('\n') + '\n\n⏳ Enregistrement quand même...')
            }

            // Enregistrement
            for (const creneau of creneaux) {
                const estPresent = presencesLocales[creneau]
                const periode = creneau === 'Matin' ? 'matin' : 'apres_midi'
                const presenceExistante = presences[creneau]

                if (presenceExistante) {
                    // Mettre à jour l'enregistrement existant
                    const { error } = await supabase
                        .from('presence_formateurs')
                        .update({ present: estPresent })
                        .eq('id', presenceExistante.id)

                    if (error) throw error
                    console.log(`✅ Mis à jour ${creneau}: ${estPresent ? 'PRÉSENT' : 'ABSENT'}`)
                } else {
                    // Créer un nouvel enregistrement
                    const { error } = await supabase
                        .from('presence_formateurs')
                        .insert([{
                            formateur_id: user.id,
                            date: dateString,
                            periode: periode,
                            lieu: lieuParDefaut,
                            present: estPresent
                        }])

                    if (error) throw error
                    console.log(`➕ Créé ${creneau}: ${estPresent ? 'PRÉSENT' : 'ABSENT'}`)
                }
            }

            // Message de confirmation adapté
            if (presencesBureau.length > 0) {
                const creneauxBureau = presencesBureau.join(' et ')
                setMessage(`bureau_${creneauxBureau}`) // Message spécial pour le popup Bureau
            } else {
                setMessage('✅ Présences enregistrées avec succès !')
            }

            // Recharger les données pour synchroniser
            await chargerDonnees()

            // Fermer le message après 5 secondes (plus long pour le popup Bureau)
            setTimeout(() => setMessage(''), presencesBureau.length > 0 ? 5000 : 3000)

        } catch (error) {
            console.error('Erreur validation présences:', error)
            setMessage('❌ Erreur lors de l\'enregistrement')
            setTimeout(() => setMessage(''), 3000)
        } finally {
            setIsSaving(false)
        }
    }

    // Fonction pour déclarer une absence
    const declarerAbsence = async () => {
        if (!user || !absenceForm.date || !absenceForm.lieu) {
            setMessage('❌ Veuillez remplir tous les champs')
            setTimeout(() => setMessage(''), 3000)
            return
        }

        setIsSaving(true)
        try {
            // ⚠️ VÉRIFICATION POUR LES ABSENCES RÉTROACTIVES
            // Si c'est pour aujourd'hui, on peut vérifier avec le planning final chargé
            if (absenceForm.date === aujourdhui.toISOString().split('T')[0]) {
                const creneauFormulaire = absenceForm.creneau === 'matin' ? 'Matin' : 'AM'
                const interventionPrevue = verifierInterventionPrevue(creneauFormulaire)

                if (!interventionPrevue) {
                    setMessage(`⚠️ Vous n'étiez pas prévu d'intervenir le ${creneauFormulaire} aujourd'hui\n⏳ Déclaration quand même...`)
                } else if (interventionPrevue.statut === 'affecte_coordo') {
                    setMessage(`⚠️ Attention: Vous étiez affecté par le coordinateur\n⏳ Déclaration d'absence quand même...`)
                } else if (interventionPrevue.statut === 'absent') {
                    setMessage('✅ Cohérent: Vous aviez déjà une absence validée')
                }
            }

            const { error } = await supabase
                .from('presence_formateurs')
                .insert([{
                    formateur_id: user.id,
                    date: absenceForm.date,
                    periode: absenceForm.creneau,
                    lieu: absenceForm.lieu,
                    present: false // Absence
                }])

            if (error) throw error

            setMessage('✅ Absence déclarée avec succès')
            setShowAbsenceForm(false)
            setAbsenceForm({ date: '', creneau: 'matin', lieu: '' })

            // Recharger si c'est pour aujourd'hui
            if (absenceForm.date === aujourdhui.toISOString().split('T')[0]) {
                await chargerDonnees()
            }

            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            console.error('Erreur déclaration absence:', error)
            setMessage('❌ Erreur lors de la déclaration d\'absence')
            setTimeout(() => setMessage(''), 3000)
        } finally {
            setIsSaving(false)
        }
    }

    // Fonction pour obtenir le statut d'un créneau (basé sur l'état LOCAL)
    const getCreneauStatut = (creneau) => {
        return presencesLocales[creneau] ? 'present' : 'absent'
    }

    // Fonction pour obtenir la couleur d'un créneau (basé sur l'état LOCAL)
    const getCreneauColor = (creneau) => {
        return presencesLocales[creneau] ? '#22c55e' : '#ef4444' // Vert si présent, Rouge si absent
    }

    // Fonction pour obtenir la couleur du texte
    const getTextColor = (creneau) => {
        return 'white' // Toujours blanc sur fond coloré
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
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '8px' }}>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            margin: 0,
                            color: '#1f2937'
                        }}>
                            Ma Présence
                        </h1>
                        <button
                            onClick={() => router.push('/formateur')}
                            style={{
                                padding: '8px 12px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '16px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                        >
                            🏠
                        </button>
                    </div>
                    <p style={{
                        fontSize: '16px',
                        color: '#6b7280',
                        margin: '0 0 8px 0'
                    }}>
                        {aujourdhui.toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                    <p style={{
                        fontSize: '14px',
                        color: '#059669',
                        margin: '0',
                        fontWeight: '500'
                    }}>
                        🟢 Cliquez pour marquer votre présence
                    </p>
                </div>

                {/* Messages */}
                {message && (
                    <>
                        {message.includes('pas planifié') ? (
                            // Popup modal pour erreur critique "pas planifié"
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 9999
                            }}>
                                <div style={{
                                    backgroundColor: 'white',
                                    padding: '30px',
                                    borderRadius: '16px',
                                    maxWidth: '90%',
                                    width: '400px',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '48px',
                                        marginBottom: '15px'
                                    }}>⚠️</div>
                                    <h2 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        color: '#991b1b',
                                        marginBottom: '15px'
                                    }}>Vous n'êtes pas planifié aujourd'hui</h2>
                                    <p style={{
                                        fontSize: '16px',
                                        color: '#6b7280',
                                        marginBottom: '10px',
                                        lineHeight: '1.5'
                                    }}>Il doit y avoir une erreur.</p>
                                    <p style={{
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        marginBottom: '25px'
                                    }}>Parlez-en aux responsables de formation.</p>
                                    <button
                                        onClick={() => setMessage('')}
                                        style={{
                                            padding: '12px 30px',
                                            backgroundColor: '#dc2626',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        J'ai compris
                                    </button>
                                </div>
                            </div>
                        ) : message.startsWith('bureau_') ? (
                            // Popup modal pour confirmation présence Bureau
                            <div style={{
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 9999
                            }}>
                                <div style={{
                                    backgroundColor: 'white',
                                    padding: '30px',
                                    borderRadius: '16px',
                                    maxWidth: '90%',
                                    width: '400px',
                                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                                    textAlign: 'center'
                                }}>
                                    <div style={{
                                        fontSize: '48px',
                                        marginBottom: '15px'
                                    }}>🏢</div>
                                    <h2 style={{
                                        fontSize: '20px',
                                        fontWeight: 'bold',
                                        color: '#059669',
                                        marginBottom: '15px'
                                    }}>Présence Bureau enregistrée</h2>
                                    <p style={{
                                        fontSize: '16px',
                                        color: '#374151',
                                        marginBottom: '10px',
                                        lineHeight: '1.5'
                                    }}>
                                        Votre présence a été enregistrée pour un temps de présence <strong>Bureau</strong>
                                        {message.replace('bureau_', '') && ` (${message.replace('bureau_', '')})`}.
                                    </p>
                                    <button
                                        onClick={() => setMessage('')}
                                        style={{
                                            padding: '12px 30px',
                                            backgroundColor: '#059669',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            fontSize: '16px',
                                            fontWeight: '600',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Valider
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // Bandeau normal pour autres messages
                            <div style={{
                                padding: '15px',
                                borderRadius: '12px',
                                marginBottom: '20px',
                                backgroundColor: message.includes('❌') ? '#fee2e2' : '#d1fae5',
                                color: message.includes('❌') ? '#991b1b' : '#065f46',
                                fontSize: '16px',
                                textAlign: 'center',
                                fontWeight: '500',
                                border: `2px solid ${message.includes('❌') ? '#fecaca' : '#a7f3d0'}`
                            }}>
                                {message}
                            </div>
                        )}
                    </>
                )}

                {/* Légende */}
                <div style={{
                    backgroundColor: '#f8fafc',
                    padding: '16px',
                    borderRadius: '12px',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: '#22c55e',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                ✓
                            </div>
                            <span style={{ color: '#374151' }}>VERT = Présent</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                backgroundColor: '#ef4444',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '12px',
                                fontWeight: 'bold'
                            }}>
                                ✗
                            </div>
                            <span style={{ color: '#374151' }}>ROUGE = Absent (défaut)</span>
                        </div>
                    </div>
                </div>

                {/* Créneaux d'aujourd'hui */}
                <div style={{
                    display: 'flex',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    {creneaux.map(creneau => {
                        const statut = getCreneauStatut(creneau)

                        return (
                            <div
                                key={creneau}
                                onClick={() => togglePresenceLocale(creneau)}
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    backgroundColor: getCreneauColor(creneau),
                                    color: getTextColor(creneau),
                                    borderRadius: '12px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    textAlign: 'center',
                                    minHeight: '60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    transform: 'scale(1)',
                                    border: 'none'
                                }}
                                onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
                                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
                                onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                            >
                                <div style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginBottom: '4px'
                                }}>
                                    {creneau}
                                </div>

                                <div style={{
                                    fontSize: '24px'
                                }}>
                                    {statut === 'present' ? '✓' : '✗'}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* Bouton Valider */}
                <button
                    onClick={validerPresences}
                    disabled={isSaving}
                    style={{
                        width: '100%',
                        padding: '18px',
                        background: isSaving ? '#9ca3af' : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        marginBottom: '16px',
                        boxShadow: isSaving ? 'none' : '0 4px 12px rgba(5, 150, 105, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    {isSaving ? (
                        <>
                            <div style={{
                                width: '20px',
                                height: '20px',
                                border: '2px solid transparent',
                                borderTop: '2px solid white',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite'
                            }}></div>
                            Enregistrement...
                        </>
                    ) : (
                        <>
                            💾 Valider mes présences
                        </>
                    )}
                </button>

                {/* Bouton déclarer absence */}
                <button
                    onClick={() => setShowAbsenceForm(true)}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        marginBottom: '20px',
                        boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                    }}
                >
                    📅 J'ai oublié de déclarer une absence
                </button>

                {/* Modal formulaire absence */}
                {showAbsenceForm && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '20px'
                    }}>
                        <div style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '380px',
                            width: '100%',
                            maxHeight: '90vh',
                            overflow: 'auto'
                        }}>
                            <h3 style={{
                                fontSize: '18px',
                                fontWeight: 'bold',
                                color: '#1f2937',
                                margin: '0 0 20px 0',
                                textAlign: 'center'
                            }}>
                                Déclarer une absence
                            </h3>

                            {/* Date */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Date
                                </label>
                                <input
                                    type="date"
                                    value={absenceForm.date}
                                    onChange={(e) => setAbsenceForm(prev => ({ ...prev, date: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            {/* Créneau */}
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Créneau
                                </label>
                                <select
                                    value={absenceForm.creneau}
                                    onChange={(e) => setAbsenceForm(prev => ({ ...prev, creneau: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="matin">Matin</option>
                                    <option value="apres_midi">Après-midi</option>
                                </select>
                            </div>

                            {/* Lieu */}
                            <div style={{ marginBottom: '24px' }}>
                                <label style={{
                                    display: 'block',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    color: '#374151',
                                    marginBottom: '6px'
                                }}>
                                    Lieu
                                </label>
                                <select
                                    value={absenceForm.lieu}
                                    onChange={(e) => setAbsenceForm(prev => ({ ...prev, lieu: e.target.value }))}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        border: '2px solid #e5e7eb',
                                        borderRadius: '8px',
                                        fontSize: '16px',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <option value="">Choisir un lieu</option>
                                    {lieux.map(lieu => (
                                        <option key={lieu.id} value={lieu.initiale}>
                                            {lieu.nom} ({lieu.initiale})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Boutons */}
                            <div style={{
                                display: 'flex',
                                gap: '12px'
                            }}>
                                <button
                                    onClick={() => {
                                        setShowAbsenceForm(false)
                                        setAbsenceForm({ date: '', creneau: 'matin', lieu: '' })
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={declarerAbsence}
                                    disabled={isSaving || !absenceForm.date || !absenceForm.lieu}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: isSaving || !absenceForm.date || !absenceForm.lieu
                                            ? '#9ca3af'
                                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: isSaving || !absenceForm.date || !absenceForm.lieu
                                            ? 'not-allowed'
                                            : 'pointer'
                                    }}
                                >
                                    {isSaving ? 'Enregistrement...' : 'Valider'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bouton retour */}
                <button
                    onClick={() => router.push('/formateur')}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: '#6b7280',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'transform 0.2s'
                    }}
                >
                    Retour à l'accueil
                </button>
            </div>
        </div>
    )
}
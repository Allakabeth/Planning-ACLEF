import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../lib/supabaseClient'
import { useFormateurAuth } from '../../contexts/FormateurAuthContext'

export default function MonPlanningHebdo() {
    const { user, isLoading: authLoading, isAuthenticated } = useFormateurAuth()
    const [planningType, setPlanningType] = useState([])
    const [absencesValidees, setAbsencesValidees] = useState([])
    const [planningCoordo, setPlanningCoordo] = useState([])
    const [planningFinal, setPlanningFinal] = useState([])
    const [lieux, setLieux] = useState([])
    const [fermetures, setFermetures] = useState([])
    const [currentWeek, setCurrentWeek] = useState(new Date())
    const [isLoading, setIsLoading] = useState(true)
    const [message, setMessage] = useState('')
    const router = useRouter()

    // ★★★ NOUVEAUX ÉTATS POUR ÉCOUTE ROI AMÉLIORÉE - ÉTAPE 4.1 ★★★
    const [derniereCommande, setDerniereCommande] = useState(null)
    const [commandesTraitees, setCommandesTraitees] = useState(new Set())
    const [statsEcoute, setStatsEcoute] = useState({
        commandesRecues: 0,
        refreshEffectues: 0,
        derniereActivite: null
    })

    const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']
    const creneaux = ['Matin', 'AM']

    // Protection authentification
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/formateur/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (user) {
            loadPlanningData()
        }
    }, [user, currentWeek])

    // ★★★ FONCTION ROI AMÉLIORÉE - ÉCOUTE ACTIVE SPÉCIALISÉE FORMATEUR ★★★
    const ecouterCommandesRoi = () => {
        const interval = setInterval(() => {
            const commande = localStorage.getItem('roiCommande');
            if (commande) {
                try {
                    const parsed = JSON.parse(commande);
                    
                    // Vérifier si c'est une nouvelle commande ET si elle concerne ce formateur
                    if (!commandesTraitees.has(parsed.timestamp)) {
                        if (parsed.formateur_id === user?.id || parsed.action === 'refresh_complet') {
                            console.log('📱 SUJET reçoit ordre du ROI:', parsed);
                            
                            setDerniereCommande(parsed);
                            setCommandesTraitees(prev => new Set([...prev, parsed.timestamp]));
                            
                            // Traiter immédiatement l'ordre ROI
                            executerOrdreRoiFormateur(parsed);
                            
                            // Mettre à jour stats écoute
                            setStatsEcoute(prev => ({
                                ...prev,
                                commandesRecues: prev.commandesRecues + 1,
                                derniereActivite: new Date().toLocaleTimeString()
                            }));
                        }
                    }
                } catch (error) {
                    console.error('❌ Erreur parsing commande ROI formateur:', error);
                }
            }
        }, 500); // Check plus fréquent pour réactivité

        return interval;
    };

    // ★★★ FONCTION ROI PRINCIPALE - EXÉCUTION ORDRES FORMATEUR ★★★
    const executerOrdreRoiFormateur = async (commande) => {
        try {
            console.log(`📱 SUJET exécute ordre ROI: ${commande.action}`);
            
            switch (commande.action) {
                case 'retirer_formateur':
                    await traiterRetirerFormateurFormateur(commande);
                    break;
                    
                case 'ajouter_formateur':
                    await traiterAjouterFormateurFormateur(commande);
                    break;
                    
                case 'remettre_disponible':
                    await traiterRemettreDisponibleFormateur(commande);
                    break;
                    
                case 'changer_statut':
                    await traiterChangerStatutFormateur(commande);
                    break;
                    
                case 'refresh_complet':
                    await traiterRefreshCompletFormateur(commande);
                    break;
                    
                default:
                    console.log(`⚠️ Ordre ROI formateur non reconnu: ${commande.action}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur exécution ordre ROI formateur:', error);
        }
    };

    // ★★★ TRAITEMENTS SPÉCIFIQUES DES ORDRES ROI FORMATEUR ★★★
    
    const traiterRetirerFormateurFormateur = async (commande) => {
        console.log(`🚫 SUJET traite retrait: ${commande.date}`);
        
        const transformationType = commande.details?.transformation || 'retrait_standard';
        
        setMessage(`📱 Vous êtes retiré le ${commande.date}
🔄 Votre planning passe en ABSENT...`);
        
        // Refresh immédiat
        await rechargerDonneesFormateur();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterAjouterFormateurFormateur = async (commande) => {
        console.log(`✅ SUJET traite ajout: ${commande.date}`);
        
        const isDispoExcept = commande.details?.transformation?.includes('dispo_except');
        
        setMessage(`📱 Vous êtes ${
            isDispoExcept ? 'DISPONIBLE EXCEPTIONNELLEMENT' : 'AJOUTÉ'
        } le ${commande.date}
🔄 Votre planning se met à jour...`);
        
        // Refresh immédiat
        await rechargerDonneesFormateur();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterRemettreDisponibleFormateur = async (commande) => {
        console.log(`🔄 SUJET traite remise disponible: ${commande.date}`);
        
        setMessage(`📱 Vous redevenez disponible le ${commande.date}
🔄 Retour à votre planning type habituel...`);
        
        // Refresh immédiat
        await rechargerDonneesFormateur();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterChangerStatutFormateur = async (commande) => {
        console.log(`🔄 SUJET traite changement statut: ${commande.date}`);
        
        const transformation = commande.details?.transformation || 'changement_type';
        
        setMessage(`📱 Changement de statut (${transformation})
🔄 Mise à jour de votre planning...`);
        
        // Refresh immédiat
        await rechargerDonneesFormateur();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterRefreshCompletFormateur = async (commande) => {
        console.log('🔄 SUJET effectue refresh complet sur ordre ROI');
        
        setMessage(`📱 Refresh complet de votre planning
🔄 Rechargement total en cours...`);
        
        // Refresh complet
        await rechargerToutesDonneesFormateur();
        
        setTimeout(() => setMessage(''), 4000);
    };

    // ★★★ FONCTIONS DE RECHARGEMENT OPTIMISÉES FORMATEUR ★★★
    
    const rechargerDonneesFormateur = async () => {
        try {
            console.log('🔄 Rechargement données formateur...');
            
            // Recharger absences validées
            const weekDates = getWeekDates(currentWeek)
            const startDate = weekDates[0].toISOString().split('T')[0]
            const endDate = weekDates[4].toISOString().split('T')[0]

            const { data: absencesData, error } = await supabase
                .from('absences_formateurs')
                .select(`
                    id,
                    date_debut,
                    date_fin,
                    type,
                    statut,
                    motif,
                    creneau,
                    created_at
                `)
                .eq('formateur_id', user.id)
                .eq('statut', 'validé')
                .gte('date_debut', startDate)
                .lte('date_fin', endDate)

            if (error) throw error;
                
            if (absencesData) {
                console.log(`✅ ${absencesData.length} absences formateur rechargées`);
                setAbsencesValidees(absencesData);
                
                // Reconstruire planning final
                await reconstruirePlanningFinal();
                
                // Mettre à jour stats
                setStatsEcoute(prev => ({
                    ...prev,
                    refreshEffectues: prev.refreshEffectues + 1
                }));
            }
            
        } catch (error) {
            console.error('❌ Erreur rechargement données formateur:', error);
        }
    };

    const rechargerToutesDonneesFormateur = async () => {
        try {
            console.log('🔄 Rechargement complet données formateur...');
            
            // Recharger toutes les données
            await loadPlanningData();
            
            console.log('✅ Rechargement complet formateur terminé');
            
            // Mettre à jour stats
            setStatsEcoute(prev => ({
                ...prev,
                refreshEffectues: prev.refreshEffectues + 1
            }));
            
        } catch (error) {
            console.error('❌ Erreur rechargement complet formateur:', error);
        }
    };

    const reconstruirePlanningFinal = async () => {
        try {
            // Reconstruire le planning final avec les nouvelles données
            const weekDates = getWeekDates(currentWeek)
            const planningArbitre = construirePlanningArbitre(
                planningType, 
                absencesValidees, 
                planningCoordo, 
                weekDates
            )
            
            setPlanningFinal(planningArbitre)
            console.log('⚖️ Planning final reconstruit après ordre ROI:', planningArbitre.length, 'créneaux')
            
        } catch (error) {
            console.error('❌ Erreur reconstruction planning final:', error);
        }
    };

    // ★★★ EFFET POUR DÉMARRER L'ÉCOUTE ROI AMÉLIORÉE ★★★
    useEffect(() => {
        if (user) {
            console.log('🎧 SUJET démarre écoute active des ordres du ROI...');
            const interval = ecouterCommandesRoi();
            
            return () => {
                console.log('🔇 SUJET arrête écoute des ordres ROI');
                clearInterval(interval);
            };
        }
    }, [user]); // Pas de dépendances pour écoute continue


    const loadPlanningData = async () => {
        if (!user) return
        
        try {
            setIsLoading(true)
            console.log('📝 Chargement planning hebdomadaire avec arbitrage pour:', user.prenom, user.nom)

            // Charger les lieux
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false)

            if (lieuxError) throw lieuxError
            setLieux(lieuxData || [])

            // 1. NIVEAU BASE : Charger SEULEMENT le planning type NORMAL validé
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
                .eq('formateur_id', user.id)
                .eq('valide', true)
                .eq('statut', 'disponible')  // Filtre SEULEMENT les dispo normales

            if (planningTypeError) throw planningTypeError
            setPlanningType(planningTypeData || [])
            console.log('📋 Planning type NORMAL chargé:', planningTypeData?.length || 0, 'créneaux')

            // 2. NIVEAU MOYEN : Charger les absences/modifications validées pour cette semaine
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
                    creneau,
                    created_at
                `)
                .eq('formateur_id', user.id)
                .eq('statut', 'validé')
                .gte('date_debut', startDate)
                .lte('date_fin', endDate)

            if (absencesError) throw absencesError
            setAbsencesValidees(absencesData || [])
            console.log('🚫 Absences validées chargées:', absencesData?.length || 0)
            if (absencesData && absencesData.length > 0) {
                console.log('📋 Détail absences:', absencesData)
            }

            // 🔧 CORRECTION CRITIQUE : Charger le planning coordo avec MEILLEURE LOGIQUE
            console.log('🔧 NOUVELLE LOGIQUE - Chargement planning coordo pour formateur:', user.id)
            
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
            
            // 🔧 FILTRAGE CÔTÉ CLIENT pour ce formateur spécifique
            const planningCoordoFormateur = (planningCoordoData || []).filter(pc => {
                const estAffecte = pc.formateurs_ids && pc.formateurs_ids.includes(user.id)
                console.log('🔧 Planning coordo:', pc.jour, pc.creneau, 'formateurs:', pc.formateurs_ids, 'affecté?', estAffecte)
                return estAffecte
            })

            setPlanningCoordo(planningCoordoFormateur)
            console.log('👨‍💼 Planning coordo chargé:', planningCoordoFormateur?.length || 0, 'affectations')

            // Charger les fermetures de la structure
            const { data: fermeturesData, error: fermeturesError } = await supabase
                .from('jours_fermeture')
                .select('*')
                .lte('date_debut', endDate)
                .or(`date_fin.gte.${startDate},date_fin.is.null`)

            if (!fermeturesError) {
                setFermetures(fermeturesData || [])
                console.log('🏢 Fermetures chargées:', fermeturesData?.length || 0)
            }

            // 4. ARBITRAGE : Construire le planning final avec priorités
            const planningArbitre = construirePlanningArbitre(
                planningTypeData || [],
                absencesData || [],
                planningCoordoFormateur || [],
                weekDates,
                fermeturesData || []
            )
            
            setPlanningFinal(planningArbitre)
            console.log('⚖️ Planning final après arbitrage:', planningArbitre.length, 'créneaux')

        } catch (error) {
            console.error('Erreur chargement planning:', error)
            setMessage('Erreur lors du chargement de votre planning')
        } finally {
            setIsLoading(false)
        }
    }

    // Vérifier si une date/créneau est concerné par une fermeture
    const getInfoFermetureHebdo = (dateStr, creneauDB, fermeturesList) => {
        return fermeturesList.find(f => {
            const debut = f.date_debut
            const fin = f.date_fin || f.date_debut
            if (dateStr < debut || dateStr > fin) return false
            if (f.creneau && f.creneau !== creneauDB) return false
            return true
        })
    }

    // 🎯 FONCTION D'ARBITRAGE CORRIGÉE - LOGIQUE ROI PRIORITÉ ABSOLUE
    const construirePlanningArbitre = (planningType, absences, planningCoordo, weekDates, fermeturesList) => {
        const planningFinal = []

        console.log('🎯 DÉBUT ARBITRAGE - LOGIQUE ROI 4 ÉTATS DISTINCTS')
        console.log('🔧 Données planning coordo disponibles:', planningCoordo)

        for (const jour of jours) {
            for (const creneau of creneaux) {
                console.log(`\n🔍 Arbitrage ${jour} ${creneau}:`)

                // Vérifier d'abord les absences validées pour ce jour
                const dateJour = weekDates[jours.indexOf(jour)]
                const dateString = dateJour.toISOString().split('T')[0]

                console.log(`📅 Date recherchée: ${dateString}`)

                // 🏢 ÉTAT 0 - FERMETURE (priorité maximale)
                const creneauDB = creneau === 'Matin' ? 'M' : 'AM'
                const infoFermeture = getInfoFermetureHebdo(dateString, creneauDB, fermeturesList || [])
                if (infoFermeture) {
                    console.log(`🏢 ÉTAT 0 - FERMÉ: ${infoFermeture.motif} (${infoFermeture.description || ''})`)
                    planningFinal.push({
                        jour,
                        creneau,
                        lieu_id: null,
                        statut: 'fermeture',
                        source: 'jours_fermeture',
                        priorite: 0,
                        motif_fermeture: infoFermeture.motif,
                        description_fermeture: infoFermeture.description
                    })
                    continue
                }

                // ✅ NOUVEAU: Vérifier absence avec support des créneaux M/AM
                const absenceJour = absences.find(abs => {
                    const debut = new Date(abs.date_debut)
                    const fin = new Date(abs.date_fin)
                    const current = new Date(dateString)

                    // Vérifier si la date correspond
                    const dateMatch = current >= debut && current <= fin
                    if (!dateMatch) return false

                    console.log(`🔧 Vérification absence: ${abs.date_debut} - ${abs.date_fin} (type: ${abs.type}, créneau: ${abs.creneau || 'journée'})`)

                    // ✅ Si absence a un créneau spécifique, vérifier correspondance
                    if (abs.creneau) {
                        const creneauDB = creneau === 'Matin' ? 'M' : 'AM'
                        const creneauMatch = abs.creneau === creneauDB
                        console.log(`🕐 Créneau absence: ${abs.creneau}, créneau actuel: ${creneauDB}, match: ${creneauMatch}`)
                        return creneauMatch
                    }

                    // ✅ Si absence sans créneau (journée entière), toujours vrai
                    console.log(`📅 Absence journée entière (pas de créneau spécifique)`)
                    return true
                })

                if (absenceJour) {
                    console.log(`✅ Absence trouvée pour ${jour} ${creneau}:`, absenceJour.type, absenceJour.creneau || '(journée)')
                }

                // ★★★ LOGIQUE ROI - PRIORITÉ DISPO EXCEPTIONNELLE ABSOLUE ★★★
                if (absenceJour && absenceJour.type === 'formation') {
                    console.log(`🟡 ÉTAT 1 - DISPO EXCEPTIONNELLE (ROI A VALIDÉ): priorité absolue !`)
                    planningFinal.push({
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

                // 🎯 PRIORITÉ 3 : Planning coordo (SEULEMENT si pas d'absence)
                // 🔧 CORRECTION CRITIQUE : Amélioration de la détection
                const affectationCoordo = planningCoordo.find(pc => {
                    const jourMatch = pc.jour === jour
                    const creneauDB = creneau === 'Matin' ? 'matin' : 'AM'
                    const creneauMatch = pc.creneau === creneauDB
                    
                    console.log(`🔧 Vérification planning coordo: ${pc.jour}==${jour}? ${jourMatch}, ${pc.creneau}==${creneauDB}? ${creneauMatch}`)
                    
                    return jourMatch && creneauMatch
                })

                if (affectationCoordo) {
                    console.log(`🟦 ÉTAT 3 - AFFECTÉ PAR COORDO (JE VIENS):`, affectationCoordo.lieu_id)
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

                // 🎯 PRIORITÉ 4 : Planning type NORMAL → DISPONIBLE MAIS PAS CHOISI
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
                // ✅ Ne rien ajouter = case vide normale
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

    // 🎯 FONCTION LABELS SELON LOGIQUE ROI
    const getStatutLabel = (creneau) => {
        switch (creneau.statut) {
            case 'fermeture':
                const labels = { ferie: 'FÉRIÉ', conges: 'CONGÉS', fermeture: 'FERMÉ', formation_formateur: 'FORMATION', autre: 'FERMÉ' }
                return labels[creneau.motif_fermeture] || 'FERMÉ'
            case 'dispo_except':
                return 'EXCEPT'
            case 'affecte_coordo':
                return 'JE VIENS'
            case 'absent':
                return 'ABSENT'
            case 'disponible_non_choisi':
                return 'EN ATTENTE'
            default:
                return 'NORMAL'
        }
    }

    // 🎯 FONCTION COULEURS SELON LOGIQUE ROI
    const getStatutColor = (creneau) => {
        switch (creneau.statut) {
            case 'fermeture':
                const bgColors = { ferie: '#fef2f2', conges: '#fefce8', fermeture: '#f1f5f9', formation_formateur: '#f5f3ff', autre: '#f1f5f9' }
                return bgColors[creneau.motif_fermeture] || '#f1f5f9'
            case 'dispo_except':
                return '#fbbf24' // JAUNE pour dispo exceptionnelle ROI
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

    // 🎯 FONCTION BORDURE SELON LOGIQUE ROI
    const getBorderColor = (creneau) => {
        switch (creneau.statut) {
            case 'fermeture':
                const borderColors = { ferie: '#dc2626', conges: '#ca8a04', fermeture: '#475569', formation_formateur: '#7c3aed', autre: '#475569' }
                return borderColors[creneau.motif_fermeture] || '#475569'
            case 'dispo_except':
                return '#fbbf24' // Jaune pour ROI
            case 'affecte_coordo':
                return getLieuCouleur(creneau.lieu_id) // Couleur du lieu
            case 'absent':
                return '#ef4444' // Rouge
            case 'disponible_non_choisi':
                return '#3b82f6' // BORDURE BLEUE = En attente
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
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginBottom: '6px' }}>
                        <h1 style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            margin: 0,
                            color: '#1f2937'
                        }}>
                            Planning hebdo
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
                    marginBottom: '14px',
                    padding: '10px 18px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '12px'
                }}>
                    <button
                        onClick={previousWeek}
                        style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                        }}
                    >
                        ←
                    </button>
                    
                    <button
                        onClick={goToCurrentWeek}
                        style={{
                            padding: '8px 14px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                        }}
                    >
                        Aujourd'hui
                    </button>
                    
                    <button
                        onClick={nextWeek}
                        style={{
                            width: '36px',
                            height: '36px',
                            backgroundColor: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
                        }}
                    >
                        →
                    </button>
                </div>

                {/* Messages */}
                {message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '16px',
                        backgroundColor: message.includes('📱') ? '#dbeafe' : '#fee2e2',
                        color: message.includes('📱') ? '#1e40af' : '#991b1b',
                        fontSize: '14px',
                        textAlign: 'center',
                        whiteSpace: 'pre-line'
                    }}>
                        {message}
                    </div>
                )}

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
                            Vous n'avez pas encore déclaré votre planning type ou il n'a pas été validé.
                        </p>
                    </div>
                ) : (
                    // Planning disponible - Affichage grille
                    <>
                        {/* Grille planning */}
                        <div style={{
                            backgroundColor: '#f9fafb',
                            borderRadius: '12px',
                            padding: '10px',
                            marginBottom: '14px'
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
                                                                (creneauInfo.statut === 'fermeture' ? (getBorderColor(creneauInfo)) :
                                                                 creneauInfo.statut === 'disponible_non_choisi' ? '#374151' :
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
                                                                creneauInfo.statut === 'fermeture' ? (
                                                                    <div style={{
                                                                        fontSize: '8px',
                                                                        fontWeight: 'bold',
                                                                        textAlign: 'center',
                                                                        lineHeight: '1.2'
                                                                    }}>
                                                                        {({ferie: '🎌', conges: '🏖️', fermeture: '🚫', formation_formateur: '📚', autre: '⚠️'})[creneauInfo.motif_fermeture] || '🚫'}
                                                                        <div style={{fontSize: '7px', marginTop: '2px'}}>{getStatutLabel(creneauInfo)}</div>
                                                                    </div>
                                                                ) : creneauInfo.statut === 'absent' ? (
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
                                                                        EXCEP
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

                        {/* ★★★ NOUVELLE LÉGENDE ROI - ÉTAPE 4.1 ★★★ */}
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
                                Légende des statuts
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#fbbf24',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#92400e',
                                        fontSize: '8px',
                                        fontWeight: 'bold'
                                    }}>
                                        E
                                    </div>
                                    <span style={{ color: '#374151' }}>JAUNE = Dispo exceptionnelle → Validée par admin</span>
                                </div>
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
                                    <span style={{ color: '#374151' }}>BLEU = Affecté par coordinateur → Je viens</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#ef4444',
                                        borderRadius: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontSize: '8px',
                                        fontWeight: 'bold'
                                    }}>
                                        ✗
                                    </div>
                                    <span style={{ color: '#374151' }}>ROUGE = Absent → Je ne peux pas venir</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#ffffff',
                                        borderRadius: '4px',
                                        border: '2px solid #3b82f6',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#3b82f6',
                                        fontSize: '6px',
                                        fontWeight: 'bold'
                                    }}>
                                        D
                                    </div>
                                    <span style={{ color: '#374151' }}>BORDURE BLEUE = Disponible mais pas choisi → En attente</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                                    <div style={{
                                        width: '16px',
                                        height: '16px',
                                        backgroundColor: '#f1f5f9',
                                        borderRadius: '4px',
                                        border: '2px solid #475569',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '8px'
                                    }}>
                                        🚫
                                    </div>
                                    <span style={{ color: '#374151' }}>GRIS = Structure fermée (férié, congés, formation...)</span>
                                </div>
                            </div>
                        </div>

                        {/* Détails des interventions */}
                        <div style={{
                            backgroundColor: '#f8fafc',
                            padding: '10px',
                            borderRadius: '12px',
                            marginBottom: '14px'
                        }}>
                            <h4 style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#374151',
                                margin: '0 0 8px 0'
                            }}>
                                Votre planning cette semaine
                            </h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {planningFinal.map((creneau, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '12px',
                                        backgroundColor: creneau.statut === 'fermeture' ? '#f1f5f9' :
                                                         creneau.statut === 'dispo_except' ? '#fffbeb' :
                                                         creneau.statut === 'affecte_coordo' ? '#eff6ff' :
                                                         creneau.statut === 'absent' ? '#fef2f2' :
                                                         creneau.statut === 'disponible_non_choisi' ? '#f0f9ff' : '#eff6ff',
                                        borderRadius: '8px',
                                        border: `2px solid ${getBorderColor(creneau)}`,
                                        fontSize: '13px'
                                    }}>
                                        <div style={{ 
                                            fontWeight: '600', 
                                            color: creneau.statut === 'fermeture' ? '#475569' :
                                                   creneau.statut === 'dispo_except' ? '#92400e' :
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
                                                {creneau.statut === 'fermeture' ? (creneau.description_fermeture || '') : getLieuNom(creneau.lieu_id)}
                                            </span>
                                            <span style={{
                                                fontSize: '10px',
                                                fontWeight: '600',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                backgroundColor: getStatutColor(creneau),
                                                color: creneau.statut === 'fermeture' ? getBorderColor(creneau) :
                                                       creneau.statut === 'disponible_non_choisi' ? '#3b82f6' :
                                                       creneau.statut === 'dispo_except' ? '#92400e' : 'white',
                                                border: creneau.statut === 'disponible_non_choisi' ? '1px solid #3b82f6' :
                                                        creneau.statut === 'fermeture' ? `1px solid ${getBorderColor(creneau)}` : 'none'
                                            }}>
                                                {getStatutLabel(creneau)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Boutons d'action */}
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
        </div>
    )
}
import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionApprenants({ user, logout, inactivityTime, priority }) {
    const router = useRouter()

    // 🎯 MODE ÉDITION : Seulement le premier admin (vert) peut modifier
    const canEdit = priority === 1;

    // États
    const [apprenants, setApprenants] = useState([])
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
    const [filtreStatut, setFiltreStatut] = useState('en_cours')
    const [filtreDispositif, setFiltreDispositif] = useState('tous')
    const [filtreLieu, setFiltreLieu] = useState('tous')
    const [filtreRecherche, setFiltreRecherche] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    
    // États pour gestion des lieux
    const [lieux, setLieux] = useState([])
    
    // États formulaire ajout
    const [showAjouterForm, setShowAjouterForm] = useState(false)
    const [prenom, setPrenom] = useState('')
    const [nom, setNom] = useState('')
    const [dispositif, setDispositif] = useState('HSP')
    
    // Nouveaux états pour les champs étendus
    const [dateEntreeFormation, setDateEntreeFormation] = useState('')
    const [dateSortiePrevisionnelle, setDateSortiePrevisionnelle] = useState('')
    const [lieuFormationId, setLieuFormationId] = useState('')
    const [statutFormation, setStatutFormation] = useState('en_cours')
    
    // États pour l'authentification de l'apprenant
    const [identifiantGenere, setIdentifiantGenere] = useState('')
    const [showCredentialsInfo, setShowCredentialsInfo] = useState(false)
    
    // États module suspensions
    const [showSuspensionForm, setShowSuspensionForm] = useState(false)
    const [apprenantSuspension, setApprenantSuspension] = useState(null)
    const [dateSuspension, setDateSuspension] = useState('')
    const [motifSuspension, setMotifSuspension] = useState('')
    const [dateReprisePrevue, setDateReprisePrevue] = useState('')
    
    // États formulaire modification
    const [apprenantEnModification, setApprenantEnModification] = useState(null)
    const [showModifierForm, setShowModifierForm] = useState(false)
    
    // États pour confirmation
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [actionEnCours, setActionEnCours] = useState(null)

    // État pour le modal questionnaire satisfaction post-sortie
    const [showQuestionSatisfaction, setShowQuestionSatisfaction] = useState(false)
    const [apprenantSorti, setApprenantSorti] = useState(null)

    // États pour confirmation doublon
    const [showConfirmationDoublon, setShowConfirmationDoublon] = useState(false)
    const [doublonDetecte, setDoublonDetecte] = useState(null)

    // États pour gestion des parcours
    const [showParcoursModal, setShowParcoursModal] = useState(false)
    const [apprenantParcours, setApprenantParcours] = useState(null)
    const [parcoursApprenant, setParcoursApprenant] = useState([])
    const [loadingParcours, setLoadingParcours] = useState(false)
    const [showNouveauParcours, setShowNouveauParcours] = useState(false)
    const [nouveauParcours, setNouveauParcours] = useState({
        date_entree: '',
        date_sortie_previsionnelle: '',
        dispositif: 'HSP',
        lieu_formation_id: ''
    })

    // Archivage automatique au montage (une seule fois)
    useEffect(() => {
        archivageAutoApprenants()
    }, [])

    useEffect(() => {
        fetchApprenants()
        fetchLieux()
    }, [filtreStatut, filtreDispositif, filtreLieu, filtreRecherche])

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        fetchConnectedAdmins();

        const channel = supabase
            .channel('admin_sessions_changes_gestion_apprenants')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_sessions'
                },
                () => {
                    fetchConnectedAdmins();
                }
            )
            .subscribe();

        const refreshInterval = setInterval(() => {
            fetchConnectedAdmins();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, [user]);

    // 🔄 Recharger les données quand la priorité change
    useEffect(() => {
        console.log('🔄 Priorité changée, rechargement apprenants...');
        fetchApprenants();
    }, [priority]);

    // 👂 Écoute en temps réel des modifications des apprenants
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('users_apprenants_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'users',
                filter: `role=eq.apprenant`
            }, (payload) => {
                console.log('🔄 Modification users (apprenants) détectée, refresh...');
                fetchApprenants();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, filtreStatut]);
    
    // Fonction pour récupérer les lieux
    const fetchLieux = async () => {
        try {
            const { data, error } = await supabase
                .from('lieux')
                .select('id, nom, couleur')
                .eq('archive', false)
                .order('nom')

            if (error) throw error
            setLieux(data || [])
        } catch (error) {
            console.error('Erreur lors du chargement des lieux:', error)
        }
    }

    // Archivage automatique : apprenants sortis depuis plus de 7 mois
    const archivageAutoApprenants = async () => {
        try {
            const dateLimite = new Date()
            dateLimite.setMonth(dateLimite.getMonth() - 7)
            const dateLimiteStr = dateLimite.toISOString().split('T')[0]

            const { data, error } = await supabase
                .from('users')
                .update({ archive: true })
                .eq('role', 'apprenant')
                .eq('archive', false)
                .not('date_fin_formation_reelle', 'is', null)
                .lt('date_fin_formation_reelle', dateLimiteStr)
                .select('id, prenom, nom, date_fin_formation_reelle')

            if (error) {
                console.error('❌ Erreur archivage auto:', error)
                return
            }
            if (data && data.length > 0) {
                console.log(`📦 Archivage auto : ${data.length} apprenant(s) archivé(s) (sortie > 7 mois)`, data.map(a => `${a.prenom} ${a.nom}`))
            }
        } catch (err) {
            console.error('❌ Erreur archivage auto:', err)
        }
    }

    // Fonction pour récupérer les apprenants (avec vue enrichie)
    const fetchApprenants = async () => {
        try {
            // Utiliser directement la table users pour éviter les problèmes
            const { data, error } = await supabase
                .from('users')
                .select(`
                    *,
                    lieu_formation:lieu_formation_id(id, nom, couleur)
                `)
                .eq('role', 'apprenant')
                .order('nom')

            if (error) throw error

            let apprenantsFiltres = data || []

            // Récupérer les stats de parcours pour tous les apprenants
            const { data: parcoursList, error: parcoursError } = await supabase
                .from('parcours_apprenants')
                .select('apprenant_id, numero_parcours, actif')

            // Créer un map des stats parcours par apprenant
            const parcoursStats = {}
            if (!parcoursError && parcoursList) {
                parcoursList.forEach(p => {
                    if (!parcoursStats[p.apprenant_id]) {
                        parcoursStats[p.apprenant_id] = { total: 0, actif: 0 }
                    }
                    parcoursStats[p.apprenant_id].total = Math.max(parcoursStats[p.apprenant_id].total, p.numero_parcours)
                    if (p.actif) {
                        parcoursStats[p.apprenant_id].actif = p.numero_parcours
                    }
                })
            }

            // Ajouter les infos calculées
            apprenantsFiltres = apprenantsFiltres.map(apprenant => ({
                ...apprenant,
                lieu_formation_nom: apprenant.lieu_formation?.nom || null,
                lieu_couleur: apprenant.lieu_formation?.couleur || '#ffffff',
                statut_display: getStatutDisplay(apprenant.statut_formation || 'en_cours'),
                parcours_actif: parcoursStats[apprenant.id]?.actif || 1,
                parcours_total: parcoursStats[apprenant.id]?.total || 1
            }))
            
            // Filtre par statut
            if (filtreStatut === 'en_cours') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.archive !== true && (a.statut_formation === 'en_cours' || !a.statut_formation))
            } else if (filtreStatut === 'termine') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.archive !== true && a.statut_formation === 'termine')
            } else if (filtreStatut === 'suspendu') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.archive !== true && a.statut_formation === 'suspendu')
            } else if (filtreStatut === 'archive') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.archive === true)
            }
            
            // Filtre par dispositif
            if (filtreDispositif === 'HSP') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.dispositif === 'HSP')
            } else if (filtreDispositif === 'OPCO') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.dispositif === 'OPCO')
            } else if (filtreDispositif === 'CDV') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.dispositif === 'CDV')
            } else if (filtreDispositif === 'PM') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.dispositif === 'PM')
            }
            
            // Filtre par lieu
            if (filtreLieu !== 'tous') {
                apprenantsFiltres = apprenantsFiltres.filter(a => a.lieu_formation_id === filtreLieu)
            }

            // Filtre par recherche nom/prénom
            if (filtreRecherche.trim()) {
                const recherche = filtreRecherche.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                apprenantsFiltres = apprenantsFiltres.filter(a => {
                    const prenom = (a.prenom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    const nom = (a.nom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    return prenom.includes(recherche) || nom.includes(recherche)
                })
            }

            setApprenants(apprenantsFiltres)
        } catch (error) {
            setMessage('Erreur lors du chargement des apprenants')
            console.error(error)
        }
    }

    // Fonction pour récupérer la liste des admins connectés
    const fetchConnectedAdmins = async () => {
        try {
            const { data: sessions, error: sessionsError } = await supabase
                .from('admin_sessions')
                .select('admin_user_id, admin_email, current_page, page_priority, heartbeat')
                .eq('is_active', true)
                .order('heartbeat', { ascending: false});

            if (sessionsError) {
                console.error('❌ Erreur récupération sessions:', sessionsError);
                return;
            }

            if (!sessions || sessions.length === 0) {
                setConnectedAdmins([]);
                return;
            }

            const adminsFormatted = sessions
                .filter(session => session.admin_email)
                .map(session => ({
                    email: session.admin_email,
                    name: session.admin_email.split('@')[0].charAt(0).toUpperCase() + session.admin_email.split('@')[0].slice(1),
                    currentPage: session.current_page,
                    priority: session.page_priority,
                    lastActive: session.heartbeat
                }));

            setConnectedAdmins(adminsFormatted);
        } catch (error) {
            console.error('❌ Erreur fetchConnectedAdmins:', error);
        }
    };

    // Fonction utilitaire pour afficher le statut
    const getStatutDisplay = (statut) => {
        switch (statut) {
            case 'en_cours': return 'En cours'
            case 'termine': return 'Terminé'
            case 'abandonne': return 'Abandonné'
            case 'suspendu': return 'Suspendu'
            default: return 'En cours'
        }
    }

    // Fonction pour valider les dates
    const validerDates = (dateEntree, dateSortie) => {
        if (!dateEntree || !dateSortie) return true // Optionnel
        return new Date(dateEntree) <= new Date(dateSortie)
    }

    // Fonction pour réinitialiser le formulaire
    const resetFormulaire = () => {
        setPrenom('')
        setNom('')
        setDispositif('HSP')
        setDateEntreeFormation('')
        setDateSortiePrevisionnelle('')
        setLieuFormationId('')
        setStatutFormation('en_cours')
        setIdentifiantGenere('')
        setShowCredentialsInfo(false)
    }
    
    // Fonction pour normaliser le texte (enlever accents, caractères spéciaux)
    const normalizeText = (text) => {
        return text
            .toLowerCase()
            .trim()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '')
    }
    
    // Fonction pour générer un identifiant unique
    const genererIdentifiantUnique = async (prenomBase) => {
        try {
            const prenomNormalized = normalizeText(prenomBase)

            // Chercher tous les identifiants similaires
            const { data: existants, error } = await supabase
                .from('users')
                .select('identifiant')
                .ilike('identifiant', `${prenomNormalized}%`)
                .eq('role', 'apprenant')

            if (error) throw error

            // Si aucun doublon, utiliser le prénom simple
            if (!existants || existants.length === 0) {
                return {
                    identifiant: prenomBase,
                    message: null
                }
            }

            // Trouver le prochain numéro disponible
            const identifiants = existants.map(e => e.identifiant?.toLowerCase())

            if (!identifiants.includes(prenomNormalized)) {
                return {
                    identifiant: prenomBase,
                    message: null
                }
            }

            // Générer avec numéro
            let numero = 2
            while (identifiants.includes(`${prenomNormalized}${numero.toString().padStart(2, '0')}`) ||
                   identifiants.includes(`${prenomNormalized}${numero}`)) {
                numero++
            }

            const nouvelIdentifiant = `${prenomBase}${numero.toString().padStart(2, '0')}`

            return {
                identifiant: nouvelIdentifiant,
                message: `⚠️ L'identifiant '${prenomBase}' est déjà utilisé. L'identifiant attribué est : ${nouvelIdentifiant}`
            }

        } catch (error) {
            console.error('Erreur génération identifiant:', error)
            return {
                identifiant: prenomBase,
                message: null
            }
        }
    }

    // Fonction pour vérifier si un apprenant existe déjà avec le même prénom/nom
    const verifierDoublonApprenant = async (prenom, nom) => {
        try {
            const prenomNormalized = normalizeText(prenom.trim())
            const nomNormalized = normalizeText(nom.trim())

            // Récupérer tous les apprenants (actifs ET archivés)
            const { data: existants, error } = await supabase
                .from('users')
                .select('id, prenom, nom, archive')
                .eq('role', 'apprenant')

            if (error) throw error

            // Vérifier si un apprenant avec le même prénom/nom normalisé existe
            const doublon = existants?.find(a => {
                const prenomExistant = normalizeText(a.prenom || '')
                const nomExistant = normalizeText(a.nom || '')
                return prenomExistant === prenomNormalized && nomExistant === nomNormalized
            })

            return doublon // Retourne l'apprenant existant ou undefined

        } catch (error) {
            console.error('Erreur vérification doublon:', error)
            return null // En cas d'erreur, on laisse passer (sécurité failopen)
        }
    }

    // LOGIQUE RECALCUL SUSPENSION - Fonction pour calculer la durée totale des suspensions terminées
    const calculerDureeSuspensions = async (apprenantId) => {
        try {
            // Tentative avec table suspensions_parcours (si elle existe)
            let { data: suspensions, error } = await supabase
                .from('suspensions_parcours')
                .select('date_suspension, date_reprise_reelle')
                .eq('apprenant_id', apprenantId)
                .not('date_reprise_reelle', 'is', null); // Seules les suspensions terminées

            // Si la table n'existe pas, utiliser les données de la table users
            if (error && error.code === 'PGRST106') {
                console.log('Table suspensions_parcours non disponible, utilisation fallback');
                // Pour l'instant, retourner 0 jusqu'à ce que l'historique soit disponible
                return 0;
            }

            if (error) throw error;
            
            let dureeTotaleMillisec = 0;
            
            suspensions.forEach(suspension => {
                const debut = new Date(suspension.date_suspension);
                const fin = new Date(suspension.date_reprise_reelle);
                if (debut && fin && fin > debut) {
                    dureeTotaleMillisec += (fin - debut);
                }
            });
            
            return Math.ceil(dureeTotaleMillisec / (1000 * 60 * 60 * 24)); // Retour en jours
        } catch (error) {
            console.error('Erreur calcul durée suspensions:', error);
            return 0;
        }
    }

    // Fonction pour recalculer la date de fin de formation en tenant compte des suspensions
    const recalculerDateFin = async (apprenant) => {
        try {
            const dureeSuspensionJours = await calculerDureeSuspensions(apprenant.id);
            
            if (dureeSuspensionJours > 0 && apprenant.date_sortie_previsionnelle) {
                const datePrevisionnelle = new Date(apprenant.date_sortie_previsionnelle);
                const nouvelleDateFin = new Date(datePrevisionnelle);
                nouvelleDateFin.setDate(nouvelleDateFin.getDate() + dureeSuspensionJours);
                
                return nouvelleDateFin.toISOString().split('T')[0]; // Format YYYY-MM-DD
            }
            
            return apprenant.date_sortie_previsionnelle; // Pas de changement si pas de suspension
        } catch (error) {
            console.error('Erreur recalcul date fin:', error);
            return apprenant.date_sortie_previsionnelle;
        }
    }

    // Fonction utilitaire pour formater les dates
    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        });
    }

    // Fonction pour ajouter un apprenant
    const handleSubmitAjout = async (e, forceCreation = false) => {
        e.preventDefault()

        if (!prenom.trim() || !nom.trim()) {
            setMessage('Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        // Validation des dates
        if (dateEntreeFormation && dateSortiePrevisionnelle && !validerDates(dateEntreeFormation, dateSortiePrevisionnelle)) {
            setMessage('La date d\'entrée doit être antérieure à la date de sortie prévisionnelle')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            // Vérification doublon (sauf si forceCreation = true)
            if (!forceCreation) {
                const doublon = await verifierDoublonApprenant(prenom, nom)
                if (doublon) {
                    setDoublonDetecte(doublon)
                    setShowConfirmationDoublon(true)
                    setIsLoading(false)
                    return
                }
            }

            // Générer l'identifiant unique
            const { identifiant, message: messageIdentifiant } = await genererIdentifiantUnique(prenom.trim())

            const nouvelApprenant = {
                prenom: prenom.trim(),
                nom: nom.trim(),
                identifiant: identifiant,
                dispositif: dispositif,
                role: 'apprenant',
                archive: false
            }

            // Ajout des nouveaux champs si renseignés
            if (dateEntreeFormation) nouvelApprenant.date_entree_formation = dateEntreeFormation
            if (dateSortiePrevisionnelle) nouvelApprenant.date_sortie_previsionnelle = dateSortiePrevisionnelle
            if (lieuFormationId) nouvelApprenant.lieu_formation_id = lieuFormationId
            if (statutFormation) nouvelApprenant.statut_formation = statutFormation

            const { data: apprenantCree, error } = await supabase
                .from('users')
                .insert([nouvelApprenant])
                .select()

            if (error) throw error

            // Réinitialiser le formulaire
            resetFormulaire()
            setShowAjouterForm(false)
            setIsLoading(false) // Débloquer AVANT la redirection

            // Rediriger vers la page planning-type-apprenants avec l'apprenant présélectionné
            if (apprenantCree && apprenantCree.length > 0) {
                router.push(`/planning-type-apprenants?apprenant=${apprenantCree[0].id}`)
            }

        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
            setIsLoading(false)
        }
    }

    // Fonction pour modifier un apprenant
    const handleSubmitModification = async (e) => {
        e.preventDefault()
        
        if (!apprenantEnModification || !apprenantEnModification.prenom.trim() || !apprenantEnModification.nom.trim()) {
            setMessage('Le prénom et le nom sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        // Validation des dates
        if (apprenantEnModification.date_entree_formation && apprenantEnModification.date_sortie_previsionnelle && 
            !validerDates(apprenantEnModification.date_entree_formation, apprenantEnModification.date_sortie_previsionnelle)) {
            setMessage('La date d\'entrée doit être antérieure à la date de sortie prévisionnelle')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            const dataUpdate = {
                prenom: apprenantEnModification.prenom.trim(),
                nom: apprenantEnModification.nom.trim(),
                dispositif: apprenantEnModification.dispositif,
                date_entree_formation: apprenantEnModification.date_entree_formation || null,
                date_sortie_previsionnelle: apprenantEnModification.date_sortie_previsionnelle || null,
                date_fin_formation_reelle: apprenantEnModification.date_fin_formation_reelle || null,
                lieu_formation_id: apprenantEnModification.lieu_formation_id || null,
                statut_formation: apprenantEnModification.statut_formation || 'en_cours',
                date_suspension: apprenantEnModification.date_suspension || null,
                motif_suspension: apprenantEnModification.motif_suspension || null,
                date_reprise_prevue: apprenantEnModification.date_reprise_prevue || null
            }

            const { error } = await supabase
                .from('users')
                .update(dataUpdate)
                .eq('id', apprenantEnModification.id)
            
            if (error) throw error

            // Si le statut passe a termine ou abandonne, creer le suivi post-formation
            const nouveauStatut = apprenantEnModification.statut_formation
            if (nouveauStatut === 'termine' || nouveauStatut === 'abandonne') {
                try {
                    await fetch('/api/admin/terminer-parcours', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ apprenant_id: apprenantEnModification.id })
                    })
                } catch (e) { /* suivi est un bonus, ne pas bloquer */ }

                // Poser la question satisfaction
                setApprenantSorti(apprenantEnModification)
                setShowQuestionSatisfaction(true)
            }

            setMessage('Apprenant modifié avec succès !')
            setTimeout(() => setMessage(''), 4000)
            setApprenantEnModification(null)
            setShowModifierForm(false)
            await fetchApprenants()

        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Initier la modification
    const initierModification = (apprenant) => {
        setApprenantEnModification({...apprenant})
        setShowModifierForm(true)
        setShowAjouterForm(false)
    }

    // Module suspensions
    const initierSuspension = (apprenant) => {
        setApprenantSuspension(apprenant)
        setDateSuspension('')
        setMotifSuspension('')
        setDateReprisePrevue('')
        setShowSuspensionForm(true)
    }

    const handleSubmitSuspension = async (e) => {
        e.preventDefault()
        
        if (!dateSuspension || !motifSuspension.trim()) {
            setMessage('La date de suspension et le motif sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            // 1. Mettre à jour l'apprenant
            const updateData = {
                statut_formation: 'suspendu',
                date_suspension: dateSuspension,
                motif_suspension: motifSuspension.trim(),
                date_reprise_prevue: dateReprisePrevue || null
            }

            const { error } = await supabase
                .from('users')
                .update(updateData)
                .eq('id', apprenantSuspension.id)
            
            if (error) throw error

            // 2. Optionnel : Enregistrer dans la table suspensions_parcours (si elle existe)
            try {
                const { error: suspensionError } = await supabase
                    .from('suspensions_parcours')
                    .insert({
                        apprenant_id: apprenantSuspension.id,
                        date_suspension: dateSuspension,
                        motif_suspension: motifSuspension.trim(),
                        date_reprise_prevue: dateReprisePrevue || null
                    });
                
                if (suspensionError && suspensionError.code !== 'PGRST106') {
                    console.error('Erreur insertion suspension:', suspensionError);
                }
            } catch (suspError) {
                console.log('Table suspensions_parcours non disponible, poursuite du traitement');
            }
            
            setMessage(`⏸️ Suspension enregistrée pour ${apprenantSuspension.prenom} ${apprenantSuspension.nom}`)
            setTimeout(() => setMessage(''), 4000)
            setShowSuspensionForm(false)
            setApprenantSuspension(null)
            await fetchApprenants()
            
        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    const reprendre = async (apprenant) => {
        setIsLoading(true)
        try {
            const dateReprise = new Date().toISOString().split('T')[0];
            
            // 1. Marquer la reprise dans la table suspensions_parcours (si elle existe)
            try {
                const { error: suspensionError } = await supabase
                    .from('suspensions_parcours')
                    .update({ date_reprise_reelle: dateReprise })
                    .eq('apprenant_id', apprenant.id)
                    .is('date_reprise_reelle', null); // Seule la suspension active
                
                // Si erreur car table n'existe pas, on continue sans bloquer
                if (suspensionError && suspensionError.code !== 'PGRST106') {
                    throw suspensionError;
                }
            } catch (suspError) {
                console.log('Table suspensions_parcours non disponible, poursuite du traitement');
            }
            
            // 2. Recalculer la nouvelle date de fin de formation
            const nouvelleDateFin = await recalculerDateFin(apprenant);
            
            // 3. Mettre à jour l'apprenant avec le nouveau statut ET la nouvelle date de fin
            const { error: updateError } = await supabase
                .from('users')
                .update({ 
                    statut_formation: 'en_cours',
                    date_suspension: null,
                    motif_suspension: null,
                    date_reprise_prevue: null,
                    date_fin_formation_reelle: nouvelleDateFin // NOUVEAU : date recalculée
                })
                .eq('id', apprenant.id);
            
            if (updateError) throw updateError;
            
            // 4. Message de confirmation avec info du recalcul
            const dureeSuspension = await calculerDureeSuspensions(apprenant.id);
            
            if (dureeSuspension > 0) {
                setMessage(`✅ Reprise confirmée pour ${apprenant.prenom} ${apprenant.nom}. 
                           Formation prolongée de ${dureeSuspension} jour(s). 
                           Nouvelle date de fin : ${formatDate(nouvelleDateFin)}`);
            } else {
                setMessage(`✅ Reprise de formation enregistrée pour ${apprenant.prenom} ${apprenant.nom}`);
            }
            
            setTimeout(() => setMessage(''), 6000) // Plus long pour lire le message
            await fetchApprenants()
            
        } catch (error) {
            console.error('Erreur reprise:', error);
            setMessage(`❌ Erreur lors de la reprise : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Actions archiver/désarchiver/supprimer
    const initierAction = (apprenant, typeAction) => {
        setActionEnCours({
            apprenant: apprenant,
            type: typeAction,
            message: getMessageConfirmation(apprenant, typeAction)
        })
        setShowConfirmation(true)
    }

    const getMessageConfirmation = (apprenant, typeAction) => {
        switch (typeAction) {
            case 'archiver':
                return `Archiver l'apprenant "${apprenant.prenom} ${apprenant.nom}" ?`
            case 'desarchiver':
                return `Désarchiver l'apprenant "${apprenant.prenom} ${apprenant.nom}" ?`
            case 'supprimer':
                return `Supprimer définitivement l'apprenant "${apprenant.prenom} ${apprenant.nom}" ?\n\nATTENTION : Action irréversible !`
            default:
                return 'Confirmer cette action ?'
        }
    }

    const executerAction = async () => {
        if (!actionEnCours) return

        setIsLoading(true)
        try {
            const { apprenant, type } = actionEnCours

            if (type === 'archiver') {
                await supabase.from('users').update({ archive: true }).eq('id', apprenant.id)
                setMessage('Apprenant archivé avec succès !')
            } else if (type === 'desarchiver') {
                await supabase.from('users').update({ archive: false }).eq('id', apprenant.id)
                setMessage('Apprenant désarchivé avec succès !')
            } else if (type === 'supprimer') {
                await supabase.from('users').delete().eq('id', apprenant.id)
                setMessage('Apprenant supprimé définitivement !')
            }

            setTimeout(() => setMessage(''), 4000)
            await fetchApprenants()

        } catch (error) {
            setMessage(`Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
            setActionEnCours(null)
            setShowConfirmation(false)
        }
    }

    // Compter les apprenants
    const compterApprenants = () => {
        const tous = apprenants.length
        const actifs = apprenants.filter(a => !a.archive).length
        const archives = apprenants.filter(a => a.archive).length
        const hsp = apprenants.filter(a => a.dispositif === 'HSP' && !a.archive).length
        const opco = apprenants.filter(a => a.dispositif === 'OPCO' && !a.archive).length
        const cdv = apprenants.filter(a => a.dispositif === 'CDV' && !a.archive).length
        const pm = apprenants.filter(a => a.dispositif === 'PM' && !a.archive).length
        return { tous, actifs, archives, hsp, opco, cdv, pm }
    }

    const stats = compterApprenants()

    // ========== FONCTIONS GESTION PARCOURS ==========

    // Ouvrir le modal des parcours
    const ouvrirParcours = async (apprenant) => {
        setApprenantParcours(apprenant)
        setShowParcoursModal(true)
        setLoadingParcours(true)
        setShowNouveauParcours(false)

        try {
            const { data, error } = await supabase
                .from('parcours_apprenants')
                .select(`
                    *,
                    lieu:lieu_formation_id(id, nom, couleur)
                `)
                .eq('apprenant_id', apprenant.id)
                .order('numero_parcours', { ascending: true })

            if (error) throw error
            setParcoursApprenant(data || [])
        } catch (error) {
            console.error('Erreur chargement parcours:', error)
            setParcoursApprenant([])
        } finally {
            setLoadingParcours(false)
        }
    }

    // Créer un nouveau parcours
    const creerNouveauParcours = async (e) => {
        e.preventDefault()

        if (!nouveauParcours.date_entree || !nouveauParcours.date_sortie_previsionnelle) {
            setMessage('Les dates sont obligatoires')
            setTimeout(() => setMessage(''), 4000)
            return
        }

        setIsLoading(true)
        try {
            // 1. Terminer le parcours actif actuel
            const parcoursActif = parcoursApprenant.find(p => p.actif)
            if (parcoursActif) {
                const { error: erreurTerminer } = await supabase
                    .from('parcours_apprenants')
                    .update({
                        actif: false,
                        statut: 'termine',
                        date_fin_reelle: parcoursActif.date_sortie_previsionnelle
                    })
                    .eq('id', parcoursActif.id)

                if (erreurTerminer) throw erreurTerminer
            }

            // 2. Créer le nouveau parcours
            const nouveauNumero = parcoursApprenant.length + 1
            const { error: erreurCreation } = await supabase
                .from('parcours_apprenants')
                .insert({
                    apprenant_id: apprenantParcours.id,
                    date_entree: nouveauParcours.date_entree,
                    date_sortie_previsionnelle: nouveauParcours.date_sortie_previsionnelle,
                    dispositif: nouveauParcours.dispositif,
                    lieu_formation_id: nouveauParcours.lieu_formation_id || null,
                    statut: 'en_cours',
                    actif: true,
                    numero_parcours: nouveauNumero
                })

            if (erreurCreation) throw erreurCreation

            // 3. Mettre à jour la table users avec les nouvelles infos
            const { error: erreurUsers } = await supabase
                .from('users')
                .update({
                    date_entree_formation: nouveauParcours.date_entree,
                    date_sortie_previsionnelle: nouveauParcours.date_sortie_previsionnelle,
                    dispositif: nouveauParcours.dispositif,
                    lieu_formation_id: nouveauParcours.lieu_formation_id || null,
                    statut_formation: 'en_cours'
                })
                .eq('id', apprenantParcours.id)

            if (erreurUsers) throw erreurUsers

            setMessage(`✅ Nouveau parcours créé pour ${apprenantParcours.prenom} ${apprenantParcours.nom}`)

            // Fermer le modal et rediriger vers planning-type-apprenants avec l'apprenant pré-sélectionné
            setShowParcoursModal(false)
            setShowNouveauParcours(false)
            setNouveauParcours({
                date_entree: '',
                date_sortie_previsionnelle: '',
                dispositif: 'HSP',
                lieu_formation_id: ''
            })

            // Rediriger vers planning-type-apprenants avec l'apprenant sélectionné
            router.push(`/planning-type-apprenants?apprenant=${apprenantParcours.id}`)

        } catch (error) {
            setMessage(`❌ Erreur : ${error.message}`)
            setTimeout(() => setMessage(''), 4000)
        } finally {
            setIsLoading(false)
        }
    }

    // Obtenir le nombre de parcours pour un apprenant
    const getNombreParcours = (apprenantId) => {
        // On le calcule à partir des données chargées ou on retourne 1 par défaut
        return 1 // Sera mis à jour dynamiquement lors de l'ouverture du modal
    }

    return (
        <>
            {/* Styles CSS pour les dates de formation */}
            <style jsx>{`
                .dates-formation {
                    font-size: 0.9em;
                }
                
                .date-entree, .date-sortie {
                    margin-bottom: 2px;
                }
                
                .date-fin-reelle {
                    font-size: 0.85em;
                    margin-top: 2px;
                    padding: 2px 6px;
                    background: rgba(255, 107, 53, 0.1);
                    border-radius: 4px;
                    border-left: 3px solid #ff6b35;
                    color: #ff6b35;
                    font-weight: bold;
                }
                
                /* Animation pour mettre en évidence les prolongations */
                .date-fin-reelle {
                    animation: highlight 2s ease-in-out;
                }
                
                @keyframes highlight {
                    0% { background: rgba(255, 107, 53, 0.3); }
                    100% { background: rgba(255, 107, 53, 0.1); }
                }
            `}</style>
            
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
                    <span style={{ color: '#3b82f6', fontWeight: '500' }}>Gestion des Apprenants</span>
                </nav>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

                    <button
                        onClick={logout}
                        style={{
                            padding: '8px 16px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Déconnexion
                    </button>
                </div>
            </div>

            {/* Bandeau blanc avec status */}
            <div className="no-print" style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '8px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '15px'
            }}>
                {priority && priority < 999 && (
                    <>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: priority === 1 ? '#10b981' : priority === 2 ? '#f59e0b' : '#dc2626',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                            {priority}
                        </div>

                        {/* Séparateur vertical */}
                        <div style={{
                            width: '1px',
                            height: '30px',
                            backgroundColor: '#e5e7eb'
                        }}></div>

                        {/* Liste des admins connectés */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{
                                color: '#9ca3af',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                👥
                            </span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {connectedAdmins.filter(admin => admin.email !== user?.email).map((admin, index) => {
                                    let badgeColor, action, pageName;

                                    if (!admin.currentPage || admin.currentPage === '/' || admin.currentPage === '') {
                                        badgeColor = '#10b981';
                                        action = 'consulte';
                                        pageName = 'la messagerie';
                                    } else {
                                        badgeColor = admin.priority === 1 ? '#10b981' : admin.priority === 2 ? '#f59e0b' : '#ef4444';
                                        action = admin.priority === 1 ? 'modifie' : 'consulte';
                                        pageName = admin.currentPage.replace('/', '').replace(/-/g, ' ');
                                    }

                                    return (
                                        <div key={index} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            backgroundColor: badgeColor,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            color: 'white'
                                        }}>
                                            <span style={{ fontWeight: '600' }}>
                                                {admin.name}
                                            </span>
                                            <span style={{ fontWeight: '400' }}>
                                                {action} {pageName}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Titre principal */}
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                <h1 style={{
                    fontSize: '36px',
                    fontWeight: 'bold',
                    color: 'white',
                    marginBottom: '10px'
                }}>
                    Gestion des Apprenants
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Gérez les apprenants et leur dispositif de financement
                </p>
            </div>

            {/* Bandeau de verrouillage si un admin vert est sur la page */}
            {!canEdit && connectedAdmins.some(admin => admin.priority === 1 && admin.currentPage === '/gestion-apprenants') && (
                <div style={{
                    backgroundColor: '#ef4444',
                    color: 'white',
                    padding: '16px 24px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'center',
                    fontSize: '16px',
                    fontWeight: '600',
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                }}>
                    🚫 Page verrouillée. {connectedAdmins.find(admin => admin.priority === 1 && admin.currentPage === '/gestion-apprenants')?.name} modifie actuellement cette page. Toutes les actions sont désactivées jusqu'à son départ.
                </div>
            )}

            {/* Message de notification */}
            {message && (
                <div style={{
                    backgroundColor: message.includes('succès') ? '#d1fae5' : message.includes('⚠️') ? '#fef3c7' : '#fee2e2',
                    color: message.includes('succès') ? '#065f46' : message.includes('⚠️') ? '#92400e' : '#991b1b',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    textAlign: 'left',
                    fontWeight: '500',
                    whiteSpace: 'pre-line'
                }}>
                    {message}
                </div>
            )}

            {/* Bouton Ajouter */}
            <div style={{ marginBottom: '20px' }}>
                <button
                    onClick={() => {
                        setShowAjouterForm(!showAjouterForm)
                        setShowModifierForm(false)
                    }}
                    disabled={!canEdit}
                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: !canEdit ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s',
                        opacity: !canEdit ? 0.6 : 1
                    }}
                    onMouseOver={(e) => canEdit && (e.target.style.transform = 'scale(1.02)')}
                    onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
                >
                    ➕ Ajouter un nouvel apprenant
                </button>
            </div>

            {/* Formulaire d'ajout */}
            {showAjouterForm && (
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>Nouvel apprenant</h3>
                    <form onSubmit={handleSubmitAjout}>
                        {/* Première ligne - Informations de base */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Prénom *</label>
                                <input
                                    type="text"
                                    value={prenom}
                                    onChange={(e) => setPrenom(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Nom *</label>
                                <input
                                    type="text"
                                    value={nom}
                                    onChange={(e) => setNom(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Dispositif</label>
                                <select
                                    value={dispositif}
                                    onChange={(e) => setDispositif(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="HSP">HSP</option>
                                    <option value="OPCO">OPCO</option>
                                    <option value="CDV">CDV</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Deuxième ligne - Dates et lieu */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Date entrée formation</label>
                                <input
                                    type="date"
                                    value={dateEntreeFormation}
                                    onChange={(e) => setDateEntreeFormation(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Date sortie prévisionnelle</label>
                                <input
                                    type="date"
                                    value={dateSortiePrevisionnelle}
                                    onChange={(e) => setDateSortiePrevisionnelle(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Lieu de formation</label>
                                <select
                                    value={lieuFormationId}
                                    onChange={(e) => setLieuFormationId(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Sélectionner lieu...</option>
                                    {lieux.map((lieu) => (
                                        <option key={lieu.id} value={lieu.id}>{lieu.nom}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Troisième ligne - Statut et bouton */}
                        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 150px', gap: '15px', alignItems: 'end' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>Statut formation</label>
                                <select
                                    value={statutFormation}
                                    onChange={(e) => setStatutFormation(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="en_cours">En cours</option>
                                    <option value="termine">Terminé</option>
                                    <option value="abandonne">Abandonné</option>
                                    <option value="suspendu">Suspendu</option>
                                </select>
                            </div>
                            <div></div>
                            <button
                                type="submit"
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '12px',
                                    backgroundColor: (isLoading || !canEdit) ? '#9ca3af' : '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    fontWeight: '500',
                                    fontSize: '14px',
                                    opacity: !canEdit ? 0.6 : 1
                                }}
                            >
                                {isLoading ? 'Ajout...' : '✅ Ajouter'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Formulaire de modification */}
            {showModifierForm && apprenantEnModification && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    border: '2px solid #f59e0b'
                }}>
                    <h3 style={{ marginBottom: '15px', color: '#92400e' }}>
                        Modifier : {apprenantEnModification.prenom} {apprenantEnModification.nom}
                    </h3>
                    <form onSubmit={handleSubmitModification}>
                        {/* Première ligne - Informations de base */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Prénom *</label>
                                <input
                                    type="text"
                                    value={apprenantEnModification.prenom}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, prenom: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Nom *</label>
                                <input
                                    type="text"
                                    value={apprenantEnModification.nom}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, nom: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Dispositif</label>
                                <select
                                    value={apprenantEnModification.dispositif || 'HSP'}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, dispositif: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="HSP">HSP</option>
                                    <option value="OPCO">OPCO</option>
                                    <option value="CDV">CDV</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                        </div>
                        
                        {/* Deuxième ligne - Dates et lieu */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Date entrée formation</label>
                                <input
                                    type="date"
                                    value={apprenantEnModification.date_entree_formation || ''}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, date_entree_formation: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Date sortie prévisionnelle</label>
                                <input
                                    type="date"
                                    value={apprenantEnModification.date_sortie_previsionnelle || ''}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, date_sortie_previsionnelle: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Date fin réelle</label>
                                <input
                                    type="date"
                                    value={apprenantEnModification.date_fin_formation_reelle || ''}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, date_fin_formation_reelle: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Troisième ligne - Lieu et statut */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 200px 1fr 150px', gap: '15px', alignItems: 'end' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Lieu de formation</label>
                                <select
                                    value={apprenantEnModification.lieu_formation_id || ''}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, lieu_formation_id: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">Sélectionner lieu...</option>
                                    {lieux.map((lieu) => (
                                        <option key={lieu.id} value={lieu.id}>{lieu.nom}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#92400e' }}>Statut formation</label>
                                <select
                                    value={apprenantEnModification.statut_formation || 'en_cours'}
                                    onChange={(e) => setApprenantEnModification({...apprenantEnModification, statut_formation: e.target.value})}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #fbbf24',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="en_cours">En cours</option>
                                    <option value="termine">Terminé</option>
                                    <option value="abandonne">Abandonné</option>
                                    <option value="suspendu">Suspendu</option>
                                </select>
                            </div>
                            <div></div>
                            <button
                                type="submit"
                                disabled={isLoading || !canEdit}
                                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                style={{
                                    padding: '12px',
                                    backgroundColor: (isLoading || !canEdit) ? '#9ca3af' : '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer',
                                    fontWeight: '500',
                                    fontSize: '14px',
                                    opacity: !canEdit ? 0.6 : 1
                                }}
                            >
                                {isLoading ? 'Modification...' : '✅ Modifier'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tableau avec filtres */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
                {/* Header avec double filtre et stats */}
                <div style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '15px' }}>
                        {/* Champ de recherche */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '0 1 200px' }}>
                            <label style={{ fontWeight: '500', color: '#374151' }}>🔍</label>
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={filtreRecherche}
                                onChange={(e) => setFiltreRecherche(e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        {/* Filtres statut en boutons pill */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {[
                                { value: 'en_cours', label: 'En cours', bg: '#dbeafe', bgActive: '#2563eb', color: '#1e40af', colorActive: '#fff' },
                                { value: 'termine', label: 'Terminé', bg: '#d1fae5', bgActive: '#059669', color: '#065f46', colorActive: '#fff' },
                                { value: 'suspendu', label: 'Suspendu', bg: '#fef3c7', bgActive: '#d97706', color: '#92400e', colorActive: '#fff' },
                                { value: 'archive', label: 'Archivés', bg: '#f3f4f6', bgActive: '#6b7280', color: '#374151', colorActive: '#fff' },
                                { value: 'tous', label: 'Tous', bg: '#f3f4f6', bgActive: '#374151', color: '#374151', colorActive: '#fff' }
                            ].map(btn => (
                                <button
                                    key={btn.value}
                                    onClick={() => setFiltreStatut(btn.value)}
                                    style={{
                                        padding: '6px 14px',
                                        borderRadius: '20px',
                                        border: 'none',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        cursor: 'pointer',
                                        backgroundColor: filtreStatut === btn.value ? btn.bgActive : btn.bg,
                                        color: filtreStatut === btn.value ? btn.colorActive : btn.color,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#374151' }}>Dispositif :</label>
                            <select
                                value={filtreDispositif}
                                onChange={(e) => setFiltreDispositif(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="tous">Tous</option>
                                <option value="HSP">HSP uniquement</option>
                                <option value="OPCO">OPCO uniquement</option>
                                <option value="CDV">CDV uniquement</option>
                                <option value="PM">PM uniquement</option>
                            </select>
                        </div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <label style={{ fontWeight: '500', color: '#374151' }}>Lieu :</label>
                            <select
                                value={filtreLieu}
                                onChange={(e) => setFiltreLieu(e.target.value)}
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="tous">Tous les lieux</option>
                                {lieux.map(lieu => (
                                    <option key={lieu.id} value={lieu.id}>
                                        {lieu.nom}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    {/* Statistiques */}
                    <div style={{ display: 'flex', gap: '20px', fontSize: '14px', justifyContent: 'center' }}>
                        <span style={{ 
                            padding: '5px 12px', 
                            backgroundColor: '#d1fae5', 
                            color: '#065f46',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            Actifs: {stats.actifs}
                        </span>
                        <span style={{ 
                            padding: '5px 12px', 
                            backgroundColor: '#dbeafe', 
                            color: '#1e40af',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            HSP: {stats.hsp}
                        </span>
                        <span style={{
                            padding: '5px 12px',
                            backgroundColor: '#fef3c7',
                            color: '#92400e',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            OPCO: {stats.opco}
                        </span>
                        <span style={{
                            padding: '5px 12px',
                            backgroundColor: '#e0e7ff',
                            color: '#4338ca',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            CDV: {stats.cdv}
                        </span>
                        <span style={{
                            padding: '5px 12px',
                            backgroundColor: '#f3f4f6',
                            color: '#6b7280',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            Archivés: {stats.archives}
                        </span>
                        <span style={{ 
                            padding: '5px 12px', 
                            backgroundColor: '#ede9fe', 
                            color: '#7c3aed',
                            borderRadius: '20px',
                            fontWeight: '500'
                        }}>
                            Total: {stats.tous}
                        </span>
                    </div>
                </div>

                {/* Tableau */}
                {apprenants.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Statut</th>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Identifiant</th>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Prénom</th>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Nom</th>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Dispositif</th>
                                <th style={{ padding: '8px', textAlign: 'center', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Parcours</th>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Lieu</th>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Statut Formation</th>
                                <th style={{ padding: '8px', textAlign: 'left', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Dates Formation</th>
                                <th style={{ padding: '8px', textAlign: 'center', color: '#6b7280', fontWeight: '600', fontSize: '12px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {apprenants.map((apprenant) => (
                                <tr key={apprenant.id} style={{ borderTop: '1px solid #e5e7eb' }}>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '500',
                                            backgroundColor: apprenant.archive ? '#f3f4f6' : '#d1fae5',
                                            color: apprenant.archive ? '#6b7280' : '#065f46'
                                        }}>
                                            {apprenant.archive ? 'Archivé' : 'Actif'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '600',
                                            backgroundColor: '#e0e7ff',
                                            color: '#4338ca'
                                        }}>
                                            {apprenant.identifiant || apprenant.prenom}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', fontWeight: '500', fontSize: '13px' }}>{apprenant.prenom}</td>
                                    <td style={{ padding: '8px', fontSize: '13px' }}>{apprenant.nom}</td>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '500',
                                            backgroundColor: apprenant.dispositif === 'HSP' ? '#dbeafe' : apprenant.dispositif === 'OPCO' ? '#fef3c7' : apprenant.dispositif === 'PM' ? '#d1fae5' : '#e0e7ff',
                                            color: apprenant.dispositif === 'HSP' ? '#1e40af' : apprenant.dispositif === 'OPCO' ? '#92400e' : apprenant.dispositif === 'PM' ? '#065f46' : '#4338ca'
                                        }}>
                                            {apprenant.dispositif || 'HSP'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', textAlign: 'center' }}>
                                        <span
                                            onClick={() => ouvrirParcours(apprenant)}
                                            title="Voir l'historique des parcours"
                                            style={{
                                                padding: '4px 10px',
                                                borderRadius: '20px',
                                                fontSize: '11px',
                                                fontWeight: '600',
                                                background: apprenant.parcours_total > 1
                                                    ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)'
                                                    : '#f3f4f6',
                                                color: apprenant.parcours_total > 1 ? 'white' : '#6b7280',
                                                cursor: 'pointer',
                                                display: 'inline-block'
                                            }}
                                        >
                                            {apprenant.parcours_actif}/{apprenant.parcours_total}
                                        </span>
                                    </td>
                                    <td style={{
                                        padding: '8px',
                                        fontSize: '12px',
                                        backgroundColor: apprenant.lieu_couleur ? apprenant.lieu_couleur : '#ffffff',
                                        color: apprenant.lieu_couleur ? '#ffffff' : '#6b7280',
                                        fontWeight: apprenant.lieu_formation_nom ? '500' : 'normal',
                                        borderRadius: '4px'
                                    }}>
                                        {apprenant.lieu_formation_nom || 'Non défini'}
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <span style={{
                                            padding: '3px 8px',
                                            borderRadius: '12px',
                                            fontSize: '11px',
                                            fontWeight: '500',
                                            backgroundColor: 
                                                apprenant.statut_formation === 'en_cours' ? '#dbeafe' :
                                                apprenant.statut_formation === 'termine' ? '#d1fae5' :
                                                apprenant.statut_formation === 'suspendu' ? '#fef3c7' : '#fee2e2',
                                            color: 
                                                apprenant.statut_formation === 'en_cours' ? '#1e40af' :
                                                apprenant.statut_formation === 'termine' ? '#065f46' :
                                                apprenant.statut_formation === 'suspendu' ? '#92400e' : '#dc2626'
                                        }}>
                                            {apprenant.statut_display || getStatutDisplay(apprenant.statut_formation || 'en_cours')}
                                        </span>
                                    </td>
                                    <td style={{ padding: '8px', fontSize: '11px', color: '#6b7280' }} className="dates-formation">
                                        <div>
                                            {apprenant.date_entree_formation && (
                                                <div className="date-entree">📅 {formatDate(apprenant.date_entree_formation)}</div>
                                            )}
                                            {apprenant.date_sortie_previsionnelle && (
                                                <div className="date-sortie">
                                                    🎯 {formatDate(apprenant.date_sortie_previsionnelle)}
                                                    {apprenant.date_fin_formation_reelle && 
                                                     apprenant.date_fin_formation_reelle !== apprenant.date_sortie_previsionnelle && (
                                                        <div className="date-fin-reelle" style={{
                                                            color: '#ff6b35', 
                                                            fontWeight: 'bold',
                                                            fontSize: '0.85em',
                                                            marginTop: '2px',
                                                            padding: '2px 6px',
                                                            background: 'rgba(255, 107, 53, 0.1)',
                                                            borderRadius: '4px',
                                                            borderLeft: '3px solid #ff6b35'
                                                        }}>
                                                            ⏳ Réelle: {formatDate(apprenant.date_fin_formation_reelle)}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {apprenant.date_fin_formation_reelle && 
                                             apprenant.date_fin_formation_reelle === apprenant.date_sortie_previsionnelle && (
                                                <div>✅ {formatDate(apprenant.date_fin_formation_reelle)}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        {apprenant.archive ? (
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => initierAction(apprenant, 'desarchiver')}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#10b981',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    Désarchiver
                                                </button>
                                                <button
                                                    onClick={() => initierAction(apprenant, 'supprimer')}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#ef4444',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    Supprimer
                                                </button>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                <button
                                                    onClick={() => ouvrirParcours(apprenant)}
                                                    title="Voir l'historique des parcours"
                                                    style={{
                                                        padding: '4px 8px',
                                                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    📋 Parcours
                                                </button>
                                                <button
                                                    onClick={() => initierModification(apprenant)}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '4px 8px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#3b82f6',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    ✏️ Modifier
                                                </button>

                                                {/* Bouton Suspension/Reprise selon statut */}
                                                {apprenant.statut_formation === 'suspendu' ? (
                                                    <button
                                                        onClick={() => reprendre(apprenant)}
                                                        disabled={!canEdit}
                                                        title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                        style={{
                                                            padding: '4px 8px',
                                                            backgroundColor: !canEdit ? '#94a3b8' : '#10b981',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                            opacity: !canEdit ? 0.6 : 1
                                                        }}
                                                    >
                                                        ▶️ Reprendre
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => initierSuspension(apprenant)}
                                                        disabled={!canEdit}
                                                        title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                        style={{
                                                            padding: '4px 8px',
                                                            backgroundColor: !canEdit ? '#94a3b8' : '#f59e0b',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontSize: '11px',
                                                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                            opacity: !canEdit ? 0.6 : 1
                                                        }}
                                                    >
                                                        ⏸️ Suspendre
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => initierAction(apprenant, 'archiver')}
                                                    disabled={!canEdit}
                                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                                                    style={{
                                                        padding: '4px 8px',
                                                        backgroundColor: !canEdit ? '#94a3b8' : '#6b7280',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                        opacity: !canEdit ? 0.6 : 1
                                                    }}
                                                >
                                                    📦 Archiver
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div style={{ padding: '60px', textAlign: 'center' }}>
                        <p style={{ color: '#9ca3af', fontSize: '16px' }}>
                            Aucun apprenant trouvé avec ces critères.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de confirmation */}
            {showConfirmation && actionEnCours && (
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
                        borderRadius: '12px',
                        padding: '25px',
                        maxWidth: '400px',
                        width: '90%',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ marginBottom: '15px', color: '#1f2937' }}>
                            Confirmer l'action
                        </h3>
                        <p style={{ marginBottom: '20px', color: '#6b7280', whiteSpace: 'pre-line' }}>
                            {actionEnCours.message}
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={executerAction}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: actionEnCours.type === 'supprimer' ? '#ef4444' : '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    cursor: isLoading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                {isLoading ? 'En cours...' : 'Confirmer'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowConfirmation(false)
                                    setActionEnCours(null)
                                }}
                                disabled={isLoading}
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '500',
                                    cursor: isLoading ? 'not-allowed' : 'pointer'
                                }}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Suspension */}
            {showSuspensionForm && apprenantSuspension && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        width: '500px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                    }}>
                        <h3 style={{ marginBottom: '20px', color: '#92400e' }}>
                            ⏸️ Suspendre la formation de {apprenantSuspension.prenom} {apprenantSuspension.nom}
                        </h3>
                        
                        <form onSubmit={handleSubmitSuspension}>
                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Date de suspension *
                                </label>
                                <input
                                    type="date"
                                    value={dateSuspension}
                                    onChange={(e) => setDateSuspension(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '15px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Motif de la suspension *
                                </label>
                                <textarea
                                    value={motifSuspension}
                                    onChange={(e) => setMotifSuspension(e.target.value)}
                                    placeholder="Décrivez la raison de la suspension..."
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        minHeight: '80px',
                                        resize: 'vertical'
                                    }}
                                    required
                                />
                            </div>

                            <div style={{ marginBottom: '25px' }}>
                                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: '#6b7280' }}>
                                    Date de reprise prévue (optionnel)
                                </label>
                                <input
                                    type="date"
                                    value={dateReprisePrevue}
                                    onChange={(e) => setDateReprisePrevue(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        fontSize: '14px'
                                    }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowSuspensionForm(false)}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: '#6b7280',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Annuler
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{
                                        padding: '10px 20px',
                                        backgroundColor: isLoading ? '#9ca3af' : '#f59e0b',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        cursor: isLoading ? 'not-allowed' : 'pointer',
                                        fontWeight: '500'
                                    }}
                                >
                                    {isLoading ? 'Suspension...' : '⏸️ Confirmer la suspension'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Confirmation Doublon */}
            {showConfirmationDoublon && doublonDetecte && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        width: '500px',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
                        border: '3px solid #f59e0b'
                    }}>
                        <h3 style={{ marginBottom: '20px', color: '#92400e', fontSize: '20px' }}>
                            ⚠️ Doublon détecté !
                        </h3>

                        <div style={{
                            backgroundColor: '#fef3c7',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '20px',
                            border: '1px solid #fbbf24'
                        }}>
                            <p style={{ color: '#92400e', marginBottom: '10px', fontSize: '15px' }}>
                                Un apprenant avec le même nom existe déjà :
                            </p>
                            <p style={{
                                color: '#78350f',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                marginBottom: '8px'
                            }}>
                                📋 {doublonDetecte.prenom} {doublonDetecte.nom}
                            </p>
                            <p style={{
                                color: '#92400e',
                                fontSize: '14px',
                                fontStyle: 'italic'
                            }}>
                                {doublonDetecte.archive ? '📦 Cet apprenant est archivé' : '✅ Cet apprenant est actif'}
                            </p>
                        </div>

                        <p style={{
                            marginBottom: '25px',
                            color: '#6b7280',
                            fontSize: '14px',
                            lineHeight: '1.6'
                        }}>
                            Êtes-vous sûr de vouloir créer un doublon ?<br/>
                            <strong>Cette action créera un second apprenant avec le même nom.</strong>
                        </p>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowConfirmationDoublon(false)
                                    setDoublonDetecte(null)
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                ❌ Annuler
                            </button>
                            <button
                                type="button"
                                onClick={async (e) => {
                                    setShowConfirmationDoublon(false)
                                    setDoublonDetecte(null)
                                    await handleSubmitAjout(e, true) // Force la création
                                }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                ✅ Créer quand même
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Parcours */}
            {showParcoursModal && apprenantParcours && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '30px',
                        width: '700px',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
                    }}>
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            paddingBottom: '15px',
                            borderBottom: '2px solid #8b5cf6'
                        }}>
                            <h3 style={{ margin: 0, color: '#7c3aed', fontSize: '20px' }}>
                                📋 Parcours de {apprenantParcours.prenom} {apprenantParcours.nom}
                            </h3>
                            <button
                                onClick={() => setShowParcoursModal(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280'
                                }}
                            >
                                ✕
                            </button>
                        </div>

                        {/* Contenu */}
                        {loadingParcours ? (
                            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                ⏳ Chargement des parcours...
                            </div>
                        ) : parcoursApprenant.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                backgroundColor: '#f3f4f6',
                                borderRadius: '8px',
                                color: '#6b7280'
                            }}>
                                <p style={{ marginBottom: '15px' }}>Aucun parcours enregistré</p>
                                <p style={{ fontSize: '14px' }}>
                                    Les dates actuelles de la fiche seront utilisées comme premier parcours.
                                </p>
                            </div>
                        ) : (
                            <div style={{ marginBottom: '20px' }}>
                                {parcoursApprenant.map((parcours, index) => (
                                    <div
                                        key={parcours.id}
                                        style={{
                                            padding: '15px',
                                            marginBottom: '10px',
                                            borderRadius: '8px',
                                            border: parcours.actif ? '2px solid #10b981' : '1px solid #e5e7eb',
                                            backgroundColor: parcours.actif ? '#ecfdf5' : '#f9fafb'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '10px'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{
                                                    padding: '4px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '12px',
                                                    fontWeight: 'bold',
                                                    backgroundColor: parcours.actif ? '#10b981' : '#6b7280',
                                                    color: 'white'
                                                }}>
                                                    Parcours {parcours.numero_parcours}
                                                </span>
                                                {parcours.actif && (
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '11px',
                                                        fontWeight: '600',
                                                        backgroundColor: '#d1fae5',
                                                        color: '#065f46'
                                                    }}>
                                                        ✅ ACTIF
                                                    </span>
                                                )}
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: '4px',
                                                    fontSize: '11px',
                                                    fontWeight: '500',
                                                    backgroundColor: parcours.dispositif === 'HSP' ? '#dbeafe' :
                                                                    parcours.dispositif === 'OPCO' ? '#fef3c7' :
                                                                    parcours.dispositif === 'PM' ? '#d1fae5' : '#e0e7ff',
                                                    color: parcours.dispositif === 'HSP' ? '#1e40af' :
                                                           parcours.dispositif === 'OPCO' ? '#92400e' :
                                                           parcours.dispositif === 'PM' ? '#065f46' : '#4338ca'
                                                }}>
                                                    {parcours.dispositif}
                                                </span>
                                            </div>
                                            <span style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: '500',
                                                backgroundColor:
                                                    parcours.statut === 'en_cours' ? '#dbeafe' :
                                                    parcours.statut === 'termine' ? '#d1fae5' :
                                                    parcours.statut === 'suspendu' ? '#fef3c7' : '#fee2e2',
                                                color:
                                                    parcours.statut === 'en_cours' ? '#1e40af' :
                                                    parcours.statut === 'termine' ? '#065f46' :
                                                    parcours.statut === 'suspendu' ? '#92400e' : '#dc2626'
                                            }}>
                                                {parcours.statut === 'en_cours' ? 'En cours' :
                                                 parcours.statut === 'termine' ? 'Terminé' :
                                                 parcours.statut === 'suspendu' ? 'Suspendu' : 'Abandonné'}
                                            </span>
                                        </div>

                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr 1fr',
                                            gap: '15px',
                                            fontSize: '13px'
                                        }}>
                                            <div>
                                                <span style={{ color: '#6b7280' }}>📅 Entrée :</span>
                                                <strong style={{ marginLeft: '5px' }}>
                                                    {formatDate(parcours.date_entree)}
                                                </strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#6b7280' }}>🎯 Sortie prévue :</span>
                                                <strong style={{ marginLeft: '5px' }}>
                                                    {formatDate(parcours.date_sortie_previsionnelle)}
                                                </strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#6b7280' }}>📍 Lieu :</span>
                                                <strong style={{ marginLeft: '5px' }}>
                                                    {parcours.lieu?.nom || 'Non défini'}
                                                </strong>
                                            </div>
                                        </div>

                                        {parcours.date_fin_reelle && (
                                            <div style={{
                                                marginTop: '10px',
                                                padding: '8px',
                                                backgroundColor: parcours.actif ? '#d1fae5' : '#f3f4f6',
                                                borderRadius: '4px',
                                                fontSize: '12px'
                                            }}>
                                                ✅ Fin réelle : <strong>{formatDate(parcours.date_fin_reelle)}</strong>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Bouton Nouveau Parcours */}
                        {!showNouveauParcours ? (
                            <button
                                onClick={() => setShowNouveauParcours(true)}
                                disabled={!canEdit}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: !canEdit ? '#94a3b8' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    cursor: !canEdit ? 'not-allowed' : 'pointer',
                                    opacity: !canEdit ? 0.6 : 1
                                }}
                            >
                                ➕ Créer un nouveau parcours
                            </button>
                        ) : (
                            /* Formulaire nouveau parcours */
                            <div style={{
                                padding: '20px',
                                backgroundColor: '#ecfdf5',
                                borderRadius: '8px',
                                border: '2px solid #10b981'
                            }}>
                                <h4 style={{ margin: '0 0 15px 0', color: '#065f46' }}>
                                    ➕ Nouveau parcours
                                </h4>
                                <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '15px' }}>
                                    Le parcours actuel sera automatiquement marqué comme "terminé".
                                </p>

                                <form onSubmit={creerNouveauParcours}>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '15px',
                                        marginBottom: '15px'
                                    }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#065f46' }}>
                                                Date d'entrée *
                                            </label>
                                            <input
                                                type="date"
                                                value={nouveauParcours.date_entree}
                                                onChange={(e) => setNouveauParcours({...nouveauParcours, date_entree: e.target.value})}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid #10b981',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#065f46' }}>
                                                Date sortie prévisionnelle *
                                            </label>
                                            <input
                                                type="date"
                                                value={nouveauParcours.date_sortie_previsionnelle}
                                                onChange={(e) => setNouveauParcours({...nouveauParcours, date_sortie_previsionnelle: e.target.value})}
                                                required
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid #10b981',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '15px',
                                        marginBottom: '20px'
                                    }}>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#065f46' }}>
                                                Dispositif
                                            </label>
                                            <select
                                                value={nouveauParcours.dispositif}
                                                onChange={(e) => setNouveauParcours({...nouveauParcours, dispositif: e.target.value})}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid #10b981',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <option value="HSP">HSP</option>
                                                <option value="OPCO">OPCO</option>
                                                <option value="CDV">CDV</option>
                                                <option value="PM">PM</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: '#065f46' }}>
                                                Lieu de formation
                                            </label>
                                            <select
                                                value={nouveauParcours.lieu_formation_id}
                                                onChange={(e) => setNouveauParcours({...nouveauParcours, lieu_formation_id: e.target.value})}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    border: '1px solid #10b981',
                                                    borderRadius: '6px',
                                                    fontSize: '14px'
                                                }}
                                            >
                                                <option value="">Sélectionner lieu...</option>
                                                {lieux.map((lieu) => (
                                                    <option key={lieu.id} value={lieu.id}>{lieu.nom}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setShowNouveauParcours(false)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                backgroundColor: '#6b7280',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                backgroundColor: isLoading ? '#9ca3af' : '#10b981',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            {isLoading ? 'Création...' : '✅ Créer le parcours'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Bouton Fermer */}
                        <button
                            onClick={() => setShowParcoursModal(false)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                marginTop: '15px',
                                backgroundColor: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Fermer
                        </button>
                    </div>
                </div>
            )}
            </div>

            {/* Modal Questionnaire de satisfaction rempli ? */}
            {showQuestionSatisfaction && apprenantSorti && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
                    <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '32px', maxWidth: '450px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.2)', textAlign: 'center' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
                        <h3 style={{ margin: '0 0 8px', fontSize: '20px', color: '#1e293b' }}>
                            {apprenantSorti.prenom} {apprenantSorti.nom}
                        </h3>
                        <p style={{ fontSize: '16px', color: '#475569', marginBottom: '24px' }}>
                            Le questionnaire de satisfaction a-t-il ete rempli ?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={() => {
                                    setShowQuestionSatisfaction(false)
                                    setApprenantSorti(null)
                                    router.push('/suivi-post-formation')
                                }}
                                style={{ padding: '14px 32px', fontSize: '16px', fontWeight: '700', border: 'none', borderRadius: '12px', backgroundColor: '#10b981', color: 'white', cursor: 'pointer' }}
                            >
                                OUI - Saisir les reponses
                            </button>
                            <button
                                onClick={() => {
                                    setShowQuestionSatisfaction(false)
                                    setApprenantSorti(null)
                                    setMessage('Suivi cree - un SMS sera envoye automatiquement')
                                    setTimeout(() => setMessage(''), 5000)
                                }}
                                style={{ padding: '14px 32px', fontSize: '16px', fontWeight: '700', border: '2px solid #e2e8f0', borderRadius: '12px', backgroundColor: 'white', color: '#475569', cursor: 'pointer' }}
                            >
                                NON - Envoyer par SMS
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(GestionApprenants, "Gestion Apprenants")
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useFormateurAuth } from '../../contexts/FormateurAuthContext';

export default function AbsenceFormateur() {
    const { user, isLoading: authLoading, isAuthenticated } = useFormateurAuth()
    const [currentDate, setCurrentDate] = useState(new Date());
    const [modeSelection, setModeSelection] = useState('absent');
    const [planningModifie, setPlanningModifie] = useState({});
    const [planningOriginal, setPlanningOriginal] = useState({});
    const [historiqueModi, setHistoriqueModi] = useState([]);
    const [message, setMessage] = useState('');
    const [lieux, setLieux] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [envoiEnCours, setEnvoiEnCours] = useState(false);
    // ✅ NOUVEAU: États pour modal message facultatif
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [messageFacultatif, setMessageFacultatif] = useState('');
    const router = useRouter();

    // Protection authentification
    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/formateur/login')
        }
    }, [authLoading, isAuthenticated, router])

    useEffect(() => {
        if (user) {
            loadPlanningData();
        }
    }, [currentDate, user]);


    const loadPlanningData = async () => {
        if (!user) return;
        
        try {
            setIsLoading(true);
            
            // Charger les lieux pour affichage
            const { data: lieuxData, error: lieuxError } = await supabase
                .from('lieux')
                .select('id, nom, couleur, initiale')
                .eq('archive', false);

            if (lieuxError) throw lieuxError;
            setLieux(lieuxData || []);

            const annee = currentDate.getFullYear();
            const mois = currentDate.getMonth();
            const premierJour = new Date(annee, mois, 1);
            const dernierJour = new Date(annee, mois + 1, 0);
            
            // Construire le planning original basé sur le planning type VALIDÉ
            const planning = {};
            
            // Ajouter seulement les jours ouvrés (Lun-Ven) comme "libre" par défaut
            for (let jour = 1; jour <= new Date(annee, mois + 1, 0).getDate(); jour++) {
                const date = new Date(annee, mois, jour);
                const jourSemaine = date.getDay();
                
                // Seulement les jours de travail (lundi à vendredi)
                if (jourSemaine >= 1 && jourSemaine <= 5) {
                    const anneeStr = date.getFullYear();
                    const moisStr = String(date.getMonth() + 1).padStart(2, '0');
                    const jourStr = String(date.getDate()).padStart(2, '0');
                    const dateStr = `${anneeStr}-${moisStr}-${jourStr}`;
                    planning[dateStr] = 'libre';
                }
            }

            // Récupérer le planning type VALIDÉ du formateur
            const { data: planningTypeData, error: planningTypeError } = await supabase
                .from('planning_type_formateurs')
                .select('jour, creneau, statut, lieu_id, valide')
                .eq('formateur_id', user.id)
                .eq('valide', true);

            // Appliquer le planning type VALIDÉ (BASE VERTE)
            if (planningTypeData && !planningTypeError) {
                // Créer un mapping des jours
                const joursMapping = {
                    0: 'Dimanche', 1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 
                    4: 'Jeudi', 5: 'Vendredi', 6: 'Samedi'
                };

                // Pour chaque jour du mois
                for (let jour = 1; jour <= new Date(annee, mois + 1, 0).getDate(); jour++) {
                    const date = new Date(annee, mois, jour);
                    const jourSemaine = date.getDay();
                    const nomJour = joursMapping[jourSemaine];
                    
                    // Si c'est un jour ouvré
                    if (jourSemaine >= 1 && jourSemaine <= 5) {
                        const anneeStr = date.getFullYear();
                        const moisStr = String(date.getMonth() + 1).padStart(2, '0');
                        const jourStr = String(date.getDate()).padStart(2, '0');
                        const dateStr = `${anneeStr}-${moisStr}-${jourStr}`;
                        
                        // Vérifier si le formateur a une disponibilité validée ce jour-là   
                        const disponibiliteJour = planningTypeData.find(pt => 
                            pt.jour === nomJour && pt.statut === 'disponible'
                        );
                        
                        const disponibiliteExcept = planningTypeData.find(pt => 
                            pt.jour === nomJour && pt.statut === 'dispo_except'
                        );
                        
                        if (disponibiliteJour) {
                            planning[dateStr] = 'planning_type'; // JOUR VALIDÉ = VERT
                        } else if (disponibiliteExcept) {
                            planning[dateStr] = 'dispo_except'; // DISPO EXCEPTIONNELLE = ORANGE
                        }
                    }
                }
                console.log(`✅ Planning type validé appliqué: ${planningTypeData.length} créneaux`);
            }

            // 🔧 CORRECTION CRITIQUE : Charger ET afficher TOUTES les absences
            const { data: absencesData, error: absencesError } = await supabase
                .from('absences_formateurs')
                .select('date_debut, date_fin, type, statut, id')
                .eq('formateur_id', user.id);

            // 🔧 NOUVEAU : Appliquer TOUTES les absences (en_attente + validées)
            if (absencesData && !absencesError) {
                console.log(`🔧 CHARGEMENT: ${absencesData.length} absences trouvées:`, absencesData);
                
                absencesData.forEach(absence => {
                    const debut = new Date(absence.date_debut);
                    const fin = new Date(absence.date_fin);
                    
                    console.log(`🔧 Traitement absence: ${absence.date_debut} - ${absence.date_fin}, type: ${absence.type}, statut: ${absence.statut}`);
                    
                    for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
                        const anneeStr = d.getFullYear();
                        const moisStr = String(d.getMonth() + 1).padStart(2, '0');
                        const jourStr = String(d.getDate()).padStart(2, '0');
                        const dateStr = `${anneeStr}-${moisStr}-${jourStr}`;
                        
                        if (planning.hasOwnProperty(dateStr)) {
                            // 🔧 CORRECTION : Afficher TOUTES les absences (en_attente ET validées)
                            if (absence.type === 'personnel' || absence.type === 'absence') {
                                planning[dateStr] = 'absent';
                                console.log(`🔴 ${dateStr} marqué ABSENT (${absence.type}, ${absence.statut})`);
                            } else if (absence.type === 'formation' || absence.type === 'dispo_except') {
                                planning[dateStr] = 'dispo';
                                console.log(`🟡 ${dateStr} marqué DISPO EXCEPT (${absence.type}, ${absence.statut})`);
                            }
                        }
                    }
                });
                console.log(`✅ Modifications affichées: ${absencesData.length} (en_attente + validées)`);
            }

            // Debug : Afficher le résultat final
            const joursVerts = Object.keys(planning).filter(d => planning[d] === 'planning_type').length;
            const joursRouges = Object.keys(planning).filter(d => planning[d] === 'absent').length;
            const joursOranges = Object.keys(planning).filter(d => planning[d] === 'dispo').length;
            
            console.log(`📊 RÉSULTAT FINAL:`);
            console.log(`  🟢 Jours verts (planning type): ${joursVerts}`);
            console.log(`  🔴 Jours rouges (absences): ${joursRouges}`);
            console.log(`  🟡 Jours oranges (dispo except): ${joursOranges}`);

            setPlanningOriginal(planning);
            setPlanningModifie({...planning});

        } catch (error) {
            console.error('⚠ Erreur:', error.message);
            setMessage(`⚠ Erreur: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Navigation mensuelle
    const changerMois = (direction) => {
        const nouvelleDate = new Date(currentDate);
        // Fix pour éviter le saut de mois (31 août -> 1er octobre au lieu de septembre)
        // On force le jour à 1 avant de changer le mois
        nouvelleDate.setDate(1);
        nouvelleDate.setMonth(nouvelleDate.getMonth() + direction);
        setCurrentDate(nouvelleDate);
        setMessage('');
    };

    // Fonction pour obtenir les détails d'un statut
    const getStatutDetails = (statut) => {
        switch (statut) {
            case 'absent':
                return { 
                    backgroundColor: '#ef4444', 
                    color: 'white', 
                    label: 'ABS',
                    nom: 'Absent'
                };
            case 'dispo':
                return { 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    label: 'DISPO',
                    nom: 'Dispo exceptionnelle'
                };
            case 'planning_type':
                return { 
                    backgroundColor: '#22c55e', 
                    color: 'white', 
                    label: 'DISPO',
                    nom: 'Planning habituel'
                };
            case 'dispo_except':
                return { 
                    backgroundColor: '#f59e0b', 
                    color: 'white', 
                    label: 'EXCEPT',
                    nom: 'Dispo exceptionnelle'
                };
            case 'libre':
            default:
                return { 
                    backgroundColor: '#d1d5db', 
                    color: '#374151', 
                    label: '',
                    nom: 'Libre'
                };
        }
    };

    // Fonction pour gérer le clic sur une case
    const gererClicCase = (date) => {
        const annee = date.getFullYear();
        const mois = String(date.getMonth() + 1).padStart(2, '0');
        const jourStr = String(date.getDate()).padStart(2, '0');
        const dateStr = `${annee}-${mois}-${jourStr}`;
        
        const aujourdhui = new Date();
        const aujourdhuiStr = `${aujourdhui.getFullYear()}-${String(aujourdhui.getMonth() + 1).padStart(2, '0')}-${String(aujourdhui.getDate()).padStart(2, '0')}`;
        
        if (dateStr < aujourdhuiStr) {
            setMessage('Impossible de modifier le passé');
            return;
        }

        // Ajouter à l'historique avant de modifier
        setHistoriqueModi(prev => [...prev, { date: dateStr, action: 'modifier', mode: modeSelection }]);

        setPlanningModifie(prev => ({
            ...prev,
            [dateStr]: modeSelection
        }));

        const details = getStatutDetails(modeSelection);
        setMessage(`${date.getDate()} ${currentDate.toLocaleDateString('fr-FR', {month: 'long'})} → ${details.nom}`);
    };

    // Fonction ANNULER : annuler la dernière action
    const annulerDerniereAction = () => {
        if (historiqueModi.length === 0) {
            setMessage('Aucune action à annuler');
            return;
        }

        const derniereAction = historiqueModi[historiqueModi.length - 1];
        
        // Supprimer la dernière action de l'historique
        setHistoriqueModi(prev => prev.slice(0, -1));
        
        if (derniereAction.action === 'modifier') {
            // Annuler une modification = remettre l'état original
            setPlanningModifie(prev => ({
                ...prev,
                [derniereAction.date]: planningOriginal[derniereAction.date]
            }));
            setMessage('Dernière action annulée');
        } else if (derniereAction.action === 'annuler_case') {
            // Annuler une annulation = remettre la case
            setPlanningModifie(prev => ({
                ...prev,
                [derniereAction.date]: derniereAction.mode || 'planning_type'
            }));
            setMessage('Annulation annulée');
        }
    };

    // Fonction ANNULER UNE CASE : supprimer une case spécifique (mode annuler)
    const annulerModificationCase = (date) => {
        const annee = date.getFullYear();
        const mois = String(date.getMonth() + 1).padStart(2, '0');
        const jourStr = String(date.getDate()).padStart(2, '0');
        const dateStr = `${annee}-${mois}-${jourStr}`;
        
        // Ajouter à l'historique avant d'annuler
        setHistoriqueModi(prev => [...prev, { 
            date: dateStr, 
            action: 'annuler_case',
            mode: planningModifie[dateStr]
        }]);
        
        // Remettre à l'état original
        setPlanningModifie(prev => ({
            ...prev,
            [dateStr]: planningOriginal[dateStr]
        }));
        
        setMessage(`Modification annulée pour le ${date.getDate()} ${currentDate.toLocaleDateString('fr-FR', {month: 'long'})}`);
    };

    // Fonction EFFACER TOUT : effacer toutes les modifications
    const effacerTout = () => {
        setPlanningModifie({...planningOriginal}); // Remettre à l'état original
        setHistoriqueModi([]); // Vider aussi l'historique
        setMessage('Toutes les modifications ont été effacées');
    };

    // ✅ NOUVEAU: Fonction pour générer la liste des modifications pour le message
    const genererListeModifications = () => {
        const modificationsDetectees = [];
        
        Object.keys(planningModifie).forEach(dateStr => {
            const statutOriginal = planningOriginal[dateStr];
            const statutModifie = planningModifie[dateStr];
            
            if (statutOriginal !== statutModifie) {
                const date = new Date(dateStr);
                const dateFormatee = date.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long' 
                });
                
                let typeModification = '';
                if (statutModifie === 'absent') {
                    typeModification = 'Absence';
                } else if (statutModifie === 'dispo') {
                    typeModification = 'Disponibilité exceptionnelle';
                }
                
                if (typeModification) {
                    modificationsDetectees.push(`${dateFormatee} : ${typeModification}`);
                }
            }
        });
        
        return modificationsDetectees;
    };

    // ✅ CORRIGÉ: Fonction d'envoi de message automatique vers admin
    const envoyerMessageAdmin = async (messageFacultatif = '') => {
        try {
            console.log('🚀 DÉBUT envoyerMessageAdmin')
            console.log('user:', user)
            
            if (!user) {
                console.error('❌ Données utilisateur manquantes')
                return
            }

            const formateurNom = `${user.prenom} ${user.nom}`
            const listeModifications = genererListeModifications()
            
            console.log('📝 Liste modifications:', listeModifications)
            
            let contenu = `${formateurNom} souhaite effectuer des modifications ponctuelles sur son planning :\n\n`
            
            // Ajouter la liste des modifications
            if (listeModifications.length > 0) {
                contenu += `MODIFICATIONS DEMANDÉES :\n`
                listeModifications.forEach((modif, index) => {
                    contenu += `${index + 1}. ${modif}\n`
                })
                contenu += '\n'
            }
            
            // Ajouter le message facultatif s'il existe
            if (messageFacultatif.trim()) {
                contenu += `MESSAGE DU FORMATEUR :\n"${messageFacultatif.trim()}"`
            }
            
            console.log('📨 Contenu du message:', contenu)
            
            const messageData = {
                expediteur_id: user.id,
                destinataire_id: null, // null = admin
                expediteur: formateurNom,
                destinataire: 'Coordination ACLEF',
                objet: 'Validation de modification ponctuelle',
                contenu: contenu,
                type: 'planning',
                lu: false,
                archive: false,
                statut_validation: 'a_traiter',
                date: new Date().toISOString().split('T')[0],
                heure: new Date().toTimeString().slice(0, 5)
            }
            
            console.log('📤 Données à insérer:', messageData)
            
            const { data, error } = await supabase
                .from('messages')
                .insert(messageData)
                .select()

            if (error) {
                console.error('❌ Erreur Supabase:', error)
                alert('Erreur envoi message: ' + error.message)
            } else {
                console.log('✅ Message inséré avec succès:', data)
                alert('✅ Message envoyé à l\'administration !')
            }

        } catch (error) {
            console.error('❌ Erreur générale:', error)
            alert('Erreur: ' + error.message)
        }
    }

    // ✅ NOUVEAU: Gestion de la validation avec modal message facultatif
    const handleValider = async () => {
        const modificationsDetectees = Object.keys(planningModifie).filter(date => 
            planningModifie[date] !== planningOriginal[date]
        );
        
        if (modificationsDetectees.length === 0) {
            setMessage('⚠️ Aucune modification à envoyer');
            return;
        }

        // ✅ NOUVEAU: Afficher modal pour message facultatif
        setShowMessageModal(true);
    };

    // ✅ NOUVEAU: Fonction de validation finale avec envoi message
    const handleValidationFinale = async () => {
        setShowMessageModal(false);
        
        // Envoyer message vers admin AVANT la sauvegarde
        await envoyerMessageAdmin(messageFacultatif);
        
        // Puis sauvegarder le planning
        await envoyerDemande();
        
        // Reset du message facultatif
        setMessageFacultatif('');
    };

    // Fonction ENVOYER LA DEMANDE : sauvegarder en BDD (MODIFIÉE pour retirer le modal)
    const envoyerDemande = async () => {
        try {
            setEnvoiEnCours(true);
            setMessage('⏳ Envoi de la demande en cours...');

            // Détecter les modifications
            const modificationsDetectees = [];
            
            Object.keys(planningModifie).forEach(dateStr => {
                const statutOriginal = planningOriginal[dateStr];
                const statutModifie = planningModifie[dateStr];
                
                // Si la case a été modifiée
                if (statutOriginal !== statutModifie) {
                    let type = null;
                    
                    if (statutModifie === 'absent') {
                        type = 'personnel';
                    } else if (statutModifie === 'dispo') {
                        type = 'formation';
                    }
                    
                    // Ajouter seulement si c'est un type reconnu
                    if (type) {
                        modificationsDetectees.push({
                            date: dateStr,
                            type: type,
                            statutOriginal: statutOriginal,
                            statutModifie: statutModifie
                        });
                    }
                }
            });

            if (modificationsDetectees.length === 0) {
                setMessage('⚠️ Aucune modification à envoyer');
                setEnvoiEnCours(false);
                return;
            }

            console.log(`📤 ${modificationsDetectees.length} modifications détectées:`, modificationsDetectees);

            // Créer un enregistrement par jour modifié
            const enregistrementsACreer = modificationsDetectees.map(modif => ({
                formateur_id: user.id,
                date_debut: modif.date,
                date_fin: modif.date, // Même date pour jour par jour
                type: modif.type,
                statut: 'en_attente',
                motif: null, // Optionnel, peut être ajouté plus tard
                created_at: new Date().toISOString()
            }));

            // Insérer en BDD
            const { data: resultats, error: erreurInsert } = await supabase
                .from('absences_formateurs')
                .insert(enregistrementsACreer)
                .select();

            if (erreurInsert) {
                throw erreurInsert;
            }

            console.log(`✅ ${resultats.length} enregistrements créés en BDD`);

            // Succès !
            setMessage(`✅ Demande envoyée ! ${modificationsDetectees.length} modification(s) en attente de validation.`);
            
            // Remettre le planning à l'état d'origine après envoi réussi
            setPlanningModifie({...planningOriginal});
            setHistoriqueModi([]);

            // Rediriger vers l'accueil après 2 secondes
            setTimeout(() => {
                router.push('/formateur');
            }, 2000);

        } catch (error) {
            console.error('⚠️ Erreur lors de l\'envoi:', error);
            setMessage(`⚠️ Erreur lors de l'envoi: ${error.message}`);
        } finally {
            setEnvoiEnCours(false);
        }
    };

    // Génération du calendrier 5 jours ouvrés
    const genererCalendrierComplet = () => {
        const annee = currentDate.getFullYear();
        const mois = currentDate.getMonth();
        
        const nbJoursMois = new Date(annee, mois + 1, 0).getDate();
        const joursOuvres = [];
        
        for (let jour = 1; jour <= nbJoursMois; jour++) {
            const date = new Date(annee, mois, jour, 12, 0, 0, 0);
            const jourSemaine = date.getDay();
            
            if (jourSemaine >= 1 && jourSemaine <= 5) {
                joursOuvres.push(date);
            }
        }
        
        const grille = [];
        let indexJour = 0;
        
        const nbSemaines = Math.ceil(joursOuvres.length / 5);
        
        for (let semaine = 0; semaine < nbSemaines; semaine++) {
            for (let jourSemaine = 0; jourSemaine < 5; jourSemaine++) {
                if (indexJour < joursOuvres.length) {
                    const date = joursOuvres[indexJour];
                    const jourReel = date.getDay();
                    const jourAttendu = jourSemaine + 1;
                    
                    if (jourReel === jourAttendu) {
                        grille.push(date);
                        indexJour++;
                    } else {
                        grille.push(null);
                    }
                } else {
                    grille.push(null);
                }
            }
        }
        
        return grille;
    };

    // Vérifier s'il y a des modifications
    const aDesModifications = () => {
        return JSON.stringify(planningOriginal) !== JSON.stringify(planningModifie);
    };

    if (isLoading || authLoading) {
        return (
            <div style={{
                height: '100vh',
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '8px'
            }}>
                <div style={{fontSize: '48px', marginBottom: '16px'}}>⏳</div>
                <p style={{fontSize: '18px', color: '#667eea'}}>Chargement de votre planning...</p>
            </div>
        );
    }

    if (!user) {
        return null;
    }

    const nomMois = currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const casesCalendrier = genererCalendrierComplet();

    // Styles CSS optimisés pour pleine page
    const containerStyle = {
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '8px',
        overflow: 'hidden'
    };

    const calendrierStyle = {
        width: '100%',
        maxWidth: '380px',
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: '95vh'
    };

    return (
        <div style={containerStyle}>
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
                            Souhaitez-vous ajouter un message pour expliquer vos modifications ?
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

            <div style={calendrierStyle}>
                
                {/* En-tête compact */}
                <div style={{marginBottom: '12px', textAlign: 'center'}}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
                        <h1 style={{fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1e40af'}}>
                            Modifier mes disponibilités
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
                </div>

                {/* Modes de sélection compacts */}
                <div style={{marginBottom: '12px'}}>
                    <h3 style={{fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center', color: '#374151'}}>
                        Choisir un mode puis cliquer sur les dates
                    </h3>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '6px'}}>
                        <button
                            onClick={() => {
                                setModeSelection('absent');
                                setMessage('Mode ABSENT activé');
                            }}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                border: modeSelection === 'absent' ? '2px solid #fbbf24' : 'none',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '9px',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            ABSENT
                        </button>
                        
                        <button
                            onClick={() => {
                                setModeSelection('dispo');
                                setMessage('Mode DISPO EXCEPT. activé');
                            }}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                border: modeSelection === 'dispo' ? '2px solid #fbbf24' : 'none',
                                backgroundColor: '#f59e0b',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '9px',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            DISPO EXCEPT.
                        </button>
                    </div>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px'}}>
                        <button
                            onClick={() => {
                                setModeSelection('annuler_case');
                                setMessage('Mode ANNULER CASE activé');
                            }}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                border: modeSelection === 'annuler_case' ? '2px solid #fbbf24' : 'none',
                                backgroundColor: '#d1d5db',
                                color: '#374151',
                                fontWeight: 'bold',
                                fontSize: '8px',
                                cursor: 'pointer',
                                textAlign: 'center'
                            }}
                        >
                            ANNULER CASE
                        </button>
                        
                        <button
                            onClick={annulerDerniereAction}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                backgroundColor: '#d1d5db',
                                color: '#374151',
                                fontWeight: 'bold',
                                fontSize: '8px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                border: 'none'
                            }}
                        >
                            ANNULER
                        </button>
                        
                        <button
                            onClick={effacerTout}
                            style={{
                                padding: '8px',
                                borderRadius: '8px',
                                backgroundColor: '#6b7280',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '8px',
                                cursor: 'pointer',
                                textAlign: 'center',
                                border: 'none'
                            }}
                        >
                            EFFACER TOUT
                        </button>
                    </div>
                </div>

                {/* Messages compacts */}
                {message && (
                    <div style={{
                        padding: '8px',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        textAlign: 'center',
                        backgroundColor: message.includes('Impossible') || message.includes('⚠️') ? '#fee2e2' : 
                                         message.includes('⏳') ? '#dbeafe' :
                                         message.includes('✅') ? '#d1fae5' : '#dbeafe',
                        color: message.includes('Impossible') || message.includes('⚠️') ? '#991b1b' : 
                               message.includes('⏳') ? '#1e40af' :
                               message.includes('✅') ? '#065f46' : '#1e40af',
                        fontWeight: 'bold',
                        fontSize: '10px'
                    }}>
                        {message}
                    </div>
                )}

                {/* Compteur modifications compact */}
                {aDesModifications() && (
                    <div style={{
                        backgroundColor: '#fef3c7',
                        padding: '6px',
                        borderRadius: '8px',
                        marginBottom: '8px',
                        textAlign: 'center',
                        color: '#92400e',
                        fontWeight: 'bold',
                        fontSize: '10px'
                    }}>
                        {Object.keys(planningModifie).filter(date => 
                            planningModifie[date] !== planningOriginal[date]
                        ).length} modification(s)
                    </div>
                )}

                {/* Navigation compacte */}
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px'}}>
                    <button 
                        style={{
                            width: '40px', 
                            height: '40px', 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                            color: 'white',
                            border: 'none', 
                            borderRadius: '10px', 
                            fontSize: '18px', 
                            fontWeight: 'bold',
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center'
                        }}
                        onClick={() => changerMois(-1)}
                    >
                        ←
                    </button>
                    
                    <h2 style={{
                        fontSize: '16px', 
                        fontWeight: 'bold', 
                        textTransform: 'capitalize', 
                        margin: 0,
                        color: '#1e40af',
                        textAlign: 'center'
                    }}>
                        {nomMois.split(' ')[0]} {currentDate.getFullYear()}
                    </h2>
                    
                    <button 
                        style={{
                            width: '40px', 
                            height: '40px', 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                            color: 'white',
                            border: 'none', 
                            borderRadius: '10px', 
                            fontSize: '18px', 
                            fontWeight: 'bold',
                            cursor: 'pointer', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center'
                        }}
                        onClick={() => changerMois(1)}
                    >
                        →
                    </button>
                </div>

                {/* En-têtes des jours compacts */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginBottom: '8px'}}>
                    {['Lu', 'Ma', 'Me', 'Je', 'Ve'].map(jour => (
                        <div key={jour} style={{
                            textAlign: 'center', 
                            fontWeight: 'bold', 
                            fontSize: '10px',
                            color: '#6b7280',
                            padding: '2px'
                        }}>
                            {jour}
                        </div>
                    ))}
                </div>

                {/* Grille du calendrier compacte */}
                <div style={{
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(5, 1fr)', 
                    gap: '4px', 
                    marginBottom: '12px',
                    flex: 1
                }}>
                    {casesCalendrier.map((date, index) => {
                        if (!date) {
                            return <div key={`empty-${index}`} style={{width: '48px', height: '48px'}}></div>;
                        }

                        const dateStr = date.toISOString().split('T')[0];
                        const statut = planningModifie[dateStr] || 'libre';
                        const details = getStatutDetails(statut);
                        const estAujourdhui = date.toDateString() === new Date().toDateString();
                        const estPasse = dateStr < new Date().toISOString().split('T')[0];
                        const estModifie = planningModifie[dateStr] !== planningOriginal[dateStr];
                        const numeroJour = date.getDate();
                        
                        return (
                            <div
                                key={date.getTime()}
                                style={{
                                    width: '48px',
                                    height: '48px',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 'bold',
                                    fontSize: '12px',
                                    backgroundColor: details.backgroundColor,
                                    color: details.color,
                                    border: estAujourdhui ? '3px solid #fbbf24' : estModifie ? '2px solid #10b981' : '1px solid rgba(0,0,0,0.1)',
                                    cursor: estPasse ? 'not-allowed' : 'pointer',
                                    opacity: estPasse ? 0.5 : 1,
                                    position: 'relative'
                                }}
                                onClick={() => {
                                    if (modeSelection === 'annuler_case') {
                                        annulerModificationCase(date);
                                    } else {
                                        gererClicCase(date);
                                    }
                                }}
                            >
                                <span style={{fontSize: '14px'}}>{numeroJour}</span>
                                {details.label && (
                                    <span style={{fontSize: '7px', marginTop: '1px'}}>{details.label}</span>
                                )}
                                {/* Indicateur de modification */}
                                {estModifie && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '1px',
                                        right: '1px',
                                        width: '6px',
                                        height: '6px',
                                        backgroundColor: '#10b981',
                                        borderRadius: '50%'
                                    }}></div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Couleurs compactes */}
                <div style={{marginBottom: '12px'}}>
                    <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px', fontSize: '9px'}}>
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            <div style={{width: '8px', height: '8px', backgroundColor: '#ef4444', borderRadius: '2px', marginRight: '4px'}}></div>
                            <span style={{color: '#374151'}}>Absent</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            <div style={{width: '8px', height: '8px', backgroundColor: '#f59e0b', borderRadius: '2px', marginRight: '4px'}}></div>
                            <span style={{color: '#374151'}}>Dispo except.</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            <div style={{width: '8px', height: '8px', backgroundColor: '#22c55e', borderRadius: '2px', marginRight: '4px'}}></div>
                            <span style={{color: '#374151'}}>Planning habituel</span>
                        </div>
                        <div style={{display: 'flex', alignItems: 'center'}}>
                            <div style={{width: '8px', height: '8px', backgroundColor: '#d1d5db', borderRadius: '2px', marginRight: '4px'}}></div>
                            <span style={{color: '#374151'}}>Libre</span>
                        </div>
                    </div>
                </div>

                {/* Actions compactes */}
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                    {/* ✅ MODIFIÉ: Bouton sauvegarder utilise maintenant handleValider */}
                    {aDesModifications() && (
                        <button
                            onClick={handleValider}
                            disabled={envoiEnCours}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: 'white',
                                padding: '12px',
                                borderRadius: '10px',
                                fontWeight: 'bold',
                                fontSize: '12px',
                                border: 'none',
                                cursor: envoiEnCours ? 'not-allowed' : 'pointer',
                                opacity: envoiEnCours ? 0.6 : 1
                            }}
                        >
                            {envoiEnCours ? '⏳ Envoi en cours...' : '📤 Envoyer la demande'}
                        </button>
                    )}
                    
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
        </div>
    );
}
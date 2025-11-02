import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { withAuthAdmin } from '../components/withAuthAdmin';
import BandeauBlanc from '../components/BandeauBlanc';

// Skeleton Loader spécifique à la Validation des Changements
const SkeletonValidationLoader = () => {
  const shimmer = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 60px'
    }}>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header Navigation Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '15px 25px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ 
          height: '16px', 
          width: '250px', 
          borderRadius: '4px',
          ...shimmer 
        }} />
        
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ 
            height: '32px', 
            width: '80px', 
            borderRadius: '8px',
            ...shimmer 
          }} />
          <div style={{ 
            height: '24px', 
            width: '160px', 
            borderRadius: '6px',
            ...shimmer 
          }} />
          <div style={{ 
            height: '32px', 
            width: '100px', 
            borderRadius: '6px',
            ...shimmer 
          }} />
        </div>
      </div>

      {/* Titre principal Skeleton */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          height: '32px', 
          width: '320px', 
          borderRadius: '4px',
          margin: '0 auto 10px',
          ...shimmer 
        }} />
        <div style={{ 
          height: '16px', 
          width: '480px', 
          borderRadius: '4px',
          margin: '0 auto',
          ...shimmer 
        }} />
      </div>

      {/* Statistiques Skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '12px',
            padding: '25px',
            textAlign: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ 
              height: '32px', 
              width: '60px', 
              borderRadius: '4px',
              marginBottom: '8px',
              margin: '0 auto 8px',
              ...shimmer 
            }} />
            <div style={{ 
              height: '14px', 
              width: '80px', 
              borderRadius: '4px',
              margin: '0 auto',
              ...shimmer 
            }} />
          </div>
        ))}
      </div>

      {/* Filtres Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          alignItems: 'end'
        }}>
          <div>
            <div style={{ 
              height: '14px', 
              width: '100px', 
              borderRadius: '4px',
              marginBottom: '8px',
              ...shimmer 
            }} />
            <div style={{ 
              height: '40px', 
              width: '100%', 
              borderRadius: '8px',
              ...shimmer 
            }} />
          </div>
          <div>
            <div style={{ 
              height: '14px', 
              width: '80px', 
              borderRadius: '4px',
              marginBottom: '8px',
              ...shimmer 
            }} />
            <div style={{ 
              height: '40px', 
              width: '100%', 
              borderRadius: '8px',
              ...shimmer 
            }} />
          </div>
          <div>
            <div style={{ 
              height: '40px', 
              width: '140px', 
              borderRadius: '8px',
              ...shimmer 
            }} />
          </div>
        </div>
      </div>

      {/* Liste Formateurs avec Changements Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '30px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        {/* Formateur Cards Skeleton */}
        {[1, 2, 3].map(formateurIndex => (
          <div key={formateurIndex} style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '25px',
            marginBottom: '20px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            border: '1px solid #e5e7eb'
          }}>
            {/* En-tête formateur */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <div style={{ 
                  height: '50px', 
                  width: '50px', 
                  borderRadius: '25px',
                  ...shimmer 
                }} />
                <div>
                  <div style={{ 
                    height: '18px', 
                    width: '140px', 
                    borderRadius: '4px',
                    marginBottom: '4px',
                    ...shimmer 
                  }} />
                  <div style={{ 
                    height: '14px', 
                    width: '100px', 
                    borderRadius: '4px',
                    ...shimmer 
                  }} />
                </div>
              </div>
              <div style={{ 
                height: '24px', 
                width: '80px', 
                borderRadius: '12px',
                ...shimmer 
              }} />
            </div>

            {/* Changements du formateur */}
            {[1, 2].map(changementIndex => (
              <div key={changementIndex} style={{
                backgroundColor: '#f9fafb',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid #e5e7eb'
              }}>
                {/* Info changement */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                  gap: '15px',
                  marginBottom: '15px'
                }}>
                  <div>
                    <div style={{ 
                      height: '12px', 
                      width: '60px', 
                      borderRadius: '4px',
                      marginBottom: '6px',
                      ...shimmer 
                    }} />
                    <div style={{ 
                      height: '16px', 
                      width: '80px', 
                      borderRadius: '4px',
                      ...shimmer 
                    }} />
                  </div>
                  <div>
                    <div style={{ 
                      height: '12px', 
                      width: '40px', 
                      borderRadius: '4px',
                      marginBottom: '6px',
                      ...shimmer 
                    }} />
                    <div style={{ 
                      height: '16px', 
                      width: '90px', 
                      borderRadius: '4px',
                      ...shimmer 
                    }} />
                  </div>
                  <div>
                    <div style={{ 
                      height: '12px', 
                      width: '50px', 
                      borderRadius: '4px',
                      marginBottom: '6px',
                      ...shimmer 
                    }} />
                    <div style={{ 
                      height: '16px', 
                      width: '70px', 
                      borderRadius: '4px',
                      ...shimmer 
                    }} />
                  </div>
                  <div>
                    <div style={{ 
                      height: '20px', 
                      width: '80px', 
                      borderRadius: '10px',
                      ...shimmer 
                    }} />
                  </div>
                </div>

                {/* Actions skeleton - seulement pour les en_attente */}
                {changementIndex === 1 && (
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    paddingTop: '15px',
                    borderTop: '1px solid #e5e7eb'
                  }}>
                    <div style={{ 
                      height: '40px', 
                      width: '80px', 
                      borderRadius: '8px',
                      ...shimmer 
                    }} />
                  </div>
                )}

                {/* État validé skeleton */}
                {changementIndex === 2 && (
                  <div style={{
                    paddingTop: '15px',
                    borderTop: '1px solid #e5e7eb',
                    textAlign: 'center'
                  }}>
                    <div style={{ 
                      height: '20px', 
                      width: '60px', 
                      borderRadius: '4px',
                      margin: '0 auto',
                      ...shimmer 
                    }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

function ValiderChangements({ user, logout, inactivityTime, priority }) {
    const [changements, setChangements] = useState([]);
    const [formateurs, setFormateurs] = useState([]);
    const [formateurSelectionne, setFormateurSelectionne] = useState('');
    const [filtreStatut, setFiltreStatut] = useState('en_attente');
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [traitement, setTraitement] = useState(false);
    const [statsRoi, setStatsRoi] = useState({
        validations: 0,
        suppressions: 0,
        modifications: 0,
        affectationsNettoyees: 0,
        messagesEnvoyes: 0,
        commandementsEnvoyes: 0
    });
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
    const [formateursVerrouilles, setFormateursVerrouilles] = useState([]); // Liste des formateurs verrouillés par d'autres admins
    const router = useRouter();

    // ✅ FONCTION: Convertir date ISO → format français
    const formatDateFr = (dateISO) => {
        if (!dateISO) return ''
        const [year, month, day] = dateISO.split('-')
        return `${day}-${month}-${year}`
    }

    // Fonction pour récupérer la liste des admins connectés
    const fetchConnectedAdmins = async () => {
        try {
            // Récupérer les sessions actives avec l'email directement
            const { data: sessions, error: sessionsError } = await supabase
                .from('admin_sessions')
                .select('admin_user_id, admin_email, current_page, page_priority, heartbeat')
                .eq('is_active', true)
                .order('heartbeat', { ascending: false });

            if (sessionsError) {
                console.error('❌ Erreur récupération sessions:', sessionsError);
                return;
            }

            if (!sessions || sessions.length === 0) {
                console.log('👥 Aucun admin connecté');
                setConnectedAdmins([]);
                return;
            }

            // Formater les données pour l'affichage - ne garder que ceux avec email valide
            const adminsFormatted = sessions
                .filter(session => session.admin_email) // Filtrer les sessions sans email
                .map(session => ({
                    email: session.admin_email,
                    name: session.admin_email.split('@')[0].charAt(0).toUpperCase() + session.admin_email.split('@')[0].slice(1),
                    currentPage: session.current_page,
                    priority: session.page_priority,
                    lastActive: session.heartbeat
                }));

            setConnectedAdmins(adminsFormatted);
            console.log('👥 Admins connectés:', adminsFormatted);

        } catch (error) {
            console.error('❌ Erreur fetchConnectedAdmins:', error);
        }
    };

    // 🔒 FONCTION: Récupérer les formateurs verrouillés par d'autres admins
    const fetchFormateursVerrouilles = async () => {
        try {
            const { data: sessions, error } = await supabase
                .from('admin_sessions')
                .select('editing_formateur_id, admin_email')
                .eq('is_active', true)
                .not('editing_formateur_id', 'is', null)
                .neq('admin_email', user?.email);

            if (error) {
                console.error('❌ Erreur récupération formateurs verrouillés:', error);
                return;
            }

            if (!sessions || sessions.length === 0) {
                setFormateursVerrouilles([]);
                return;
            }

            // Enrichir avec les noms des formateurs et admins
            const enrichi = sessions.map(lock => {
                const formateur = formateurs.find(f => f.id === lock.editing_formateur_id);
                return {
                    formateur_id: lock.editing_formateur_id,
                    admin_email: lock.admin_email,
                    admin_name: lock.admin_email.split('@')[0].charAt(0).toUpperCase() + lock.admin_email.split('@')[0].slice(1),
                    formateur_nom: formateur ? `${formateur.prenom} ${formateur.nom}` : 'Inconnu'
                };
            });

            setFormateursVerrouilles(enrichi);
            console.log('🔒 Formateurs verrouillés:', enrichi);

        } catch (error) {
            console.error('❌ Erreur fetchFormateursVerrouilles:', error);
        }
    };

    // 🔒 FONCTION: Mettre à jour le verrouillage formateur
    const handleFormateurChange = async (formateurId) => {
        setFormateurSelectionne(formateurId);

        try {
            // Mettre à jour le lock dans admin_sessions
            const { error } = await supabase
                .from('admin_sessions')
                .update({ editing_formateur_id: formateurId || null })
                .eq('admin_email', user?.email)
                .eq('is_active', true);

            if (error) {
                console.error('❌ Erreur update lock formateur:', error);
            } else {
                console.log(`🔒 Lock formateur mis à jour: ${formateurId || 'libéré'}`);
            }
        } catch (error) {
            console.error('❌ Erreur handleFormateurChange:', error);
        }
    };

    useEffect(() => {
        loadFormateurs();
        loadStatsRoi();
    }, []);

    useEffect(() => {
        if (formateurs.length > 0) {
            loadChangements();
        }
    }, [formateurSelectionne, filtreStatut, formateurs]);

    // Auto-sélection du formateur depuis l'URL (navigation depuis messagerie)
    useEffect(() => {
        const { formateur } = router.query;
        if (formateur && formateurs.length > 0 && !formateurSelectionne) {
            console.log('✅ Auto-sélection formateur depuis URL:', formateur);
            setFormateurSelectionne(formateur);
        }
    }, [router.query, formateurs, formateurSelectionne]);

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        // Charger la liste initiale
        fetchConnectedAdmins();
        fetchFormateursVerrouilles();

        // Écouter les changements en temps réel
        const channel = supabase
            .channel('admin_sessions_changes_validation')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_sessions'
                },
                (payload) => {
                    console.log('🔄 Changement admin_sessions détecté, refresh liste admins');
                    fetchConnectedAdmins();
                    fetchFormateursVerrouilles();
                }
            )
            .subscribe();

        // Refresh périodique toutes les 30 secondes
        const refreshInterval = setInterval(() => {
            fetchConnectedAdmins();
            fetchFormateursVerrouilles();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, [user, formateurs]);

    // 🔒 Cleanup: Libérer le verrouillage formateur au unmount
    useEffect(() => {
        return () => {
            if (user?.email) {
                // Libérer le lock à la sortie de la page
                supabase
                    .from('admin_sessions')
                    .update({ editing_formateur_id: null })
                    .eq('admin_email', user.email)
                    .eq('is_active', true)
                    .then(() => console.log('🔓 Lock formateur libéré au unmount'));
            }
        };
    }, [user]);

    // 👑 NOUVELLE FONCTION ROI - COMMUNICATION AVEC SYSTÈMES
    const commanderSystemes = (action, formateurId, dateStr, details = {}) => {
        const commande = {
            action,           // 'retirer_formateur' | 'ajouter_formateur' | 'changer_statut' | 'refresh_complet'
            formateur_id: formateurId,
            date: dateStr,
            timestamp: Date.now(),
            details,          // Infos supplémentaires (type, creneau, etc.)
            roi: 'valider_changements'
        };

        console.log('👑 ROI COMMANDE:', commande);
        
        // Envoyer commande via localStorage
        localStorage.setItem('roiCommande', JSON.stringify(commande));
        
        // Mettre à jour stats
        setStatsRoi(prev => ({
            ...prev,
            commandementsEnvoyes: prev.commandementsEnvoyes + 1
        }));
        
        // Auto-nettoyer la commande après 5 secondes
        setTimeout(() => {
            const currentCommande = localStorage.getItem('roiCommande');
            if (currentCommande) {
                const parsed = JSON.parse(currentCommande);
                if (parsed.timestamp === commande.timestamp) {
                    localStorage.removeItem('roiCommande');
                    console.log('🧹 Commande ROI nettoyée automatiquement');
                }
            }
        }, 5000);

        return commande;
    };

    // 👑 NOUVELLE FONCTION ROI - NETTOYAGE AFFECTATIONS
    const nettoyerAffectations = async (formateurId, dateStr, creneau = null) => {
        console.log(`🧹 ROI NETTOIE : ${formateurId} le ${dateStr} ${creneau || 'tous créneaux'}`);
        
        let affectationsNettoyees = 0;
        let casesModifiees = 0;

        try {
            // 1. NETTOYER planning_hebdomadaire
            let query = supabase
                .from('planning_hebdomadaire')
                .select('*')
                .eq('date', dateStr);
                
            if (creneau) {
                const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
                query = query.eq('creneau', creneauDB);
            }
            
            const { data: plannings, error: planningsError } = await query;
            
            if (planningsError) throw planningsError;

            for (let planning of plannings || []) {
                if (planning.formateurs_ids && planning.formateurs_ids.includes(formateurId)) {
                    const nouveauxFormateurs = planning.formateurs_ids.filter(id => id !== formateurId);
                    
                    const { error: updateError } = await supabase
                        .from('planning_hebdomadaire')
                        .update({ formateurs_ids: nouveauxFormateurs })
                        .eq('id', planning.id);
                        
                    if (updateError) throw updateError;
                    
                    casesModifiees++;
                    console.log(`✅ Retiré de planning_hebdomadaire case ${planning.jour} ${planning.creneau}`);
                }
            }
            
            // 2. NETTOYER planning_formateurs_hebdo
            let deleteQuery = supabase
                .from('planning_formateurs_hebdo')
                .delete()
                .eq('formateur_id', formateurId)
                .eq('date', dateStr);
                
            if (creneau) {
                const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
                deleteQuery = deleteQuery.eq('creneau', creneauDB);
            }
            
            const { data: deleted, error: deleteError } = await deleteQuery.select();
                
            if (deleteError) throw deleteError;
            
            affectationsNettoyees = deleted?.length || 0;
            console.log(`✅ Supprimé ${affectationsNettoyees} affectations planning_formateurs_hebdo`);
            
            // Mettre à jour stats
            setStatsRoi(prev => ({
                ...prev,
                affectationsNettoyees: prev.affectationsNettoyees + affectationsNettoyees
            }));

            return {
                affectationsNettoyees,
                casesModifiees,
                success: true
            };
            
        } catch (error) {
            console.error('❌ Erreur nettoyage affectations:', error);
            throw new Error(`Erreur nettoyage: ${error.message}`);
        }
    };

    // 👑 NOUVELLE FONCTION ROI - MESSAGES AUTOMATIQUES ÉTENDUS (CORRIGÉE)
    const envoyerConfirmationFormateur = async (formateur, absence, action) => {
        try {
            let contenu = '';
            let objet = '';
            
            switch(action) {
                case 'validee':
                    objet = `Absence validée - ${formatDateFr(absence.date_debut)}`;
                    contenu = `Bonjour ${formateur.prenom},\n\nVotre demande d'absence du ${formatDateFr(absence.date_debut)} au ${formatDateFr(absence.date_fin)} a été validée par le coordinateur.\n\nType: ${absence.type}\nVotre planning a été mis à jour automatiquement.\n\nCordialement,\nL'équipe ACLEF`;
                    break;
                case 'supprimee':
                    objet = `Absence supprimée - ${formatDateFr(absence.date_debut)}`;
                    contenu = `Bonjour ${formateur.prenom},\n\nVotre absence du ${formatDateFr(absence.date_debut)} au ${formatDateFr(absence.date_fin)} a été supprimée.\n\nVous redevenez disponible selon votre planning type habituel.\n\nCordialement,\nL'équipe ACLEF`;
                    break;
                case 'modifiee':
                    objet = `Absence modifiée - ${formatDateFr(absence.date_debut)}`;
                    contenu = `Bonjour ${formateur.prenom},\n\nVotre demande d'absence a été modifiée par le coordinateur.\n\nNouveau statut: ${absence.type}\nPériode: ${formatDateFr(absence.date_debut)} au ${formatDateFr(absence.date_fin)}\n\nVotre planning a été mis à jour.\n\nCordialement,\nL'équipe ACLEF`;
                    break;
                default:
                    throw new Error(`Action message inconnue: ${action}`);
            }

            // ✅ CORRECTION : Type contrainte BDD respectée (planning ou messagerie)
            const { error } = await supabase.from('messages').insert({
                expediteur: 'Coordination ACLEF',
                destinataire_id: formateur.id,
                objet: objet,
                contenu: contenu,
                type: 'planning'
            });

            if (error) throw error;

            // Mettre à jour stats
            setStatsRoi(prev => ({
                ...prev,
                messagesEnvoyes: prev.messagesEnvoyes + 1
            }));

            console.log(`📧 Message ${action} envoyé à ${formateur.prenom}`);
            return true;
            
        } catch (error) {
            console.error('❌ Erreur envoi message:', error);
            throw new Error(`Erreur message: ${error.message}`);
        }
    };

    // 👑 ⭐⭐⭐ NOUVELLE FONCTION ÉTAPE 2.6 - CHANGER TYPE ABSENCE ⭐⭐⭐
    const changerTypeAbsence = async (absenceId, nouveauType) => {
        try {
            setTraitement(true);
            setMessage('Changement de type en cours...');

            // Types valides
            const typesValides = ['personnel', 'formation', 'maladie', 'congés'];
            if (!typesValides.includes(nouveauType)) {
                throw new Error('Type invalide');
            }

            // 1. 🔧 Récupérer absence actuelle et formateur
            const { data: absence, error: absenceError } = await supabase
                .from('absences_formateurs')
                .select('*')
                .eq('id', absenceId)
                .single();

            if (absenceError) throw absenceError;
            if (!absence) throw new Error('Absence non trouvée');

            const ancienType = absence.type;
            
            // Ne rien faire si c'est le même type
            if (ancienType === nouveauType) {
                setMessage(`⚠️ Type déjà "${nouveauType}" - Aucun changement nécessaire`);
                return;
            }

            // Récupérer formateur
            const { data: formateur, error: formateurError } = await supabase
                .from('users')
                .select('id, prenom, nom')
                .eq('id', absence.formateur_id)
                .single();

            if (formateurError) throw formateurError;
            if (!formateur) throw new Error('Formateur non trouvé');

            // 2. 👑 METTRE À JOUR TYPE DANS BDD
            const { error: updateError } = await supabase
                .from('absences_formateurs')
                .update({ 
                    type: nouveauType,
                    statut: 'validé'  // Auto-valider lors du changement
                })
                .eq('id', absenceId);

            if (updateError) throw updateError;

            // 3. 👑 LOGIQUE TRANSFORMATION SELON CHANGEMENT
            let messageTransformation = '';

            if (ancienType === 'formation' && nouveauType !== 'formation') {
                // ÉTAIT dispo exceptionnelle → DEVIENT absent
                messageTransformation = `🔄 ${formateur.prenom} : DISPO EXCEPT → ABSENT`;
                
                // Nettoyer affectations (il ne sera plus dispo)
                await nettoyerAffectations(absence.formateur_id, absence.date_debut);
                
                // Commander au coordo de retirer formateur
                commanderSystemes('retirer_formateur', absence.formateur_id, absence.date_debut, {
                    ancienType: 'formation',
                    nouveauType: nouveauType,
                    transformation: 'dispo_except_vers_absent'
                });

            } else if (ancienType !== 'formation' && nouveauType === 'formation') {
                // ÉTAIT absent → DEVIENT dispo exceptionnelle  
                messageTransformation = `🔄 ${formateur.prenom} : ABSENT → DISPO EXCEPT`;
                
                // Commander au coordo d'ajouter formateur (il devient dispo)
                commanderSystemes('ajouter_formateur', absence.formateur_id, absence.date_debut, {
                    ancienType: ancienType,
                    nouveauType: 'formation',
                    transformation: 'absent_vers_dispo_except'
                });

            } else {
                // Changement entre types d'absence (personnel → maladie, etc.)
                messageTransformation = `🔄 ${formateur.prenom} : ${ancienType.toUpperCase()} → ${nouveauType.toUpperCase()}`;
                
                // Reste absent, juste changement de type
                commanderSystemes('changer_statut', absence.formateur_id, absence.date_debut, {
                    ancienType: ancienType,
                    nouveauType: nouveauType,
                    transformation: 'changement_type_absence'
                });
            }

            // 4. 👑 ENVOYER MESSAGE AU FORMATEUR
            const absenceModifiee = { ...absence, type: nouveauType };
            await envoyerConfirmationFormateur(formateur, absenceModifiee, 'modifiee');

            // 5. 👑 METTRE À JOUR STATS ROI
            setStatsRoi(prev => ({
                ...prev,
                modifications: prev.modifications + 1
            }));

            // 6. 👑 MESSAGE DE SUCCÈS DÉTAILLÉ
            setMessage(`Changement de type effectué avec succès !
${messageTransformation}
📧 Message envoyé au formateur
✅ Coordination informée de la modification`);

            // 7. 👑 RECHARGER LES DONNÉES
            await loadChangements();

        } catch (error) {
            console.error('❌ Erreur changement type ROI:', error);
            setMessage(`❌ Erreur: ${error.message}`);
        } finally {
            setTraitement(false);
            setTimeout(() => setMessage(''), 6000);
        }
    };

    // 👑 FONCTION SUPPRESSION ABSENCE (ÉTAPE 2.5)
    const supprimerAbsence = async (absenceId) => {
        try {
            setTraitement(true);
            setMessage('Suppression en cours...');

            // 1. 🔧 Récupérer absence et formateur séparément
            const { data: absence, error: absenceError } = await supabase
                .from('absences_formateurs')
                .select('*')
                .eq('id', absenceId)
                .single();

            if (absenceError) throw absenceError;
            if (!absence) throw new Error('Absence non trouvée');

            // Récupérer formateur séparément
            const { data: formateur, error: formateurError } = await supabase
                .from('users')
                .select('id, prenom, nom')
                .eq('id', absence.formateur_id)
                .single();

            if (formateurError) throw formateurError;
            if (!formateur) throw new Error('Formateur non trouvé');

            // 2. 👑 SUPPRIMER DE BDD
            const { error: deleteError } = await supabase
                .from('absences_formateurs')
                .delete()
                .eq('id', absenceId);

            if (deleteError) throw deleteError;

            // 3. 👑 NETTOYAGE AFFECTATIONS ROI
            const resultatsNettoyage = await nettoyerAffectations(
                absence.formateur_id, 
                absence.date_debut
            );

            // 4. 👑 COMMANDER AU COORDO DE REMETTRE FORMATEUR DISPONIBLE
            commanderSystemes('remettre_disponible', absence.formateur_id, absence.date_debut, {
                type: absence.type,
                date_fin: absence.date_fin,
                motif: absence.motif,
                action: 'suppression',
                affectationsNettoyees: resultatsNettoyage.affectationsNettoyees
            });

            // 5. 👑 ENVOYER MESSAGE AU FORMATEUR
            await envoyerConfirmationFormateur(formateur, absence, 'supprimee');

            // 6. 👑 METTRE À JOUR STATS ROI
            setStatsRoi(prev => ({
                ...prev,
                suppressions: prev.suppressions + 1
            }));

            // 7. 👑 MESSAGE DE SUCCÈS DÉTAILLÉ
            setMessage(`Absence supprimée avec succès pour ${formateur.prenom} !
✅ ${resultatsNettoyage.affectationsNettoyees} affectations nettoyées
✅ ${resultatsNettoyage.casesModifiees} cases planning libérées
📧 Message envoyé au formateur
✅ Coordination informée : formateur remis disponible`);

            // 8. 👑 RECHARGER LES DONNÉES
            await loadChangements();

        } catch (error) {
            console.error('❌ Erreur suppression ROI:', error);
            setMessage(`❌ Erreur: ${error.message}`);
        } finally {
            setTraitement(false);
            setTimeout(() => setMessage(''), 6000);
        }
    };

    // 👑 FONCTION ROI AMÉLIORÉE - VALIDATION AVEC PROPAGATION
    const validerChangement = async (changementId) => {
        try {
            setTraitement(true);
            setMessage('Validation en cours...');

            // 🔧 CORRECTION BDD : Récupérer absence et formateur séparément
            const { data: changement, error: changeError } = await supabase
                .from('absences_formateurs')
                .select('*')
                .eq('id', changementId)
                .single();

            if (changeError) throw changeError;
            if (!changement) throw new Error('Changement non trouvé');

            // Récupérer formateur séparément
            const { data: formateur, error: formateurError } = await supabase
                .from('users')
                .select('id, prenom, nom')
                .eq('id', changement.formateur_id)
                .single();

            if (formateurError) throw formateurError;
            if (!formateur) throw new Error('Formateur non trouvé');

            // 2. Valider = passer à 'validé'
            const { error: updateError } = await supabase
                .from('absences_formateurs')
                .update({ statut: 'validé' })
                .eq('id', changementId);

            if (updateError) throw updateError;

            // 3. 👑 NETTOYAGE ROI si absence (pas si dispo exceptionnelle)
            if (changement.type !== 'formation') {
                await nettoyerAffectations(changement.formateur_id, changement.date_debut);
                
                // 4. 👑 COMMANDER au coordo de retirer le formateur
                commanderSystemes('retirer_formateur', changement.formateur_id, changement.date_debut, {
                    type: changement.type,
                    date_fin: changement.date_fin,
                    motif: changement.motif
                });
            } else {
                // Dispo exceptionnelle -> Commander d'ajouter
                commanderSystemes('ajouter_formateur', changement.formateur_id, changement.date_debut, {
                    type: 'dispo_except',
                    date_fin: changement.date_fin,
                    motif: changement.motif
                });
            }

            // 5. 👑 ENVOYER MESSAGE AU FORMATEUR (avec objet formateur complet)
            const changementAvecFormateur = { ...changement, formateur };
            await envoyerConfirmationFormateur(formateur, changementAvecFormateur, 'validee');

            // 6. Mettre à jour stats
            setStatsRoi(prev => ({
                ...prev,
                validations: prev.validations + 1
            }));

            setMessage(`Changement validé`);
            await loadChangements();

        } catch (error) {
            console.error('❌ Erreur validation ROI:', error);
            setMessage(`❌ Erreur: ${error.message}`);
        } finally {
            setTraitement(false);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    const loadFormateurs = async () => {
        try {
            const { data: formateursData, error } = await supabase
                .from('users')
                .select('id, prenom, nom')
                .eq('role', 'formateur')
                .eq('archive', false)
                .order('prenom');

            if (error) throw error;
            setFormateurs(formateursData || []);
        } catch (error) {
            console.error('Erreur lors du chargement des formateurs:', error);
            setMessage(`Erreur: ${error.message}`);
        }
    };

    const loadStatsRoi = () => {
        // Charger stats depuis localStorage ou BDD
        const savedStats = localStorage.getItem('statsRoi');
        if (savedStats) {
            setStatsRoi(JSON.parse(savedStats));
        }
    };

    // Sauvegarder stats à chaque changement
    useEffect(() => {
        localStorage.setItem('statsRoi', JSON.stringify(statsRoi));
    }, [statsRoi]);

    const loadChangements = async () => {
        try {
            setIsLoading(true);

            let query = supabase
                .from('absences_formateurs')
                .select('*')
                .order('created_at', { ascending: false });

            // Filtrer par formateur si sélectionné
            if (formateurSelectionne) {
                query = query.eq('formateur_id', formateurSelectionne);
            }

            // Filtrer par statut
            if (filtreStatut === 'en_attente') {
                query = query.eq('statut', 'en_attente');
            } else if (filtreStatut === 'archivees') {
                query = query.eq('statut', 'validé');
            }
            // Si "toutes", pas de filtre sur le statut

            const { data: changementsData, error } = await query;

            if (error) throw error;

            // Enrichir avec les noms des formateurs
            const changementsEnrichis = changementsData.map(changement => {
                const formateur = formateurs.find(f => f.id === changement.formateur_id);
                return {
                    ...changement,
                    formateurNom: formateur ? `${formateur.prenom} ${formateur.nom}` : 'Formateur inconnu'
                };
            });

            setChangements(changementsEnrichis || []);
            
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            setMessage(`Erreur: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const validerTous = async () => {
        if (!window.confirm('Valider et archiver tous les changements en attente ?')) return;

        try {
            setTraitement(true);
            setMessage('Traitement de tous les changements...');

            let query = supabase
                .from('absences_formateurs')
                .update({ statut: 'validé' })
                .eq('statut', 'en_attente');

            if (formateurSelectionne) {
                query = query.eq('formateur_id', formateurSelectionne);
            }

            const { error } = await query;

            if (error) throw error;

            // Commander refresh complet
            commanderSystemes('refresh_complet', null, null, {
                action: 'validation_massive',
                filtreFormateur: formateurSelectionne
            });

            setMessage('Tous les changements ont été validés');
            await loadChangements();

        } catch (error) {
            console.error('Erreur:', error);
            setMessage(`❌ Erreur: ${error.message}`);
        } finally {
            setTraitement(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const getTypeDetails = (type) => {
        switch (type) {
            case 'personnel':
                return { 
                    label: 'Absence',
                    couleur: '#ef4444'
                };
            case 'formation':
                return { 
                    label: 'Dispo exceptionnelle',
                    couleur: '#f59e0b'
                };
            case 'maladie':
                return { 
                    label: 'Maladie',
                    couleur: '#dc2626'
                };
            case 'congés':
                return { 
                    label: 'Congés',
                    couleur: '#059669'
                };
            default:
                return { 
                    label: 'Autre',
                    couleur: '#6b7280'
                };
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR');
    };

    // Grouper par formateur
    const changementsParFormateur = changements.reduce((acc, changement) => {
        const formateurId = changement.formateur_id;
        if (!acc[formateurId]) {
            acc[formateurId] = {
                formateur: changement.formateurNom,
                changements: []
            };
        }
        acc[formateurId].changements.push(changement);
        return acc;
    }, {});

    const changementsEnAttente = changements.filter(c => c.statut === 'en_attente').length;
    const changementsArchives = changements.filter(c => c.statut === 'validé').length;

    if (isLoading) {
        return <SkeletonValidationLoader />;
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 60px',
            opacity: 1,
            transition: 'opacity 0.3s ease-in-out'
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
                    <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Validation Changements</span>
                </nav>
                
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
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
                            padding: '6px 16px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        🚪 Déconnexion
                    </button>
                </div>
            </div>

            {/* Bandeau avertissement formateur verrouillé */}
            {formateurSelectionne && formateursVerrouilles.some(v => v.formateur_id === formateurSelectionne) && (
                <div style={{
                    backgroundColor: '#fef3c7',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <span style={{ fontSize: '20px' }}>⚠️</span>
                    <span style={{
                        color: '#92400e',
                        fontSize: '14px',
                        fontWeight: '600'
                    }}>
                        {formateursVerrouilles.find(v => v.formateur_id === formateurSelectionne)?.admin_name} édite les changements de {formateursVerrouilles.find(v => v.formateur_id === formateurSelectionne)?.formateur_nom}. Vous ne pouvez pas le modifier pour le moment.
                    </span>
                </div>
            )}

            {/* Bandeau blanc avec status */}
            <div className="no-print" style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '8px 20px',
                marginBottom: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                {priority && priority < 999 && (
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
                )}

                {/* Liste des autres admins connectés */}
                {connectedAdmins.filter(admin => admin.email !== user?.email).length > 0 && (
                    <>
                        <div style={{
                            width: '1px',
                            height: '24px',
                            backgroundColor: '#e5e7eb'
                        }} />
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
                                    // Pour l'index (messagerie), toujours afficher en vert "consulte la messagerie"
                                    let badgeColor, action, pageName;

                                    if (!admin.currentPage || admin.currentPage === '/' || admin.currentPage === '') {
                                        badgeColor = '#10b981';
                                        action = 'consulte';
                                        pageName = 'la messagerie';
                                    } else {
                                        // Couleur du badge selon la priorité de l'admin sur SA page
                                        badgeColor = admin.priority === 1 ? '#10b981' : admin.priority === 2 ? '#f59e0b' : '#ef4444';
                                        // Action selon la priorité
                                        action = admin.priority === 1 ? 'modifie' : 'consulte';
                                        // Nom de la page formaté
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
                    Validation des Changements
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px' }}>
                    Gérer les demandes de modifications de planning des formateurs
                </p>
            </div>

            {/* Messages */}
            {message && (
                <div style={{
                    backgroundColor: message.includes('❌') ? '#fee2e2' : '#d1fae5',
                    color: message.includes('❌') ? '#991b1b' : '#065f46',
                    padding: '15px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontWeight: '500',
                    textAlign: 'center',
                    whiteSpace: 'pre-line'
                }}>
                    {message}
                </div>
            )}

            {/* Statistiques */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '30px'
            }}>
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '25px',
                    textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '5px', color: '#f59e0b'}}>
                        {changementsEnAttente}
                    </div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>En attente</div>
                </div>

                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '25px',
                    textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '5px', color: '#10b981'}}>
                        {changementsArchives}
                    </div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>Archivées</div>
                </div>

                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '25px',
                    textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{fontSize: '28px', fontWeight: 'bold', marginBottom: '5px', color: '#8b5cf6'}}>
                        {Object.keys(changementsParFormateur).length}
                    </div>
                    <div style={{fontSize: '14px', color: '#6b7280'}}>Formateurs</div>
                </div>
            </div>

            {/* Filtres */}
            <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                padding: '25px',
                marginBottom: '30px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    alignItems: 'end'
                }}>
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                        }}>
                            Formateur :
                        </label>
                        <select
                            value={formateurSelectionne}
                            onChange={(e) => handleFormateurChange(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="">-- Tous les formateurs --</option>
                            {formateurs.map(formateur => {
                                const estVerrouille = formateursVerrouilles.some(v => v.formateur_id === formateur.id);
                                return (
                                    <option
                                        key={formateur.id}
                                        value={formateur.id}
                                        disabled={estVerrouille}
                                    >
                                        {formateur.prenom} {formateur.nom}
                                        {estVerrouille && ' (En cours d\'édition)'}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#374151',
                            marginBottom: '8px'
                        }}>
                            Statut :
                        </label>
                        <select
                            value={filtreStatut}
                            onChange={(e) => setFiltreStatut(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="en_attente">En attente</option>
                            <option value="archivees">Archivées</option>
                            <option value="toutes">Toutes les demandes</option>
                        </select>
                    </div>

                    {filtreStatut === 'en_attente' && changements.length > 0 && (
                        <div>
                            <button
                                onClick={validerTous}
                                disabled={traitement}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontWeight: '600',
                                    fontSize: '14px',
                                    cursor: traitement ? 'not-allowed' : 'pointer',
                                    opacity: traitement ? 0.6 : 1
                                }}
                            >
                                Valider Tout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Liste des changements */}
            {Object.keys(changementsParFormateur).length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    {Object.entries(changementsParFormateur).map(([formateurId, data]) => (
                        <div key={formateurId} style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            
                            {/* En-tête formateur */}
                            <div style={{
                                backgroundColor: '#f9fafb',
                                padding: '20px',
                                borderBottom: '1px solid #e5e7eb',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h3 style={{
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    margin: 0,
                                    color: '#1f2937'
                                }}>
                                    {data.formateur}
                                </h3>
                                <div style={{
                                    backgroundColor: '#ede9fe',
                                    color: '#7c3aed',
                                    padding: '6px 12px',
                                    borderRadius: '20px',
                                    fontSize: '14px',
                                    fontWeight: '500'
                                }}>
                                    {data.changements.length} demande(s)
                                </div>
                            </div>

                            {/* Liste des changements */}
                            <div style={{padding: '20px'}}>
                                {data.changements.map(changement => {
                                    const typeDetails = getTypeDetails(changement.type);
                                    const estPeriode = changement.date_debut !== changement.date_fin;
                                    
                                    return (
                                        <div key={changement.id} style={{
                                            backgroundColor: '#f9fafb',
                                            borderRadius: '8px',
                                            padding: '20px',
                                            marginBottom: '15px',
                                            display: 'grid',
                                            gridTemplateColumns: '1fr auto',
                                            gap: '20px',
                                            alignItems: 'center',
                                            border: '1px solid #e5e7eb'
                                        }}>
                                            <div>
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '10px',
                                                    marginBottom: '10px'
                                                }}>
                                                    <span style={{
                                                        backgroundColor: typeDetails.couleur,
                                                        color: 'white',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '600'
                                                    }}>
                                                        {typeDetails.label}
                                                    </span>
                                                    <span style={{
                                                        backgroundColor: changement.statut === 'en_attente' ? '#fef3c7' : '#d1fae5',
                                                        color: changement.statut === 'en_attente' ? '#92400e' : '#065f46',
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: '600'
                                                    }}>
                                                        {changement.statut === 'en_attente' ? 'En attente' : 'Validée'}
                                                    </span>
                                                </div>
                                                
                                                <div style={{
                                                    fontSize: '16px',
                                                    fontWeight: '600',
                                                    marginBottom: '5px',
                                                    color: '#1f2937'
                                                }}>
                                                    {formatDate(changement.date_debut)}
                                                    {estPeriode && (
                                                        <span> → {formatDate(changement.date_fin)}</span>
                                                    )}
                                                </div>
                                                
                                                <div style={{
                                                    fontSize: '14px',
                                                    color: '#6b7280'
                                                }}>
                                                    Demandé le {formatDate(changement.created_at)}
                                                </div>
                                                
                                                {changement.motif && (
                                                    <div style={{
                                                        fontSize: '14px',
                                                        color: '#374151',
                                                        marginTop: '5px',
                                                        fontStyle: 'italic'
                                                    }}>
                                                        "{changement.motif}"
                                                    </div>
                                                )}
                                            </div>

                                            {/* ⭐⭐⭐ ACTIONS ROI COMPLÈTES - ÉTAPE 2.6 ⭐⭐⭐ */}
                                            <div>
                                                {changement.statut === 'en_attente' ? (
                                                    <div style={{
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '8px'
                                                    }}>
                                                        <button
                                                            onClick={() => validerChangement(changement.id)}
                                                            disabled={traitement}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '10px 20px',
                                                                borderRadius: '8px',
                                                                fontWeight: '600',
                                                                fontSize: '14px',
                                                                cursor: traitement ? 'not-allowed' : 'pointer',
                                                                opacity: traitement ? 0.6 : 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            Valider
                                                        </button>
                                                        <button
                                                            onClick={() => supprimerAbsence(changement.id)}
                                                            disabled={traitement}
                                                            style={{
                                                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                                                color: 'white',
                                                                border: 'none',
                                                                padding: '10px 20px',
                                                                borderRadius: '8px',
                                                                fontWeight: '600',
                                                                fontSize: '14px',
                                                                cursor: traitement ? 'not-allowed' : 'pointer',
                                                                opacity: traitement ? 0.6 : 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: '6px'
                                                            }}
                                                        >
                                                            Supprimer
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div style={{
                                                        backgroundColor: '#d1fae5',
                                                        color: '#065f46',
                                                        padding: '10px 20px',
                                                        borderRadius: '8px',
                                                        textAlign: 'center',
                                                        fontWeight: '600',
                                                        fontSize: '14px'
                                                    }}>
                                                        Validée
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '12px',
                    padding: '60px',
                    textAlign: 'center',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(10px)'
                }}>
                    <div style={{fontSize: '64px', marginBottom: '20px'}}>
                        {filtreStatut === 'en_attente' ? '✅' : '📋'}
                    </div>
                    <h3 style={{
                        fontSize: '24px',
                        fontWeight: '600',
                        marginBottom: '10px',
                        color: '#1f2937'
                    }}>
                        {filtreStatut === 'en_attente' ? 'Aucune demande en attente' : 'Aucun changement trouvé'}
                    </h3>
                    <p style={{fontSize: '16px', color: '#6b7280'}}>
                        {filtreStatut === 'en_attente' 
                            ? 'Toutes les demandes ont été traitées.'
                            : 'Aucune demande ne correspond aux filtres sélectionnés.'
                        }
                    </p>
                </div>
            )}
        </div>
    );
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(ValiderChangements, "Validation Changements");
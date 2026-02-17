import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import { withAuthAdmin } from '../components/withAuthAdmin';
// RÉACTIVATION PROGRESSIVE - Étape 1
import MenuApprenants from '../components/MenuApprenants';
import { isWeekPlusN, genererPlanningDepuisType } from '../lib/planningTypeUtils';

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

// Skeleton Loader spécifique au Planning Coordinateur
const SkeletonPlanningLoader = () => {
  const shimmer = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  };

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @media print {
          .no-print { display: none !important; }
          .no-print * { display: none !important; }
          button { display: none !important; }
          body { background: white !important; }
          .print-title { display: block !important; text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; color: black !important; }
        }
        .print-title { display: none; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '0'
      }}>
        {/* Header Navigation Skeleton */}
        <div className="no-print" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '0 0 12px 12px',
          padding: '8px 20px',
          marginBottom: '10px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backdropFilter: 'blur(10px)',
          position: 'relative'
        }}>
          <div style={{ 
            height: '16px', 
            width: '250px', 
            borderRadius: '4px',
            ...shimmer 
          }} />
          
          <div style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ 
              height: '20px', 
              width: '180px', 
              borderRadius: '4px',
              marginBottom: '4px',
              ...shimmer 
            }} />
          </div>

          <div style={{ 
            height: '32px', 
            width: '80px', 
            borderRadius: '8px',
            ...shimmer 
          }} />
        </div>

        <div className="print-title">
          <div style={{ 
            height: '18px', 
            width: '150px', 
            borderRadius: '4px',
            margin: '0 auto',
            ...shimmer 
          }} />
        </div>

        {/* Bandeau blanc Skeleton */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '20px 20px',
          marginBottom: '10px',
          marginLeft: '20px',
          marginRight: '20px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          height: '60px',
          ...shimmer
        }} />

        {/* Toolbar Skeleton */}
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          borderRadius: '8px',
          padding: '8px 20px',
          marginBottom: '10px',
          marginLeft: '20px',
          marginRight: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <div style={{ 
              height: '30px', 
              width: '140px', 
              borderRadius: '6px',
              ...shimmer 
            }} />
            <div style={{ 
              height: '30px', 
              width: '180px', 
              borderRadius: '6px',
              ...shimmer 
            }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ 
              height: '24px', 
              width: '200px', 
              borderRadius: '4px',
              ...shimmer 
            }} />
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ 
                height: '30px', 
                width: '120px', 
                borderRadius: '6px',
                ...shimmer 
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ 
                height: '30px', 
                width: '110px', 
                borderRadius: '6px',
                ...shimmer 
              }} />
            ))}
          </div>
        </div>

        {/* Planning Table Skeleton */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          margin: '0 20px 20px 20px',
          padding: '15px',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
        }}>
          {/* Table Header Skeleton */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px repeat(5, 1fr)',
            gap: '1px',
            marginBottom: '1px'
          }}>
            <div style={{
              height: '60px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '4px'
            }} />
            {jours.map((jour, i) => (
              <div key={jour} style={{
                height: '60px',
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  height: '14px', 
                  width: '60px', 
                  borderRadius: '4px',
                  marginBottom: '4px',
                  ...shimmer 
                }} />
                <div style={{ 
                  height: '12px', 
                  width: '80px', 
                  borderRadius: '4px',
                  marginBottom: '6px',
                  ...shimmer 
                }} />
                <div style={{ display: 'flex', gap: '3px' }}>
                  <div style={{ 
                    height: '20px', 
                    width: '25px', 
                    borderRadius: '3px',
                    ...shimmer 
                  }} />
                  <div style={{ 
                    height: '20px', 
                    width: '25px', 
                    borderRadius: '3px',
                    ...shimmer 
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Table Rows Skeleton */}
          {['M', 'AM'].map((creneau, creneauIndex) => (
            <div key={creneau} style={{
              display: 'grid',
              gridTemplateColumns: '40px repeat(5, 1fr)',
              gap: '1px',
              marginBottom: '1px'
            }}>
              <div style={{
                height: '200px',
                backgroundColor: creneauIndex === 0 ? '#fef3c7' : '#dbeafe',
                border: '1px solid #e5e7eb',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '11px'
              }}>
                {creneau}
              </div>
              
              {jours.map((jour, dayIndex) => (
                <div key={`${creneau}-${dayIndex}`} style={{
                  height: '200px',
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '4px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  {/* Lieu Select Skeleton */}
                  <div style={{ 
                    height: '28px', 
                    width: '100%', 
                    borderRadius: '4px',
                    ...shimmer 
                  }} />
                  
                  {/* Salarié Select Skeleton */}
                  <div style={{ 
                    height: '28px', 
                    width: '100%', 
                    borderRadius: '4px',
                    ...shimmer 
                  }} />
                  
                  {/* Formateurs Block Skeleton */}
                  <div style={{
                    padding: '6px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <div style={{ 
                      height: '14px', 
                      width: '80px', 
                      borderRadius: '4px',
                      margin: '0 auto 4px',
                      ...shimmer 
                    }} />
                    {[1, 2].map(i => (
                      <div key={i} style={{ 
                        height: '24px', 
                        width: '100%', 
                        borderRadius: '3px',
                        marginBottom: '3px',
                        ...shimmer 
                      }} />
                    ))}
                    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '4px' }}>
                      <div style={{ 
                        height: '20px', 
                        width: '25px', 
                        borderRadius: '3px',
                        ...shimmer 
                      }} />
                      <div style={{ 
                        height: '20px', 
                        width: '25px', 
                        borderRadius: '3px',
                        ...shimmer 
                      }} />
                    </div>
                  </div>
                  
                  {/* Apprenants Block Skeleton */}
                  <div style={{
                    padding: '6px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    border: '1px solid rgba(255, 255, 255, 0.3)'
                  }}>
                    <div style={{ 
                      height: '14px', 
                      width: '80px', 
                      borderRadius: '4px',
                      margin: '0 auto 4px',
                      ...shimmer 
                    }} />
                    <div style={{ 
                      height: '24px', 
                      width: '100%', 
                      borderRadius: '3px',
                      marginBottom: '3px',
                      ...shimmer 
                    }} />
                    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '4px' }}>
                      <div style={{ 
                        height: '20px', 
                        width: '25px', 
                        borderRadius: '3px',
                        ...shimmer 
                      }} />
                      <div style={{ 
                        height: '20px', 
                        width: '25px', 
                        borderRadius: '3px',
                        ...shimmer 
                      }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// Fonction pour calculer la date d'un jour spécifique dans la semaine courante
function getDateOfWeek(dayIndex, currentDate) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    const resultDate = new Date(startOfWeek);
    resultDate.setDate(startOfWeek.getDate() + dayIndex);
    return resultDate.toLocaleDateString('fr-FR');
}

// Fonction pour revenir à la semaine courante
function getCurrentWeekStart() {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + 1);
    return startOfWeek;
}

// Fonction dates UTC pour éviter décalages timezone
function getWeekDates(currentDate) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    
    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        weekDates.push(`${year}-${month}-${day}`);
    }
    return weekDates;
}

// Fonction pour calculer la largeur adaptative des colonnes
function calculateColumnWidth(lieuxParJour) {
    const totalPlages = Object.values(lieuxParJour).reduce((total, lieux) => total + (lieux || []).length, 0);
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
    const availableWidth = screenWidth - 50; // Marge pour la première colonne (25px) et les bordures
    const maxWidth = 180; // Largeur maximale souhaitée
    const minWidth = 120; // Largeur minimale pour lisibilité

    if (totalPlages === 0) return 150; // Valeur réduite pour semaines vierges
    const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, availableWidth / totalPlages));
    return Math.floor(calculatedWidth);
}

function PlanningCoordo({ user, logout, inactivityTime, priority }) {
    const router = useRouter();

    // 🎯 MODE ÉDITION : Seulement le premier admin (vert) peut modifier
    const canEdit = priority === 1;

    // États pour les données de base
    const [salaries, setSalaries] = useState([]);
    const [formateurs, setFormateurs] = useState([]);
    const [apprenants, setApprenants] = useState([]);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [lieux, setLieux] = useState([]);
    const [planningTypes, setPlanningTypes] = useState([]);
    const [absencesValidees, setAbsencesValidees] = useState([]); // Absences formateurs
    const [absencesApprenants, setAbsencesApprenants] = useState([]); // Absences apprenants

    // États pour les données du planning
    const [apprenantsParCase, setApprenantsParCase] = useState({});
    const [formateursParCase, setFormateursParCase] = useState({});
    const [lieuxParJour, setLieuxParJour] = useState({});
    const [lieuxSelectionnes, setLieuxSelectionnes] = useState({});
    const [salariesSelectionnes, setSalariesSelectionnes] = useState({});
    
    // États pour coloration persistante post-enregistrement
    const [couleursEnregistrees, setCouleursEnregistrees] = useState({});

    
    // États de contrôle
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [filtreDisponibilite, setFiltreDisponibilite] = useState('toutes');
    const [showModalOrganisation, setShowModalOrganisation] = useState(false);
    const [seanceSelectionnee, setSeanceSelectionnee] = useState(null);
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
    const [showModalAbsencesApprenants, setShowModalAbsencesApprenants] = useState(false); // Modal absences apprenants
    const [showModalAbsencesFormateurs, setShowModalAbsencesFormateurs] = useState(false); // Modal absences formateurs
    const [showModalFermetures, setShowModalFermetures] = useState(false); // Modal fermetures/jours fériés
    const [fermetures, setFermetures] = useState([]); // Liste des fermetures chargées
    const [nouvelleFermeture, setNouvelleFermeture] = useState({
        date_debut: '',
        date_fin: '',
        creneau: '',
        motif: 'fermeture',
        description: ''
    });

    // États pour la modal Organisation Pédagogique
    const [apprenantSelectionne, setApprenantSelectionne] = useState(null);
    const [associations, setAssociations] = useState([]);
    const [seanceDivisee, setSeanceDivisee] = useState(false);
    const [partieActive, setPartieActive] = useState(1); // 1 ou 2
    const [associationsPartie1, setAssociationsPartie1] = useState([]);
    const [associationsPartie2, setAssociationsPartie2] = useState([]);
    const [messageOrganisation, setMessageOrganisation] = useState(''); // Message de feedback

    // ☆☆☆ NOUVEAUX ÉTATS POUR CONTRÔLE ROI ABSOLU - ÉTAPE 3.1 ☆☆☆
    const [derniereCommande, setDerniereCommande] = useState(null);
    const [commandesTraitees, setCommandesTraitees] = useState(new Set());
    const [statsEcoute, setStatsEcoute] = useState({
        commandesRecues: 0,
        refreshEffectues: 0,
        derniereActivite: null
    });

    // ☆☆☆ HELPER FUNCTIONS POUR IMPRESSION - RÉCUPÉRATION DES NOMS ☆☆☆
    // Helper pour récupérer le nom du lieu
    const getNomLieu = (lieuId) => {
        if (!lieuId) return '';
        const lieu = lieux.find(l => l.id === lieuId);
        return lieu ? lieu.nom : '';
    };

    // Helper pour récupérer le nom du salarié
    const getNomSalarie = (salarieId) => {
        if (!salarieId) return '';
        const salarie = salaries.find(s => s.id === salarieId);
        return salarie ? (salarie.initiales || getInitiales(salarie.prenom, salarie.nom)) : '';
    };

    // Helper pour afficher plusieurs salariés
    const getNomsSalaries = (salariesIds) => {
        if (!salariesIds || salariesIds.length === 0) return 'Aucun salarié';
        return salariesIds
            .filter(id => id)
            .map(id => getNomSalarie(id))
            .filter(nom => nom)
            .join(', ');
    };

    // Helper pour récupérer le nom du formateur
    const getNomFormateur = (formateurId) => {
        if (!formateurId) return '';
        const formateur = formateurs.find(f => f.id === formateurId);
        return formateur ? `${formateur.prenom} ${formateur.nom}` : '';
    };

    // Helper pour récupérer le nom de l'apprenant
    const getNomApprenant = (apprenantId) => {
        if (!apprenantId) return '';
        const apprenant = apprenants.find(a => a.id === apprenantId);
        return apprenant ? `${apprenant.prenom} ${apprenant.nom}` : '';
    };

    // ☆☆☆ FONCTION ROI AMÉLIORÉE - ÉCOUTE ACTIVE COMPLÈTE ☆☆☆
    const ecouterCommandesRoi = () => {
        const interval = setInterval(() => {
            const commande = localStorage.getItem('roiCommande');
            if (commande) {
                try {
                    const parsed = JSON.parse(commande);
                    
                    // Éviter de traiter la même commande plusieurs fois
                    if (!commandesTraitees.has(parsed.timestamp)) {
                        console.log('🤴 PRINCE COORDO reçoit ordre du ROI:', parsed);
                        
                        setDerniereCommande(parsed);
                        setCommandesTraitees(prev => new Set([...prev, parsed.timestamp]));
                        
                        // Traiter immédiatement la commande ROI
                        executerOrdreRoi(parsed);
                        
                        // Mettre à jour stats écoute
                        setStatsEcoute(prev => ({
                            ...prev,
                            commandesRecues: prev.commandesRecues + 1,
                            derniereActivite: new Date().toLocaleTimeString()
                        }));
                    }
                } catch (error) {
                    console.error('❌ Erreur parsing commande ROI:', error);
                }
            }
        }, 500); // Check plus fréquent pour réactivité

        return interval;
    };

    // ☆☆☆ FONCTION ROI PRINCIPALE - EXÉCUTION ORDRES ☆☆☆
    const executerOrdreRoi = async (commande) => {
        try {
            console.log(`🤴 PRINCE exécute ordre: ${commande.action}`);
            
            switch (commande.action) {
                case 'retirer_formateur':
                    await traiterRetirerFormateur(commande);
                    break;
                    
                case 'ajouter_formateur':
                    await traiterAjouterFormateur(commande);
                    break;
                    
                case 'remettre_disponible':
                    await traiterRemettreDisponible(commande);
                    break;
                    
                case 'changer_statut':
                    await traiterChangerStatut(commande);
                    break;
                    
                case 'refresh_complet':
                    await traiterRefreshComplet(commande);
                    break;
                    
                default:
                    console.log(`⚠️ Ordre ROI non reconnu: ${commande.action}`);
            }
            
        } catch (error) {
            console.error('❌ Erreur exécution ordre ROI:', error);
        }
    };

    // ☆☆☆ TRAITEMENTS SPÉCIFIQUES DES ORDRES ROI ☆☆☆
    
    const traiterRetirerFormateur = async (commande) => {
        console.log(`🚫 PRINCE retire formateur ${commande.formateur_id} le ${commande.date}`);
        
        setMessage(`🤴 ROI ORDONNE : Retirer formateur le ${commande.date}
🔄 Refresh automatique des menus...`);
        
        // Refresh immédiat des absences
        await rechargerAbsencesValidees();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterAjouterFormateur = async (commande) => {
        console.log(`✅ PRINCE ajoute formateur ${commande.formateur_id} le ${commande.date}`);
        
        const typeAjout = commande.details?.transformation || 'ajout_standard';
        
        setMessage(`🤴 ROI ORDONNE : Ajouter formateur ${
            typeAjout.includes('dispo_except') ? '(DISPO EXCEPT)' : ''
        } le ${commande.date}
🔄 Refresh automatique des menus...`);
        
        // Refresh immédiat des absences
        await rechargerAbsencesValidees();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterRemettreDisponible = async (commande) => {
        console.log(`🔄 PRINCE remet disponible ${commande.formateur_id} le ${commande.date}`);
        
        setMessage(`🤴 ROI ORDONNE : Formateur remis disponible le ${commande.date}
🔄 Refresh automatique des menus...`);
        
        // Refresh immédiat des absences
        await rechargerAbsencesValidees();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterChangerStatut = async (commande) => {
        console.log(`🔄 PRINCE change statut ${commande.formateur_id} le ${commande.date}`);
        
        const transformation = commande.details?.transformation || 'changement_type';
        
        setMessage(`🤴 ROI ORDONNE : Changement statut (${transformation})
🔄 Refresh automatique des menus...`);
        
        // Refresh immédiat des absences
        await rechargerAbsencesValidees();
        
        setTimeout(() => setMessage(''), 4000);
    };

    const traiterRefreshComplet = async (commande) => {
        console.log('🔄 PRINCE effectue refresh complet sur ordre ROI');
        
        setMessage(`🤴 ROI ORDONNE : Refresh complet des données
🔄 Rechargement total en cours...`);
        
        // Refresh complet de toutes les données
        await rechargerToutesDonnees();
        
        setTimeout(() => setMessage(''), 4000);
    };

    // ☆☆☆ FONCTIONS DE RECHARGEMENT OPTIMISÉES ☆☆☆
    
    const rechargerAbsencesValidees = async () => {
        try {
            console.log('🔄 Rechargement absences validées...');
            
            const { data: absencesRes, error } = await supabase
                .from('absences_formateurs')
                .select('id, formateur_id, date_debut, date_fin, type, statut, creneau, motif')
                .eq('statut', 'validé');
                
            if (error) throw error;
                
            if (absencesRes) {
                console.log(`✅ ${absencesRes.length} absences validées rechargées`);
                setAbsencesValidees(absencesRes);
                
                // Mettre à jour stats
                setStatsEcoute(prev => ({
                    ...prev,
                    refreshEffectues: prev.refreshEffectues + 1
                }));
            }
            
        } catch (error) {
            console.error('❌ Erreur rechargement absences:', error);
        }
    };

    const rechargerToutesDonnees = async () => {
        try {
            console.log('🔄 Rechargement complet données...');
            
            const [absencesFormateursRes, absencesApprenantsRes, planningTypesRes] = await Promise.all([
                supabase.from('absences_formateurs').select('id, formateur_id, date_debut, date_fin, type, statut, creneau, motif').eq('statut', 'validé'),
                supabase.from('absences_apprenants').select('id, apprenant_id, date_debut, date_fin, type, statut, creneau, date_specifique, motif, commentaire').eq('statut', 'actif'),
                supabase.from('planning_type_formateurs').select('id, formateur_id, jour, creneau, statut, lieu_id, valide').eq('valide', true)
            ]);

            if (absencesFormateursRes.data) setAbsencesValidees(absencesFormateursRes.data);
            if (absencesApprenantsRes.data) setAbsencesApprenants(absencesApprenantsRes.data);
            if (planningTypesRes.data) setPlanningTypes(planningTypesRes.data);
            
            console.log('✅ Rechargement complet terminé');
            
            // Mettre à jour stats
            setStatsEcoute(prev => ({
                ...prev,
                refreshEffectues: prev.refreshEffectues + 1
            }));
            
        } catch (error) {
            console.error('❌ Erreur rechargement complet:', error);
        }
    };

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

    // RÉCUPÉRATION DES DONNÉES DE BASE
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [salariesRes, formateursRes, apprenantsRes, lieuxRes, planningTypesRes, absencesFormateursRes, absencesApprenantsRes] = await Promise.all([
                    supabase.from('users').select('id, prenom, nom, role, initiales').eq('role', 'salarié').eq('archive', false),
                    supabase.from('users').select('id, prenom, nom, role').eq('role', 'formateur').eq('archive', false),
                    supabase.from('users').select('id, prenom, nom, role, date_fin_formation_reelle').eq('role', 'apprenant').eq('archive', false),
                    supabase.from('lieux').select('id, nom, couleur, initiale').eq('archive', false),
                    supabase.from('planning_type_formateurs').select('id, formateur_id, jour, creneau, statut, lieu_id, valide').eq('valide', true),
                    supabase.from('absences_formateurs').select('id, formateur_id, date_debut, date_fin, type, statut, creneau, motif').eq('statut', 'validé'),
                    supabase.from('absences_apprenants').select('id, apprenant_id, date_debut, date_fin, type, statut, creneau, date_specifique, motif, commentaire').eq('statut', 'actif')
                ]);

                if (salariesRes.data) setSalaries(salariesRes.data);
                if (formateursRes.data) setFormateurs(formateursRes.data);
                if (apprenantsRes.data) setApprenants(apprenantsRes.data);
                if (lieuxRes.data) setLieux(lieuxRes.data);
                if (planningTypesRes.data) setPlanningTypes(planningTypesRes.data);
                if (absencesFormateursRes.data) setAbsencesValidees(absencesFormateursRes.data);
                if (absencesApprenantsRes.data) setAbsencesApprenants(absencesApprenantsRes.data);
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
            }
        };
        
        fetchData();
    }, []);

    // Charger les fermetures quand l'année change
    useEffect(() => {
        loadFermetures();
    }, [currentDate.getFullYear()]);

    // ☆☆☆ EFFET POUR DÉMARRER L'ÉCOUTE ROI AMÉLIORÉE ☆☆☆
    useEffect(() => {
        console.log('🎧 PRINCE démarre écoute active des ordres du ROI...');
        const interval = ecouterCommandesRoi();

        return () => {
            console.log('🔇 PRINCE arrête écoute des ordres ROI');
            clearInterval(interval);
        };
    }, []); // Pas de dépendances pour écoute continue

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        // Charger la liste initiale
        fetchConnectedAdmins();

        // Écouter les changements en temps réel
        const channel = supabase
            .channel('admin_sessions_changes_coordo')
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
                }
            )
            .subscribe();

        // Refresh périodique toutes les 30 secondes
        const refreshInterval = setInterval(() => {
            fetchConnectedAdmins();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, [user]);

    // ☆☆☆ FONCTION CORRIGÉE - PRIORITÉ DISPO EXCEPTIONNELLE + SUPPORT CRÉNEAUX ☆☆☆
    const isFormateurAbsent = (formateurId, dateStr, creneau = null) => {
        // D'ABORD vérifier s'il a une dispo exceptionnelle (priorité absolue)
        const dispoExcept = absencesValidees.find(absence => {
            if (absence.formateur_id !== formateurId) return false;
            if (absence.type !== 'formation') return false;

            const dateDebut = new Date(absence.date_debut + 'T00:00:00');
            const dateFin = new Date(absence.date_fin + 'T23:59:59');
            const dateCheck = new Date(dateStr + 'T12:00:00');

            const dateMatch = dateCheck >= dateDebut && dateCheck <= dateFin;
            if (!dateMatch) return false;

            // ✅ NOUVEAU: Vérifier créneau si spécifié
            if (creneau && absence.creneau) {
                const creneauDB = creneau === 'Matin' ? 'M' : 'AM';
                return absence.creneau === creneauDB;
            }

            return true;
        });

        // Si dispo exceptionnelle trouvée = PAS absent !
        if (dispoExcept) {
            console.log(`✅ PRIORITÉ DISPO EXCEPT: formateur ${formateurId} disponible le ${dateStr}${creneau ? ' (' + creneau + ')' : ''} !`);
            return false;
        }

        // ENSUITE chercher les vraies absences
        const absenceJour = absencesValidees.find(absence => {
            if (absence.formateur_id !== formateurId) return false;
            if (absence.type === 'formation') return false; // Dispo except n'est pas absence

            const dateDebut = new Date(absence.date_debut + 'T00:00:00');
            const dateFin = new Date(absence.date_fin + 'T23:59:59');
            const dateCheck = new Date(dateStr + 'T12:00:00');

            const dateMatch = dateCheck >= dateDebut && dateCheck <= dateFin;
            if (!dateMatch) return false;

            // ✅ NOUVEAU: Si absence a un créneau spécifique, vérifier correspondance
            if (absence.creneau && creneau) {
                const creneauDB = creneau === 'Matin' ? 'M' : 'AM';
                const creneauMatch = absence.creneau === creneauDB;
                console.log(`🕐 Créneau absence: ${absence.creneau}, créneau actuel: ${creneauDB}, match: ${creneauMatch}`);
                return creneauMatch;
            }

            // ✅ Si absence sans créneau (journée entière), toujours vrai
            if (!absence.creneau) {
                console.log(`📅 Absence journée entière pour ${formateurId} le ${dateStr}`);
                return true;
            }

            // ✅ Si pas de créneau demandé mais absence a un créneau, pas d'absence
            return false;
        });

        if (absenceJour) {
            console.log(`🚫 ${formateurId} absent le ${dateStr}${creneau ? ' (' + creneau + ')' : ''} - retiré par ROI`);
        }

        return !!absenceJour;
    };

    // Fonction dispo exceptionnelle corrigée + SUPPORT CRÉNEAUX
    const hasDispoExceptionnelle = (formateurId, dateStr, creneau = null) => {
        const dispoJour = absencesValidees.find(absence => {
            if (absence.formateur_id !== formateurId) return false;
            if (absence.type !== 'formation') return false;

            const dateDebut = new Date(absence.date_debut + 'T00:00:00');
            const dateFin = new Date(absence.date_fin + 'T23:59:59');
            const dateCheck = new Date(dateStr + 'T12:00:00');

            const dateMatch = dateCheck >= dateDebut && dateCheck <= dateFin;
            if (!dateMatch) return false;

            // ✅ NOUVEAU: Si dispo except a un créneau spécifique, vérifier correspondance
            if (absence.creneau && creneau) {
                const creneauDB = creneau === 'Matin' ? 'M' : 'AM';
                const creneauMatch = absence.creneau === creneauDB;
                console.log(`🕐 Créneau dispo except: ${absence.creneau}, créneau actuel: ${creneauDB}, match: ${creneauMatch}`);
                return creneauMatch;
            }

            // ✅ Si dispo except sans créneau (journée entière), toujours vrai
            if (!absence.creneau) {
                console.log(`📅 Dispo exceptionnelle journée entière pour ${formateurId} le ${dateStr}`);
                return true;
            }

            // ✅ Si pas de créneau demandé mais dispo a un créneau, pas de dispo
            return false;
        });

        return !!dispoJour;
    };

    // Fonction de filtrage des formateurs disponibles
    const getFormateursDisponibles = (jour, creneau, lieuId) => {
        const creneauDB = creneau === 'Matin' ? 'Matin' : 'AM';
        
        if (!jour || !creneau) {
            return formateurs.map(f => ({ ...f, statut: null }));
        }

        const dayIndex = jours.indexOf(jour);
        const weekDates = getWeekDates(currentDate);
        const dateStr = weekDates[dayIndex];

        // ☆☆☆ PRIORITÉ ABSOLUE : DISPO EXCEPTIONNELLES D'ABORD + SUPPORT CRÉNEAUX ☆☆☆
        const formateursDispoExceptionnelle = formateurs
            .filter(f => hasDispoExceptionnelle(f.id, dateStr, creneau))
            .map(f => ({
                ...f,
                statut: 'dispo_except',
                lieuSpecifique: false,
                source: 'exception_validee_priorite_absolue'
            }));

        console.log(`🎯 Dispo exceptionnelles trouvées pour ${dateStr}:`, formateursDispoExceptionnelle.map(f => f.prenom));

        const formateursAvecPlanningType = planningTypes.filter(pt => {
            const jourMatch = pt.jour === jour;
            const creneauMatch = pt.creneau === creneauDB;
            
            let statutValide = false;
            if (filtreDisponibilite === 'disponible') {
                statutValide = pt.statut === 'disponible';
            } else if (filtreDisponibilite === 'exceptionnelles') {
                statutValide = pt.statut === 'dispo_except';
            } else if (filtreDisponibilite === 'toutes') {
                statutValide = pt.statut === 'disponible' || pt.statut === 'dispo_except';
            }
            
            if (!jourMatch || !creneauMatch || !statutValide) {
                return false;
            }
            
            if (pt.lieu_id === null) {
                return true;
            } else if (lieuId) {
                return pt.lieu_id === lieuId;
            } else {
                return false;
            }
        });

        const formateursAvecPlanningTypeIds = formateursAvecPlanningType.map(pt => pt.formateur_id);
        
        const formateursAvecPlanningTypeTotal = planningTypes.map(pt => pt.formateur_id);
        const formateursSansPlanningType = formateurs.filter(f => 
            !formateursAvecPlanningTypeTotal.includes(f.id)
        );

        const formateursDisponiblesPlanningType = formateurs.filter(f => 
            formateursAvecPlanningTypeIds.includes(f.id)
        ).map(f => {
            const planningType = formateursAvecPlanningType.find(pt => pt.formateur_id === f.id);
            
            // ☆☆☆ LOGIQUE ROI - ABSENCE GAGNE TOUJOURS + SUPPORT CRÉNEAUX ☆☆☆
            if (isFormateurAbsent(f.id, dateStr, creneau)) {
                console.log(`🚫 ${f.prenom} absent le ${dateStr} (${creneau}) - retiré par ROI`);
                return null;
            }
            
            // ☆☆☆ LOGIQUE ROI - DISPO EXCEPT PRIORITAIRE + SUPPORT CRÉNEAUX ☆☆☆
            if (hasDispoExceptionnelle(f.id, dateStr, creneau)) {
                console.log(`✅ ${f.prenom} dispo exceptionnelle le ${dateStr} (${creneau}) - ajouté par ROI`);
                return {
                    ...f,
                    statut: 'dispo_except',
                    lieuSpecifique: false,
                    source: 'exception_validee_roi'
                };
            }
            
            return { 
                ...f, 
                statut: planningType ? planningType.statut : null,
                lieuSpecifique: planningType && planningType.lieu_id ? true : false,
                source: 'planning_type'
            };
        }).filter(f => f !== null);

        // ☆☆☆ LOGIQUE ROI CORRIGÉE - DISPO EXCEPT TOUJOURS TRAITÉES + SUPPORT CRÉNEAUX ☆☆☆
        const formateursSansPlanningAvecStatut = (filtreDisponibilite === 'toutes' || filtreDisponibilite === 'exceptionnelles')
            ? formateursSansPlanningType.filter(f => !isFormateurAbsent(f.id, dateStr, creneau))
                .map(f => {
                    // ☆☆☆ LOGIQUE ROI - DISPO EXCEPT MÊME SANS PLANNING TYPE + SUPPORT CRÉNEAUX ☆☆☆
                    if (hasDispoExceptionnelle(f.id, dateStr, creneau)) {
                        console.log(`✅ ${f.prenom} dispo exceptionnelle le ${dateStr} (${creneau}, sans planning) - ajouté par ROI`);
                        return {
                            ...f,
                            statut: 'dispo_except',
                            lieuSpecifique: false,
                            source: 'exception_validee_roi'
                        };
                    }
                    
                    // Si filtre = 'exceptionnelles' ET pas de dispo except = exclure
                    if (filtreDisponibilite === 'exceptionnelles') {
                        return null; // Sera filtré
                    }
                    
                    return { 
                        ...f, 
                        statut: null,
                        lieuSpecifique: false,
                        source: 'aucun_planning'
                    };
                }).filter(f => f !== null)
            : [];

        // 🆕 NOUVELLE LOGIQUE : Exclusion formateurs déjà assignés sur le même créneau
        const formateursAvecExclusion = [...formateursDisponiblesPlanningType, ...formateursSansPlanningAvecStatut]
            .filter(formateur => {
                // Vérifier si ce formateur est déjà assigné sur le même jour/créneau dans un autre lieu
                const estDejaAssigne = Object.keys(formateursParCase).some(cellKey => {
                    // Décomposer la cellKey: "dayIndex-lieuIndex-creneau"
                    const [dayIdx, lieuIdx, creneauKey] = cellKey.split('-');
                    const cellDayIndex = parseInt(dayIdx);
                    const cellCreneau = creneauKey;
                    
                    // Vérifier si c'est le même jour et créneau
                    const currentDayIndex = jours.indexOf(jour);
                    const memeJour = cellDayIndex === currentDayIndex;
                    const memeCreneau = cellCreneau === creneau;
                    
                    if (memeJour && memeCreneau) {
                        // Vérifier si le formateur est assigné dans cette case
                        const formateursAssignes = formateursParCase[cellKey] || [];
                        const estAssigneDansCetteCase = formateursAssignes.includes(formateur.id);
                        
                        // Si assigné dans cette case, on doit vérifier si c'est pour le même lieu
                        if (estAssigneDansCetteCase) {
                            // Récupérer le lieu_id de la cellule où le formateur est assigné
                            const cellLieuId = lieuxSelectionnes[cellKey];
                            
                            // Si c'est un lieu différent, alors c'est une exclusion
                            // On compare les lieu_id directement, pas les indices
                            return cellLieuId !== lieuId;
                        }
                    }
                    
                    return false;
                });
                
                if (estDejaAssigne) {
                    console.log(`🚫 ${formateur.prenom} exclu - déjà assigné ${jour} ${creneau} ailleurs`);
                }
                
                return !estDejaAssigne;
            });

        // ☆☆☆ PRIORITÉ ABSOLUE : DISPO EXCEPT D'ABORD, PUIS LES AUTRES ☆☆☆
        
        // Séparer les dispo exceptionnelles des autres
        const dispoExceptFiltered = formateursDispoExceptionnelle.filter(f => {
            // Les dispo except ne sont PAS soumises au filtre disponibilité
            if (filtreDisponibilite === 'disponible') return false; // Exclure si filtre = "disponible"
            return true; // Toujours inclure pour "toutes" et "exceptionnelles"
        });

        // Autres formateurs (sans dispo except pour éviter doublons)  
        const autresFormateurs = formateursAvecExclusion.filter(f => 
            !formateursDispoExceptionnelle.some(dispo => dispo.id === f.id)
        );

        console.log(`🎯 FINAL - Dispo except: ${dispoExceptFiltered.length}, Autres: ${autresFormateurs.length}`);
        
        return [...dispoExceptFiltered, ...autresFormateurs];
    };

    // CHARGEMENT DU PLANNING
    const loadWeekPlanning = async (targetDate) => {
        try {
            const weekDates = getWeekDates(targetDate);
            
            const { data: planningData, error } = await supabase
                .from('planning_hebdomadaire')
                .select('*')
                .in('date', weekDates)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Erreur lors du chargement:', error);
                return;
            }

            const newApprenantsParCase = {};
            const newFormateursParCase = {};
            const newLieuxSelectionnes = {};
            const newSalariesSelectionnes = {};
            const newLieuxParJour = {};

            // ⭐ CORRECTION : Reconstruction des indices depuis les données BDD
            jours.forEach((jour, dayIndex) => {
                // Extraire tous les lieu_index uniques pour ce jour
                const indicesUtilises = new Set();
                
                if (planningData && planningData.length > 0) {
                    planningData.forEach(item => {
                        if (item.jour === jour) {
                            const lieuIndex = item.lieu_index || 0;
                            indicesUtilises.add(lieuIndex);
                        }
                    });
                }
                
                // Si aucune donnée, initialiser avec [0] par défaut
                if (indicesUtilises.size === 0) {
                    newLieuxParJour[dayIndex] = [0];
                } else {
                    // Convertir en array trié
                    newLieuxParJour[dayIndex] = Array.from(indicesUtilises).sort((a, b) => a - b);
                }
            });

            // Initialiser les structures pour TOUS les indices trouvés
            jours.forEach((_, dayIndex) => {
                newLieuxParJour[dayIndex].forEach(lieuIndex => {
                    ['Matin', 'AM'].forEach((creneau) => {
                        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
                        newApprenantsParCase[key] = [];
                        newFormateursParCase[key] = [];
                        newLieuxSelectionnes[key] = "";
                        newSalariesSelectionnes[key] = [];
                    });
                });
            });

            if (planningData && planningData.length > 0) {
                planningData.forEach(item => {
                    const dayIndex = jours.indexOf(item.jour);
                    if (dayIndex !== -1) {
                        const creneau = item.creneau === 'matin' ? 'Matin' : 'AM';
                        const lieuIndex = item.lieu_index || 0;
                        const key = `${dayIndex}-${lieuIndex}-${creneau}`;

                        if (item.formateurs_ids && item.formateurs_ids.length > 0) {
                            newFormateursParCase[key] = item.formateurs_ids.filter(id => id);
                        }
                        if (item.apprenants_ids && item.apprenants_ids.length > 0) {
                            newApprenantsParCase[key] = item.apprenants_ids.filter(id => id);
                        }
                        if (item.lieu_id) {
                            newLieuxSelectionnes[key] = item.lieu_id;
                        }
                        // Support du nouveau format avec tableau
                        if (item.salaries_ids && Array.isArray(item.salaries_ids) && item.salaries_ids.length > 0) {
                            newSalariesSelectionnes[key] = item.salaries_ids.filter(id => id);
                        }
                        // Compatibilité ancien format (single salarie_id)
                        else if (item.salarie_id) {
                            newSalariesSelectionnes[key] = [item.salarie_id];
                        }
                    }
                });
            }

            // ✨ PRÉ-REMPLISSAGE S+1 à S+3 : Si semaine future (jusqu'à 3 semaines) et cases vides, compléter depuis planning type
            let weekOffset = 0;
            for (let n = 1; n <= 3; n++) {
                if (isWeekPlusN(targetDate, n)) {
                    weekOffset = n;
                    break;
                }
            }

            if (weekOffset > 0) {
                const hasData = Object.values(newFormateursParCase).some(arr => arr.length > 0) ||
                               Object.values(newApprenantsParCase).some(arr => arr.length > 0);

                if (!hasData) {
                    const planningType = await genererPlanningDepuisType(weekDates, absencesValidees, absencesApprenants);

                    if (planningType) {
                        // Fusionner les données du planning type
                        Object.keys(planningType.formateursParCase).forEach(key => {
                            if (!newFormateursParCase[key] || newFormateursParCase[key].length === 0) {
                                newFormateursParCase[key] = planningType.formateursParCase[key];
                            }
                        });
                        Object.keys(planningType.apprenantsParCase).forEach(key => {
                            if (!newApprenantsParCase[key] || newApprenantsParCase[key].length === 0) {
                                newApprenantsParCase[key] = planningType.apprenantsParCase[key];
                            }
                        });
                        Object.keys(planningType.lieuxSelectionnes).forEach(key => {
                            if (!newLieuxSelectionnes[key]) {
                                newLieuxSelectionnes[key] = planningType.lieuxSelectionnes[key];
                            }
                        });
                        Object.keys(planningType.lieuxParJour).forEach(dayIndex => {
                            if (!newLieuxParJour[dayIndex] || newLieuxParJour[dayIndex].length <= 1) {
                                newLieuxParJour[dayIndex] = planningType.lieuxParJour[dayIndex];
                            }
                        });

                        // Copier les salariés depuis la semaine en cours (S+0)
                        const currentWeekDates = getWeekDates(new Date());
                        const { data: currentWeekData } = await supabase
                            .from('planning_hebdomadaire')
                            .select('jour, creneau, lieu_id, salaries_ids')
                            .in('date', currentWeekDates)
                            .not('salaries_ids', 'is', null);

                        if (currentWeekData && currentWeekData.length > 0) {
                            currentWeekData.forEach(item => {
                                if (!item.salaries_ids || item.salaries_ids.length === 0) return;
                                const dayIndex = jours.indexOf(item.jour);
                                if (dayIndex === -1) return;
                                const creneau = item.creneau === 'matin' ? 'Matin' : 'AM';

                                // Trouver la cellule correspondante (même jour + créneau + lieu)
                                const matchingKey = Object.keys(newLieuxSelectionnes).find(key => {
                                    const parts = key.split('-');
                                    return parseInt(parts[0]) === dayIndex
                                        && parts[2] === creneau
                                        && newLieuxSelectionnes[key] === item.lieu_id;
                                });

                                if (matchingKey && (!newSalariesSelectionnes[matchingKey] || newSalariesSelectionnes[matchingKey].length === 0)) {
                                    newSalariesSelectionnes[matchingKey] = item.salaries_ids.filter(id => id);
                                }
                            });
                        }

                        setMessage(`Planning pré-rempli depuis planning type (S+${weekOffset})`);
                        setTimeout(() => setMessage(''), 4000);
                    }
                }
            }

            setApprenantsParCase(newApprenantsParCase);
            setFormateursParCase(newFormateursParCase);
            setLieuxSelectionnes(newLieuxSelectionnes);
            setSalariesSelectionnes(newSalariesSelectionnes);
            setLieuxParJour(newLieuxParJour);
            setDataLoaded(true);

        } catch (error) {
            console.error('Erreur lors du chargement du planning:', error);
        }
    };

    useEffect(() => {
        if (lieux.length >= 0 && salaries.length > 0 && formateurs.length > 0 && apprenants.length > 0) {
            setDataLoaded(false);
            loadWeekPlanning(currentDate);
        }
    }, [currentDate, lieux, salaries, formateurs, apprenants]);

    // NOUVEAU : Recalculer couleurs enregistrées après chargement des données
    useEffect(() => {
        if (dataLoaded && lieux.length > 0) {
            const couleursRestaurees = calculerCouleursEnregistrees();
            setCouleursEnregistrees(couleursRestaurees);
        }
    }, [dataLoaded, formateursParCase, apprenantsParCase, lieuxSelectionnes, lieuxParJour, lieux]);

    // Hook pour détecter l'impression et changer les couleurs
    useEffect(() => {
        const handleBeforePrint = () => {
            // Forcer le fond blanc avant impression
            const mainContainer = document.querySelector('div[style*="linear-gradient(135deg, #667eea"]');
            if (mainContainer) {
                mainContainer.style.background = 'white';
                mainContainer.style.backgroundImage = 'none';
            }
            
            // Forcer tous les conteneurs avec gradient
            const allGradients = document.querySelectorAll('div[style*="linear-gradient"]');
            allGradients.forEach(el => {
                el.style.background = 'white';
                el.style.backgroundImage = 'none';
            });
        };
        
        const handleAfterPrint = () => {
            // Remettre les couleurs après impression
            const mainContainer = document.querySelector('div[style*="background: white"]');
            if (mainContainer) {
                mainContainer.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            }
            
            // Recharger la page pour remettre tous les styles d'origine
            window.location.reload();
        };
        
        // Écouter les événements d'impression
        window.addEventListener('beforeprint', handleBeforePrint);
        window.addEventListener('afterprint', handleAfterPrint);
        
        // Cleanup
        return () => {
            window.removeEventListener('beforeprint', handleBeforePrint);
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, []);

    // ═══════════════════════════════════════════════════════════════
    // CHARGEMENT DES ASSOCIATIONS AU DÉMARRAGE DE LA MODAL
    // ═══════════════════════════════════════════════════════════════
    useEffect(() => {
        if (showModalOrganisation && seanceSelectionnee && formateurs.length > 0 && salaries.length > 0 && apprenants.length > 0) {
            const loadAssociations = async () => {
                const assocs = await chargerAssociations(
                    seanceSelectionnee.date,
                    seanceSelectionnee.creneau,
                    seanceSelectionnee.lieu_id
                );

                // Charger selon si séance divisée ou non
                if (assocs.partie1.length > 0 || assocs.partie2.length > 0) {
                    // Séance divisée
                    setSeanceDivisee(true);
                    setAssociationsPartie1(assocs.partie1);
                    setAssociationsPartie2(assocs.partie2);
                    setAssociations([]);
                } else {
                    // Séance normale
                    setSeanceDivisee(false);
                    setAssociations(assocs.normales);
                    setAssociationsPartie1([]);
                    setAssociationsPartie2([]);
                }
            };

            loadAssociations();
        }
    }, [showModalOrganisation, seanceSelectionnee, formateurs, salaries, apprenants]);
    // ═══════════════════════════════════════════════════════════════

    // 🆕 NETTOYAGE AUTOMATIQUE DES APPRENANTS ABSENTS
    useEffect(() => {
        if (!dataLoaded || !absencesApprenants || absencesApprenants.length === 0) return;

        const weekDates = getWeekDates(currentDate);
        let hasChanges = false;
        const newApprenantsParCase = { ...apprenantsParCase };

        Object.keys(apprenantsParCase).forEach(cellKey => {
            const [dayIndex, lieuIndex, creneau] = cellKey.split('-');
            const dateStr = weekDates[parseInt(dayIndex)];
            const apprenantsIds = apprenantsParCase[cellKey] || [];

            // Filtrer les apprenants absents
            const apprenantsNonAbsents = apprenantsIds.filter(apprenantId => {
                if (!apprenantId) return false;

                const dateCheck = new Date(dateStr);
                const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';

                // Vérifier absence période
                const absencePeriode = absencesApprenants.find(abs =>
                    abs.type === 'absence_periode' &&
                    abs.apprenant_id === apprenantId &&
                    new Date(abs.date_debut) <= dateCheck &&
                    new Date(abs.date_fin) >= dateCheck
                );

                if (absencePeriode) {
                    console.log(`🧹 Apprenant ${apprenantId} absent (période) le ${dateStr}`);
                    return false;
                }

                // Vérifier absence ponctuelle
                const absencePonctuelle = absencesApprenants.find(abs =>
                    abs.type === 'absence_ponctuelle' &&
                    abs.apprenant_id === apprenantId &&
                    abs.date_specifique === dateStr &&
                    abs.creneau === creneauDB
                );

                if (absencePonctuelle) {
                    console.log(`🧹 Apprenant ${apprenantId} absent (ponctuel) le ${dateStr} ${creneau}`);
                    return false;
                }

                return true; // Apprenant présent
            });

            // Si la liste a changé, mettre à jour
            if (apprenantsNonAbsents.length !== apprenantsIds.length) {
                newApprenantsParCase[cellKey] = apprenantsNonAbsents;
                hasChanges = true;
                console.log(`🧹 Nettoyage apprenants absents ${cellKey}: ${apprenantsIds.length} → ${apprenantsNonAbsents.length}`);
            }
        });

        if (hasChanges) {
            setApprenantsParCase(newApprenantsParCase);
        }
    }, [dataLoaded, absencesApprenants, currentDate]);
    // ═══════════════════════════════════════════════════════════════

    // FONCTION POUR VIDER LE PLANNING D'UNE SEMAINE
    const viderPlanningSemaine = () => {
        // Vérifier que c'est une semaine future (au moins S+1)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lundiSemaine = new Date(currentDate);
        lundiSemaine.setDate(currentDate.getDate() - currentDate.getDay() + 1);
        lundiSemaine.setHours(0, 0, 0, 0);

        const lundiActuel = new Date(today);
        lundiActuel.setDate(today.getDate() - today.getDay() + 1);

        if (lundiSemaine <= lundiActuel) {
            alert('⚠️ Vous ne pouvez vider que les semaines futures (S+1 et au-delà).');
            return;
        }

        // Double confirmation
        if (!confirm(`⚠️ Vider le planning de la semaine ${semaine} ?\n\nTous les formateurs, apprenants et lieux seront retirés.\nCette action n'est pas enregistrée tant que vous ne cliquez pas sur "Enregistrer".`)) {
            return;
        }

        if (!confirm(`🔴 CONFIRMATION FINALE\n\nÊtes-vous vraiment sûr de vouloir vider la semaine ${semaine} ?\n\nCliquez sur OK pour confirmer.`)) {
            return;
        }

        // Vider tous les états du planning
        setFormateursParCase({});
        setApprenantsParCase({});
        setLieuxSelectionnes({});
        setSalariesSelectionnes({});

        // Remettre les lieux par jour à vide (juste l'index 0 par défaut)
        const lieuxParJourVide = {};
        for (let i = 0; i < 5; i++) {
            lieuxParJourVide[i] = [0];
        }
        setLieuxParJour(lieuxParJourVide);

        setMessage(`🗑️ Planning de la semaine ${semaine} vidé. Cliquez sur "Enregistrer" pour sauvegarder.`);
        setTimeout(() => setMessage(''), 6000);
    };

    // FONCTIONS DE SAUVEGARDE
    const handleEnregistrerBrouillon = async () => {
        setIsLoading(true);
        
        try {
            const weekDates = getWeekDates(currentDate);
            const stats = await sauvegarderPlanning('brouillon', weekDates);

            // NOUVEAU : Appliquer coloration persistante après sauvegarde réussie
            const nouvellesCouleursEnregistrees = calculerCouleursEnregistrees();
            setCouleursEnregistrees(nouvellesCouleursEnregistrees);

            setMessage(`📝 Brouillon semaine ${semaine} enregistré !
${stats.creneaux} créneaux • ${stats.formateursAfectes} formateurs`);
            setTimeout(() => setMessage(''), 5000);

        } catch (error) {
            console.error('Erreur lors de l\'enregistrement:', error);
            setMessage(`⚠️ Erreur: ${error.message}`);
            setTimeout(() => setMessage(''), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    const handleValiderTransmettre = async () => {
        if (!window.confirm('Valider et transmettre le planning ? Les formateurs recevront des notifications.')) return;
        
        setIsLoading(true);
        
        try {
            const weekDates = getWeekDates(currentDate);
            const stats = await sauvegarderPlanning('validé', weekDates);

            // NOUVEAU : Appliquer coloration persistante après sauvegarde réussie
            const nouvellesCouleursEnregistrees = calculerCouleursEnregistrees();
            setCouleursEnregistrees(nouvellesCouleursEnregistrees);

            await envoyerMessagesValidation(stats, semaine, weekDates);

            setMessage(`✅ Planning semaine ${semaine} validé et transmis !
${stats.creneaux} créneaux • ${stats.formateursAfectes} formateurs affectés
📧 Messages envoyés aux formateurs`);
            setTimeout(() => setMessage(''), 8000);

        } catch (error) {
            console.error('Erreur lors de la validation:', error);
            setMessage(`⚠️ Erreur: ${error.message}`);
            setTimeout(() => setMessage(''), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour valider seulement les modifications
    const handleValiderModifications = async () => {
        if (!window.confirm('Valider les modifications ? Seuls les formateurs modifiés recevront des notifications.')) return;

        setIsLoading(true);

        try {
            const weekDates = getWeekDates(currentDate);

            // 1. Récupérer l'état actuel en base
            const { data: planningActuel } = await supabase
                .from('planning_hebdomadaire')
                .select('*')
                .in('date', weekDates);

            // 2. Identifier les formateurs modifiés
            const formateursModifies = await identifierFormateursModifies(planningActuel, weekDates);

            // 3. Sauvegarder le planning
            const stats = await sauvegarderPlanning('validé', weekDates);

            // 4. Appliquer coloration persistante
            const nouvellesCouleursEnregistrees = calculerCouleursEnregistrees();
            setCouleursEnregistrees(nouvellesCouleursEnregistrees);

            // 5. Envoyer messages seulement aux formateurs modifiés
            if (formateursModifies.length > 0) {
                await envoyerMessagesModifications(formateursModifies, semaine, weekDates);
            }

            setMessage(`✅ Modifications validées !
${stats.creneaux} créneaux • ${formateursModifies.length} formateur(s) modifié(s)
📧 Messages envoyés aux formateurs modifiés`);
            setTimeout(() => setMessage(''), 8000);

        } catch (error) {
            console.error('Erreur lors de la validation des modifications:', error);
            setMessage(`⚠️ Erreur: ${error.message}`);
            setTimeout(() => setMessage(''), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour identifier les formateurs modifiés
    const identifierFormateursModifies = async (planningActuel, weekDates) => {
        const formateursModifies = new Set();

        // Créer un map des données actuelles en base
        const planningActuelMap = {};
        if (planningActuel) {
            planningActuel.forEach(item => {
                const key = `${item.jour}-${item.lieu_index}-${item.creneau}`;
                planningActuelMap[key] = item;
            });
        }

        // Comparer avec l'état en cours d'édition
        jours.forEach((jour, dayIndex) => {
            (lieuxParJour[dayIndex] || []).forEach((lieuIndex) => {
                ['Matin', 'AM'].forEach((creneau) => {
                    const key = `${dayIndex}-${lieuIndex}-${creneau}`;
                    const keyDB = `${jour}-${lieuIndex}-${creneau === 'Matin' ? 'matin' : 'AM'}`;

                    const formateursActuels = (formateursParCase[key] || []).filter(id => id !== "");
                    const planningDB = planningActuelMap[keyDB];
                    const formateursDB = planningDB?.formateurs_ids || [];

                    // Comparer les listes de formateurs
                    const sontDifferents = JSON.stringify(formateursActuels.sort()) !== JSON.stringify(formateursDB.sort());

                    if (sontDifferents) {
                        formateursActuels.forEach(id => formateursModifies.add(id));
                        formateursDB.forEach(id => formateursModifies.add(id));
                    }
                });
            });
        });

        return Array.from(formateursModifies);
    };

    // Fonction envoi messages pour modifications
    const envoyerMessagesModifications = async (formateursModifies, semaine, weekDates) => {
        try {
            const { data: affectations } = await supabase
                .from('planning_formateurs_hebdo')
                .select('formateur_id, date, creneau, lieu_nom')
                .in('date', weekDates)
                .in('formateur_id', formateursModifies)
                .eq('statut', 'attribue');

            if (affectations && affectations.length > 0) {
                const affectationsParFormateur = {};
                affectations.forEach(aff => {
                    if (!affectationsParFormateur[aff.formateur_id]) {
                        affectationsParFormateur[aff.formateur_id] = [];
                    }
                    affectationsParFormateur[aff.formateur_id].push(aff);
                });

                for (const [formateurId, affectationsFormateur] of Object.entries(affectationsParFormateur)) {
                    const formateur = formateurs.find(f => f.id === formateurId);
                    if (formateur) {
                        const creneauxDetail = affectationsFormateur.map(aff =>
                            `${aff.date} ${aff.creneau} à ${aff.lieu_nom}`
                        ).join('\n');

                        await supabase.from('messages').insert({
                            expediteur: 'Coordination ACLEF',
                            destinataire_id: formateurId,
                            objet: `Planning modifié - semaine ${semaine}`,
                            contenu: `Bonjour ${formateur.prenom},\n\nVotre planning pour la semaine ${semaine} a été modifié.\n\nVos nouveaux créneaux :\n${creneauxDetail}\n\nMerci de votre engagement !\n\nCordialement,\nL'équipe ACLEF`,
                            type_expediteur: 'admin'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Erreur envoi messages modifications:', error);
            throw error;
        }
    };

    // Fonction envoi messages validation
    const envoyerMessagesValidation = async (stats, semaine, weekDates) => {
        try {
            const { data: affectations } = await supabase
                .from('planning_formateurs_hebdo')
                .select('formateur_id, date, creneau, lieu_nom')
                .in('date', weekDates)
                .eq('statut', 'attribue');

            if (affectations && affectations.length > 0) {
                const affectationsParFormateur = {};
                affectations.forEach(aff => {
                    if (!affectationsParFormateur[aff.formateur_id]) {
                        affectationsParFormateur[aff.formateur_id] = [];
                    }
                    affectationsParFormateur[aff.formateur_id].push(aff);
                });

                for (const [formateurId, affectationsFormateur] of Object.entries(affectationsParFormateur)) {
                    const formateur = formateurs.find(f => f.id === formateurId);
                    if (formateur) {
                        const creneauxDetail = affectationsFormateur.map(aff => 
                            `${aff.date} ${aff.creneau} à ${aff.lieu_nom}`
                        ).join('\n');

                        await supabase.from('messages').insert({
                            expediteur: 'Coordination ACLEF',
                            destinataire_id: formateurId,
                            objet: `Planning semaine ${semaine} validé`,
                            contenu: `Bonjour ${formateur.prenom},\n\nVotre planning pour la semaine ${semaine} a été validé.\n\nVos interventions :\n${creneauxDetail}\n\nMerci de votre engagement !\n\nCordialement,\nL'équipe ACLEF`,
                            statut: 'envoye',
                            type: 'planning_valide'
                        });
                    }
                }
            }
        } catch (error) {
            console.error('Erreur envoi messages validation:', error);
        }
    };

    // FONCTION DE SAUVEGARDE
    const sauvegarderPlanning = async (statut, weekDates) => {
        const planningsToSave = [];
        const planningFormateursToSave = [];
        const formateursAfectes = new Set();

        jours.forEach((jour, dayIndex) => {
            const currentDateStr = weekDates[dayIndex];
            
            (lieuxParJour[dayIndex] || []).forEach((lieuIndex) => {
                ['Matin', 'AM'].forEach((creneau) => {
                    const key = `${dayIndex}-${lieuIndex}-${creneau}`;
                    
                    const formateursIds = (formateursParCase[key] || []).filter(id => id !== "");
                    const apprenantsIds = (apprenantsParCase[key] || []).filter(id => id !== "");
                    const lieuId = lieuxSelectionnes[key] || null;
                    const salariesIds = (salariesSelectionnes[key] || []).filter(id => id !== "");

                    if (formateursIds.length > 0 || apprenantsIds.length > 0 || lieuId || salariesIds.length > 0) {
                        let creneauDB = creneau === 'Matin' ? 'matin' : 'AM';

                        planningsToSave.push({
                            date: currentDateStr,
                            jour: jour,
                            creneau: creneauDB,
                            lieu_index: lieuIndex,
                            lieu_id: lieuId,
                            salaries_ids: salariesIds.length > 0 ? salariesIds : null,
                            formateurs_ids: formateursIds,
                            apprenants_ids: apprenantsIds,
                            statut_planning: statut
                        });

                        formateursIds.forEach(formateurId => {
                            formateursAfectes.add(formateurId);
                            const lieuInfo = lieux.find(l => l.id === lieuId);
                            
                            planningFormateursToSave.push({
                                formateur_id: formateurId,
                                date: currentDateStr,
                                creneau: creneauDB,
                                lieu_nom: lieuInfo ? lieuInfo.nom : '',
                                lieu_initiales: lieuInfo ? lieuInfo.initiale : '',
                                statut: statut === 'brouillon' ? 'brouillon' : 'attribue'
                            });
                        });
                    }
                });
            });
        });

        // 🔄 SUPPRESSION DES DONNÉES EXISTANTES AVANT SAUVEGARDE
        const { error: deleteError } = await supabase
            .from('planning_hebdomadaire')
            .delete()
            .in('date', weekDates);

        if (deleteError) {
            console.error('Erreur suppression planning existant:', deleteError);
            throw deleteError;
        }

        const { error: deleteFormateursError } = await supabase
            .from('planning_formateurs_hebdo')
            .delete()
            .in('date', weekDates);

        if (deleteFormateursError) {
            console.error('Erreur suppression planning formateurs existant:', deleteFormateursError);
            throw deleteFormateursError;
        }

        // 📝 INSERTION DES NOUVELLES DONNÉES
        if (planningsToSave.length > 0) {
            // DELETE avant INSERT pour éviter les doublons
            const { error: deleteError } = await supabase
                .from('planning_hebdomadaire')
                .delete()
                .in('date', weekDates);

            if (deleteError) {
                console.error('Erreur suppression planning:', deleteError);
                throw deleteError;
            }

            const { error: insertError } = await supabase
                .from('planning_hebdomadaire')
                .insert(planningsToSave);

            if (insertError) {
                console.error('Erreur insertion planning:', insertError);
                throw insertError;
            }
        }

        if (planningFormateursToSave.length > 0) {
            // DELETE avant INSERT pour éviter les doublons
            const { error: deleteFormateursError } = await supabase
                .from('planning_formateurs_hebdo')
                .delete()
                .in('date', weekDates);

            if (deleteFormateursError) {
                console.error('Erreur suppression planning formateurs:', deleteFormateursError);
                throw deleteFormateursError;
            }

            const { error: insertFormateursError } = await supabase
                .from('planning_formateurs_hebdo')
                .insert(planningFormateursToSave);

            if (insertFormateursError) {
                console.error('Erreur insertion planning formateurs:', insertFormateursError);
                throw insertFormateursError;
            }
        }

        return {
            creneaux: planningsToSave.length,
            formateursAfectes: formateursAfectes.size
        };
    };

    // FONCTIONS UTILITAIRES
    const getLieuCouleur = (lieuId) => {
        if (!lieuId) return '#ffffff';
        const lieu = lieux.find(l => l.id === lieuId);
        // Donner une couleur gris clair à MPT si elle n'en a pas
        if (lieu && lieu.nom && lieu.nom.toLowerCase().includes('mpt') && (!lieu.couleur || lieu.couleur === '#ffffff')) {
            return '#f3f4f6';
        }
        return lieu?.couleur || '#ffffff';
    };

    // FONCTION COLORATION PERSISTANTE - Calculer couleurs après enregistrement
    const calculerCouleursEnregistrees = () => {
        const nouvellesCouleursEnregistrees = {};
        
        jours.forEach((jour, dayIndex) => {
            (lieuxParJour[dayIndex] || []).forEach((lieuIndex) => {
                ['Matin', 'AM'].forEach((creneau) => {
                    const key = `${dayIndex}-${lieuIndex}-${creneau}`;
                    
                    const formateursIds = (formateursParCase[key] || []).filter(id => id !== "");
                    const apprenantsIds = (apprenantsParCase[key] || []).filter(id => id !== "");
                    const lieuId = lieuxSelectionnes[key] || null;
                    
                    // Case a des personnes affectées ET un lieu sélectionné
                    const aDesPersonnes = formateursIds.length > 0 || apprenantsIds.length > 0;
                    
                    if (lieuId && aDesPersonnes) {
                        nouvellesCouleursEnregistrees[key] = getLieuCouleur(lieuId);
                    }
                });
            });
        });
        
        return nouvellesCouleursEnregistrees;
    };

    // FONCTION COLORATION PERSISTANTE - Vérifier si case devient vide après suppression
    const verifierEtSupprimerCouleur = (cellKey) => {
        // Extraire les indices de la cellKey
        const [dayIndex, lieuIndex, creneau] = cellKey.split('-');
        const dayIdx = parseInt(dayIndex);
        const lieuIdx = parseInt(lieuIndex);
        const key = cellKey;
        
        // Vérifier s'il reste des personnes affectées dans cette case
        const formateursIds = (formateursParCase[key] || []).filter(id => id !== "");
        const apprenantsIds = (apprenantsParCase[key] || []).filter(id => id !== "");
        const aDesPersonnes = formateursIds.length > 0 || apprenantsIds.length > 0;
        
        // Si plus personne, supprimer la couleur
        if (!aDesPersonnes) {
            setCouleursEnregistrees(prev => {
                const nouveau = { ...prev };
                delete nouveau[cellKey];
                return nouveau;
            });
        }
    };

    const getTextColor = (backgroundColor) => {
        // FORCER NOIR POUR TOUS LES LIEUX (uniformisation impression)
        return '#000000';
    };

    const getInitiales = (prenom, nom) => {
        return `${prenom?.[0] ?? ''}${nom?.[0] ?? ''}`.toUpperCase();
    };

    const semaine = Math.ceil(((currentDate - new Date(currentDate.getFullYear(), 0, 1)) / 86400000 + new Date(currentDate.getFullYear(), 0, 1).getDay() + 1) / 7);

    // NAVIGATION
    const changeWeek = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    const goToCurrentWeek = () => {
        const currentWeekStart = getCurrentWeekStart();
        setCurrentDate(currentWeekStart);
    };

    // ═══════════════════════════════════════════════════════════════
    // GESTION ORGANISATION PÉDAGOGIQUE - BASE DE DONNÉES
    // ═══════════════════════════════════════════════════════════════

    // Récupérer ou créer une séance pédagogique
    const getOrCreateSeance = async (date, creneau, lieu_id, partie = null) => {
        try {
            // Chercher séance existante
            let query = supabase
                .from('seances_pedagogiques')
                .select('id')
                .eq('date', date)
                .eq('creneau', creneau)
                .eq('lieu_id', lieu_id);

            // Gestion correcte de NULL : utiliser .is() au lieu de .eq()
            if (partie === null) {
                query = query.is('partie', null);
            } else {
                query = query.eq('partie', partie);
            }

            const { data: seancesExistantes, error: searchError } = await query;

            if (searchError) {
                setMessageOrganisation(`❌ Erreur recherche séance: ${searchError.message}`);
                setTimeout(() => setMessageOrganisation(''), 5000);
                throw searchError;
            }

            // Si au moins une séance existe, utiliser la première
            if (seancesExistantes && seancesExistantes.length > 0) {
                return seancesExistantes[0].id;
            }

            // Créer nouvelle séance
            const { data: nouvelleSeance, error: insertError } = await supabase
                .from('seances_pedagogiques')
                .insert({
                    date,
                    creneau,
                    lieu_id,
                    partie
                })
                .select('id')
                .single();

            if (insertError) {
                setMessageOrganisation(`❌ Erreur création séance: ${insertError.message}`);
                setTimeout(() => setMessageOrganisation(''), 5000);
                throw insertError;
            }
            return nouvelleSeance.id;
        } catch (error) {
            return null;
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // FONCTIONS FERMETURES / JOURS FÉRIÉS
    // ═══════════════════════════════════════════════════════════════

    const loadFermetures = async () => {
        try {
            const annee = currentDate.getFullYear();
            const response = await fetch(`/api/admin/jours-fermeture?annee=${annee}`);
            if (response.ok) {
                const data = await response.json();
                setFermetures(data.fermetures || []);
            }
        } catch (error) {
            console.error('Erreur chargement fermetures:', error);
        }
    };

    const ajouterFermeture = async () => {
        if (!nouvelleFermeture.date_debut || !nouvelleFermeture.motif) {
            alert('Date de début et motif requis');
            return;
        }

        try {
            const response = await fetch('/api/admin/jours-fermeture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date_debut: nouvelleFermeture.date_debut,
                    date_fin: nouvelleFermeture.date_fin || null,
                    creneau: nouvelleFermeture.creneau || null,
                    motif: nouvelleFermeture.motif,
                    description: nouvelleFermeture.description || null
                })
            });

            if (response.ok) {
                setNouvelleFermeture({ date_debut: '', date_fin: '', creneau: '', motif: 'fermeture', description: '' });
                loadFermetures();
                setMessage('✅ Fermeture ajoutée');
                setTimeout(() => setMessage(''), 3000);
            } else {
                const err = await response.json();
                alert(`Erreur: ${err.error}`);
            }
        } catch (error) {
            console.error('Erreur ajout fermeture:', error);
            alert('Erreur lors de l\'ajout');
        }
    };

    const supprimerFermeture = async (id) => {
        if (!confirm('Supprimer cette fermeture ?')) return;

        try {
            const response = await fetch(`/api/admin/jours-fermeture?id=${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                loadFermetures();
                setMessage('✅ Fermeture supprimée');
                setTimeout(() => setMessage(''), 3000);
            }
        } catch (error) {
            console.error('Erreur suppression fermeture:', error);
        }
    };

    const initJoursFeries = async () => {
        const annee = currentDate.getFullYear();
        if (!confirm(`Initialiser les jours fériés français pour ${annee} ?`)) return;

        try {
            const response = await fetch('/api/admin/jours-fermeture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'init_feries', annee })
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                loadFermetures();
            }
        } catch (error) {
            console.error('Erreur init jours fériés:', error);
        }
    };

    // Vérifie si un jour/créneau est fermé
    const estJourFerme = (dateStr, creneau = null) => {
        return fermetures.some(f => {
            const dateDebut = new Date(f.date_debut);
            const dateFin = f.date_fin ? new Date(f.date_fin) : dateDebut;
            const dateCheck = new Date(dateStr);

            // Vérifier si la date est dans la plage
            if (dateCheck < dateDebut || dateCheck > dateFin) return false;

            // Si fermeture sur créneau spécifique
            if (f.creneau) {
                const creneauNorm = creneau === 'Matin' ? 'M' : (creneau === 'AM' ? 'AM' : creneau);
                return f.creneau === creneauNorm;
            }

            // Fermeture journée entière
            return true;
        });
    };

    // Récupère les infos de fermeture pour un jour
    const getInfoFermeture = (dateStr, creneau = null) => {
        return fermetures.find(f => {
            const dateDebut = new Date(f.date_debut);
            const dateFin = f.date_fin ? new Date(f.date_fin) : dateDebut;
            const dateCheck = new Date(dateStr);

            if (dateCheck < dateDebut || dateCheck > dateFin) return false;

            if (f.creneau) {
                const creneauNorm = creneau === 'Matin' ? 'M' : (creneau === 'AM' ? 'AM' : creneau);
                return f.creneau === creneauNorm;
            }

            return true;
        });
    };

    // Charger les associations d'une séance
    const chargerAssociations = async (date, creneau, lieu_id) => {
        try {
            // Charger associations non divisées (partie NULL)
            const { data: assocNormales } = await supabase
                .from('seances_pedagogiques')
                .select(`
                    id,
                    associations_pedagogiques (
                        id,
                        encadrant_id,
                        apprenant_id,
                        notes_pedagogiques,
                        salle
                    )
                `)
                .eq('date', date)
                .eq('creneau', creneau)
                .eq('lieu_id', lieu_id)
                .is('partie', null);

            // Charger associations partie 1
            const { data: assocPartie1 } = await supabase
                .from('seances_pedagogiques')
                .select(`
                    id,
                    associations_pedagogiques (
                        id,
                        encadrant_id,
                        apprenant_id,
                        notes_pedagogiques,
                        salle
                    )
                `)
                .eq('date', date)
                .eq('creneau', creneau)
                .eq('lieu_id', lieu_id)
                .eq('partie', 1);

            // Charger associations partie 2
            const { data: assocPartie2 } = await supabase
                .from('seances_pedagogiques')
                .select(`
                    id,
                    associations_pedagogiques (
                        id,
                        encadrant_id,
                        apprenant_id,
                        notes_pedagogiques,
                        salle
                    )
                `)
                .eq('date', date)
                .eq('creneau', creneau)
                .eq('lieu_id', lieu_id)
                .eq('partie', 2);

            const transformerAssociations = (assocs) => {
                if (!assocs || assocs.length === 0) return [];

                // IMPORTANT : Récupérer les associations de TOUTES les séances
                const toutesAssociations = [];
                for (const seance of assocs) {
                    if (seance.associations_pedagogiques && seance.associations_pedagogiques.length > 0) {
                        toutesAssociations.push(...seance.associations_pedagogiques);
                    }
                }

                return toutesAssociations.map(a => {
                    const encadrant = formateurs.find(f => f.id === a.encadrant_id)
                                   || salaries.find(s => s.id === a.encadrant_id);
                    const apprenant = apprenants.find(ap => ap.id === a.apprenant_id);

                    return {
                        id: a.id,
                        encadrant: encadrant,
                        apprenant: apprenant,
                        notes: a.notes_pedagogiques || '',
                        salle: a.salle || null
                    };
                }).filter(a => a.encadrant && a.apprenant);
            };

            return {
                normales: transformerAssociations(assocNormales),
                partie1: transformerAssociations(assocPartie1),
                partie2: transformerAssociations(assocPartie2)
            };
        } catch (error) {
            return { normales: [], partie1: [], partie2: [] };
        }
    };

    // Sauvegarder une association
    const sauvegarderAssociation = async (association, date, creneau, lieu_id, partie = null) => {
        try {
            const seanceId = await getOrCreateSeance(date, creneau, lieu_id, partie);

            // Si seanceId est null, le message d'erreur a déjà été affiché par getOrCreateSeance
            if (!seanceId) {
                return null;
            }

            const { data, error } = await supabase
                .from('associations_pedagogiques')
                .insert({
                    seance_id: seanceId,
                    encadrant_id: association.encadrant.id,
                    apprenant_id: association.apprenant.id,
                    notes_pedagogiques: association.notes || '',
                    salle: association.salle || null
                })
                .select('id')
                .single();

            if (error) throw error;

            // Message de succès
            setMessageOrganisation(`✅ ${association.encadrant.prenom} → ${association.apprenant.prenom} sauvegardé`);
            setTimeout(() => setMessageOrganisation(''), 2000);

            return data.id;
        } catch (error) {
            setMessageOrganisation(`❌ Erreur : ${error.message}`);
            setTimeout(() => setMessageOrganisation(''), 3000);
            return null;
        }
    };

    // Modifier les notes d'une association
    const modifierNotesAssociation = async (associationId, notes) => {
        try {
            const { error } = await supabase
                .from('associations_pedagogiques')
                .update({ notes_pedagogiques: notes })
                .eq('id', associationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erreur modifierNotesAssociation:', error);
            return false;
        }
    };

    // Modifier la salle d'une association
    const modifierSalleAssociation = async (associationId, salle) => {
        try {
            const { error } = await supabase
                .from('associations_pedagogiques')
                .update({ salle: salle || null })
                .eq('id', associationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erreur modifierSalleAssociation:', error);
            return false;
        }
    };

    // Supprimer une association
    const supprimerAssociation = async (associationId) => {
        try {
            const { error } = await supabase
                .from('associations_pedagogiques')
                .delete()
                .eq('id', associationId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Erreur supprimerAssociation:', error);
            return false;
        }
    };

    // ═══════════════════════════════════════════════════════════════

    // GESTION DES DONNÉES
    const handleLieuChange = (dayIndex, lieuIndex, creneau, value) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        setLieuxSelectionnes(prev => ({ ...prev, [key]: value }));
    };

    const handleSalarieChange = (dayIndex, lieuIndex, creneau, selectIndex, value) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        const newList = [...(salariesSelectionnes[key] || [])];
        newList[selectIndex] = value;
        setSalariesSelectionnes(prev => ({ ...prev, [key]: newList }));

        // Si on supprime un salarié (valeur vide), vérifier si case devient vide
        if (value === "") {
            setTimeout(() => verifierEtSupprimerCouleur(key), 0);
        }
    };

    const handleAddSalarie = (dayIndex, lieuIndex, creneau) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        setSalariesSelectionnes(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), ""]
        }));
    };

    const handleRemoveSalarie = (dayIndex, lieuIndex, creneau) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        const currentList = salariesSelectionnes[key] || [];
        if (currentList.length > 0) {
            setSalariesSelectionnes(prev => ({
                ...prev,
                [key]: prev[key].slice(0, -1)
            }));

            // Vérifier si case devient vide et supprimer couleur si nécessaire
            setTimeout(() => verifierEtSupprimerCouleur(key), 0);
        }
    };

    const handleFormateurChange = (dayIndex, lieuIndex, creneau, selectIndex, value) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        const newList = [...(formateursParCase[key] || [])];
        newList[selectIndex] = value;
        setFormateursParCase(prev => ({ ...prev, [key]: newList }));

        // NOUVEAU : Si on supprime un formateur (valeur vide), vérifier si case devient vide
        if (value === "") {
            setTimeout(() => verifierEtSupprimerCouleur(key), 0);
        }
    };

    const handleAddFormateur = (dayIndex, lieuIndex, creneau) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        setFormateursParCase(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), ""]
        }));
    };

    const handleRemoveFormateur = (dayIndex, lieuIndex, creneau) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        const currentList = formateursParCase[key] || [];
        if (currentList.length > 0) {
            setFormateursParCase(prev => ({
                ...prev,
                [key]: prev[key].slice(0, -1)
            }));

            // NOUVEAU : Vérifier si case devient vide et supprimer couleur si nécessaire
            setTimeout(() => verifierEtSupprimerCouleur(key), 0);
        }
    };

    const handleApprenantChange = (dayIndex, lieuIndex, creneau, selectIndex, value) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        const newList = [...(apprenantsParCase[key] || [])];
        newList[selectIndex] = value;
        setApprenantsParCase(prev => ({ ...prev, [key]: newList }));
        
        // NOUVEAU : Si on supprime un apprenant (valeur vide), vérifier si case devient vide
        if (value === "") {
            setTimeout(() => verifierEtSupprimerCouleur(key), 0);
        }
    };

    const handleAddApprenant = (dayIndex, lieuIndex, creneau) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        setApprenantsParCase(prev => ({
            ...prev,
            [key]: [...(prev[key] || []), ""]
        }));
    };

    const handleRemoveApprenant = (dayIndex, lieuIndex, creneau) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        const currentList = apprenantsParCase[key] || [];
        if (currentList.length > 0) {
            setApprenantsParCase(prev => ({
                ...prev,
                [key]: prev[key].slice(0, -1)
            }));

            // NOUVEAU : Vérifier si case devient vide et supprimer couleur si nécessaire
            setTimeout(() => verifierEtSupprimerCouleur(key), 0);
        }
    };

    const handleAddLieu = (dayIndex) => {
        const currentLieux = lieuxParJour[dayIndex] || [];
        const newLieuIndex = Math.max(...currentLieux) + 1;
        
        setLieuxParJour(prev => ({
            ...prev,
            [dayIndex]: [...currentLieux, newLieuIndex]
        }));

        ['Matin', 'AM'].forEach((creneau) => {
            const key = `${dayIndex}-${newLieuIndex}-${creneau}`;
            setApprenantsParCase(prev => ({ ...prev, [key]: [] }));
            setFormateursParCase(prev => ({ ...prev, [key]: [] }));
            setLieuxSelectionnes(prev => ({ ...prev, [key]: "" }));
            setSalariesSelectionnes(prev => ({ ...prev, [key]: "" }));
        });
    };

    const handleRemoveLieu = (dayIndex, lieuIndex) => {
        const currentLieux = lieuxParJour[dayIndex] || [];
        if (currentLieux.length > 1) {
            setLieuxParJour(prev => ({
                ...prev,
                [dayIndex]: currentLieux.filter(l => l !== lieuIndex)
            }));

            ['Matin', 'AM'].forEach((creneau) => {
                const key = `${dayIndex}-${lieuIndex}-${creneau}`;
                setApprenantsParCase(prev => {
                    const newState = { ...prev };
                    delete newState[key];
                    return newState;
                });
                setFormateursParCase(prev => {
                    const newState = { ...prev };
                    delete newState[key];
                    return newState;
                });
                setLieuxSelectionnes(prev => {
                    const newState = { ...prev };
                    delete newState[key];
                    return newState;
                });
                setSalariesSelectionnes(prev => {
                    const newState = { ...prev };
                    delete newState[key];
                    return newState;
                });
            });
        }
    };

    // FONCTION DE GÉNÉRATION D'ÉMARGEMENT PDF (HSP ou OPCO selon les apprenants)
    const handleGenerateEmargement = async (seanceData) => {
        try {
            setMessage('📝 Génération de la feuille d\'émargement PDF...');

            // Essayer d'abord HSP
            let response = await fetch('/api/emargement/generate-hsp-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(seanceData)
            });

            let typeEmargement = 'HSP';

            // Si pas d'apprenants HSP, essayer OPCO
            if (!response.ok) {
                const error = await response.json();
                if (error.error && error.error.includes('Aucun apprenant HSP')) {
                    console.log('Pas d\'apprenants HSP, essai OPCO...');
                    response = await fetch('/api/emargement/generate-opco-pdf', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(seanceData)
                    });
                    typeEmargement = 'OPCO';

                    if (!response.ok) {
                        const errorOPCO = await response.json();
                        throw new Error(errorOPCO.error || 'Aucun apprenant trouvé pour ce créneau');
                    }
                } else {
                    throw new Error(error.error || 'Erreur lors de la génération');
                }
            }

            // Télécharger le fichier PDF
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Emargement_${typeEmargement}_${seanceData.jour}_${seanceData.date}_${seanceData.creneau}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setMessage(`✅ Feuille d'émargement ${typeEmargement} PDF générée avec succès !`);
            setTimeout(() => setMessage(''), 3000);

        } catch (error) {
            console.error('Erreur génération émargement:', error);
            setMessage(`❌ ${error.message}`);
            setTimeout(() => setMessage(''), 5000);
        }
    };

    if (!dataLoaded) {
        return <SkeletonPlanningLoader />;
    }

    return (
        <>
            <style jsx>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                
                @media print {
                    /* CSS PRINT MINIMAL - VERSION RESET */
                    .no-print { 
                        display: none !important; 
                    }
                    .no-print * { 
                        display: none !important; 
                    }
                    button { 
                        display: none !important; 
                    }
                    
                    body { 
                        background: white !important;
                    }
                    
                    .print-title { 
                        display: block !important; 
                        text-align: center; 
                        font-size: 18px; 
                        font-weight: bold; 
                        margin-bottom: 20px; 
                        color: black !important; 
                    }

                    /* ÉTAPE 1 - Adaptation automatique colonnes */
                    table {
                        width: 100% !important;
                        table-layout: fixed !important;
                    }
                    
                    /* Réduction globale du contenu */
                    @page {
                        size: A4 landscape;
                        margin: 8mm;
                    }
                    
                    /* Forcer tout compact */
                    * {
                        font-size: 6pt !important;
                        line-height: 1 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    
                    td, th {
                        width: auto !important;
                        min-width: unset !important;
                        max-width: none !important;
                    }
                    
                    /* Alignement des blocs formateurs/apprenants */
                    td {
                        vertical-align: top !important;
                    }
                    
                    /* Hauteur minimale pour les sections formateurs - RÉDUITE */
                    div[style*="rgba(255, 255, 255, 0.2)"] {
                        min-height: 80px !important;
                        display: block !important;
                    }
                    
                    /* Forcer les apprenants à s'aligner - ESPACEMENT RÉDUIT */
                    div[style*="rgba(34, 197, 94"] {
                        margin-top: 3px !important;
                        border-top: 1px solid #3b82f6 !important;
                    }
                    
                    /* Préserver les couleurs d'impression */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    
                    /* Colonne créneaux divisée par 3 */
                    td:first-child, th:first-child {
                        width: 13px !important;
                        text-align: center !important;
                        font-weight: bold !important;
                    }
                    
                    /* Forcer centrage vertical parfait colonne créneaux */
                    td:first-child {
                        vertical-align: middle !important;
                        text-align: center !important;
                        display: table-cell !important;
                        height: auto !important;
                    }
                    
                    /* Assurer hauteur égale pour M et AM */
                    tbody tr:nth-child(1) td:first-child,
                    tbody tr:nth-child(2) td:first-child {
                        height: 50% !important;
                        vertical-align: middle !important;
                    }
                    
                    /* Taille des selects */
                    select {
                        height: 15px !important;
                        padding: 0px !important;
                        font-size: 8px !important;
                        line-height: 1 !important;
                        background: transparent !important;
                    }
                    
                    /* Masquer complètement le contenu des cellules sans lieu */
                    td[style*="backgroundColor: white"] > div,
                    td[style*="backgroundColor: #ffffff"] > div,
                    td[style*="backgroundColor: rgb(255, 255, 255)"] > div,
                    td[style*="background-color: white"] > div,
                    td[style*="background-color: #ffffff"] > div,
                    td[style*="background-color: rgb(255, 255, 255)"] > div {
                        visibility: hidden !important;
                        height: 0 !important;
                        overflow: hidden !important;
                    }
                    
                    /* Masquer aussi les selects vides dans ces cellules */
                    td[style*="white"] select,
                    td[style*="#ffffff"] select,
                    td[style*="rgb(255, 255, 255)"] select {
                        display: none !important;
                    }
                }
                
                /* ✅ TITRE CACHÉ EN MODE NORMAL */
                .print-title { 
                    display: none; 
                }
                
                /* ⭐ NOUVEAU : MASQUER TEXTES IMPRESSION EN MODE NORMAL */
                .print-only {
                    display: none;
                }
                
                /* Forcer couleur grise pour MPT si besoin */
                td[style*="background-color: white"] {
                    background-color: #f3f4f6 !important;
                }
                
                /* Forcer texte noir pour TOUS les selects */
                select {
                    color: #000000 !important;
                }
            `}</style>

            <div style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: '0',
                opacity: 1,
                transition: 'opacity 0.3s ease-in-out'
            }}>
                <div className="no-print" style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    borderRadius: '0 0 12px 12px',
                    padding: '8px 20px',
                    marginBottom: '10px',
                    marginLeft: '20px',
                    marginRight: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backdropFilter: 'blur(10px)',
                    position: 'relative'
                }}>
                    <nav style={{ fontSize: '14px' }}>
                        <span style={{ color: '#6b7280' }}>Dashboard</span>
                        <span style={{ margin: '0 10px', color: '#9ca3af' }}>/</span>
                        <span style={{ color: '#3b82f6', fontWeight: '500' }}>Planning Coordonnateur</span>
                    </nav>
                    
                    <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}>
                        <h1 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            margin: '0'
                        }}>
                            Planning semaine {semaine}
                        </h1>
                        
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
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
                            onClick={() => router.push('/visualisation-planning-type-v2')}
                            style={{
                                padding: '8px 16px',
                                background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                cursor: 'pointer'
                            }}
                        >
                            Planning Type
                        </button>
                        <button
                            onClick={logout}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#dc2626',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            🚪 Déconnexion
                        </button>
                    </div>
                </div>

                <div className="print-title">
                    Planning semaine {semaine}
                </div>

                {/* Bandeau blanc */}
                <div className="no-print" style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    marginBottom: '10px',
                    marginLeft: '20px',
                    marginRight: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
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

                    {/* Bouton Fermetures et Absences - à droite */}
                    <button
                        onClick={() => setShowModalFermetures(true)}
                        style={{
                            marginLeft: 'auto',
                            padding: '6px 12px',
                            backgroundColor: '#6366f1',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        🏢 Fermetures
                    </button>
                    <button
                        onClick={() => setShowModalAbsencesFormateurs(true)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#f97316',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        🚫 Absences Formateurs
                    </button>
                    <button
                        onClick={() => setShowModalAbsencesApprenants(true)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}
                    >
                        🚫 Absences Apprenants
                    </button>
                </div>

                <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    marginBottom: '10px',
                    marginLeft: '20px',
                    marginRight: '20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            className="no-print"
                            onClick={() => window.print()}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Impression planning
                        </button>
                    </div>

                    <div className="no-print" style={{ display: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <label style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>
                                Afficher :
                            </label>
                            <select
                                value={filtreDisponibilite}
                                onChange={(e) => setFiltreDisponibilite(e.target.value)}
                                style={{
                                    padding: '4px 8px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                <option value="toutes">Toutes les disponibilités</option>
                                <option value="disponible">Disponible uniquement</option>
                                <option value="exceptionnelles">Dispo exceptionnelles</option>
                            </select>
                        </div>
                    </div>

                    <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => changeWeek(-1)}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            ← Semaine précédente
                        </button>
                        
                        <button
                            onClick={goToCurrentWeek}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: '600'
                            }}
                        >
                            Aujourd'hui
                        </button>
                        
                        <button
                            onClick={() => changeWeek(1)}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Semaine suivante →
                        </button>
                    </div>

                    <div className="no-print" style={{ display: 'flex', gap: '8px' }}>
                        {(() => {
                            // Afficher le bouton Vider uniquement pour les semaines futures
                            const today = new Date();
                            const lundiActuel = new Date(today);
                            lundiActuel.setDate(today.getDate() - today.getDay() + 1);
                            lundiActuel.setHours(0, 0, 0, 0);

                            const lundiSemaine = new Date(currentDate);
                            lundiSemaine.setDate(currentDate.getDate() - currentDate.getDay() + 1);
                            lundiSemaine.setHours(0, 0, 0, 0);

                            const estSemaineFuture = lundiSemaine > lundiActuel;

                            return estSemaineFuture ? (
                                <button
                                    onClick={viderPlanningSemaine}
                                    disabled={isLoading || !canEdit}
                                    style={{
                                        padding: '6px 16px',
                                        backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#dc2626',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '14px',
                                        fontWeight: '600',
                                        cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer'
                                    }}
                                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : 'Vider le planning de cette semaine'}
                                >
                                    🗑️ Vider
                                </button>
                            ) : null;
                        })()}
                        <button
                            onClick={handleEnregistrerBrouillon}
                            disabled={isLoading || !canEdit}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer'
                            }}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                        >
                            {isLoading ? 'Sauvegarde...' : 'Enregistrer'}
                        </button>

                        <button
                            onClick={handleValiderTransmettre}
                            disabled={isLoading || !canEdit}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer'
                            }}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                        >
                            {isLoading ? 'Validation...' : 'Valider & Transmettre'}
                        </button>

                        <button
                            onClick={handleValiderModifications}
                            disabled={isLoading || !canEdit}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#f59e0b',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer'
                            }}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                        >
                            {isLoading ? 'Validation...' : '🔄 Valider Modifications'}
                        </button>
                    </div>
                </div>

                {message && (
                    <div className="no-print" style={{
                        backgroundColor: message.includes('🤴') ? '#dbeafe' : 
                                         message.includes('✅') ? '#d1fae5' :
                                         message.includes('📝') ? '#fef3c7' : '#fee2e2',
                        color: message.includes('🤴') ? '#1e40af' : 
                               message.includes('✅') ? '#065f46' :
                               message.includes('📝') ? '#92400e' : '#991b1b',
                        padding: '8px 15px',
                        borderRadius: '6px',
                        marginBottom: '10px',
                        marginLeft: '20px',
                        marginRight: '20px',
                        textAlign: 'center',
                        fontSize: '14px',
                        whiteSpace: 'pre-line'
                    }}>
                        {message}
                    </div>
                )}

                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    margin: '0 20px 20px 20px',
                    padding: '15px',
                    overflow: 'auto',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                }}>
                    {(() => {
                        const columnWidth = calculateColumnWidth(lieuxParJour);
                        const totalPlages = Object.values(lieuxParJour).reduce((total, lieux) => total + (lieux || []).length, 0);
                        return (
                            <table style={{
                                width: totalPlages === 0 ? 'auto' : '100%',
                                borderCollapse: 'collapse'
                            }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                        <th style={{
                                            padding: '4px 2px',
                                            border: '1px solid #e5e7eb',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            textAlign: 'center',
                                            minWidth: '25px',
                                            maxWidth: '25px',
                                            width: '25px'
                                        }}>
                                        </th>
                                        {jours.map((jour, dayIndex) =>
                                            (lieuxParJour[dayIndex] || []).map((lieuIndex, lieuPos) => (
                                                <th key={`${dayIndex}-${lieuIndex}`} style={{
                                                    padding: '10px',
                                                    border: '1px solid #e5e7eb',
                                                    minWidth: `${columnWidth}px`,
                                                    maxWidth: `${columnWidth}px`,
                                                    width: `${columnWidth}px`,
                                                    textAlign: 'center',
                                            fontSize: '11px',
                                            backgroundColor: '#f9fafb'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '3px' }}>
                                                    {jour}
                                                </div>
                                                <div style={{ fontSize: '10px', color: '#6b7280', marginBottom: '6px' }}>
                                                    {getDateOfWeek(dayIndex, currentDate)}
                                                </div>
                                                {canEdit && (
                                                    <div className="no-print" style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                                        <button
                                                            onClick={() => handleAddLieu(dayIndex)}
                                                            style={{
                                                                padding: '3px 6px',
                                                                background: '#10b981',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '3px',
                                                                fontSize: '11px',
                                                                cursor: 'pointer',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            +
                                                        </button>
                                                        {(lieuxParJour[dayIndex] || []).length > 1 && (
                                                            <button
                                                                onClick={() => handleRemoveLieu(dayIndex, lieuIndex)}
                                                                style={{
                                                                    padding: '3px 6px',
                                                                    background: '#ef4444',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '3px',
                                                                    fontSize: '11px',
                                                                    cursor: 'pointer',
                                                                    fontWeight: 'bold'
                                                                }}
                                                            >
                                                                −
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </th>
                                    ))
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {['Matin', 'AM'].map((creneau, creneauIndex) => (
                                <tr key={creneau}>
                                    <td style={{
                                        padding: '4px 2px',
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: creneauIndex === 0 ? '#fef3c7' : '#dbeafe',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        fontSize: '10px',
                                        minWidth: '25px',
                                        maxWidth: '25px',
                                        width: '25px'
                                    }}>
                                        {creneau === 'Matin' ? 'M' : 'AM'}
                                    </td>
                                    {jours.map((jour, dayIndex) => {
                                        // Calculer la date ISO pour ce jour
                                        const weekDates = getWeekDates(currentDate);
                                        const dateStr = weekDates[dayIndex];
                                        const infoFermeture = getInfoFermeture(dateStr, creneau);

                                        return (lieuxParJour[dayIndex] || []).map((lieuIndex) => {
                                            const cellKey = `${dayIndex}-${lieuIndex}-${creneau}`;

                                            // Si jour/créneau fermé, afficher cellule spéciale
                                            if (infoFermeture) {
                                                const motifStyles = {
                                                    ferie: { bg: '#fef2f2', color: '#dc2626', icon: '🎌', label: 'Jour férié' },
                                                    conges: { bg: '#fefce8', color: '#ca8a04', icon: '🏖️', label: 'Congés' },
                                                    fermeture: { bg: '#f1f5f9', color: '#475569', icon: '🚫', label: 'Fermé' },
                                                    formation_formateur: { bg: '#f5f3ff', color: '#7c3aed', icon: '📚', label: 'Formation' },
                                                    autre: { bg: '#f8fafc', color: '#64748b', icon: '⚠️', label: 'Fermé' }
                                                };
                                                const style = motifStyles[infoFermeture.motif] || motifStyles.autre;

                                                return (
                                                    <td
                                                        key={cellKey}
                                                        style={{
                                                            padding: '8px',
                                                            border: '1px solid #e5e7eb',
                                                            backgroundColor: style.bg,
                                                            color: style.color,
                                                            verticalAlign: 'middle',
                                                            textAlign: 'center',
                                                            minWidth: `${columnWidth}px`,
                                                            maxWidth: `${columnWidth}px`,
                                                            width: `${columnWidth}px`
                                                        }}
                                                    >
                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            height: '100%',
                                                            gap: '4px'
                                                        }}>
                                                            <span style={{ fontSize: '24px' }}>{style.icon}</span>
                                                            <span style={{
                                                                fontSize: '11px',
                                                                fontWeight: '600',
                                                                textTransform: 'uppercase'
                                                            }}>
                                                                {style.label}
                                                            </span>
                                                            {infoFermeture.description && (
                                                                <span style={{
                                                                    fontSize: '10px',
                                                                    opacity: 0.8,
                                                                    maxWidth: '100%',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {infoFermeture.description}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            }

                                            const selectedLieuId = lieuxSelectionnes[cellKey];
                                            const backgroundColor = getLieuCouleur(selectedLieuId);
                                            const textColor = getTextColor(backgroundColor);

                                            return (
                                                <td
                                                    key={cellKey}
                                                    style={{
                                                        padding: '8px',
                                                        border: '1px solid #e5e7eb',
                                                        backgroundColor: backgroundColor,
                                                        color: textColor,
                                                        verticalAlign: 'top',
                                                        minWidth: `${columnWidth}px`,
                                                        maxWidth: `${columnWidth}px`,
                                                        width: `${columnWidth}px`
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <select
                                                            disabled={!canEdit}
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: '500',
                                                                background: 'rgba(255,255,255,0.9)',
                                                                color: '#374151',
                                                                cursor: canEdit ? 'pointer' : 'not-allowed'
                                                            }}
                                                            value={selectedLieuId || ""}
                                                            onChange={(e) => handleLieuChange(dayIndex, lieuIndex, creneau, e.target.value)}
                                                        >
                                                            <option value="">Choisir lieu</option>
                                                            {lieux.map((lieu) => (
                                                                <option key={lieu.id} value={lieu.id}>{lieu.nom}</option>
                                                            ))}
                                                        </select>
                                                        {/* ⭐ VERSION IMPRESSION */}
                                                        <div className="print-only print-text">
                                                            {selectedLieuId ? getNomLieu(selectedLieuId) :
                                                             <span className="print-text-empty">Aucun lieu</span>}
                                                        </div>

                                                        <select
                                                            disabled={!canEdit}
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                background: 'rgba(255,255,255,0.9)',
                                                                color: '#374151',
                                                                cursor: canEdit ? 'pointer' : 'not-allowed'
                                                            }}
                                                            value={salariesSelectionnes[cellKey]?.[0] || ""}
                                                            onChange={(e) => handleSalarieChange(dayIndex, lieuIndex, creneau, 0, e.target.value)}
                                                        >
                                                            <option value="">Choisir salarié</option>
                                                            {salaries.map((s) => (
                                                                <option key={s.id} value={s.id}>
                                                                    {s.initiales || getInitiales(s.prenom, s.nom)}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {/* ⭐ VERSION IMPRESSION */}
                                                        <div className="print-only print-text">
                                                            {salariesSelectionnes[cellKey]?.[0] ? getNomSalarie(salariesSelectionnes[cellKey][0]) :
                                                             <span className="print-text-empty">Aucun salarié</span>}
                                                        </div>

                                                        <div style={{
                                                            padding: '6px',
                                                            background: 'rgba(255, 255, 255, 0.2)',
                                                            borderRadius: '4px',
                                                            border: '1px solid rgba(255, 255, 255, 0.3)'
                                                        }}>
                                                            <div style={{ 
                                                                fontSize: '10px', 
                                                                fontWeight: '600', 
                                                                marginBottom: '4px',
                                                                textAlign: 'center'
                                                            }}>
                                                                FORMATEURS
                                                            </div>
                                                            {(formateursParCase[cellKey] || []).map((selectedId, i) => {
                                                                const formateursDisponibles = getFormateursDisponibles(jour, creneau, selectedLieuId);
                                                                
                                                                return (
                                                                    <React.Fragment key={i}>
                                                                        <select
                                                                            disabled={!canEdit}
                                                                            style={{
                                                                                width: '100%',
                                                                                padding: '3px',
                                                                                border: '1px solid #d1d5db',
                                                                                borderRadius: '3px',
                                                                                fontSize: '10px',
                                                                                background: couleursEnregistrees[cellKey] || 'rgba(255,255,255,0.9)',
                                                                                color: '#374151',
                                                                                marginBottom: '3px',
                                                                                cursor: canEdit ? 'pointer' : 'not-allowed'
                                                                            }}
                                                                            value={selectedId}
                                                                            onChange={(e) => handleFormateurChange(dayIndex, lieuIndex, creneau, i, e.target.value)}
                                                                        >
                                                                            <option value="">Formateur</option>
                                                                            {formateursDisponibles
                                                                                .filter(f => {
                                                                                    const currentSelections = formateursParCase[cellKey] || [];
                                                                                    return !currentSelections.includes(f.id) || currentSelections[i] === f.id;
                                                                                })
                                                                                .map(f => (
                                                                                    <option 
                                                                                        key={f.id} 
                                                                                        value={f.id}
                                                                                        style={{
                                                                                            backgroundColor: f.statut === 'disponible' ? '#dbeafe' : 
                                                                                                          f.statut === 'dispo_except' ? '#fef3c7' : 'white',
                                                                                            color: f.statut === 'disponible' ? '#1e40af' : 
                                                                                                   f.statut === 'dispo_except' ? '#92400e' : '#374151'
                                                                                        }}
                                                                                    >
                                                                                        {f.prenom} {f.nom}
                                                                                    </option>
                                                                                ))}
                                                                        </select>
                                                                        {/* ⭐ VERSION IMPRESSION */}
                                                                        <div className="print-only print-text">
                                                                            {selectedId ? getNomFormateur(selectedId) : 
                                                                             <span className="print-text-empty">Aucun formateur</span>}
                                                                        </div>
                                                                    </React.Fragment>
                                                                );
                                                            })}

                                                            {canEdit && (
                                                                <div className="no-print" style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                                                    <button
                                                                        onClick={() => handleAddFormateur(dayIndex, lieuIndex, creneau)}
                                                                        style={{
                                                                            padding: '3px 6px',
                                                                            background: '#3b82f6',
                                                                            color: 'white',
                                                                            border: 'none',
                                                                            borderRadius: '3px',
                                                                            fontSize: '10px',
                                                                            cursor: 'pointer',
                                                                            fontWeight: 'bold'
                                                                        }}
                                                                    >
                                                                        +
                                                                    </button>
                                                                    {(formateursParCase[cellKey] || []).length > 0 && (
                                                                        <button
                                                                            onClick={() => handleRemoveFormateur(dayIndex, lieuIndex, creneau)}
                                                                            style={{
                                                                                padding: '3px 6px',
                                                                                background: '#ef4444',
                                                                                color: 'white',
                                                                                border: 'none',
                                                                                borderRadius: '3px',
                                                                                fontSize: '10px',
                                                                                cursor: 'pointer',
                                                                                fontWeight: 'bold'
                                                                            }}
                                                                        >
                                                                            −
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* RÉACTIVATION PROGRESSIVE - Étape 1: Activation de base */}
                                                        <MenuApprenants
                                                            cellKey={cellKey}
                                                            creneauData={{
                                                                date: getWeekDates(currentDate)[dayIndex],
                                                                jour: jours[dayIndex],
                                                                creneau: creneau,
                                                                lieu_id: selectedLieuId
                                                            }}
                                                            apprenantsParCase={apprenantsParCase}
                                                            apprenants={apprenants}
                                                            onApprenantChange={handleApprenantChange}
                                                            onAddApprenant={handleAddApprenant}
                                                            onRemoveApprenant={handleRemoveApprenant}
                                                            disabled={!selectedLieuId}
                                                            couleurEnregistree={couleursEnregistrees[cellKey]}
                                                            readOnly={!canEdit}
                                                        />

                                                        {/* Boutons Organisation Pédagogique et Émargement */}
                                                        {canEdit && (
                                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '8px' }}>
                                                                <button
                                                                    onClick={() => {
                                                                        setSeanceSelectionnee({
                                                                            date: getWeekDates(currentDate)[dayIndex],
                                                                            jour: jours[dayIndex],
                                                                            creneau: creneau === 'Matin' ? 'M' : 'AM',
                                                                            lieu_id: selectedLieuId,
                                                                            lieu_nom: lieux.find(l => l.id === selectedLieuId)?.nom || '',
                                                                            dayIndex: dayIndex,
                                                                            lieuIndex: lieuIndex,
                                                                            cellKey: cellKey
                                                                        });
                                                                        setShowModalOrganisation(true);
                                                                    }}
                                                                    disabled={!selectedLieuId}
                                                                    style={{
                                                                        fontSize: '18px',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        cursor: selectedLieuId ? 'pointer' : 'not-allowed',
                                                                        opacity: selectedLieuId ? 1 : 0.3,
                                                                        padding: '4px'
                                                                    }}
                                                                    title="Organiser la séance pédagogique"
                                                                >
                                                                    📋
                                                                </button>

                                                                <button
                                                                    onClick={() => handleGenerateEmargement({
                                                                        date: getWeekDates(currentDate)[dayIndex],
                                                                        jour: jours[dayIndex],
                                                                        creneau: creneau === 'Matin' ? 'M' : 'AM',
                                                                        lieu_id: selectedLieuId,
                                                                        lieu_nom: lieux.find(l => l.id === selectedLieuId)?.nom || ''
                                                                    })}
                                                                    disabled={!selectedLieuId}
                                                                    style={{
                                                                        fontSize: '18px',
                                                                        background: 'none',
                                                                        border: 'none',
                                                                        cursor: selectedLieuId ? 'pointer' : 'not-allowed',
                                                                        opacity: selectedLieuId ? 1 : 0.3,
                                                                        padding: '4px'
                                                                    }}
                                                                    title="Générer feuille d'émargement (HSP ou OPCO)"
                                                                >
                                                                    📝
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        });
                                    })}
                                </tr>
                            ))}
                                </tbody>
                            </table>
                        );
                    })()}
                </div>
            </div>

            {/* Modal Organisation Pédagogique */}
            {showModalOrganisation && (
                <div
                    onClick={() => setShowModalOrganisation(false)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            padding: '24px',
                            maxWidth: '90%',
                            maxHeight: '90vh',
                            overflow: 'auto',
                            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
                        }}
                    >
                        {/* Header */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '2px solid #e5e7eb',
                            paddingBottom: '12px'
                        }}>
                            <h2 style={{ margin: 0, color: '#1f2937', fontSize: '20px', fontWeight: '600' }}>
                                Organisation Pédagogique
                            </h2>
                            <button
                                onClick={() => setShowModalOrganisation(false)}
                                style={{
                                    padding: '6px 12px',
                                    backgroundColor: '#ef4444',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Fermer
                            </button>
                        </div>

                        {/* Message de feedback */}
                        {messageOrganisation && (
                            <div style={{
                                padding: '12px',
                                marginBottom: '16px',
                                backgroundColor: messageOrganisation.startsWith('✅') ? '#dcfce7' : '#fee2e2',
                                color: messageOrganisation.startsWith('✅') ? '#166534' : '#991b1b',
                                borderRadius: '8px',
                                fontWeight: '500',
                                textAlign: 'center'
                            }}>
                                {messageOrganisation}
                            </div>
                        )}

                        {/* Contenu de la modal */}
                        <div style={{ minWidth: '900px' }}>
                            {/* Infos séance */}
                            {seanceSelectionnee && (
                                <div style={{
                                    backgroundColor: '#f3f4f6',
                                    padding: '16px',
                                    borderRadius: '8px',
                                    marginBottom: '20px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <strong>Séance :</strong> {seanceSelectionnee.jour} {new Date(seanceSelectionnee.date).toLocaleDateString('fr-FR')}
                                        {' - '}{seanceSelectionnee.creneau === 'M' ? 'Matin' : 'Après-midi'}
                                        {' - '}{seanceSelectionnee.lieu_nom}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (seanceDivisee) {
                                                // Désactiver la division : fusionner les associations
                                                const toutesAssociations = [...associationsPartie1, ...associationsPartie2];
                                                setAssociations(toutesAssociations);
                                                setAssociationsPartie1([]);
                                                setAssociationsPartie2([]);
                                                setSeanceDivisee(false);
                                                setPartieActive(1);
                                            } else {
                                                // Activer la division : mettre les associations actuelles dans partie 1
                                                setAssociationsPartie1([...associations]);
                                                setAssociationsPartie2([]);
                                                setAssociations([]);
                                                setSeanceDivisee(true);
                                                setPartieActive(1);
                                            }
                                        }}
                                        style={{
                                            padding: '6px 12px',
                                            backgroundColor: seanceDivisee ? '#ef4444' : '#8b5cf6',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            cursor: 'pointer',
                                            fontWeight: '500'
                                        }}
                                    >
                                        {seanceDivisee ? '✕ Annuler division' : '✂️ Diviser en 2 parties'}
                                    </button>
                                </div>
                            )}

                            {/* Onglets pour les parties si séance divisée */}
                            {seanceDivisee && (
                                <div style={{
                                    display: 'flex',
                                    gap: '8px',
                                    marginBottom: '16px',
                                    borderBottom: '2px solid #e5e7eb'
                                }}>
                                    <button
                                        onClick={() => setPartieActive(1)}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: partieActive === 1 ? '#3b82f6' : 'transparent',
                                            color: partieActive === 1 ? 'white' : '#6b7280',
                                            border: 'none',
                                            borderBottom: partieActive === 1 ? '3px solid #2563eb' : '3px solid transparent',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📋 Partie 1
                                    </button>
                                    <button
                                        onClick={() => setPartieActive(2)}
                                        style={{
                                            padding: '10px 20px',
                                            backgroundColor: partieActive === 2 ? '#3b82f6' : 'transparent',
                                            color: partieActive === 2 ? 'white' : '#6b7280',
                                            border: 'none',
                                            borderBottom: partieActive === 2 ? '3px solid #2563eb' : '3px solid transparent',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        📋 Partie 2
                                    </button>
                                </div>
                            )}

                            {/* Structure 2 colonnes : Encadrants | Apprenants */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                                {/* Colonne Encadrants */}
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                                        Formateurs / Salariés
                                    </h3>
                                    <div style={{
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        minHeight: '300px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        backgroundColor: '#fefce8'
                                    }}>
                                        {seanceSelectionnee && (() => {
                                            // Récupérer les formateurs et salariés de cette cellule
                                            const cellKey = seanceSelectionnee.cellKey;
                                            const formateursCell = formateursParCase[cellKey] || [];
                                            const salariesIds = salariesSelectionnes[cellKey] || [];
                                            const salariesCell = salariesIds
                                                .filter(id => id)
                                                .map(id => salaries.find(s => s.id === id))
                                                .filter(s => s);

                                            return (
                                                <>
                                                    {/* Formateurs */}
                                                    {formateursCell.map(formateurId => {
                                                        const formateur = formateurs.find(f => f.id === formateurId);
                                                        if (!formateur) return null;

                                                        // Compter le nombre d'apprenants associés à ce formateur
                                                        const listeAssociations = seanceDivisee
                                                            ? (partieActive === 1 ? associationsPartie1 : associationsPartie2)
                                                            : associations;

                                                        const countApprenants = listeAssociations.filter(
                                                            assoc => assoc.encadrant?.id === formateur.id
                                                        ).length;

                                                        return (
                                            <div
                                                key={formateur.id}
                                                onClick={async () => {
                                                    if (apprenantSelectionne) {
                                                        // Créer association
                                                        const nouvelleAssoc = {
                                                            id: Date.now(),
                                                            encadrant: formateur,
                                                            apprenant: apprenantSelectionne,
                                                            notes: '',
                                                            salle: null
                                                        };

                                                        // Déterminer la partie (1, 2, ou null)
                                                        const partie = seanceDivisee ? partieActive : null;

                                                        // Sauvegarder en base de données
                                                        const dbId = await sauvegarderAssociation(
                                                            nouvelleAssoc,
                                                            seanceSelectionnee.date,
                                                            seanceSelectionnee.creneau,
                                                            seanceSelectionnee.lieu_id,
                                                            partie
                                                        );

                                                        if (dbId) {
                                                            // Remplacer l'ID temporaire par l'ID de la base
                                                            nouvelleAssoc.id = dbId;

                                                            // Ajouter à l'état local
                                                            if (seanceDivisee) {
                                                                if (partieActive === 1) {
                                                                    setAssociationsPartie1([...associationsPartie1, nouvelleAssoc]);
                                                                } else {
                                                                    setAssociationsPartie2([...associationsPartie2, nouvelleAssoc]);
                                                                }
                                                            } else {
                                                                setAssociations([...associations, nouvelleAssoc]);
                                                            }
                                                        }

                                                        setApprenantSelectionne(null);
                                                    }
                                                }}
                                                style={{
                                                    padding: '8px 12px',
                                                    marginBottom: '6px',
                                                    borderRadius: '6px',
                                                    backgroundColor: 'white',
                                                    border: '1px solid #d1d5db',
                                                    cursor: apprenantSelectionne ? 'pointer' : 'default',
                                                    transition: 'all 0.2s',
                                                    opacity: apprenantSelectionne ? 1 : 0.7
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (apprenantSelectionne) {
                                                        e.currentTarget.style.backgroundColor = '#fef3c7';
                                                        e.currentTarget.style.borderColor = '#f59e0b';
                                                    }
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'white';
                                                    e.currentTarget.style.borderColor = '#d1d5db';
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    fontWeight: '500',
                                                    fontSize: '14px'
                                                }}>
                                                    <span>
                                                        👤 {formateur.prenom} {formateur.nom}
                                                    </span>
                                                    {countApprenants > 0 && (
                                                        <span style={{
                                                            backgroundColor: '#10b981',
                                                            color: 'white',
                                                            borderRadius: '50%',
                                                            width: '24px',
                                                            height: '24px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: '12px',
                                                            fontWeight: 'bold',
                                                            flexShrink: 0
                                                        }}>
                                                            {countApprenants}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                                        );
                                                    })}

                                                    {/* Salariés */}
                                                    {salariesIds.map((salarieId, index) => {
                                                        const salarie = salaries.find(s => s.id === salarieId);

                                                        // Si pas de salarié sélectionné, afficher un select
                                                        if (!salarie) {
                                                            return (
                                                                <select
                                                                    key={index}
                                                                    value={salarieId || ""}
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onMouseDown={(e) => e.stopPropagation()}
                                                                    onChange={(e) => {
                                                                        const parts = seanceSelectionnee.cellKey.split('-');
                                                                        const dayIndex = parseInt(parts[0]);
                                                                        const lieuIndex = parseInt(parts[1]);
                                                                        const creneau = parts[2];
                                                                        handleSalarieChange(dayIndex, lieuIndex, creneau, index, e.target.value);
                                                                    }}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '8px',
                                                                        marginBottom: '6px',
                                                                        border: '2px solid #10b981',
                                                                        borderRadius: '6px',
                                                                        fontSize: '13px',
                                                                        fontWeight: '500'
                                                                    }}
                                                                >
                                                                    <option value="">Choisir un salarié...</option>
                                                                    {salaries.map(s => (
                                                                        <option key={s.id} value={s.id}>
                                                                            {s.prenom} {s.nom} {s.initiales ? `(${s.initiales})` : ''}
                                                                        </option>
                                                                    ))}
                                                                </select>
                                                            );
                                                        }

                                                        // Sinon afficher le salarié
                                                        // Compter le nombre d'apprenants associés à ce salarié
                                                        const listeAssociations = seanceDivisee
                                                            ? (partieActive === 1 ? associationsPartie1 : associationsPartie2)
                                                            : associations;

                                                        const countApprenants = listeAssociations.filter(
                                                            assoc => assoc.encadrant?.id === salarie.id
                                                        ).length;

                                                        return (
                                                        <div
                                                            key={salarie.id}
                                                            onClick={async () => {
                                                                if (apprenantSelectionne) {
                                                                    // Créer association
                                                                    const nouvelleAssoc = {
                                                                        id: Date.now(),
                                                                        encadrant: salarie,
                                                                        apprenant: apprenantSelectionne,
                                                                        notes: '',
                                                                        salle: null
                                                                    };

                                                                    // Déterminer la partie (1, 2, ou null)
                                                                    const partie = seanceDivisee ? partieActive : null;

                                                                    // Sauvegarder en base de données
                                                                    const dbId = await sauvegarderAssociation(
                                                                        nouvelleAssoc,
                                                                        seanceSelectionnee.date,
                                                                        seanceSelectionnee.creneau,
                                                                        seanceSelectionnee.lieu_id,
                                                                        partie
                                                                    );

                                                                    if (dbId) {
                                                                        // Remplacer l'ID temporaire par l'ID de la base
                                                                        nouvelleAssoc.id = dbId;

                                                                        // Ajouter à l'état local
                                                                        if (seanceDivisee) {
                                                                            if (partieActive === 1) {
                                                                                setAssociationsPartie1([...associationsPartie1, nouvelleAssoc]);
                                                                            } else {
                                                                                setAssociationsPartie2([...associationsPartie2, nouvelleAssoc]);
                                                                            }
                                                                        } else {
                                                                            setAssociations([...associations, nouvelleAssoc]);
                                                                        }
                                                                    }

                                                                    setApprenantSelectionne(null);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '8px 12px',
                                                                marginBottom: '6px',
                                                                borderRadius: '6px',
                                                                backgroundColor: 'white',
                                                                border: '1px solid #d1d5db',
                                                                cursor: apprenantSelectionne ? 'pointer' : 'default',
                                                                transition: 'all 0.2s',
                                                                opacity: apprenantSelectionne ? 1 : 0.7
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (apprenantSelectionne) {
                                                                    e.currentTarget.style.backgroundColor = '#fef3c7';
                                                                    e.currentTarget.style.borderColor = '#f59e0b';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'white';
                                                                e.currentTarget.style.borderColor = '#d1d5db';
                                                            }}
                                                        >
                                                            <div style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                fontWeight: '500',
                                                                fontSize: '14px'
                                                            }}>
                                                                <span>
                                                                    👤 {salarie.prenom} {salarie.nom} {salarie.initiales ? `(${salarie.initiales})` : ''}
                                                                </span>
                                                                {countApprenants > 0 && (
                                                                    <span style={{
                                                                        backgroundColor: '#10b981',
                                                                        color: 'white',
                                                                        borderRadius: '50%',
                                                                        width: '24px',
                                                                        height: '24px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        fontSize: '12px',
                                                                        fontWeight: 'bold',
                                                                        flexShrink: 0
                                                                    }}>
                                                                        {countApprenants}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        );
                                                    })}

                                                    {/* Boutons pour gérer les salariés */}
                                                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                                                        <button
                                                            onClick={() => {
                                                                const parts = seanceSelectionnee.cellKey.split('-');
                                                                const dayIndex = parseInt(parts[0]);
                                                                const lieuIndex = parseInt(parts[1]);
                                                                const creneau = parts[2];
                                                                handleAddSalarie(dayIndex, lieuIndex, creneau);
                                                            }}
                                                            style={{
                                                                flex: 1,
                                                                padding: '8px',
                                                                backgroundColor: '#10b981',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontWeight: '600',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            ➕ Ajouter un salarié
                                                        </button>
                                                        {salariesCell.length > 0 && (
                                                            <button
                                                                onClick={() => {
                                                                    const parts = seanceSelectionnee.cellKey.split('-');
                                                                    const dayIndex = parseInt(parts[0]);
                                                                    const lieuIndex = parseInt(parts[1]);
                                                                    const creneau = parts[2];
                                                                    handleRemoveSalarie(dayIndex, lieuIndex, creneau);
                                                                }}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '8px',
                                                                    backgroundColor: '#ef4444',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontWeight: '600',
                                                                    fontSize: '13px'
                                                                }}
                                                            >
                                                                ➖ Retirer le dernier
                                                            </button>
                                                        )}
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* Colonne Apprenants */}
                                <div>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
                                        Apprenants
                                    </h3>
                                    <div style={{
                                        border: '1px solid #d1d5db',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        minHeight: '300px',
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        backgroundColor: '#dbeafe'
                                    }}>
                                        {seanceSelectionnee && (() => {
                                            // Récupérer les apprenants de cette cellule
                                            const cellKey = seanceSelectionnee.cellKey;
                                            const apprenantsCell = apprenantsParCase[cellKey] || [];

                                            return apprenantsCell.map(apprenantId => {
                                                const apprenant = apprenants.find(a => a.id === apprenantId);
                                                if (!apprenant) return null;

                                                const estSelectionne = apprenantSelectionne?.id === apprenant.id;

                                                // Vérifier si déjà associé selon le mode (divisé ou non)
                                                let estDejaAssocie;
                                                if (seanceDivisee) {
                                                    const listePartie = partieActive === 1 ? associationsPartie1 : associationsPartie2;
                                                    estDejaAssocie = listePartie.some(assoc => assoc.apprenant.id === apprenant.id);
                                                } else {
                                                    estDejaAssocie = associations.some(assoc => assoc.apprenant.id === apprenant.id);
                                                }

                                                return (
                                                <div
                                                    key={apprenant.id}
                                                    onClick={() => {
                                                        if (!estDejaAssocie) {
                                                            setApprenantSelectionne(estSelectionne ? null : apprenant);
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '8px 12px',
                                                        marginBottom: '6px',
                                                        borderRadius: '6px',
                                                        backgroundColor: estSelectionne ? '#3b82f6' : (estDejaAssocie ? '#e5e7eb' : 'white'),
                                                        color: estSelectionne ? 'white' : (estDejaAssocie ? '#9ca3af' : '#111827'),
                                                        border: `2px solid ${estSelectionne ? '#2563eb' : (estDejaAssocie ? '#d1d5db' : '#d1d5db')}`,
                                                        cursor: estDejaAssocie ? 'not-allowed' : 'pointer',
                                                        transition: 'all 0.2s',
                                                        fontWeight: estSelectionne ? '600' : '500',
                                                        fontSize: '14px'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        if (!estDejaAssocie && !estSelectionne) {
                                                            e.currentTarget.style.backgroundColor = '#dbeafe';
                                                            e.currentTarget.style.borderColor = '#3b82f6';
                                                        }
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        if (!estDejaAssocie && !estSelectionne) {
                                                            e.currentTarget.style.backgroundColor = 'white';
                                                            e.currentTarget.style.borderColor = '#d1d5db';
                                                        }
                                                    }}
                                                >
                                                    {estSelectionne && '✓ '}{apprenant.prenom} {apprenant.nom}
                                                    {estDejaAssocie && ' ✅'}
                                                </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Section Associations */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0, color: '#374151' }}>
                                        Associations pédagogiques {seanceDivisee && `- Partie ${partieActive}`}
                                    </h3>
                                    {(() => {
                                        const listeActuelle = seanceDivisee
                                            ? (partieActive === 1 ? associationsPartie1 : associationsPartie2)
                                            : associations;
                                        return listeActuelle.length > 0;
                                    })() && (
                                        <button
                                            onClick={() => {
                                                const printWindow = window.open('', '', 'width=800,height=600');
                                                printWindow.document.write('<html><head><title>Associations Pédagogiques</title>');
                                                printWindow.document.write('<style>');
                                                printWindow.document.write('body { font-family: Arial, sans-serif; padding: 20px; }');
                                                printWindow.document.write('h2 { color: #1f2937; margin-bottom: 20px; }');
                                                printWindow.document.write('h3 { color: #374151; margin-top: 30px; margin-bottom: 15px; padding-top: 20px; border-top: 2px solid #e5e7eb; }');
                                                printWindow.document.write('.assoc-item { display: flex; align-items: center; padding: 12px; margin-bottom: 8px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }');
                                                printWindow.document.write('.encadrant { font-weight: 600; color: #374151; }');
                                                printWindow.document.write('.apprenant { color: #3b82f6; font-weight: 500; margin-left: 12px; }');
                                                printWindow.document.write('.salle { background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-weight: 600; margin-left: 8px; font-size: 12px; }');
                                                printWindow.document.write('.notes { font-style: italic; color: #6b7280; margin-left: 12px; }');
                                                printWindow.document.write('button { display: none !important; }');
                                                printWindow.document.write('</style>');
                                                printWindow.document.write('</head><body>');

                                                const titrePrincipal = 'Associations Pédagogiques - ' + seanceSelectionnee.jour + ' ' + new Date(seanceSelectionnee.date).toLocaleDateString('fr-FR') + ' - ' + (seanceSelectionnee.creneau === 'M' ? 'Matin' : 'Après-midi') + ' - ' + seanceSelectionnee.lieu_nom;
                                                printWindow.document.write('<h2>' + titrePrincipal + '</h2>');

                                                if (seanceDivisee) {
                                                    // Imprimer les deux parties
                                                    printWindow.document.write('<h3>Partie 1</h3>');
                                                    associationsPartie1.forEach(assoc => {
                                                        printWindow.document.write('<div class="assoc-item">');
                                                        printWindow.document.write('<span class="encadrant">' + assoc.encadrant.prenom + ' ' + assoc.encadrant.nom + '</span>');
                                                        printWindow.document.write('<span style="color: #9ca3af; margin: 0 8px;">→</span>');
                                                        printWindow.document.write('<span class="apprenant">' + assoc.apprenant.prenom + ' ' + assoc.apprenant.nom + '</span>');
                                                        if (assoc.salle) {
                                                            printWindow.document.write('<span class="salle">Salle ' + assoc.salle + '</span>');
                                                        }
                                                        if (assoc.notes) {
                                                            printWindow.document.write('<span class="notes">"' + assoc.notes + '"</span>');
                                                        }
                                                        printWindow.document.write('</div>');
                                                    });

                                                    printWindow.document.write('<h3>Partie 2</h3>');
                                                    associationsPartie2.forEach(assoc => {
                                                        printWindow.document.write('<div class="assoc-item">');
                                                        printWindow.document.write('<span class="encadrant">' + assoc.encadrant.prenom + ' ' + assoc.encadrant.nom + '</span>');
                                                        printWindow.document.write('<span style="color: #9ca3af; margin: 0 8px;">→</span>');
                                                        printWindow.document.write('<span class="apprenant">' + assoc.apprenant.prenom + ' ' + assoc.apprenant.nom + '</span>');
                                                        if (assoc.salle) {
                                                            printWindow.document.write('<span class="salle">Salle ' + assoc.salle + '</span>');
                                                        }
                                                        if (assoc.notes) {
                                                            printWindow.document.write('<span class="notes">"' + assoc.notes + '"</span>');
                                                        }
                                                        printWindow.document.write('</div>');
                                                    });
                                                } else {
                                                    // Mode normal : imprimer les associations normales
                                                    associations.forEach(assoc => {
                                                        printWindow.document.write('<div class="assoc-item">');
                                                        printWindow.document.write('<span class="encadrant">' + assoc.encadrant.prenom + ' ' + assoc.encadrant.nom + '</span>');
                                                        printWindow.document.write('<span style="color: #9ca3af; margin: 0 8px;">→</span>');
                                                        printWindow.document.write('<span class="apprenant">' + assoc.apprenant.prenom + ' ' + assoc.apprenant.nom + '</span>');
                                                        if (assoc.salle) {
                                                            printWindow.document.write('<span class="salle">Salle ' + assoc.salle + '</span>');
                                                        }
                                                        if (assoc.notes) {
                                                            printWindow.document.write('<span class="notes">"' + assoc.notes + '"</span>');
                                                        }
                                                        printWindow.document.write('</div>');
                                                    });
                                                }

                                                printWindow.document.write('</body></html>');
                                                printWindow.document.close();
                                                printWindow.print();
                                            }}
                                            style={{
                                                padding: '6px 12px',
                                                backgroundColor: '#8b5cf6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                fontWeight: '500'
                                            }}
                                        >
                                            🖨️ Imprimer
                                        </button>
                                    )}
                                </div>
                                <div style={{
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    minHeight: '150px',
                                    backgroundColor: '#f9fafb'
                                }}>
                                    {(() => {
                                        const listeActuelle = seanceDivisee
                                            ? (partieActive === 1 ? associationsPartie1 : associationsPartie2)
                                            : associations;

                                        return listeActuelle.length === 0 ? (
                                            <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center' }}>
                                                {apprenantSelectionne
                                                    ? `✓ ${apprenantSelectionne.prenom} ${apprenantSelectionne.nom} sélectionné - Cliquez sur un formateur/salarié pour créer l'association`
                                                    : 'Cliquez sur un apprenant puis sur un formateur/salarié pour créer une association'}
                                            </p>
                                        ) : (
                                            <div id="associations-print-area">
                                                {listeActuelle.map((assoc, index) => (
                                                <div
                                                    key={assoc.id}
                                                    className="assoc-item"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '12px',
                                                        marginBottom: '8px',
                                                        backgroundColor: 'white',
                                                        borderRadius: '6px',
                                                        border: '1px solid #e5e7eb'
                                                    }}
                                                >
                                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span className="encadrant" style={{ fontWeight: '600', color: '#374151' }}>
                                                            {assoc.encadrant.prenom} {assoc.encadrant.nom}
                                                        </span>
                                                        <span style={{ color: '#9ca3af' }}>→</span>
                                                        <span className="apprenant" style={{ color: '#3b82f6', fontWeight: '500' }}>
                                                            {assoc.apprenant.prenom} {assoc.apprenant.nom}
                                                        </span>
                                                        <select
                                                            value={assoc.salle || ''}
                                                            onChange={async (e) => {
                                                                const nouvelleSalle = e.target.value ? parseInt(e.target.value) : null;
                                                                // Sauvegarder en base de données
                                                                const success = await modifierSalleAssociation(assoc.id, nouvelleSalle);

                                                                if (success) {
                                                                    // Mettre à jour l'état local
                                                                    if (seanceDivisee) {
                                                                        const newAssocs = partieActive === 1
                                                                            ? [...associationsPartie1]
                                                                            : [...associationsPartie2];
                                                                        newAssocs[index].salle = nouvelleSalle;
                                                                        if (partieActive === 1) {
                                                                            setAssociationsPartie1(newAssocs);
                                                                        } else {
                                                                            setAssociationsPartie2(newAssocs);
                                                                        }
                                                                    } else {
                                                                        const newAssocs = [...associations];
                                                                        newAssocs[index].salle = nouvelleSalle;
                                                                        setAssociations(newAssocs);
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '12px',
                                                                backgroundColor: assoc.salle ? '#dcfce7' : '#f3f4f6',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer',
                                                                fontWeight: '500',
                                                                minWidth: '90px'
                                                            }}
                                                        >
                                                            <option value="">-- Salle --</option>
                                                            <option value="1">Salle 1</option>
                                                            <option value="2">Salle 2</option>
                                                            <option value="3">Salle 3</option>
                                                            <option value="4">Salle 4</option>
                                                            <option value="5">Salle 5</option>
                                                            <option value="6">Salle 6</option>
                                                            <option value="7">Salle 7</option>
                                                            <option value="8">Salle 8</option>
                                                        </select>
                                                        <button
                                                            onClick={async () => {
                                                                const notes = prompt('Notes pédagogiques pour ' + assoc.apprenant.prenom + ' :', assoc.notes);
                                                                if (notes !== null) {
                                                                    // Sauvegarder en base de données
                                                                    const success = await modifierNotesAssociation(assoc.id, notes);

                                                                    if (success) {
                                                                        // Mettre à jour l'état local
                                                                        if (seanceDivisee) {
                                                                            const newAssocs = partieActive === 1
                                                                                ? [...associationsPartie1]
                                                                                : [...associationsPartie2];
                                                                            newAssocs[index].notes = notes;
                                                                            if (partieActive === 1) {
                                                                                setAssociationsPartie1(newAssocs);
                                                                            } else {
                                                                                setAssociationsPartie2(newAssocs);
                                                                            }
                                                                        } else {
                                                                            const newAssocs = [...associations];
                                                                            newAssocs[index].notes = notes;
                                                                            setAssociations(newAssocs);
                                                                        }
                                                                    }
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '4px 8px',
                                                                fontSize: '12px',
                                                                backgroundColor: '#f3f4f6',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '4px',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            📝 {assoc.notes ? 'Modifier note' : 'Ajouter note'}
                                                        </button>
                                                        {assoc.notes && (
                                                            <span className="notes" style={{ fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                                                                "{assoc.notes}"
                                                            </span>
                                                        )}
                                                    </div>
                                                    <button
                                                        onClick={async () => {
                                                            // Supprimer de la base de données
                                                            const success = await supprimerAssociation(assoc.id);

                                                            if (success) {
                                                                // Supprimer de l'état local
                                                                if (seanceDivisee) {
                                                                    if (partieActive === 1) {
                                                                        setAssociationsPartie1(associationsPartie1.filter(a => a.id !== assoc.id));
                                                                    } else {
                                                                        setAssociationsPartie2(associationsPartie2.filter(a => a.id !== assoc.id));
                                                                    }
                                                                } else {
                                                                    setAssociations(associations.filter(a => a.id !== assoc.id));
                                                                }
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '4px 8px',
                                                            backgroundColor: '#fee2e2',
                                                            color: '#dc2626',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '500'
                                                        }}
                                                    >
                                                        ✕ Supprimer
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Absences Apprenants de la semaine */}
            {showModalAbsencesApprenants && (
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
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '700px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '2px solid #ef4444',
                            paddingBottom: '12px'
                        }}>
                            <h2 style={{ margin: 0, color: '#ef4444', fontSize: '18px' }}>
                                🚫 Absences Apprenants - Semaine {semaine}
                            </h2>
                            <button
                                onClick={() => setShowModalAbsencesApprenants(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {(() => {
                            // Filtrer les absences de cette semaine
                            const weekStart = new Date(currentDate);
                            weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekStart.getDate() + 4);

                            const formatDate = (d) => d.toISOString().split('T')[0];
                            const weekStartStr = formatDate(weekStart);
                            const weekEndStr = formatDate(weekEnd);

                            const today = formatDate(new Date());

                            const absencesSemaine = absencesApprenants.filter(abs => {
                                // Vérifier que l'apprenant est actif (formation non terminée)
                                const apprenant = apprenants.find(a => a.id === abs.apprenant_id);
                                if (!apprenant) return false;
                                if (apprenant.date_fin_formation_reelle && apprenant.date_fin_formation_reelle < today) {
                                    return false; // Formation terminée
                                }

                                // Vérifier que l'absence concerne cette semaine
                                if (abs.type === 'absence_periode') {
                                    return abs.date_debut <= weekEndStr && abs.date_fin >= weekStartStr;
                                } else {
                                    return abs.date_specifique >= weekStartStr && abs.date_specifique <= weekEndStr;
                                }
                            });

                            if (absencesSemaine.length === 0) {
                                return (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        color: '#10b981'
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                                        <p style={{ fontSize: '16px', fontWeight: '500' }}>
                                            Aucune absence déclarée cette semaine
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {absencesSemaine.sort((a, b) => {
                                        const dateA = a.type === 'absence_periode' ? a.date_debut : a.date_specifique;
                                        const dateB = b.type === 'absence_periode' ? b.date_debut : b.date_specifique;
                                        return dateA.localeCompare(dateB);
                                    }).map(abs => {
                                        const apprenant = apprenants.find(a => a.id === abs.apprenant_id);
                                        const nomApprenant = apprenant
                                            ? `${apprenant.prenom} ${apprenant.nom}`
                                            : 'Apprenant inconnu';

                                        let dateAffichage = '';
                                        if (abs.type === 'absence_periode') {
                                            const debut = new Date(abs.date_debut).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                                            const fin = new Date(abs.date_fin).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                                            dateAffichage = `${debut} → ${fin}`;
                                        } else {
                                            dateAffichage = new Date(abs.date_specifique).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
                                            if (abs.creneau) {
                                                dateAffichage += ` (${abs.creneau === 'matin' ? 'Matin' : 'Après-midi'})`;
                                            }
                                        }

                                        const typeLabel = abs.type === 'absence_periode' ? 'Période'
                                            : abs.type === 'absence_ponctuelle' ? 'Ponctuelle'
                                            : abs.type === 'presence_exceptionnelle' ? '✨ Présence exceptionnelle'
                                            : abs.type;

                                        const bgColor = abs.type === 'presence_exceptionnelle' ? '#fef3c7' : '#fee2e2';
                                        const borderColor = abs.type === 'presence_exceptionnelle' ? '#f59e0b' : '#ef4444';

                                        return (
                                            <div
                                                key={abs.id}
                                                style={{
                                                    padding: '12px 16px',
                                                    backgroundColor: bgColor,
                                                    borderLeft: `4px solid ${borderColor}`,
                                                    borderRadius: '6px'
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '6px'
                                                }}>
                                                    <span style={{
                                                        fontWeight: '600',
                                                        color: '#1f2937',
                                                        fontSize: '14px'
                                                    }}>
                                                        {nomApprenant}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        padding: '2px 8px',
                                                        backgroundColor: 'white',
                                                        borderRadius: '4px',
                                                        color: '#6b7280'
                                                    }}>
                                                        {typeLabel}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#4b5563',
                                                    marginBottom: abs.motif ? '6px' : '0'
                                                }}>
                                                    📅 {dateAffichage}
                                                </div>
                                                {(abs.motif || abs.commentaire) && (
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: '#6b7280',
                                                        paddingTop: '6px',
                                                        borderTop: '1px dashed #d1d5db'
                                                    }}>
                                                        {abs.motif && (
                                                            <div style={{ fontStyle: 'italic', marginBottom: abs.commentaire ? '4px' : '0' }}>
                                                                💬 Motif : {abs.motif}
                                                            </div>
                                                        )}
                                                        {abs.commentaire && (
                                                            <div style={{ color: '#9ca3af' }}>
                                                                📝 Commentaire : {abs.commentaire}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        <div style={{
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setShowModalAbsencesApprenants(false)}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Fermetures / Jours fériés */}
            {showModalFermetures && (
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
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '800px',
                        width: '95%',
                        maxHeight: '85vh',
                        overflow: 'auto',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ margin: 0, fontSize: '20px', color: '#6366f1' }}>
                                🏢 Fermetures & Jours fériés - {currentDate.getFullYear()}
                            </h2>
                            <button
                                onClick={() => setShowModalFermetures(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#666'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {/* Bouton initialiser jours fériés */}
                        <div style={{ marginBottom: '20px' }}>
                            <button
                                onClick={initJoursFeries}
                                style={{
                                    padding: '8px 16px',
                                    backgroundColor: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}
                            >
                                🇫🇷 Initialiser jours fériés {currentDate.getFullYear()}
                            </button>
                        </div>

                        {/* Formulaire ajout fermeture */}
                        <div style={{
                            background: '#f8fafc',
                            padding: '16px',
                            borderRadius: '8px',
                            marginBottom: '20px'
                        }}>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569' }}>
                                ➕ Ajouter une fermeture
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                        Date début *
                                    </label>
                                    <input
                                        type="date"
                                        value={nouvelleFermeture.date_debut}
                                        onChange={(e) => setNouvelleFermeture({ ...nouvelleFermeture, date_debut: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                        Date fin (optionnel)
                                    </label>
                                    <input
                                        type="date"
                                        value={nouvelleFermeture.date_fin}
                                        onChange={(e) => setNouvelleFermeture({ ...nouvelleFermeture, date_fin: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                        Créneau
                                    </label>
                                    <select
                                        value={nouvelleFermeture.creneau}
                                        onChange={(e) => setNouvelleFermeture({ ...nouvelleFermeture, creneau: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="">Journée entière</option>
                                        <option value="M">Matin uniquement</option>
                                        <option value="AM">Après-midi uniquement</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                        Motif *
                                    </label>
                                    <select
                                        value={nouvelleFermeture.motif}
                                        onChange={(e) => setNouvelleFermeture({ ...nouvelleFermeture, motif: e.target.value })}
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            fontSize: '13px'
                                        }}
                                    >
                                        <option value="fermeture">Fermeture structure</option>
                                        <option value="conges">Congés</option>
                                        <option value="ferie">Jour férié</option>
                                        <option value="formation_formateur">Formation formateurs</option>
                                        <option value="autre">Autre</option>
                                    </select>
                                </div>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <label style={{ fontSize: '12px', color: '#64748b', display: 'block', marginBottom: '4px' }}>
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={nouvelleFermeture.description}
                                        onChange={(e) => setNouvelleFermeture({ ...nouvelleFermeture, description: e.target.value })}
                                        placeholder="Ex: Vacances d'été, Formation Excel..."
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            fontSize: '13px'
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={ajouterFermeture}
                                style={{
                                    marginTop: '12px',
                                    padding: '8px 20px',
                                    backgroundColor: '#6366f1',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '500'
                                }}
                            >
                                ✓ Ajouter
                            </button>
                        </div>

                        {/* Liste des fermetures */}
                        <div>
                            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#475569' }}>
                                📅 Fermetures {currentDate.getFullYear()} ({fermetures.length})
                            </h3>
                            {fermetures.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '13px' }}>Aucune fermeture enregistrée</p>
                            ) : (
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ backgroundColor: '#f1f5f9' }}>
                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date(s)</th>
                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Créneau</th>
                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Motif</th>
                                                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Description</th>
                                                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {fermetures.map((f) => {
                                                const motifLabels = {
                                                    ferie: { label: 'Férié', color: '#dc2626', bg: '#fef2f2' },
                                                    conges: { label: 'Congés', color: '#f59e0b', bg: '#fffbeb' },
                                                    fermeture: { label: 'Fermeture', color: '#6366f1', bg: '#eef2ff' },
                                                    formation_formateur: { label: 'Formation', color: '#8b5cf6', bg: '#f5f3ff' },
                                                    autre: { label: 'Autre', color: '#64748b', bg: '#f8fafc' }
                                                };
                                                const motifInfo = motifLabels[f.motif] || motifLabels.autre;

                                                return (
                                                    <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                        <td style={{ padding: '8px' }}>
                                                            {new Date(f.date_debut).toLocaleDateString('fr-FR')}
                                                            {f.date_fin && f.date_fin !== f.date_debut && (
                                                                <> → {new Date(f.date_fin).toLocaleDateString('fr-FR')}</>
                                                            )}
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            {f.creneau === 'M' ? 'Matin' : f.creneau === 'AM' ? 'Après-midi' : 'Journée'}
                                                        </td>
                                                        <td style={{ padding: '8px' }}>
                                                            <span style={{
                                                                backgroundColor: motifInfo.bg,
                                                                color: motifInfo.color,
                                                                padding: '2px 8px',
                                                                borderRadius: '4px',
                                                                fontSize: '12px',
                                                                fontWeight: '500'
                                                            }}>
                                                                {motifInfo.label}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '8px', color: '#64748b' }}>
                                                            {f.description || '-'}
                                                        </td>
                                                        <td style={{ padding: '8px', textAlign: 'center' }}>
                                                            <button
                                                                onClick={() => supprimerFermeture(f.id)}
                                                                style={{
                                                                    background: '#fee2e2',
                                                                    color: '#dc2626',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    padding: '4px 8px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '12px'
                                                                }}
                                                            >
                                                                🗑️
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Bouton fermer */}
                        <div style={{ marginTop: '20px', textAlign: 'right' }}>
                            <button
                                onClick={() => setShowModalFermetures(false)}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: '#64748b',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '13px'
                                }}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Absences Formateurs de la semaine */}
            {showModalAbsencesFormateurs && (
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
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '24px',
                        maxWidth: '700px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '20px',
                            borderBottom: '2px solid #f97316',
                            paddingBottom: '12px'
                        }}>
                            <h2 style={{ margin: 0, color: '#f97316', fontSize: '18px' }}>
                                🚫 Absences Formateurs - Semaine {semaine}
                            </h2>
                            <button
                                onClick={() => setShowModalAbsencesFormateurs(false)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '24px',
                                    cursor: 'pointer',
                                    color: '#6b7280'
                                }}
                            >
                                ×
                            </button>
                        </div>

                        {(() => {
                            // Filtrer les absences de cette semaine
                            const weekStart = new Date(currentDate);
                            weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
                            const weekEnd = new Date(weekStart);
                            weekEnd.setDate(weekStart.getDate() + 4);

                            const formatDate = (d) => d.toISOString().split('T')[0];
                            const weekStartStr = formatDate(weekStart);
                            const weekEndStr = formatDate(weekEnd);

                            // Filtrer les absences formateurs (pas les dispo_except)
                            const absencesSemaine = absencesValidees.filter(abs => {
                                // Exclure les disponibilités exceptionnelles
                                if (abs.type === 'dispo_except') return false;

                                // Vérifier que l'absence concerne cette semaine
                                return abs.date_debut <= weekEndStr && abs.date_fin >= weekStartStr;
                            });

                            if (absencesSemaine.length === 0) {
                                return (
                                    <div style={{
                                        padding: '40px',
                                        textAlign: 'center',
                                        color: '#10b981'
                                    }}>
                                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                                        <p style={{ fontSize: '16px', fontWeight: '500' }}>
                                            Aucune absence formateur cette semaine
                                        </p>
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {absencesSemaine.sort((a, b) => a.date_debut.localeCompare(b.date_debut)).map(abs => {
                                        const formateur = formateurs.find(f => f.id === abs.formateur_id);
                                        const nomFormateur = formateur
                                            ? `${formateur.prenom} ${formateur.nom}`
                                            : 'Formateur inconnu';

                                        const debut = new Date(abs.date_debut).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                                        const fin = new Date(abs.date_fin).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
                                        let dateAffichage = abs.date_debut === abs.date_fin
                                            ? debut
                                            : `${debut} → ${fin}`;

                                        if (abs.creneau) {
                                            dateAffichage += ` (${abs.creneau === 'matin' ? 'Matin' : 'Après-midi'})`;
                                        }

                                        const typeLabel = abs.type === 'absent' ? 'Absence'
                                            : abs.type === 'conge' ? 'Congé'
                                            : abs.type === 'formation' ? 'Formation'
                                            : abs.type === 'maladie' ? 'Maladie'
                                            : abs.type;

                                        return (
                                            <div
                                                key={abs.id}
                                                style={{
                                                    padding: '12px 16px',
                                                    backgroundColor: '#fff7ed',
                                                    borderLeft: '4px solid #f97316',
                                                    borderRadius: '6px'
                                                }}
                                            >
                                                <div style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    marginBottom: '6px'
                                                }}>
                                                    <span style={{
                                                        fontWeight: '600',
                                                        color: '#1f2937',
                                                        fontSize: '14px'
                                                    }}>
                                                        {nomFormateur}
                                                    </span>
                                                    <span style={{
                                                        fontSize: '11px',
                                                        padding: '2px 8px',
                                                        backgroundColor: 'white',
                                                        borderRadius: '4px',
                                                        color: '#6b7280'
                                                    }}>
                                                        {typeLabel}
                                                    </span>
                                                </div>
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#4b5563',
                                                    marginBottom: abs.motif ? '6px' : '0'
                                                }}>
                                                    📅 {dateAffichage}
                                                </div>
                                                {abs.motif && (
                                                    <div style={{
                                                        fontSize: '12px',
                                                        color: '#6b7280',
                                                        fontStyle: 'italic',
                                                        paddingTop: '6px',
                                                        borderTop: '1px dashed #d1d5db'
                                                    }}>
                                                        💬 Motif : {abs.motif}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        <div style={{
                            marginTop: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e5e7eb',
                            display: 'flex',
                            justifyContent: 'flex-end'
                        }}>
                            <button
                                onClick={() => setShowModalAbsencesFormateurs(false)}
                                style={{
                                    padding: '8px 20px',
                                    backgroundColor: '#6b7280',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(PlanningCoordo, "Planning Coordinateur");
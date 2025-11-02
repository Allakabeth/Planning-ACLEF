import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import { withAuthAdmin } from '../components/withAuthAdmin';
// RÉACTIVATION PROGRESSIVE - Étape 1
import MenuApprenants from '../components/MenuApprenants';

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
    const [absencesValidees, setAbsencesValidees] = useState([]);
    
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
                .select('id, formateur_id, date_debut, date_fin, type, statut')
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
            
            const [absencesRes, planningTypesRes] = await Promise.all([
                supabase.from('absences_formateurs').select('id, formateur_id, date_debut, date_fin, type, statut').eq('statut', 'validé'),
                supabase.from('planning_type_formateurs').select('id, formateur_id, jour, creneau, statut, lieu_id, valide').eq('valide', true)
            ]);

            if (absencesRes.data) setAbsencesValidees(absencesRes.data);
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
                const [salariesRes, formateursRes, apprenantsRes, lieuxRes, planningTypesRes, absencesRes] = await Promise.all([
                    supabase.from('users').select('id, prenom, nom, role, initiales').eq('role', 'salarié').eq('archive', false),
                    supabase.from('users').select('id, prenom, nom, role').eq('role', 'formateur').eq('archive', false),
                    supabase.from('users').select('id, prenom, nom, role').eq('role', 'apprenant').eq('archive', false),
                    supabase.from('lieux').select('id, nom, couleur, initiale').eq('archive', false),
                    supabase.from('planning_type_formateurs').select('id, formateur_id, jour, creneau, statut, lieu_id, valide').eq('valide', true),
                    supabase.from('absences_formateurs').select('id, formateur_id, date_debut, date_fin, type, statut').eq('statut', 'validé')
                ]);

                if (salariesRes.data) setSalaries(salariesRes.data);
                if (formateursRes.data) setFormateurs(formateursRes.data);
                if (apprenantsRes.data) setApprenants(apprenantsRes.data);
                if (lieuxRes.data) setLieux(lieuxRes.data);
                if (planningTypesRes.data) setPlanningTypes(planningTypesRes.data);
                if (absencesRes.data) setAbsencesValidees(absencesRes.data);
            } catch (error) {
                console.error('Erreur lors du chargement des données:', error);
            }
        };
        
        fetchData();
    }, []);

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

    // ☆☆☆ FONCTION CORRIGÉE - PRIORITÉ DISPO EXCEPTIONNELLE ☆☆☆
    const isFormateurAbsent = (formateurId, dateStr) => {
        // D'ABORD vérifier s'il a une dispo exceptionnelle (priorité absolue)
        const dispoExcept = absencesValidees.find(absence => {
            if (absence.formateur_id !== formateurId) return false;
            if (absence.type !== 'formation') return false;
            
            const dateDebut = new Date(absence.date_debut + 'T00:00:00');
            const dateFin = new Date(absence.date_fin + 'T23:59:59');
            const dateCheck = new Date(dateStr + 'T12:00:00');
            
            return dateCheck >= dateDebut && dateCheck <= dateFin;
        });
        
        // Si dispo exceptionnelle trouvée = PAS absent !
        if (dispoExcept) {
            console.log(`✅ PRIORITÉ DISPO EXCEPT: formateur ${formateurId} disponible le ${dateStr} !`);
            return false;
        }
        
        // ENSUITE chercher les vraies absences
        const absenceJour = absencesValidees.find(absence => {
            if (absence.formateur_id !== formateurId) return false;
            if (absence.type === 'formation') return false; // Dispo except n'est pas absence
            
            const dateDebut = new Date(absence.date_debut + 'T00:00:00');
            const dateFin = new Date(absence.date_fin + 'T23:59:59');
            const dateCheck = new Date(dateStr + 'T12:00:00');
            
            return dateCheck >= dateDebut && dateCheck <= dateFin;
        });

        if (absenceJour) {
            console.log(`🚫 ${formateurId} absent le ${dateStr} - retiré par ROI`);
        }

        return !!absenceJour;
    };

    // Fonction dispo exceptionnelle corrigée
    const hasDispoExceptionnelle = (formateurId, dateStr) => {
        const dispoJour = absencesValidees.find(absence => {
            if (absence.formateur_id !== formateurId) return false;
            if (absence.type !== 'formation') return false;
            
            const dateDebut = new Date(absence.date_debut + 'T00:00:00');
            const dateFin = new Date(absence.date_fin + 'T23:59:59');
            const dateCheck = new Date(dateStr + 'T12:00:00');
            
            return dateCheck >= dateDebut && dateCheck <= dateFin;
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

        // ☆☆☆ PRIORITÉ ABSOLUE : DISPO EXCEPTIONNELLES D'ABORD ☆☆☆
        const formateursDispoExceptionnelle = formateurs
            .filter(f => hasDispoExceptionnelle(f.id, dateStr))
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
            
            // ☆☆☆ LOGIQUE ROI - ABSENCE GAGNE TOUJOURS ☆☆☆
            if (isFormateurAbsent(f.id, dateStr)) {
                console.log(`🚫 ${f.prenom} absent le ${dateStr} - retiré par ROI`);
                return null;
            }
            
            // ☆☆☆ LOGIQUE ROI - DISPO EXCEPT PRIORITAIRE ☆☆☆
            if (hasDispoExceptionnelle(f.id, dateStr)) {
                console.log(`✅ ${f.prenom} dispo exceptionnelle le ${dateStr} - ajouté par ROI`);
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

        // ☆☆☆ LOGIQUE ROI CORRIGÉE - DISPO EXCEPT TOUJOURS TRAITÉES ☆☆☆
        const formateursSansPlanningAvecStatut = (filtreDisponibilite === 'toutes' || filtreDisponibilite === 'exceptionnelles')
            ? formateursSansPlanningType.filter(f => !isFormateurAbsent(f.id, dateStr))
                .map(f => {
                    // ☆☆☆ LOGIQUE ROI - DISPO EXCEPT MÊME SANS PLANNING TYPE ☆☆☆
                    if (hasDispoExceptionnelle(f.id, dateStr)) {
                        console.log(`✅ ${f.prenom} dispo exceptionnelle le ${dateStr} (sans planning) - ajouté par ROI`);
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
                        newSalariesSelectionnes[key] = "";
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
                        if (item.salarie_id) {
                            newSalariesSelectionnes[key] = item.salarie_id;
                        }
                    }
                });
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
                    const salarieId = salariesSelectionnes[key] || null;
                    
                    if (formateursIds.length > 0 || apprenantsIds.length > 0 || lieuId || salarieId) {
                        let creneauDB = creneau === 'Matin' ? 'matin' : 'AM';

                        planningsToSave.push({
                            date: currentDateStr,
                            jour: jour,
                            creneau: creneauDB,
                            lieu_index: lieuIndex,
                            lieu_id: lieuId,
                            salarie_id: salarieId || null,
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
                        notes_pedagogiques
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
                        notes_pedagogiques
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
                        notes_pedagogiques
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
                        notes: a.notes_pedagogiques || ''
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
                    notes_pedagogiques: association.notes || ''
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

    const handleSalarieChange = (dayIndex, lieuIndex, creneau, value) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        setSalariesSelectionnes(prev => ({ ...prev, [key]: value }));
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

    // FONCTION DE DUPLICATION SEMAINE SUIVANTE
    const dupliquerVersProchaineSemaine = async () => {
        try {
            setIsLoading(true);
            setMessage('🔄 Duplication vers la semaine suivante...');

            // Calculer les dates de la semaine courante et suivante
            const weekDates = getWeekDates(currentDate);
            
            const prochaineDate = new Date(currentDate);
            prochaineDate.setDate(currentDate.getDate() + 7);
            const prochainesWeekDates = getWeekDates(prochaineDate);

            const planningsDupliques = [];
            const planningFormateursDupliques = [];
            let formateursExclusPourAbsence = 0;
            let creneauxDupliques = 0;

            // Parcourir tous les créneaux actuels
            jours.forEach((jour, dayIndex) => {
                const dateOriginale = weekDates[dayIndex];
                const dateDestination = prochainesWeekDates[dayIndex];
                
                (lieuxParJour[dayIndex] || []).forEach((lieuIndex) => {
                    ['Matin', 'AM'].forEach((creneau) => {
                        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
                        
                        const formateursIds = (formateursParCase[key] || []).filter(id => id !== "");
                        const apprenantsIds = (apprenantsParCase[key] || []).filter(id => id !== "");
                        const lieuId = lieuxSelectionnes[key] || null;
                        const salarieId = salariesSelectionnes[key] || null;
                        
                        if (formateursIds.length > 0 || apprenantsIds.length > 0 || lieuId || salarieId) {
                            // Filtrer les formateurs non absents pour la semaine suivante
                            const formateursDisponibles = formateursIds.filter(formateurId => {
                                const estAbsent = isFormateurAbsent(formateurId, dateDestination);
                                if (estAbsent) formateursExclusPourAbsence++;
                                return !estAbsent;
                            });

                            // Si au moins un élément subsiste, créer le créneau dupliqué
                            if (formateursDisponibles.length > 0 || apprenantsIds.length > 0 || lieuId || salarieId) {
                                let creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
                                creneauxDupliques++;

                                planningsDupliques.push({
                                    date: dateDestination,
                                    jour: jour,
                                    creneau: creneauDB,
                                    lieu_index: lieuIndex,
                                    lieu_id: lieuId,
                                    salarie_id: salarieId || null,
                                    formateurs_ids: formateursDisponibles,
                                    apprenants_ids: apprenantsIds,
                                    statut_planning: 'brouillon'
                                });

                                // Ajouter les formateurs disponibles au planning formateurs
                                formateursDisponibles.forEach(formateurId => {
                                    const lieuInfo = lieux.find(l => l.id === lieuId);
                                    
                                    planningFormateursDupliques.push({
                                        formateur_id: formateurId,
                                        date: dateDestination,
                                        creneau: creneauDB,
                                        lieu_nom: lieuInfo ? lieuInfo.nom : '',
                                        lieu_initiales: lieuInfo ? lieuInfo.initiale : '',
                                        statut: 'brouillon'
                                    });
                                });
                            }
                        }
                    });
                });
            });

            if (planningsDupliques.length > 0) {
                // Supprimer les plannings existants pour la semaine suivante
                const { error: deleteError } = await supabase
                    .from('planning_hebdomadaire')
                    .delete()
                    .in('date', prochainesWeekDates);

                if (deleteError) {
                    console.error('Erreur suppression planning semaine suivante:', deleteError);
                    throw deleteError;
                }

                // Supprimer les plannings formateurs existants pour la semaine suivante
                const { error: deleteFormateursError } = await supabase
                    .from('planning_formateurs_hebdo')
                    .delete()
                    .in('date', prochainesWeekDates);

                if (deleteFormateursError) {
                    console.error('Erreur suppression planning formateurs semaine suivante:', deleteFormateursError);
                    throw deleteFormateursError;
                }

                // Insérer les nouveaux plannings
                const { error: insertError } = await supabase
                    .from('planning_hebdomadaire')
                    .insert(planningsDupliques);

                if (insertError) {
                    console.error('Erreur insertion planning dupliqué:', insertError);
                    throw insertError;
                }

                // Insérer les plannings formateurs
                if (planningFormateursDupliques.length > 0) {
                    const { error: insertFormateursError } = await supabase
                        .from('planning_formateurs_hebdo')
                        .insert(planningFormateursDupliques);

                    if (insertFormateursError) {
                        console.error('Erreur insertion planning formateurs dupliqué:', insertFormateursError);
                        throw insertFormateursError;
                    }
                }

                const semaineSuivante = Math.ceil(((prochaineDate - new Date(prochaineDate.getFullYear(), 0, 1)) / 86400000 + new Date(prochaineDate.getFullYear(), 0, 1).getDay() + 1) / 7);
                
                setMessage(`✅ Planning dupliqué vers semaine ${semaineSuivante} !
${creneauxDupliques} créneaux dupliqués
${formateursExclusPourAbsence > 0 ? `⚠️ ${formateursExclusPourAbsence} affectations formateurs exclues (absences)` : '🎯 Toutes les affectations ont été dupliquées'}`);
                
                setTimeout(() => setMessage(''), 6000);

                // Optionnel : naviguer vers la semaine suivante
                // setCurrentDate(prochaineLundi);
                
            } else {
                setMessage('ℹ️ Aucun créneau à dupliquer trouvé');
                setTimeout(() => setMessage(''), 3000);
            }

        } catch (error) {
            console.error('Erreur lors de la duplication:', error);
            setMessage(`❌ Erreur duplication: ${error.message}`);
            setTimeout(() => setMessage(''), 5000);
        } finally {
            setIsLoading(false);
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
                        <button
                            onClick={dupliquerVersProchaineSemaine}
                            disabled={isLoading || !canEdit}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: (isLoading || !canEdit) ? '#94a3b8' : '#8b5cf6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: (isLoading || !canEdit) ? 'not-allowed' : 'pointer'
                            }}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                        >
                            {isLoading ? 'Duplication...' : '📋 Dupliquer S+1'}
                        </button>

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
                                    {jours.map((jour, dayIndex) => 
                                        (lieuxParJour[dayIndex] || []).map((lieuIndex) => {
                                            const cellKey = `${dayIndex}-${lieuIndex}-${creneau}`;
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
                                                            value={salariesSelectionnes[cellKey] || ""}
                                                            onChange={(e) => handleSalarieChange(dayIndex, lieuIndex, creneau, e.target.value)}
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
                                                            {salariesSelectionnes[cellKey] ? getNomSalarie(salariesSelectionnes[cellKey]) : 
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

                                                        {/* Bouton Organisation Pédagogique */}
                                                        {canEdit && (
                                                            <div style={{ textAlign: 'center', marginTop: '8px' }}>
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
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })
                                    )}
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
                                            const salarieId = salariesSelectionnes[cellKey];
                                            const salarie = salarieId ? salaries.find(s => s.id === salarieId) : null;

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
                                                            notes: ''
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

                                                    {/* Salarié */}
                                                    {salarie && (() => {
                                                        // Compter le nombre d'apprenants associés à ce salarié
                                                        const listeAssociations = seanceDivisee
                                                            ? (partieActive === 1 ? associationsPartie1 : associationsPartie2)
                                                            : associations;

                                                        const countApprenants = listeAssociations.filter(
                                                            assoc => assoc.encadrant?.id === salarie.id
                                                        ).length;

                                                        return (
                                                        <div
                                                            onClick={async () => {
                                                                if (apprenantSelectionne) {
                                                                    // Créer association
                                                                    const nouvelleAssoc = {
                                                                        id: Date.now(),
                                                                        encadrant: salarie,
                                                                        apprenant: apprenantSelectionne,
                                                                        notes: ''
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
                                                    })()}
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
        </>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(PlanningCoordo, "Planning Coordinateur");
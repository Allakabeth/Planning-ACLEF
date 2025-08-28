import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';
import { withAuthAdmin } from '../components/withAuthAdmin';

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

function PlanningCoordo({ user, logout, inactivityTime }) {
    const router = useRouter();
    
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
    
    // États de contrôle
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [message, setMessage] = useState('');
    const [filtreDisponibilite, setFiltreDisponibilite] = useState('toutes');

    // ☆☆☆ NOUVEAUX ÉTATS POUR CONTRÔLE ROI ABSOLU - ÉTAPE 3.1 ☆☆☆
    const [derniereCommande, setDerniereCommande] = useState(null);
    const [commandesTraitees, setCommandesTraitees] = useState(new Set());
    const [statsEcoute, setStatsEcoute] = useState({
        commandesRecues: 0,
        refreshEffectues: 0,
        derniereActivite: null
    });

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

    // ☆☆☆ FONCTION CORRIGÉE - PRIORITÉ DISPO EXCEPTIONNELLE ☆☆☆
    const isFormateurAbsent = (formateurId, dateStr) => {
        // D'ABORD vérifier s'il a une dispo exceptionnelle (priorité absolue)
        const dispoExcept = absencesValidees.find(absence => {
            if (absence.formateur_id !== formateurId) return false;
            if (absence.type !== 'formation') return false;
            
            const estDansIntervalle = dateStr >= absence.date_debut && dateStr <= absence.date_fin;
            return estDansIntervalle;
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
            
            const estDansIntervalle = dateStr >= absence.date_debut && dateStr <= absence.date_fin;
            return estDansIntervalle;
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
            
            const estDansIntervalle = dateStr >= absence.date_debut && dateStr <= absence.date_fin;
            return estDansIntervalle;
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

        const formateursSansPlanningAvecStatut = filtreDisponibilite === 'toutes' 
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
                    
                    return { 
                        ...f, 
                        statut: null,
                        lieuSpecifique: false,
                        source: 'aucun_planning'
                    };
                })
            : [];

        return [...formateursDisponiblesPlanningType, ...formateursSansPlanningAvecStatut];
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

            jours.forEach((_, dayIndex) => {
                newLieuxParJour[dayIndex] = [0];
                ['Matin', 'AM'].forEach((creneau) => {
                    const key = `${dayIndex}-0-${creneau}`;
                    newApprenantsParCase[key] = [""];
                    newFormateursParCase[key] = [""];
                    newLieuxSelectionnes[key] = "";
                    newSalariesSelectionnes[key] = "";
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
                            newFormateursParCase[key] = [...item.formateurs_ids.filter(id => id), ""];
                        }
                        if (item.apprenants_ids && item.apprenants_ids.length > 0) {
                            newApprenantsParCase[key] = [...item.apprenants_ids.filter(id => id), ""];
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

    // FONCTIONS DE SAUVEGARDE
    const handleEnregistrerBrouillon = async () => {
        setIsLoading(true);
        
        try {
            const weekDates = getWeekDates(currentDate);
            const stats = await sauvegarderPlanning('brouillon', weekDates);

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
            const { error: insertError } = await supabase
                .from('planning_hebdomadaire')
                .insert(planningsToSave);

            if (insertError) {
                console.error('Erreur insertion planning:', insertError);
                throw insertError;
            }
        }

        if (planningFormateursToSave.length > 0) {
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
        return lieu?.couleur || '#ffffff';
    };

    const getTextColor = (backgroundColor) => {
        if (!backgroundColor || backgroundColor === '#ffffff') return '#000000';
        
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance > 0.5 ? '#000000' : '#ffffff';
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
        if (currentList.length > 1) {
            setFormateursParCase(prev => ({
                ...prev,
                [key]: prev[key].slice(0, -1)
            }));
        }
    };

    const handleApprenantChange = (dayIndex, lieuIndex, creneau, selectIndex, value) => {
        const key = `${dayIndex}-${lieuIndex}-${creneau}`;
        const newList = [...(apprenantsParCase[key] || [])];
        newList[selectIndex] = value;
        setApprenantsParCase(prev => ({ ...prev, [key]: newList }));
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
        if (currentList.length > 1) {
            setApprenantsParCase(prev => ({
                ...prev,
                [key]: prev[key].slice(0, -1)
            }));
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
            setApprenantsParCase(prev => ({ ...prev, [key]: [""] }));
            setFormateursParCase(prev => ({ ...prev, [key]: [""] }));
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

    if (!dataLoaded) {
        return <SkeletonPlanningLoader />;
    }

    return (
        <>
            <style jsx>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white !important; }
                    .print-title { display: block !important; text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; color: black !important; }
                }
                .print-title { display: none; }
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
                </div>

                <div className="print-title">
                    Planning semaine {semaine}
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

                        <div className="no-print" style={{
                            padding: '4px 8px',
                            fontSize: '12px',
                            fontWeight: '600',
                            borderRadius: '6px',
                            backgroundColor: inactivityTime >= 240 ? '#fee2e2' : inactivityTime >= 180 ? '#fef3c7' : '#d1fae5',
                            color: inactivityTime >= 240 ? '#dc2626' : inactivityTime >= 180 ? '#f59e0b' : '#10b981',
                            border: '1px solid',
                            borderColor: inactivityTime >= 240 ? '#fecaca' : inactivityTime >= 180 ? '#fde68a' : '#bbf7d0'
                        }}>
                            Status : {inactivityTime >= 300 ? '😴 ENDORMI!' : 
                                     inactivityTime >= 240 ? `⚠️ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                     inactivityTime >= 180 ? `⏰ ${Math.floor((300 - inactivityTime) / 60)}m${(300 - inactivityTime) % 60}s` :
                                     `🟢 ACTIF`}
                        </div>
                    </div>

                    <div className="no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
                            onClick={handleEnregistrerBrouillon}
                            disabled={isLoading}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: isLoading ? '#94a3b8' : '#6b7280',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? 'Sauvegarde...' : 'Enregistrer'}
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

                        <button
                            onClick={handleValiderTransmettre}
                            disabled={isLoading}
                            style={{
                                padding: '6px 16px',
                                backgroundColor: isLoading ? '#94a3b8' : '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '14px',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            {isLoading ? 'Validation...' : 'Valider & Transmettre'}
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
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                <th style={{ 
                                    padding: '10px', 
                                    border: '1px solid #e5e7eb',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    textAlign: 'center',
                                    minWidth: '40px',
                                    maxWidth: '40px'
                                }}>
                                </th>
                                {jours.map((jour, dayIndex) => 
                                    (lieuxParJour[dayIndex] || []).map((lieuIndex, lieuPos) => (
                                        <th key={`${dayIndex}-${lieuIndex}`} style={{ 
                                            padding: '10px',
                                            border: '1px solid #e5e7eb',
                                            minWidth: '180px',
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
                                        padding: '8px', 
                                        border: '1px solid #e5e7eb',
                                        backgroundColor: creneauIndex === 0 ? '#fef3c7' : '#dbeafe',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        fontSize: '11px',
                                        minWidth: '40px',
                                        maxWidth: '40px'
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
                                                        minWidth: '180px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                        <select 
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                fontWeight: '500',
                                                                background: 'rgba(255,255,255,0.9)',
                                                                color: '#374151'
                                                            }}
                                                            value={selectedLieuId || ""}
                                                            onChange={(e) => handleLieuChange(dayIndex, lieuIndex, creneau, e.target.value)}
                                                        >
                                                            <option value="">Choisir lieu</option>
                                                            {lieux.map((lieu) => (
                                                                <option key={lieu.id} value={lieu.id}>{lieu.nom}</option>
                                                            ))}
                                                        </select>

                                                        <select 
                                                            style={{
                                                                width: '100%',
                                                                padding: '4px',
                                                                border: '1px solid #d1d5db',
                                                                borderRadius: '4px',
                                                                fontSize: '11px',
                                                                background: 'rgba(255,255,255,0.9)',
                                                                color: '#374151'
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
                                                            {(formateursParCase[cellKey] || [""]).map((selectedId, i) => {
                                                                const formateursDisponibles = getFormateursDisponibles(jour, creneau, selectedLieuId);
                                                                
                                                                return (
                                                                    <select
                                                                        key={i}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '3px',
                                                                            border: '1px solid #d1d5db',
                                                                            borderRadius: '3px',
                                                                            fontSize: '10px',
                                                                            background: 'rgba(255,255,255,0.9)',
                                                                            color: '#374151',
                                                                            marginBottom: '3px'
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
                                                                                    {f.statut === 'dispo_except' ? ' (EXCEPT)' : 
                                                                                     f.statut === 'disponible' ? 
                                                                                        (f.lieuSpecifique ? ' (LIEU)' : ' (S/P)') : ''}
                                                                                    {f.source === 'exception_validee_roi' ? ' [ROI]' : ''}
                                                                                </option>
                                                                            ))}
                                                                    </select>
                                                                );
                                                            })}

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
                                                                {(formateursParCase[cellKey] || []).length > 1 && (
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
                                                                APPRENANTS
                                                            </div>
                                                            {(apprenantsParCase[cellKey] || [""]).map((selectedId, i) => (
                                                                <select
                                                                    key={i}
                                                                    style={{
                                                                        width: '100%',
                                                                        padding: '3px',
                                                                        border: '1px solid #d1d5db',
                                                                        borderRadius: '3px',
                                                                        fontSize: '10px',
                                                                        background: 'rgba(255,255,255,0.9)',
                                                                        color: '#374151',
                                                                        marginBottom: '3px'
                                                                    }}
                                                                    value={selectedId}
                                                                    onChange={(e) => handleApprenantChange(dayIndex, lieuIndex, creneau, i, e.target.value)}
                                                                >
                                                                    <option value="">Apprenant</option>
                                                                    {apprenants
                                                                        .filter(a => {
                                                                            const currentSelections = apprenantsParCase[cellKey] || [];
                                                                            return !currentSelections.includes(a.id) || currentSelections[i] === a.id;
                                                                        })
                                                                        .map(a => (
                                                                            <option key={a.id} value={a.id}>
                                                                                {a.prenom} {a.nom}
                                                                            </option>
                                                                        ))}
                                                                </select>
                                                            ))}

                                                            <div className="no-print" style={{ display: 'flex', gap: '3px', justifyContent: 'center' }}>
                                                                <button
                                                                    onClick={() => handleAddApprenant(dayIndex, lieuIndex, creneau)}
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
                                                                {(apprenantsParCase[cellKey] || []).length > 1 && (
                                                                    <button
                                                                        onClick={() => handleRemoveApprenant(dayIndex, lieuIndex, creneau)}
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
                                                        </div>
                                                    </div>
                                                </td>
                                            );
                                        })
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    )
}

// 🛡️ PROTECTION AVEC HOC - Page titre personnalisé
export default withAuthAdmin(PlanningCoordo, "Planning Coordinateur");
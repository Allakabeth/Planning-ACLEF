import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { filterApprenantsParAbsence } from '../lib/absenceApprenantUtils';

// MenuApprenants V1 Corrigé - Wrapper intelligent compatible avec structure existante
export default function MenuApprenants({
  cellKey,                    // clé de case (ex: "0-0-Matin")
  creneauData: {             // données pour filtrage intelligent
    date,
    jour, 
    creneau,
    lieu_id
  },
  apprenantsParCase,         // état existant (lecture seule) - structure: {"0-0-Matin": ["", "id1", "id2"]}
  apprenants,                // liste complète apprenants
  onApprenantChange,         // handler existant: (dayIndex, lieuIndex, creneau, selectIndex, value)
  onAddApprenant,            // handler existant: (dayIndex, lieuIndex, creneau)
  onRemoveApprenant,         // handler existant: (dayIndex, lieuIndex, creneau)
  disabled = false,
  couleurEnregistree,        // NOUVEAU: couleur persistante post-enregistrement
  readOnly = false           // NOUVEAU: mode lecture seule (consultation)
}) {
  // État pour apprenants disponibles après filtrage intelligent
  const [apprenantsDisponibles, setApprenantsDisponibles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 🚨 CIRCUIT BREAKER - Protection contre boucle infinie
  const [requestCount, setRequestCount] = useState(0);
  const MAX_REQUESTS_PER_MINUTE = 10;
  const [lastRequestTime, setLastRequestTime] = useState(Date.now());
  
  // 🚀 CACHE - Éviter requêtes répétitives
  const [cache] = useState(() => new Map());

  // Fonctions de validation (copiées de MenuApprenants original)
  const validateDatesFormation = (apprenant, dateTest) => {
    if (!apprenant.date_entree_formation) return false;
    
    const dateEntree = new Date(apprenant.date_entree_formation);
    const dateFin = new Date(
      apprenant.date_fin_formation_reelle || 
      apprenant.date_sortie_previsionnelle
    );
    const dateTestObj = new Date(dateTest);
    
    return dateTestObj >= dateEntree && dateTestObj <= dateFin;
  };

  const validateStatutActuel = (apprenant, dateTest, suspensions) => {
    if (apprenant.statut_formation !== 'en_cours') return false;

    const suspensionActive = suspensions.find(s => {
      // Utiliser date_reprise_reelle si elle existe, sinon date_reprise_prevue
      const dateReprise = s.date_reprise_reelle || s.date_reprise_prevue;

      return s.apprenant_id === apprenant.id &&
             new Date(s.date_suspension) <= new Date(dateTest) &&
             dateReprise && new Date(dateReprise) >= new Date(dateTest);
    });

    return !suspensionActive;
  };

  const validatePlanningType = (apprenantId, planningTypes, jourRequis, creneauRequis, lieuIdRequis) => {
    const planning = planningTypes.find(pt => 
      pt.apprenant_id === apprenantId &&
      pt.jour === jourRequis.toLowerCase() &&
      pt.creneau === creneauRequis
    );
    
    if (!planning) return false;
    
    if (lieuIdRequis && planning.lieu_id && planning.lieu_id !== lieuIdRequis) {
      return false;
    }
    
    return true;
  };

  // Fonction de filtrage intelligent (adaptée de MenuApprenants original)
  const getApprenantsDisponibles = async (dateTest, jour, creneau, lieuId) => {
    try {

      // 1. Récupérer tous les apprenants actifs
      let { data: apprenantsData, error: apprenantsError } = await supabase
        .from('apprenants_actifs')
        .select('*');
      
      if (apprenantsError && apprenantsError.code === 'PGRST106') {
        const result = await supabase
          .from('users')
          .select('*')
          .eq('role', 'apprenant')
          .eq('archive', false);
        
        apprenantsData = result.data;
      } else if (apprenantsError) {
        throw apprenantsError;
      }

      if (!apprenantsData || apprenantsData.length === 0) {
        return [];
      }

      // 2. Récupérer les planning types
      const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
      const { data: planningTypes, error: planningError } = await supabase
        .from('planning_apprenants')
        .select('apprenant_id, lieu_id, jour, creneau')
        .eq('jour', jour.toLowerCase())
        .eq('creneau', creneauDB)
        .eq('actif', true);
      
      if (planningError && planningError.code !== 'PGRST106') throw planningError;

      // 3. Récupérer les suspensions actives
      let suspensions = [];
      try {
        const { data: suspensionsData, error: suspensionsError } = await supabase
          .from('suspensions_parcours')
          .select('apprenant_id, date_suspension, date_reprise_prevue, date_reprise_reelle')
          .lte('date_suspension', dateTest);

        if (!suspensionsError) {
          suspensions = suspensionsData || [];
        }
      } catch (suspError) {
        console.log('Suspensions non disponibles, poursuite sans');
      }

      // 4. Appliquer les trois filtres existants
      const results = apprenantsData
        .map(apprenant => {
          const critere1 = validateDatesFormation(apprenant, dateTest);
          if (!critere1) return null;

          const critere2 = validateStatutActuel(apprenant, dateTest, suspensions);
          if (!critere2) return null;

          const critere3 = validatePlanningType(apprenant.id, planningTypes || [], jour, creneauDB, lieuId);
          if (!critere3) return null;

          return apprenant;
        })
        .filter(Boolean);

      // 5. 🆕 NOUVEAU: Filtrer par absences apprenants (non-intrusif)
      const resultatsAvecAbsences = await filterApprenantsParAbsence(results, dateTest, creneau, lieuId);

      console.log(`✅ MenuApprenants V1 Corrigé: ${results.length} apprenants disponibles → ${resultatsAvecAbsences.length} après filtrage absences`);
      return resultatsAvecAbsences;
      
    } catch (error) {
      console.error('Erreur filtrage MenuApprenants V1 Corrigé:', error);
      throw error;
    }
  };

  // Déclencher le filtrage quand les données changent - AVEC PROTECTION
  useEffect(() => {
    // 🚨 CIRCUIT BREAKER CHECK
    const now = Date.now();
    if (now - lastRequestTime > 60000) {
      // Reset counter every minute
      setRequestCount(0);
      setLastRequestTime(now);
    }
    
    if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
      console.error('🚨 CIRCUIT BREAKER: Trop de requêtes MenuApprenants, arrêt forcé');
      setError('Trop de requêtes - rechargez la page');
      return;
    }
    
    if (date && jour && creneau && lieu_id) {
      // 🚀 CHECK CACHE FIRST - mais on invalidate le cache toutes les 30 secondes pour les absences
      const cacheKey = `${date}-${jour}-${creneau}-${lieu_id}`;
      const now = Date.now();

      // Invalider le cache toutes les 30 secondes pour permettre de voir les nouvelles absences
      if (cache.has(cacheKey)) {
        const cacheEntry = cache.get(cacheKey);
        if (cacheEntry.timestamp && (now - cacheEntry.timestamp) < 30000) {
          console.log('🚀 Cache hit MenuApprenants:', cacheKey);
          setApprenantsDisponibles(cacheEntry.data);
          return;
        } else {
          console.log('🔄 Cache expiré, rechargement pour nouvelles absences');
          cache.delete(cacheKey);
        }
      }
      
      setLoading(true);
      setError('');
      setRequestCount(prev => prev + 1);
      
      console.log(`📡 MenuApprenants fetch #${requestCount + 1}: ${cacheKey}`);
      
      getApprenantsDisponibles(date, jour, creneau, lieu_id)
        .then(disponibles => {
          // Store in cache with timestamp
          cache.set(cacheKey, {
            data: disponibles,
            timestamp: Date.now()
          });
          setApprenantsDisponibles(disponibles);
        })
        .catch(err => {
          console.error('Erreur filtrage:', err);
          setError(err.message);
          setApprenantsDisponibles([]);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setApprenantsDisponibles([]);
    }
  }, [date, jour, creneau, lieu_id]); // Dépendances conservées mais protégées

  // Extraire les indices de la cellKey pour les handlers
  const [dayIndex, lieuIndex, creneauName] = cellKey.split('-');
  const dayIdx = parseInt(dayIndex);
  const lieuIdx = parseInt(lieuIndex);

  // Liste actuelle des apprenants sélectionnés pour cette case
  const selectedApprenants = apprenantsParCase[cellKey] || [];

  return (
    <>
      <style jsx>{`
        @media print {
          /* Masquer tous les boutons et éléments no-print */
          .no-print { display: none !important; }
          .no-print * { display: none !important; }
          button { display: none !important; }
          
          /* Taille des selects */
          select {
            height: 15px !important;
            padding: 0px !important;
            font-size: 8px !important;
            line-height: 1 !important;
            background: transparent !important;
            color: #000000 !important;
          }
        }
      `}</style>
      
      <div style={{
        padding: '6px',
        background: 'rgba(255, 255, 255, 0.2)',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <div className="apprenant-header" style={{ 
          fontSize: '10px', 
          fontWeight: '600', 
          marginBottom: '4px',
          textAlign: 'center'
        }}>
          APPRENANTS
        </div>
      
      {/* Rendu des selects pour chaque apprenant sélectionné - Structure identique à l'existant */}
      {selectedApprenants.map((selectedId, i) => {
        // Trouver l'apprenant sélectionné pour déterminer le style
        const apprenantSelectionne = apprenantsDisponibles.find(a => a.id === selectedId);
        const isPresenceExceptionnelle = apprenantSelectionne?.statutAbsence === 'presence_exceptionnelle';

        return (
        <div key={i}>
          <select
            style={{
              width: '100%',
              padding: '3px',
              border: isPresenceExceptionnelle ? '2px solid #ff9800' : '1px solid #d1d5db',
              borderRadius: '3px',
              fontSize: '10px',
              background: isPresenceExceptionnelle ?
                           'linear-gradient(135deg, #ff9800, #ffb74d)' :
                           (couleurEnregistree || 'rgba(255,255,255,0.9)'),
              color: isPresenceExceptionnelle ? 'white' : '#000000',
              marginBottom: '3px',
              fontWeight: isPresenceExceptionnelle ? 'bold' : 'normal',
              cursor: readOnly ? 'not-allowed' : 'pointer'
            }}
            value={selectedId}
            onChange={(e) => onApprenantChange(dayIdx, lieuIdx, creneauName, i, e.target.value)}
            disabled={disabled || loading || readOnly}
          >
            <option value="">
              {loading ? '⏳ Filtrage...' : 
               disabled ? '📍 Lieu requis' : 
               error ? '❌ Erreur' :
               'Apprenant'}
            </option>
            {!disabled && !loading && !error && (() => {
              // Fusionner apprenants disponibles + apprenants historiques (déjà sélectionnés mais plus dans planning type)
              const idsDisponibles = apprenantsDisponibles.map(a => a.id);
              const apprenantsHistoriques = selectedApprenants
                .filter(id => id && !idsDisponibles.includes(id))
                .map(id => {
                  const apprenant = apprenants.find(a => a.id === id);
                  return apprenant ? { ...apprenant, isHistorique: true } : null;
                })
                .filter(Boolean);

              const tousLesApprenants = [...apprenantsDisponibles, ...apprenantsHistoriques];

              return tousLesApprenants
                .filter(a => {
                  // Logique anti-doublons identique à l'existant
                  const currentSelections = selectedApprenants || [];
                  return !currentSelections.includes(a.id) || currentSelections[i] === a.id;
                })
                .map(a => (
                  <option
                    key={a.id}
                    value={a.id}
                    style={{
                      backgroundColor: a.statutAbsence === 'presence_exceptionnelle' ? '#ff9800' :
                                       a.isHistorique ? '#e0e0e0' : 'inherit',
                      color: a.statutAbsence === 'presence_exceptionnelle' ? 'white' : 'inherit'
                    }}
                  >
                    {a.statutAbsence === 'presence_exceptionnelle' ? '✨ ' : ''}
                    {a.isHistorique ? '🔒 ' : ''}{a.prenom} {a.nom}
                    {a.statutAbsence === 'presence_exceptionnelle' && a.lieuExceptionnel ? ` (${a.lieuExceptionnel})` : ''}
                  </option>
                ));
            })()}
          </select>
        </div>
        )
      })}

      {/* Boutons +/- identiques à l'existant */}
      {!readOnly && (
        <div className="no-print" style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '3px' }}>
          <button
            onClick={() => onAddApprenant(dayIdx, lieuIdx, creneauName)}
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
            disabled={disabled}
          >
            +
          </button>
          {selectedApprenants.length > 0 && (
            <button
              onClick={() => onRemoveApprenant(dayIdx, lieuIdx, creneauName)}
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
              disabled={disabled}
            >
              −
            </button>
          )}
        </div>
      )}

      </div>
    </>
  );
}
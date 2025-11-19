/**
 * Utilitaires pour la génération de feuilles d'émargement HSP
 * @module emargementUtils
 */

import { supabase } from './supabaseClient';

/**
 * Récupère les apprenants HSP prévus au planning type pour un créneau donné
 * @param {string} jour - Jour de la semaine (ex: 'Lundi', 'Mardi', etc.)
 * @param {string} creneau - Créneau ('matin' ou 'AM')
 * @param {string} lieu_id - UUID du lieu
 * @returns {Promise<Array>} Liste des apprenants HSP prévus
 */
export async function getApprenantsHSPPlanningType(jour, creneau, lieu_id) {
  try {
    // Normaliser le jour en minuscule (BDD stocke en minuscule)
    const jourNormalise = jour.toLowerCase();

    console.log('🔍 DEBUG getApprenantsHSPPlanningType:', {
      jour,
      jourNormalise,
      creneau,
      lieu_id
    });

    // 1. Récupérer les apprenants du planning type pour ce créneau
    const { data: planningApprenants, error: errorPlanning } = await supabase
      .from('planning_apprenants')
      .select('apprenant_id')
      .eq('jour', jourNormalise)
      .eq('creneau', creneau)
      .eq('lieu_id', lieu_id)
      .eq('actif', true);

    if (errorPlanning) {
      console.error('Erreur récupération planning apprenants:', errorPlanning);
      return [];
    }

    console.log('📊 Planning apprenants trouvés:', planningApprenants?.length || 0);

    if (!planningApprenants || planningApprenants.length === 0) {
      console.log('⚠️ Aucun apprenant dans planning_apprenants pour ce créneau');
      return [];
    }

    const apprenantsIds = planningApprenants.map(p => p.apprenant_id);

    // 2. Récupérer les détails des apprenants (filtrer uniquement HSP)
    const { data: apprenants, error: errorApprenants } = await supabase
      .from('users')
      .select('id, prenom, nom, dispositif, statut_formation')
      .in('id', apprenantsIds)
      .eq('role', 'apprenant')
      .eq('dispositif', 'HSP')
      .eq('archive', false)
      .in('statut_formation', ['en_cours', 'suspendu'])
      .order('nom', { ascending: true });

    if (errorApprenants) {
      console.error('Erreur récupération apprenants:', errorApprenants);
      return [];
    }

    return apprenants || [];
  } catch (error) {
    console.error('Erreur getApprenantsHSPPlanningType:', error);
    return [];
  }
}

/**
 * Vérifie les absences des apprenants pour une date et un créneau donnés
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} creneau - Créneau ('matin' ou 'AM')
 * @param {Array<string>} apprenantsIds - Liste des IDs des apprenants à vérifier
 * @returns {Promise<Object>} Map des absences par apprenant_id
 */
export async function getAbsencesApprenants(date, creneau, apprenantsIds) {
  try {
    if (!apprenantsIds || apprenantsIds.length === 0) {
      return {};
    }

    const dateObj = new Date(date);

    // Récupérer les absences pour cette date
    const { data: absences, error } = await supabase
      .from('absences_apprenants')
      .select('*')
      .in('apprenant_id', apprenantsIds)
      .eq('statut', 'actif')
      .or(`and(type.eq.absence_ponctuelle,date_specifique.eq.${date},creneau.eq.${creneau}),and(type.eq.absence_periode,date_debut.lte.${date},date_fin.gte.${date})`);

    if (error) {
      console.error('Erreur récupération absences:', error);
      return {};
    }

    // Créer une map des absences par apprenant_id
    const absencesMap = {};

    if (absences && absences.length > 0) {
      absences.forEach(absence => {
        // Vérifier si l'absence concerne ce créneau
        let concerneCeCreneau = false;

        if (absence.type === 'absence_ponctuelle') {
          // Absence ponctuelle : vérifier date et créneau
          concerneCeCreneau = absence.date_specifique === date && absence.creneau === creneau;
        } else if (absence.type === 'absence_periode') {
          // Absence période : vérifier que la date est dans la période
          const dateDebut = new Date(absence.date_debut);
          const dateFin = new Date(absence.date_fin);
          concerneCeCreneau = dateObj >= dateDebut && dateObj <= dateFin;
        }

        if (concerneCeCreneau) {
          absencesMap[absence.apprenant_id] = {
            type: absence.type,
            motif: absence.motif || 'Non spécifié',
            date_debut: absence.date_debut,
            date_fin: absence.date_fin
          };
        }
      });
    }

    return absencesMap;
  } catch (error) {
    console.error('Erreur getAbsencesApprenants:', error);
    return {};
  }
}

/**
 * Récupère le salarié principal prévu pour un créneau (celui du menu déroulant)
 * IMPORTANT : Cherche dans planning_hebdomadaire avec le champ salaries_ids
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} creneau - Créneau ('M' ou 'AM')
 * @param {string} lieu_id - UUID du lieu
 * @returns {Promise<Array>} Salarié principal (array avec 1 élément max)
 */
export async function getEncadrants(date, creneau, lieu_id) {
  try {
    // 1. Récupérer le planning hebdomadaire pour ce créneau
    const { data: planning, error: errorPlanning } = await supabase
      .from('planning_hebdomadaire')
      .select('salaries_ids')
      .eq('date', date)
      .eq('creneau', creneau === 'M' ? 'matin' : 'AM')
      .eq('lieu_id', lieu_id)
      .single();

    if (errorPlanning || !planning) {
      console.log('Pas de planning trouvé pour ce créneau');
      return [];
    }

    // 2. Récupérer uniquement le premier salarié (celui du menu déroulant)
    const salariesIds = planning.salaries_ids || [];

    if (salariesIds.length === 0) {
      console.log('Aucun salarié assigné pour ce créneau');
      return [];
    }

    // Prendre seulement le premier salarié
    const salarieId = salariesIds[0];

    // 3. Récupérer les détails du salarié
    const { data: salarie, error: errorSalarie } = await supabase
      .from('users')
      .select('id, prenom, nom, role')
      .eq('id', salarieId)
      .eq('role', 'salarié')
      .eq('archive', false)
      .single();

    if (errorSalarie) {
      console.error('Erreur récupération salarié:', errorSalarie);
      return [];
    }

    return salarie ? [salarie] : [];
  } catch (error) {
    console.error('Erreur getEncadrants:', error);
    return [];
  }
}

/**
 * Récupère toutes les données nécessaires pour générer une feuille d'émargement
 * @param {Object} seanceData - Données de la séance
 * @param {string} seanceData.date - Date au format YYYY-MM-DD
 * @param {string} seanceData.jour - Jour de la semaine
 * @param {string} seanceData.creneau - Créneau ('M' ou 'AM')
 * @param {string} seanceData.lieu_id - UUID du lieu
 * @param {string} seanceData.lieu_nom - Nom du lieu
 * @returns {Promise<Object>} Données formatées pour l'émargement
 */
export async function getEmargementData(seanceData) {
  try {
    const { date, jour, creneau, lieu_id, lieu_nom } = seanceData;

    // Normaliser le créneau pour le planning_apprenants ('matin' ou 'AM')
    const creneauNormalise = creneau === 'M' ? 'matin' : 'AM';

    // 1. Récupérer le lieu avec le numéro de session
    const { data: lieu, error: errorLieu } = await supabase
      .from('lieux')
      .select('nom, initiale, numero_session')
      .eq('id', lieu_id)
      .single();

    if (errorLieu) {
      throw new Error('Lieu non trouvé');
    }

    // 2. Récupérer les apprenants HSP prévus au planning type
    const apprenants = await getApprenantsHSPPlanningType(jour, creneauNormalise, lieu_id);

    // 3. Récupérer les absences pour ces apprenants
    const apprenantsIds = apprenants.map(a => a.id);
    const absences = await getAbsencesApprenants(date, creneauNormalise, apprenantsIds);

    // 4. Récupérer les encadrants
    const encadrants = await getEncadrants(date, creneau, lieu_id);

    // 5. Formatter les données
    const apprenantsAvecStatut = apprenants.map(apprenant => ({
      id: apprenant.id,
      nom: apprenant.nom,
      prenom: apprenant.prenom,
      absent: !!absences[apprenant.id],
      motif_absence: absences[apprenant.id]?.motif || null
    }));

    // 6. Calculer le numéro de semaine
    const dateObj = new Date(date);
    const startOfYear = new Date(dateObj.getFullYear(), 0, 1);
    const days = Math.floor((dateObj - startOfYear) / (24 * 60 * 60 * 1000));
    const numeroSemaine = Math.ceil((days + startOfYear.getDay() + 1) / 7);

    return {
      // Informations séance
      date,
      jour,
      creneau,
      creneauLibelle: creneau === 'M' ? 'Matin' : 'Après-midi',
      horaires: creneau === 'M' ? '9h-12h' : '14h-17h',
      numeroSemaine,

      // Lieu et session
      lieu: {
        id: lieu_id,
        nom: lieu.nom,
        initiale: lieu.initiale,
        numero_session: lieu.numero_session
      },

      // Apprenants
      apprenants: apprenantsAvecStatut,
      nombreApprenants: apprenantsAvecStatut.length,
      nombreAbsents: apprenantsAvecStatut.filter(a => a.absent).length,
      nombrePresents: apprenantsAvecStatut.filter(a => !a.absent).length,

      // Encadrants
      encadrants: encadrants.map(e => ({
        id: e.id,
        nom: e.nom,
        prenom: e.prenom,
        role: e.role
      })),

      // Métadonnées
      genereLe: new Date().toISOString(),
      typeEmargement: 'HSP'
    };
  } catch (error) {
    console.error('Erreur getEmargementData:', error);
    throw error;
  }
}

/**
 * Vérifie si un créneau concerne uniquement des apprenants HSP
 * @param {string} jour - Jour de la semaine
 * @param {string} creneau - Créneau ('matin' ou 'AM')
 * @param {string} lieu_id - UUID du lieu
 * @returns {Promise<boolean>} true si le créneau est HSP, false sinon
 */
export async function isCreneauHSP(jour, creneau, lieu_id) {
  try {
    const apprenants = await getApprenantsHSPPlanningType(jour, creneau, lieu_id);
    return apprenants.length > 0;
  } catch (error) {
    console.error('Erreur isCreneauHSP:', error);
    return false;
  }
}

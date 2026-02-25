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
export async function getApprenantsHSPPlanningType(jour, creneau, lieu_id, date) {
  try {
    // Normaliser le jour en minuscule (BDD stocke en minuscule)
    const jourNormalise = jour.toLowerCase();

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

    if (!planningApprenants || planningApprenants.length === 0) {
      return [];
    }

    const apprenantsIds = planningApprenants.map(p => p.apprenant_id);

    // 2. Récupérer les détails des apprenants (filtrer uniquement HSP)
    const { data: apprenants, error: errorApprenants } = await supabase
      .from('users')
      .select('id, prenom, nom, dispositif, statut_formation, date_entree_formation, date_sortie_previsionnelle')
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

    // 3. Filtrer par dates : exclure les apprenants pas encore entrés ou déjà sortis
    const apprenantsFiltrés = (apprenants || []).filter(a => {
      if (date && a.date_entree_formation && a.date_entree_formation > date) return false;
      if (date && a.date_sortie_previsionnelle && a.date_sortie_previsionnelle < date) return false;
      return true;
    });

    return apprenantsFiltrés;
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

    // 2. Récupérer les apprenants HSP prévus au planning type (filtré par dates)
    const apprenants = await getApprenantsHSPPlanningType(jour, creneauNormalise, lieu_id, date);

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

// ========================================
// FONCTIONS POUR LES FEUILLES OPCO
// ========================================

/**
 * Récupère les apprenants OPCO (non-HSP) prévus au planning type pour un créneau donné
 * @param {string} jour - Jour de la semaine (ex: 'Lundi', 'Mardi', etc.)
 * @param {string} creneau - Créneau ('matin' ou 'AM')
 * @param {string} lieu_id - UUID du lieu
 * @returns {Promise<Array>} Liste des apprenants OPCO prévus
 */
export async function getApprenantsOPCOPlanningType(jour, creneau, lieu_id, date) {
  try {
    // Normaliser le jour en minuscule (BDD stocke en minuscule)
    const jourNormalise = jour.toLowerCase();

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

    if (!planningApprenants || planningApprenants.length === 0) {
      return [];
    }

    const apprenantsIds = planningApprenants.map(p => p.apprenant_id);

    // 2. Récupérer les détails des apprenants (filtrer uniquement OPCO - exclure HSP et CDV)
    const { data: apprenants, error: errorApprenants } = await supabase
      .from('users')
      .select('id, prenom, nom, dispositif, statut_formation, date_entree_formation, date_sortie_previsionnelle')
      .in('id', apprenantsIds)
      .eq('role', 'apprenant')
      .neq('dispositif', 'HSP')  // Exclure les HSP
      .neq('dispositif', 'CDV')  // Exclure les CDV (Contrat de Ville)
      .neq('dispositif', 'PM')   // Exclure les PM (Première Marche)
      .eq('archive', false)
      .in('statut_formation', ['en_cours', 'suspendu'])
      .order('nom', { ascending: true });

    if (errorApprenants) {
      console.error('Erreur récupération apprenants:', errorApprenants);
      return [];
    }

    // 3. Filtrer par dates : exclure les apprenants pas encore entrés ou déjà sortis
    const apprenantsFiltrés = (apprenants || []).filter(a => {
      if (date && a.date_entree_formation && a.date_entree_formation > date) return false;
      if (date && a.date_sortie_previsionnelle && a.date_sortie_previsionnelle < date) return false;
      return true;
    });

    return apprenantsFiltrés;
  } catch (error) {
    console.error('Erreur getApprenantsOPCOPlanningType:', error);
    return [];
  }
}

/**
 * Formate les créneaux d'un apprenant pour affichage
 * @param {string} apprenant_id - ID de l'apprenant
 * @returns {Promise<string>} Chaîne formatée (ex: "lundi AM, mercredi M, vendredi M")
 */
export async function formatCreneauxApprenant(apprenant_id) {
  try {
    // Récupérer tous les créneaux de l'apprenant
    const { data: creneaux, error } = await supabase
      .from('planning_apprenants')
      .select('jour, creneau')
      .eq('apprenant_id', apprenant_id)
      .eq('actif', true)
      .order('jour', { ascending: true });

    if (error || !creneaux || creneaux.length === 0) {
      return '';
    }

    // Ordre des jours
    const ordreJours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];

    // Grouper par jour
    const creneauxParJour = {};
    creneaux.forEach(c => {
      if (!creneauxParJour[c.jour]) {
        creneauxParJour[c.jour] = [];
      }
      creneauxParJour[c.jour].push(c.creneau);
    });

    // Formater
    const parties = [];
    ordreJours.forEach(jour => {
      if (creneauxParJour[jour]) {
        const creneauxJour = creneauxParJour[jour];
        creneauxJour.forEach(creneau => {
          const creneauAffichage = creneau === 'matin' ? 'M' : 'AM';
          parties.push(`${jour} ${creneauAffichage}`);
        });
      }
    });

    return parties.join(', ');
  } catch (error) {
    console.error('Erreur formatCreneauxApprenant:', error);
    return '';
  }
}

/**
 * Récupère toutes les données nécessaires pour générer une feuille d'émargement OPCO
 * @param {Object} seanceData - Données de la séance
 * @param {string} seanceData.date - Date au format YYYY-MM-DD
 * @param {string} seanceData.jour - Jour de la semaine
 * @param {string} seanceData.creneau - Créneau ('M' ou 'AM')
 * @param {string} seanceData.lieu_id - UUID du lieu
 * @param {string} seanceData.lieu_nom - Nom du lieu
 * @returns {Promise<Object>} Données formatées pour l'émargement OPCO
 */
export async function getEmargementDataOPCO(seanceData) {
  try {
    const { date, jour, creneau, lieu_id, lieu_nom } = seanceData;

    // Normaliser le créneau pour le planning_apprenants ('matin' ou 'AM')
    const creneauNormalise = creneau === 'M' ? 'matin' : 'AM';

    // 1. Récupérer les apprenants OPCO prévus au planning type (filtré par dates)
    const apprenants = await getApprenantsOPCOPlanningType(jour, creneauNormalise, lieu_id, date);

    // 2. Pour chaque apprenant, récupérer ses créneaux
    const apprenantsAvecCreneaux = await Promise.all(
      apprenants.map(async (apprenant) => {
        const creneauxTexte = await formatCreneauxApprenant(apprenant.id);

        // Formater les dates
        const dateDebut = apprenant.date_entree_formation
          ? formatDateFr(apprenant.date_entree_formation)
          : '';
        const dateFin = apprenant.date_sortie_previsionnelle
          ? formatDateFr(apprenant.date_sortie_previsionnelle)
          : '';

        return {
          id: apprenant.id,
          nom: apprenant.nom,
          prenom: apprenant.prenom,
          date_debut: dateDebut,
          date_fin: dateFin,
          creneaux: creneauxTexte,
          // Format pour affichage : "Du DD/MM/YYYY au DD/MM/YYYY, créneaux"
          periode_formation: dateDebut && dateFin
            ? `Du ${dateDebut} au ${dateFin}, ${creneauxTexte}`
            : ''
        };
      })
    );

    // 3. Récupérer les encadrants
    const encadrants = await getEncadrants(date, creneau, lieu_id);

    return {
      // Informations séance
      date,
      jour,
      creneau,
      creneauLibelle: creneau === 'M' ? 'Matin' : 'Après-midi',
      horaires: creneau === 'M' ? '9h-12h' : '14h-17h',

      // Apprenants
      apprenants: apprenantsAvecCreneaux,
      nombreApprenants: apprenantsAvecCreneaux.length,

      // Encadrants
      encadrants: encadrants.map(e => ({
        id: e.id,
        nom: e.nom,
        prenom: e.prenom,
        role: e.role
      })),

      // Métadonnées
      genereLe: new Date().toISOString(),
      typeEmargement: 'OPCO'
    };
  } catch (error) {
    console.error('Erreur getEmargementDataOPCO:', error);
    throw error;
  }
}

/**
 * Vérifie si un créneau concerne des apprenants OPCO (non-HSP)
 * @param {string} jour - Jour de la semaine
 * @param {string} creneau - Créneau ('matin' ou 'AM')
 * @param {string} lieu_id - UUID du lieu
 * @returns {Promise<boolean>} true si le créneau a des apprenants OPCO, false sinon
 */
export async function isCreneauOPCO(jour, creneau, lieu_id) {
  try {
    const apprenants = await getApprenantsOPCOPlanningType(jour, creneau, lieu_id);
    return apprenants.length > 0;
  } catch (error) {
    console.error('Erreur isCreneauOPCO:', error);
    return false;
  }
}

/**
 * Formate une date YYYY-MM-DD en format français JJ/MM/YYYY
 * @param {string} dateStr - Date au format YYYY-MM-DD
 * @returns {string} Date au format JJ/MM/YYYY
 */
function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const [annee, mois, jour] = dateStr.split('-');
  return `${jour}/${mois}/${annee}`;
}

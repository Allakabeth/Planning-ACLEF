/**
 * Utilitaires pour le pré-remplissage du planning depuis le planning type
 * Utilisé pour générer automatiquement la semaine S+1
 */

import { supabase } from './supabaseClient';

// Mapping jour texte vers index (0=Lundi, 4=Vendredi)
const jourVersIndex = {
    'lundi': 0, 'mardi': 1, 'mercredi': 2, 'jeudi': 3, 'vendredi': 4
};

// Mapping créneau DB vers affichage
const creneauVersAffichage = {
    'matin': 'Matin', 'M': 'Matin', 'AM': 'AM'
};

/**
 * Vérifie si la date cible est la semaine suivante (S+1)
 */
export function isNextWeek(targetDate) {
    return isWeekPlusN(targetDate, 1);
}

/**
 * Vérifie si la date cible est la semaine S+2
 */
export function isWeekPlusTwo(targetDate) {
    return isWeekPlusN(targetDate, 2);
}

/**
 * Vérifie si la date cible est la semaine S+N (N semaines après la semaine actuelle)
 */
export function isWeekPlusN(targetDate, n) {
    const now = new Date();

    // Lundi de la semaine actuelle
    const lundiActuel = new Date(now);
    lundiActuel.setDate(now.getDate() - now.getDay() + 1);
    lundiActuel.setHours(0, 0, 0, 0);

    // Lundi de la semaine S+N
    const lundiPlusN = new Date(lundiActuel);
    lundiPlusN.setDate(lundiActuel.getDate() + (7 * n));

    // Lundi de la semaine cible
    const target = new Date(targetDate);
    const lundiCible = new Date(target);
    lundiCible.setDate(target.getDate() - target.getDay() + 1);
    lundiCible.setHours(0, 0, 0, 0);

    return lundiCible.getTime() === lundiPlusN.getTime();
}

/**
 * Vérifie si un formateur est absent à une date/créneau donné
 * Retourne true si ABSENT, false si disponible
 */
function isFormateurAbsentPourDate(formateurId, dateStr, creneau, absencesFormateurs) {
    // D'abord vérifier dispo exceptionnelle (type 'formation')
    const dispoExcept = absencesFormateurs.find(abs => {
        if (abs.formateur_id !== formateurId) return false;
        if (abs.type !== 'formation') return false;

        const dateDebut = new Date(abs.date_debut + 'T00:00:00');
        const dateFin = new Date(abs.date_fin + 'T23:59:59');
        const dateCheck = new Date(dateStr + 'T12:00:00');

        if (dateCheck < dateDebut || dateCheck > dateFin) return false;

        if (creneau && abs.creneau) {
            const creneauDB = creneau === 'Matin' ? 'M' : 'AM';
            return abs.creneau === creneauDB;
        }
        return true;
    });

    if (dispoExcept) return false;

    return absencesFormateurs.some(abs => {
        if (abs.formateur_id !== formateurId) return false;
        if (abs.type === 'formation') return false;

        const dateDebut = new Date(abs.date_debut + 'T00:00:00');
        const dateFin = new Date(abs.date_fin + 'T23:59:59');
        const dateCheck = new Date(dateStr + 'T12:00:00');

        if (dateCheck < dateDebut || dateCheck > dateFin) return false;

        if (abs.creneau && creneau) {
            const creneauDB = creneau === 'Matin' ? 'M' : 'AM';
            return abs.creneau === creneauDB;
        }

        return !abs.creneau;
    });
}

/**
 * Vérifie si un apprenant est absent à une date/créneau donné
 */
function isApprenantAbsentPourDate(apprenantId, dateStr, creneau, absencesApprenants) {
    return absencesApprenants.some(abs => {
        if (abs.apprenant_id !== apprenantId) return false;

        if (abs.date_specifique) {
            if (abs.date_specifique !== dateStr) return false;
        } else if (abs.date_debut && abs.date_fin) {
            const dateDebut = new Date(abs.date_debut + 'T00:00:00');
            const dateFin = new Date(abs.date_fin + 'T23:59:59');
            const dateCheck = new Date(dateStr + 'T12:00:00');
            if (dateCheck < dateDebut || dateCheck > dateFin) return false;
        } else {
            return false;
        }

        if (abs.creneau && creneau) {
            const creneauDB = creneau === 'Matin' ? 'M' : 'AM';
            return abs.creneau === creneauDB;
        }

        return true;
    });
}

/**
 * Vérifie si un apprenant est actif à une date donnée
 */
function isApprenantActif(apprenant, dateStr, suspensions) {
    if (!apprenant.date_entree_formation) return false;

    const dateEntree = new Date(apprenant.date_entree_formation);
    const dateFin = new Date(
        apprenant.date_fin_formation_reelle ||
        apprenant.date_sortie_previsionnelle ||
        '2099-12-31'
    );
    const dateCheck = new Date(dateStr);

    if (dateCheck < dateEntree || dateCheck > dateFin) return false;

    if (apprenant.statut_formation && apprenant.statut_formation !== 'en_cours') return false;

    const suspensionActive = suspensions.find(s => {
        if (s.apprenant_id !== apprenant.id) return false;
        const dateSuspension = new Date(s.date_suspension);
        const dateReprise = new Date(s.date_reprise_reelle || s.date_reprise_prevue || '2099-12-31');
        return dateCheck >= dateSuspension && dateCheck <= dateReprise;
    });

    return !suspensionActive;
}

/**
 * Génère le planning depuis le planning type pour une semaine donnée
 * EXCLUT les absents du planning généré
 */
export async function genererPlanningDepuisType(weekDates, absencesFormateurs, absencesApprenants) {
    try {
        const [formateursPT, apprenantsPT, apprenantsActifs, suspensionsRes] = await Promise.all([
            supabase.from('planning_type_formateurs')
                .select('formateur_id, jour, creneau, lieu_id')
                .eq('valide', true)
                .eq('statut', 'disponible'),  // Exclure dispo_except - les coordos les ajouteront manuellement
            supabase.from('planning_apprenants')
                .select('apprenant_id, jour, creneau, lieu_id'),
            supabase.from('apprenants_actifs')
                .select('id, prenom, nom, date_entree_formation, date_sortie_previsionnelle, date_fin_formation_reelle, statut_formation'),
            supabase.from('suspensions_parcours')
                .select('apprenant_id, date_suspension, date_reprise_prevue, date_reprise_reelle')
        ]);

        if (formateursPT.error) throw formateursPT.error;
        if (apprenantsPT.error) throw apprenantsPT.error;

        const planningFormateurs = formateursPT.data || [];
        const planningApprenants = apprenantsPT.data || [];
        const apprenantsList = apprenantsActifs.data || [];
        const suspensions = suspensionsRes.data || [];

        const apprenantsMap = {};
        apprenantsList.forEach(a => { apprenantsMap[a.id] = a; });

        const formateursParCase = {};
        const apprenantsParCase = {};
        const lieuxParJour = {};
        const lieuxSelectionnes = {};

        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            lieuxParJour[dayIndex] = new Set();
        }

        // Collecter les lieux des formateurs DISPONIBLES
        planningFormateurs.forEach(pt => {
            const dayIndex = jourVersIndex[pt.jour?.toLowerCase()];
            if (dayIndex === undefined || !pt.lieu_id) return;
            const dateStr = weekDates[dayIndex];
            const creneau = creneauVersAffichage[pt.creneau] || pt.creneau;
            if (isFormateurAbsentPourDate(pt.formateur_id, dateStr, creneau, absencesFormateurs)) return;
            lieuxParJour[dayIndex].add(pt.lieu_id);
        });

        // Collecter les lieux des apprenants DISPONIBLES
        planningApprenants.forEach(pt => {
            const dayIndex = jourVersIndex[pt.jour?.toLowerCase()];
            if (dayIndex === undefined || !pt.lieu_id) return;
            const dateStr = weekDates[dayIndex];
            const creneau = creneauVersAffichage[pt.creneau] || pt.creneau;
            const apprenant = apprenantsMap[pt.apprenant_id];
            if (!apprenant || !isApprenantActif(apprenant, dateStr, suspensions)) return;
            if (isApprenantAbsentPourDate(pt.apprenant_id, dateStr, creneau, absencesApprenants)) return;
            lieuxParJour[dayIndex].add(pt.lieu_id);
        });

        const lieuxIndexMap = {};
        const lieuxIdsParJour = {};

        Object.keys(lieuxParJour).forEach(dayIndex => {
            const lieuxSet = lieuxParJour[dayIndex];
            const lieuxArray = Array.from(lieuxSet);
            lieuxIdsParJour[dayIndex] = lieuxArray;
            lieuxParJour[dayIndex] = lieuxArray.length > 0 ? lieuxArray.map((_, i) => i) : [];

            lieuxIndexMap[dayIndex] = {};
            lieuxArray.forEach((lieuId, index) => {
                lieuxIndexMap[dayIndex][lieuId] = index;
            });

            lieuxParJour[dayIndex].forEach(lieuIndex => {
                ['Matin', 'AM'].forEach(creneau => {
                    const key = `${dayIndex}-${lieuIndex}-${creneau}`;
                    formateursParCase[key] = [];
                    apprenantsParCase[key] = [];
                    const lieuId = lieuxArray[lieuIndex];
                    if (lieuId) {
                        lieuxSelectionnes[key] = lieuId;
                    }
                });
            });
        });

        // Remplir formateurs DISPONIBLES
        planningFormateurs.forEach(pt => {
            const dayIndex = jourVersIndex[pt.jour?.toLowerCase()];
            if (dayIndex === undefined || !pt.lieu_id) return;
            const dateStr = weekDates[dayIndex];
            const creneau = creneauVersAffichage[pt.creneau] || pt.creneau;
            if (isFormateurAbsentPourDate(pt.formateur_id, dateStr, creneau, absencesFormateurs)) return;
            const lieuIndex = lieuxIndexMap[dayIndex]?.[pt.lieu_id];
            if (lieuIndex === undefined) return;
            const key = `${dayIndex}-${lieuIndex}-${creneau}`;
            if (formateursParCase[key] && !formateursParCase[key].includes(pt.formateur_id)) {
                formateursParCase[key].push(pt.formateur_id);
            }
        });

        // Remplir apprenants DISPONIBLES
        planningApprenants.forEach(pt => {
            const dayIndex = jourVersIndex[pt.jour?.toLowerCase()];
            if (dayIndex === undefined || !pt.lieu_id) return;
            const dateStr = weekDates[dayIndex];
            const creneau = creneauVersAffichage[pt.creneau] || pt.creneau;
            const apprenant = apprenantsMap[pt.apprenant_id];
            if (!apprenant || !isApprenantActif(apprenant, dateStr, suspensions)) return;
            if (isApprenantAbsentPourDate(pt.apprenant_id, dateStr, creneau, absencesApprenants)) return;
            const lieuIndex = lieuxIndexMap[dayIndex]?.[pt.lieu_id];
            if (lieuIndex === undefined) return;
            const key = `${dayIndex}-${lieuIndex}-${creneau}`;
            if (apprenantsParCase[key] && !apprenantsParCase[key].includes(pt.apprenant_id)) {
                apprenantsParCase[key].push(pt.apprenant_id);
            }
        });

        // Nettoyage cases vides
        Object.keys(lieuxSelectionnes).forEach(key => {
            const hasFormateurs = formateursParCase[key] && formateursParCase[key].length > 0;
            const hasApprenants = apprenantsParCase[key] && apprenantsParCase[key].length > 0;
            if (!hasFormateurs && !hasApprenants) {
                delete lieuxSelectionnes[key];
                delete formateursParCase[key];
                delete apprenantsParCase[key];
            }
        });

        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            const lieuxActifs = new Set();
            Object.keys(lieuxSelectionnes).forEach(key => {
                if (key.startsWith(`${dayIndex}-`)) {
                    const lieuIndex = parseInt(key.split('-')[1]);
                    lieuxActifs.add(lieuIndex);
                }
            });
            lieuxParJour[dayIndex] = lieuxActifs.size > 0 ? Array.from(lieuxActifs).sort((a, b) => a - b) : [];
        }

        return {
            formateursParCase,
            apprenantsParCase,
            lieuxParJour,
            lieuxSelectionnes
        };

    } catch (error) {
        return null;
    }
}

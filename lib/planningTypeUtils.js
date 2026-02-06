/**
 * Utilitaires pour le pré-remplissage du planning depuis le planning type
 * Utilisé pour générer automatiquement la semaine S+1
 */

import { supabase } from './supabaseClient';

// Mapping jour texte vers index (0=Lundi, 4=Vendredi)
const jourVersIndex = {
    'lundi': 0, 'mardi': 1, 'mercredi': 2, 'jeudi': 3, 'vendredi': 4
};

// Mapping index vers jour texte (pour requête historique)
const indexVersJour = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

// Mapping créneau DB vers affichage
const creneauVersAffichage = {
    'matin': 'Matin', 'M': 'Matin', 'AM': 'AM'
};

/**
 * Trouve le lieu le plus fréquent pour un formateur à un jour/créneau donné
 * basé sur l'historique du planning_formateurs_hebdo
 */
function getLieuPlusFrequent(formateurId, jour, creneau, historiqueLieux, lieuxMap) {
    // Filtrer l'historique pour ce formateur/jour/creneau
    const entries = historiqueLieux.filter(h => {
        if (h.formateur_id !== formateurId) return false;
        // Vérifier le jour de la semaine (0=Dimanche, 1=Lundi, etc.)
        const date = new Date(h.date);
        const jourSemaine = date.getDay(); // 0=Dim, 1=Lun, 2=Mar...
        const jourIndex = jourSemaine === 0 ? 6 : jourSemaine - 1; // Convertir en 0=Lun, 1=Mar...
        if (jourIndex !== jourVersIndex[jour.toLowerCase()]) return false;
        // Vérifier le créneau
        const creneauNorm = creneauVersAffichage[h.creneau] || h.creneau;
        if (creneauNorm !== creneau) return false;
        return true;
    });

    if (entries.length === 0) return null;

    // Compter les occurrences par lieu
    const compteur = {};
    entries.forEach(e => {
        // Trouver le lieu_id depuis le nom ou les initiales
        const lieuId = lieuxMap[e.lieu_nom] || lieuxMap[e.lieu_initiales];
        if (lieuId) {
            compteur[lieuId] = (compteur[lieuId] || 0) + 1;
        }
    });

    // Trouver le lieu le plus fréquent
    let maxCount = 0;
    let lieuPlusFrequent = null;
    Object.entries(compteur).forEach(([lieuId, count]) => {
        if (count > maxCount) {
            maxCount = count;
            lieuPlusFrequent = lieuId;
        }
    });

    return lieuPlusFrequent;
}

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
        const [formateursPT, apprenantsPT, apprenantsActifs, suspensionsRes, historiqueLieuxRes, lieuxRes] = await Promise.all([
            supabase.from('planning_type_formateurs')
                .select('formateur_id, jour, creneau, lieu_id')
                .eq('valide', true)
                .eq('statut', 'disponible'),  // Exclure dispo_except - les coordos les ajouteront manuellement
            supabase.from('planning_apprenants')
                .select('apprenant_id, jour, creneau, lieu_id'),
            supabase.from('apprenants_actifs')
                .select('id, prenom, nom, date_entree_formation, date_sortie_previsionnelle, date_fin_formation_reelle, statut_formation'),
            supabase.from('suspensions_parcours')
                .select('apprenant_id, date_suspension, date_reprise_prevue, date_reprise_reelle'),
            // Historique des lieux pour les formateurs sans préférence
            supabase.from('planning_formateurs_hebdo')
                .select('formateur_id, date, creneau, lieu_nom, lieu_initiales')
                .order('date', { ascending: false })
                .limit(500),
            // Liste des lieux pour mapper nom -> id
            supabase.from('lieux')
                .select('id, nom, initiale')
        ]);

        if (formateursPT.error) throw formateursPT.error;
        if (apprenantsPT.error) throw apprenantsPT.error;

        const planningFormateurs = formateursPT.data || [];
        const planningApprenants = apprenantsPT.data || [];
        const apprenantsList = apprenantsActifs.data || [];
        const suspensions = suspensionsRes.data || [];
        const historiqueLieux = historiqueLieuxRes.data || [];
        const lieux = lieuxRes.data || [];

        // Créer un map nom/initiale -> lieu_id
        const lieuxMap = {};
        lieux.forEach(l => {
            if (l.nom) lieuxMap[l.nom] = l.id;
            if (l.initiale) lieuxMap[l.initiale] = l.id;
        });

        const apprenantsMap = {};
        apprenantsList.forEach(a => { apprenantsMap[a.id] = a; });

        const formateursParCase = {};
        const apprenantsParCase = {};
        const lieuxParJour = {};
        const lieuxSelectionnes = {};

        for (let dayIndex = 0; dayIndex < 5; dayIndex++) {
            lieuxParJour[dayIndex] = new Set();
        }

        // Collecter les lieux des formateurs DISPONIBLES (avec ou sans lieu préféré)
        planningFormateurs.forEach(pt => {
            const dayIndex = jourVersIndex[pt.jour?.toLowerCase()];
            if (dayIndex === undefined) return;
            const dateStr = weekDates[dayIndex];
            const creneau = creneauVersAffichage[pt.creneau] || pt.creneau;
            if (isFormateurAbsentPourDate(pt.formateur_id, dateStr, creneau, absencesFormateurs)) return;

            if (pt.lieu_id) {
                // Formateur avec lieu préféré
                lieuxParJour[dayIndex].add(pt.lieu_id);
            } else {
                // Formateur sans lieu préféré -> chercher dans l'historique
                const lieuHistorique = getLieuPlusFrequent(pt.formateur_id, pt.jour, creneau, historiqueLieux, lieuxMap);
                if (lieuHistorique) {
                    lieuxParJour[dayIndex].add(lieuHistorique);
                }
            }
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

        // Remplir formateurs DISPONIBLES (avec ou sans lieu préféré)
        planningFormateurs.forEach(pt => {
            const dayIndex = jourVersIndex[pt.jour?.toLowerCase()];
            if (dayIndex === undefined) return;
            const dateStr = weekDates[dayIndex];
            const creneau = creneauVersAffichage[pt.creneau] || pt.creneau;
            if (isFormateurAbsentPourDate(pt.formateur_id, dateStr, creneau, absencesFormateurs)) return;

            // Déterminer le lieu (préféré ou basé sur historique)
            let lieuId = pt.lieu_id;
            if (!lieuId) {
                lieuId = getLieuPlusFrequent(pt.formateur_id, pt.jour, creneau, historiqueLieux, lieuxMap);
            }
            if (!lieuId) return; // Pas de lieu trouvé, on skip

            const lieuIndex = lieuxIndexMap[dayIndex]?.[lieuId];
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

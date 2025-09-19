import { supabase } from './supabaseClient';

/**
 * Vérifie si un apprenant est absent à une date et créneau spécifique
 * @param {string} apprenantId - ID de l'apprenant
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} creneau - 'matin' ou 'AM'
 * @returns {Promise<{isAbsent: boolean, isPresenceExceptionnelle: boolean, lieuExceptionnel: string|null}>}
 */
export async function checkAbsenceApprenant(apprenantId, date, creneau) {
    try {
        const { data: absences, error } = await supabase
            .from('absences_apprenants')
            .select(`
                *,
                lieux(nom, initiale)
            `)
            .eq('apprenant_id', apprenantId)
            .eq('statut', 'actif');

        if (error) {
            console.error('Erreur vérification absences:', error);
            return { isAbsent: false, isPresenceExceptionnelle: false, lieuExceptionnel: null };
        }

        const dateObj = new Date(date);
        const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';

        // Vérifier les absences par période
        const absencePeriode = absences.find(abs =>
            abs.type === 'absence_periode' &&
            new Date(abs.date_debut) <= dateObj &&
            new Date(abs.date_fin) >= dateObj
        );

        if (absencePeriode) {
            return { isAbsent: true, isPresenceExceptionnelle: false, lieuExceptionnel: null };
        }

        // Vérifier les absences ponctuelles
        const absencePonctuelle = absences.find(abs =>
            abs.type === 'absence_ponctuelle' &&
            abs.date_specifique === date &&
            abs.creneau === creneauDB
        );

        if (absencePonctuelle) {
            return { isAbsent: true, isPresenceExceptionnelle: false, lieuExceptionnel: null };
        }

        // Vérifier les présences exceptionnelles
        const presenceExceptionnelle = absences.find(abs =>
            abs.type === 'presence_exceptionnelle' &&
            abs.date_specifique === date &&
            abs.creneau === creneauDB
        );

        if (presenceExceptionnelle) {
            return {
                isAbsent: false,
                isPresenceExceptionnelle: true,
                lieuExceptionnel: presenceExceptionnelle.lieux ? presenceExceptionnelle.lieux.initiale : null
            };
        }

        return { isAbsent: false, isPresenceExceptionnelle: false, lieuExceptionnel: null };

    } catch (error) {
        console.error('Erreur checkAbsenceApprenant:', error);
        return { isAbsent: false, isPresenceExceptionnelle: false, lieuExceptionnel: null };
    }
}

/**
 * Filtre une liste d'apprenants en excluant ceux qui sont absents
 * et en ajoutant ceux avec présence exceptionnelle
 * @param {Array} apprenants - Liste des apprenants
 * @param {string} date - Date au format YYYY-MM-DD
 * @param {string} creneau - 'Matin' ou 'AM'
 * @param {string} lieuId - ID du lieu (pour présences exceptionnelles)
 * @returns {Promise<Array>} Liste filtrée avec métadonnées d'absence
 */
export async function filterApprenantsParAbsence(apprenants, date, creneau, lieuId) {
    try {
        console.log('🔍 DEBUG filterApprenantsParAbsence:', { date, creneau, lieuId, apprenantsCount: apprenants.length });

        // Charger toutes les absences actives (requête simplifiée pour éviter problèmes SQL)
        const { data: absences, error } = await supabase
            .from('absences_apprenants')
            .select(`
                *,
                users!absences_apprenants_apprenant_id_fkey(id, nom, prenom),
                lieux(id, nom, initiale)
            `)
            .eq('statut', 'actif');

        console.log('📊 Absences trouvées:', absences?.length || 0, absences);

        if (error) {
            console.error('Erreur chargement absences:', error);
            return apprenants.map(app => ({ ...app, statutAbsence: 'normal' }));
        }

        // Convertir le créneau pour les requêtes
        const creneauDB = creneau === 'Matin' ? 'matin' : 'AM';
        const apprenantsAvecAbsences = [...apprenants];

        // Ajouter les apprenants avec présence exceptionnelle pour ce lieu, date et créneau
        const presencesExceptionnelles = absences.filter(abs =>
            abs.type === 'presence_exceptionnelle' &&
            abs.date_specifique === date &&
            abs.creneau === creneauDB &&
            abs.lieu_id === lieuId
        );

        for (const presence of presencesExceptionnelles) {
            if (presence.users) {
                const apprenantExistant = apprenantsAvecAbsences.find(app => app.id === presence.apprenant_id);
                if (!apprenantExistant) {
                    apprenantsAvecAbsences.push({
                        id: presence.users.id,
                        nom: presence.users.nom,
                        prenom: presence.users.prenom,
                        statutAbsence: 'presence_exceptionnelle',
                        lieuExceptionnel: presence.lieux ? presence.lieux.initiale : null
                    });
                }
            }
        }

        // Convertir les paramètres pour le filtrage
        const dateTest = new Date(date);

        // Filtrer et marquer les apprenants
        const resultat = apprenantsAvecAbsences.map(apprenant => {
            // Vérifier si absent par période (avec vérification des dates)
            const absencePeriode = absences.find(abs =>
                abs.type === 'absence_periode' &&
                abs.apprenant_id === apprenant.id &&
                new Date(abs.date_debut) <= dateTest &&
                new Date(abs.date_fin) >= dateTest
            );

            if (absencePeriode) {
                console.log('❌ Apprenant exclu (absence période):', apprenant.prenom, apprenant.nom, absencePeriode);
                return null; // Exclu de la liste
            }

            // Vérifier si absent ponctuel (avec vérification date et créneau)
            const absencePonctuelle = absences.find(abs =>
                abs.type === 'absence_ponctuelle' &&
                abs.apprenant_id === apprenant.id &&
                abs.date_specifique === date &&
                abs.creneau === creneauDB
            );

            if (absencePonctuelle) {
                console.log('❌ Apprenant exclu (absence ponctuelle):', apprenant.prenom, apprenant.nom, absencePonctuelle);
                return null; // Exclu de la liste
            }

            // Vérifier si présence exceptionnelle (avec vérification date et créneau)
            const presenceExceptionnelle = absences.find(abs =>
                abs.type === 'presence_exceptionnelle' &&
                abs.apprenant_id === apprenant.id &&
                abs.date_specifique === date &&
                abs.creneau === creneauDB &&
                abs.lieu_id === lieuId
            );

            if (presenceExceptionnelle) {
                return {
                    ...apprenant,
                    statutAbsence: 'presence_exceptionnelle',
                    lieuExceptionnel: presenceExceptionnelle.lieux ? presenceExceptionnelle.lieux.initiale : null
                };
            }

            return {
                ...apprenant,
                statutAbsence: 'normal'
            };
        }).filter(Boolean); // Retirer les null (absents)

        return resultat;

    } catch (error) {
        console.error('Erreur filterApprenantsParAbsence:', error);
        return apprenants.map(app => ({ ...app, statutAbsence: 'normal' }));
    }
}
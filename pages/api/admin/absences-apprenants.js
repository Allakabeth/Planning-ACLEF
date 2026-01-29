import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else if (req.method === 'PUT') {
        return handlePut(req, res)
    } else if (req.method === 'DELETE') {
        return handleDelete(req, res)
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

// GET - Récupérer les absences apprenants
async function handleGet(req, res) {
    try {
        const { apprenant_id, date_debut, date_fin, type } = req.query

        let query = supabaseAdmin
            .from('absences_apprenants')
            .select(`
                id,
                apprenant_id,
                type,
                date_debut,
                date_fin,
                date_specifique,
                creneau,
                lieu_id,
                motif,
                statut,
                created_at,
                updated_at,
                users!absences_apprenants_apprenant_id_fkey(
                    id,
                    nom,
                    prenom
                ),
                lieux(
                    id,
                    nom,
                    initiale
                )
            `)
            .eq('statut', 'actif')
            .order('created_at', { ascending: false })

        // Filtrer par apprenant si spécifié
        if (apprenant_id) {
            query = query.eq('apprenant_id', apprenant_id)
        }

        // Filtrer par type si spécifié
        if (type) {
            query = query.eq('type', type)
        }

        // Filtrer par période si spécifiée
        if (date_debut && date_fin) {
            query = query.or(`
                and(type.eq.absence_periode,date_debut.lte.${date_fin},date_fin.gte.${date_debut}),
                and(type.in.(absence_ponctuelle,presence_exceptionnelle),date_specifique.gte.${date_debut},date_specifique.lte.${date_fin})
            `)
        }

        const { data, error } = await query

        if (error) throw error

        // Enrichir les données pour l'affichage
        const absencesEnrichies = data.map(absence => ({
            ...absence,
            apprenant_nom: absence.users ? `${absence.users.prenom} ${absence.users.nom}` : 'Inconnu',
            lieu_nom: absence.lieux ? absence.lieux.nom : null,
            lieu_initiale: absence.lieux ? absence.lieux.initiale : null,
            date_affichage: getDateAffichage(absence),
            creneau_affichage: absence.creneau === 'matin' ? 'Matin' : absence.creneau === 'AM' ? 'Après-midi' : null
        }))

        console.log(`✅ ${absencesEnrichies.length} absences apprenants récupérées`)
        return res.status(200).json(absencesEnrichies)

    } catch (error) {
        console.error('Erreur GET absences apprenants:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// POST - Créer une nouvelle absence
async function handlePost(req, res) {
    try {
        const {
            apprenant_id,
            type,
            date_debut,
            date_fin,
            date_specifique,
            creneau,
            lieu_id,
            motif
        } = req.body

        // Validation des données selon le type
        if (!apprenant_id || !type) {
            return res.status(400).json({ error: 'apprenant_id et type requis' })
        }

        if (type === 'absence_periode') {
            if (!date_debut || !date_fin) {
                return res.status(400).json({ error: 'date_debut et date_fin requis pour absence_periode' })
            }
            if (new Date(date_debut) > new Date(date_fin)) {
                return res.status(400).json({ error: 'date_debut doit être antérieure à date_fin' })
            }
        }

        if (type === 'absence_ponctuelle') {
            if (!date_specifique || !creneau) {
                return res.status(400).json({ error: 'date_specifique et creneau requis pour absence_ponctuelle' })
            }
        }

        if (type === 'presence_exceptionnelle') {
            if (!date_specifique || !creneau || !lieu_id) {
                return res.status(400).json({ error: 'date_specifique, creneau et lieu_id requis pour presence_exceptionnelle' })
            }
        }

        // Vérifier qu'il n'y a pas de conflit pour les événements ponctuels
        if (type !== 'absence_periode') {
            const { data: conflits, error: conflitError } = await supabaseAdmin
                .from('absences_apprenants')
                .select('id')
                .eq('apprenant_id', apprenant_id)
                .eq('date_specifique', date_specifique)
                .eq('creneau', creneau)
                .eq('statut', 'actif')
                .neq('type', 'absence_periode')

            if (conflitError) throw conflitError

            if (conflits && conflits.length > 0) {
                return res.status(400).json({
                    error: 'Un événement existe déjà pour cet apprenant à cette date et ce créneau'
                })
            }
        }

        // Créer l'absence
        const absenceData = {
            apprenant_id,
            type,
            motif,
            statut: 'actif'
        }

        if (type === 'absence_periode') {
            absenceData.date_debut = date_debut
            absenceData.date_fin = date_fin
        } else {
            absenceData.date_specifique = date_specifique
            absenceData.creneau = creneau
            if (lieu_id) absenceData.lieu_id = lieu_id
        }

        const { data, error } = await supabaseAdmin
            .from('absences_apprenants')
            .insert([absenceData])
            .select()

        if (error) throw error

        console.log(`✅ Absence apprenant créée:`, data[0])
        return res.status(201).json(data[0])

    } catch (error) {
        console.error('Erreur POST absences apprenants:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// PUT - Modifier une absence existante
async function handlePut(req, res) {
    try {
        const {
            id,
            apprenant_id,
            type,
            date_debut,
            date_fin,
            date_specifique,
            creneau,
            lieu_id,
            motif,
            statut
        } = req.body

        if (!id) {
            return res.status(400).json({ error: 'ID requis pour la modification' })
        }

        // Construire les données de mise à jour
        const updateData = { updated_at: new Date().toISOString() }

        if (apprenant_id !== undefined) updateData.apprenant_id = apprenant_id
        if (type !== undefined) updateData.type = type
        if (motif !== undefined) updateData.motif = motif
        if (statut !== undefined) updateData.statut = statut

        // Gérer les dates selon le type
        if (type === 'absence_periode') {
            updateData.date_debut = date_debut
            updateData.date_fin = date_fin
            updateData.date_specifique = null
            updateData.creneau = null
            updateData.lieu_id = null
        } else if (type === 'absence_ponctuelle' || type === 'presence_exceptionnelle') {
            updateData.date_specifique = date_specifique
            updateData.creneau = creneau
            updateData.date_debut = null
            updateData.date_fin = null
            if (type === 'presence_exceptionnelle') {
                updateData.lieu_id = lieu_id
            } else {
                updateData.lieu_id = null
            }
        }

        const { data, error } = await supabaseAdmin
            .from('absences_apprenants')
            .update(updateData)
            .eq('id', id)
            .select()

        if (error) throw error

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Absence non trouvée' })
        }

        console.log(`✅ Absence apprenant modifiée:`, data[0])
        return res.status(200).json(data[0])

    } catch (error) {
        console.error('Erreur PUT absences apprenants:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// DELETE - Supprimer une absence (soft delete)
async function handleDelete(req, res) {
    try {
        const { id } = req.query

        if (!id) {
            return res.status(400).json({ error: 'ID requis' })
        }

        const { data, error } = await supabaseAdmin
            .from('absences_apprenants')
            .update({ statut: 'annule' })
            .eq('id', id)
            .select()

        if (error) throw error

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Absence non trouvée' })
        }

        console.log(`✅ Absence apprenant supprimée:`, data[0])
        return res.status(200).json({ message: 'Absence supprimée avec succès' })

    } catch (error) {
        console.error('Erreur DELETE absences apprenants:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// Fonction utilitaire pour formater l'affichage des dates
function getDateAffichage(absence) {
    if (absence.type === 'absence_periode') {
        const debut = new Date(absence.date_debut).toLocaleDateString('fr-FR')
        const fin = new Date(absence.date_fin).toLocaleDateString('fr-FR')
        return `${debut} → ${fin}`
    } else {
        return new Date(absence.date_specifique).toLocaleDateString('fr-FR')
    }
}
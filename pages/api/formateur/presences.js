import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else if (req.method === 'PUT') {
        return handlePut(req, res)
    } else {
        res.setHeader('Allow', ['GET', 'POST', 'PUT'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

// GET - Récupérer les présences d'un formateur
async function handleGet(req, res) {
    try {
        const { formateur_id, date_debut, date_fin } = req.query

        if (!formateur_id) {
            return res.status(400).json({ error: 'formateur_id requis' })
        }

        let query = supabaseAdmin
            .from('presence_formateurs')
            .select('*')
            .eq('formateur_id', formateur_id)
            .order('date', { ascending: true })
            .order('periode', { ascending: true })

        if (date_debut) {
            query = query.gte('date', date_debut)
        }

        if (date_fin) {
            query = query.lte('date', date_fin)
        }

        const { data, error } = await query

        if (error) {
            console.error('Erreur récupération présences:', error)
            return res.status(500).json({ error: 'Erreur serveur' })
        }

        return res.status(200).json(data)
    } catch (error) {
        console.error('Erreur GET présences:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// POST - Créer une nouvelle présence
async function handlePost(req, res) {
    try {
        const { formateur_id, date, periode, lieu, present } = req.body

        if (!formateur_id || !date || !periode || !lieu) {
            return res.status(400).json({
                error: 'formateur_id, date, periode et lieu requis'
            })
        }

        // Vérifier que la période est valide
        if (!['matin', 'apres_midi'].includes(periode)) {
            return res.status(400).json({
                error: 'periode doit être "matin" ou "apres_midi"'
            })
        }

        // Vérifier si l'entrée existe déjà
        const { data: existant } = await supabaseAdmin
            .from('presence_formateurs')
            .select('id')
            .eq('formateur_id', formateur_id)
            .eq('date', date)
            .eq('periode', periode)
            .single()

        if (existant) {
            return res.status(409).json({
                error: 'Présence déjà enregistrée pour cette date et période'
            })
        }

        const { data, error } = await supabaseAdmin
            .from('presence_formateurs')
            .insert([{
                formateur_id,
                date,
                periode,
                lieu,
                present: present !== undefined ? present : true,
                lieu_prevu: lieu,
                type_intervention: 'bureau',
                source: 'bureau'
            }])
            .select()

        if (error) {
            console.error('Erreur création présence:', error)
            return res.status(500).json({ error: 'Erreur serveur' })
        }

        return res.status(201).json(data[0])
    } catch (error) {
        console.error('Erreur POST présence:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// PUT - Mettre à jour une présence existante
async function handlePut(req, res) {
    try {
        const { id, present, lieu } = req.body

        if (!id) {
            return res.status(400).json({ error: 'id requis' })
        }

        const updates = {}
        if (present !== undefined) updates.present = present
        if (lieu !== undefined) updates.lieu = lieu

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({
                error: 'Au moins un champ à mettre à jour requis (present, lieu)'
            })
        }

        const { data, error } = await supabaseAdmin
            .from('presence_formateurs')
            .update(updates)
            .eq('id', id)
            .select()

        if (error) {
            console.error('Erreur mise à jour présence:', error)
            return res.status(500).json({ error: 'Erreur serveur' })
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: 'Présence non trouvée' })
        }

        return res.status(200).json(data[0])
    } catch (error) {
        console.error('Erreur PUT présence:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
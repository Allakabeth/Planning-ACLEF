import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Calcul de Pâques (algorithme de Meeus/Jones/Butcher)
function getEasterDate(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Génère les jours fériés français pour une année
function getJoursFeriesFrancais(year) {
    const feries = [];
    const easter = getEasterDate(year);

    // Jours fériés fixes
    feries.push({ date: `${year}-01-01`, description: 'Jour de l\'an' });
    feries.push({ date: `${year}-05-01`, description: 'Fête du travail' });
    feries.push({ date: `${year}-05-08`, description: 'Victoire 1945' });
    feries.push({ date: `${year}-07-14`, description: 'Fête nationale' });
    feries.push({ date: `${year}-08-15`, description: 'Assomption' });
    feries.push({ date: `${year}-11-01`, description: 'Toussaint' });
    feries.push({ date: `${year}-11-11`, description: 'Armistice 1918' });
    feries.push({ date: `${year}-12-25`, description: 'Noël' });

    // Jours fériés mobiles (basés sur Pâques)
    // Lundi de Pâques (Pâques + 1 jour)
    const lundiPaques = new Date(easter);
    lundiPaques.setDate(easter.getDate() + 1);
    feries.push({
        date: lundiPaques.toISOString().split('T')[0],
        description: 'Lundi de Pâques'
    });

    // Ascension (Pâques + 39 jours)
    const ascension = new Date(easter);
    ascension.setDate(easter.getDate() + 39);
    feries.push({
        date: ascension.toISOString().split('T')[0],
        description: 'Ascension'
    });

    // Lundi de Pentecôte (Pâques + 50 jours)
    const lundiPentecote = new Date(easter);
    lundiPentecote.setDate(easter.getDate() + 50);
    feries.push({
        date: lundiPentecote.toISOString().split('T')[0],
        description: 'Lundi de Pentecôte'
    });

    return feries;
}

export default async function handler(req, res) {
    // GET - Liste des fermetures
    if (req.method === 'GET') {
        try {
            const { annee, from, to } = req.query;

            let query = supabase
                .from('jours_fermeture')
                .select('*')
                .order('date_debut', { ascending: true });

            // Filtrer par année ou plage de dates
            if (annee) {
                query = query
                    .gte('date_debut', `${annee}-01-01`)
                    .lte('date_debut', `${annee}-12-31`);
            } else if (from && to) {
                query = query
                    .gte('date_debut', from)
                    .lte('date_debut', to);
            }

            const { data, error } = await query;

            if (error) throw error;

            return res.status(200).json({ fermetures: data || [] });

        } catch (error) {
            console.error('Erreur récupération fermetures:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    // POST - Ajouter une fermeture ou initialiser les jours fériés
    if (req.method === 'POST') {
        try {
            const { action, annee, date_debut, date_fin, creneau, motif, description } = req.body;

            // Action spéciale : initialiser les jours fériés
            if (action === 'init_feries') {
                const year = annee || new Date().getFullYear();
                const feries = getJoursFeriesFrancais(year);

                // Vérifier les jours fériés déjà existants pour cette année
                const { data: existants } = await supabase
                    .from('jours_fermeture')
                    .select('date_debut')
                    .eq('motif', 'ferie')
                    .gte('date_debut', `${year}-01-01`)
                    .lte('date_debut', `${year}-12-31`);

                const datesExistantes = new Set((existants || []).map(e => e.date_debut));

                // Filtrer les jours fériés non encore créés
                const feriesACreer = feries
                    .filter(f => !datesExistantes.has(f.date))
                    .map(f => ({
                        date_debut: f.date,
                        date_fin: null,
                        creneau: null,
                        motif: 'ferie',
                        description: f.description
                    }));

                if (feriesACreer.length === 0) {
                    return res.status(200).json({
                        message: `Tous les jours fériés ${year} sont déjà créés`,
                        created: 0
                    });
                }

                const { error } = await supabase
                    .from('jours_fermeture')
                    .insert(feriesACreer);

                if (error) throw error;

                return res.status(200).json({
                    message: `${feriesACreer.length} jours fériés ${year} créés`,
                    created: feriesACreer.length,
                    feries: feriesACreer
                });
            }

            // Ajout normal d'une fermeture
            if (!date_debut || !motif) {
                return res.status(400).json({ error: 'date_debut et motif requis' });
            }

            const { data, error } = await supabase
                .from('jours_fermeture')
                .insert({
                    date_debut,
                    date_fin: date_fin || null,
                    creneau: creneau || null,
                    motif,
                    description: description || null
                })
                .select()
                .single();

            if (error) throw error;

            return res.status(201).json({ fermeture: data });

        } catch (error) {
            console.error('Erreur création fermeture:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    // DELETE - Supprimer une fermeture
    if (req.method === 'DELETE') {
        try {
            const { id } = req.query;

            if (!id) {
                return res.status(400).json({ error: 'ID requis' });
            }

            const { error } = await supabase
                .from('jours_fermeture')
                .delete()
                .eq('id', id);

            if (error) throw error;

            return res.status(200).json({ success: true });

        } catch (error) {
            console.error('Erreur suppression fermeture:', error);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
    }

    return res.status(405).json({ error: 'Méthode non autorisée' });
}

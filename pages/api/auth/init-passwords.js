import { supabase } from '../../../lib/supabaseClient'

// ATTENTION : Cette API est temporaire et doit être sécurisée ou supprimée après utilisation
export default async function handler(req, res) {
    // Sécurité : vérifier une clé secrète
    const { secret } = req.query
    
    if (secret !== 'init-aclef-2024') {
        return res.status(401).json({ error: 'Non autorisé' })
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Récupérer tous les formateurs sans mot de passe hashé
        const { data: formateurs, error: fetchError } = await supabase
            .from('users')
            .select('id, nom, prenom')
            .eq('role', 'formateur')
            .eq('archive', false)
            .or('password_hash.is.null,must_change_password.is.null')

        if (fetchError) {
            console.error('Erreur récupération formateurs:', fetchError)
            return res.status(500).json({ error: 'Erreur lors de la récupération des formateurs' })
        }

        const results = []
        
        for (const formateur of formateurs) {
            // Initialiser avec le nom comme mot de passe temporaire (non hashé)
            // Le hash sera fait lors de la première connexion réussie
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    password_hash: formateur.nom, // Temporaire, sera comparé en clair puis hashé
                    must_change_password: true
                })
                .eq('id', formateur.id)

            if (updateError) {
                results.push({
                    formateur: `${formateur.prenom} ${formateur.nom}`,
                    status: 'erreur',
                    error: updateError.message
                })
            } else {
                results.push({
                    formateur: `${formateur.prenom} ${formateur.nom}`,
                    status: 'succès',
                    login: formateur.prenom,
                    password: formateur.nom
                })
            }
        }

        return res.status(200).json({
            message: 'Initialisation terminée',
            formateurs_traités: results.length,
            résultats: results
        })

    } catch (error) {
        console.error('Erreur initialisation:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
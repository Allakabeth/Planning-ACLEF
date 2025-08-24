import { extractTokenFromHeader, verifyAccessToken } from '../../../../lib/jwt'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req, res) {
    // Seulement POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Extraire le token pour identifier l'utilisateur
        const token = extractTokenFromHeader(req.headers.authorization)
        
        if (token) {
            const { valid, decoded } = verifyAccessToken(token)
            
            if (valid && decoded.id) {
                // Optionnel : enregistrer la déconnexion
                console.log(`[AUTH] Déconnexion formateur ${decoded.prenom} ${decoded.nom} (ID: ${decoded.id})`)
            }
        }

        // Toujours retourner succès même si pas de token
        // (pour permettre la déconnexion côté client)
        return res.status(200).json({
            success: true,
            message: 'Déconnexion réussie'
        })

    } catch (error) {
        console.error('Erreur logout:', error)
        // Retourner succès quand même pour ne pas bloquer le client
        return res.status(200).json({
            success: true,
            message: 'Déconnexion réussie'
        })
    }
}
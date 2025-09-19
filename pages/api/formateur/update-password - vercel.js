import { supabase } from '../../../lib/supabaseClient'
import { verifyToken } from '../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { newPassword } = req.body

    if (!newPassword || newPassword.trim().length === 0) {
        return res.status(400).json({ error: 'Nouveau mot de passe requis' })
    }

    // Vérifier le token
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant' })
    }

    const token = authHeader.split(' ')[1]
    const decodedToken = verifyToken(token)
    
    if (!decodedToken) {
        return res.status(401).json({ error: 'Token invalide' })
    }

    try {
        // Mettre à jour custom_password
        const { error } = await supabase
            .from('users')
            .update({ custom_password: newPassword })
            .eq('id', decodedToken.id)

        if (error) {
            console.error('Erreur update password:', error)
            return res.status(500).json({ error: 'Erreur lors de la mise à jour' })
        }

        return res.status(200).json({
            success: true,
            message: 'Mot de passe personnalisé sauvegardé'
        })

    } catch (error) {
        console.error('Erreur update password:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}
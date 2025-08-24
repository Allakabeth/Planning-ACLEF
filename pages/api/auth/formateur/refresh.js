import { verifyRefreshToken, generateTokenPair } from '../../../../lib/jwt'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req, res) {
    // Seulement POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { refreshToken } = req.body

    if (!refreshToken) {
        return res.status(400).json({ 
            error: 'Refresh token requis' 
        })
    }

    try {
        // 1. Vérifier le refresh token
        const { valid, decoded, error } = verifyRefreshToken(refreshToken)
        
        if (!valid) {
            return res.status(401).json({ 
                error: error || 'Refresh token invalide' 
            })
        }

        // 2. Vérifier que l'utilisateur existe toujours et est actif
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.id)
            .eq('role', 'formateur')
            .eq('archive', false)
            .single()

        if (userError || !user) {
            return res.status(401).json({ 
                error: 'Utilisateur non trouvé ou inactif' 
            })
        }

        // 3. Générer une nouvelle paire de tokens
        const newTokens = generateTokenPair({
            id: user.id,
            formateur_id: user.id,
            username: user.prenom,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email
        })

        // 4. Retourner les nouveaux tokens
        return res.status(200).json({
            success: true,
            tokens: {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                expiresIn: newTokens.expiresIn,
                tokenType: newTokens.tokenType
            },
            user: {
                id: user.id,
                username: user.prenom,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: 'formateur',
                mustChangePassword: user.must_change_password === true || !(user.password_hash?.startsWith('$2b$') || user.password_hash?.startsWith('$2a$') || user.password_hash?.startsWith('$2y$'))
            }
        })

    } catch (error) {
        console.error('Erreur refresh token:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur lors du rafraîchissement' 
        })
    }
}
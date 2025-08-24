import bcrypt from 'bcryptjs'
import { supabase } from '../../../../lib/supabaseClient'
import { verifyToken, generateTokenPair } from '../../../../lib/jwt'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { currentPassword, newPassword } = req.body

    // Validation des entrées
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
            error: 'Mot de passe actuel et nouveau mot de passe requis' 
        })
    }

    if (newPassword.trim().length < 6) {
        return res.status(400).json({ 
            error: 'Le nouveau mot de passe doit contenir au moins 6 caractères' 
        })
    }

    // Vérifier le token JWT
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token manquant ou invalide' })
    }

    const token = authHeader.split(' ')[1]
    const decodedToken = verifyToken(token)
    
    if (!decodedToken) {
        return res.status(401).json({ error: 'Token invalide ou expiré' })
    }

    try {
        // 1. Récupérer l'utilisateur depuis la table users
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', decodedToken.id)
            .single()

        if (userError || !user) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' })
        }

        // 2. Vérifier le mot de passe actuel
        let currentPasswordValid = false

        if (user.password_hash && (user.password_hash.startsWith('$2b$') || user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2y$'))) {
            // Mot de passe déjà hashé avec bcrypt
            currentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
        } else {
            // Première connexion : mot de passe = nom du formateur
            currentPasswordValid = (currentPassword === user.nom)
        }

        if (!currentPasswordValid) {
            return res.status(400).json({ error: 'Mot de passe actuel incorrect' })
        }

        // 3. Hasher le nouveau mot de passe
        const saltRounds = 10
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)

        // 4. Mettre à jour le mot de passe dans la table users
        const { error: updateError } = await supabase
            .from('users')
            .update({
                password_hash: newPasswordHash,
                must_change_password: false,
                password_changed_at: new Date().toISOString()
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('Erreur mise à jour mot de passe:', updateError)
            return res.status(500).json({ error: 'Erreur lors de la mise à jour' })
        }

        // 5. Générer de nouveaux tokens avec mustChangePassword = false
        const userData = {
            id: user.id,
            formateur_id: user.id,
            username: user.prenom,
            nom: user.nom,
            prenom: user.prenom,
            email: user.email,
            mustChangePassword: false
        }

        const newTokens = generateTokenPair(userData)

        // 6. Log de sécurité
        console.log(`[AUTH] Mot de passe changé pour formateur ${user.prenom} ${user.nom} (ID: ${user.id})`)

        // 7. Retourner la réponse
        res.status(200).json({
            success: true,
            message: 'Mot de passe changé avec succès',
            user: {
                id: user.id,
                username: user.prenom,
                nom: user.nom,
                prenom: user.prenom,
                email: user.email,
                role: 'formateur',
                mustChangePassword: false
            },
            tokens: {
                accessToken: newTokens.accessToken,
                refreshToken: newTokens.refreshToken,
                expiresIn: newTokens.expiresIn,
                tokenType: newTokens.tokenType
            }
        })

    } catch (error) {
        console.error('Erreur changement mot de passe:', error)
        res.status(500).json({ 
            error: 'Erreur interne du serveur' 
        })
    }
}
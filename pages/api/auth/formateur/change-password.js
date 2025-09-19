import bcrypt from 'bcryptjs'
import { supabase } from '../../../../lib/supabaseClient'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'
import { verifyToken, generateTokenPair } from '../../../../lib/jwt'

/**
 * Normalise un prénom/nom pour créer un email valide
 * Supprime accents, cédilles et caractères spéciaux
 * José → jose, Martínez → martinez, Bénard → benard
 * IDENTIQUE À login.js pour cohérence
 */
const normalizeForEmail = (text) => {
    return text
        .toLowerCase()
        .trim()
        .normalize('NFD')                    // Décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, '')    // Supprime les marques diacritiques
        .replace(/[^a-z0-9]/g, '')          // Garde seulement lettres et chiffres
}

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
        console.log(`[DEBUG] Récupération user pour token ID: ${decodedToken.id}`)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', decodedToken.id)
            .single()

        if (userError || !user) {
            console.error(`[DEBUG] User non trouvé - error:`, userError)
            return res.status(404).json({ error: 'Utilisateur non trouvé' })
        }

        console.log(`[DEBUG] User récupéré:`, {
            id: user.id,
            prenom: user.prenom,
            nom: user.nom,
            email: user.email,
            password_hash: user.password_hash ? 'EXISTE' : 'NULL',
            custom_password: user.custom_password || 'NULL'
        })

        // 2. Vérifier le mot de passe actuel (LOGIQUE IDENTIQUE À login.js)
        let currentPasswordValid = false

        console.log(`[DEBUG] Vérification mot de passe actuel pour ${user.prenom} ${user.nom}`)
        console.log(`[DEBUG] password_hash exists: ${user.password_hash ? 'EXISTE' : 'NULL'}`)

        if (user.password_hash) {
            console.log(`[DEBUG] Utilisation bcrypt pour vérification`)
            // Si password_hash existe, utiliser uniquement bcrypt
            currentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
            if (!currentPasswordValid) {
                return res.status(400).json({ error: 'Mot de passe actuel incorrect' })
            }
        } else {
            console.log(`[DEBUG] Utilisation fallback nom normalisé`)
            // Fallback : première connexion avec nom normalisé (Bénard → benard)
            const nomNormalized = normalizeForEmail(user.nom)
            const currentPasswordNormalized = normalizeForEmail(currentPassword)
            
            console.log(`[DEBUG] Comparaison normalisée:`)
            console.log(`[DEBUG]   nom "${user.nom}" → "${nomNormalized}"`)
            console.log(`[DEBUG]   currentPassword "${currentPassword}" → "${currentPasswordNormalized}"`)
            console.log(`[DEBUG]   match: ${currentPasswordNormalized === nomNormalized}`)
            
            if (currentPasswordNormalized !== nomNormalized) {
                return res.status(400).json({ error: 'Mot de passe actuel incorrect' })
            }
            currentPasswordValid = true
        }

        // 3. Hasher le nouveau mot de passe
        const saltRounds = 10
        console.log(`[DEBUG] Génération hash pour user ID ${user.id}, saltRounds: ${saltRounds}`)
        const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)
        console.log(`[DEBUG] Hash généré (longueur: ${newPasswordHash.length}): ${newPasswordHash.substring(0, 20)}...`)

        // 4. Mettre à jour le mot de passe dans la table users avec client ADMIN
        console.log(`[DEBUG] Tentative UPDATE ADMIN pour user ID ${user.id}`)
        console.log(`[DEBUG] Données à mettre à jour:`, {
            password_hash: newPasswordHash.substring(0, 20) + '...',
            custom_password: null,
            must_change_password: false,
            password_changed_at: new Date().toISOString()
        })

        const { data: updateData, error: updateError, count } = await supabaseAdmin
            .from('users')
            .update({
                password_hash: newPasswordHash,
                custom_password: null,  // Supprimer l'ancien système
                must_change_password: false,
                password_changed_at: new Date().toISOString()
            })
            .eq('id', user.id)
            .select() // CRITIQUE: Forcer le retour des données mises à jour

        console.log(`[DEBUG] Résultat UPDATE - error:`, updateError)
        console.log(`[DEBUG] Résultat UPDATE - data:`, updateData)
        console.log(`[DEBUG] Résultat UPDATE - count:`, count)

        if (updateError) {
            console.error('Erreur mise à jour mot de passe:', updateError)
            return res.status(500).json({ error: 'Erreur lors de la mise à jour' })
        }

        // 4.5. Vérification post-update - relire l'utilisateur pour confirmer
        console.log(`[DEBUG] Vérification post-update pour user ID ${user.id}`)
        const { data: verifyUser, error: verifyError } = await supabaseAdmin
            .from('users')
            .select('id, prenom, nom, password_hash, password_changed_at')
            .eq('id', user.id)
            .single()

        if (verifyError) {
            console.error('Erreur vérification post-update:', verifyError)
        } else {
            console.log(`[DEBUG] User après UPDATE:`, {
                id: verifyUser.id,
                prenom: verifyUser.prenom,
                nom: verifyUser.nom,
                password_hash: verifyUser.password_hash ? verifyUser.password_hash.substring(0, 20) + '...' : 'NULL',
                password_changed_at: verifyUser.password_changed_at
            })
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
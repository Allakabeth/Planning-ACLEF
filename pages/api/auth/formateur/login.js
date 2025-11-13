import { supabase } from '../../../../lib/supabaseClient'
import { generateTokenPair } from '../../../../lib/jwt'
import bcrypt from 'bcryptjs'

/**
 * Normalise un prénom/nom pour créer un email valide
 * Supprime accents, cédilles et caractères spéciaux
 * José → jose, Martínez → martinez
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

    const { username, password } = req.body

    if (!username || !password) {
        return res.status(400).json({ 
            error: 'Identifiant et mot de passe requis' 
        })
    }

    try {
        console.log(`🔐 [LOGIN-DEBUG] Tentative login username="${username}", password="${password}"`)
        
        // Chercher le formateur par prénom (recherche flexible avec ilike)
        // José tapé par l'utilisateur trouvera José en base
        const { data: formateurs, error: formateurError } = await supabase
            .from('users')
            .select('*')
            .ilike('prenom', `%${username}%`)
            .eq('role', 'formateur')
            .eq('archive', false)
            
        console.log(`🔐 [LOGIN-DEBUG] Requête Supabase - formateurs trouvés: ${formateurs?.length || 0}`)
        formateurs?.forEach((f, i) => {
            console.log(`🔐 [LOGIN-DEBUG] Formateur ${i}: ${f.prenom} ${f.nom}, email: ${f.email}, password_hash: ${f.password_hash ? 'EXISTE' : 'NULL'}`)
        })

        if (formateurError) {
            return res.status(401).json({ 
                error: 'Identifiants incorrects' 
            })
        }

        // Trouver le bon formateur en comparant les prénoms normalisés
        const usernameNormalized = normalizeForEmail(username)
        const formateur = formateurs.find(f => 
            normalizeForEmail(f.prenom) === usernameNormalized
        )

        if (formateurError || !formateur) {
            return res.status(401).json({ 
                error: 'Identifiants incorrects' 
            })
        }

        // Vérifier le mot de passe
        let passwordValid = false
        let showEncouragement = false

        console.log(`🔐 [LOGIN-DEBUG] Vérification mot de passe pour ${formateur.prenom} ${formateur.nom}`)
        console.log(`🔐 [LOGIN-DEBUG] password_hash exists: ${formateur.password_hash ? 'EXISTE' : 'NULL'}`)

        // Nouvelle logique de vérification
        if (formateur.password_hash) {
            console.log(`🔐 [LOGIN-DEBUG] Utilisation bcrypt`)
            // Si password_hash existe, utiliser uniquement bcrypt
            passwordValid = await bcrypt.compare(password, formateur.password_hash)
            if (!passwordValid) {
                return res.status(401).json({ 
                    error: 'Mot de passe incorrect' 
                })
            }
        } else {
            console.log(`🔐 [LOGIN-DEBUG] Utilisation fallback nom normalisé`)
            // Fallback : première connexion avec nom (Martínez → martinez)
            const nomNormalized = normalizeForEmail(formateur.nom)
            const passwordNormalized = normalizeForEmail(password)

            console.log(`🔐 [LOGIN-DEBUG] Comparaison normalisée:`)
            console.log(`🔐 [LOGIN-DEBUG]   nom "${formateur.nom}" → "${nomNormalized}"`)
            console.log(`🔐 [LOGIN-DEBUG]   password "${password}" → "${passwordNormalized}"`)
            console.log(`🔐 [LOGIN-DEBUG]   match: ${passwordNormalized === nomNormalized}`)

            if (passwordNormalized !== nomNormalized) {
                return res.status(401).json({
                    error: 'Mot de passe incorrect'
                })
            }
            passwordValid = true

            // Encourager à changer le mot de passe seulement si moins de 3 rappels
            const remindersCount = formateur.password_change_reminders || 0
            console.log(`🔐 [LOGIN-DEBUG] Rappels changement MDP: ${remindersCount}/3`)

            if (remindersCount < 3) {
                showEncouragement = true

                // Incrémenter le compteur
                await supabase
                    .from('users')
                    .update({ password_change_reminders: remindersCount + 1 })
                    .eq('id', formateur.id)

                console.log(`🔐 [LOGIN-DEBUG] Compteur incrémenté: ${remindersCount + 1}/3`)
            } else {
                console.log(`🔐 [LOGIN-DEBUG] Limite de rappels atteinte (3/3) - pas d'encouragement`)
            }
        }

        // Générer le token
        const tokens = generateTokenPair({
            id: formateur.id,
            formateur_id: formateur.id,
            username: formateur.prenom,
            nom: formateur.nom,
            prenom: formateur.prenom,
            email: formateur.email
        })

        const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

        return res.status(200).json({
            success: true,
            user: {
                id: formateur.id,
                username: formateur.prenom,
                nom: formateur.nom,
                prenom: formateur.prenom,
                email: formateur.email,
                role: 'formateur',
                bureau: formateur.bureau || false,
                mustChangePassword: false
            },
            tokens: {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn,
                tokenType: tokens.tokenType
            },
            sessionId: sessionId,
            showEncouragement: showEncouragement
        })

    } catch (error) {
        console.error('Erreur login formateur:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur' 
        })
    }
}
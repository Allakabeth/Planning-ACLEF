import { supabase } from './supabaseClient'

// Whitelist centralisee des emails admin autorises a appeler les API admin.
// Source unique de verite : modifier ici pour ajouter/retirer un admin.
// Doit rester aligne avec la liste utilisee dans withAuthAdmin / Supabase Auth.
const ADMIN_EMAILS = [
    'albena@aclef.fr',
    'fanny@aclef.fr',
    'mathieu@aclef.fr',
    'sarah@aclef.fr',
    'test@aclef.fr',
    'admin@test.com'
]

/**
 * Garde d'authentification pour les routes API admin.
 *
 * Verifie que la requete contient un Bearer token Supabase valide ET que
 * l'utilisateur correspondant est dans la whitelist admin.
 *
 * Usage dans une route API :
 *   const user = await requireAdminAuth(req, res)
 *   if (!user) return  // le helper a deja repondu 401 / 403
 *   // ...suite normale
 *
 * @param {Object} req - Requete Next.js
 * @param {Object} res - Reponse Next.js (utilisee pour repondre 401/403 si echec)
 * @returns {Promise<Object|null>} user Supabase Auth si OK, null sinon
 */
export async function requireAdminAuth(req, res) {
    const authHeader = req.headers.authorization
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token manquant' })
        return null
    }

    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
        res.status(401).json({ error: 'Token invalide' })
        return null
    }

    if (!ADMIN_EMAILS.includes(user.email)) {
        console.error(`[API-AUTH] Acces admin refuse pour ${user.email}`)
        res.status(403).json({ error: 'Acces admin requis' })
        return null
    }

    return user
}

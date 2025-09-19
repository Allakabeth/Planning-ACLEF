import { supabase } from '../../../lib/supabaseClient'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' })
    }

    try {
        // 1. Vérifier authentification admin via Supabase
        const authHeader = req.headers.authorization
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token manquant' })
        }

        const token = authHeader.substring(7)
        const { data: { user }, error: authError } = await supabase.auth.getUser(token)

        if (authError || !user) {
            console.error('[ADMIN-RESET] Auth Error:', authError?.message)
            return res.status(401).json({ error: 'Token invalide' })
        }

        // 2. Vérifier que c'est un admin (email dans la liste des admins)
        const adminEmails = [
            'albena@aclef.fr', 
            'fanny@aclef.fr', 
            'mathieu@aclef.fr', 
            'sarah@aclef.fr', 
            'test@aclef.fr',
            'admin@test.com' // Pour les tests
        ]

        if (!adminEmails.includes(user.email)) {
            console.error(`[ADMIN-RESET] Accès refusé pour email: ${user.email}`)
            return res.status(403).json({ error: 'Accès admin requis' })
        }

        // 2. Récupérer les paramètres
        const { formateurId, formateurNom } = req.body
        if (!formateurId || !formateurNom) {
            return res.status(400).json({ error: 'Paramètres manquants (formateurId, formateurNom)' })
        }

        console.log(`[ADMIN-RESET] Tentative reset pour formateur ID: ${formateurId}, nom: ${formateurNom}`)

        // 3. Vérifier que le formateur existe avant reset
        const { data: formateurCheck, error: checkError } = await supabaseAdmin
            .from('users')
            .select('id, prenom, nom, role, archive')
            .eq('id', formateurId)
            .eq('role', 'formateur')
            .single()

        if (checkError || !formateurCheck) {
            console.error('[ADMIN-RESET] Formateur non trouvé:', checkError?.message)
            return res.status(404).json({ error: 'Formateur non trouvé' })
        }

        if (formateurCheck.archive) {
            return res.status(400).json({ error: 'Impossible de réinitialiser un formateur archivé' })
        }

        // 4. Réinitialiser le mot de passe (supprimer password_hash)
        console.log(`[ADMIN-RESET] Reset pour: ${formateurCheck.prenom} ${formateurCheck.nom}`)
        
        const { data, error, count } = await supabaseAdmin
            .from('users')
            .update({ 
                password_hash: null,              // Supprime le hash personnalisé
                must_change_password: false,      // Retire l'obligation
                password_changed_at: null         // Remet à null
            })
            .eq('id', formateurId)
            .eq('role', 'formateur')
            .select('prenom, nom')

        if (error) {
            console.error('[ADMIN-RESET] Erreur UPDATE:', error)
            return res.status(500).json({ error: 'Erreur lors de la réinitialisation' })
        }

        if (!data || data.length === 0) {
            console.error('[ADMIN-RESET] Aucune ligne affectée par UPDATE')
            return res.status(500).json({ error: 'Réinitialisation échouée - Aucune modification' })
        }

        // 5. Logger l'action admin pour audit
        console.log(`[ADMIN-RESET] ✅ Mot de passe réinitialisé: ${data[0].prenom} ${data[0].nom} par admin ${user.email}`)

        // 6. Vérification post-reset
        const { data: verifyReset, error: verifyError } = await supabaseAdmin
            .from('users')
            .select('password_hash, must_change_password, password_changed_at')
            .eq('id', formateurId)
            .single()

        if (!verifyError && verifyReset) {
            console.log(`[ADMIN-RESET] Vérification: password_hash=${verifyReset.password_hash ? 'EXISTE' : 'NULL'}, must_change=${verifyReset.must_change_password}`)
        }

        return res.status(200).json({
            success: true,
            message: `Mot de passe réinitialisé pour ${data[0].prenom} ${data[0].nom}`,
            fallbackPassword: formateurNom,
            formateur: {
                prenom: data[0].prenom,
                nom: data[0].nom
            }
        })

    } catch (error) {
        console.error('[ADMIN-RESET] Erreur globale:', error)
        return res.status(500).json({ error: 'Erreur serveur interne' })
    }
}
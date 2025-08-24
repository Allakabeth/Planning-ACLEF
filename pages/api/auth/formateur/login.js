import { supabase } from '../../../../lib/supabaseClient'
import { generateTokenPair } from '../../../../lib/jwt'

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
        // Chercher le formateur par prénom
        const { data: formateur, error: formateurError } = await supabase
            .from('users')
            .select('*')
            .ilike('prenom', username)
            .eq('role', 'formateur')
            .eq('archive', false)
            .single()

        if (formateurError || !formateur) {
            return res.status(401).json({ 
                error: 'Identifiants incorrects' 
            })
        }

        // Vérifier le mot de passe
        let passwordValid = false
        let showEncouragement = false

        if (formateur.custom_password) {
            // Utiliser custom_password si défini
            passwordValid = (password === formateur.custom_password)
        } else {
            // Sinon utiliser nom ET afficher encouragement
            passwordValid = (password.toLowerCase() === formateur.nom.toLowerCase())
            showEncouragement = passwordValid // Encouragement si connexion réussie avec nom
        }

        if (!passwordValid) {
            return res.status(401).json({ 
                error: 'Identifiants incorrects' 
            })
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
import { verifyAccessToken, extractTokenFromHeader } from '../../../../lib/jwt'
import { supabase } from '../../../../lib/supabaseClient'

export default async function handler(req, res) {
    // Seulement GET ou POST
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    try {
        // Extraire le token du header Authorization
        const token = extractTokenFromHeader(req.headers.authorization)
        
        if (!token) {
            return res.status(401).json({ 
                error: 'Token manquant',
                valid: false 
            })
        }

        // Vérifier le token
        const { valid, decoded, error } = verifyAccessToken(token)
        
        if (!valid) {
            return res.status(401).json({ 
                error: error || 'Token invalide',
                valid: false 
            })
        }

        // Vérifier que le formateur existe toujours et est actif
        const { data: formateur, error: dbError } = await supabase
            .from('users')
            .select('id, nom, prenom, email, role, bureau, archive, must_change_password, password_hash')
            .eq('id', decoded.id)
            .eq('role', 'formateur')
            .eq('archive', false)
            .single()

        if (dbError || !formateur) {
            return res.status(401).json({ 
                error: 'Formateur non trouvé ou inactif',
                valid: false 
            })
        }

        // Token valide et formateur actif
        return res.status(200).json({
            valid: true,
            user: {
                id: formateur.id,
                username: decoded.username,
                nom: formateur.nom,
                prenom: formateur.prenom,
                email: formateur.email,
                role: 'formateur',
                bureau: formateur.bureau || false,
                mustChangePassword: formateur.must_change_password === true || !(formateur.password_hash?.startsWith('$2b$') || formateur.password_hash?.startsWith('$2a$') || formateur.password_hash?.startsWith('$2y$'))
            },
            token: {
                exp: decoded.exp,
                iat: decoded.iat,
                expiresIn: decoded.exp - Math.floor(Date.now() / 1000) // Secondes restantes
            }
        })

    } catch (error) {
        console.error('Erreur vérification token:', error)
        return res.status(500).json({ 
            error: 'Erreur serveur lors de la vérification',
            valid: false 
        })
    }
}
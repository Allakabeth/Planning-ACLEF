import jwt from 'jsonwebtoken'

// Clés secrètes pour JWT (à mettre dans les variables d'environnement)
const JWT_SECRET = process.env.JWT_SECRET || 'aclef-formateur-secret-2024-change-me-in-production'
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'aclef-refresh-secret-2024-change-me-in-production'

// Durées de vie des tokens
const ACCESS_TOKEN_EXPIRE = '15m' // Token d'accès : 15 minutes
const REFRESH_TOKEN_EXPIRE = '7d' // Token de rafraîchissement : 7 jours

/**
 * Génère un token d'accès JWT
 */
export function generateAccessToken(payload) {
    return jwt.sign(
        {
            ...payload,
            type: 'access'
        },
        JWT_SECRET,
        {
            expiresIn: ACCESS_TOKEN_EXPIRE,
            issuer: 'aclef-planning',
            audience: 'formateur'
        }
    )
}

/**
 * Génère un token de rafraîchissement JWT
 */
export function generateRefreshToken(payload) {
    return jwt.sign(
        {
            ...payload,
            type: 'refresh'
        },
        REFRESH_SECRET,
        {
            expiresIn: REFRESH_TOKEN_EXPIRE,
            issuer: 'aclef-planning',
            audience: 'formateur'
        }
    )
}

/**
 * Vérifie et décode un token d'accès
 */
export function verifyAccessToken(token) {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            issuer: 'aclef-planning',
            audience: 'formateur'
        })
        
        if (decoded.type !== 'access') {
            throw new Error('Invalid token type')
        }
        
        return { valid: true, decoded }
    } catch (error) {
        return { valid: false, error: error.message }
    }
}

/**
 * Vérifie et décode un token de rafraîchissement
 */
export function verifyRefreshToken(token) {
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET, {
            issuer: 'aclef-planning',
            audience: 'formateur'
        })
        
        if (decoded.type !== 'refresh') {
            throw new Error('Invalid token type')
        }
        
        return { valid: true, decoded }
    } catch (error) {
        return { valid: false, error: error.message }
    }
}

/**
 * Extrait le token du header Authorization
 */
export function extractTokenFromHeader(authHeader) {
    if (!authHeader) return null
    
    // Format: "Bearer TOKEN"
    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null
    }
    
    return parts[1]
}

/**
 * Génère une paire de tokens (access + refresh)
 */
export function generateTokenPair(user) {
    const payload = {
        id: user.id,
        formateur_id: user.formateur_id,
        username: user.username,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: 'formateur'
    }
    
    return {
        accessToken: generateAccessToken(payload),
        refreshToken: generateRefreshToken(payload),
        expiresIn: 900, // 15 minutes en secondes
        tokenType: 'Bearer'
    }
}

/**
 * Vérifie un token (alias pour verifyAccessToken)
 */
export function verifyToken(token) {
    const result = verifyAccessToken(token)
    return result.valid ? result.decoded : null
}
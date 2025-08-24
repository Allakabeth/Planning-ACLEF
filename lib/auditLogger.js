import { supabase } from './supabaseClient'

// 🎛️ CONFIGURATION LOGS AUDIT
const AUDIT_ENABLED = true // ← Facile à désactiver si besoin
const MAX_LOGS_RETENTION_DAYS = 90 // Nettoyage auto après 3 mois

// 📊 TYPES D'ACTIONS AUDITÉES
export const AUDIT_ACTIONS = {
  // Planning
  PLANNING_VALIDE: 'planning_valide',
  PLANNING_MODIFIE: 'planning_modifie',
  PLANNING_SUPPRIME: 'planning_supprime',
  
  // Gestion utilisateurs
  USER_CREE: 'user_cree',
  USER_MODIFIE: 'user_modifie',
  USER_ARCHIVE: 'user_archive',
  USER_SUPPRIME: 'user_supprime',
  
  // Validation changements
  ABSENCE_VALIDEE: 'absence_validee',
  ABSENCE_REJETEE: 'absence_rejetee',
  CHANGEMENT_VALIDE: 'changement_valide',
  
  // Messagerie
  MESSAGE_ENVOYE_GLOBAL: 'message_envoye_global',
  MESSAGE_IMPORTANT: 'message_important',
  
  // Sécurité
  LOGIN_ADMIN: 'login_admin',
  LOGOUT_ADMIN: 'logout_admin',
  ACCES_REFUSE: 'acces_refuse'
}

// 🎯 FONCTION PRINCIPALE - LOG AUDIT
export const logAudit = async (action, details = {}) => {
  if (!AUDIT_ENABLED) {
    console.log('🔇 Audit désactivé, action ignorée:', action)
    return null
  }

  try {
    // Récupérer l'utilisateur actuel
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.warn('⚠️ Impossible de logger - utilisateur non identifié')
      return null
    }

    // Préparer l'entrée de log
    const logEntry = {
      admin_user_id: user.id,
      admin_email: user.email,
      action: action,
      details: details,
      ip_address: await getClientIP(), // Optionnel
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      session_id: await getCurrentSessionId()
    }

    // Enregistrer dans la table audit_logs
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logEntry])
      .select()
      .single()

    if (error) {
      console.error('❌ Erreur enregistrement audit log:', error)
      return null
    }

    console.log('✅ Action auditée:', action, details)
    return data

  } catch (error) {
    console.error('❌ Erreur système audit:', error)
    return null
  }
}

// 🌐 UTILITAIRES COMPLÉMENTAIRES
const getClientIP = async () => {
  try {
    // Simple récupération IP publique (optionnel)
    const response = await fetch('https://api.ipify.org?format=json')
    const data = await response.json()
    return data.ip || 'unknown'
  } catch {
    return 'unknown'
  }
}

const getCurrentSessionId = async () => {
  try {
    const { data: sessions } = await supabase
      .from('admin_sessions')
      .select('session_token')
      .eq('is_active', true)
      .limit(1)
      .single()
    
    return sessions?.session_token || 'unknown'
  } catch {
    return 'unknown'
  }
}

// 🎯 FONCTIONS PRÊTES À UTILISER DANS LES PAGES

export const auditPlanningAction = async (action, planningData) => {
  return await logAudit(action, {
    semaine: planningData.semaine,
    nb_creneaux: planningData.creneaux,
    nb_formateurs: planningData.formateurs,
    statut: planningData.statut
  })
}

export const auditUserAction = async (action, userData) => {
  return await logAudit(action, {
    user_id: userData.id,
    prenom: userData.prenom,
    nom: userData.nom,
    role: userData.role,
    avant: userData.avant || null, // Pour modifications
    apres: userData.apres || null
  })
}

export const auditValidationAction = async (action, validationData) => {
  return await logAudit(action, {
    formateur_id: validationData.formateur_id,
    date_debut: validationData.date_debut,
    date_fin: validationData.date_fin,
    type: validationData.type,
    motif: validationData.motif
  })
}

export const auditMessageAction = async (action, messageData) => {
  return await logAudit(action, {
    destinataires: messageData.destinataires || 'tous',
    objet: messageData.objet,
    type: messageData.type
  })
}

export const auditSecurityAction = async (action, securityData = {}) => {
  return await logAudit(action, {
    ip: securityData.ip,
    tentative: securityData.tentative,
    raison: securityData.raison
  })
}

// 🧹 NETTOYAGE AUTOMATIQUE (à appeler périodiquement)
export const cleanOldAuditLogs = async () => {
  try {
    const dateLimit = new Date()
    dateLimit.setDate(dateLimit.getDate() - MAX_LOGS_RETENTION_DAYS)
    
    const { error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('timestamp', dateLimit.toISOString())

    if (error) {
      console.error('❌ Erreur nettoyage logs:', error)
      return false
    }

    console.log('✅ Nettoyage logs audit terminé')
    return true

  } catch (error) {
    console.error('❌ Erreur nettoyage système:', error)
    return false
  }
}

// 📊 STATISTIQUES LOGS (pour interface)
export const getAuditStats = async () => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('action, admin_email, timestamp')
      .order('timestamp', { ascending: false })
      .limit(1000)

    if (error) throw error

    // Calculer stats
    const stats = {
      total_logs: data.length,
      actions_today: data.filter(log => 
        new Date(log.timestamp).toDateString() === new Date().toDateString()
      ).length,
      admins_actifs: [...new Set(data.map(log => log.admin_email))].length,
      derniere_action: data[0]?.timestamp || null
    }

    return stats

  } catch (error) {
    console.error('❌ Erreur stats audit:', error)
    return null
  }
}
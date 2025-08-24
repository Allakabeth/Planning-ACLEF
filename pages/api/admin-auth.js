import { supabase } from '../../lib/supabaseClient'

export default async function handler(req, res) {
  const timestamp = new Date().toISOString()
  
  // Gérer les deux formats (SendBeacon vs XHR)
  let body = req.body
  if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body)
    } catch (e) {
      body = req.body
    }
  }
  
  if (req.method === 'POST') {
    const { action, adminEmail } = body
    
    try {
      if (action === 'emergency_logout') {
        console.log(`🚨 DÉCONNEXION D'URGENCE REÇUE pour ${adminEmail}`)
        
        // Désactiver toutes les sessions actives pour cet admin
        const { error } = await supabase
          .from('admin_sessions')
          .update({ is_active: false })
          .eq('email_admin', adminEmail)
          .eq('is_active', true)
        
        if (error) {
          console.error('❌ Erreur désactivation session urgence:', error)
          return res.status(500).json({
            success: false,
            message: 'Erreur désactivation session',
            error: error.message
          })
        }
        
        console.log(`✅ Session d'urgence désactivée pour ${adminEmail}`)
        
        return res.status(200).json({
          success: true,
          message: 'Déconnexion urgence réussie',
          adminEmail,
          timestamp
        })
      }
      
      return res.status(400).json({
        success: false,
        message: 'Action non supportée'
      })
      
    } catch (error) {
      console.error('❌ Erreur API admin-auth:', error)
      return res.status(500).json({
        success: false,
        message: 'Erreur serveur',
        error: error.message
      })
    }
  }
  
  return res.status(405).json({
    success: false,
    message: 'Méthode non autorisée'
  })
}
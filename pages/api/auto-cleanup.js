import { supabase } from '../../lib/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('🧹 Nettoyage automatique sessions...')

    // 🎯 SEUIL RÉDUIT À 2 MINUTES (au lieu de 5)
    const seuilInactivite = new Date(Date.now() - 2 * 60 * 1000) // 2 minutes
    
    const { data: cleanedSessions, error } = await supabase
      .from('admin_sessions')
      .update({ 
        is_active: false,
        heartbeat: new Date().toISOString()
      })
      .eq('is_active', true)
      .lt('heartbeat', seuilInactivite.toISOString())
      .select()

    if (error) {
      console.error('❌ Erreur cleanup:', error)
      return res.status(500).json({ error: 'Database error' })
    }

    const nombreNettoye = cleanedSessions?.length || 0
    console.log('🧹 Sessions nettoyées:', nombreNettoye)

    res.status(200).json({
      success: true,
      cleaned: nombreNettoye,
      seuil_minutes: 2,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Erreur auto-cleanup:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
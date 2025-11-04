import { supabase } from '../../lib/supabaseClient'

/**
 * API de gestion de la configuration du nettoyage automatique de la messagerie
 *
 * GET /api/config-messagerie - Récupérer la configuration actuelle
 * POST /api/config-messagerie - Mettre à jour la configuration
 * GET /api/config-messagerie?logs=true - Récupérer l'historique des nettoyages
 */
export default async function handler(req, res) {
  try {
    // GET : Récupérer la configuration ou les logs
    if (req.method === 'GET') {
      // Récupérer les logs si demandé
      if (req.query.logs === 'true') {
        const { data: logs, error: logsError } = await supabase
          .from('logs_nettoyage_messagerie')
          .select('*')
          .order('date_execution', { ascending: false })
          .limit(20)

        if (logsError) {
          console.error('Erreur récupération logs:', logsError)
          return res.status(500).json({ error: 'Erreur récupération logs' })
        }

        return res.status(200).json({ logs: logs || [] })
      }

      // Récupérer la configuration
      const { data: config, error: configError } = await supabase
        .from('config_messagerie')
        .select('*')
        .order('cle')

      if (configError) {
        console.error('Erreur récupération config:', configError)
        return res.status(500).json({ error: 'Erreur récupération configuration' })
      }

      return res.status(200).json({ config: config || [] })
    }

    // POST : Mettre à jour la configuration
    if (req.method === 'POST') {
      const { cle, valeur } = req.body

      if (!cle || valeur === undefined || valeur === null) {
        return res.status(400).json({ error: 'Paramètres manquants (cle, valeur)' })
      }

      // Validation : valeur doit être un nombre positif
      const valeurNum = parseInt(valeur, 10)
      if (isNaN(valeurNum) || valeurNum < 0) {
        return res.status(400).json({ error: 'La valeur doit être un nombre positif' })
      }

      // Mettre à jour la configuration
      const { data, error } = await supabase
        .from('config_messagerie')
        .update({
          valeur: valeurNum,
          updated_at: new Date().toISOString()
        })
        .eq('cle', cle)
        .select()

      if (error) {
        console.error('Erreur mise à jour config:', error)
        return res.status(500).json({ error: 'Erreur mise à jour configuration' })
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Paramètre de configuration introuvable' })
      }

      return res.status(200).json({
        success: true,
        message: 'Configuration mise à jour avec succès',
        config: data[0]
      })
    }

    // Méthode non supportée
    return res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    console.error('Erreur globale config-messagerie:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}

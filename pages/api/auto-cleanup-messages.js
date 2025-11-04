import { supabase } from '../../lib/supabaseClient'

/**
 * API de nettoyage automatique de la messagerie
 *
 * Fonctionnalités :
 * - Archivage automatique des messages non lus après X jours
 * - Archivage automatique des messages lus après Y jours
 * - Archivage automatique des messages traités après Z jours
 * - Suppression définitive des messages archivés après W jours
 *
 * Usage :
 * - GET /api/auto-cleanup-messages?action=preview (aperçu sans exécution)
 * - POST /api/auto-cleanup-messages (exécution réelle)
 */
export default async function handler(req, res) {
  try {
    const isPreview = req.method === 'GET' && req.query.action === 'preview'

    // 1. Récupérer la configuration
    const { data: config, error: configError } = await supabase
      .from('config_messagerie')
      .select('*')

    if (configError) {
      console.error('Erreur récupération config:', configError)
      return res.status(500).json({ error: 'Erreur récupération configuration' })
    }

    // Extraire les valeurs de configuration
    const configMap = {}
    config.forEach(item => {
      configMap[item.cle] = item.valeur
    })

    const joursArchivageNonLus = configMap['archivage_non_lus'] || 30
    const joursArchivageLus = configMap['archivage_lus'] || 15
    const joursArchivageTraites = configMap['archivage_traites'] || 7
    const joursSuppressionArchives = configMap['suppression_archives'] || 90

    // 2. Calculer les dates limites
    const dateArchivageNonLus = new Date()
    dateArchivageNonLus.setDate(dateArchivageNonLus.getDate() - joursArchivageNonLus)

    const dateArchivageLus = new Date()
    dateArchivageLus.setDate(dateArchivageLus.getDate() - joursArchivageLus)

    const dateArchivageTraites = new Date()
    dateArchivageTraites.setDate(dateArchivageTraites.getDate() - joursArchivageTraites)

    const dateSuppressionArchives = new Date()
    dateSuppressionArchives.setDate(dateSuppressionArchives.getDate() - joursSuppressionArchives)

    // 3. Trouver les messages à archiver
    const { data: messagesNonLusAArchiver, error: errorNonLus } = await supabase
      .from('messages')
      .select('id, objet, created_at, lu')
      .eq('archive', false)
      .eq('lu', false)
      .lt('created_at', dateArchivageNonLus.toISOString())

    const { data: messagesLusAArchiver, error: errorLus } = await supabase
      .from('messages')
      .select('id, objet, created_at, lu')
      .eq('archive', false)
      .eq('lu', true)
      .lt('created_at', dateArchivageLus.toISOString())

    const { data: messagesTraitesAArchiver, error: errorTraites } = await supabase
      .from('messages')
      .select('id, objet, created_at, statut_validation')
      .eq('archive', false)
      .eq('statut_validation', 'traite')
      .lt('created_at', dateArchivageTraites.toISOString())

    // 4. Trouver les messages archivés à supprimer
    const { data: messagesASupprimer, error: errorSupprimer } = await supabase
      .from('messages')
      .select('id, objet, date_archivage')
      .eq('archive', true)
      .not('date_archivage', 'is', null)
      .lt('date_archivage', dateSuppressionArchives.toISOString().split('T')[0])

    if (errorNonLus || errorLus || errorTraites || errorSupprimer) {
      console.error('Erreur recherche messages:', { errorNonLus, errorLus, errorTraites, errorSupprimer })
      return res.status(500).json({ error: 'Erreur recherche messages' })
    }

    const messagesNonLus = messagesNonLusAArchiver || []
    const messagesLus = messagesLusAArchiver || []
    const messagesTraites = messagesTraitesAArchiver || []
    const messagesArchives = messagesASupprimer || []

    const totalAArchiver = messagesNonLus.length + messagesLus.length + messagesTraites.length
    const totalASupprimer = messagesArchives.length

    // MODE PREVIEW : Retourner les statistiques sans exécuter
    if (isPreview) {
      return res.status(200).json({
        preview: true,
        config: {
          joursArchivageNonLus,
          joursArchivageLus,
          joursArchivageTraites,
          joursSuppressionArchives
        },
        statistiques: {
          messagesNonLusAArchiver: messagesNonLus.length,
          messagesLusAArchiver: messagesLus.length,
          messagesTraitesAArchiver: messagesTraites.length,
          totalAArchiver,
          messagesArchivesASupprimer: messagesArchives.length,
          totalASupprimer
        },
        dates_limites: {
          dateArchivageNonLus: dateArchivageNonLus.toISOString(),
          dateArchivageLus: dateArchivageLus.toISOString(),
          dateArchivageTraites: dateArchivageTraites.toISOString(),
          dateSuppressionArchives: dateSuppressionArchives.toISOString()
        }
      })
    }

    // MODE EXÉCUTION : Effectuer les opérations

    let messagesArchivesCount = 0
    let messagesSupprimesCount = 0
    const erreurs = []

    // 5. Archiver les messages non lus
    if (messagesNonLus.length > 0) {
      const ids = messagesNonLus.map(m => m.id)
      const { error } = await supabase
        .from('messages')
        .update({
          archive: true,
          date_archivage: new Date().toISOString().split('T')[0]
        })
        .in('id', ids)

      if (error) {
        erreurs.push({ type: 'archivage_non_lus', error: error.message })
      } else {
        messagesArchivesCount += ids.length
      }
    }

    // 6. Archiver les messages lus
    if (messagesLus.length > 0) {
      const ids = messagesLus.map(m => m.id)
      const { error } = await supabase
        .from('messages')
        .update({
          archive: true,
          date_archivage: new Date().toISOString().split('T')[0]
        })
        .in('id', ids)

      if (error) {
        erreurs.push({ type: 'archivage_lus', error: error.message })
      } else {
        messagesArchivesCount += ids.length
      }
    }

    // 7. Archiver les messages traités
    if (messagesTraites.length > 0) {
      const ids = messagesTraites.map(m => m.id)
      const { error } = await supabase
        .from('messages')
        .update({
          archive: true,
          date_archivage: new Date().toISOString().split('T')[0]
        })
        .in('id', ids)

      if (error) {
        erreurs.push({ type: 'archivage_traites', error: error.message })
      } else {
        messagesArchivesCount += ids.length
      }
    }

    // 8. Supprimer définitivement les messages archivés
    if (messagesArchives.length > 0) {
      const ids = messagesArchives.map(m => m.id)
      const { error } = await supabase
        .from('messages')
        .delete()
        .in('id', ids)

      if (error) {
        erreurs.push({ type: 'suppression_archives', error: error.message })
      } else {
        messagesSupprimesCount = ids.length
      }
    }

    // 9. Logger l'opération
    await supabase
      .from('logs_nettoyage_messagerie')
      .insert({
        date_execution: new Date().toISOString(),
        messages_archives: messagesArchivesCount,
        messages_supprimes: messagesSupprimesCount,
        details: {
          config: {
            joursArchivageNonLus,
            joursArchivageLus,
            joursArchivageTraites,
            joursSuppressionArchives
          },
          statistiques: {
            messagesNonLus: messagesNonLus.length,
            messagesLus: messagesLus.length,
            messagesTraites: messagesTraites.length,
            messagesArchives: messagesArchives.length
          },
          erreurs: erreurs.length > 0 ? erreurs : null
        },
        executeur: req.body?.executeur || 'auto'
      })

    // 10. Retourner le résultat
    return res.status(200).json({
      success: true,
      messagesArchives: messagesArchivesCount,
      messagesSupprimes: messagesSupprimesCount,
      erreurs: erreurs.length > 0 ? erreurs : null,
      message: `✅ Nettoyage terminé : ${messagesArchivesCount} message(s) archivé(s), ${messagesSupprimesCount} message(s) supprimé(s)`
    })

  } catch (error) {
    console.error('Erreur globale auto-cleanup-messages:', error)
    return res.status(500).json({
      error: 'Erreur serveur',
      details: error.message
    })
  }
}

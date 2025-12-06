import { supabase } from '../../../lib/supabaseClient'

/**
 * API de notifications automatiques pour fin de formation apprenants
 *
 * Envoie des alertes 4, 3, 2, 1 semaine(s) avant la date de fin prévue
 * Appelé quotidiennement par le cron Vercel à 7h30
 *
 * GET: Envoi des notifications (utilisé par le cron Vercel)
 * GET avec ?preview=true: Aperçu sans envoi
 * POST: Envoi effectif des notifications
 */

export default async function handler(req, res) {
  // Vérification du secret pour les appels cron (optionnel en dev)
  const cronSecret = req.headers['authorization']
  const expectedSecret = process.env.CRON_SECRET

  // En production, vérifier le secret
  if (process.env.NODE_ENV === 'production' && expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    const aujourdhui = new Date()
    aujourdhui.setHours(0, 0, 0, 0)

    // Récupérer les apprenants actifs avec date de fin prévue
    const { data: apprenants, error: errorApprenants } = await supabase
      .from('users')
      .select(`
        id,
        prenom,
        nom,
        date_entree_formation,
        date_sortie_previsionnelle,
        dispositif,
        lieu_formation:lieu_formation_id(id, nom)
      `)
      .eq('role', 'apprenant')
      .eq('archive', false)
      .in('statut_formation', ['en_cours', null]) // Actifs uniquement
      .not('date_sortie_previsionnelle', 'is', null)

    if (errorApprenants) {
      throw new Error(`Erreur récupération apprenants: ${errorApprenants.message}`)
    }

    // Récupérer les notifications déjà envoyées
    const { data: notificationsExistantes, error: errorNotifs } = await supabase
      .from('notifications_fin_formation')
      .select('apprenant_id, semaines_avant, date_fin_prevue')

    if (errorNotifs) {
      throw new Error(`Erreur récupération notifications: ${errorNotifs.message}`)
    }

    // Créer un Set pour vérification rapide des doublons
    const notifSet = new Set(
      (notificationsExistantes || []).map(n =>
        `${n.apprenant_id}_${n.semaines_avant}_${n.date_fin_prevue}`
      )
    )

    // Calculer les notifications à envoyer
    const notificationsAEnvoyer = []

    for (const apprenant of apprenants || []) {
      const dateFin = new Date(apprenant.date_sortie_previsionnelle)
      dateFin.setHours(0, 0, 0, 0)

      const diffJours = Math.floor((dateFin - aujourdhui) / (1000 * 60 * 60 * 24))

      // Déterminer le nombre de semaines
      let semaines = null
      if (diffJours >= 0 && diffJours <= 7) {
        semaines = 1
      } else if (diffJours > 7 && diffJours <= 14) {
        semaines = 2
      } else if (diffJours > 14 && diffJours <= 21) {
        semaines = 3
      } else if (diffJours > 21 && diffJours <= 28) {
        semaines = 4
      }

      if (semaines) {
        const cle = `${apprenant.id}_${semaines}_${apprenant.date_sortie_previsionnelle}`

        // Vérifier si déjà notifié
        if (!notifSet.has(cle)) {
          notificationsAEnvoyer.push({
            apprenant,
            semaines,
            diffJours,
            dateFin: apprenant.date_sortie_previsionnelle
          })
        }
      }
    }

    // Mode aperçu (GET avec ?preview=true)
    if (req.method === 'GET' && req.query.preview === 'true') {
      return res.status(200).json({
        success: true,
        mode: 'apercu',
        date: aujourdhui.toISOString().split('T')[0],
        totalApprenants: apprenants?.length || 0,
        notificationsAEnvoyer: notificationsAEnvoyer.length,
        details: notificationsAEnvoyer.map(n => ({
          apprenant: `${n.apprenant.prenom} ${n.apprenant.nom}`,
          semaines: n.semaines,
          joursRestants: n.diffJours,
          dateFin: n.dateFin,
          dispositif: n.apprenant.dispositif,
          lieu: n.apprenant.lieu_formation?.nom || 'Non défini'
        }))
      })
    }

    // Mode envoi (GET pour cron Vercel ou POST)
    if (req.method === 'POST' || req.method === 'GET') {
      const resultats = {
        envoyes: 0,
        erreurs: 0,
        details: []
      }

      for (const notif of notificationsAEnvoyer) {
        try {
          // Formater la date en français
          const dateFinFormatee = new Date(notif.dateFin).toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })

          const dateEntreeFormatee = notif.apprenant.date_entree_formation
            ? new Date(notif.apprenant.date_entree_formation).toLocaleDateString('fr-FR')
            : 'Non renseignée'

          // Créer le message
          const objet = `[Alerte] Fin de formation dans ${notif.semaines} semaine${notif.semaines > 1 ? 's' : ''} - ${notif.apprenant.prenom} ${notif.apprenant.nom}`

          const contenu = `📅 Fin de formation prévue : ${dateFinFormatee}

👤 Apprenant : ${notif.apprenant.prenom} ${notif.apprenant.nom}
📋 Dispositif : ${notif.apprenant.dispositif || 'Non renseigné'}
📍 Lieu de formation : ${notif.apprenant.lieu_formation?.nom || 'Non défini'}
📆 Date d'entrée : ${dateEntreeFormatee}
⏳ Jours restants : ${notif.diffJours} jour${notif.diffJours > 1 ? 's' : ''}

⚠️ Cette notification est générée automatiquement.`

          // Insérer le message
          const { error: errorMessage } = await supabase
            .from('messages')
            .insert({
              expediteur_id: null, // Système
              destinataire_id: null, // Admin (coordination)
              expediteur: 'Système ACLEF',
              destinataire: 'Coordination ACLEF',
              objet,
              contenu,
              type: 'fin_formation',
              lu: false,
              archive: false,
              statut_validation: 'nouveau',
              date: new Date().toISOString().split('T')[0],
              heure: new Date().toTimeString().slice(0, 5),
              // Champs personnalisés pour le code couleur
              semaines_restantes: notif.semaines,
              apprenant_concerne_id: notif.apprenant.id
            })

          if (errorMessage) {
            throw new Error(errorMessage.message)
          }

          // Tracker la notification
          const { error: errorTracking } = await supabase
            .from('notifications_fin_formation')
            .insert({
              apprenant_id: notif.apprenant.id,
              semaines_avant: notif.semaines,
              date_fin_prevue: notif.dateFin
            })

          if (errorTracking) {
            console.warn(`Warning tracking: ${errorTracking.message}`)
          }

          resultats.envoyes++
          resultats.details.push({
            apprenant: `${notif.apprenant.prenom} ${notif.apprenant.nom}`,
            semaines: notif.semaines,
            statut: 'envoyé'
          })

        } catch (err) {
          resultats.erreurs++
          resultats.details.push({
            apprenant: `${notif.apprenant.prenom} ${notif.apprenant.nom}`,
            semaines: notif.semaines,
            statut: 'erreur',
            message: err.message
          })
        }
      }

      return res.status(200).json({
        success: true,
        mode: 'envoi',
        date: aujourdhui.toISOString().split('T')[0],
        ...resultats
      })
    }

    return res.status(405).json({ error: 'Méthode non autorisée' })

  } catch (error) {
    console.error('Erreur notifications fin formation:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

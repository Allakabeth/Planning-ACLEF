import { supabase } from '../../../lib/supabaseClient'
import nodemailer from 'nodemailer'

/**
 * API de notifications automatiques pour les anniversaires des formateurs
 *
 * Vérifie chaque jour si c'est l'anniversaire d'un formateur
 * et envoie un message dans l'app + un email à aclef@aclef.fr
 *
 * Appelé quotidiennement par le cron Vercel à 7h00
 */

export default async function handler(req, res) {
  // Vérification du secret pour les appels cron
  const cronSecret = req.headers['authorization']
  const expectedSecret = process.env.CRON_SECRET

  if (process.env.NODE_ENV === 'production' && expectedSecret && cronSecret !== `Bearer ${expectedSecret}`) {
    return res.status(401).json({ error: 'Non autorisé' })
  }

  try {
    const aujourdhui = new Date()
    const jour = aujourdhui.getDate()
    const mois = aujourdhui.getMonth() + 1 // getMonth() retourne 0-11
    const dateStr = aujourdhui.toISOString().split('T')[0]

    // 1. Chercher les anniversaires du jour
    const { data: anniversaires, error: errorAnniv } = await supabase
      .from('anniversaires')
      .select('formateur_id, jour, mois')
      .eq('jour', jour)
      .eq('mois', mois)

    if (errorAnniv) {
      throw new Error(`Erreur récupération anniversaires: ${errorAnniv.message}`)
    }

    if (!anniversaires || anniversaires.length === 0) {
      return res.status(200).json({
        success: true,
        date: dateStr,
        message: 'Aucun anniversaire aujourd\'hui',
        envoyes: 0
      })
    }

    // 2. Récupérer les détails des formateurs concernés
    const formateurIds = anniversaires.map(a => a.formateur_id)

    const { data: formateurs, error: errorFormateurs } = await supabase
      .from('users')
      .select('id, prenom, nom')
      .in('id', formateurIds)
      .eq('archive', false)

    if (errorFormateurs) {
      throw new Error(`Erreur récupération formateurs: ${errorFormateurs.message}`)
    }

    if (!formateurs || formateurs.length === 0) {
      return res.status(200).json({
        success: true,
        date: dateStr,
        message: 'Formateurs archivés, aucune notification',
        envoyes: 0
      })
    }

    // 3. Vérifier les doublons (messages anniversaire déjà envoyés aujourd'hui)
    const { data: messagesExistants, error: errorMessages } = await supabase
      .from('messages')
      .select('contenu')
      .eq('type', 'anniversaire')
      .eq('date', dateStr)

    if (errorMessages) {
      throw new Error(`Erreur vérification doublons: ${errorMessages.message}`)
    }

    const messagesDejaEnvoyes = new Set(
      (messagesExistants || []).map(m => m.contenu)
    )

    // 4. Envoyer les notifications
    const resultats = { envoyes: 0, erreurs: 0, details: [] }

    for (const formateur of formateurs) {
      const nomComplet = `${formateur.prenom} ${formateur.nom}`
      const contenu = `Aujourd'hui c'est l'anniversaire de ${nomComplet}`

      // Anti-doublon
      if (messagesDejaEnvoyes.has(contenu)) {
        resultats.details.push({ formateur: nomComplet, statut: 'déjà envoyé' })
        continue
      }

      try {
        // 4a. Message dans l'app
        const { error: errorInsert } = await supabase
          .from('messages')
          .insert({
            expediteur_id: null,
            destinataire_id: null,
            expediteur: 'Système ACLEF',
            destinataire: 'Coordination ACLEF',
            objet: `Anniversaire - ${nomComplet}`,
            contenu,
            type: 'anniversaire',
            lu: false,
            archive: false,
            date: dateStr,
            heure: aujourdhui.toTimeString().slice(0, 5)
          })

        if (errorInsert) {
          throw new Error(`Message: ${errorInsert.message}`)
        }

        // 4b. Email à aclef@aclef.fr
        await envoyerEmailAnniversaire(nomComplet)

        resultats.envoyes++
        resultats.details.push({ formateur: nomComplet, statut: 'envoyé' })

      } catch (err) {
        resultats.erreurs++
        resultats.details.push({ formateur: nomComplet, statut: 'erreur', message: err.message })
      }
    }

    return res.status(200).json({
      success: true,
      date: dateStr,
      ...resultats
    })

  } catch (error) {
    console.error('Erreur notifications anniversaires:', error)
    return res.status(500).json({ success: false, error: error.message })
  }
}

/**
 * Envoie un email d'anniversaire à aclef@aclef.fr
 */
async function envoyerEmailAnniversaire(nomComplet) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: SMTP_USER,
    to: 'aclef@aclef.fr',
    subject: `Message Automatique: Aujourd'hui c'est l'anniversaire de ${nomComplet}`,
    text: `Aujourd'hui c'est l'anniversaire de ${nomComplet}\n\nCe message est généré automatiquement par l'application ACLEF Planning.`,
  })
}

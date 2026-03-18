import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { envoyerSMS, genererMessageSMS } from '@/lib/smsService'
import nodemailer from 'nodemailer'

// Cron quotidien : envoie les SMS, avance les statuts, email recap secretaire
// Vercel Cron : GET /api/cron/suivi-post-formation chaque jour a 7h00
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' })
  }

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const actions = []
  const baseUrl = req.headers.origin || ('https://' + req.headers.host)

  // Charger tous les suivis non termines avec infos apprenant et questionnaires
  const { data: suivis, error } = await supabaseAdmin
    .from('suivi_post_formation')
    .select('*, apprenant:apprenant_id (prenom, nom, telephone), quest_sat:satisfaction_questionnaire_id (id, token, statut), quest_3m:suivi_3mois_questionnaire_id (id, token, statut), quest_6m:suivi_6mois_questionnaire_id (id, token, statut)')

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  for (const s of suivis) {
    const updates = {}
    const prenom = s.apprenant?.prenom || 'Apprenant'
    const nom = s.apprenant?.nom || ''
    const tel = s.apprenant?.telephone
    const nomComplet = prenom + ' ' + nom

    // --- SATISFACTION ---
    // Auto-detecter si questionnaire rempli
    if (s.quest_sat?.statut === 'complete' && s.satisfaction_statut !== 'repondu') {
      updates.satisfaction_statut = 'repondu'
      actions.push({ type: 'auto', msg: nomComplet + ' : satisfaction remplie' })
    }
    // Envoyer SMS satisfaction
    else if (s.satisfaction_statut === 'a_envoyer' && tel && s.quest_sat?.token) {
      const lien = baseUrl + '/questionnaire/' + s.quest_sat.token
      const msg = genererMessageSMS(prenom, lien, 'satisfaction')
      const result = await envoyerSMS(tel, msg)
      if (result.success) {
        updates.satisfaction_statut = 'envoye'
        updates.satisfaction_date_envoi = new Date().toISOString()
        actions.push({ type: 'sms_envoye', msg: nomComplet + ' : SMS satisfaction envoye' })
      } else {
        actions.push({ type: 'erreur', msg: nomComplet + ' : echec SMS satisfaction - ' + result.error })
      }
    }
    // Relance satisfaction apres 7 jours
    else if (s.satisfaction_statut === 'envoye') {
      const envoi = new Date(s.satisfaction_date_envoi || s.date_sortie)
      const jours = Math.floor((today - envoi) / (1000 * 60 * 60 * 24))
      if (jours >= 7 && tel && s.quest_sat?.token) {
        const lien = baseUrl + '/questionnaire/' + s.quest_sat.token
        const msg = genererMessageSMS(prenom, lien, 'relance_satisfaction')
        const result = await envoyerSMS(tel, msg)
        if (result.success) {
          updates.satisfaction_statut = 'relance_1'
          actions.push({ type: 'sms_envoye', msg: nomComplet + ' : SMS relance satisfaction envoye' })
        }
      }
    }
    // Escalade appeler apres 14 jours
    else if (s.satisfaction_statut === 'relance_1') {
      const envoi = new Date(s.satisfaction_date_envoi || s.date_sortie)
      const jours = Math.floor((today - envoi) / (1000 * 60 * 60 * 24))
      if (jours >= 14) {
        updates.satisfaction_statut = 'appeler'
        actions.push({ type: 'appeler', msg: nomComplet + ' : satisfaction sans reponse -> APPELER' })
      }
    }
    // Pas de telephone -> signaler a la secretaire
    else if (s.satisfaction_statut === 'a_envoyer' && !tel) {
      actions.push({ type: 'pas_de_tel', msg: nomComplet + ' : pas de numero de telephone ! Ajouter dans gestion apprenants' })
    }

    // --- SUIVI 3 MOIS ---
    if (s.quest_3m?.statut === 'complete' && s.suivi_3mois_statut !== 'repondu') {
      updates.suivi_3mois_statut = 'repondu'
      actions.push({ type: 'auto', msg: nomComplet + ' : suivi 3 mois rempli' })
    }
    else if (s.suivi_3mois_statut === 'a_venir' && s.suivi_3mois_date <= todayStr) {
      updates.suivi_3mois_statut = 'a_envoyer'
    }
    else if (s.suivi_3mois_statut === 'a_envoyer' && tel && s.quest_3m?.token) {
      const lien = baseUrl + '/questionnaire/' + s.quest_3m.token
      const msg = genererMessageSMS(prenom, lien, 'suivi_3mois')
      const result = await envoyerSMS(tel, msg)
      if (result.success) {
        updates.suivi_3mois_statut = 'envoye'
        actions.push({ type: 'sms_envoye', msg: nomComplet + ' : SMS suivi 3 mois envoye' })
      }
    }
    else if (s.suivi_3mois_statut === 'envoye') {
      const jours = Math.floor((today - new Date(s.suivi_3mois_date)) / (1000 * 60 * 60 * 24))
      if (jours >= 14) {
        updates.suivi_3mois_statut = 'appeler'
        actions.push({ type: 'appeler', msg: nomComplet + ' : suivi 3 mois sans reponse -> APPELER' })
      } else if (jours >= 7 && tel && s.quest_3m?.token) {
        const lien = baseUrl + '/questionnaire/' + s.quest_3m.token
        const msg = genererMessageSMS(prenom, lien, 'relance')
        const result = await envoyerSMS(tel, msg)
        if (result.success) {
          updates.suivi_3mois_statut = 'relance'
          actions.push({ type: 'sms_envoye', msg: nomComplet + ' : SMS relance 3 mois envoye' })
        }
      }
    }
    else if (s.suivi_3mois_statut === 'relance') {
      const jours = Math.floor((today - new Date(s.suivi_3mois_date)) / (1000 * 60 * 60 * 24))
      if (jours >= 14) {
        updates.suivi_3mois_statut = 'appeler'
        actions.push({ type: 'appeler', msg: nomComplet + ' : relance 3 mois sans reponse -> APPELER' })
      }
    }

    // --- SUIVI 6 MOIS ---
    if (s.quest_6m?.statut === 'complete' && s.suivi_6mois_statut !== 'repondu') {
      updates.suivi_6mois_statut = 'repondu'
      actions.push({ type: 'auto', msg: nomComplet + ' : suivi 6 mois rempli' })
    }
    else if (s.suivi_6mois_statut === 'a_venir' && s.suivi_6mois_date <= todayStr) {
      updates.suivi_6mois_statut = 'a_envoyer'
    }
    else if (s.suivi_6mois_statut === 'a_envoyer' && tel && s.quest_6m?.token) {
      const lien = baseUrl + '/questionnaire/' + s.quest_6m.token
      const msg = genererMessageSMS(prenom, lien, 'suivi_6mois')
      const result = await envoyerSMS(tel, msg)
      if (result.success) {
        updates.suivi_6mois_statut = 'envoye'
        actions.push({ type: 'sms_envoye', msg: nomComplet + ' : SMS suivi 6 mois envoye' })
      }
    }
    else if (s.suivi_6mois_statut === 'envoye') {
      const jours = Math.floor((today - new Date(s.suivi_6mois_date)) / (1000 * 60 * 60 * 24))
      if (jours >= 14) {
        updates.suivi_6mois_statut = 'appeler'
        actions.push({ type: 'appeler', msg: nomComplet + ' : suivi 6 mois sans reponse -> APPELER' })
      } else if (jours >= 7 && tel && s.quest_6m?.token) {
        const lien = baseUrl + '/questionnaire/' + s.quest_6m.token
        const msg = genererMessageSMS(prenom, lien, 'relance')
        const result = await envoyerSMS(tel, msg)
        if (result.success) {
          updates.suivi_6mois_statut = 'relance'
          actions.push({ type: 'sms_envoye', msg: nomComplet + ' : SMS relance 6 mois envoye' })
        }
      }
    }
    else if (s.suivi_6mois_statut === 'relance') {
      const jours = Math.floor((today - new Date(s.suivi_6mois_date)) / (1000 * 60 * 60 * 24))
      if (jours >= 14) {
        updates.suivi_6mois_statut = 'appeler'
        actions.push({ type: 'appeler', msg: nomComplet + ' : relance 6 mois sans reponse -> APPELER' })
      }
    }

    // Appliquer les mises a jour
    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      await supabaseAdmin.from('suivi_post_formation').update(updates).eq('id', s.id)
    }
  }

  // Email recap a la secretaire s'il y a des actions
  const actionsImportantes = actions.filter(a => a.type !== 'auto')
  if (actionsImportantes.length > 0) {
    await envoyerEmailRecap(actionsImportantes)
  }

  return res.status(200).json({
    success: true,
    date: todayStr,
    actions_effectuees: actions.length,
    details: actions
  })
}

async function envoyerEmailRecap(actions) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) return

  let texte = 'SUIVI POST-FORMATION - Rapport du jour\n'
  texte += '='.repeat(50) + '\n\n'

  const appeler = actions.filter(a => a.type === 'appeler')
  const smsEnvoyes = actions.filter(a => a.type === 'sms_envoye')
  const pasDeTel = actions.filter(a => a.type === 'pas_de_tel')
  const erreurs = actions.filter(a => a.type === 'erreur')

  if (appeler.length > 0) {
    texte += 'APPELER (urgent) :\n'
    appeler.forEach(a => { texte += '  - ' + a.msg + '\n' })
    texte += '\n'
  }
  if (pasDeTel.length > 0) {
    texte += 'NUMERO MANQUANT :\n'
    pasDeTel.forEach(a => { texte += '  - ' + a.msg + '\n' })
    texte += '\n'
  }
  if (smsEnvoyes.length > 0) {
    texte += 'SMS envoyes automatiquement :\n'
    smsEnvoyes.forEach(a => { texte += '  - ' + a.msg + '\n' })
    texte += '\n'
  }
  if (erreurs.length > 0) {
    texte += 'Erreurs :\n'
    erreurs.forEach(a => { texte += '  - ' + a.msg + '\n' })
    texte += '\n'
  }

  texte += '\nConsultez le dashboard Suivi Post-Formation pour plus de details.'

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  })

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: NOTIFY_EMAIL,
      subject: appeler.length > 0
        ? 'URGENT - ' + appeler.length + ' apprenant(s) a appeler'
        : 'Suivi post-formation - ' + actions.length + ' action(s)',
      text: texte
    })
  } catch (e) {
    // Ne pas bloquer le cron
  }
}

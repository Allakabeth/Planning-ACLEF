import { supabaseAdmin } from '@/lib/supabaseAdmin'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' })
  }

  const { apprenant_id, parcours_id, date_sortie } = req.body

  if (!apprenant_id || !date_sortie) {
    return res.status(400).json({ error: 'apprenant_id et date_sortie requis' })
  }

  // Generer un token unique pour le questionnaire de satisfaction
  const tokenSatisfaction = crypto.randomUUID()

  // Creer le questionnaire de satisfaction
  const { data: questSatisfaction, error: errQS } = await supabaseAdmin
    .from('questionnaires')
    .insert({
      type: 'satisfaction',
      apprenant_id,
      parcours_id: parcours_id || null,
      token: tokenSatisfaction,
      statut: 'en_attente'
    })
    .select('id')
    .single()

  if (errQS) {
    return res.status(500).json({ error: 'Erreur creation questionnaire satisfaction', details: errQS.message })
  }

  // Generer tokens pour les questionnaires de suivi 3 et 6 mois
  const token3mois = crypto.randomUUID()
  const token6mois = crypto.randomUUID()

  // Creer les questionnaires de suivi
  const { data: quest3m, error: errQ3 } = await supabaseAdmin
    .from('questionnaires')
    .insert({
      type: 'suivi_3mois',
      apprenant_id,
      parcours_id: parcours_id || null,
      token: token3mois,
      statut: 'en_attente'
    })
    .select('id')
    .single()

  if (errQ3) {
    return res.status(500).json({ error: 'Erreur creation questionnaire 3 mois', details: errQ3.message })
  }

  const { data: quest6m, error: errQ6 } = await supabaseAdmin
    .from('questionnaires')
    .insert({
      type: 'suivi_6mois',
      apprenant_id,
      parcours_id: parcours_id || null,
      token: token6mois,
      statut: 'en_attente'
    })
    .select('id')
    .single()

  if (errQ6) {
    return res.status(500).json({ error: 'Erreur creation questionnaire 6 mois', details: errQ6.message })
  }

  // Calculer les dates de suivi
  const sortie = new Date(date_sortie)
  const date3mois = new Date(sortie)
  date3mois.setMonth(date3mois.getMonth() + 3)
  const date6mois = new Date(sortie)
  date6mois.setMonth(date6mois.getMonth() + 6)

  // Creer l'entree suivi post-formation
  const { data: suivi, error: errSuivi } = await supabaseAdmin
    .from('suivi_post_formation')
    .insert({
      apprenant_id,
      parcours_id: parcours_id || null,
      date_sortie,
      suivi_3mois_date: date3mois.toISOString().split('T')[0],
      suivi_3mois_statut: 'a_faire',
      suivi_3mois_questionnaire_id: quest3m.id,
      suivi_6mois_date: date6mois.toISOString().split('T')[0],
      suivi_6mois_statut: 'a_faire',
      suivi_6mois_questionnaire_id: quest6m.id
    })
    .select()
    .single()

  if (errSuivi) {
    return res.status(500).json({ error: 'Erreur creation suivi', details: errSuivi.message })
  }

  // Construire les liens
  const baseUrl = req.headers.origin || ('https://' + req.headers.host)

  return res.status(200).json({
    success: true,
    liens: {
      satisfaction: baseUrl + '/questionnaire/' + tokenSatisfaction,
      suivi_3mois: baseUrl + '/questionnaire/' + token3mois,
      suivi_6mois: baseUrl + '/questionnaire/' + token6mois
    },
    suivi
  })
}

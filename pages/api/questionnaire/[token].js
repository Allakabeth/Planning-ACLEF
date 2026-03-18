import { supabaseAdmin } from '@/lib/supabaseAdmin'

export default async function handler(req, res) {
  const { token } = req.query

  if (!token) {
    return res.status(400).json({ error: 'Token manquant' })
  }

  // GET - Charger le questionnaire
  if (req.method === 'GET') {
    const { data: questionnaire, error } = await supabaseAdmin
      .from('questionnaires')
      .select('id, type, statut, apprenant_id, reponses')
      .eq('token', token)
      .single()

    if (error || !questionnaire) {
      return res.status(404).json({ error: 'Questionnaire introuvable' })
    }

    if (questionnaire.statut === 'complete') {
      return res.status(200).json({ questionnaire, deja_repondu: true })
    }

    if (questionnaire.statut === 'expire') {
      return res.status(410).json({ error: 'Ce questionnaire a expire' })
    }

    // Recuperer le prenom de l'apprenant pour personnaliser
    const { data: apprenant } = await supabaseAdmin
      .from('users')
      .select('prenom')
      .eq('id', questionnaire.apprenant_id)
      .single()

    return res.status(200).json({
      questionnaire: {
        id: questionnaire.id,
        type: questionnaire.type,
        statut: questionnaire.statut
      },
      prenom: apprenant?.prenom || '',
      deja_repondu: false
    })
  }

  // POST - Enregistrer les reponses
  if (req.method === 'POST') {
    const { reponses } = req.body

    if (!reponses) {
      return res.status(400).json({ error: 'Reponses manquantes' })
    }

    // Verifier que le questionnaire existe et n'est pas deja complete
    const { data: questionnaire, error: fetchError } = await supabaseAdmin
      .from('questionnaires')
      .select('id, statut, type')
      .eq('token', token)
      .single()

    if (fetchError || !questionnaire) {
      return res.status(404).json({ error: 'Questionnaire introuvable' })
    }

    if (questionnaire.statut === 'complete') {
      return res.status(409).json({ error: 'Questionnaire deja rempli' })
    }

    // Enregistrer les reponses
    const { error: updateError } = await supabaseAdmin
      .from('questionnaires')
      .update({
        reponses,
        statut: 'complete',
        date_reponse: new Date().toISOString()
      })
      .eq('id', questionnaire.id)

    if (updateError) {
      return res.status(500).json({ error: 'Erreur lors de l\'enregistrement' })
    }

    // Mettre a jour le suivi post-formation si c'est un questionnaire de suivi
    if (questionnaire.type === 'suivi_3mois') {
      await supabaseAdmin
        .from('suivi_post_formation')
        .update({ suivi_3mois_statut: 'repondu' })
        .eq('suivi_3mois_questionnaire_id', questionnaire.id)
    } else if (questionnaire.type === 'suivi_6mois') {
      await supabaseAdmin
        .from('suivi_post_formation')
        .update({ suivi_6mois_statut: 'repondu' })
        .eq('suivi_6mois_questionnaire_id', questionnaire.id)
    }

    return res.status(200).json({ success: true })
  }

  return res.status(405).json({ error: 'Methode non autorisee' })
}

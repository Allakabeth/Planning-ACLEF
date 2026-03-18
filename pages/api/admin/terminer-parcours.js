import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import crypto from 'crypto'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' })
  }

  try {
    const { apprenant_id } = req.body

    if (!apprenant_id) {
      return res.status(400).json({ error: 'apprenant_id requis' })
    }

    // 1. Mettre statut_formation a termine
    const { error: errorUser } = await supabaseAdmin
      .from('users')
      .update({ statut_formation: 'termine' })
      .eq('id', apprenant_id)

    if (errorUser) {
      throw new Error('Erreur mise a jour statut: ' + errorUser.message)
    }

    // 2. Desactiver tous les creneaux planning_apprenants
    const { error: errorPlanning } = await supabaseAdmin
      .from('planning_apprenants')
      .update({ actif: false })
      .eq('apprenant_id', apprenant_id)

    if (errorPlanning) {
      throw new Error('Erreur desactivation planning: ' + errorPlanning.message)
    }

    // 3. Creer le suivi post-formation (questionnaires + rappels 3/6 mois)
    let liensSuivi = null
    try {
      const dateSortie = new Date().toISOString().split('T')[0]

      // Recuperer le parcours actif
      const { data: parcoursActif } = await supabaseAdmin
        .from('parcours_apprenants')
        .select('id')
        .eq('apprenant_id', apprenant_id)
        .eq('actif', true)
        .single()

      const parcours_id = parcoursActif?.id || null

      // Generer les tokens pour les 3 questionnaires
      const tokenSatisfaction = crypto.randomUUID()
      const token3mois = crypto.randomUUID()
      const token6mois = crypto.randomUUID()

      // Creer les 3 questionnaires
      const questionnairesACreer = [
        { type: 'satisfaction', token: tokenSatisfaction },
        { type: 'suivi_3mois', token: token3mois },
        { type: 'suivi_6mois', token: token6mois }
      ]

      const questIds = {}
      for (const q of questionnairesACreer) {
        const { data, error } = await supabaseAdmin
          .from('questionnaires')
          .insert({
            type: q.type,
            apprenant_id,
            parcours_id,
            token: q.token,
            statut: 'en_attente'
          })
          .select('id')
          .single()
        if (!error && data) questIds[q.type] = data.id
      }

      // Calculer dates de suivi
      const sortie = new Date(dateSortie)
      const date3m = new Date(sortie)
      date3m.setMonth(date3m.getMonth() + 3)
      const date6m = new Date(sortie)
      date6m.setMonth(date6m.getMonth() + 6)

      // Creer le suivi post-formation
      await supabaseAdmin
        .from('suivi_post_formation')
        .insert({
          apprenant_id,
          parcours_id,
          date_sortie: dateSortie,
          suivi_3mois_date: date3m.toISOString().split('T')[0],
          suivi_3mois_statut: 'a_faire',
          suivi_3mois_questionnaire_id: questIds['suivi_3mois'] || null,
          suivi_6mois_date: date6m.toISOString().split('T')[0],
          suivi_6mois_statut: 'a_faire',
          suivi_6mois_questionnaire_id: questIds['suivi_6mois'] || null
        })

      const baseUrl = req.headers.origin || ('https://' + req.headers.host)
      liensSuivi = {
        satisfaction: baseUrl + '/questionnaire/' + tokenSatisfaction,
        suivi_3mois: baseUrl + '/questionnaire/' + token3mois,
        suivi_6mois: baseUrl + '/questionnaire/' + token6mois
      }
    } catch (errSuivi) {
      // Le suivi est un bonus, ne pas bloquer la terminaison du parcours
    }

    return res.status(200).json({
      success: true,
      message: 'Parcours termine avec succes',
      liens_suivi: liensSuivi
    })

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

import { supabaseAdmin } from '../../../lib/supabaseAdmin'

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

    return res.status(200).json({
      success: true,
      message: 'Parcours termine avec succes'
    })

  } catch (error) {
    console.error('Erreur terminer-parcours:', error)
    return res.status(500).json({
      success: false,
      error: error.message
    })
  }
}

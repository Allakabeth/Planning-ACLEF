// Service d'envoi SMS via httpSMS (telephone Android comme passerelle)

export async function envoyerSMS(destinataire, message) {
  const apiKey = process.env.HTTPSMS_API_KEY
  const from = process.env.HTTPSMS_FROM

  if (!apiKey || !from) {
    return { success: false, error: 'Configuration httpSMS manquante' }
  }

  // Normaliser le numero (06... -> +336...)
  let to = destinataire.replace(/\s/g, '')
  if (to.startsWith('0')) {
    to = '+33' + to.substring(1)
  } else if (!to.startsWith('+')) {
    to = '+' + to
  }

  try {
    const response = await fetch('https://api.httpsms.com/v1/messages/send', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ from, to, content: message })
    })

    const result = await response.json()

    if (result.status === 'success') {
      return { success: true, messageId: result.data?.id }
    }
    return { success: false, error: result.message || 'Erreur inconnue' }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

// Messages pre-formules pour chaque etape
export function genererMessageSMS(prenom, lien, type) {
  switch (type) {
    case 'satisfaction':
      return 'Bonjour ' + prenom + ' ! L\'ACLEF aimerait avoir votre avis sur la formation. Cliquez ici (2 min) : ' + lien
    case 'relance_satisfaction':
      return 'Bonjour ' + prenom + ' ! Vous n\'avez pas encore donne votre avis sur la formation ACLEF. Ca prend 2 min : ' + lien
    case 'suivi_3mois':
      return 'Bonjour ' + prenom + ' ! Ca fait 3 mois que vous avez quitte l\'ACLEF. Comment allez-vous ? Repondez ici (2 min) : ' + lien
    case 'suivi_6mois':
      return 'Bonjour ' + prenom + ' ! Ca fait 6 mois depuis votre formation ACLEF. Donnez-nous de vos nouvelles (2 min) : ' + lien
    case 'relance':
      return 'Bonjour ' + prenom + ' ! L\'ACLEF aimerait de vos nouvelles. Repondez ici (2 min) : ' + lien
    default:
      return 'Bonjour ' + prenom + ' ! Message de l\'ACLEF : ' + lien
  }
}

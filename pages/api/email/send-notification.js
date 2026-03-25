import nodemailer from 'nodemailer';

function normaliserIdentifiant(prenom, nom) {
  return (nom + '-' + prenom)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9-]/g, '');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode non autorisee' });
  }

  const { formateurNom, formateurPrenom, typeNotification, semaine, details } = req.body;

  if (!formateurNom || !formateurPrenom) {
    return res.status(400).json({ error: 'formateurNom et formateurPrenom requis' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL, FORMATEURS_EMAILS } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS || !NOTIFY_EMAIL) {
    return res.status(500).json({ error: 'Configuration SMTP manquante' });
  }

  const identifiant = normaliserIdentifiant(formateurPrenom, formateurNom);

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  // Chercher l'email direct du formateur dans le mapping
  let destinataire = NOTIFY_EMAIL;
  try {
    const mapping = FORMATEURS_EMAILS ? JSON.parse(FORMATEURS_EMAILS) : {};
    if (mapping[identifiant]) {
      destinataire = mapping[identifiant];
    }
  } catch (e) {
    // Si le JSON est invalide, on continue avec NOTIFY_EMAIL
  }

  try {
    await transporter.sendMail({
      from: '"ACLEF Planning" <' + SMTP_USER + '>',
      to: destinataire,
      subject: 'NOTIF-' + identifiant,
      text: typeNotification === 'validation'
        ? `Le planning de la semaine ${semaine || ''} a été validé.\n\n${details || 'Connectez-vous pour le consulter.'}\n\nNe répondez pas à ce mail.`
        : typeNotification === 'modification'
        ? `Une modification a été effectuée sur votre planning de la semaine ${semaine || ''} :\n\n${details || 'Connectez-vous pour la consulter.'}\n\nNe répondez pas à ce mail.`
        : `Une modification qui vous concerne a été effectuée sur votre planning de l'ACLEF.\n\n${details || 'Connectez-vous pour la consulter.'}\n\nNe répondez pas à ce mail.`,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Echec envoi email', details: error.message });
  }
}

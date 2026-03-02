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

  const { formateurNom, formateurPrenom } = req.body;

  if (!formateurNom || !formateurPrenom) {
    return res.status(400).json({ error: 'formateurNom et formateurPrenom requis' });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, NOTIFY_EMAIL } = process.env;

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

  try {
    await transporter.sendMail({
      from: SMTP_USER,
      to: NOTIFY_EMAIL,
      subject: 'NOTIF-' + identifiant,
      text: "Une modification qui vous concerne a ete effectuee sur votre planning de l'ACLEF. Connectez-vous pour la consulter.",
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Echec envoi email', details: error.message });
  }
}

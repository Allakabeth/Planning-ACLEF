/**
 * API Route : Génération de feuille de présence OPCO au format PDF
 * POST /api/emargement/generate-opco-pdf
 */

import PDFDocument from 'pdfkit';
import { getEmargementDataOPCO } from '@/lib/emargementUtils';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { date, jour, creneau, lieu_id, lieu_nom } = req.body;

    if (!date || !jour || !creneau || !lieu_id) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    const data = await getEmargementDataOPCO({ date, jour, creneau, lieu_id, lieu_nom });

    if (data.apprenants.length === 0) {
      return res.status(404).json({ error: 'Aucun apprenant OPCO prévu pour ce créneau' });
    }

    const buffer = await createEmargementOPCOPDF(data);
    const fileName = `Emargement_OPCO_${date}_${creneau}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Erreur génération PDF OPCO:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du PDF OPCO', details: error.message });
  }
}

async function createEmargementOPCOPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'portrait', // 595 x 842 points
        margins: { top: 15, bottom: 15, left: 20, right: 20 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const projectRoot = process.cwd();
      const pageWidth = 595;
      const pageHeight = 842;

      // ========================================
      // LOGOS EN HAUT (hauteur fixe, proportions conservées)
      // ========================================
      const yPos = 15;
      const logoHeight = 45; // Hauteur réduite pour format portrait

      // Ordre exact du modèle : ACLEF Châtellerault, ACLEF Formation, CORAPLIS, Label Académique
      // Positions x réparties équitablement sur la largeur (595pt)
      const logosConfig = [
        { path: path.join(projectRoot, 'public', 'a.png'), x: 25 },    // ACLEF Châtellerault
        { path: path.join(projectRoot, 'public', 'b.png'), x: 110 },   // ACLEF Formation (texte long)
        { path: path.join(projectRoot, 'public', 'c.png'), x: 320 },   // CORAPLIS
        { path: path.join(projectRoot, 'public', 'f.png'), x: 430 }    // Label Académique (Nouvelle-Aquitaine)
      ];

      logosConfig.forEach(logo => {
        if (fs.existsSync(logo.path)) {
          doc.image(logo.path, logo.x, yPos, { height: logoHeight });
        }
      });

      let currentY = yPos + logoHeight + 10; // 75

      // ========================================
      // DATE et HORAIRES (compact)
      // ========================================
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('DATE :', 30, currentY);
      doc.font('Helvetica').text(formatDateFr(data.date), 80, currentY);

      doc.font('Helvetica-Bold').text('HORAIRES :', 400, currentY);
      doc.font('Helvetica').text(data.horaires, 480, currentY);

      currentY += 18;

      // ========================================
      // FORMATEUR et SIGNATURE
      // ========================================
      const nomFormateur = data.encadrants.length > 0
        ? `${data.encadrants[0].prenom} ${data.encadrants[0].nom}`
        : '';

      doc.font('Helvetica-Bold').text('FORMATEUR :', 30, currentY);
      doc.font('Helvetica').text(nomFormateur, 120, currentY);

      doc.font('Helvetica-Bold').text('SIGNATURE :', 400, currentY);

      currentY += 20;

      // ========================================
      // TITRE
      // ========================================
      doc.fontSize(14).font('Helvetica-Bold')
        .text('FORMATION COMPETENCES CLES', 30, currentY, { align: 'center', width: 535 });

      currentY += 20;

      doc.fontSize(11).font('Helvetica-Bold')
        .text('(formation financée par les entreprises ou leur OPCO)', 30, currentY, { align: 'center', width: 535 });

      currentY += 25;

      // ========================================
      // TABLEAU DES APPRENANTS
      // ========================================
      const colNomWidth = 320;
      const colSignatureWidth = 235;
      const rowHeight = 35;

      // En-têtes
      doc.rect(30, currentY, colNomWidth, 20).stroke('#000000');
      doc.rect(30 + colNomWidth, currentY, colSignatureWidth, 20).stroke('#000000');

      doc.fontSize(11).font('Helvetica-Bold');
      doc.text('NOM PRENOM', 35, currentY + 5, { width: colNomWidth - 10, align: 'center' });
      doc.text('SIGNATURE', 35 + colNomWidth, currentY + 5, { width: colSignatureWidth - 10, align: 'center' });

      currentY += 20;

      // Lignes des apprenants + 2 lignes vides
      doc.font('Helvetica');
      const totalLignes = data.apprenants.length + 2;

      for (let i = 0; i < totalLignes; i++) {
        const apprenant = i < data.apprenants.length ? data.apprenants[i] : null;

        // Bordures
        doc.rect(30, currentY, colNomWidth, rowHeight).stroke('#000000');
        doc.rect(30 + colNomWidth, currentY, colSignatureWidth, rowHeight).stroke('#000000');

        if (apprenant) {
          // NOM PRENOM (en gras)
          doc.font('Helvetica-Bold').fontSize(10);
          doc.text(`${apprenant.nom.toUpperCase()} ${apprenant.prenom}`, 35, currentY + 4, {
            width: colNomWidth - 10,
            continued: false
          });

          // Période de formation (en italique, plus petit)
          if (apprenant.periode_formation) {
            doc.font('Helvetica-Oblique').fontSize(8);
            doc.text(apprenant.periode_formation, 35, currentY + 17, {
              width: colNomWidth - 10,
              lineGap: 1
            });
          }
        }

        currentY += rowHeight;
      }

      // ========================================
      // LOGOS DU BAS (d.jpg - 6 logos en bas de page)
      // ========================================
      const logoDPath = path.join(projectRoot, 'public', 'd.jpg');
      if (fs.existsSync(logoDPath)) {
        // Positionner en bas de page (hauteur A4 portrait = 842 points)
        const bottomY = pageHeight - 100; // 100 points du bas
        doc.image(logoDPath, 30, bottomY, { width: 535 });
      }

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

function formatDateFr(dateStr) {
  if (!dateStr) return '';
  const [annee, mois, jour] = dateStr.split('-');
  return `${jour}/${mois}/${annee}`;
}

/**
 * API Route : Génération de feuille d'émargement HSP au format PDF
 * POST /api/emargement/generate-hsp-pdf
 *
 * Reproduit exactement le modèle "EMARGEMENT PERMANENCE.pdf"
 */

import PDFDocument from 'pdfkit';
import { getEmargementData } from '@/lib/emargementUtils';
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

    const data = await getEmargementData({ date, jour, creneau, lieu_id, lieu_nom });

    if (data.apprenants.length === 0) {
      return res.status(404).json({ error: 'Aucun apprenant HSP prévu pour ce créneau' });
    }

    const buffer = await createEmargementHSPPDF(data);
    const fileName = `Emargement_HSP_${data.lieu.initiale}_${date}_${creneau}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Erreur génération PDF HSP:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du PDF HSP', details: error.message });
  }
}

async function createEmargementHSPPDF(data) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape', // 842 x 595 points
        margins: { top: 15, bottom: 15, left: 20, right: 20 }
      });

      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const projectRoot = process.cwd();
      const pageWidth = 842;
      const pageHeight = 595;

      // ========================================
      // LOGOS EN HAUT (hauteur fixe, proportions conservées)
      // ========================================
      const yPos = 15;
      const logoHeight = 35; // Hauteur réduite pour éviter chevauchements

      // Espacements calculés manuellement pour chaque logo
      const logosConfig = [
        { path: path.join(projectRoot, 'logo-1.png'), x: 30 },
        { path: path.join(projectRoot, 'logo-2.png'), x: 120 },
        { path: path.join(projectRoot, 'logo-3.png'), x: 240 },
        { path: path.join(projectRoot, 'logo-4.jpeg'), x: 320 }
      ];

      logosConfig.forEach(logo => {
        if (fs.existsSync(logo.path)) {
          doc.image(logo.path, logo.x, yPos, { height: logoHeight });
        }
      });

      // ANNEXE 4.1 (en haut à droite)
      doc.fontSize(10).font('Helvetica').fillColor('#000000')
        .text('ANNEXE 4.1', 750, 20, { width: 70, align: 'center' });

      // ========================================
      // TITRE (avec STAGIAIRES EN CENTRE souligné)
      // ========================================
      doc.fontSize(12).font('Helvetica-Bold').fillColor('#000000')
        .text('FEUILLE D\'EMARGEMENT ', 30, 65, { continued: true })
        .text('STAGIAIRES EN CENTRE', { underline: true, continued: true })
        .text(' - HSP Socle 2025-2027');

      // ========================================
      // RAPPEL (fond beige #FCE4D6, texte rouge)
      // ========================================
      const rappelY = 90;
      const rappelH = 60;

      // Cadre gauche "RAPPEL"
      doc.rect(30, rappelY, 50, rappelH).stroke('#000000');

      // Cadre principal avec fond beige
      doc.rect(80, rappelY, 740, rappelH).fillAndStroke('#FCE4D6', '#000000');

      // Texte "RAPPEL" en rouge
      doc.fillColor('#C00000').fontSize(9).font('Helvetica-Bold')
        .text('RAPPEL', 35, rappelY + 22, { width: 40, align: 'center' });

      // Contenu du rappel en rouge
      const rappelText = 'Les informations saisies doivent être lisibles et compréhensibles sous peine de rejet de la feuille.\n' +
        'Article 10.3 "la programmation annuelle des actions de formation" de la Convention cadre de mandat\n' +
        '".../... Les itinéraires se traduisent par des sessions (dans les outils de gestion) accessibles en entrées séquencées et donnant lieu à la création de points d\'entrées avec des effectifs ' +
        'associés. Un point d\'entrée ne peut pas démarrer sans un minimum de 2 usagers pour l\'itinéraire 1 et sans un minimum de 4 usagers pour les itinéraires 2, 3 et 4. .../..."';

      doc.fillColor('#C00000').fontSize(7.5).font('Helvetica')
        .text(rappelText, 85, rappelY + 4, { width: 730, lineGap: 1 });

      // COORDONNÉES ACLEF
      doc.fillColor('#000000').fontSize(8).font('Helvetica')
        .text('ACLEF - 12 avenue Camille Pagé 86100 Châtellerault - Tél: 05.49.93.17.06 - mail: aclef@aclef.fr', 30, rappelY + rappelH + 3, { width: 790 });

      let currentY = rappelY + rappelH + 18;

      // ========================================
      // NOM & PRENOM DU FORMATEUR + SIGNATURE
      // ========================================
      const nomFormateur = data.encadrants.length > 0 ? `${data.encadrants[0].prenom} ${data.encadrants[0].nom}` : '';

      doc.rect(30, currentY, 150, 18).stroke('#000000');
      doc.rect(180, currentY, 230, 18).stroke('#000000');
      doc.rect(410, currentY, 410, 18).stroke('#000000');

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('NOM & PRENOM DU FORMATEUR :', 35, currentY + 5);
      doc.font('Helvetica')
        .text(nomFormateur, 185, currentY + 5);
      doc.font('Helvetica-Bold')
        .text('SIGNATURE du formateur', 415, currentY + 5);

      currentY += 22;

      // ========================================
      // ITINÉRAIRE / N° LOT / N° SESSION
      // ========================================
      doc.rect(30, currentY, 380, 18).stroke('#000000');
      doc.rect(410, currentY, 60, 18).stroke('#000000');
      doc.rect(470, currentY, 50, 18).stroke('#000000');
      doc.rect(520, currentY, 120, 18).stroke('#000000');
      doc.rect(640, currentY, 180, 18).stroke('#000000');

      doc.fontSize(9).font('Helvetica-Bold')
        .text('Itinéraire : ', 35, currentY + 5, { continued: true });
      doc.font('Helvetica')
        .text('1');
      doc.font('Helvetica-Bold')
        .text('N° lot :', 415, currentY + 5);
      doc.font('Helvetica')
        .text('24', 475, currentY + 5, { width: 40, align: 'center' });
      doc.font('Helvetica-Bold')
        .text('N° Session EOS :', 525, currentY + 5);
      doc.font('Helvetica')
        .text(data.lieu.numero_session || '', 645, currentY + 5, { width: 170, align: 'center' });

      currentY += 22;

      // ========================================
      // SITE (fond gris comme dans le modèle)
      // ========================================
      doc.rect(30, currentY, 50, 18).stroke('#000000');
      doc.rect(80, currentY, 740, 18).fillAndStroke('#D9D9D9', '#000000');

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000')
        .text('SITE :', 35, currentY + 5);
      doc.font('Helvetica')
        .text(data.lieu.nom, 85, currentY + 5);

      currentY += 22;

      // ========================================
      // HORAIRES MATIN / APRES-MIDI
      // ========================================
      doc.rect(30, currentY, 120, 18).stroke('#000000');
      doc.rect(150, currentY, 280, 18).stroke('#000000');
      doc.rect(430, currentY, 100, 18).stroke('#000000');
      doc.rect(530, currentY, 290, 18).stroke('#000000');

      doc.fontSize(9).font('Helvetica-Bold')
        .text('HORAIRES MATIN :', 35, currentY + 5);
      doc.font('Helvetica')
        .text(data.creneau === 'M' ? '9h-12h' : '', 155, currentY + 5);
      doc.font('Helvetica-Bold')
        .text('APRES-MIDI:', 435, currentY + 5);
      doc.font('Helvetica')
        .text(data.creneau === 'AM' ? '14h-17h' : '', 535, currentY + 5);

      currentY += 22;

      // ========================================
      // DATE ET N° SEMAINE
      // ========================================
      doc.rect(30, currentY, 200, 18).stroke('#000000');
      doc.rect(230, currentY, 200, 18).stroke('#000000');
      doc.rect(430, currentY, 390, 18).stroke('#000000');

      doc.fontSize(9).font('Helvetica-Bold')
        .text('Date du jour de formation (JJ/MM/AAAA)', 35, currentY + 5);
      doc.font('Helvetica')
        .text(formatDateFr(data.date), 235, currentY + 5);
      doc.font('Helvetica-Bold')
        .text('N° de Semaine : ', 435, currentY + 5, { continued: true });
      doc.font('Helvetica')
        .text(data.numeroSemaine.toString());

      currentY += 22;

      // ========================================
      // TABLEAU DES APPRENANTS
      // ========================================
      // Colonnes : NOM | PRENOM | Emargement (Matin + Après-midi) | Commentaires
      const colNomWidth = 150;
      const colPrenomWidth = 120;
      const colMatinWidth = 120;  // Plus large pour signatures
      const colAMWidth = 120;      // Plus large pour signatures
      const colCommentairesWidth = 280;  // Réduit

      const tableStartX = 30;

      // ========================================
      // EN-TÊTE LIGNE 1 (fond gris)
      // ========================================
      doc.rect(tableStartX, currentY, colNomWidth, 14).fillAndStroke('#D9D9D9', '#000000');
      doc.rect(tableStartX + colNomWidth, currentY, colPrenomWidth, 14).fillAndStroke('#D9D9D9', '#000000');
      doc.rect(tableStartX + colNomWidth + colPrenomWidth, currentY, colMatinWidth + colAMWidth, 14).fillAndStroke('#D9D9D9', '#000000');
      doc.rect(tableStartX + colNomWidth + colPrenomWidth + colMatinWidth + colAMWidth, currentY, colCommentairesWidth, 28).fillAndStroke('#D9D9D9', '#000000');

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
      doc.text('NOM', tableStartX + 5, currentY + 4, { width: colNomWidth - 10, align: 'center' });
      doc.text('PRENOM', tableStartX + colNomWidth + 5, currentY + 4, { width: colPrenomWidth - 10, align: 'center' });
      doc.text('Emargement', tableStartX + colNomWidth + colPrenomWidth + 5, currentY + 4, { width: colMatinWidth + colAMWidth - 10, align: 'center' });
      doc.text('Commentaires / remarques', tableStartX + colNomWidth + colPrenomWidth + colMatinWidth + colAMWidth + 5, currentY + 4, { width: colCommentairesWidth - 10, align: 'center' });
      doc.text('éventuels', tableStartX + colNomWidth + colPrenomWidth + colMatinWidth + colAMWidth + 5, currentY + 14, { width: colCommentairesWidth - 10, align: 'center' });

      currentY += 14;

      // ========================================
      // EN-TÊTE LIGNE 2 : Matin | Après-midi (fond gris)
      // ========================================
      const isMatinCreneau = data.creneau === 'M';
      const isAMCreneau = data.creneau === 'AM';

      // Colonne Matin (griser si c'est après-midi)
      if (isAMCreneau) {
        doc.rect(tableStartX + colNomWidth + colPrenomWidth, currentY, colMatinWidth, 14).fillAndStroke('#A6A6A6', '#000000');
      } else {
        doc.rect(tableStartX + colNomWidth + colPrenomWidth, currentY, colMatinWidth, 14).fillAndStroke('#D9D9D9', '#000000');
      }

      // Colonne Après-midi (griser si c'est matin)
      if (isMatinCreneau) {
        doc.rect(tableStartX + colNomWidth + colPrenomWidth + colMatinWidth, currentY, colAMWidth, 14).fillAndStroke('#A6A6A6', '#000000');
      } else {
        doc.rect(tableStartX + colNomWidth + colPrenomWidth + colMatinWidth, currentY, colAMWidth, 14).fillAndStroke('#D9D9D9', '#000000');
      }

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#000000');
      doc.text('Matin', tableStartX + colNomWidth + colPrenomWidth + 5, currentY + 4, { width: colMatinWidth - 10, align: 'center' });
      doc.text('Après-midi', tableStartX + colNomWidth + colPrenomWidth + colMatinWidth + 5, currentY + 4, { width: colAMWidth - 10, align: 'center' });

      currentY += 14;

      // ========================================
      // LIGNES DES APPRENANTS (10 lignes)
      // ========================================
      const rowHeight = 18;
      const totalLignes = 10;
      const nombreApprenants = Math.min(data.apprenants.length, 10);

      for (let i = 0; i < totalLignes; i++) {
        const apprenant = i < nombreApprenants ? data.apprenants[i] : null;

        // Colonne NOM
        doc.rect(tableStartX, currentY, colNomWidth, rowHeight).stroke('#000000');

        // Colonne PRENOM
        doc.rect(tableStartX + colNomWidth, currentY, colPrenomWidth, rowHeight).stroke('#000000');

        // Colonne Matin (griser si après-midi)
        if (isAMCreneau) {
          doc.rect(tableStartX + colNomWidth + colPrenomWidth, currentY, colMatinWidth, rowHeight).fillAndStroke('#A6A6A6', '#000000');
        } else {
          doc.rect(tableStartX + colNomWidth + colPrenomWidth, currentY, colMatinWidth, rowHeight).stroke('#000000');
        }

        // Colonne Après-midi (griser si matin)
        if (isMatinCreneau) {
          doc.rect(tableStartX + colNomWidth + colPrenomWidth + colMatinWidth, currentY, colAMWidth, rowHeight).fillAndStroke('#A6A6A6', '#000000');
        } else {
          doc.rect(tableStartX + colNomWidth + colPrenomWidth + colMatinWidth, currentY, colAMWidth, rowHeight).stroke('#000000');
        }

        // Colonne Commentaires
        doc.rect(tableStartX + colNomWidth + colPrenomWidth + colMatinWidth + colAMWidth, currentY, colCommentairesWidth, rowHeight).stroke('#000000');

        // Remplir les données de l'apprenant
        if (apprenant) {
          doc.fillColor('#000000').font('Helvetica').fontSize(9);
          doc.text(apprenant.nom.toUpperCase(), tableStartX + 5, currentY + 5, { width: colNomWidth - 10 });
          doc.text(apprenant.prenom, tableStartX + colNomWidth + 5, currentY + 5, { width: colPrenomWidth - 10 });
          if (apprenant.absent) {
            doc.text(`ABSENT - ${apprenant.motif_absence}`, tableStartX + colNomWidth + colPrenomWidth + colMatinWidth + colAMWidth + 5, currentY + 5, { width: colCommentairesWidth - 10 });
          }
        }

        currentY += rowHeight;
      }

      // ========================================
      // NOTES FINALES
      // ========================================
      currentY += 5;
      doc.fontSize(7).font('Helvetica').fillColor('#000000')
        .text('Les états de présence tels qu\'indiqués dans la présente annexe constituent des MODELES. Il importe avant TOUT que les éléments demandés soient pris en compte.',
          30, currentY, { width: 780 });

      doc.text('La feuille d\'émargement est à fournir également par le sous-traitant.',
        30, currentY + 10, { width: 780 });

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

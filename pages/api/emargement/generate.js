/**
 * API Route : Génération de feuille d'émargement HSP au format Excel avec formatage EXACT
 * POST /api/emargement/generate
 *
 * Body : {
 *   date: '2025-11-19',
 *   jour: 'Mardi',
 *   creneau: 'M', // 'M' ou 'AM'
 *   lieu_id: 'uuid',
 *   lieu_nom: 'Centre Camille Pagé'
 * }
 *
 * IMPORTANT : Ce code reproduit EXACTEMENT le modèle Emargement_HSP.xlsx
 */

import ExcelJS from 'exceljs';
import { getEmargementData } from '@/lib/emargementUtils';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { date, jour, creneau, lieu_id, lieu_nom } = req.body;

    // Validation des paramètres
    if (!date || !jour || !creneau || !lieu_id) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    // Récupérer les données d'émargement
    const data = await getEmargementData({
      date,
      jour,
      creneau,
      lieu_id,
      lieu_nom
    });

    // Vérifier qu'il y a des apprenants
    if (data.apprenants.length === 0) {
      return res.status(404).json({
        error: 'Aucun apprenant HSP prévu pour ce créneau'
      });
    }

    // Générer le fichier Excel avec exceljs
    const buffer = await createEmargementWorkbook(data);

    // Nom du fichier
    const fileName = `Emargement_HSP_${data.lieu.initiale}_${date}_${creneau}.xlsx`;

    // Envoyer le fichier
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);

  } catch (error) {
    console.error('Erreur génération émargement:', error);
    res.status(500).json({
      error: 'Erreur lors de la génération de la feuille d\'émargement',
      details: error.message
    });
  }
}

/**
 * Crée le workbook Excel en reproduisant EXACTEMENT Emargement_HSP.xlsx
 */
async function createEmargementWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Feuil1');

  // ========================================
  // LARGEURS DES COLONNES (EXACTES du modèle)
  // ========================================
  worksheet.columns = [
    { width: 41.29 }, // A : NOM (large)
    { width: 5.00 },  // B
    { width: 15.71 }, // C : PRENOM
    { width: 10.00 }, // D : Matin
    { width: 12.00 }, // E : APRES-MIDI
    { width: 16.71 }, // F : Commentaires
    { width: 15.43 }, // G
    { width: 8.00 },  // H
    { width: 8.00 },  // I
    { width: 0.14 },  // J (très fine)
    { width: 14.00 }  // K : ANNEXE
  ];

  // ========================================
  // LIGNE 1 : ANNEXE 4.1 (hauteur: 64.5)
  // ========================================
  const row1 = worksheet.getRow(1);
  row1.height = 64.5;
  row1.getCell('I').value = 'ANNEXE 4.1';
  worksheet.mergeCells('I1:K1');
  row1.getCell('I').font = { size: 11, name: 'Calibri' };
  row1.getCell('I').alignment = { horizontal: 'center' };

  // ========================================
  // LIGNE 2 : TITRE (hauteur: 20.1)
  // ========================================
  const row2 = worksheet.getRow(2);
  row2.height = 20.1;
  row2.getCell('A').value = 'FEUILLE D\'EMARGEMENT STAGIAIRES EN CENTRE - HSP Socle 2025-2027';
  worksheet.mergeCells('A2:K2');
  row2.getCell('A').font = { bold: true, size: 14, name: 'Arial' };
  row2.getCell('A').alignment = { horizontal: 'center', vertical: 'middle' };

  // ========================================
  // LIGNES 3-4 : RAPPEL (hauteurs: 60 + 29.25)
  // ========================================
  const row3 = worksheet.getRow(3);
  const row4 = worksheet.getRow(4);
  row3.height = 60;
  row4.height = 29.25;

  // Cellule A3:A4 fusionnées pour "RAPPEL"
  worksheet.mergeCells('A3:A4');
  row3.getCell('A').value = 'RAPPEL';
  row3.getCell('A').font = { bold: true, size: 10, color: { argb: 'FFC00000' }, name: 'Arial' };
  row3.getCell('A').alignment = { horizontal: 'center', vertical: 'middle' };
  row3.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
  row3.getCell('A').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Texte du RAPPEL (B3:K4 fusionnées)
  const rappelText = 'Les informations saisies doivent être lisibles et compréhensibles sous peine de rejet de la feuille. ' +
    'Article 10.3 "la programmation annuelle des actions de formation" de la Convention cadre de mandat' +
    '".../... Les itinéraires se traduisent par des sessions (dans les outils de gestion) accessibles en entrées séquencées ' +
    'et donnant lieu à la création de points d\'entrées avec des effectifs associés. Un point d\'entrée ne peut pas démarrer ' +
    'sans un minimum de 2 usagers pour l\'itinéraire 1 et sans un minimum de 4 usagers pour les itinéraires 2, 3 et 4. .../..."';

  worksheet.mergeCells('B3:K4');
  row3.getCell('B').value = rappelText;
  row3.getCell('B').font = { bold: true, size: 10, color: { argb: 'FFC00000' }, name: 'Arial' };
  row3.getCell('B').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  row3.getCell('B').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
  row3.getCell('B').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // ========================================
  // LIGNE 5 : ACLEF Coordonnées (hauteur: 13.5)
  // ========================================
  const row5 = worksheet.getRow(5);
  row5.height = 13.5;
  row5.getCell('A').value = 'ACLEF - 12 avenue Camille Pagé 86100 Châtellerault - Tél: 05.49.93.17.06 - mail: aclef@aclef.fr';
  worksheet.mergeCells('A5:K5');
  row5.getCell('A').font = { size: 10, name: 'Arial' };
  row5.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };

  // ========================================
  // LIGNE 6 : NOM & PRENOM DU FORMATEUR + SIGNATURE
  // ========================================
  const row6 = worksheet.getRow(6);

  // Colonne A : Label
  row6.getCell('A').value = 'NOM & PRENOM DU FORMATEUR :';
  row6.getCell('A').font = { bold: true, size: 11, name: 'Calibri' };
  row6.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row6.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };
  row6.getCell('A').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Colonnes B-E : Nom du formateur
  const nomFormateur = data.encadrants.length > 0
    ? `${data.encadrants[0].prenom} ${data.encadrants[0].nom}`
    : '';

  worksheet.mergeCells('B6:E6');
  row6.getCell('B').value = nomFormateur;
  row6.getCell('B').font = { size: 11, name: 'Calibri' };
  row6.getCell('B').alignment = { horizontal: 'left', vertical: 'middle' };
  row6.getCell('B').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Colonnes F-G : Label SIGNATURE (fond gris)
  worksheet.mergeCells('F6:G6');
  row6.getCell('F').value = 'SIGNATURE du formateur';
  row6.getCell('F').font = { bold: true, size: 11, name: 'Calibri' };
  row6.getCell('F').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row6.getCell('F').alignment = { horizontal: 'center', vertical: 'middle' };
  row6.getCell('F').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' }
  };
  row6.getCell('G').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Colonnes H-K : Case vide pour signature
  worksheet.mergeCells('H6:K6');
  row6.getCell('H').value = '';
  row6.getCell('H').alignment = { horizontal: 'center' };
  row6.getCell('H').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // ========================================
  // LIGNE 7 : Vide (hauteur: 3)
  // ========================================
  worksheet.getRow(7).height = 3;

  // ========================================
  // LIGNE 8 : Itinéraire / N° lot / N° Session EOS
  // ========================================
  const row8 = worksheet.getRow(8);

  // Itinéraire
  row8.getCell('A').value = 'Itinéraire :';
  row8.getCell('A').font = { bold: true, size: 11, name: 'Calibri' };
  row8.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row8.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };
  row8.getCell('A').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B8:C8');
  row8.getCell('B').value = '1';
  row8.getCell('B').font = { size: 11, name: 'Calibri' };
  row8.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' };
  row8.getCell('B').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' }
  };
  row8.getCell('C').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // N° lot
  row8.getCell('F').value = 'N° lot :';
  row8.getCell('F').font = { bold: true, size: 11, name: 'Calibri' };
  row8.getCell('F').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row8.getCell('F').alignment = { horizontal: 'center', vertical: 'middle' };
  row8.getCell('F').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  row8.getCell('G').value = '24';
  row8.getCell('G').font = { size: 11, name: 'Calibri' };
  row8.getCell('G').alignment = { horizontal: 'center' };
  row8.getCell('G').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // N° Session EOS
  worksheet.mergeCells('H8:I8');
  row8.getCell('H').value = 'N° Session EOS :';
  row8.getCell('H').font = { bold: true, size: 11, name: 'Calibri' };
  row8.getCell('H').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row8.getCell('H').alignment = { horizontal: 'center', vertical: 'middle' };
  row8.getCell('H').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' }
  };
  row8.getCell('I').border = {
    top: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  row8.getCell('K').value = data.lieu.numero_session || '';
  row8.getCell('K').font = { size: 11, name: 'Calibri' };
  row8.getCell('K').alignment = { horizontal: 'center', vertical: 'middle' };
  row8.getCell('K').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // ========================================
  // LIGNE 9 : Vide (hauteur: 3.75)
  // ========================================
  worksheet.getRow(9).height = 3.75;

  // ========================================
  // LIGNE 10 : SITE
  // ========================================
  const row10 = worksheet.getRow(10);

  row10.getCell('A').value = 'SITE :';
  row10.getCell('A').font = { bold: true, size: 11, name: 'Calibri' };
  row10.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row10.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };
  row10.getCell('A').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B10:E10');
  row10.getCell('B').value = data.lieu.nom;
  row10.getCell('B').font = { size: 11, name: 'Calibri' };
  row10.getCell('B').alignment = { vertical: 'middle' };
  row10.getCell('B').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // ========================================
  // LIGNE 11 : Vide (hauteur: 3)
  // ========================================
  worksheet.getRow(11).height = 3;

  // ========================================
  // LIGNE 12 : HORAIRES MATIN / APRES-MIDI (hauteur: 20.1)
  // ========================================
  const row12 = worksheet.getRow(12);
  row12.height = 20.1;

  // HORAIRES MATIN
  row12.getCell('A').value = 'HORAIRES MATIN :';
  row12.getCell('A').font = { bold: true, size: 11, name: 'Calibri' };
  row12.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row12.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };
  row12.getCell('A').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('B12:C12');
  row12.getCell('B').value = data.creneau === 'M' ? '9h-12h' : '';
  row12.getCell('B').font = { size: 11, name: 'Calibri' };
  row12.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' };
  row12.getCell('B').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // APRES-MIDI
  row12.getCell('E').value = 'APRES-MIDI :';
  row12.getCell('E').font = { bold: true, size: 11, name: 'Calibri' };
  row12.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row12.getCell('E').alignment = { horizontal: 'center', vertical: 'middle' };
  row12.getCell('E').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  worksheet.mergeCells('F12:K12');
  row12.getCell('F').value = data.creneau === 'AM' ? '14h-17h' : '';
  row12.getCell('F').font = { size: 11, name: 'Calibri' };
  row12.getCell('F').alignment = { horizontal: 'center', vertical: 'middle' };
  row12.getCell('F').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // ========================================
  // LIGNE 13 : Vide (hauteur: 3)
  // ========================================
  worksheet.getRow(13).height = 3;

  // ========================================
  // LIGNE 14 : Date / N° de Semaine (hauteur: 20.1)
  // ========================================
  const row14 = worksheet.getRow(14);
  row14.height = 20.1;

  // Date du jour
  row14.getCell('A').value = 'Date du jour de formation (JJ/MM/AAAA)';
  row14.getCell('A').font = { bold: true, size: 11, name: 'Calibri' };
  row14.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row14.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };
  row14.getCell('A').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  const dateFormatee = formatDateFr(data.date);
  worksheet.mergeCells('B14:D14');
  row14.getCell('B').value = dateFormatee;
  row14.getCell('B').font = { size: 11, name: 'Calibri' };
  row14.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' };
  row14.getCell('B').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // N° de Semaine
  row14.getCell('E').value = 'N° de Semaine';
  row14.getCell('E').font = { bold: true, size: 11, name: 'Calibri' };
  row14.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row14.getCell('E').alignment = { horizontal: 'left', vertical: 'middle' };
  row14.getCell('E').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Valeur du N° de semaine
  row14.getCell('F').value = data.numeroSemaine;
  row14.getCell('F').font = { size: 11, name: 'Calibri' };
  row14.getCell('F').alignment = { horizontal: 'center', vertical: 'middle' };
  row14.getCell('F').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // ========================================
  // LIGNE 15 : Vide (hauteur: 3)
  // ========================================
  worksheet.getRow(15).height = 3;

  // ========================================
  // LIGNE 16 : Vide (hauteur: 4.5)
  // ========================================
  worksheet.getRow(16).height = 4.5;

  // ========================================
  // LIGNE 17 : En-têtes tableau (hauteur: 11.25)
  // ========================================
  const row17 = worksheet.getRow(17);
  row17.height = 11.25;

  // NOM
  worksheet.mergeCells('A17:B17');
  row17.getCell('A').value = 'NOM \n(en majuscule et lisible)';
  row17.getCell('A').font = { bold: true, size: 11, name: 'Calibri' };
  row17.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row17.getCell('A').alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  row17.getCell('A').border = {
    top: { style: 'medium' },
    left: { style: 'medium' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // PRENOM
  row17.getCell('C').value = 'PRENOM';
  row17.getCell('C').font = { bold: true, size: 11, name: 'Calibri' };
  row17.getCell('C').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row17.getCell('C').alignment = { horizontal: 'center', vertical: 'middle' };
  row17.getCell('C').border = {
    top: { style: 'medium' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Emargement
  worksheet.mergeCells('D17:E17');
  row17.getCell('D').value = 'Emargement';
  row17.getCell('D').font = { bold: true, size: 11, name: 'Calibri' };
  row17.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row17.getCell('D').alignment = { horizontal: 'center', vertical: 'middle' };
  row17.getCell('D').border = {
    top: { style: 'medium' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  // Commentaires / remarques éventuels
  worksheet.mergeCells('F17:K17');
  row17.getCell('F').value = 'Commentaires / remarques éventuels';
  row17.getCell('F').font = { bold: true, size: 11, name: 'Calibri' };
  row17.getCell('F').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row17.getCell('F').alignment = { horizontal: 'center', vertical: 'middle' };
  row17.getCell('F').border = {
    top: { style: 'medium' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'medium' }
  };

  // ========================================
  // LIGNE 18 : Sous-en-têtes Matin / Après-midi (hauteur: 20.1)
  // ========================================
  const row18 = worksheet.getRow(18);
  row18.height = 20.1;

  row18.getCell('D').value = 'Matin';
  row18.getCell('D').font = { bold: true, size: 11, name: 'Calibri' };
  row18.getCell('D').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row18.getCell('D').alignment = { horizontal: 'center', vertical: 'middle' };
  row18.getCell('D').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'medium' },
    right: { style: 'thin' }
  };

  row18.getCell('E').value = 'Après-midi';
  row18.getCell('E').font = { bold: true, size: 11, name: 'Calibri' };
  row18.getCell('E').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9D9D9' } };
  row18.getCell('E').alignment = { horizontal: 'center', vertical: 'middle' };
  row18.getCell('E').border = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'medium' },
    right: { style: 'thin' }
  };

  // ========================================
  // LIGNES 19-31 : Apprenants (10 lignes + 3 lignes vides)
  // ========================================
  const totalLignes = 13; // 10 apprenants + 3 lignes vides
  const nombreApprenants = Math.min(data.apprenants.length, 10);

  for (let i = 0; i < totalLignes; i++) {
    const rowNum = 19 + i;
    const row = worksheet.getRow(rowNum);
    const apprenant = i < nombreApprenants ? data.apprenants[i] : null;

    if (apprenant) {
      // NOM (A-B fusionnées)
      worksheet.mergeCells(`A${rowNum}:B${rowNum}`);
      row.getCell('A').value = apprenant.nom.toUpperCase();
      row.getCell('A').font = { size: 11, name: 'Calibri' };
      row.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell('A').border = {
        top: { style: 'thin' },
        left: { style: 'medium' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // PRENOM
      row.getCell('C').value = apprenant.prenom;
      row.getCell('C').font = { size: 11, name: 'Calibri' };
      row.getCell('C').alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell('C').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Matin (vide)
      row.getCell('D').value = '';
      row.getCell('D').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Après-midi (vide)
      row.getCell('E').value = '';
      row.getCell('E').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      // Commentaire (F-K fusionnées)
      const commentaire = apprenant.absent ? `ABSENT - ${apprenant.motif_absence}` : '';
      worksheet.mergeCells(`F${rowNum}:K${rowNum}`);
      row.getCell('F').value = commentaire;
      row.getCell('F').font = { size: 11, name: 'Calibri' };
      row.getCell('F').alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell('F').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'medium' }
      };
    } else {
      // Ligne vide
      worksheet.mergeCells(`A${rowNum}:B${rowNum}`);
      row.getCell('A').value = '';
      row.getCell('A').border = {
        top: { style: 'thin' },
        left: { style: 'medium' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      row.getCell('C').value = '';
      row.getCell('C').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      row.getCell('D').value = '';
      row.getCell('D').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      row.getCell('E').value = '';
      row.getCell('E').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };

      worksheet.mergeCells(`F${rowNum}:K${rowNum}`);
      row.getCell('F').value = '';
      row.getCell('F').border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'medium' }
      };
    }

    // Bordure épaisse en bas pour la dernière ligne (ligne 31)
    if (i === totalLignes - 1) {
      ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'].forEach(col => {
        const cell = row.getCell(col);
        cell.border = {
          ...cell.border,
          bottom: { style: 'medium' }
        };
      });
    }
  }

  // ========================================
  // LIGNE 32 : Note finale 1
  // ========================================
  const row32 = worksheet.getRow(32);
  row32.getCell('A').value = 'Les états de présence tels qu\'indiqués dans la présente annexe constituent des MODELES. Il importe avant TOUT que les éléments demandés soient pris en compte. ';
  worksheet.mergeCells('A32:K32');
  row32.getCell('A').font = { size: 9, name: 'Arial' };
  row32.getCell('A').alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  row32.height = 20;

  // ========================================
  // LIGNE 33 : Note finale 2
  // ========================================
  const row33 = worksheet.getRow(33);
  row33.getCell('A').value = 'La feuille d\'émargement est à fournir également par le sous-traitant.';
  worksheet.mergeCells('A33:K33');
  row33.getCell('A').font = { size: 9, name: 'Arial' };
  row33.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' };
  row33.height = 15;

  // ========================================
  // LOGOS : Ajouter les 4 logos en haut (avec proportions originales)
  // ========================================
  try {
    const projectRoot = process.cwd();

    // Logo 1 : Nouvelle-Aquitaine (colonne A)
    // Positions natives extraites du modèle
    const logo1Path = path.join(projectRoot, 'logo-1.png');
    if (fs.existsSync(logo1Path)) {
      const logo1Id = workbook.addImage({
        buffer: fs.readFileSync(logo1Path),
        extension: 'png',
      });
      worksheet.addImage(logo1Id, {
        tl: { nativeCol: 0, nativeColOff: 76200, nativeRow: 0, nativeRowOff: 47625 },
        br: { nativeCol: 0, nativeColOff: 1409700, nativeRow: 0, nativeRowOff: 628650 },
        editAs: 'oneCell'
      });
    }

    // Logo 2 : ACLEF Châtellerault
    const logo2Path = path.join(projectRoot, 'logo-2.png');
    if (fs.existsSync(logo2Path)) {
      const logo2Id = workbook.addImage({
        buffer: fs.readFileSync(logo2Path),
        extension: 'png',
      });
      worksheet.addImage(logo2Id, {
        tl: { nativeCol: 0, nativeColOff: 1543050, nativeRow: 0, nativeRowOff: 85725 },
        br: { nativeCol: 1, nativeColOff: 60198, nativeRow: 0, nativeRowOff: 714375 },
        editAs: 'oneCell'
      });
    }

    // Logo 3 : ACLEF Formation en Compétences Clés
    const logo3Path = path.join(projectRoot, 'logo-3.png');
    if (fs.existsSync(logo3Path)) {
      const logo3Id = workbook.addImage({
        buffer: fs.readFileSync(logo3Path),
        extension: 'png',
      });
      worksheet.addImage(logo3Id, {
        tl: { nativeCol: 2, nativeColOff: 38100, nativeRow: 0, nativeRowOff: 104775 },
        br: { nativeCol: 5, nativeColOff: 1323975, nativeRow: 1, nativeRowOff: 19050 },
        editAs: 'oneCell'
      });
    }

    // Logo 4 : Investir dans vos compétences
    const logo4Path = path.join(projectRoot, 'logo-4.jpeg');
    if (fs.existsSync(logo4Path)) {
      const logo4Id = workbook.addImage({
        buffer: fs.readFileSync(logo4Path),
        extension: 'jpeg',
      });
      worksheet.addImage(logo4Id, {
        tl: { nativeCol: 6, nativeColOff: 95250, nativeRow: 0, nativeRowOff: 19051 },
        br: { nativeCol: 8, nativeColOff: 66675, nativeRow: 0, nativeRowOff: 681357 },
        editAs: 'oneCell'
      });
    }
  } catch (error) {
    console.error('⚠️  Erreur lors de l\'ajout des logos:', error.message);
    // Continue même si les logos ne sont pas trouvés
  }

  // ========================================
  // PARAMÈTRES DE PAGE : Marges réduites + Ajustement 1 page + Mode paysage
  // ========================================
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape', // Mode paysage pour une meilleure lisibilité
    fitToPage: true,
    fitToWidth: 1,  // Forcer à tenir en 1 page de largeur
    fitToHeight: 1, // Forcer à tenir en 1 page de hauteur
    margins: {
      left: 0.25,   // Marges réduites (en pouces)
      right: 0.25,
      top: 0.25,
      bottom: 0.25,
      header: 0.0,
      footer: 0.0
    },
    horizontalCentered: false,
    verticalCentered: false
  };

  // Définir la zone d'impression (jusqu'à la ligne 33 avec les lignes vides)
  worksheet.pageSetup.printArea = 'A1:K33';

  // Générer le buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Formate une date YYYY-MM-DD en format français JJ/MM/AAAA
 */
function formatDateFr(dateStr) {
  const [annee, mois, jour] = dateStr.split('-');
  return `${jour}/${mois}/${annee}`;
}

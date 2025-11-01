#!/usr/bin/env node

import fs from 'fs/promises'
import path from 'path'

const pages = [
  'absence-apprenant.js',
  'gestion-absences-formateur.js',
  'gestion-apprenants.js',
  'gestion-formateurs.js',
  'gestion-lieux.js',
  'gestion-salaries.js',
  'planning-type-apprenants.js',
  'planning-type-formateurs.js',
  'prise-controle-formateur.js',
  'valider-changements.js'
]

const bandeauCode = `
                {/* Bandeau blanc */}
                <BandeauBlanc />`

async function addBandeauToPage(pageName) {
  const filePath = path.join(process.cwd(), 'pages', pageName)

  try {
    let content = await fs.readFile(filePath, 'utf-8')

    // 1. Ajouter l'import si pas déjà présent
    if (!content.includes('BandeauBlanc')) {
      // Trouver la ligne d'import de withAuthAdmin pour insérer juste après
      const withAuthAdminImportRegex = /(import.*withAuthAdmin.*\n)/
      if (withAuthAdminImportRegex.test(content)) {
        content = content.replace(
          withAuthAdminImportRegex,
          '$1import BandeauBlanc from \'../components/BandeauBlanc\'\n'
        )
      } else {
        console.log(`⚠️  ${pageName}: Import withAuthAdmin non trouvé, ajout en haut`)
        // Ajouter après les imports existants
        const firstImportMatch = content.match(/^import.*\n/m)
        if (firstImportMatch) {
          const insertPos = content.indexOf(firstImportMatch[0]) + firstImportMatch[0].length
          content = content.slice(0, insertPos) +
                   `import BandeauBlanc from '../components/BandeauBlanc'\n` +
                   content.slice(insertPos)
        }
      }

      // 2. Chercher le header avec "Accueil" button pour insérer le bandeau après
      // Pattern: bouton Accueil suivi de sa fermeture </button> puis fermeture du parent
      const headerPattern = /(>[\s\n]*Accueil[\s\n]*<\/button>[\s\S]*?<\/div>)/
      const match = content.match(headerPattern)

      if (match) {
        // Trouver la position après le header
        const headerEndPos = content.indexOf(match[0]) + match[0].length

        // Insérer le bandeau
        content = content.slice(0, headerEndPos) +
                 bandeauCode +
                 content.slice(headerEndPos)

        await fs.writeFile(filePath, content, 'utf-8')
        console.log(`✅ ${pageName}: Bandeau ajouté`)
      } else {
        console.log(`⚠️  ${pageName}: Pattern de header non trouvé, bandeau NON ajouté`)
      }
    } else {
      console.log(`ℹ️  ${pageName}: Bandeau déjà présent, ignoré`)
    }

  } catch (error) {
    console.error(`❌ ${pageName}: Erreur -`, error.message)
  }
}

async function main() {
  console.log('🚀 Ajout du bandeau blanc dans toutes les pages...\n')

  for (const page of pages) {
    await addBandeauToPage(page)
  }

  console.log('\n✅ Terminé !')
}

main()

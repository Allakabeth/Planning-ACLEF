import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DEBUG ABSENCE AUDA WELSCH - 03/09/2025\n')

// 1. Trouver Auda Welsch
console.log('1. Recherche Auda Welsch...')
const { data: users, error: userError } = await supabase
  .from('users')
  .select('id, prenom, nom, role')
  .ilike('nom', '%welsch%')
  .eq('role', 'formateur')

if (userError) {
  console.error('❌ Erreur recherche utilisateur:', userError)
  process.exit(1)
}

console.log('Utilisateurs trouvés:', users)

if (!users || users.length === 0) {
  console.log('❌ Auda Welsch non trouvée')
  process.exit(1)
}

const auda = users[0]
console.log(`✅ Auda trouvée: ${auda.prenom} ${auda.nom} (ID: ${auda.id})`)

// 2. Vérifier ses absences autour du 03/09
console.log('\n2. Recherche absences autour du 03/09/2025...')
const { data: absences, error: absError } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .gte('date_debut', '2025-08-30')
  .lte('date_fin', '2025-09-10')

if (absError) {
  console.error('❌ Erreur recherche absences:', absError)
  process.exit(1)
}

console.log('Absences trouvées:', absences?.length || 0)
absences?.forEach((abs, i) => {
  console.log(`  ${i + 1}. ${abs.date_debut} → ${abs.date_fin}`)
  console.log(`     Type: ${abs.type}`)
  console.log(`     Statut: ${abs.statut}`)
  console.log(`     Motif: ${abs.motif}`)
  console.log(`     ID: ${abs.id}`)
  console.log('')
})

// 3. Vérifier spécifiquement le 03/09
console.log('3. Vérification spécifique du 03/09/2025...')
const targetDate = '2025-09-03'
const concerneLe3Sept = absences?.filter(abs => 
  targetDate >= abs.date_debut && targetDate <= abs.date_fin
)

if (concerneLe3Sept?.length > 0) {
  console.log('✅ Absence/disponibilité trouvée pour le 03/09:')
  concerneLe3Sept.forEach(abs => {
    console.log(`  - Type: ${abs.type}`)
    console.log(`  - Statut: ${abs.statut}`) 
    console.log(`  - Période: ${abs.date_debut} → ${abs.date_fin}`)
    console.log(`  - Validé: ${abs.statut === 'validé' ? '✅' : '❌'}`)
    
    if (abs.type === 'formation') {
      console.log('  🎯 C\'EST UNE DISPONIBILITÉ EXCEPTIONNELLE !')
    } else {
      console.log(`  ⚠️  Type "${abs.type}" - pas une dispo exceptionnelle`)
    }
  })
} else {
  console.log('❌ Aucune absence/disponibilité trouvée pour le 03/09')
}

// 4. Vérifier le planning type d'Auda pour ce jour
console.log('\n4. Vérification planning type d\'Auda...')
const { data: planningType, error: ptError } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('valide', true)

if (ptError) {
  console.error('❌ Erreur planning type:', ptError)
} else {
  console.log('Planning type validé:', planningType?.length || 0, 'créneaux')
  
  // Le 03/09/2025 est un mardi
  const mardi = planningType?.filter(pt => pt.jour === 'Mardi')
  console.log('Créneaux mardi:', mardi?.length || 0)
  mardi?.forEach(pt => {
    console.log(`  - ${pt.creneau}: ${pt.statut} (lieu: ${pt.lieu_id})`)
  })
}

// 5. Vérifier les RLS (Row Level Security)
console.log('\n5. Test RLS - Requête comme dans planning-coordo.js...')
const { data: absencesRLS, error: rlsError } = await supabase
  .from('absences_formateurs')
  .select('id, formateur_id, date_debut, date_fin, type, statut')
  .eq('statut', 'validé')

if (rlsError) {
  console.error('❌ Erreur RLS:', rlsError)
} else {
  const audaAbsencesRLS = absencesRLS?.filter(abs => abs.formateur_id === auda.id)
  console.log('Absences validées via RLS pour Auda:', audaAbsencesRLS?.length || 0)
  
  const le3SeptRLS = audaAbsencesRLS?.filter(abs => 
    targetDate >= abs.date_debut && targetDate <= abs.date_fin
  )
  
  if (le3SeptRLS?.length > 0) {
    console.log('✅ Le 03/09 est visible via RLS')
    le3SeptRLS.forEach(abs => {
      console.log(`  Type: ${abs.type}, Statut: ${abs.statut}`)
    })
  } else {
    console.log('❌ Le 03/09 N\'EST PAS visible via RLS - PROBLÈME RLS !')
  }
}

console.log('\n🎯 RÉSUMÉ DU DEBUG:')
console.log('- Auda trouvée:', auda ? '✅' : '❌')
console.log('- Absence 03/09 dans BDD:', concerneLe3Sept?.length > 0 ? '✅' : '❌')
console.log('- Type formation (dispo except):', concerneLe3Sept?.some(abs => abs.type === 'formation') ? '✅' : '❌')
console.log('- Statut validé:', concerneLe3Sept?.some(abs => abs.statut === 'validé') ? '✅' : '❌')
console.log('- Visible via RLS:', (audaAbsencesRLS?.filter(abs => targetDate >= abs.date_debut && targetDate <= abs.date_fin))?.length > 0 ? '✅' : '❌')

process.exit(0)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DEBUG COMPLET AUDA WELSCH - PLANNING TYPE + ABSENCES\n')

// 1. Trouver Auda Welsch
const { data: users } = await supabase
  .from('users')
  .select('id, prenom, nom')
  .ilike('nom', '%welsch%')
  .eq('role', 'formateur')

const auda = users[0]
console.log(`✅ Auda trouvée: ${auda.prenom} ${auda.nom} (ID: ${auda.id})\n`)

// 2. TOUS les planning type d'Auda (sans filtre valide)
console.log('📋 TOUS LES PLANNING TYPE D\'AUDA (sans filtre):')
const { data: allPlanningType } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .order('jour', { ascending: true })
  .order('creneau', { ascending: true })

console.log(`Total: ${allPlanningType?.length || 0} créneaux`)
allPlanningType?.forEach(pt => {
  console.log(`  ${pt.jour} ${pt.creneau}: ${pt.statut} | Validé: ${pt.valide ? '✅' : '❌'} | Lieu: ${pt.lieu_id || 'N/A'} | ID: ${pt.id}`)
})

// 3. Planning type VALIDE seulement
console.log('\n📋 PLANNING TYPE VALIDÉ (valide=true):')
const { data: validPlanningType } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('valide', true)
  .order('jour', { ascending: true })
  .order('creneau', { ascending: true })

console.log(`Total validé: ${validPlanningType?.length || 0} créneaux`)
validPlanningType?.forEach(pt => {
  console.log(`  ${pt.jour} ${pt.creneau}: ${pt.statut} | Lieu: ${pt.lieu_id || 'N/A'}`)
})

// 4. Focus sur le MARDI spécifiquement
console.log('\n🎯 FOCUS MARDI (03/09 est un mardi):')
const mardiAll = allPlanningType?.filter(pt => pt.jour === 'Mardi')
const mardiValid = validPlanningType?.filter(pt => pt.jour === 'Mardi')

console.log(`Mardi total: ${mardiAll?.length || 0} créneaux`)
console.log(`Mardi validé: ${mardiValid?.length || 0} créneaux`)

mardiAll?.forEach(pt => {
  console.log(`  ${pt.creneau}: ${pt.statut} | Validé: ${pt.valide ? '✅' : '❌'} | Lieu: ${pt.lieu_id || 'N/A'}`)
})

// 5. Disponibilité exceptionnelle du 03/09
console.log('\n🟡 DISPONIBILITÉ EXCEPTIONNELLE 03/09:')
const { data: absences } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('date_debut', '2025-09-03')
  .eq('type', 'formation')
  .eq('statut', 'validé')

if (absences?.length > 0) {
  console.log('✅ Dispo exceptionnelle trouvée et validée')
  absences.forEach(abs => {
    console.log(`  Période: ${abs.date_debut} → ${abs.date_fin}`)
    console.log(`  Type: ${abs.type} | Statut: ${abs.statut}`)
  })
} else {
  console.log('❌ Pas de dispo exceptionnelle trouvée')
}

// 6. Requête exacte du planning-coordo.js
console.log('\n🔧 REQUÊTE EXACTE PLANNING-COORDO:')
const { data: planningCoordoData } = await supabase
  .from('planning_type_formateurs')
  .select('id, formateur_id, jour, creneau, statut, lieu_id, valide')
  .eq('valide', true)

const audaInCoordo = planningCoordoData?.filter(pt => pt.formateur_id === auda.id)
console.log(`Auda dans résultats planning-coordo: ${audaInCoordo?.length || 0} créneaux`)

if (audaInCoordo?.length === 0) {
  console.log('❌ PROBLÈME: Auda n\'apparaît pas dans les résultats du planning-coordo!')
  
  // Vérifier si c'est un problème de type de données
  console.log('\n🔍 Analyse type de données:')
  console.log('ID Auda:', auda.id, '- Type:', typeof auda.id)
  
  if (allPlanningType?.length > 0) {
    console.log('formateur_id dans planning_type:', allPlanningType[0].formateur_id, '- Type:', typeof allPlanningType[0].formateur_id)
    console.log('Comparaison stricte:', auda.id === allPlanningType[0].formateur_id)
    console.log('valide type:', typeof allPlanningType[0].valide, '- Valeur:', allPlanningType[0].valide)
  }
}

// 7. Test requête alternative
console.log('\n🔄 TEST REQUÊTE ALTERNATIVE (sans filtre valide):')
const { data: testData } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)

console.log(`Résultats sans filtre: ${testData?.length || 0}`)
const validCount = testData?.filter(pt => pt.valide === true).length || 0
const invalidCount = testData?.filter(pt => pt.valide === false).length || 0
const nullCount = testData?.filter(pt => pt.valide === null).length || 0

console.log(`  - valide=true: ${validCount}`)
console.log(`  - valide=false: ${invalidCount}`)
console.log(`  - valide=null: ${nullCount}`)

// 8. Vérifier la colonne valide directement
if (testData?.length > 0) {
  console.log('\n📊 Échantillon valeurs "valide":')
  testData.slice(0, 5).forEach(pt => {
    console.log(`  ${pt.jour} ${pt.creneau}: valide=${pt.valide} (type: ${typeof pt.valide})`)
  })
}

console.log('\n' + '='.repeat(60))
console.log('🎯 DIAGNOSTIC FINAL:')
console.log('='.repeat(60))

const hasValidPlanningType = validPlanningType?.length > 0
const hasDispoExcept = absences?.length > 0
const appearsInCoordo = audaInCoordo?.length > 0

console.log(`1. Planning type validé existe: ${hasValidPlanningType ? '✅' : '❌'} (${validPlanningType?.length || 0} créneaux)`)
console.log(`2. Dispo exceptionnelle 03/09: ${hasDispoExcept ? '✅' : '❌'}`)
console.log(`3. Apparaît dans planning-coordo: ${appearsInCoordo ? '✅' : '❌'}`)

if (!hasValidPlanningType && allPlanningType?.length > 0) {
  console.log('\n⚠️  PROBLÈME DÉTECTÉ: Planning type existe mais AUCUN n\'est marqué valide=true')
  console.log('   → La validation dans l\'interface ne semble pas persister en BDD')
}

if (hasValidPlanningType && !appearsInCoordo) {
  console.log('\n⚠️  PROBLÈME DÉTECTÉ: Planning validé existe mais n\'apparaît pas dans coordo')
  console.log('   → Possible problème de requête ou de type de données')
}

process.exit(0)
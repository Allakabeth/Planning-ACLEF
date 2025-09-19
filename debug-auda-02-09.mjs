import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DEBUG AUDA MARDI 02/09 - DISPO EXCEPTIONNELLE\n')
console.log('='.repeat(70))

// 1. Trouver Auda
const { data: users } = await supabase
  .from('users')
  .select('id, prenom, nom')
  .ilike('nom', '%welsch%')
  .eq('role', 'formateur')

const auda = users[0]
console.log(`✅ Auda trouvée: ${auda.prenom} ${auda.nom} (ID: ${auda.id})`)

// 2. Date cible
const dateStr = '2025-09-02' // Le mardi 02/09
console.log(`📅 Date cible: ${dateStr} (mardi)`)

// 3. Vérifier son planning type ACTUEL
console.log('\n📋 PLANNING TYPE ACTUEL D\'AUDA:')
const { data: planningType } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('valide', true)
  .order('jour')

console.log(`Total créneaux validés: ${planningType?.length || 0}`)
planningType?.forEach(pt => {
  console.log(`  ${pt.jour} ${pt.creneau}: ${pt.statut} (lieu: ${pt.lieu_id || 'Sans préf'})`)
})

// Focus sur le mardi
const mardi = planningType?.filter(pt => pt.jour === 'Mardi')
console.log(`\n🎯 MARDI spécifiquement: ${mardi?.length || 0} créneaux`)
mardi?.forEach(pt => {
  console.log(`  ${pt.creneau}: ${pt.statut}`)
})

// 4. Vérifier la disponibilité exceptionnelle du 02/09
console.log('\n🟡 DISPONIBILITÉ EXCEPTIONNELLE 02/09:')
const { data: dispoExcept } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('date_debut', '2025-09-02')
  .eq('type', 'formation')
  .eq('statut', 'validé')

if (dispoExcept?.length > 0) {
  console.log('✅ Disponibilité exceptionnelle confirmée')
  dispoExcept.forEach(abs => {
    console.log(`  Période: ${abs.date_debut} → ${abs.date_fin}`)
    console.log(`  Type: ${abs.type} | Statut: ${abs.statut}`)
    console.log(`  ID: ${abs.id}`)
  })
} else {
  console.log('❌ Disponibilité exceptionnelle non trouvée ou non validée')
  
  // Chercher toutes les absences d'Auda pour voir
  const { data: toutesAbsences } = await supabase
    .from('absences_formateurs')
    .select('*')
    .eq('formateur_id', auda.id)
    .eq('statut', 'validé')
  
  console.log(`\nToutes les absences validées d'Auda: ${toutesAbsences?.length || 0}`)
  toutesAbsences?.forEach(abs => {
    console.log(`  ${abs.date_debut} → ${abs.date_fin}: ${abs.type}`)
  })
}

// 5. SIMULER LA LOGIQUE EXACTE
console.log('\n🔧 SIMULATION LOGIQUE PLANNING-COORDO:')

// Récupérer tous les formateurs
const { data: formateurs } = await supabase
  .from('users')
  .select('id, prenom, nom, role')
  .eq('role', 'formateur')
  .eq('archive', false)

// Récupérer tous les planning types
const { data: allPlanningTypes } = await supabase
  .from('planning_type_formateurs')
  .select('id, formateur_id, jour, creneau, statut, lieu_id, valide')
  .eq('valide', true)

// Récupérer toutes les absences
const { data: allAbsences } = await supabase
  .from('absences_formateurs')
  .select('id, formateur_id, date_debut, date_fin, type, statut')
  .eq('statut', 'validé')

// Functions
const isFormateurAbsent = (formateurId, dateStr) => {
  const absences = allAbsences.filter(abs => abs.formateur_id === formateurId)
  return absences.some(absence => {
    const dateDebut = new Date(absence.date_debut + 'T00:00:00')
    const dateFin = new Date(absence.date_fin + 'T23:59:59')
    const dateCheck = new Date(dateStr + 'T12:00:00')
    
    return dateCheck >= dateDebut && dateCheck <= dateFin && absence.type !== 'formation'
  })
}

const hasDispoExceptionnelle = (formateurId, dateStr) => {
  const absences = allAbsences.filter(abs => abs.formateur_id === formateurId)
  return absences.some(absence => {
    const dateDebut = new Date(absence.date_debut + 'T00:00:00')
    const dateFin = new Date(absence.date_fin + 'T23:59:59')
    const dateCheck = new Date(dateStr + 'T12:00:00')
    
    return dateCheck >= dateDebut && dateCheck <= dateFin && absence.type === 'formation'
  })
}

// Test pour Auda
const audaAbsent = isFormateurAbsent(auda.id, dateStr)
const audaDispoExcept = hasDispoExceptionnelle(auda.id, dateStr)

console.log(`isFormateurAbsent(${dateStr}): ${audaAbsent ? 'TRUE ❌' : 'FALSE ✅'}`)
console.log(`hasDispoExceptionnelle(${dateStr}): ${audaDispoExcept ? 'TRUE ✅' : 'FALSE ❌'}`)

// formateursSansPlanning pour Mardi
const jour = 'Mardi'
const formateursSansPlanning = formateurs.filter(f => {
  const planningTypes = allPlanningTypes.filter(pt => pt.formateur_id === f.id && pt.jour === jour)
  return planningTypes.length === 0
})

const audaDansSansPlanning = formateursSansPlanning.find(f => f.id === auda.id)
console.log(`Auda dans formateursSansPlanning: ${audaDansSansPlanning ? 'OUI ✅' : 'NON ❌'}`)

// formateursSansPlanningAvecStatut simulation
if (audaDansSansPlanning && !audaAbsent) {
  console.log('\n🔄 LOGIQUE formateursSansPlanningAvecStatut:')
  
  if (audaDispoExcept) {
    console.log(`✅ ${auda.prenom} dispo exceptionnelle le ${dateStr} (sans planning) - ajouté par ROI`)
    console.log('  → Auda devrait apparaître avec statut: dispo_except')
  } else {
    console.log(`❌ ${auda.prenom} n'a pas de dispo exceptionnelle le ${dateStr}`)
  }
} else {
  console.log('\n❌ Auda bloquée avant la logique ROI:')
  if (!audaDansSansPlanning) console.log('  - Pas dans formateursSansPlanning')
  if (audaAbsent) console.log('  - Considérée comme absente')
}

console.log('\n' + '='.repeat(70))
console.log('🎯 RÉSUMÉ POUR LE 02/09:')
console.log('='.repeat(70))

console.log(`1. Planning type mardi: ${mardi?.length > 0 ? 'OUI ❌' : 'NON ✅'}`)
console.log(`2. Dispo except 02/09: ${audaDispoExcept ? 'OUI ✅' : 'NON ❌'}`)
console.log(`3. Absente le 02/09: ${audaAbsent ? 'OUI ❌' : 'NON ✅'}`)
console.log(`4. Dans formateursSansPlanning: ${audaDansSansPlanning ? 'OUI ✅' : 'NON ❌'}`)

if (audaDansSansPlanning && audaDispoExcept && !audaAbsent) {
  console.log('\n✅ AUDA DEVRAIT APPARAÎTRE !')
  console.log('Si elle n\'apparaît pas, vérifiez:')
  console.log('- Le filtre sélectionné (Toutes ou Exceptionnelles)')
  console.log('- La semaine affichée (02/09/2025)')
  console.log('- La console navigateur pour les messages ✅')
} else {
  console.log('\n❌ PROBLÈME IDENTIFIÉ:')
  if (!audaDansSansPlanning) console.log('→ Auda a un planning type pour mardi (ne devrait pas)')
  if (!audaDispoExcept) console.log('→ Pas de dispo exceptionnelle pour le 02/09')
  if (audaAbsent) console.log('→ Auda considérée comme absente')
}

process.exit(0)
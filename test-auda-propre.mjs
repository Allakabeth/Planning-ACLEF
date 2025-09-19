import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 TEST CAS PROPRE AUDA - MARDI 02/09\n')
console.log('='.repeat(50))

// 1. Auda
const { data: users } = await supabase.from('users').select('*').eq('role', 'formateur').eq('archive', false)
const auda = users.find(u => u.nom.toLowerCase().includes('welsch'))
console.log(`✅ Auda: ${auda.prenom} ${auda.nom} (${auda.id})`)

// 2. Son planning type
const { data: planningType } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('valide', true)

console.log(`\n📋 PLANNING TYPE ACTUEL:`)
console.log(`Total: ${planningType?.length || 0}`)
planningType?.forEach(pt => {
  console.log(`  ${pt.jour} ${pt.creneau}: ${pt.statut}`)
})

// Focus sur Lundi et Mardi
const lundi = planningType?.filter(pt => pt.jour === 'Lundi')
const mardi = planningType?.filter(pt => pt.jour === 'Mardi')
console.log(`\nLundi: ${lundi?.length || 0} créneaux`)
console.log(`Mardi: ${mardi?.length || 0} créneaux`)

// 3. Ses disponibilités exceptionnelles 
const { data: dispoExcept } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('type', 'formation')
  .eq('statut', 'validé')

console.log(`\n🟡 DISPO EXCEPTIONNELLES:`)
console.log(`Total: ${dispoExcept?.length || 0}`)
dispoExcept?.forEach(abs => {
  const jour = new Date(abs.date_debut + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long' })
  console.log(`  ${abs.date_debut} (${jour})`)
})

// 4. Test pour le mardi 02/09
const dateTest = '2025-09-02'
const jourTest = 'Mardi'

console.log(`\n🎯 TEST POUR ${jourTest} ${dateTest}:`)

// Auda a-t-elle un planning type pour mardi ?
const audaPlanningMardi = planningType?.filter(pt => pt.jour === jourTest)
console.log(`Planning type mardi: ${audaPlanningMardi?.length > 0 ? 'OUI ❌' : 'NON ✅'}`)

// Auda a-t-elle une dispo exceptionnelle le 02/09 ?
const audaDispoExcept02 = dispoExcept?.some(abs => {
  const dateDebut = new Date(abs.date_debut + 'T00:00:00')
  const dateFin = new Date(abs.date_fin + 'T23:59:59')
  const dateCheck = new Date(dateTest + 'T12:00:00')
  return dateCheck >= dateDebut && dateCheck <= dateFin
})
console.log(`Dispo except 02/09: ${audaDispoExcept02 ? 'OUI ✅' : 'NON ❌'}`)

// 5. Simulation logique formateursSansPlanningType
const allPlanningTypes = await supabase.from('planning_type_formateurs').select('*').eq('valide', true)
const formateursSansPlanning = users.filter(f => {
  const planningDuJour = allPlanningTypes.data?.filter(pt => pt.formateur_id === f.id && pt.jour === jourTest)
  return planningDuJour?.length === 0
})

const audaDansSansPlanningType = formateursSansPlanning.find(f => f.id === auda.id)
console.log(`Dans formateursSansPlanningType: ${audaDansSansPlanningType ? 'OUI ✅' : 'NON ❌'}`)

console.log(`\n${'='.repeat(50)}`)
console.log(`🎯 RÉSULTAT ATTENDU:`)
console.log(`- Auda n'a PAS de planning type mardi`)
console.log(`- Auda a UNE dispo exceptionnelle le 02/09`) 
console.log(`- Donc elle DOIT être dans formateursSansPlanningAvecStatut`)
console.log(`- Et apparaître en JAUNE dans l'interface !`)

if (audaPlanningMardi?.length === 0 && audaDispoExcept02 && audaDansSansPlanningType) {
  console.log(`\n🟢 TOUT EST CORRECT - Auda DOIT apparaître !`)
  console.log(`Si elle n'apparaît pas, le problème est dans le code.`)
} else {
  console.log(`\n🔴 PROBLÈME DANS LES DONNÉES:`)
  if (audaPlanningMardi?.length > 0) console.log(`- Elle a encore un planning type mardi`)
  if (!audaDispoExcept02) console.log(`- Pas de dispo except le 02/09`)
  if (!audaDansSansPlanningType) console.log(`- Pas dans formateursSansPlanningType`)
}

process.exit(0)
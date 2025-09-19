import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 VÉRIFICATION COMPLÈTE DONNÉES AUDA\n')
console.log('='.repeat(50))

// 1. Trouver Auda
const { data: users } = await supabase
  .from('users')
  .select('id, prenom, nom, role')
  .ilike('nom', '%welsch%')
  .eq('role', 'formateur')

if (!users?.length) {
  console.log('❌ Auda non trouvée!')
  process.exit(1)
}

const auda = users[0]
console.log(`✅ AUDA: ${auda.prenom} ${auda.nom}`)
console.log(`   ID: ${auda.id}`)

// 2. Planning type
console.log(`\n📋 PLANNING TYPE:`)
const { data: planningTypes } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .order('jour')

console.log(`Total: ${planningTypes?.length || 0}`)
planningTypes?.forEach(pt => {
  console.log(`   ${pt.jour} ${pt.creneau}: ${pt.statut} (valide: ${pt.valide}) [${pt.created_at}]`)
})

// 3. Toutes les absences/dispo
console.log(`\n🟡 ABSENCES/DISPO EXCEPTIONNELLES:`)
const { data: absences } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .order('date_debut', { ascending: false })

console.log(`Total: ${absences?.length || 0}`)
absences?.forEach(abs => {
  const date = new Date(abs.date_debut + 'T12:00:00')
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'long' })
  console.log(`   ${abs.date_debut} (${jour}): ${abs.type} - ${abs.statut} [${abs.created_at}]`)
})

// 4. Focus dates spécifiques
console.log(`\n🎯 FOCUS DATES CRITIQUES:`)
const datesCritiques = ['2025-09-02', '2025-09-04']

for (const dateStr of datesCritiques) {
  const dispoExcept = absences?.find(abs => {
    return abs.date_debut === dateStr && abs.type === 'formation' && abs.statut === 'validé'
  })
  
  const date = new Date(dateStr + 'T12:00:00')
  const jour = date.toLocaleDateString('fr-FR', { weekday: 'long' })
  
  console.log(`   ${dateStr} (${jour}): ${dispoExcept ? '✅ DISPO EXCEPT VALIDÉE' : '❌ PAS DE DISPO EXCEPT'}`)
  if (dispoExcept) {
    console.log(`     ID: ${dispoExcept.id} | Créé: ${dispoExcept.created_at}`)
  }
}

// 5. Statistiques
console.log(`\n📊 RÉSUMÉ:`)
const stats = {}
absences?.forEach(abs => {
  const key = `${abs.type}-${abs.statut}`
  stats[key] = (stats[key] || 0) + 1
})

Object.entries(stats).forEach(([key, count]) => {
  console.log(`   ${key}: ${count}`)
})

console.log(`\n${'='.repeat(50)}`)
console.log(`🎯 CONCLUSION POUR PLANNING-COORDO:`)

const audaPlanningMardi = planningTypes?.find(pt => pt.jour === 'Mardi' && pt.valide)
const audaPlanningJeudi = planningTypes?.find(pt => pt.jour === 'Jeudi' && pt.valide)
const dispoExceptMardi = absences?.find(abs => abs.date_debut === '2025-09-02' && abs.type === 'formation' && abs.statut === 'validé')
const dispoExceptJeudi = absences?.find(abs => abs.date_debut === '2025-09-04' && abs.type === 'formation' && abs.statut === 'validé')

console.log(`Mardi 02/09:`)
console.log(`  Planning type: ${audaPlanningMardi ? 'OUI ❌' : 'NON ✅'}`)
console.log(`  Dispo except: ${dispoExceptMardi ? 'OUI ✅' : 'NON ❌'}`)
console.log(`  → Devrait apparaître: ${!audaPlanningMardi && dispoExceptMardi ? 'OUI ✅' : 'NON ❌'}`)

console.log(`Jeudi 04/09:`)
console.log(`  Planning type: ${audaPlanningJeudi ? 'OUI ❌' : 'NON ✅'}`)
console.log(`  Dispo except: ${dispoExceptJeudi ? 'OUI ✅' : 'NON ❌'}`)
console.log(`  → Devrait apparaître: ${!audaPlanningJeudi && dispoExceptJeudi ? 'OUI ✅' : 'NON ❌'}`)

process.exit(0)
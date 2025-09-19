import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

// TEST SIMPLE : Reproduire la logique EXACTE du code
console.log('🧪 TEST SIMPLE LOGIQUE AUDA 02/09\n')

// 1. Données de base
const { data: users } = await supabase.from('users').select('*').eq('role', 'formateur').eq('archive', false)
const { data: planningTypes } = await supabase.from('planning_type_formateurs').select('*').eq('valide', true)
const { data: absences } = await supabase.from('absences_formateurs').select('*').eq('statut', 'validé')

const auda = users.find(u => u.nom.toLowerCase().includes('welsch'))
console.log(`✅ Auda: ${auda.prenom} ${auda.nom}`)

// 2. Variables du test
const jour = 'Mardi'
const dateStr = '2025-09-02'
const filtreDisponibilite = 'exceptionnelles'

console.log(`📅 Test: ${jour} ${dateStr}`)
console.log(`🎛️  Filtre: ${filtreDisponibilite}`)

// 3. Functions exactes du code
const isFormateurAbsent = (formateurId, dateStr) => {
  return absences.some(absence => {
    if (absence.formateur_id !== formateurId) return false
    const dateDebut = new Date(absence.date_debut + 'T00:00:00')
    const dateFin = new Date(absence.date_fin + 'T23:59:59')
    const dateCheck = new Date(dateStr + 'T12:00:00')
    return dateCheck >= dateDebut && dateCheck <= dateFin && absence.type !== 'formation'
  })
}

const hasDispoExceptionnelle = (formateurId, dateStr) => {
  return absences.some(absence => {
    if (absence.formateur_id !== formateurId) return false
    const dateDebut = new Date(absence.date_debut + 'T00:00:00')
    const dateFin = new Date(absence.date_fin + 'T23:59:59')
    const dateCheck = new Date(dateStr + 'T12:00:00')
    return dateCheck >= dateDebut && dateCheck <= dateFin && absence.type === 'formation'
  })
}

// 4. Tests sur Auda
const audaAbsent = isFormateurAbsent(auda.id, dateStr)
const audaDispoExcept = hasDispoExceptionnelle(auda.id, dateStr)

console.log(`\n🔍 Tests Auda:`)
console.log(`  Absent: ${audaAbsent}`)
console.log(`  DispoExcept: ${audaDispoExcept}`)

// 5. formateursSansPlanningType
const formateursSansPlanningType = users.filter(f => {
  const planningDuJour = planningTypes.filter(pt => pt.formateur_id === f.id && pt.jour === jour)
  return planningDuJour.length === 0
})

const audaDansSansPlanningType = formateursSansPlanningType.find(f => f.id === auda.id)
console.log(`  Dans formateursSansPlanningType: ${audaDansSansPlanningType ? 'OUI' : 'NON'}`)

// 6. Logique formateursSansPlanningAvecStatut
console.log(`\n🔧 Test condition: (filtreDisponibilite === 'toutes' || filtreDisponibilite === 'exceptionnelles')`)
const condition = (filtreDisponibilite === 'toutes' || filtreDisponibilite === 'exceptionnelles')
console.log(`  Résultat: ${condition}`)

if (condition && audaDansSansPlanningType) {
  console.log(`\n✅ Auda devrait être dans formateursSansPlanningAvecStatut`)
  
  if (!audaAbsent) {
    console.log(`✅ Auda n'est pas absente, elle passe le filtre`)
    
    if (audaDispoExcept) {
      console.log(`✅ Auda a une dispo exceptionnelle → statut: 'dispo_except'`)
      console.log(`🎯 CONCLUSION: Auda DOIT apparaître en jaune !`)
    } else {
      if (filtreDisponibilite === 'exceptionnelles') {
        console.log(`❌ Auda n'a pas de dispo except + filtre 'exceptionnelles' → null`)
      } else {
        console.log(`➡️ Auda sans dispo except + filtre 'toutes' → statut: null`)
      }
    }
  } else {
    console.log(`❌ Auda est absente, elle est filtrée`)
  }
} else {
  console.log(`❌ Condition pas remplie ou Auda pas dans formateursSansPlanningType`)
}

console.log(`\n${'='.repeat(50)}`)
console.log(`🎯 DIAGNOSTIC FINAL:`)
console.log(`- Filtre: ${filtreDisponibilite}`)
console.log(`- Auda sans planning mardi: ${audaDansSansPlanningType ? 'OUI' : 'NON'}`)
console.log(`- Auda dispo except 02/09: ${audaDispoExcept ? 'OUI' : 'NON'}`)
console.log(`- Auda absente 02/09: ${audaAbsent ? 'OUI' : 'NON'}`)
console.log(`- Condition remplie: ${condition ? 'OUI' : 'NON'}`)

if (condition && audaDansSansPlanningType && !audaAbsent && audaDispoExcept) {
  console.log(`\n🟢 AUDA DOIT APPARAÎTRE ! Si elle n'apparaît pas, le problème est dans l'affichage.`)
} else {
  console.log(`\n🔴 AUDA NE DOIT PAS APPARAÎTRE selon la logique.`)
}

process.exit(0)
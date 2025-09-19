import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DEBUG WORKFLOW ROI - POURQUOI AUDA N\'APPARAÎT PAS\n')
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
const dateStr = '2025-09-03' // Le mardi 03/09
console.log(`📅 Date cible: ${dateStr} (mardi)`)

// 3. REPRODUIRE EXACTEMENT LA LOGIQUE DU PLANNING-COORDO
console.log('\n🔧 REPRODUCTION EXACTE LOGIQUE PLANNING-COORDO:')

// Récupérer TOUS les formateurs
const { data: formateurs } = await supabase
  .from('users')
  .select('id, prenom, nom, role')
  .eq('role', 'formateur')
  .eq('archive', false)

console.log(`Total formateurs: ${formateurs.length}`)

// Récupérer TOUS les planning types
const { data: allPlanningTypes } = await supabase
  .from('planning_type_formateurs')
  .select('id, formateur_id, jour, creneau, statut, lieu_id, valide')
  .eq('valide', true)

console.log(`Total planning types validés: ${allPlanningTypes.length}`)

// Récupérer TOUTES les absences
const { data: allAbsences } = await supabase
  .from('absences_formateurs')
  .select('id, formateur_id, date_debut, date_fin, type, statut')
  .eq('statut', 'validé')

console.log(`Total absences validées: ${allAbsences.length}`)

// 4. SIMULER LES FONCTIONS UTILISÉES DANS PLANNING-COORDO

// Function isFormateurAbsent
const isFormateurAbsent = (formateurId, dateStr) => {
  const absences = allAbsences.filter(abs => abs.formateur_id === formateurId)
  return absences.some(absence => {
    const dateDebut = new Date(absence.date_debut + 'T00:00:00')
    const dateFin = new Date(absence.date_fin + 'T23:59:59')
    const dateCheck = new Date(dateStr + 'T12:00:00')
    
    return dateCheck >= dateDebut && dateCheck <= dateFin && absence.type !== 'formation'
  })
}

// Function hasDispoExceptionnelle
const hasDispoExceptionnelle = (formateurId, dateStr) => {
  const absences = allAbsences.filter(abs => abs.formateur_id === formateurId)
  return absences.some(absence => {
    const dateDebut = new Date(absence.date_debut + 'T00:00:00')
    const dateFin = new Date(absence.date_fin + 'T23:59:59')
    const dateCheck = new Date(dateStr + 'T12:00:00')
    
    return dateCheck >= dateDebut && dateCheck <= dateFin && absence.type === 'formation'
  })
}

// 5. TESTS POUR AUDA
console.log('\n🎯 TESTS SPÉCIFIQUES POUR AUDA:')

const audaAbsent = isFormateurAbsent(auda.id, dateStr)
console.log(`isFormateurAbsent(${dateStr}): ${audaAbsent ? 'TRUE ❌' : 'FALSE ✅'}`)

const audaDispoExcept = hasDispoExceptionnelle(auda.id, dateStr)
console.log(`hasDispoExceptionnelle(${dateStr}): ${audaDispoExcept ? 'TRUE ✅' : 'FALSE ❌'}`)

// Planning type pour le mardi
const audaPlanningTypes = allPlanningTypes.filter(pt => pt.formateur_id === auda.id)
const audaPlanningMardi = audaPlanningTypes.find(pt => pt.jour === 'Mardi')
console.log(`Planning type mardi: ${audaPlanningMardi ? 'OUI ✅' : 'NON ❌'}`)

// 6. SIMULER LA LOGIQUE EXACTE DE GETFORMATEURS
console.log('\n🔄 SIMULATION getFormateurs() LOGIC:')

const jour = 'Mardi'
const formateursSansPlanning = formateurs.filter(f => {
  const planningTypes = allPlanningTypes.filter(pt => pt.formateur_id === f.id && pt.jour === jour)
  return planningTypes.length === 0
})

console.log(`\n--- formateursSansPlanning pour ${jour} ---`)
console.log(`Total: ${formateursSansPlanning.length}`)
const audaDansSansPlanning = formateursSansPlanning.find(f => f.id === auda.id)
console.log(`Auda dans formateursSansPlanning: ${audaDansSansPlanning ? 'OUI ✅' : 'NON ❌'}`)

// 7. SIMULER formateursSansPlanningAvecStatut
console.log(`\n--- formateursSansPlanningAvecStatut Logic ---`)

const formateursSansPlanningAvecStatut = formateursSansPlanning
  .filter(f => !isFormateurAbsent(f.id, dateStr))
  .map(f => {
    if (hasDispoExceptionnelle(f.id, dateStr)) {
      console.log(`✅ ${f.prenom} dispo exceptionnelle le ${dateStr} (sans planning) - ajouté par ROI`)
      return { 
        ...f, 
        statut: 'dispo_except',
        source: 'exception_validee_roi'
      }
    }
    
    return { 
      ...f, 
      statut: null,
      source: 'aucun_planning'
    }
  })
  .filter(f => f !== null)

console.log(`Total formateursSansPlanningAvecStatut: ${formateursSansPlanningAvecStatut.length}`)

const audaDansAvecStatut = formateursSansPlanningAvecStatut.find(f => f.id === auda.id)
console.log(`Auda dans formateursSansPlanningAvecStatut: ${audaDansAvecStatut ? 'OUI ✅' : 'NON ❌'}`)

if (audaDansAvecStatut) {
  console.log(`  Statut d'Auda: ${audaDansAvecStatut.statut}`)
  console.log(`  Source: ${audaDansAvecStatut.source}`)
}

// 8. RÉSUMÉ DEBUG
console.log('\n' + '='.repeat(70))
console.log('🎯 RÉSUMÉ DEBUG:')
console.log('='.repeat(70))

console.log(`1. Auda absent le ${dateStr}: ${audaAbsent ? 'OUI ❌' : 'NON ✅'}`)
console.log(`2. Auda dispo except le ${dateStr}: ${audaDispoExcept ? 'OUI ✅' : 'NON ❌'}`)
console.log(`3. Planning type mardi: ${audaPlanningMardi ? 'OUI ✅' : 'NON ❌'}`)
console.log(`4. Dans formateursSansPlanning: ${audaDansSansPlanning ? 'OUI ✅' : 'NON ❌'}`)
console.log(`5. Dans formateursSansPlanningAvecStatut: ${audaDansAvecStatut ? 'OUI ✅' : 'NON ❌'}`)

if (!audaDansAvecStatut && audaDispoExcept && !audaAbsent) {
  console.log('\n❌ PROBLÈME IDENTIFIÉ:')
  console.log('Auda devrait apparaître mais n\'apparaît pas !')
  console.log('Vérifiez:')
  console.log('- Le filtre sélectionné dans l\'interface')
  console.log('- La logique de filtrage par disponibilité')
  console.log('- Les conditions d\'exclusion (formateur déjà assigné)')
} else if (audaDansAvecStatut) {
  console.log('\n✅ Auda devrait apparaître dans l\'interface !')
  console.log('Si elle n\'apparaît pas, vérifiez:')
  console.log('- Le filtre sélectionné')
  console.log('- Le jour/créneau sélectionné')
  console.log('- Les conditions d\'exclusion')
}

process.exit(0)
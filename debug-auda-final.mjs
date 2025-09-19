import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 DIAGNOSTIC COMPLET - AUDA WELSCH PLANNING COORDO\n')
console.log('='.repeat(70))

// 1. Trouver Auda
const { data: users } = await supabase
  .from('users')
  .select('id, prenom, nom')
  .ilike('nom', '%welsch%')
  .eq('role', 'formateur')

const auda = users[0]
console.log(`✅ Auda trouvée: ${auda.prenom} ${auda.nom} (ID: ${auda.id})`)

// 2. Vérifier son planning type APRÈS revalidation
console.log('\n📋 PLANNING TYPE VALIDÉ (après revalidation):')
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

// 3. Vérifier la disponibilité exceptionnelle du 03/09
console.log('\n🟡 DISPONIBILITÉ EXCEPTIONNELLE 03/09:')
const { data: dispoExcept } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('date_debut', '2025-09-03')
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
}

// 4. SIMULER LA LOGIQUE DU PLANNING-COORDO.JS
console.log('\n🔧 SIMULATION LOGIQUE PLANNING-COORDO:')

const dateStr = '2025-09-03' // Le mardi 03/09

// Test isFormateurAbsent
const absenceJour = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('statut', 'validé')
  .lte('date_debut', dateStr)
  .gte('date_fin', dateStr)

console.log(`Absences couvrant le ${dateStr}: ${absenceJour?.data?.length || 0}`)
absenceJour?.data?.forEach(abs => {
  console.log(`  ${abs.type}: ${abs.date_debut} → ${abs.date_fin}`)
})

// Test hasDispoExceptionnelle
const dispoExceptJour = absenceJour?.data?.find(abs => abs.type === 'formation')
console.log(`hasDispoExceptionnelle(${dateStr}): ${dispoExceptJour ? 'TRUE ✅' : 'FALSE ❌'}`)

// Test si elle a un planning type pour mardi
const mardiPlanningType = planningType?.find(pt => pt.jour === 'Mardi')
console.log(`Planning type mardi existe: ${mardiPlanningType ? 'TRUE ✅' : 'FALSE ❌'}`)

// 5. REQUÊTE EXACTE DU PLANNING-COORDO avec filtres
console.log('\n📊 REQUÊTE PLANNING-COORDO AVEC FILTRES:')

// Récupérer tous les formateurs comme le fait l'app
const { data: formateurs } = await supabase
  .from('users')
  .select('id, prenom, nom, role')
  .eq('role', 'formateur')
  .eq('archive', false)

console.log(`Total formateurs: ${formateurs?.length || 0}`)

// Requête planning type comme dans l'app
const { data: allPlanningTypes } = await supabase
  .from('planning_type_formateurs')
  .select('id, formateur_id, jour, creneau, statut, lieu_id, valide')
  .eq('valide', true)

console.log(`Total planning types validés: ${allPlanningTypes?.length || 0}`)

// Filtrer pour Auda
const audaPlanningTypes = allPlanningTypes?.filter(pt => pt.formateur_id === auda.id)
console.log(`Planning types d'Auda: ${audaPlanningTypes?.length || 0}`)

// Requête absences comme dans l'app
const { data: allAbsences } = await supabase
  .from('absences_formateurs')
  .select('id, formateur_id, date_debut, date_fin, type, statut')
  .eq('statut', 'validé')

const audaAbsences = allAbsences?.filter(abs => abs.formateur_id === auda.id)
console.log(`Absences d'Auda: ${audaAbsences?.length || 0}`)

// 6. TEST FILTRE DISPONIBILITÉ
console.log('\n🎛️ TEST AVEC FILTRES PLANNING-COORDO:')

['toutes', 'disponible', 'exceptionnelles'].forEach(filtre => {
  console.log(`\n--- Filtre: "${filtre}" ---`)
  
  // Logic des formateurs disponibles selon le filtre
  let formateursDispo = []
  
  if (audaPlanningTypes?.length > 0) {
    const mardiPT = audaPlanningTypes.find(pt => pt.jour === 'Mardi')
    if (mardiPT) {
      let statutValide = false
      if (filtre === 'disponible') {
        statutValide = mardiPT.statut === 'disponible'
      } else if (filtre === 'exceptionnelles') {
        statutValide = mardiPT.statut === 'dispo_except'
      } else if (filtre === 'toutes') {
        statutValide = mardiPT.statut === 'disponible' || mardiPT.statut === 'dispo_except'
      }
      
      if (statutValide && dispoExceptJour) {
        formateursDispo.push({...auda, statut: 'dispo_except'})
      } else if (statutValide) {
        formateursDispo.push({...auda, statut: mardiPT.statut})
      }
    }
  }
  
  // Aussi les formateurs sans planning type mais avec dispo except
  if (filtre === 'toutes' && (!audaPlanningTypes?.length || !audaPlanningTypes.find(pt => pt.jour === 'Mardi'))) {
    if (dispoExceptJour) {
      formateursDispo.push({...auda, statut: 'dispo_except'})
    }
  }
  
  console.log(`  Auda apparaît: ${formateursDispo.length > 0 ? 'OUI ✅' : 'NON ❌'}`)
  if (formateursDispo.length > 0) {
    console.log(`  Statut: ${formateursDispo[0].statut}`)
  }
})

console.log('\n' + '='.repeat(70))
console.log('🎯 RÉSUMÉ DIAGNOSTIC:')
console.log('='.repeat(70))

const hasPlanningType = planningType?.length > 0
const hasPlanningMardi = mardi?.length > 0
const hasDispoExcept = dispoExcept?.length > 0

console.log(`1. Planning type validé: ${hasPlanningType ? 'OUI ✅' : 'NON ❌'} (${planningType?.length || 0} créneaux)`)
console.log(`2. Planning type mardi: ${hasPlanningMardi ? 'OUI ✅' : 'NON ❌'} (${mardi?.length || 0} créneaux)`)  
console.log(`3. Dispo except 03/09: ${hasDispoExcept ? 'OUI ✅' : 'NON ❌'}`)
console.log(`4. Devrait apparaître: ${(hasPlanningMardi || hasDispoExcept) ? 'OUI ✅' : 'NON ❌'}`)

if (!hasPlanningType) {
  console.log('\n❌ PROBLÈME: Planning type pas sauvegardé après revalidation')
} else if (!hasPlanningMardi) {
  console.log('\n❌ PROBLÈME: Pas de planning type pour le mardi')
} else if (!hasDispoExcept) {
  console.log('\n❌ PROBLÈME: Disponibilité exceptionnelle 03/09 absente/non validée')
} else {
  console.log('\n✅ TOUT SEMBLE OK - Vérifiez le filtre dans planning-coordo')
  console.log('   → Utilisez le filtre "Toutes les disponibilités" ou "Dispo exceptionnelles"')
}

process.exit(0)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('📅 VÉRIFICATION DES DATES DE DISPO EXCEPTIONNELLE D\'AUDA\n')

// 1. Trouver Auda
const { data: users } = await supabase
  .from('users')
  .select('id, prenom, nom')
  .ilike('nom', '%welsch%')
  .eq('role', 'formateur')

const auda = users[0]
console.log(`✅ Auda: ${auda.prenom} ${auda.nom} (ID: ${auda.id})`)

// 2. Toutes les disponibilités exceptionnelles d'Auda
const { data: dispoExcept } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('formateur_id', auda.id)
  .eq('type', 'formation')
  .eq('statut', 'validé')
  .order('date_debut')

console.log(`\n📋 TOUTES LES DISPO EXCEPTIONNELLES VALIDÉES:`)
console.log(`Total: ${dispoExcept?.length || 0}`)

if (dispoExcept?.length > 0) {
  dispoExcept.forEach((abs, index) => {
    console.log(`${index + 1}. ${abs.date_debut} → ${abs.date_fin}`)
    console.log(`   ID: ${abs.id}`)
    console.log(`   Créé: ${abs.created_at}`)
    console.log(`   Jour semaine: ${new Date(abs.date_debut + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long' })}`)
    console.log('')
  })
} else {
  console.log('❌ Aucune disponibilité exceptionnelle trouvée')
}

// 3. Test spécifique des dates
const dates = ['2025-09-01', '2025-09-02']
console.log('🔍 TEST FONCTION hasDispoExceptionnelle:')

const hasDispoExceptionnelle = (formateurId, dateStr) => {
  const absences = dispoExcept || []
  return absences.some(absence => {
    const dateDebut = new Date(absence.date_debut + 'T00:00:00')
    const dateFin = new Date(absence.date_fin + 'T23:59:59')
    const dateCheck = new Date(dateStr + 'T12:00:00')
    
    const result = dateCheck >= dateDebut && dateCheck <= dateFin && absence.type === 'formation'
    console.log(`  Check ${dateStr}: ${absence.date_debut} → ${absence.date_fin} => ${result ? 'MATCH ✅' : 'NO MATCH ❌'}`)
    return result
  })
}

dates.forEach(date => {
  console.log(`\n--- Test pour ${date} ---`)
  const result = hasDispoExceptionnelle(auda.id, date)
  console.log(`Résultat: ${result ? 'TRUE ✅' : 'FALSE ❌'}`)
})

process.exit(0)
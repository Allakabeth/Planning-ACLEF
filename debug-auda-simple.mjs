import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 TEST SIMPLE LOGIQUE AUDA\n')

// Récupérer Auda
const { data: users } = await supabase
  .from('users')
  .select('id, prenom, nom')
  .ilike('nom', '%welsch%')

const auda = users[0]
console.log(`👤 Auda ID: ${auda.id}`)

// Récupérer les absences validées
const { data: absences } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('statut', 'validé')

console.log(`📝 Total absences validées: ${absences.length}`)

// Test hasDispoExceptionnelle exacte
const hasDispoExceptionnelle = (formateurId, dateStr) => {
    const dispoJour = absences.find(absence => {
        if (absence.formateur_id !== formateurId) return false;
        if (absence.type !== 'formation') return false;
        
        const dateDebut = new Date(absence.date_debut + 'T00:00:00');
        const dateFin = new Date(absence.date_fin + 'T23:59:59');
        const dateCheck = new Date(dateStr + 'T12:00:00');
        
        console.log(`   🔍 Checking: ${dateStr}`);
        console.log(`   📅 Absence: ${absence.date_debut} -> ${absence.date_fin}`);
        console.log(`   🕐 dateCheck: ${dateCheck.toISOString()}`);
        console.log(`   🕐 dateDebut: ${dateDebut.toISOString()}`);
        console.log(`   🕐 dateFin: ${dateFin.toISOString()}`);
        console.log(`   ✅ Dans intervalle: ${dateCheck >= dateDebut && dateCheck <= dateFin}`);
        
        return dateCheck >= dateDebut && dateCheck <= dateFin;
    });
    
    return !!dispoJour;
};

// Test pour mardi 02/09
console.log('\n📅 TEST MARDI 02/09:')
const resultMardi = hasDispoExceptionnelle(auda.id, '2025-09-02')
console.log(`🎯 Résultat: ${resultMardi}`)

// Test pour jeudi 04/09
console.log('\n📅 TEST JEUDI 04/09:')
const resultJeudi = hasDispoExceptionnelle(auda.id, '2025-09-04')
console.log(`🎯 Résultat: ${resultJeudi}`)

console.log('\n🔍 ABSENCES D\'AUDA:')
const audaAbsences = absences.filter(a => a.formateur_id === auda.id)
audaAbsences.forEach(abs => {
  console.log(`   ${abs.date_debut} - ${abs.date_fin}: ${abs.type} (${abs.statut})`)
})

process.exit(0)
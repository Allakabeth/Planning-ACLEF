import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔧 DEBUG FILTRE AUDA MARDI 02/09\n')

// 1. Tous les formateurs
const { data: formateurs } = await supabase
  .from('users')
  .select('id, prenom, nom')
  .eq('role', 'formateur')
  .eq('archive', false)

console.log(`👥 Total formateurs: ${formateurs.length}`)

const auda = formateurs.find(f => f.prenom === 'Auda')
console.log(`👤 Auda trouvée: ${auda ? 'OUI' : 'NON'} (ID: ${auda?.id})`)

// 2. Planning types
const { data: planningTypes } = await supabase
  .from('planning_type_formateurs')
  .select('*')
  .eq('valide', true)

console.log(`📋 Total planning types validés: ${planningTypes.length}`)

// 3. Test formateursSansPlanningType pour MARDI
const jour = 'Mardi'
const formateursSansPlanningType = formateurs.filter(f => {
    const planningDuJour = planningTypes.filter(pt => pt.formateur_id === f.id && pt.jour === jour)
    return planningDuJour.length === 0
})

console.log(`\n📋 FORMATEURS SANS PLANNING TYPE MARDI:`)
console.log(`Total: ${formateursSansPlanningType.length}`)

const audaSansPlanningType = formateursSansPlanningType.find(f => f.id === auda.id)
console.log(`Auda dans cette liste: ${audaSansPlanningType ? 'OUI ✅' : 'NON ❌'}`)

if (!audaSansPlanningType) {
  console.log('\n🔍 PLANNING TYPES D\'AUDA:')
  const audaPlanningTypes = planningTypes.filter(pt => pt.formateur_id === auda.id)
  audaPlanningTypes.forEach(pt => {
    console.log(`   ${pt.jour} ${pt.creneau}: ${pt.statut} (validé: ${pt.valide})`)
  })
  
  const audaPlanningMardi = planningTypes.filter(pt => pt.formateur_id === auda.id && pt.jour === 'Mardi')
  console.log(`\nPlanning types d'Auda pour MARDI: ${audaPlanningMardi.length}`)
  audaPlanningMardi.forEach(pt => {
    console.log(`   ${pt.jour} ${pt.creneau}: ${pt.statut} (validé: ${pt.valide})`)
  })
}

// 4. Test isFormateurAbsent
const { data: absences } = await supabase
  .from('absences_formateurs')
  .select('*')
  .eq('statut', 'validé')

const isFormateurAbsent = (formateurId, dateStr) => {
    // Dispo except d'abord
    const dispoExcept = absences.find(absence => {
        if (absence.formateur_id !== formateurId) return false;
        if (absence.type !== 'formation') return false;
        
        const dateDebut = new Date(absence.date_debut + 'T00:00:00');
        const dateFin = new Date(absence.date_fin + 'T23:59:59');
        const dateCheck = new Date(dateStr + 'T12:00:00');
        
        return dateCheck >= dateDebut && dateCheck <= dateFin;
    });
    
    if (dispoExcept) {
        return false;
    }
    
    // Absence normale
    const absenceJour = absences.find(absence => {
        if (absence.formateur_id !== formateurId) return false;
        if (absence.type === 'formation') return false;
        
        const dateDebut = new Date(absence.date_debut + 'T00:00:00');
        const dateFin = new Date(absence.date_fin + 'T23:59:59');
        const dateCheck = new Date(dateStr + 'T12:00:00');
        
        return dateCheck >= dateDebut && dateCheck <= dateFin;
    });
    
    return !!absenceJour;
};

if (audaSansPlanningType) {
  console.log(`\n🚫 TEST isFormateurAbsent pour Auda le 2025-09-02:`)
  const audaAbsente = isFormateurAbsent(auda.id, '2025-09-02')
  console.log(`Résultat: ${audaAbsente ? 'ABSENTE ❌' : 'PAS ABSENTE ✅'}`)
  
  if (!audaAbsente) {
    console.log('✅ Auda devrait passer le filtre absence et arriver à hasDispoExceptionnelle !')
  }
}

console.log('\n📊 RÉSUMÉ:')
console.log(`1. Auda dans formateurs: ${auda ? 'OUI' : 'NON'}`)
console.log(`2. Auda sans planning mardi: ${audaSansPlanningType ? 'OUI' : 'NON'}`)
if (audaSansPlanningType) {
  const audaAbsente = isFormateurAbsent(auda.id, '2025-09-02')
  console.log(`3. Auda absente le 02/09: ${audaAbsente ? 'OUI' : 'NON'}`)
  console.log(`4. Auda devrait apparaître: ${!audaAbsente ? 'OUI ✅' : 'NON ❌'}`)
}

process.exit(0)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw'

// Client admin 
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Client normal pour test
const supabaseAnon = createClient(supabaseUrl, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic')

console.log('🔧 DIAGNOSTIC DÉTAILLÉ RLS\n')
console.log('=' .repeat(60))

// Test 1: Vérifier l'état actuel RLS
console.log('1. TEST INSERTION AVEC CLIENT NORMAL (anon):')
const testData1 = {
    formateur_id: 'test-' + Date.now(),
    jour: 'Lundi',
    creneau: 'matin',
    statut: 'disponible',
    lieu_id: null,
    valide: false
}

const { error: errorAnon } = await supabaseAnon
    .from('planning_type_formateurs')
    .insert(testData1)

if (errorAnon) {
    console.log(`   ❌ Échec: ${errorAnon.message}`)
    console.log('   → RLS ACTIF et bloquant\n')
} else {
    console.log('   ✅ Succès - RLS désactivé\n')
}

// Test 2: Avec service role
console.log('2. TEST INSERTION AVEC SERVICE ROLE (admin):')
const testData2 = {
    formateur_id: 'admin-test-' + Date.now(),
    jour: 'Mardi',
    creneau: 'AM',
    statut: 'disponible',
    lieu_id: null,
    valide: false
}

const { error: errorAdmin } = await supabaseAdmin
    .from('planning_type_formateurs')
    .insert(testData2)

if (errorAdmin) {
    console.log(`   ❌ Échec même avec admin: ${errorAdmin.message}`)
} else {
    console.log('   ✅ Succès avec admin - Le service_role contourne RLS\n')
    
    // Nettoyer
    await supabaseAdmin
        .from('planning_type_formateurs')
        .delete()
        .eq('formateur_id', testData2.formateur_id)
}

console.log('=' .repeat(60))
console.log('🎯 SOLUTION IMMÉDIATE:\n')

console.log('⚠️  Les RLS sont TOUJOURS ACTIFS sur planning_type_formateurs')
console.log('')
console.log('VOUS DEVEZ les désactiver manuellement dans Supabase:')
console.log('')
console.log('📋 MÉTHODE 1 - Interface Supabase (Recommandé):')
console.log('1. Allez sur https://supabase.com/dashboard/project/mkbchdhbgdynxwfhpxbw')
console.log('2. Cliquez sur "Database" dans le menu gauche')
console.log('3. Cliquez sur "Tables"')
console.log('4. Trouvez "planning_type_formateurs"')
console.log('5. Cliquez dessus')
console.log('6. Allez dans l\'onglet "Policies"')
console.log('7. Cliquez sur le bouton "Disable RLS" en haut à droite')
console.log('')
console.log('📋 MÉTHODE 2 - SQL Editor:')
console.log('1. Allez dans "SQL Editor" dans Supabase')
console.log('2. Collez et exécutez ce SQL:')
console.log('')
console.log('```sql')
console.log('-- Désactiver RLS sur planning_type_formateurs')
console.log('ALTER TABLE planning_type_formateurs DISABLE ROW LEVEL SECURITY;')
console.log('')
console.log('-- Vérifier que c\'est bien désactivé')
console.log('SELECT tablename, rowsecurity')
console.log('FROM pg_tables')
console.log('WHERE tablename = \'planning_type_formateurs\';')
console.log('-- Doit retourner: rowsecurity = false')
console.log('```')
console.log('')
console.log('=' .repeat(60))
console.log('💡 ALTERNATIVE TEMPORAIRE (si urgent):')
console.log('')
console.log('Je peux modifier l\'API pour utiliser supabaseAdmin (service_role)')
console.log('au lieu du client normal dans planning-formateur-type.js')
console.log('Mais c\'est une solution temporaire, mieux vaut désactiver RLS.')

process.exit(0)
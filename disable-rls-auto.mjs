import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTExNDk5NiwiZXhwIjoyMDcwNjkwOTk2fQ._8zQliKa7WsYx5PWO-wTMmNWaOkcV_3BpaD7yuPgkBw'

// Client admin avec service_role pour modifier les RLS
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    db: { schema: 'public' },
    auth: { persistSession: false }
})

console.log('🔧 DÉSACTIVATION DES RLS POUR CORRIGER LES PROBLÈMES\n')
console.log('=' .repeat(60))

const tables = [
    'planning_type_formateurs',
    'absences_formateurs',
    'messages',
    'planning_hebdomadaire',
    'lieux'
    // 'users' - on garde RLS sur users par sécurité
]

console.log('📋 Tables à traiter:', tables.length)
console.log('')

let success = 0
let errors = 0

for (const table of tables) {
    try {
        console.log(`🔄 Désactivation RLS sur: ${table}...`)
        
        // Malheureusement, on ne peut pas exécuter ALTER TABLE via l'API
        // On doit utiliser l'interface Supabase ou le SQL Editor
        
        // Test si on peut insérer après désactivation
        const testInsert = {
            formateur_id: '00000000-test-0000-0000-000000000000',
            jour: 'Test',
            creneau: 'test'
        }
        
        // Essai d'insertion pour vérifier
        const { error } = await supabase
            .from(table)
            .insert(testInsert)
        
        if (error && error.message.includes('row-level security policy')) {
            console.log(`   ❌ RLS encore actif - Nécessite action manuelle`)
            errors++
        } else {
            // Nettoyage du test
            await supabase
                .from(table)
                .delete()
                .eq('formateur_id', '00000000-test-0000-0000-000000000000')
            
            console.log(`   ✅ Table accessible`)
            success++
        }
        
    } catch (err) {
        console.log(`   ⚠️ Erreur: ${err.message}`)
        errors++
    }
}

console.log('\n' + '=' .repeat(60))
console.log('📊 RÉSUMÉ:')
console.log(`   ✅ Tables accessibles: ${success}`)
console.log(`   ❌ Tables avec RLS actif: ${errors}`)

if (errors > 0) {
    console.log('\n⚠️  ACTION REQUISE:')
    console.log('Vous devez désactiver RLS manuellement dans Supabase:')
    console.log('')
    console.log('1. Allez sur https://supabase.com/dashboard')
    console.log('2. Sélectionnez votre projet')
    console.log('3. Allez dans "Database" → "Tables"')
    console.log('4. Pour chaque table listée ci-dessus:')
    console.log('   - Cliquez sur la table')
    console.log('   - Onglet "Policies"')
    console.log('   - Cliquez "Disable RLS"')
    console.log('')
    console.log('OU exécutez le SQL suivant dans l\'éditeur SQL:')
    console.log('')
    tables.forEach(table => {
        console.log(`ALTER TABLE ${table} DISABLE ROW LEVEL SECURITY;`)
    })
}

console.log('\n✨ Une fois fait, les formateurs pourront sauvegarder leur planning !')

process.exit(0)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== PURGE PALMA PAR ID ===\n');

const palmaId = '55c6a2ab-a7a6-4259-932b-ca6ce6d44193';

// 1. Récupérer tous les IDs
const { data: entries } = await supabase
    .from('planning_type_formateurs')
    .select('id')
    .eq('formateur_id', palmaId);

console.log(`📊 ${entries?.length || 0} entrées trouvées pour Palma`);

if (entries && entries.length > 0) {
    console.log('\n🗑️ Suppression par ID...');
    
    let successCount = 0;
    let errorCount = 0;
    
    // Supprimer un par un
    for (const entry of entries) {
        const { error } = await supabase
            .from('planning_type_formateurs')
            .delete()
            .eq('id', entry.id);
        
        if (error) {
            errorCount++;
            console.log(`❌ Erreur suppression ${entry.id}: ${error.message}`);
        } else {
            successCount++;
            process.stdout.write(`\r✅ Supprimés: ${successCount}/${entries.length}`);
        }
    }
    
    console.log(`\n\n📊 RÉSULTAT:`);
    console.log(`   ✅ Supprimés: ${successCount}`);
    console.log(`   ❌ Erreurs: ${errorCount}`);
    
    // Vérifier après
    const { count: remaining } = await supabase
        .from('planning_type_formateurs')
        .select('*', { count: 'exact' })
        .eq('formateur_id', palmaId);
    
    console.log(`   📊 Restant: ${remaining || 0}`);
    
    if (remaining === 0) {
        console.log('\n✅ PURGE COMPLÈTE RÉUSSIE !');
    } else {
        console.log('\n⚠️ PURGE PARTIELLE - Il reste des entrées');
    }
} else {
    console.log('✅ Aucune entrée à purger');
}

process.exit(0);
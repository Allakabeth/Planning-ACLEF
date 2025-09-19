import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== NETTOYAGE FINAL TOUS DOUBLONS ===\n');
console.log('⚠️  ASSUREZ-VOUS QUE LES RLS SONT DÉSACTIVÉES DANS SUPABASE\n');

// Récupérer TOUTES les entrées
const { data: allData } = await supabase
    .from('planning_type_formateurs')
    .select('*')
    .order('formateur_id')
    .order('jour')
    .order('creneau')
    .order('updated_at', { ascending: false });

if (!allData || allData.length === 0) {
    console.log('Aucune donnée trouvée');
    process.exit(0);
}

console.log(`📊 Total entrées dans la table: ${allData.length}\n`);

// Grouper par formateur-jour-creneau
const grouped = {};
const formateurs = new Set();

allData.forEach(row => {
    formateurs.add(row.formateur_id);
    const key = `${row.formateur_id}|${row.jour}|${row.creneau}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
});

console.log(`👥 Nombre de formateurs: ${formateurs.size}`);
console.log(`📅 Nombre de créneaux uniques: ${Object.keys(grouped).length}`);
console.log(`⚠️  Doublons détectés: ${allData.length - Object.keys(grouped).length}\n`);

// Identifier les doublons à supprimer
const toDelete = [];
let formateurStats = {};

Object.keys(grouped).forEach(key => {
    const rows = grouped[key];
    const [formateurId] = key.split('|');
    
    if (!formateurStats[formateurId]) {
        formateurStats[formateurId] = { total: 0, doublons: 0 };
    }
    formateurStats[formateurId].total += rows.length;
    
    if (rows.length > 1) {
        formateurStats[formateurId].doublons += rows.length - 1;
        
        // Garder la plus récente (déjà triée par updated_at DESC)
        const keeper = rows[0];
        
        // Supprimer les autres
        for (let i = 1; i < rows.length; i++) {
            toDelete.push(rows[i].id);
        }
    }
});

// Afficher stats par formateur avec doublons
console.log('📊 FORMATEURS AVEC DOUBLONS:');
Object.entries(formateurStats)
    .filter(([_, stats]) => stats.doublons > 0)
    .sort((a, b) => b[1].doublons - a[1].doublons)
    .slice(0, 10)
    .forEach(([formateurId, stats]) => {
        console.log(`   ${formateurId.substring(0, 8)}... : ${stats.total} entrées (${stats.doublons} doublons)`);
    });

if (toDelete.length > 0) {
    console.log(`\n🗑️  Suppression de ${toDelete.length} doublons...`);
    
    // Supprimer par batch
    let deleted = 0;
    const batchSize = 50;
    
    for (let i = 0; i < toDelete.length; i += batchSize) {
        const batch = toDelete.slice(i, i + batchSize);
        
        const { error, count } = await supabase
            .from('planning_type_formateurs')
            .delete({ count: 'exact' })
            .in('id', batch);
        
        if (error) {
            console.error(`❌ Erreur batch ${Math.floor(i/batchSize) + 1}:`, error.message);
        } else {
            deleted += count || batch.length;
            process.stdout.write(`\r   Supprimés: ${deleted}/${toDelete.length}`);
        }
    }
    
    console.log('\n\n✅ Nettoyage terminé !');
    
    // Vérifier le résultat
    const { count: finalCount } = await supabase
        .from('planning_type_formateurs')
        .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 RÉSULTAT FINAL:`);
    console.log(`   Entrées avant: ${allData.length}`);
    console.log(`   Entrées après: ${finalCount}`);
    console.log(`   Supprimées: ${allData.length - finalCount}`);
} else {
    console.log('\n✅ Aucun doublon trouvé !');
}

console.log('\n⚠️  N\'OUBLIEZ PAS DE RÉACTIVER LES RLS DANS SUPABASE !');

process.exit(0);
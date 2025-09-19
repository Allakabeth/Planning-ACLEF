import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('=== NETTOYAGE DOUBLONS PLANNING TYPE ===\n');

// Récupérer tous les formateurs avec doublons potentiels
const { data: allData } = await supabase
    .from('planning_type_formateurs')
    .select('*')
    .order('formateur_id', { ascending: true })
    .order('jour', { ascending: true })
    .order('creneau', { ascending: true })
    .order('updated_at', { ascending: false }); // Plus récent en premier

if (!allData || allData.length === 0) {
    console.log('Aucune donnée à nettoyer');
    process.exit(0);
}

// Grouper par formateur-jour-creneau
const grouped = {};
allData.forEach(row => {
    const key = `${row.formateur_id}|${row.jour}|${row.creneau}`;
    if (!grouped[key]) {
        grouped[key] = [];
    }
    grouped[key].push(row);
});

// Identifier les doublons
const toDelete = [];
let countDoublons = 0;

Object.keys(grouped).forEach(key => {
    const rows = grouped[key];
    if (rows.length > 1) {
        countDoublons++;
        console.log(`Doublon détecté: ${key}`);
        console.log(`  ${rows.length} entrées trouvées`);
        
        // Garder la plus récente ET validée si possible
        const validee = rows.find(r => r.valide === true);
        const aGarder = validee || rows[0]; // Si pas de validée, garder la plus récente
        
        console.log(`  → Garder: id=${aGarder.id}, statut=${aGarder.statut}, valide=${aGarder.valide}`);
        
        // Marquer les autres pour suppression
        rows.forEach(row => {
            if (row.id !== aGarder.id) {
                toDelete.push(row.id);
                console.log(`  → Supprimer: id=${row.id}`);
            }
        });
    }
});

console.log(`\n=== RÉSUMÉ ===`);
console.log(`Total entrées: ${allData.length}`);
console.log(`Doublons trouvés: ${countDoublons}`);
console.log(`Entrées à supprimer: ${toDelete.length}`);

if (toDelete.length > 0) {
    console.log('\nSuppression des doublons...');
    
    // Supprimer par batch de 100
    for (let i = 0; i < toDelete.length; i += 100) {
        const batch = toDelete.slice(i, i + 100);
        const { error } = await supabase
            .from('planning_type_formateurs')
            .delete()
            .in('id', batch);
        
        if (error) {
            console.error(`Erreur suppression batch ${i/100 + 1}:`, error);
        } else {
            console.log(`✅ Batch ${i/100 + 1} supprimé (${batch.length} entrées)`);
        }
    }
    
    console.log('\n✅ Nettoyage terminé !');
} else {
    console.log('\n✅ Aucun doublon à nettoyer');
}

process.exit(0);
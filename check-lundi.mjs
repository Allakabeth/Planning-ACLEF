console.log('=== DIAGNOSTIC LUNDI ===');
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Récupérer les données de cette semaine
const now = new Date();
const startOfWeek = new Date(now);
startOfWeek.setDate(now.getDate() - now.getDay() + 1);

const weekDates = [];
for (let i = 0; i < 5; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    weekDates.push(`${year}-${month}-${day}`);
}

console.log('Dates de la semaine:', weekDates);
console.log('Date du lundi:', weekDates[0]);

// Récupérer TOUTES les données (sans order)
const { data: dataNoOrder } = await supabase
    .from('planning_hebdomadaire')
    .select('*')
    .in('date', weekDates);

// Récupérer avec order by created_at desc
const { data: dataWithOrder } = await supabase
    .from('planning_hebdomadaire')
    .select('*')
    .in('date', weekDates)
    .order('created_at', { ascending: false });

console.log('\n=== DONNÉES SANS ORDER ===');
const lundiNoOrder = dataNoOrder?.filter(d => d.jour === 'Lundi');
console.log(`Nombre d'entrées pour Lundi: ${lundiNoOrder?.length || 0}`);
lundiNoOrder?.forEach(item => {
    console.log(`  - ${item.creneau} | lieu_index: ${item.lieu_index} | formateurs: ${JSON.stringify(item.formateurs_ids)}`);
});

console.log('\n=== DONNÉES AVEC ORDER BY created_at DESC ===');
const lundiWithOrder = dataWithOrder?.filter(d => d.jour === 'Lundi');
console.log(`Nombre d'entrées pour Lundi: ${lundiWithOrder?.length || 0}`);
lundiWithOrder?.forEach(item => {
    console.log(`  - ${item.creneau} | lieu_index: ${item.lieu_index} | formateurs: ${JSON.stringify(item.formateurs_ids)}`);
});

// Vérifier s'il y a des doublons
console.log('\n=== RECHERCHE DE DOUBLONS ===');
const grouped = {};
dataNoOrder?.forEach(item => {
    const key = `${item.jour}-${item.creneau}-${item.lieu_index}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
});

let doublonsFound = false;
Object.entries(grouped).forEach(([key, items]) => {
    if (items.length > 1) {
        doublonsFound = true;
        console.log(`DOUBLON trouvé pour ${key}:`);
        items.forEach(item => {
            console.log(`  - created_at: ${item.created_at} | formateurs: ${JSON.stringify(item.formateurs_ids)}`);
        });
    }
});

if (!doublonsFound) {
    console.log('Aucun doublon trouvé');
}

process.exit(0);
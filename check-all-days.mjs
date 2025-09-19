console.log('=== ANALYSE COMPLÈTE DES JOURS ===');
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

const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

// Récupérer toutes les données
const { data } = await supabase
    .from('planning_hebdomadaire')
    .select('*')
    .in('date', weekDates)
    .order('created_at', { ascending: false });

console.log('Total entrées:', data?.length || 0);

// Analyser par jour
jours.forEach((jour, index) => {
    console.log(`\n=== ${jour} (${weekDates[index]}) ===`);
    const dataJour = data?.filter(d => d.jour === jour) || [];
    console.log(`Nombre d'entrées: ${dataJour.length}`);
    
    // Grouper par lieu_index
    const byLieuIndex = {};
    dataJour.forEach(item => {
        const idx = item.lieu_index || 0;
        if (!byLieuIndex[idx]) byLieuIndex[idx] = [];
        byLieuIndex[idx].push(item);
    });
    
    Object.entries(byLieuIndex).forEach(([lieuIndex, items]) => {
        console.log(`  Lieu index ${lieuIndex}:`);
        items.forEach(item => {
            const formCount = item.formateurs_ids?.length || 0;
            console.log(`    - ${item.creneau}: ${formCount} formateur(s)`);
            if (formCount > 0) {
                console.log(`      IDs: ${JSON.stringify(item.formateurs_ids)}`);
            }
        });
    });
});

process.exit(0);
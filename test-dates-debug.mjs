// Test des fonctions de calcul de dates

// Version planning-coordo
function getWeekDatesCoordо(currentDate) {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
    
    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        weekDates.push(currentDay.toISOString().split('T')[0]);
    }
    return weekDates;
}

// Version planning-hebdo ANCIENNE
function getWeekDatesHebdo(date) {
    const startOfWeek = new Date(date)
    const day = startOfWeek.getDay()
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1) // Lundi = début de semaine
    startOfWeek.setDate(diff)

    const dates = []
    for (let i = 0; i < 5; i++) { // Lundi à Vendredi
        const currentDate = new Date(startOfWeek)
        currentDate.setDate(startOfWeek.getDate() + i)
        dates.push(currentDate.toISOString().split('T')[0])
    }
    return dates
}

console.log('🗓️  TEST DES CALCULS DE DATES')
console.log('==============================')

// Test avec une date de la semaine du 1er septembre 2025
const testDate = new Date('2025-09-01T12:00:00') // Lundi 1er septembre
console.log(`📅 Date de test: ${testDate.toISOString().split('T')[0]} (${testDate.toLocaleDateString('fr-FR', { weekday: 'long' })})`)

console.log('\n🔧 Version Planning-Coordo:')
const coordoDates = getWeekDatesCoordо(testDate)
coordoDates.forEach((date, index) => {
  const d = new Date(date + 'T12:00:00')
  console.log(`  ${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][index]}: ${date} (${d.toLocaleDateString('fr-FR', { weekday: 'long' })})`)
})

console.log('\n🔧 Version Planning-Hebdo ANCIENNE:')
const hebdoDates = getWeekDatesHebdo(testDate)
hebdoDates.forEach((date, index) => {
  const d = new Date(date + 'T12:00:00')
  console.log(`  ${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][index]}: ${date} (${d.toLocaleDateString('fr-FR', { weekday: 'long' })})`)
})

console.log('\n🎯 COMPARAISON:')
for (let i = 0; i < 5; i++) {
  const coordo = coordoDates[i]
  const hebdo = hebdoDates[i]
  const match = coordo === hebdo ? '✅' : '❌'
  console.log(`  ${['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][i]}: Coordo=${coordo} vs Hebdo=${hebdo} ${match}`)
}
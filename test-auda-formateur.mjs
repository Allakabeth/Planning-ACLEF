import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://mkbchdhbgdynxwfhpxbw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1rYmNoZGhiZ2R5bnh3ZmhweGJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMTQ5OTYsImV4cCI6MjA3MDY5MDk5Nn0.vvJBJtX9H1vakOwqhDEt_yYJcp_giBY50PMggJ7YZic'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 TEST CONNEXION FORMATEUR - AUDA WELSCH\n')

// 1. Trouver Auda
const { data: users } = await supabase
  .from('users')
  .select('*')
  .ilike('nom', '%welsch%')
  .eq('role', 'formateur')

const auda = users[0]
console.log(`✅ Auda trouvée:`)
console.log(`  Prénom: ${auda.prenom}`)
console.log(`  Nom: ${auda.nom}`)
console.log(`  ID: ${auda.id}`)
console.log(`  Email: ${auda.email || 'Pas d\'email'}`)
console.log(`  Archivé: ${auda.archive ? '❌' : '✅ Non'}`)
console.log(`  Password hash: ${auda.password_hash ? 'Existe' : 'Vide'}`)

console.log('\n📋 IDENTIFIANTS DE CONNEXION:')
console.log('  Username: auda (prénom en minuscules)')
console.log('  Password: welsch (nom en minuscules pour première connexion)')

if (auda.password_hash) {
  console.log('  ⚠️  Un mot de passe personnalisé existe déjà')
}

console.log('\n🔧 SOLUTION POUR CRÉER LE PLANNING TYPE:')
console.log('1. Auda doit se connecter sur /formateur/login')
console.log('2. Aller dans "Mon planning type"')
console.log('3. Déclarer ses disponibilités pour chaque jour')
console.log('4. Cliquer sur "Enregistrer et envoyer"')
console.log('5. L\'admin pourra ensuite valider dans "Valider planning formateurs"')

console.log('\n💡 ALTERNATIVE - CRÉATION MANUELLE PAR ADMIN:')
console.log('Je peux créer un script pour insérer directement le planning type d\'Auda')
console.log('Voulez-vous que je crée ses disponibilités mardi ?')

process.exit(0)
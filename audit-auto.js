const fs = require('fs');
const path = require('path');

// 🔍 AUDIT AUTOMATISÉ LOCAL vs VERCEL
console.log('🚀 DÉMARRAGE AUDIT AUTOMATISÉ - LOCAL vs VERCEL');
console.log('='.repeat(60));

const LOCAL_BASE = 'C:/Projet ACLEF/projet-aclef-planning-v8';
const VERCEL_BASE = 'C:/Projet ACLEF/projet-aclef-planning-v6'; // Supposé être le code Vercel

// Fichiers critiques à auditer en priorité
const FICHIERS_CRITIQUES = [
    // API AUTH
    'pages/api/auth/formateur/refresh.js',
    'pages/api/auth/formateur/verify.js', 
    'pages/api/auth/formateur/login.js',
    'pages/api/auth/formateur/logout.js',
    'pages/api/auth/formateur/change-password.js',
    'pages/api/formateur/update-password.js',
    'pages/api/admin-auth.js',
    
    // PAGES PRINCIPALES
    'pages/planning-coordo.js',
    'pages/formateur/planning-formateur-type.js',
    'pages/planning-type-formateurs.js',
    'pages/index.js',
    
    // CONTEXTS & CONFIG
    'contexts/FormateurAuthContext.js',
    'lib/jwt.js',
    'lib/supabaseClient.js',
    'lib/supabaseAdmin.js',
    
    // COMPONENTS
    'components/withAuthAdmin.js',
    'components/withAuthFormateur.js',
    'components/MessagerieDashboard.js',
    'components/MessagerieSafeWrapper.js',
    'components/MenuApprenants.js',
    'components/assistance/Absence.jsx',
    'components/assistance/MonPlanningHebdo.jsx'
];

// Fonction pour lire un fichier de manière sécurisée
function lireFichierSecurise(cheminFichier) {
    try {
        if (!fs.existsSync(cheminFichier)) {
            return { existe: false, contenu: null, taille: 0, erreur: 'Fichier non trouvé' };
        }
        
        const stats = fs.statSync(cheminFichier);
        const contenu = fs.readFileSync(cheminFichier, 'utf8');
        
        return {
            existe: true,
            contenu: contenu,
            taille: stats.size,
            lignes: contenu.split('\n').length,
            erreur: null
        };
        
    } catch (error) {
        return { 
            existe: false, 
            contenu: null, 
            taille: 0, 
            lignes: 0,
            erreur: error.message 
        };
    }
}

// Fonction pour comparer deux fichiers
function comparerFichiers(fichierLocal, fichierVercel) {
    const local = lireFichierSecurise(fichierLocal);
    const vercel = lireFichierSecurise(fichierVercel);
    
    // Cas: fichier n'existe que localement
    if (local.existe && !vercel.existe) {
        return {
            statut: 'LOCAL_SEULEMENT',
            local: local,
            vercel: vercel,
            identique: false,
            message: 'Fichier existe seulement en local'
        };
    }
    
    // Cas: fichier n'existe que sur Vercel  
    if (!local.existe && vercel.existe) {
        return {
            statut: 'VERCEL_SEULEMENT',
            local: local,
            vercel: vercel,
            identique: false,
            message: 'Fichier existe seulement sur Vercel'
        };
    }
    
    // Cas: fichier n'existe ni local ni Vercel
    if (!local.existe && !vercel.existe) {
        return {
            statut: 'INEXISTANT',
            local: local,
            vercel: vercel,
            identique: false,
            message: 'Fichier n\'existe nulle part'
        };
    }
    
    // Cas: les deux fichiers existent - comparaison
    const identique = local.contenu === vercel.contenu;
    const diffTaille = Math.abs(local.taille - vercel.taille);
    const diffLignes = Math.abs(local.lignes - vercel.lignes);
    
    return {
        statut: identique ? 'IDENTIQUE' : 'DIFFERENT',
        local: local,
        vercel: vercel,
        identique: identique,
        diffTaille: diffTaille,
        diffLignes: diffLignes,
        message: identique ? 
            'Fichiers parfaitement identiques' : 
            `Différences détectées (±${diffTaille} bytes, ±${diffLignes} lignes)`
    };
}

// 🎯 EXÉCUTION AUDIT PRINCIPAL
console.log('📋 Audit de', FICHIERS_CRITIQUES.length, 'fichiers critiques...\n');

let compteurs = {
    identiques: 0,
    differents: 0,
    localSeulement: 0,
    vercelSeulement: 0,
    inexistants: 0,
    erreurs: 0
};

let rapportDetaille = [];

// Parcourir tous les fichiers critiques
for (let i = 0; i < FICHIERS_CRITIQUES.length; i++) {
    const fichierRelatif = FICHIERS_CRITIQUES[i];
    const fichierLocal = path.join(LOCAL_BASE, fichierRelatif);
    const fichierVercel = path.join(VERCEL_BASE, fichierRelatif);
    
    console.log(`\n${i + 1}/${FICHIERS_CRITIQUES.length} 🔍 ${fichierRelatif}`);
    
    const resultat = comparerFichiers(fichierLocal, fichierVercel);
    
    // Affichage résultat
    let emoji = '❓';
    switch (resultat.statut) {
        case 'IDENTIQUE':
            emoji = '✅';
            compteurs.identiques++;
            break;
        case 'DIFFERENT':
            emoji = '⚠️';
            compteurs.differents++;
            break;
        case 'LOCAL_SEULEMENT':
            emoji = '🟡';
            compteurs.localSeulement++;
            break;
        case 'VERCEL_SEULEMENT':
            emoji = '🔴';
            compteurs.vercelSeulement++;
            break;
        case 'INEXISTANT':
            emoji = '⭕';
            compteurs.inexistants++;
            break;
        default:
            emoji = '❌';
            compteurs.erreurs++;
    }
    
    console.log(`   ${emoji} ${resultat.statut} - ${resultat.message}`);
    
    if (resultat.local.existe) {
        console.log(`      Local: ${resultat.local.lignes} lignes (${resultat.local.taille} bytes)`);
    }
    if (resultat.vercel.existe) {
        console.log(`      Vercel: ${resultat.vercel.lignes} lignes (${resultat.vercel.taille} bytes)`);
    }
    
    // Enregistrer pour rapport détaillé
    rapportDetaille.push({
        fichier: fichierRelatif,
        resultat: resultat
    });
}

// 📊 GÉNÉRATION RAPPORT FINAL
console.log('\n' + '='.repeat(60));
console.log('📊 RAPPORT FINAL D\'AUDIT AUTOMATISÉ');
console.log('='.repeat(60));

console.log('\n🎯 STATISTIQUES GLOBALES:');
console.log(`   ✅ Fichiers identiques: ${compteurs.identiques}`);
console.log(`   ⚠️  Fichiers différents: ${compteurs.differents}`);
console.log(`   🟡 Local seulement: ${compteurs.localSeulement}`);
console.log(`   🔴 Vercel seulement: ${compteurs.vercelSeulement}`);
console.log(`   ⭕ Inexistants: ${compteurs.inexistants}`);
console.log(`   ❌ Erreurs: ${compteurs.erreurs}`);

const total = compteurs.identiques + compteurs.differents + compteurs.localSeulement + compteurs.vercelSeulement;
const tauxSynchro = total > 0 ? ((compteurs.identiques / total) * 100).toFixed(1) : 0;
console.log(`\n📈 Taux de synchronisation: ${tauxSynchro}% (${compteurs.identiques}/${total})`);

// 🚨 FICHIERS NÉCESSITANT ATTENTION
console.log('\n🚨 FICHIERS NÉCESSITANT ATTENTION:');
let attentionNecessaire = false;

rapportDetaille.forEach(item => {
    if (item.resultat.statut !== 'IDENTIQUE') {
        console.log(`   ${item.resultat.statut === 'DIFFERENT' ? '⚠️' : 
                      item.resultat.statut === 'LOCAL_SEULEMENT' ? '🟡' :
                      item.resultat.statut === 'VERCEL_SEULEMENT' ? '🔴' : '❌'} ${item.fichier}`);
        console.log(`      └── ${item.resultat.message}`);
        attentionNecessaire = true;
    }
});

if (!attentionNecessaire) {
    console.log('   🎉 Aucun fichier ne nécessite d\'attention - Tout est synchronisé !');
}

console.log('\n✨ Audit automatisé terminé !');
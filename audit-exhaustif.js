const fs = require('fs');
const path = require('path');

// 🔍 AUDIT EXHAUSTIF - TOUTE LA STRUCTURE LOCAL vs VERCEL  
console.log('🚀 AUDIT EXHAUSTIF - ANALYSE COMPLÈTE DE LA STRUCTURE');
console.log('='.repeat(80));

const LOCAL_BASE = 'C:/Projet ACLEF/projet-aclef-planning-v8';
const VERCEL_BASE = 'C:/Projet ACLEF/projet-aclef-planning-v6';

// Dossiers à exclure
const EXCLUSIONS = [
    'node_modules',
    '.next', 
    '.git',
    'dist',
    'build',
    'coverage',
    '.vercel',
    '.env.local',
    '.DS_Store'
];

// Extensions à auditer
const EXTENSIONS_PROJET = ['.js', '.jsx', '.json', '.md', '.css', '.ts', '.tsx', '.env'];

// Fonction pour parcourir récursivement un dossier
function parcourirDossier(dossier, basePath = '') {
    const fichiers = [];
    
    try {
        if (!fs.existsSync(dossier)) return fichiers;
        
        const elements = fs.readdirSync(dossier);
        
        for (const element of elements) {
            const cheminComplet = path.join(dossier, element);
            const cheminRelatif = path.join(basePath, element).replace(/\\/g, '/');
            
            // Ignorer les exclusions
            if (EXCLUSIONS.some(excl => cheminRelatif.includes(excl))) {
                continue;
            }
            
            const stats = fs.statSync(cheminComplet);
            
            if (stats.isDirectory()) {
                // Dossier - parcours récursif
                fichiers.push(...parcourirDossier(cheminComplet, cheminRelatif));
            } else if (stats.isFile()) {
                // Fichier - vérifier extension
                const ext = path.extname(element);
                if (EXTENSIONS_PROJET.includes(ext) || element === 'package.json' || element.startsWith('.env')) {
                    fichiers.push({
                        cheminRelatif: cheminRelatif,
                        cheminAbsolu: cheminComplet,
                        nom: element,
                        extension: ext,
                        taille: stats.size,
                        dateModif: stats.mtime
                    });
                }
            }
        }
    } catch (error) {
        console.error(`Erreur parcours ${dossier}:`, error.message);
    }
    
    return fichiers;
}

// Fonction pour comparer deux fichiers en détail
function comparerFichiersDetail(fichierLocal, fichierVercel) {
    const local = lireFichierSecurise(fichierLocal);
    const vercel = lireFichierSecurise(fichierVercel);
    
    // Cas: fichier n'existe que localement
    if (local.existe && !vercel.existe) {
        return {
            statut: 'LOCAL_SEULEMENT',
            local: local,
            vercel: vercel,
            identique: false,
            pourcentageSimilarite: 0,
            message: '🟡 Fichier existe seulement en local'
        };
    }
    
    // Cas: fichier n'existe que sur Vercel  
    if (!local.existe && vercel.existe) {
        return {
            statut: 'VERCEL_SEULEMENT',
            local: local,
            vercel: vercel,
            identique: false,
            pourcentageSimilarite: 0,
            message: '🔴 Fichier existe seulement sur Vercel'
        };
    }
    
    // Cas: fichier n'existe ni local ni Vercel
    if (!local.existe && !vercel.existe) {
        return {
            statut: 'INEXISTANT',
            local: local,
            vercel: vercel,
            identique: false,
            pourcentageSimilarite: 0,
            message: '⭕ Fichier n\'existe nulle part'
        };
    }
    
    // Cas: les deux fichiers existent - comparaison avancée
    const identique = local.contenu === vercel.contenu;
    const diffTaille = Math.abs(local.taille - vercel.taille);
    const diffLignes = Math.abs(local.lignes - vercel.lignes);
    
    // Calcul approximatif de la similarité
    let pourcentageSimilarite = 0;
    if (local.taille > 0 && vercel.taille > 0) {
        const tailleMin = Math.min(local.taille, vercel.taille);
        const tailleMax = Math.max(local.taille, vercel.taille);
        pourcentageSimilarite = Math.round((tailleMin / tailleMax) * 100);
    }
    
    let classification = '';
    let emoji = '';
    
    if (identique) {
        classification = 'IDENTIQUE';
        emoji = '✅';
    } else if (pourcentageSimilarite >= 95) {
        classification = 'QUASI_IDENTIQUE';
        emoji = '🟢';
    } else if (pourcentageSimilarite >= 80) {
        classification = 'SIMILAIRE';
        emoji = '🟡';
    } else if (pourcentageSimilarite >= 50) {
        classification = 'DIFFERENT';
        emoji = '🟠';
    } else {
        classification = 'TRES_DIFFERENT';
        emoji = '🔴';
    }
    
    return {
        statut: classification,
        local: local,
        vercel: vercel,
        identique: identique,
        diffTaille: diffTaille,
        diffLignes: diffLignes,
        pourcentageSimilarite: pourcentageSimilarite,
        message: identique ? 
            `${emoji} Fichiers parfaitement identiques` : 
            `${emoji} ${classification} - Similarité: ${pourcentageSimilarite}% (±${diffTaille} bytes, ±${diffLignes} lignes)`
    };
}

// Fonction pour lire un fichier de manière sécurisée (réutilisée)
function lireFichierSecurise(cheminFichier) {
    try {
        if (!fs.existsSync(cheminFichier)) {
            return { existe: false, contenu: null, taille: 0, lignes: 0, erreur: 'Fichier non trouvé' };
        }
        
        const stats = fs.statSync(cheminFichier);
        const contenu = fs.readFileSync(cheminFichier, 'utf8');
        
        return {
            existe: true,
            contenu: contenu,
            taille: stats.size,
            lignes: contenu.split('\n').length,
            dateModif: stats.mtime,
            erreur: null
        };
        
    } catch (error) {
        return { 
            existe: false, 
            contenu: null, 
            taille: 0, 
            lignes: 0,
            dateModif: null,
            erreur: error.message 
        };
    }
}

// 🎯 EXÉCUTION PRINCIPALE
console.log('📂 Analyse de la structure locale (v8)...');
const fichiersLocaux = parcourirDossier(LOCAL_BASE);
console.log(`   └─ ${fichiersLocaux.length} fichiers trouvés en local`);

console.log('📂 Analyse de la structure Vercel (v6)...');  
const fichiersVercel = parcourirDossier(VERCEL_BASE);
console.log(`   └─ ${fichiersVercel.length} fichiers trouvés sur Vercel`);

// Créer la liste complète des fichiers à auditer
const fichiersUniques = new Set();
fichiersLocaux.forEach(f => fichiersUniques.add(f.cheminRelatif));
fichiersVercel.forEach(f => fichiersUniques.add(f.cheminRelatif));

const fichiersList = Array.from(fichiersUniques).sort();

console.log(`\n📋 AUDIT EXHAUSTIF: ${fichiersList.length} fichiers uniques à comparer`);
console.log('='.repeat(80));

// Compteurs détaillés
let compteurs = {
    identiques: 0,
    quasiIdentiques: 0,
    similaires: 0,
    differents: 0,
    tresDifferents: 0,
    localSeulement: 0,
    vercelSeulement: 0,
    erreurs: 0
};

let rapportComplet = [];

// 🔍 COMPARAISON EXHAUSTIVE
for (let i = 0; i < fichiersList.length; i++) {
    const fichierRelatif = fichiersList[i];
    const fichierLocal = path.join(LOCAL_BASE, fichierRelatif);
    const fichierVercel = path.join(VERCEL_BASE, fichierRelatif);
    
    // Affichage progression
    const pourcentage = Math.round((i + 1) / fichiersList.length * 100);
    process.stdout.write(`\r🔄 Progression: ${pourcentage}% (${i + 1}/${fichiersList.length})`);
    
    const resultat = comparerFichiersDetail(fichierLocal, fichierVercel);
    
    // Comptabiliser
    switch (resultat.statut) {
        case 'IDENTIQUE':
            compteurs.identiques++;
            break;
        case 'QUASI_IDENTIQUE':
            compteurs.quasiIdentiques++;
            break;
        case 'SIMILAIRE':
            compteurs.similaires++;
            break;
        case 'DIFFERENT':
            compteurs.differents++;
            break;
        case 'TRES_DIFFERENT':
            compteurs.tresDifferents++;
            break;
        case 'LOCAL_SEULEMENT':
            compteurs.localSeulement++;
            break;
        case 'VERCEL_SEULEMENT':
            compteurs.vercelSeulement++;
            break;
        default:
            compteurs.erreurs++;
    }
    
    // Enregistrer pour rapport
    rapportComplet.push({
        fichier: fichierRelatif,
        resultat: resultat
    });
}

console.log('\n\n' + '='.repeat(80));
console.log('📊 RAPPORT EXHAUSTIF FINAL');
console.log('='.repeat(80));

// Statistiques globales
console.log('\n🎯 STATISTIQUES GLOBALES:');
console.log(`   ✅ Identiques: ${compteurs.identiques}`);
console.log(`   🟢 Quasi-identiques (95%+): ${compteurs.quasiIdentiques}`);
console.log(`   🟡 Similaires (80-94%): ${compteurs.similaires}`);
console.log(`   🟠 Différents (50-79%): ${compteurs.differents}`);
console.log(`   🔴 Très différents (<50%): ${compteurs.tresDifferents}`);
console.log(`   📄 Local seulement: ${compteurs.localSeulement}`);
console.log(`   📄 Vercel seulement: ${compteurs.vercelSeulement}`);
console.log(`   ❌ Erreurs: ${compteurs.erreurs}`);

const totalFichiers = fichiersList.length;
const fichiersSynchronises = compteurs.identiques + compteurs.quasiIdentiques;
const tauxSynchro = totalFichiers > 0 ? ((fichiersSynchronises / totalFichiers) * 100).toFixed(1) : 0;

console.log(`\n📈 TAUX DE SYNCHRONISATION GLOBAL: ${tauxSynchro}% (${fichiersSynchronises}/${totalFichiers})`);

// TOP 10 des différences les plus importantes
console.log('\n🚨 TOP 10 - DIFFÉRENCES LES PLUS IMPORTANTES:');
const differencesMajeures = rapportComplet
    .filter(item => ['DIFFERENT', 'TRES_DIFFERENT'].includes(item.resultat.statut))
    .sort((a, b) => {
        const diffA = a.resultat.diffTaille || 0;
        const diffB = b.resultat.diffTaille || 0;
        return diffB - diffA;
    })
    .slice(0, 10);

if (differencesMajeures.length === 0) {
    console.log('   🎉 Aucune différence majeure détectée !');
} else {
    differencesMajeures.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.fichier}`);
        console.log(`      ${item.resultat.message}`);
        console.log(`      Local: ${item.resultat.local.lignes || 0} lignes, Vercel: ${item.resultat.vercel.lignes || 0} lignes`);
    });
}

// Fichiers uniques (existence seulement locale ou Vercel)
console.log('\n📄 FICHIERS UNIQUES:');
const fichiersUniquesLocal = rapportComplet.filter(item => item.resultat.statut === 'LOCAL_SEULEMENT');
const fichiersUniquesVercel = rapportComplet.filter(item => item.resultat.statut === 'VERCEL_SEULEMENT');

if (fichiersUniquesLocal.length > 0) {
    console.log(`\n🟡 Fichiers existant SEULEMENT en local (${fichiersUniquesLocal.length}):`);
    fichiersUniquesLocal.slice(0, 20).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.fichier}`);
    });
    if (fichiersUniquesLocal.length > 20) {
        console.log(`   ... et ${fichiersUniquesLocal.length - 20} autres`);
    }
}

if (fichiersUniquesVercel.length > 0) {
    console.log(`\n🔴 Fichiers existant SEULEMENT sur Vercel (${fichiersUniquesVercel.length}):`);
    fichiersUniquesVercel.slice(0, 20).forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.fichier}`);
    });
    if (fichiersUniquesVercel.length > 20) {
        console.log(`   ... et ${fichiersUniquesVercel.length - 20} autres`);
    }
}

console.log('\n✨ Audit exhaustif terminé !');
console.log(`📄 Rapport complet disponible dans la variable 'rapportComplet' (${rapportComplet.length} éléments)`);

// Sauvegarder le rapport détaillé
const rapportJSON = {
    timestamp: new Date().toISOString(),
    statistiques: compteurs,
    tauxSynchronisation: parseFloat(tauxSynchro),
    totalFichiers: totalFichiers,
    differencesMajeures: differencesMajeures,
    fichiersUniquesLocal: fichiersUniquesLocal.map(item => item.fichier),
    fichiersUniquesVercel: fichiersUniquesVercel.map(item => item.fichier),
    rapportComplet: rapportComplet
};

try {
    fs.writeFileSync('audit-exhaustif-rapport.json', JSON.stringify(rapportJSON, null, 2));
    console.log('💾 Rapport détaillé sauvegardé: audit-exhaustif-rapport.json');
} catch (error) {
    console.error('❌ Erreur sauvegarde rapport:', error.message);
}
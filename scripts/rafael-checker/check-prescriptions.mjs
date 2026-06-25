// ============================================================
// Verification automatique des nouvelles prescriptions Rafael
// Connexion CAS, lecture du compteur "En attente" du tableau resume,
// puis insertion d'un message dans la messagerie ACLEF si nouveau.
// ============================================================

import https from 'https';
import { URL } from 'url';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

// --- Configuration depuis variables d'environnement ---
const RAFAEL_EMAIL = process.env.RAFAEL_EMAIL;
const RAFAEL_PASSWORD = process.env.RAFAEL_PASSWORD;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!RAFAEL_EMAIL || !RAFAEL_PASSWORD || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    process.stderr.write('Variables d\'environnement manquantes\n');
    process.exit(1);
}

// Sessions HSP de l'ACLEF avec leur reference Rafael
const SESSIONS_HSP = [
    { lieu: 'CCP', ref: '00550837' },
    { lieu: 'MPT', ref: '00550835' },
    { lieu: 'Lencloitre', ref: '00550838' },
    { lieu: 'Pleumartin', ref: '00550836' }
];

const RAFAEL_URL = 'https://rafael.cap-metiers.pro/preinscription/accueil';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- Gestion des cookies ---
const cookieJar = {};

function updateCookies(headers) {
    const setCookies = headers['set-cookie'];
    if (!setCookies) return;
    const arr = Array.isArray(setCookies) ? setCookies : [setCookies];
    arr.forEach(h => {
        const pair = h.split(';')[0];
        const idx = pair.indexOf('=');
        if (idx > 0) {
            cookieJar[pair.substring(0, idx).trim()] = pair.substring(idx + 1).trim();
        }
    });
}

function cookieString() {
    return Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');
}

// --- Requete HTTP avec gestion cookies ---
function httpRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const reqOpts = {
            hostname: parsed.hostname,
            port: 443,
            path: parsed.pathname + parsed.search,
            method: options.method || 'GET',
            headers: {
                'Cookie': cookieString(),
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                ...(options.headers || {})
            }
        };

        const req = https.request(reqOpts, (res) => {
            updateCookies(res.headers);
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body
            }));
        });

        req.on('error', reject);
        if (options.body) req.write(options.body);
        req.end();
    });
}

// --- Connexion CAS ---
async function loginCAS() {
    const serviceUrl = 'https://rafael.cap-metiers.pro/authentification/identifie_cas';
    const loginUrl = `https://sso.cap-metiers.pro/v2/users/login?service=${encodeURIComponent(serviceUrl)}`;

    // 1. GET page de login
    const pageRes = await httpRequest(loginUrl);

    // Parser les champs hidden du formulaire
    const $ = cheerio.load(pageRes.body);
    const formFields = {};
    $('form input[type="hidden"]').each((i, el) => {
        const name = $(el).attr('name');
        const value = $(el).attr('value') || '';
        if (name) formFields[name] = value;
    });

    // 2. POST credentials
    const postFields = {
        ...formFields,
        email: RAFAEL_EMAIL,
        password: RAFAEL_PASSWORD,
        service: serviceUrl
    };

    const postData = Object.entries(postFields)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

    const loginRes = await httpRequest(loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData).toString()
        },
        body: postData
    });

    // Si redirige vers /v2/users/login = echec
    const redirectsToLogin = loginRes.headers.location && loginRes.headers.location.includes('/v2/users/login');
    if (loginRes.status === 200 || redirectsToLogin) {
        process.stderr.write('Echec login CAS: identifiants incorrects\n');
        process.exit(1);
    }

    // 3. Suivre la chaine de redirections (CAS ticket -> Rafael session)
    if (loginRes.status >= 300 && loginRes.status < 400 && loginRes.headers.location) {
        const loc = loginRes.headers.location;
        const redirectUrl = loc.startsWith('http') ? loc : `https://sso.cap-metiers.pro${loc}`;

        let currentUrl = redirectUrl;
        for (let i = 0; i < 8; i++) {
            const res = await httpRequest(currentUrl);
            if (res.status >= 300 && res.status < 400 && res.headers.location) {
                const nextLoc = res.headers.location;
                currentUrl = nextLoc.startsWith('http') ? nextLoc : new URL(nextLoc, currentUrl).href;
            } else {
                break;
            }
        }
    }

    process.stdout.write('Connexion Rafael OK\n');
}

// --- Endpoint AJAX listant toutes les candidatures en cours ---
const CANDIDATURES_URL =
    'https://rafael.cap-metiers.pro/preinscription/getUpcomingAndCurrentCandidaturesList/?sEcho=1&iDisplayStart=0&iDisplayLength=500';

// Convertir une reference de session en nom de lieu connu
function lieuFromRef(ref) {
    const s = SESSIONS_HSP.find(x => x.ref === ref);
    return s ? s.lieu : (ref ? `Ref ${ref}` : 'Lieu inconnu');
}

// Extraire civilite + nom + prenom depuis le HTML de la colonne "Candidat"
// Ex: 'M. <b>DEMARCONNAY</b> né(e) <b>DEMARCONNAY</b><br>Jerome<br><span...'
function parseCandidat(html) {
    const civilite = (html.match(/^\s*([^<]*?)\s*<b>/) || [])[1] || '';
    const nom = (html.match(/<b>([^<]+)<\/b>/) || [])[1] || '';
    // Le prenom est le noeud texte entre le dernier </b><br> et le <br> suivant
    const prenom = (html.match(/<\/b>\s*<br>\s*([^<]+?)\s*<br>/i) || [])[1] || '';
    return `${civilite} ${nom} ${prenom}`.replace(/\s+/g, ' ').trim();
}

// --- Recuperer les candidatures dont l'etat est "En attente" ---
// Retourne un tableau d'objets { ref, nom, lieu }
async function fetchCandidatsEnAttente() {
    const res = await httpRequest(CANDIDATURES_URL, {
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json, text/javascript, */*; q=0.01'
        }
    });

    let data;
    try {
        data = JSON.parse(res.body);
    } catch (e) {
        throw new Error('Reponse candidatures non-JSON (login expire ?)');
    }

    const rows = data.aaData || [];
    const enAttente = [];

    for (const row of rows) {
        // Colonne 8 = Etat. On ne garde que "En attente".
        const etat = String(row[8] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!/en\s+attente/i.test(etat)) continue;

        // Colonne 0 = reference de la candidature (premier mot)
        const ref = String(row[0] || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/)[0];
        // Colonne 1 = candidat (HTML), Colonne 2 = session (contient "Ref: <session>")
        const nom = parseCandidat(String(row[1] || ''));
        const sessionRef = (String(row[2] || '').match(/Ref:\s*(\d+)/) || [])[1];
        const lieu = lieuFromRef(sessionRef);

        enAttente.push({ ref, nom, lieu });
    }

    return enAttente;
}

// --- Notifier ou tracker dans la messagerie ACLEF ---
async function notifier(candidats) {
    // Ensemble des references actuellement en attente
    const refsActuelles = candidats.map(c => c.ref).filter(Boolean).sort();

    // Recuperer le dernier message de tracking (visible ou cache)
    const { data: dernierMessage } = await supabase
        .from('messages')
        .select('contenu')
        .eq('type', 'prescription_rafael')
        .order('created_at', { ascending: false })
        .limit(1);

    // Extraire les references deja connues (format: [refs:a,b,c])
    let refsConnues = [];
    if (dernierMessage && dernierMessage[0]) {
        const m = dernierMessage[0].contenu.match(/\[refs:([^\]]*)\]/);
        if (m) refsConnues = m[1].split(',').map(s => s.trim()).filter(Boolean);
    }

    // Nouvelles references = en attente maintenant mais pas avant
    const nouveaux = candidats.filter(c => c.ref && !refsConnues.includes(c.ref));

    // Set identique -> rien a faire
    const memeSet =
        refsActuelles.length === refsConnues.length &&
        refsActuelles.every(r => refsConnues.includes(r));
    if (memeSet) {
        process.stdout.write(`En attente: ${refsActuelles.length} (inchange)\n`);
        return;
    }

    const isNotification = nouveaux.length > 0;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const heure = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const marqueur = `[refs:${refsActuelles.join(',')}]`;
    let objet, contenu;

    if (isNotification) {
        // Au moins une nouvelle prescription -> notification visible
        const liste = nouveaux.map(c => `• ${c.nom} — ${c.lieu}`).join('\n');
        const intro = nouveaux.length === 1
            ? 'Une nouvelle prescription en attente :'
            : `Vous avez ${nouveaux.length} nouvelles prescriptions en attente :`;
        objet = nouveaux.length === 1
            ? 'Nouvelle prescription HSP'
            : 'Nouvelles prescriptions HSP';
        contenu = `${intro}\n\n${liste}\n\nVoir sur Rafael : ${RAFAEL_URL}\n\n${marqueur}`;
    } else {
        // Uniquement des suppressions -> message tracking cache (archive + lu)
        objet = 'Tracking Rafael';
        contenu = `Liste des prescriptions en attente mise a jour (${refsActuelles.length} restante(s)).\n\n${marqueur}`;
    }

    const { error } = await supabase.from('messages').insert({
        expediteur_id: null,
        destinataire_id: null,
        expediteur: 'Rafael Cap Metiers',
        destinataire: 'Coordination ACLEF',
        objet,
        contenu,
        type: 'prescription_rafael',
        lu: !isNotification,        // visible si notif, deja lu si tracking
        archive: !isNotification,   // visible si notif, archive si tracking
        date,
        heure
    });

    if (error) {
        process.stderr.write(`Erreur insertion message: ${error.message}\n`);
        process.exit(1);
    }

    if (isNotification) {
        process.stdout.write(`Notification envoyee: ${nouveaux.length} nouvelle(s), ${refsActuelles.length} en attente au total\n`);
    } else {
        process.stdout.write(`Tracking mis a jour: ${refsActuelles.length} en attente\n`);
    }
}

// --- Main ---
async function main() {
    try {
        await loginCAS();
        const candidats = await fetchCandidatsEnAttente();
        process.stdout.write(`En attente: ${candidats.length}\n`);
        candidats.forEach(c => process.stdout.write(`  - ${c.nom} (${c.lieu})\n`));

        await notifier(candidats);
    } catch (error) {
        process.stderr.write(`Erreur: ${error.message}\n`);
        process.exit(1);
    }
}

main();

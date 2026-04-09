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

// --- Suivre les redirections ---
async function followRedirects(url, maxRedirects = 5) {
    let currentUrl = url;
    for (let i = 0; i < maxRedirects; i++) {
        const res = await httpRequest(currentUrl);
        if (res.status >= 300 && res.status < 400 && res.headers.location) {
            const loc = res.headers.location;
            currentUrl = loc.startsWith('http') ? loc : new URL(loc, currentUrl).href;
        } else {
            return res;
        }
    }
    return await httpRequest(currentUrl);
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

// --- Lire le compteur "En attente" du tableau resume ---
async function fetchEnAttente() {
    const accueilRes = await followRedirects(RAFAEL_URL);
    const $ = cheerio.load(accueilRes.body);

    let enAttente = 0;
    $('#tableInfoPendingTreatments tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        const textes = [];
        cells.each((j, cell) => textes.push($(cell).text().trim()));
        // Colonne "En attente" est la 3e (index 2)
        const attente = parseInt(textes[2]) || 0;
        enAttente += attente;
    });

    return enAttente;
}

// --- Tenter de detecter quel(s) lieu(x) ont des candidatures en attente ---
async function detecterLieux() {
    const lieuxAvecAttente = [];

    // Essayer plusieurs patterns d'URL pour chaque session
    const urlPatterns = [
        '/preinscription/sessions/{ref}',
        '/preinscription/session/{ref}',
        '/formation/sessions/view/{ref}',
        '/formation/sessions/{ref}',
        '/preinscription/candidatures/session/{ref}'
    ];

    for (const session of SESSIONS_HSP) {
        for (const pattern of urlPatterns) {
            const url = `https://rafael.cap-metiers.pro${pattern.replace('{ref}', session.ref)}`;
            try {
                const res = await httpRequest(url);
                if (res.status === 200 && res.body.length > 500 && !res.body.includes('non autorisé')) {
                    // Chercher "en attente" dans le contenu de la page
                    if (res.body.match(/en\s+attente/i)) {
                        lieuxAvecAttente.push(session.lieu);
                        break;
                    }
                }
            } catch (e) { /* ignore */ }
        }
    }

    return lieuxAvecAttente;
}

// --- Notifier dans la messagerie ACLEF ---
async function notifier(enAttente, lieux) {
    // Recuperer le dernier compteur stocke en messagerie
    const { data: dernierMessage } = await supabase
        .from('messages')
        .select('contenu')
        .eq('type', 'prescription_rafael')
        .order('created_at', { ascending: false })
        .limit(1);

    // Extraire le compteur du dernier message (format: [count:N])
    let dernierCount = 0;
    if (dernierMessage && dernierMessage[0]) {
        const m = dernierMessage[0].contenu.match(/\[count:(\d+)\]/);
        if (m) dernierCount = parseInt(m[1]);
    }

    // Si le compteur n'a pas augmente, ne rien faire
    if (enAttente <= dernierCount) {
        process.stdout.write(`En attente: ${enAttente} (inchange ou diminue depuis ${dernierCount})\n`);
        return;
    }

    // Construire le message
    const lieuxText = lieux.length > 0
        ? `\n\nLieu(x) concerne(s) : ${lieux.join(', ')}`
        : '';

    const objet = 'Notification de prescription HSP';
    const contenu = `Vous avez une nouvelle prescription en attente.${lieuxText}\n\nVoir sur Rafael : ${RAFAEL_URL}\n\n[count:${enAttente}]`;

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const heure = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });

    const { error } = await supabase.from('messages').insert({
        expediteur_id: null,
        destinataire_id: null,
        expediteur: 'Rafael Cap Metiers',
        destinataire: 'Coordination ACLEF',
        objet,
        contenu,
        type: 'prescription_rafael',
        lu: false,
        archive: false,
        date,
        heure
    });

    if (error) {
        process.stderr.write(`Erreur insertion message: ${error.message}\n`);
        process.exit(1);
    }

    process.stdout.write(`Notification envoyee: ${enAttente} en attente (etait ${dernierCount})\n`);
}

// --- Main ---
async function main() {
    try {
        await loginCAS();
        const enAttente = await fetchEnAttente();
        process.stdout.write(`En attente: ${enAttente}\n`);

        if (enAttente === 0) {
            process.stdout.write('Rien a signaler\n');
            return;
        }

        const lieux = await detecterLieux();
        await notifier(enAttente, lieux);
    } catch (error) {
        process.stderr.write(`Erreur: ${error.message}\n`);
        process.exit(1);
    }
}

main();

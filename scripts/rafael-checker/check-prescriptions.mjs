// ============================================================
// Script de vérification des nouvelles prescriptions Rafael
// Se connecte au CAS cap-metiers.pro, parse les candidatures,
// et insère un message dans la messagerie ACLEF si nouveau.
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

// --- Requête HTTP avec gestion cookies ---
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

    // 1. GET page de login (récupérer cookies de session)
    const pageRes = await httpRequest(loginUrl);
    process.stdout.write(`[1] GET login page: status=${pageRes.status}, cookies=${Object.keys(cookieJar).join(',')}\n`);

    // 2. POST credentials
    const postData = [
        `_method=POST`,
        `email=${encodeURIComponent(RAFAEL_EMAIL)}`,
        `password=${encodeURIComponent(RAFAEL_PASSWORD)}`,
        `service=${encodeURIComponent(serviceUrl)}`
    ].join('&');

    const loginRes = await httpRequest(loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData).toString()
        },
        body: postData
    });

    process.stdout.write(`[2] POST login: status=${loginRes.status}, location=${loginRes.headers.location || 'none'}\n`);

    // Si 200 = login échoué (page de login réaffichée)
    if (loginRes.status === 200) {
        if (loginRes.body.includes('Identifiant ou mot de passe incorrect') || loginRes.body.includes('error') || loginRes.body.includes('erreur')) {
            process.stderr.write('Echec: identifiants incorrects\n');
            // Afficher un extrait pour debug
            const bodySnippet = loginRes.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 300);
            process.stderr.write(`Body snippet: ${bodySnippet}\n`);
            process.exit(1);
        }
    }

    // 3. Suivre la chaîne de redirections (CAS ticket -> Rafael session)
    if (loginRes.status >= 300 && loginRes.status < 400 && loginRes.headers.location) {
        const loc = loginRes.headers.location;
        const redirectUrl = loc.startsWith('http') ? loc : `https://sso.cap-metiers.pro${loc}`;
        process.stdout.write(`[3] Following redirect: ${redirectUrl.substring(0, 100)}...\n`);

        // Suivre chaque redirect manuellement pour logger
        let currentUrl = redirectUrl;
        for (let i = 0; i < 8; i++) {
            const res = await httpRequest(currentUrl);
            process.stdout.write(`[3.${i}] ${currentUrl.substring(0, 80)}... -> status=${res.status}, cookies=${Object.keys(cookieJar).join(',')}\n`);
            if (res.status >= 300 && res.status < 400 && res.headers.location) {
                const nextLoc = res.headers.location;
                currentUrl = nextLoc.startsWith('http') ? nextLoc : new URL(nextLoc, currentUrl).href;
            } else {
                // Page finale atteinte
                const pageTitle = res.body.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || 'no title';
                process.stdout.write(`[3.final] Page title: ${pageTitle}\n`);
                break;
            }
        }
    }

    process.stdout.write(`Cookies finaux: ${Object.keys(cookieJar).join(', ')}\n`);
    process.stdout.write('Connexion CAS reussie\n');
}

// --- Récupérer et parser les candidatures ---
async function fetchCandidatures() {
    // Essayer la page des candidatures
    const res = await followRedirects('https://rafael.cap-metiers.pro/preinscription/candidatures');

    const pageTitle = res.body.match(/<title[^>]*>(.*?)<\/title>/i)?.[1] || 'no title';
    process.stdout.write(`[candidatures] status=${res.status}, title=${pageTitle}, bodyLength=${res.body.length}\n`);

    if (res.body.includes('non autorisé') || res.body.includes('Identification requise')) {
        // Afficher un extrait pour debug
        const bodySnippet = res.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 500);
        process.stderr.write(`Page body: ${bodySnippet}\n`);
        process.stderr.write('Echec: session non authentifiee\n');
        process.exit(1);
    }

    const $ = cheerio.load(res.body);
    const prescriptions = [];

    // Parser le tableau des candidatures
    // On cherche les lignes du tableau principal (Gestion par candidatures)
    $('table tbody tr').each((i, row) => {
        const cells = $(row).find('td');
        if (cells.length < 3) return;

        // Extraire les textes de chaque cellule
        const textes = [];
        cells.each((j, cell) => {
            textes.push($(cell).text().trim().replace(/\s+/g, ' '));
        });

        // Chercher une date au format JJ/MM/AAAA dans la première cellule
        const dateMatch = textes[0]?.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (!dateMatch) return;

        const date = dateMatch[1];

        // Chercher le nom dans les cellules suivantes
        // Le nom est généralement dans la 2e ou 3e cellule
        let nom = '';
        for (let k = 1; k < Math.min(textes.length, 4); k++) {
            // Chercher un pattern nom (Mme/M. NOM Prénom ou juste NOM Prénom)
            const cellText = textes[k];
            if (cellText && cellText.length > 2 && !cellText.match(/^\d/) && !cellText.match(/^GRETA|^Mediawork|^ACLEF/i)) {
                // Nettoyer : enlever "Mme", "M.", numéros de téléphone, etc.
                const cleaned = cellText
                    .replace(/^(Mme|M\.|Mr)\s*/i, '')
                    .replace(/N°\s*\d+/g, '')
                    .replace(/\d{10}/g, '')
                    .trim();
                if (cleaned.length > 2 && cleaned.includes(' ')) {
                    nom = cleaned.split('\n')[0].trim();
                    // Garder seulement NOM Prénom (les 2-3 premiers mots)
                    const mots = nom.split(/\s+/).filter(m => m.length > 0);
                    if (mots.length >= 2) {
                        nom = mots.slice(0, 3).join(' ');
                        break;
                    }
                }
            }
        }

        if (nom) {
            prescriptions.push({ date, nom });
        }
    });

    process.stdout.write(`${prescriptions.length} prescription(s) trouvee(s) dans le tableau\n`);
    return prescriptions;
}

// --- Vérifier et notifier les nouvelles prescriptions ---
async function notifierNouvellesPrescriptions(prescriptions) {
    if (prescriptions.length === 0) {
        process.stdout.write('Aucune prescription a verifier\n');
        return;
    }

    // Récupérer les messages déjà envoyés de type prescription_rafael
    const { data: messagesExistants } = await supabase
        .from('messages')
        .select('contenu')
        .eq('type', 'prescription_rafael');

    const dejaNotes = new Set(
        (messagesExistants || []).map(m => m.contenu)
    );

    let nouveaux = 0;

    for (const p of prescriptions) {
        const contenu = `Nouvelle prescription recue le ${p.date}.`;
        const cle = `${p.date}-${p.nom}`;

        // Vérifier si déjà notifié (chercher dans les contenus existants)
        const dejaNotifie = (messagesExistants || []).some(m =>
            m.contenu && m.contenu.includes(p.date) && m.contenu.includes(p.nom)
        );

        if (dejaNotifie) continue;

        // Insérer le message dans la messagerie ACLEF
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
            objet: `Nouvelle prescription Rafael - ${p.nom}`,
            contenu: `Nouvelle prescription recue le ${p.date}. Candidat: ${p.nom}`,
            type: 'prescription_rafael',
            lu: false,
            archive: false,
            date,
            heure
        });

        if (error) {
            process.stderr.write(`Erreur insertion message pour ${p.nom}: ${error.message}\n`);
        } else {
            process.stdout.write(`Nouveau: ${p.nom} (${p.date})\n`);
            nouveaux++;
        }
    }

    process.stdout.write(`${nouveaux} nouvelle(s) prescription(s) notifiee(s)\n`);
}

// --- Main ---
async function main() {
    try {
        await loginCAS();
        const prescriptions = await fetchCandidatures();
        await notifierNouvellesPrescriptions(prescriptions);
        process.stdout.write('Verification terminee\n');
    } catch (error) {
        process.stderr.write(`Erreur: ${error.message}\n`);
        process.exit(1);
    }
}

main();

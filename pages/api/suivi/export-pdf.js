import { supabaseAdmin } from '@/lib/supabaseAdmin'
import PDFDocument from 'pdfkit'

const QUESTIONS_ANALYSE = {
    satisfaction: [
        { id: 1, text: "La formation vous a plu ?", type: 'choix3' },
        { id: 2, text: "La formation etait comme vous voulez ?", type: 'choix3' },
        { id: 3, text: "Vous avez appris de nouvelles choses ?", type: 'choix3' },
        { id: 4, text: "Content de la duree ?", type: 'choix3' },
        { id: 5, text: "Formateurs adaptes a vos besoins ?", type: 'choix3' },
        { id: 6, text: "Formateurs ont bien explique ?", type: 'choix3' },
        { id: 7, text: "Salles et materiel ?", type: 'choix3' },
        { id: 8, text: "Formation aide pour vos projets ?", type: 'choix3' },
        { id: 9, text: "Situation actuelle", type: 'situation' }
    ],
    suivi_3mois: [
        { id: 1, text: "Situation actuelle", type: 'situation' },
        { id: 'aide', text: "La formation ACLEF vous a aide ?", type: 'choix3', smsId: 4, appelId: 3 },
        { id: 'projet', text: "Vous avez un projet ?", type: 'choix3', smsId: 5, appelId: 4 }
    ],
    suivi_6mois: [
        { id: 1, text: "Situation actuelle", type: 'situation' },
        { id: 'aide', text: "La formation ACLEF vous a aide ?", type: 'choix3', smsId: 4, appelId: 3 },
        { id: 'projet', text: "Vous avez un projet ?", type: 'choix3', smsId: 5, appelId: 4 }
    ]
}

const TITRES = {
    satisfaction: 'Questionnaire de Satisfaction',
    suivi_3mois: 'Suivi Post-Formation - 3 mois',
    suivi_6mois: 'Suivi Post-Formation - 6 mois'
}

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Methode non autorisee' })

    const { type, dateDebut, dateFin } = req.query
    if (!type || !TITRES[type]) return res.status(400).json({ error: 'Type invalide' })

    // Charger les suivis
    let query = supabaseAdmin.from('suivi_post_formation').select('*')
    if (dateDebut) query = query.gte('date_sortie', dateDebut)
    if (dateFin) query = query.lte('date_sortie', dateFin)
    const { data: suivis } = await query
    if (!suivis) return res.status(500).json({ error: 'Erreur chargement' })

    const qField = type === 'satisfaction' ? 'satisfaction_questionnaire_id' : type === 'suivi_3mois' ? 'suivi_3mois_questionnaire_id' : 'suivi_6mois_questionnaire_id'
    const statutField = type === 'satisfaction' ? 'satisfaction_statut' : type === 'suivi_3mois' ? 'suivi_3mois_statut' : 'suivi_6mois_statut'
    const questIds = suivis.map(s => s[qField]).filter(Boolean)

    let questionnaires = []
    if (questIds.length > 0) {
        const { data } = await supabaseAdmin.from('questionnaires').select('id, reponses, statut').in('id', questIds).eq('statut', 'complete')
        questionnaires = data || []
    }

    const totalSuivis = suivis.length
    const totalRepondus = suivis.filter(s => ['repondu', 'appel_effectue'].includes(s[statutField])).length
    const questions = QUESTIONS_ANALYSE[type] || []

    // Agreger
    const distributions = {}
    for (const q of questions) {
        if (q.type === 'choix3') distributions[q.id] = { oui: 0, un_peu: 0, non: 0, total: 0 }
        else if (q.type === 'situation') distributions[q.id] = { formation: 0, emploi: 0, recherche: 0, autre: 0, total: 0 }
    }
    for (const quest of questionnaires) {
        if (!quest.reponses) continue
        const suivi = suivis.find(s => s[qField] === quest.id)
        const estAppel = suivi && suivi[statutField] === 'appel_effectue'
        for (const q of questions) {
            let rid = q.id
            if (q.smsId && q.appelId) rid = estAppel ? q.appelId : q.smsId
            const val = quest.reponses[rid]
            if (!val || !distributions[q.id]) continue
            if (q.type === 'choix3' && ['oui', 'un_peu', 'non'].includes(val)) { distributions[q.id][val]++; distributions[q.id].total++ }
            if (q.type === 'situation' && ['formation', 'emploi', 'recherche', 'autre'].includes(val)) { distributions[q.id][val]++; distributions[q.id].total++ }
        }
    }

    // Generer le PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const chunks = []
    doc.on('data', c => chunks.push(c))
    doc.on('end', () => {
        const buffer = Buffer.concat(chunks)
        res.setHeader('Content-Type', 'application/pdf')
        res.setHeader('Content-Disposition', 'attachment; filename="' + type + '-resultats.pdf"')
        res.send(buffer)
    })

    const pct = (n, t) => t > 0 ? (n / t * 100).toFixed(1) : '0.0'

    // Titre
    doc.fontSize(20).font('Helvetica-Bold').text('ACLEF - ' + TITRES[type], { align: 'center' })
    doc.moveDown(0.5)

    // Periode
    const periodeTexte = (dateDebut || 'debut') + ' au ' + (dateFin || 'aujourd\'hui')
    doc.fontSize(12).font('Helvetica').fillColor('#666666').text('Periode : ' + periodeTexte, { align: 'center' })
    doc.moveDown(1)

    // Stats globales
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000').text('Taux de reponse')
    doc.moveDown(0.3)
    doc.fontSize(12).font('Helvetica')
    doc.text('Total apprenants : ' + totalSuivis)
    doc.text('Ont repondu : ' + totalRepondus)
    doc.text('Taux de reponse : ' + pct(totalRepondus, totalSuivis) + '%')
    doc.moveDown(1)

    // Resultats par question
    doc.fontSize(14).font('Helvetica-Bold').text('Resultats par question')
    doc.moveDown(0.5)

    for (const q of questions) {
        const dist = distributions[q.id]
        if (!dist) continue

        doc.fontSize(12).font('Helvetica-Bold').fillColor('#1e293b').text(q.text)
        doc.moveDown(0.2)

        const barWidth = 300
        const barHeight = 16
        const startX = 150
        const y = doc.y

        if (q.type === 'choix3') {
            const items = [
                { label: 'OUI', count: dist.oui, color: '#10b981' },
                { label: 'UN PEU', count: dist.un_peu, color: '#f59e0b' },
                { label: 'NON', count: dist.non, color: '#ef4444' }
            ]
            items.forEach((item, i) => {
                const ly = y + i * 22
                const w = dist.total > 0 ? (item.count / dist.total) * barWidth : 0
                doc.fontSize(10).font('Helvetica').fillColor('#475569').text(item.label, 50, ly + 3, { width: 90, align: 'right' })
                doc.save().rect(startX, ly, barWidth, barHeight).fill('#f1f5f9').restore()
                if (w > 0) doc.save().rect(startX, ly, w, barHeight).fill(item.color).restore()
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(item.count + ' (' + pct(item.count, dist.total) + '%)', startX + barWidth + 10, ly + 3)
            })
            doc.y = y + 70
        } else if (q.type === 'situation') {
            const items = [
                { label: 'Formation', count: dist.formation, color: '#3b82f6' },
                { label: 'Emploi', count: dist.emploi, color: '#10b981' },
                { label: 'Recherche', count: dist.recherche, color: '#f59e0b' },
                { label: 'Autre', count: dist.autre, color: '#8b5cf6' }
            ]
            items.forEach((item, i) => {
                const ly = y + i * 22
                const w = dist.total > 0 ? (item.count / dist.total) * barWidth : 0
                doc.fontSize(10).font('Helvetica').fillColor('#475569').text(item.label, 50, ly + 3, { width: 90, align: 'right' })
                doc.save().rect(startX, ly, barWidth, barHeight).fill('#f1f5f9').restore()
                if (w > 0) doc.save().rect(startX, ly, w, barHeight).fill(item.color).restore()
                doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text(item.count + ' (' + pct(item.count, dist.total) + '%)', startX + barWidth + 10, ly + 3)
            })
            doc.y = y + 92
        }
        doc.moveDown(0.5)
    }

    // Pied de page
    doc.moveDown(1)
    doc.fontSize(9).font('Helvetica').fillColor('#94a3b8').text('Genere le ' + new Date().toLocaleDateString('fr-FR') + ' - ACLEF Planning', { align: 'center' })

    doc.end()
}

import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

const QUESTIONS_ANALYSE = {
    satisfaction: [
        { id: 1, text: "La formation vous a plu ?", type: 'choix3' },
        { id: 2, text: "La formation etait comme vous voulez ?", type: 'choix3' },
        { id: 3, text: "Vous avez appris de nouvelles choses ?", type: 'choix3' },
        { id: 4, text: "Content de la duree de la formation ?", type: 'choix3' },
        { id: 5, text: "Les formateurs se sont adaptes a vos besoins ?", type: 'choix3' },
        { id: 6, text: "Les formateurs ont bien explique ?", type: 'choix3' },
        { id: 7, text: "Les salles et le materiel etaient bien ?", type: 'choix3' },
        { id: 8, text: "La formation vous aide pour vos projets ?", type: 'choix3' },
        { id: 9, text: "Aujourd'hui, vous etes :", type: 'situation' },
        { id: 10, text: "Quelque chose a nous dire ?", type: 'libre' }
    ],
    suivi_3mois: [
        { id: 1, text: "Aujourd'hui, vous etes :", type: 'situation' },
        { id: 'aclef_aide', text: "La formation ACLEF vous a aide ?", type: 'choix3', smsId: 4, appelId: 3 },
        { id: 'projet', text: "Vous avez un projet ?", type: 'choix3', smsId: 5, appelId: 4 }
    ],
    suivi_6mois: [
        { id: 1, text: "Aujourd'hui, vous etes :", type: 'situation' },
        { id: 'aclef_aide', text: "La formation ACLEF vous a aide ?", type: 'choix3', smsId: 4, appelId: 3 },
        { id: 'projet', text: "Vous avez un projet ?", type: 'choix3', smsId: 5, appelId: 4 }
    ]
}

function ResultatsQuestionnaires({ user, logout, inactivityTime, priority }) {
    const router = useRouter()
    const [dateDebut, setDateDebut] = useState('')
    const [dateFin, setDateFin] = useState('')
    const [onglet, setOnglet] = useState('satisfaction')
    const [isLoading, setIsLoading] = useState(false)
    const [resultats, setResultats] = useState(null)

    const fetchResultats = async () => {
        setIsLoading(true)

        // 1. Charger les suivis dans la periode
        let query = supabase.from('suivi_post_formation').select('*')
        if (dateDebut) query = query.gte('date_sortie', dateDebut)
        if (dateFin) query = query.lte('date_sortie', dateFin)
        const { data: suivis } = await query
        if (!suivis) { setIsLoading(false); return }

        // 2. Determiner le champ questionnaire selon l'onglet
        const qField = onglet === 'satisfaction' ? 'satisfaction_questionnaire_id'
            : onglet === 'suivi_3mois' ? 'suivi_3mois_questionnaire_id'
            : 'suivi_6mois_questionnaire_id'
        const statutField = onglet === 'satisfaction' ? 'satisfaction_statut'
            : onglet === 'suivi_3mois' ? 'suivi_3mois_statut'
            : 'suivi_6mois_statut'

        const questIds = suivis.map(s => s[qField]).filter(Boolean)
        const totalSuivis = suivis.length

        // 3. Charger les questionnaires completes
        let questionnaires = []
        if (questIds.length > 0) {
            const { data } = await supabase
                .from('questionnaires')
                .select('id, reponses, statut')
                .in('id', questIds)
                .eq('statut', 'complete')
            questionnaires = data || []
        }

        // Compter les repondus (SMS + appel)
        const doneStatuts = ['repondu', 'appel_effectue']
        const totalRepondus = suivis.filter(s => doneStatuts.includes(s[statutField])).length

        // 4. Agreger les reponses par question
        const questions = QUESTIONS_ANALYSE[onglet] || []
        const distributions = {}

        for (const q of questions) {
            if (q.type === 'choix3') {
                distributions[q.id] = { oui: 0, un_peu: 0, non: 0, total: 0 }
            } else if (q.type === 'situation') {
                distributions[q.id] = { formation: 0, emploi: 0, recherche: 0, autre: 0, total: 0 }
            } else if (q.type === 'libre') {
                distributions[q.id] = { repondus: 0, total: 0 }
            }
        }

        for (const quest of questionnaires) {
            if (!quest.reponses) continue
            // Trouver le suivi correspondant pour savoir si c'est un appel ou SMS
            const suivi = suivis.find(s => s[qField] === quest.id)
            const estAppel = suivi && suivi[statutField] === 'appel_effectue'

            for (const q of questions) {
                let reponseId = q.id
                // Pour les suivis, mapper les IDs selon le mode de reponse
                if (q.smsId && q.appelId) {
                    reponseId = estAppel ? q.appelId : q.smsId
                }
                const val = quest.reponses[reponseId]
                if (!val) continue

                if (q.type === 'choix3' && distributions[q.id]) {
                    if (['oui', 'un_peu', 'non'].includes(val)) {
                        distributions[q.id][val]++
                        distributions[q.id].total++
                    }
                } else if (q.type === 'situation' && distributions[q.id]) {
                    if (['formation', 'emploi', 'recherche', 'autre'].includes(val)) {
                        distributions[q.id][val]++
                        distributions[q.id].total++
                    }
                } else if (q.type === 'libre' && distributions[q.id]) {
                    if (val && val.length > 0 && !val.startsWith('data:audio')) {
                        distributions[q.id].repondus++
                    } else if (val && val.startsWith('data:audio')) {
                        distributions[q.id].repondus++
                    }
                    distributions[q.id].total++
                }
            }
        }

        setResultats({ totalSuivis, totalRepondus, distributions })
        setIsLoading(false)
    }

    const pct = (n, total) => total > 0 ? (n / total * 100).toFixed(1) : '0.0'

    const BarreResultat = ({ label, count, total, color }) => {
        const p = total > 0 ? (count / total * 100) : 0
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ width: '100px', fontSize: '13px', color: '#475569', textAlign: 'right' }}>{label}</span>
                <div style={{ flex: 1, height: '24px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: p + '%', height: '100%', backgroundColor: color, borderRadius: '4px', transition: 'width 0.5s' }} />
                </div>
                <span style={{ width: '90px', fontSize: '13px', color: '#1e293b', fontWeight: '600' }}>
                    {count} ({p.toFixed(1)}%)
                </span>
            </div>
        )
    }

    const questions = QUESTIONS_ANALYSE[onglet] || []

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '20px' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1e293b', margin: '0 0 4px' }}>
                            Resultats Questionnaires
                        </h1>
                        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Analyse des reponses</p>
                    </div>
                    <button onClick={() => router.push('/')} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', color: '#475569' }}>
                        Retour
                    </button>
                </div>

                {/* Filtre dates */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', marginBottom: '20px', backgroundColor: 'white', padding: '16px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Date debut</label>
                        <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '4px' }}>Date fin</label>
                        <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '8px', border: '2px solid #e2e8f0', fontSize: '14px' }} />
                    </div>
                    <button onClick={fetchResultats}
                        style={{ padding: '8px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>
                        Analyser
                    </button>
                </div>

                {/* Onglets */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                    {[
                        { val: 'satisfaction', label: 'Satisfaction' },
                        { val: 'suivi_3mois', label: 'Suivi 3 mois' },
                        { val: 'suivi_6mois', label: 'Suivi 6 mois' }
                    ].map(o => (
                        <button key={o.val} onClick={() => { setOnglet(o.val); setResultats(null) }}
                            style={{
                                padding: '10px 20px', border: 'none', borderRadius: '8px 8px 0 0',
                                backgroundColor: onglet === o.val ? 'white' : '#e2e8f0',
                                color: onglet === o.val ? '#1e40af' : '#64748b',
                                fontWeight: onglet === o.val ? '700' : '500',
                                fontSize: '14px', cursor: 'pointer',
                                boxShadow: onglet === o.val ? '0 -2px 4px rgba(0,0,0,0.05)' : 'none'
                            }}>
                            {o.label}
                        </button>
                    ))}
                </div>

                {/* Contenu */}
                {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>Chargement...</div>
                ) : !resultats ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8', backgroundColor: 'white', borderRadius: '12px' }}>
                        Selectionnez une periode et cliquez Analyser
                    </div>
                ) : (
                    <div style={{ backgroundColor: 'white', borderRadius: '0 12px 12px 12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        {/* Cartes statistiques */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '32px' }}>
                            <div style={{ flex: 1, padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{resultats.totalSuivis}</div>
                                <div style={{ fontSize: '13px', color: '#64748b' }}>Total apprenants</div>
                            </div>
                            <div style={{ flex: 1, padding: '20px', backgroundColor: '#d1fae5', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#065f46' }}>{resultats.totalRepondus}</div>
                                <div style={{ fontSize: '13px', color: '#065f46' }}>Ont repondu</div>
                            </div>
                            <div style={{ flex: 1, padding: '20px', backgroundColor: '#dbeafe', borderRadius: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e40af' }}>
                                    {pct(resultats.totalRepondus, resultats.totalSuivis)}%
                                </div>
                                <div style={{ fontSize: '13px', color: '#1e40af' }}>Taux de reponse</div>
                            </div>
                        </div>

                        {/* Resultats par question */}
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1e293b', marginBottom: '20px' }}>
                            Resultats par question
                        </h3>
                        {questions.map(q => {
                            const dist = resultats.distributions[q.id]
                            if (!dist) return null

                            return (
                                <div key={q.id} style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
                                        {typeof q.id === 'number' ? 'Q' + q.id + '. ' : ''}{q.text}
                                    </div>
                                    {q.type === 'choix3' && (
                                        <>
                                            <BarreResultat label="OUI" count={dist.oui} total={dist.total} color="#10b981" />
                                            <BarreResultat label="UN PEU" count={dist.un_peu} total={dist.total} color="#f59e0b" />
                                            <BarreResultat label="NON" count={dist.non} total={dist.total} color="#ef4444" />
                                        </>
                                    )}
                                    {q.type === 'situation' && (
                                        <>
                                            <BarreResultat label="Formation" count={dist.formation} total={dist.total} color="#3b82f6" />
                                            <BarreResultat label="Emploi" count={dist.emploi} total={dist.total} color="#10b981" />
                                            <BarreResultat label="Recherche" count={dist.recherche} total={dist.total} color="#f59e0b" />
                                            <BarreResultat label="Autre" count={dist.autre} total={dist.total} color="#8b5cf6" />
                                        </>
                                    )}
                                    {q.type === 'libre' && (
                                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                                            {dist.repondus} reponse(s) sur {dist.total}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default withAuthAdmin(ResultatsQuestionnaires, "Resultats Questionnaires")

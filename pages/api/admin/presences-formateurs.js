import { supabaseAdmin } from '../../../lib/supabaseAdmin'

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return handleGet(req, res)
    } else {
        res.setHeader('Allow', ['GET'])
        return res.status(405).json({ error: 'Method not allowed' })
    }
}

// GET - Récupérer SEULEMENT les interventions prévues avec leur statut de présence
async function handleGet(req, res) {
    try {
        const { formateur_id, date_debut, date_fin, format } = req.query

        if (!formateur_id) {
            return res.status(400).json({ error: 'formateur_id requis' })
        }

        console.log(`🔍 Chargement interventions prévues pour formateur ${formateur_id} du ${date_debut} au ${date_fin}`)

        // 0. Récupérer les infos du formateur (vérifier si bureau=true)
        const { data: formateurData, error: formateurError } = await supabaseAdmin
            .from('users')
            .select('id, nom, prenom, bureau')
            .eq('id', formateur_id)
            .single()

        if (formateurError) throw formateurError

        const formateurABureau = formateurData?.bureau === true

        // 1. Récupérer le planning type du formateur
        const { data: planningType, error: planningTypeError } = await supabaseAdmin
            .from('planning_type_formateurs')
            .select('id, jour, creneau, statut, lieu_id, valide')
            .eq('formateur_id', formateur_id)
            .eq('valide', true)
            .eq('statut', 'disponible')

        if (planningTypeError) throw planningTypeError

        // 2. Récupérer les absences validées pour la période
        const { data: absences, error: absencesError } = await supabaseAdmin
            .from('absences_formateurs')
            .select('id, date_debut, date_fin, type, statut, motif')
            .eq('formateur_id', formateur_id)
            .eq('statut', 'validé')

        if (absencesError) throw absencesError

        // 3. Récupérer les affectations coordo pour la période
        const { data: planningCoordo, error: coordoError } = await supabaseAdmin
            .from('planning_hebdomadaire')
            .select('id, date, jour, creneau, lieu_id, formateurs_ids')
            .gte('date', date_debut || '2024-01-01')
            .lte('date', date_fin || '2025-12-31')

        if (coordoError) throw coordoError

        // Filtrer pour ce formateur spécifique
        const planningCoordoFormateur = (planningCoordo || []).filter(pc => {
            return pc.formateurs_ids && pc.formateurs_ids.includes(formateur_id)
        })

        // 4. Récupérer les présences déclarées pour la période
        const { data: presencesDeclarees, error: presencesError } = await supabaseAdmin
            .from('presence_formateurs')
            .select('id, date, periode, lieu, present, created_at')
            .eq('formateur_id', formateur_id)
            .gte('date', date_debut || '2024-01-01')
            .lte('date', date_fin || '2025-12-31')

        if (presencesError) throw presencesError

        // 5. Récupérer les lieux pour l'affichage
        const { data: lieux, error: lieuxError } = await supabaseAdmin
            .from('lieux')
            .select('id, nom, initiale')

        if (lieuxError) throw lieuxError

        // 6. Construire la liste des interventions prévues
        const interventionsPrevues = []
        const joursMapping = {
            'lundi': 'Lundi',
            'mardi': 'Mardi',
            'mercredi': 'Mercredi',
            'jeudi': 'Jeudi',
            'vendredi': 'Vendredi'
        }

        // Itérer sur chaque jour de la période
        const dateDebutObj = new Date(date_debut || '2024-01-01')
        const dateFinObj = new Date(date_fin || '2025-12-31')

        for (let d = new Date(dateDebutObj); d <= dateFinObj; d.setDate(d.getDate() + 1)) {
            const dateString = d.toISOString().split('T')[0]
            const jourFrancais = d.toLocaleDateString('fr-FR', { weekday: 'long' })
            const jourCapitalized = jourFrancais.charAt(0).toUpperCase() + jourFrancais.slice(1)

            if (!['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'].includes(jourCapitalized)) {
                continue // Ignorer week-end
            }

            // Pour chaque créneau (matin, AM)
            for (const creneauDisplay of ['Matin', 'AM']) {
                const creneauDB = creneauDisplay === 'Matin' ? 'matin' : 'AM'
                const periodeDB = creneauDisplay === 'Matin' ? 'matin' : 'apres_midi'

                // Vérifier les absences validées
                const absenceJour = absences.find(abs => {
                    const debut = new Date(abs.date_debut)
                    const fin = new Date(abs.date_fin)
                    const current = new Date(dateString)
                    return current >= debut && current <= fin
                })

                // Priorité 1: Dispo exceptionnelle (formation)
                if (absenceJour && absenceJour.type === 'formation') {
                    interventionsPrevues.push({
                        date: dateString,
                        jour: jourCapitalized,
                        creneau: creneauDisplay,
                        periode: periodeDB,
                        statut_prevu: 'dispo_except',
                        lieu_id: null,
                        source: 'absence_formation'
                    })
                    continue
                }

                // Priorité 2: Absence validée (on skip, pas d'intervention prévue)
                if (absenceJour && absenceJour.type !== 'formation') {
                    continue // Pas d'intervention prévue
                }

                // Priorité 3: Affectation coordo
                const affectationCoordo = planningCoordoFormateur.find(pc => {
                    return pc.date === dateString && pc.jour === jourCapitalized && pc.creneau === creneauDB
                })

                if (affectationCoordo) {
                    interventionsPrevues.push({
                        date: dateString,
                        jour: jourCapitalized,
                        creneau: creneauDisplay,
                        periode: periodeDB,
                        statut_prevu: 'affecte_coordo',
                        lieu_id: affectationCoordo.lieu_id,
                        source: 'planning_coordo'
                    })
                    continue
                }

                // Priorité 4: Planning type (disponible mais pas choisi)
                const jourKey = Object.keys(joursMapping).find(key => joursMapping[key] === jourCapitalized)
                const creneauType = planningType.find(pt =>
                    pt.jour === jourKey && pt.creneau === creneauDisplay
                )

                if (creneauType) {
                    interventionsPrevues.push({
                        date: dateString,
                        jour: jourCapitalized,
                        creneau: creneauDisplay,
                        periode: periodeDB,
                        statut_prevu: 'disponible_non_choisi',
                        lieu_id: creneauType.lieu_id,
                        source: 'planning_type'
                    })
                    continue
                }

                // Pas d'intervention prévue pour ce créneau
            }
        }

        // 7. Enrichir avec les présences déclarées ET ajouter les présences "Bureau" (sans intervention prévue)
        const resultats = interventionsPrevues.map(intervention => {
            const presenceDeclaree = presencesDeclarees.find(p =>
                p.date === intervention.date && p.periode === intervention.periode
            )

            const lieu = lieux.find(l => l.id === intervention.lieu_id)

            return {
                date: intervention.date,
                jour: intervention.jour,
                creneau: intervention.creneau,
                periode: intervention.periode,
                statut_prevu: intervention.statut_prevu,
                lieu_prevu: lieu ? lieu.nom : 'Non défini',
                lieu_prevu_initiale: lieu ? lieu.initiale : '-',
                source: intervention.source,
                // Présence déclarée
                present: presenceDeclaree ? presenceDeclaree.present : null,
                lieu_declare: presenceDeclaree ? presenceDeclaree.lieu : null,
                date_declaration: presenceDeclaree ? presenceDeclaree.created_at : null,
                // Statut final pour l'affichage
                statut_final: presenceDeclaree ?
                    (presenceDeclaree.present ? 'present' : 'absent') :
                    'non_declare'
            }
        })

        // 8. Ajouter les présences "Bureau" (présent sans intervention prévue, UNIQUEMENT si formateur a bureau=true)
        if (formateurABureau) {
            presencesDeclarees.forEach(presence => {
                // Vérifier si cette présence correspond à une intervention déjà listée
                const interventionExiste = resultats.find(r =>
                    r.date === presence.date && r.periode === presence.periode
                )

                // Si pas d'intervention prévue MAIS présent déclaré = Bureau
                if (!interventionExiste && presence.present) {
                    const dateObj = new Date(presence.date)
                    const jourFrancais = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })
                    const jourCapitalized = jourFrancais.charAt(0).toUpperCase() + jourFrancais.slice(1)
                    const creneauDisplay = presence.periode === 'matin' ? 'Matin' : 'AM'

                    resultats.push({
                        date: presence.date,
                        jour: jourCapitalized,
                        creneau: creneauDisplay,
                        periode: presence.periode,
                        statut_prevu: 'bureau', // NOUVEAU STATUT
                        lieu_prevu: 'Bureau',
                        lieu_prevu_initiale: 'B',
                        source: 'presence_bureau',
                        present: presence.present,
                        lieu_declare: presence.lieu,
                        date_declaration: presence.created_at,
                        statut_final: 'present'
                    })
                }
            })
        }

        // Trier par date et créneau
        resultats.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date)
            if (a.creneau === 'Matin' && b.creneau === 'AM') return -1
            if (a.creneau === 'AM' && b.creneau === 'Matin') return 1
            return 0
        })

        console.log(`✅ ${resultats.length} interventions prévues trouvées`)

        if (format === 'export') {
            return res.status(200).json(formatForExport(resultats))
        }

        return res.status(200).json(resultats)

    } catch (error) {
        console.error('Erreur API presences-formateurs:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// Formater les données pour l'export
function formatForExport(interventions) {
    return interventions.map(intervention => ({
        Date: intervention.date,
        Jour: intervention.jour,
        Créneau: intervention.creneau,
        'Lieu prévu': intervention.lieu_prevu,
        'Statut prévu': intervention.statut_prevu,
        'Présence déclarée': intervention.statut_final === 'present' ? 'Présent' :
                            intervention.statut_final === 'absent' ? 'Absent' : 'Non déclaré',
        'Lieu déclaré': intervention.lieu_declare || '-',
        'Date déclaration': intervention.date_declaration ?
            new Date(intervention.date_declaration).toLocaleDateString('fr-FR') : '-'
    }))
}
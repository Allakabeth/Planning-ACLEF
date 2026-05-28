import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { requireAdminAuth } from '../../../lib/apiAuthAdmin'

export default async function handler(req, res) {
    const adminUser = await requireAdminAuth(req, res)
    if (!adminUser) return

    if (req.method === 'GET') {
        return handleGet(req, res)
    } else if (req.method === 'POST') {
        return handlePost(req, res)
    } else {
        res.setHeader('Allow', ['GET', 'POST'])
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

        // ========== DÉTECTION SEMAINE PASSÉE ==========
        // Calculer le lundi de la semaine actuelle (début de semaine)
        const aujourdhui = new Date()
        const jourActuel = aujourdhui.getDay() // 0=dimanche, 1=lundi, etc.
        const lundiSemaineActuelle = new Date(aujourdhui)
        lundiSemaineActuelle.setDate(aujourdhui.getDate() - (jourActuel === 0 ? 6 : jourActuel - 1))
        lundiSemaineActuelle.setHours(0, 0, 0, 0)

        // Si la période demandée est ENTIÈREMENT avant la semaine actuelle → semaine passée
        const dateFinDetection = date_fin ? new Date(date_fin) : new Date()
        const estSemainPassee = dateFinDetection < lundiSemaineActuelle

        if (estSemainPassee) {
            console.log(`📦 Semaine passée détectée - Utilisation de l'historique figé`)
            return await handleGetSemainePassee(req, res, formateur_id, date_debut, date_fin, formateurABureau)
        }

        console.log(`🔄 Semaine actuelle/future - Utilisation du planning actuel`)
        // ========== FIN DÉTECTION ==========

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

        // Filtrer pour ne garder que les jours <= aujourd'hui (pas de "présences" futures)
        const aujourdhuiStr = new Date().toISOString().split('T')[0]
        const resultatsFiltre = resultats.filter(intervention => intervention.date <= aujourdhuiStr)

        console.log(`✅ ${resultats.length} interventions prévues trouvées (${resultatsFiltre.length} après filtrage jours futurs)`)

        if (format === 'export') {
            return res.status(200).json(formatForExport(resultatsFiltre))
        }

        return res.status(200).json(resultatsFiltre)

    } catch (error) {
        console.error('Erreur API presences-formateurs:', error)
        return res.status(500).json({ error: 'Erreur serveur' })
    }
}

// GET pour les semaines passées - Utilise uniquement l'historique figé (presence_formateurs)
async function handleGetSemainePassee(req, res, formateur_id, date_debut, date_fin, formateurABureau) {
    try {
        // Récupérer UNIQUEMENT les présences stockées dans presence_formateurs
        const { data: presences, error: presencesError } = await supabaseAdmin
            .from('presence_formateurs')
            .select('*')
            .eq('formateur_id', formateur_id)
            .gte('date', date_debut)
            .lte('date', date_fin)
            .order('date', { ascending: true })
            .order('periode', { ascending: true })

        if (presencesError) throw presencesError

        // Récupérer les lieux pour afficher les noms complets
        const { data: lieux, error: lieuxError } = await supabaseAdmin
            .from('lieux')
            .select('id, nom, initiale')

        if (lieuxError) throw lieuxError

        // Formater les résultats dans le même format que handleGet
        const resultats = (presences || []).map(presence => {
            const dateObj = new Date(presence.date)
            const jourFrancais = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' })
            const jourCapitalized = jourFrancais.charAt(0).toUpperCase() + jourFrancais.slice(1)
            const creneauDisplay = presence.periode === 'matin' ? 'Matin' : 'AM'

            // Trouver le lieu complet depuis les initiales
            const lieu = lieux.find(l => l.initiale === presence.lieu || l.nom === presence.lieu)

            return {
                date: presence.date,
                jour: jourCapitalized,
                creneau: creneauDisplay,
                periode: presence.periode,
                statut_prevu: presence.type_intervention || 'historique',
                lieu_prevu: presence.lieu_prevu || (lieu ? lieu.nom : presence.lieu),
                lieu_prevu_initiale: lieu ? lieu.initiale : presence.lieu,
                source: presence.source || 'existant',
                // Présence déclarée (déjà dans la BDD)
                present: presence.present,
                lieu_declare: presence.lieu,
                date_declaration: presence.created_at,
                // Statut final
                statut_final: presence.present ? 'present' : 'absent'
            }
        })

        // Filtrer pour ne garder que les jours <= aujourd'hui (sécurité supplémentaire)
        const aujourdhuiStr = new Date().toISOString().split('T')[0]
        const resultatsFiltre = resultats.filter(presence => presence.date <= aujourdhuiStr)

        console.log(`✅ ${resultats.length} présences (historique figé) trouvées (${resultatsFiltre.length} après filtrage)`)

        return res.status(200).json(resultatsFiltre)

    } catch (error) {
        console.error('Erreur API presences-formateurs (semaine passée):', error)
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

// POST - Générer automatiquement les présences basées sur le planning et les absences
async function handlePost(req, res) {
    try {
        const { formateur_id, date_debut, date_fin } = req.body

        if (!formateur_id || !date_debut || !date_fin) {
            return res.status(400).json({ error: 'formateur_id, date_debut et date_fin requis' })
        }

        console.log(`🤖 Génération automatique des présences pour formateur ${formateur_id} du ${date_debut} au ${date_fin}`)

        // 1. Récupérer les infos du formateur
        const { data: formateurData, error: formateurError } = await supabaseAdmin
            .from('users')
            .select('id, nom, prenom, bureau')
            .eq('id', formateur_id)
            .single()

        if (formateurError) throw formateurError

        const estBureau = formateurData?.bureau === true
        console.log(`📍 Formateur ${formateurData.prenom} ${formateurData.nom} - Bureau: ${estBureau}`)

        // 2. Récupérer les absences validées pour la période
        const { data: absences, error: absencesError } = await supabaseAdmin
            .from('absences_formateurs')
            .select('id, date_debut, date_fin, type, statut')
            .eq('formateur_id', formateur_id)
            .eq('statut', 'validé')

        if (absencesError) throw absencesError

        // 3. Récupérer les affectations coordo pour la période
        const { data: planningCoordo, error: coordoError } = await supabaseAdmin
            .from('planning_hebdomadaire')
            .select('id, date, jour, creneau, lieu_id, formateurs_ids')
            .gte('date', date_debut)
            .lte('date', date_fin)

        if (coordoError) throw coordoError

        // Filtrer pour ce formateur spécifique
        const planningCoordoFormateur = (planningCoordo || []).filter(pc => {
            return pc.formateurs_ids && pc.formateurs_ids.includes(formateur_id)
        })

        // 4. Récupérer le planning type du formateur
        const { data: planningType, error: planningTypeError } = await supabaseAdmin
            .from('planning_type_formateurs')
            .select('id, jour, creneau, statut, lieu_id, valide')
            .eq('formateur_id', formateur_id)
            .eq('valide', true)
            .eq('statut', 'disponible')

        if (planningTypeError) throw planningTypeError

        // 5. Récupérer les lieux pour obtenir les initiales
        const { data: lieux, error: lieuxError } = await supabaseAdmin
            .from('lieux')
            .select('id, nom, initiale')

        if (lieuxError) throw lieuxError

        const joursMapping = {
            'lundi': 'Lundi',
            'mardi': 'Mardi',
            'mercredi': 'Mercredi',
            'jeudi': 'Jeudi',
            'vendredi': 'Vendredi'
        }

        // 6. Générer les présences
        const presencesACreer = []
        const dateDebutObj = new Date(date_debut)
        const dateFinObj = new Date(date_fin)

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

                // Vérifier si le formateur est absent ce jour-là
                const absenceJour = absences.find(abs => {
                    const debut = new Date(abs.date_debut)
                    const fin = new Date(abs.date_fin)
                    const current = new Date(dateString)
                    return current >= debut && current <= fin && abs.type !== 'formation'
                })

                // Si absence validée (hors formation), on ne crée PAS de présence
                if (absenceJour) {
                    console.log(`⏭️  ${dateString} ${creneauDisplay} - Absence validée, skip`)
                    continue
                }

                // Vérifier affectation coordo (priorité 1)
                const affectationCoordo = planningCoordoFormateur.find(pc => {
                    return pc.date === dateString && pc.jour === jourCapitalized && pc.creneau === creneauDB
                })

                if (affectationCoordo) {
                    const lieu = lieux.find(l => l.id === affectationCoordo.lieu_id)
                    presencesACreer.push({
                        formateur_id: formateur_id,
                        date: dateString,
                        periode: periodeDB,
                        lieu: lieu ? lieu.initiale : 'ACLEF',
                        present: true,
                        lieu_prevu: lieu ? lieu.nom : 'ACLEF',
                        type_intervention: 'affecte_coordo',
                        source: 'planning_coordo'
                    })
                    console.log(`✅ ${dateString} ${creneauDisplay} - Affectation coordo au ${lieu?.nom || 'lieu inconnu'}`)
                    continue
                }

                // Vérifier planning type (priorité 2)
                const jourKey = Object.keys(joursMapping).find(key => joursMapping[key] === jourCapitalized)
                const creneauType = planningType.find(pt =>
                    pt.jour === jourKey && pt.creneau === creneauDisplay
                )

                if (creneauType) {
                    const lieu = lieux.find(l => l.id === creneauType.lieu_id)
                    presencesACreer.push({
                        formateur_id: formateur_id,
                        date: dateString,
                        periode: periodeDB,
                        lieu: lieu ? lieu.initiale : 'ACLEF',
                        present: true,
                        lieu_prevu: lieu ? lieu.nom : 'ACLEF',
                        type_intervention: 'planning_type',
                        source: 'planning_type'
                    })
                    console.log(`✅ ${dateString} ${creneauDisplay} - Planning type au ${lieu?.nom || 'lieu inconnu'}`)
                    continue
                }

                // Pas d'affectation pour ce créneau
                console.log(`⏭️  ${dateString} ${creneauDisplay} - Aucune affectation`)
            }
        }

        // 7. Insérer les présences (UPSERT pour éviter les doublons)
        let presencesCreees = 0
        const details = []

        for (const presence of presencesACreer) {
            const { data, error } = await supabaseAdmin
                .from('presence_formateurs')
                .upsert(
                    presence,
                    {
                        onConflict: 'formateur_id,date,periode',
                        ignoreDuplicates: false
                    }
                )
                .select()

            if (error) {
                console.error(`❌ Erreur insertion présence ${presence.date} ${presence.periode}:`, error)
            } else {
                presencesCreees++
                details.push({
                    date: presence.date,
                    periode: presence.periode,
                    lieu: presence.lieu
                })
            }
        }

        console.log(`✅ ${presencesCreees} présences générées avec succès`)

        return res.status(200).json({
            success: true,
            presences_creees: presencesCreees,
            details: details,
            message: `${presencesCreees} présence(s) générée(s) automatiquement pour la période`
        })

    } catch (error) {
        console.error('❌ Erreur génération automatique présences:', error)
        return res.status(500).json({ error: 'Erreur serveur lors de la génération automatique' })
    }
}
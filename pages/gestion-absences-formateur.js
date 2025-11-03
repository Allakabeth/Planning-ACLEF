import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { withAuthAdmin } from '../components/withAuthAdmin'

function GestionAbsencesFormateur({ user, logout, inactivityTime, priority }) {
    const router = useRouter()

    // 🎯 MODE ÉDITION : Seulement le premier admin (vert) peut modifier
    const canEdit = priority === 1;

    // États
    const [formateurs, setFormateurs] = useState([])
    const [formateurSelectionne, setFormateurSelectionne] = useState('')
    const [presences, setPresences] = useState([])
    const [dateDebut, setDateDebut] = useState('')
    const [dateFin, setDateFin] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [stats, setStats] = useState({})
    const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
    const [distances, setDistances] = useState({}); // Distances formateur → lieux {lieu_id: distance_km}

    useEffect(() => {
        chargerFormateurs()
        // Définir la période par défaut (mois en cours)
        const now = new Date()
        const debutMois = new Date(now.getFullYear(), now.getMonth(), 1)
        const finMois = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        setDateDebut(debutMois.toISOString().split('T')[0])
        setDateFin(finMois.toISOString().split('T')[0])
    }, [])

    useEffect(() => {
        if (formateurSelectionne && dateDebut && dateFin) {
            const chargerTout = async () => {
                const distancesChargees = await chargerDistances()
                await chargerPresences(distancesChargees)
            }
            chargerTout()
        }
    }, [formateurSelectionne, dateDebut, dateFin])

    // 👥 Charger et écouter les admins connectés en temps réel
    useEffect(() => {
        if (!user) return;

        fetchConnectedAdmins();

        const channel = supabase
            .channel('admin_sessions_changes_gestion_absences_formateur')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'admin_sessions'
                },
                () => {
                    fetchConnectedAdmins();
                }
            )
            .subscribe();

        const refreshInterval = setInterval(() => {
            fetchConnectedAdmins();
        }, 30000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(refreshInterval);
        };
    }, [user]);

    // 🔄 Recharger les données quand la priorité change
    useEffect(() => {
        console.log('🔄 Priorité changée, rechargement absences...');
        if (formateurSelectionne && dateDebut && dateFin) {
            chargerPresences();
        }
    }, [priority]);

    // 👂 Écoute en temps réel des modifications des absences formateurs
    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('absences_formateurs_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'presences_formateurs'
            }, (payload) => {
                console.log('🔄 Modification absences formateurs détectée, refresh...');
                if (formateurSelectionne && dateDebut && dateFin) {
                    chargerPresences();
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, formateurSelectionne, dateDebut, dateFin]);

    const chargerFormateurs = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, nom, prenom, bureau')
                .eq('role', 'formateur')
                .eq('archive', false)
                .order('nom')

            if (error) throw error
            setFormateurs(data || [])
        } catch (error) {
            console.error('Erreur chargement formateurs:', error)
            setMessage('Erreur lors du chargement des formateurs')
        }
    }

    const chargerDistances = async () => {
        if (!formateurSelectionne) return

        try {
            const { data, error } = await supabase
                .from('distances_formateurs')
                .select(`
                    lieu_id,
                    distance_km,
                    lieux (nom, initiale)
                `)
                .eq('formateur_id', formateurSelectionne)

            if (error) throw error

            console.log('🔍 [DEBUG] Distances chargées depuis BDD:', data)

            // Créer un map {lieu_nom: distance_km} et {lieu_initiale: distance_km}
            const distancesMap = {}
            if (data) {
                data.forEach(d => {
                    if (d.lieux) {
                        distancesMap[d.lieux.nom] = d.distance_km
                        distancesMap[d.lieux.initiale] = d.distance_km
                        console.log(`📍 [DEBUG] ${d.lieux.nom} (${d.lieux.initiale}) = ${d.distance_km} km`)
                    }
                })
            }
            setDistances(distancesMap)
            return distancesMap
        } catch (error) {
            console.error('Erreur chargement distances:', error)
            return {}
        }
    }

    const chargerPresences = async (distancesMap = null) => {
        if (!formateurSelectionne || !dateDebut || !dateFin) return

        try {
            setIsLoading(true)
            const response = await fetch(`/api/admin/presences-formateurs?formateur_id=${formateurSelectionne}&date_debut=${dateDebut}&date_fin=${dateFin}`)

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des présences')
            }

            const data = await response.json()
            setPresences(data)
            calculerStats(data, distancesMap)
        } catch (error) {
            console.error('Erreur chargement présences:', error)
            setMessage('Erreur lors du chargement des présences')
        } finally {
            setIsLoading(false)
        }
    }

    const calculerStats = (interventionsData, distancesMap = null) => {
        let totalInterventions = 0
        let presentsInterventions = 0
        let bureauInterventions = 0
        let nonDeclareInterventions = 0
        let totalKmAllerRetour = 0

        const lieuxStats = {}
        const distancesAUtiliser = distancesMap || distances

        // Regrouper par date pour compter 1 seul déplacement par jour
        const presencesParDate = {}

        console.log('🔍 [DEBUG] Calcul stats avec distances:', distancesAUtiliser)

        interventionsData.forEach(intervention => {
            totalInterventions++
            if (intervention.statut_final === 'present') {
                presentsInterventions++
                // Compter les interventions Bureau
                if (intervention.statut_prevu === 'bureau') {
                    bureauInterventions++
                }
                const lieuDeclare = intervention.lieu_declare || intervention.lieu_prevu_initiale || 'Non défini'
                if (lieuxStats[lieuDeclare]) {
                    lieuxStats[lieuDeclare]++
                } else {
                    lieuxStats[lieuDeclare] = 1
                }

                // Regrouper par date (1 déplacement/jour même si M+AM)
                const dateKey = intervention.date
                if (!presencesParDate[dateKey]) {
                    presencesParDate[dateKey] = {
                        lieu: lieuDeclare,
                        creneaux: []
                    }
                }
                presencesParDate[dateKey].creneaux.push(intervention.creneau)
            } else {
                nonDeclareInterventions++
            }
        })

        // Calculer les km (1 déplacement par date) et enrichir presencesParDate
        Object.entries(presencesParDate).forEach(([date, info]) => {
            const distance = distancesAUtiliser[info.lieu]
            console.log(`🔍 [DEBUG] ${date} - Lieu: ${info.lieu}, Créneaux: ${info.creneaux.join(', ')}, Distance: ${distance} km`)
            if (distance && !isNaN(distance)) {
                const kmAR = parseFloat(distance) // Déjà en aller-retour
                totalKmAllerRetour += kmAR
                presencesParDate[date].km = kmAR // Ajouter le km à chaque date
                console.log(`✅ [DEBUG] Ajout ${kmAR} km`)
            }
        })

        console.log(`📊 [DEBUG] Total km aller-retour: ${totalKmAllerRetour}`)

        const tauxPresence = totalInterventions > 0 ? Math.round((presentsInterventions / totalInterventions) * 100) : 0

        setStats({
            totalInterventions,
            presentsInterventions,
            bureauInterventions,
            nonDeclareInterventions,
            tauxPresence,
            lieuxStats,
            totalKmAllerRetour,
            presencesParDate // Pour afficher les km par ligne (objet indexé par date)
        })
    }

    // Fonction pour récupérer la liste des admins connectés
    const fetchConnectedAdmins = async () => {
        try {
            const { data: sessions, error: sessionsError } = await supabase
                .from('admin_sessions')
                .select('admin_user_id, admin_email, current_page, page_priority, heartbeat')
                .eq('is_active', true)
                .order('heartbeat', { ascending: false});

            if (sessionsError) {
                console.error('❌ Erreur récupération sessions:', sessionsError);
                return;
            }

            if (!sessions || sessions.length === 0) {
                setConnectedAdmins([]);
                return;
            }

            const adminsFormatted = sessions
                .filter(session => session.admin_email)
                .map(session => ({
                    email: session.admin_email,
                    name: session.admin_email.split('@')[0].charAt(0).toUpperCase() + session.admin_email.split('@')[0].slice(1),
                    currentPage: session.current_page,
                    priority: session.page_priority,
                    lastActive: session.heartbeat
                }));

            setConnectedAdmins(adminsFormatted);
        } catch (error) {
            console.error('❌ Erreur fetchConnectedAdmins:', error);
        }
    };

    const declarerPresenceAdmin = async (intervention, estPresent) => {
        if (!formateurSelectionne) return

        try {
            setIsLoading(true)

            const periode = intervention.creneau === 'Matin' ? 'matin' : 'apres_midi'
            const lieuParDefaut = 'ACLEF'

            // Vérifier si une entrée existe déjà
            const { data: existingPresence, error: checkError } = await supabase
                .from('presence_formateurs')
                .select('id')
                .eq('formateur_id', formateurSelectionne)
                .eq('date', intervention.date)
                .eq('periode', periode)
                .single()

            if (checkError && checkError.code !== 'PGRST116') {
                throw checkError
            }

            // Si estPresent === null, c'est une annulation (supprimer l'entrée)
            if (estPresent === null) {
                if (existingPresence) {
                    const { error: deleteError } = await supabase
                        .from('presence_formateurs')
                        .delete()
                        .eq('id', existingPresence.id)

                    if (deleteError) throw deleteError

                    setMessage('✅ Remis en "Non déclaré"')
                }
            } else {
                // Déclaration normale (présent ou absent)
                if (existingPresence) {
                    // Mettre à jour l'enregistrement existant
                    const { error: updateError } = await supabase
                        .from('presence_formateurs')
                        .update({ present: estPresent })
                        .eq('id', existingPresence.id)

                    if (updateError) throw updateError
                } else {
                    // Créer un nouvel enregistrement
                    const { error: insertError } = await supabase
                        .from('presence_formateurs')
                        .insert([{
                            formateur_id: formateurSelectionne,
                            date: intervention.date,
                            periode: periode,
                            lieu: lieuParDefaut,
                            present: estPresent
                        }])

                    if (insertError) throw insertError
                }

                setMessage(`✅ Présence déclarée : ${estPresent ? 'Présent' : 'Absent'}`)
            }

            setTimeout(() => setMessage(''), 3000)

            // Recharger les données
            await chargerPresences()

        } catch (error) {
            console.error('Erreur déclaration présence:', error)
            setMessage('❌ Erreur lors de la déclaration')
            setTimeout(() => setMessage(''), 3000)
        } finally {
            setIsLoading(false)
        }
    }

    const exporterExcel = async () => {
        if (!formateurSelectionne || presences.length === 0) {
            setMessage('Veuillez sélectionner un formateur et charger ses données')
            return
        }

        try {
            const formateurInfo = formateurs.find(f => f.id === formateurSelectionne)

            // Créer les données pour l'export CSV avec nouvelle structure
            const exportData = presences.map(intervention => ({
                'Date': new Date(intervention.date).toLocaleDateString('fr-FR'),
                'Jour': intervention.jour,
                'Créneau': intervention.creneau,
                'Lieu prévu': intervention.lieu_prevu,
                'Type intervention': intervention.statut_prevu === 'affecte_coordo' ? 'Affecté coordo' :
                                   intervention.statut_prevu === 'dispo_except' ? 'Dispo exceptionnelle' :
                                   intervention.statut_prevu === 'disponible_non_choisi' ? 'Disponible' :
                                   intervention.statut_prevu === 'bureau' ? 'Bureau' : intervention.statut_prevu,
                'Présence déclarée': intervention.statut_final === 'present' ? 'Présent' :
                                   intervention.statut_final === 'absent' ? 'Absent' : 'Non déclaré',
                'Lieu déclaré': intervention.lieu_declare || '-',
                'Date déclaration': intervention.date_declaration ?
                    new Date(intervention.date_declaration).toLocaleDateString('fr-FR') : '-'
            }))

            // Créer un fichier CSV
            const csvContent = convertToCSV(exportData, formateurInfo)
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')

            if (link.download !== undefined) {
                const url = URL.createObjectURL(blob)
                link.setAttribute('href', url)
                link.setAttribute('download', `interventions_${formateurInfo.nom}_${formateurInfo.prenom}_${dateDebut}_${dateFin}.csv`)
                link.style.visibility = 'hidden'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
            }

            setMessage('✅ Export CSV généré avec succès')
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            console.error('Erreur export:', error)
            setMessage('❌ Erreur lors de l\'export')
        }
    }

    const convertToCSV = (data, formateurInfo) => {
        if (!data || data.length === 0) return ''

        const headers = Object.keys(data[0])

        // En-tête avec informations du formateur
        let csv = `Interventions prévues de ${formateurInfo.nom} ${formateurInfo.prenom}\n`
        csv += `Période: ${new Date(dateDebut).toLocaleDateString('fr-FR')} - ${new Date(dateFin).toLocaleDateString('fr-FR')}\n`
        const bureauText = formateurInfo.bureau ? ` (dont ${stats.bureauInterventions || 0} bureau)` : ''
        csv += `Statistiques: ${stats.presentsInterventions || 0} présent(e)s${bureauText}, ${stats.nonDeclareInterventions || 0} non déclaré(e)s sur ${stats.totalInterventions || 0} interventions prévues\n\n`

        // Headers
        csv += headers.join(',') + '\n'

        // Data
        data.forEach(row => {
            csv += headers.map(header => {
                const value = row[header]
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            }).join(',') + '\n'
        })

        return csv
    }

    const exporterPDF = async () => {
        if (!formateurSelectionne || presences.length === 0) {
            setMessage('Veuillez sélectionner un formateur et charger ses données')
            return
        }

        try {
            const formateurInfo = formateurs.find(f => f.id === formateurSelectionne)

            // Créer le contenu HTML pour l'impression
            const printContent = `
                <html>
                <head>
                    <title>Interventions ${formateurInfo.nom} ${formateurInfo.prenom}</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 12px; }
                        h1 { color: #1f2937; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f3f4f6; font-weight: bold; }
                        .present { background-color: #dcfce7; color: #166534; }
                        .absent { background-color: #fef2f2; color: #991b1b; }
                        .non-declare { background-color: #fef3c7; color: #92400e; }
                        .stats { margin: 20px 0; padding: 15px; background-color: #f9fafb; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    <h1>Interventions prévues de ${formateurInfo.nom} ${formateurInfo.prenom}</h1>
                    <p><strong>Période :</strong> ${new Date(dateDebut).toLocaleDateString('fr-FR')} - ${new Date(dateFin).toLocaleDateString('fr-FR')}</p>

                    <div class="stats">
                        <h3>Statistiques</h3>
                        <p>• Interventions prévues : ${stats.totalInterventions || 0}</p>
                        <p>• Présent : ${stats.presentsInterventions || 0}</p>
                        ${formateurInfo.bureau ? `<p>• Bureau : ${stats.bureauInterventions || 0}</p>` : ''}
                        <p>• Non déclaré : ${stats.nonDeclareInterventions || 0}</p>
                        ${stats.totalKmAllerRetour > 0 ? `<p><strong>• Total km aller-retour : ${Math.round(stats.totalKmAllerRetour)} km</strong></p>` : ''}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Créneau</th>
                                <th>Lieu prévu</th>
                                <th>Type intervention</th>
                                <th>Présence déclarée</th>
                                <th>Lieu déclaré</th>
                                <th>Date déclaration</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${presences.map(intervention => `
                                <tr>
                                    <td>${new Date(intervention.date).toLocaleDateString('fr-FR')}<br><small>${intervention.jour}</small></td>
                                    <td>${intervention.creneau}</td>
                                    <td>${intervention.lieu_prevu}</td>
                                    <td>${intervention.statut_prevu === 'affecte_coordo' ? 'Affecté coordo' :
                                         intervention.statut_prevu === 'dispo_except' ? 'Dispo except.' :
                                         intervention.statut_prevu === 'disponible_non_choisi' ? 'Disponible' :
                                         intervention.statut_prevu === 'bureau' ? 'Bureau' : intervention.statut_prevu}</td>
                                    <td class="${intervention.statut_final}">
                                        ${intervention.statut_final === 'present' ? '✓ Présent' :
                                          intervention.statut_final === 'absent' ? '✗ Absent' : '⚠ Non déclaré'}
                                    </td>
                                    <td>${intervention.lieu_declare || '-'}</td>
                                    <td>${intervention.date_declaration ? new Date(intervention.date_declaration).toLocaleDateString('fr-FR') : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </body>
                </html>
            `

            // Ouvrir une nouvelle fenêtre pour l'impression
            const printWindow = window.open('', '_blank')
            printWindow.document.open()
            printWindow.document.write(printContent)
            printWindow.document.close()

            // Attendre que le contenu soit chargé puis imprimer
            printWindow.onload = function() {
                printWindow.focus()
                printWindow.print()
            }

            setMessage('✅ Ouverture de l\'aperçu d\'impression PDF')
            setTimeout(() => setMessage(''), 3000)
        } catch (error) {
            console.error('Erreur export PDF:', error)
            setMessage('❌ Erreur lors de la génération du PDF')
            setTimeout(() => setMessage(''), 3000)
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('fr-FR')
    }

    const formatPeriode = (periode) => {
        return periode === 'matin' ? 'Matin' : 'Après-midi'
    }

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '1400px',
                margin: '0 auto'
            }}>
                {/* Header */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div>
                        <h1 style={{
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            margin: '0 0 5px 0'
                        }}>
                            📊 Gestion Présences Formateur
                        </h1>
                        <p style={{
                            color: '#6b7280',
                            margin: 0
                        }}>
                            Consultation et export des présences par formateur
                        </p>
                    </div>

                    <button
                        onClick={() => router.push('/')}
                        style={{
                            backgroundColor: '#6b7280',
                            color: 'white',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 'bold'
                        }}
                    >
                        Retour Accueil
                    </button>
                </div>

                {/* Bandeau blanc avec status */}
                <div className="no-print" style={{
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    padding: '8px 20px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px'
                }}>
                    {priority && priority < 999 && (
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            backgroundColor: priority === 1 ? '#10b981' : priority === 2 ? '#f59e0b' : '#dc2626',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '18px',
                            fontWeight: 'bold',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                            {priority}
                        </div>
                    )}

                    {/* Séparateur */}
                    {priority && priority < 999 && connectedAdmins.length > 0 && (
                        <div style={{
                            width: '1px',
                            height: '32px',
                            backgroundColor: '#e5e7eb'
                        }} />
                    )}

                    {/* Liste des admins connectés */}
                    {connectedAdmins.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                            <span style={{
                                color: '#9ca3af',
                                fontSize: '12px',
                                fontWeight: '600'
                            }}>
                                👥
                            </span>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {connectedAdmins.filter(admin => admin.email !== user?.email).map((admin, index) => {
                                    let badgeColor, action, pageName;

                                    if (!admin.currentPage || admin.currentPage === '/' || admin.currentPage === '') {
                                        badgeColor = '#10b981';
                                        action = 'consulte';
                                        pageName = 'la messagerie';
                                    } else {
                                        badgeColor = admin.priority === 1 ? '#10b981' : admin.priority === 2 ? '#f59e0b' : '#ef4444';
                                        action = admin.priority === 1 ? 'modifie' : 'consulte';
                                        pageName = admin.currentPage.replace('/', '').replace(/-/g, ' ');
                                    }

                                    return (
                                        <div key={index} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '4px 8px',
                                            backgroundColor: badgeColor,
                                            borderRadius: '6px',
                                            fontSize: '13px',
                                            color: 'white'
                                        }}>
                                            <span style={{ fontWeight: '600' }}>
                                                {admin.name}
                                            </span>
                                            <span style={{ fontWeight: '400' }}>
                                                {action} {pageName}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Message */}
                {message && (
                    <div style={{
                        backgroundColor: message.includes('Erreur') ? '#fee2e2' : '#d1fae5',
                        border: `1px solid ${message.includes('Erreur') ? '#fecaca' : '#a7f3d0'}`,
                        color: message.includes('Erreur') ? '#991b1b' : '#065f46',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: '20px'
                    }}>
                        {message}
                    </div>
                )}

                {/* Filtres */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                    <h2 style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        marginBottom: '15px',
                        color: '#1f2937'
                    }}>
                        Filtres
                    </h2>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr 1fr auto',
                        gap: '15px',
                        alignItems: 'end'
                    }}>
                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '5px',
                                fontWeight: 'bold',
                                color: '#374151'
                            }}>
                                Formateur
                            </label>
                            <select
                                value={formateurSelectionne}
                                onChange={(e) => setFormateurSelectionne(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            >
                                <option value="">Sélectionner un formateur</option>
                                {formateurs.map(formateur => (
                                    <option key={formateur.id} value={formateur.id}>
                                        {formateur.nom} {formateur.prenom}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '5px',
                                fontWeight: 'bold',
                                color: '#374151'
                            }}>
                                Date début
                            </label>
                            <input
                                type="date"
                                value={dateDebut}
                                onChange={(e) => setDateDebut(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                display: 'block',
                                marginBottom: '5px',
                                fontWeight: 'bold',
                                color: '#374151'
                            }}>
                                Date fin
                            </label>
                            <input
                                type="date"
                                value={dateFin}
                                onChange={(e) => setDateFin(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '8px',
                                    fontSize: '14px'
                                }}
                            />
                        </div>

                        <button
                            onClick={chargerPresences}
                            disabled={!formateurSelectionne || !dateDebut || !dateFin || isLoading || !canEdit}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                            style={{
                                backgroundColor: !canEdit ? '#94a3b8' : (formateurSelectionne && dateDebut && dateFin ? '#3b82f6' : '#9ca3af'),
                                color: 'white',
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: !canEdit ? 'not-allowed' : (formateurSelectionne && dateDebut && dateFin ? 'pointer' : 'not-allowed'),
                                fontSize: '14px',
                                fontWeight: 'bold',
                                opacity: !canEdit ? 0.6 : 1
                            }}
                        >
                            {isLoading ? 'Chargement...' : 'Charger'}
                        </button>
                    </div>
                </div>

                {/* Statistiques */}
                {presences.length > 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '15px',
                            color: '#1f2937'
                        }}>
                            Statistiques
                        </h2>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '15px',
                            marginBottom: '20px'
                        }}>
                            <div style={{
                                backgroundColor: '#f3f4f6',
                                padding: '15px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1f2937' }}>
                                    {stats.totalInterventions}
                                </div>
                                <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                    Interventions prévues
                                </div>
                            </div>

                            <div style={{
                                backgroundColor: '#dcfce7',
                                padding: '15px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#166534' }}>
                                    {stats.presentsInterventions}
                                </div>
                                <div style={{ fontSize: '14px', color: '#166534' }}>
                                    Présent
                                </div>
                            </div>

                            {/* Afficher l'encart Bureau uniquement si le formateur est membre du bureau */}
                            {formateurs.find(f => f.id === formateurSelectionne)?.bureau && (
                                <div style={{
                                    backgroundColor: '#e0e7ff',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4338ca' }}>
                                        {stats.bureauInterventions}
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#4338ca' }}>
                                        Bureau
                                    </div>
                                </div>
                            )}

                            <div style={{
                                backgroundColor: '#fef3c7',
                                padding: '15px',
                                borderRadius: '8px',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#92400e' }}>
                                    {stats.nonDeclareInterventions}
                                </div>
                                <div style={{ fontSize: '14px', color: '#92400e' }}>
                                    Non déclaré
                                </div>
                            </div>

                            {/* Kilomètres totaux */}
                            {stats.totalKmAllerRetour > 0 && (
                                <div style={{
                                    backgroundColor: '#dbeafe',
                                    padding: '15px',
                                    borderRadius: '8px',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e40af' }}>
                                        {Math.round(stats.totalKmAllerRetour)} km
                                    </div>
                                    <div style={{ fontSize: '14px', color: '#1e40af' }}>
                                        Aller-retour cumulés
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Répartition par lieux */}
                        {Object.keys(stats.lieuxStats || {}).length > 0 && (
                            <div>
                                <h3 style={{
                                    fontSize: '16px',
                                    fontWeight: 'bold',
                                    marginBottom: '10px',
                                    color: '#1f2937'
                                }}>
                                    Répartition par lieux
                                </h3>
                                <div style={{
                                    display: 'flex',
                                    gap: '10px',
                                    flexWrap: 'wrap'
                                }}>
                                    {Object.entries(stats.lieuxStats).map(([lieu, count]) => (
                                        <div key={lieu} style={{
                                            backgroundColor: '#f9fafb',
                                            border: '1px solid #e5e7eb',
                                            padding: '8px 12px',
                                            borderRadius: '20px',
                                            fontSize: '14px'
                                        }}>
                                            <strong>{lieu}</strong>: {count} fois
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Boutons d'export */}
                {presences.length > 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '20px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        gap: '15px',
                        justifyContent: 'center'
                    }}>
                        <button
                            onClick={exporterExcel}
                            disabled={!canEdit}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                            style={{
                                backgroundColor: !canEdit ? '#94a3b8' : '#059669',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: !canEdit ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !canEdit ? 0.6 : 1
                            }}
                        >
                            📊 Exporter CSV
                        </button>

                        <button
                            onClick={exporterPDF}
                            disabled={!canEdit}
                            title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                            style={{
                                backgroundColor: !canEdit ? '#94a3b8' : '#dc2626',
                                color: 'white',
                                padding: '12px 24px',
                                borderRadius: '8px',
                                border: 'none',
                                cursor: !canEdit ? 'not-allowed' : 'pointer',
                                fontSize: '14px',
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                opacity: !canEdit ? 0.6 : 1
                            }}
                        >
                            📄 Exporter PDF
                        </button>
                    </div>
                )}

                {/* Tableau des présences */}
                {presences.length > 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '20px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <h2 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            marginBottom: '15px',
                            color: '#1f2937'
                        }}>
                            📅 Interventions prévues et présences déclarées
                        </h2>

                        <div style={{
                            maxHeight: '500px',
                            overflowY: 'auto'
                        }}>
                            <table style={{
                                width: '100%',
                                borderCollapse: 'collapse'
                            }}>
                                <thead style={{
                                    backgroundColor: '#f3f4f6',
                                    position: 'sticky',
                                    top: 0
                                }}>
                                    <tr>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            Date
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            Créneau
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            Lieu prévu
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            Type intervention
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'center',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            Présence déclarée
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            Lieu déclaré
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'left',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            Date déclaration
                                        </th>
                                        <th style={{
                                            padding: '12px',
                                            textAlign: 'center',
                                            borderBottom: '1px solid #e5e7eb',
                                            fontWeight: 'bold'
                                        }}>
                                            km A/R
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {presences.map((intervention, index) => (
                                        <tr key={`${intervention.date}-${intervention.creneau}`} style={{
                                            backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb'
                                        }}>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                {formatDate(intervention.date)}
                                                <br />
                                                <small style={{ color: '#6b7280' }}>{intervention.jour}</small>
                                            </td>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                {intervention.creneau}
                                            </td>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                {intervention.lieu_prevu}
                                            </td>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    backgroundColor:
                                                        intervention.statut_prevu === 'affecte_coordo' ? '#dbeafe' :
                                                        intervention.statut_prevu === 'dispo_except' ? '#fef3c7' :
                                                        intervention.statut_prevu === 'disponible_non_choisi' ? '#f3f4f6' :
                                                        intervention.statut_prevu === 'bureau' ? '#f3e8ff' : '#f3f4f6',
                                                    color:
                                                        intervention.statut_prevu === 'affecte_coordo' ? '#1e40af' :
                                                        intervention.statut_prevu === 'dispo_except' ? '#92400e' :
                                                        intervention.statut_prevu === 'disponible_non_choisi' ? '#6b7280' :
                                                        intervention.statut_prevu === 'bureau' ? '#7c3aed' : '#6b7280'
                                                }}>
                                                    {intervention.statut_prevu === 'affecte_coordo' ? 'Affecté coordo' :
                                                     intervention.statut_prevu === 'dispo_except' ? 'Dispo except.' :
                                                     intervention.statut_prevu === 'disponible_non_choisi' ? 'Disponible' :
                                                     intervention.statut_prevu === 'bureau' ? 'Bureau' : intervention.statut_prevu}
                                                </span>
                                            </td>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb',
                                                textAlign: 'center'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                    {/* Badge principal */}
                                                    <span style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: 'bold',
                                                        backgroundColor:
                                                            intervention.statut_final === 'present' ? '#dcfce7' :
                                                            intervention.statut_final === 'absent' ? '#fef2f2' : '#fef3c7',
                                                        color:
                                                            intervention.statut_final === 'present' ? '#166534' :
                                                            intervention.statut_final === 'absent' ? '#991b1b' : '#92400e'
                                                    }}>
                                                        {intervention.statut_final === 'present' ? '✓ Présent' :
                                                         intervention.statut_final === 'absent' ? '✗ Absent' : '⚠ Non déclaré'}
                                                    </span>

                                                    {/* Boutons icônes pour changer le statut */}
                                                    <div style={{ display: 'flex', gap: '4px' }}>
                                                        {/* Bouton Présent */}
                                                        <button
                                                            onClick={() => declarerPresenceAdmin(intervention, true)}
                                                            disabled={!canEdit}
                                                            title={!canEdit ? 'Mode consultation' : 'Déclarer présent'}
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '6px',
                                                                backgroundColor: !canEdit ? '#e5e7eb' : intervention.statut_final === 'present' ? '#10b981' : '#dcfce7',
                                                                color: !canEdit ? '#9ca3af' : intervention.statut_final === 'present' ? 'white' : '#10b981',
                                                                border: intervention.statut_final === 'present' ? 'none' : '1px solid #10b981',
                                                                cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '14px',
                                                                fontWeight: 'bold',
                                                                padding: 0
                                                            }}
                                                        >
                                                            ✓
                                                        </button>

                                                        {/* Bouton Absent */}
                                                        <button
                                                            onClick={() => declarerPresenceAdmin(intervention, false)}
                                                            disabled={!canEdit}
                                                            title={!canEdit ? 'Mode consultation' : 'Déclarer absent'}
                                                            style={{
                                                                width: '24px',
                                                                height: '24px',
                                                                borderRadius: '6px',
                                                                backgroundColor: !canEdit ? '#e5e7eb' : intervention.statut_final === 'absent' ? '#ef4444' : '#fef2f2',
                                                                color: !canEdit ? '#9ca3af' : intervention.statut_final === 'absent' ? 'white' : '#ef4444',
                                                                border: intervention.statut_final === 'absent' ? 'none' : '1px solid #ef4444',
                                                                cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                fontSize: '14px',
                                                                fontWeight: 'bold',
                                                                padding: 0
                                                            }}
                                                        >
                                                            ✗
                                                        </button>

                                                        {/* Bouton Annuler (remettre en non déclaré) - uniquement si déjà déclaré */}
                                                        {intervention.statut_final !== 'non_declare' && (
                                                            <button
                                                                onClick={() => declarerPresenceAdmin(intervention, null)}
                                                                disabled={!canEdit}
                                                                title={!canEdit ? 'Mode consultation' : 'Annuler et remettre en non déclaré'}
                                                                style={{
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    borderRadius: '6px',
                                                                    backgroundColor: !canEdit ? '#e5e7eb' : '#fef3c7',
                                                                    color: !canEdit ? '#9ca3af' : '#92400e',
                                                                    border: '1px solid #fbbf24',
                                                                    cursor: !canEdit ? 'not-allowed' : 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '14px',
                                                                    fontWeight: 'bold',
                                                                    padding: 0
                                                                }}
                                                            >
                                                                ⚠
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb'
                                            }}>
                                                {intervention.lieu_declare || '-'}
                                            </td>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb',
                                                fontSize: '12px',
                                                color: '#6b7280'
                                            }}>
                                                {intervention.date_declaration ?
                                                    new Date(intervention.date_declaration).toLocaleDateString('fr-FR') :
                                                    '-'
                                                }
                                            </td>
                                            <td style={{
                                                padding: '12px',
                                                borderBottom: '1px solid #e5e7eb',
                                                textAlign: 'center',
                                                fontWeight: 'bold'
                                            }}>
                                                {(() => {
                                                    // Vérifier si c'est la première ligne pour cette date
                                                    if (index > 0 && presences[index - 1]?.date === intervention.date) {
                                                        // Ce n'est pas la première ligne pour cette date
                                                        return '-';
                                                    }

                                                    // C'est la première ligne pour cette date, chercher le km
                                                    if (stats?.presencesParDate && stats.presencesParDate[intervention.date]) {
                                                        const km = stats.presencesParDate[intervention.date].km;
                                                        if (km) {
                                                            return `${km.toFixed(1)} km`;
                                                        }
                                                    }

                                                    return '-';
                                                })()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Message si aucune donnée */}
                {!isLoading && formateurSelectionne && presences.length === 0 && (
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        padding: '40px',
                        textAlign: 'center',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                    }}>
                        <div style={{
                            fontSize: '48px',
                            marginBottom: '16px'
                        }}>
                            📊
                        </div>
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#1f2937',
                            marginBottom: '8px'
                        }}>
                            Aucune intervention prévue
                        </h3>
                        <p style={{
                            color: '#6b7280',
                            margin: 0
                        }}>
                            Ce formateur n'avait aucune intervention prévue sur la période sélectionnée.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

export default withAuthAdmin(GestionAbsencesFormateur)
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import { withAuthAdmin } from '../components/withAuthAdmin';

// Skeleton Loader spécifique à la gestion des absences apprenants
const SkeletonAbsenceLoader = () => {
  const shimmer = {
    background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite'
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 60px'
    }}>
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header Navigation Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '15px 25px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          height: '16px',
          width: '250px',
          borderRadius: '4px',
          ...shimmer
        }} />

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{
            height: '32px',
            width: '80px',
            borderRadius: '8px',
            ...shimmer
          }} />
          <div style={{
            height: '24px',
            width: '160px',
            borderRadius: '6px',
            ...shimmer
          }} />
          <div style={{
            height: '32px',
            width: '100px',
            borderRadius: '6px',
            ...shimmer
          }} />
        </div>
      </div>

      {/* Titre principal Skeleton */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{
          height: '32px',
          width: '320px',
          borderRadius: '4px',
          margin: '0 auto 10px',
          ...shimmer
        }} />
        <div style={{
          height: '16px',
          width: '480px',
          borderRadius: '4px',
          margin: '0 auto',
          ...shimmer
        }} />
      </div>

      {/* Formulaire Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          height: '24px',
          width: '200px',
          borderRadius: '4px',
          marginBottom: '20px',
          ...shimmer
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          {[1, 2, 3].map(i => (
            <div key={i}>
              <div style={{
                height: '16px',
                width: '100px',
                borderRadius: '4px',
                marginBottom: '8px',
                ...shimmer
              }} />
              <div style={{
                height: '40px',
                width: '100%',
                borderRadius: '6px',
                ...shimmer
              }} />
            </div>
          ))}
        </div>

        <div style={{
          height: '40px',
          width: '150px',
          borderRadius: '6px',
          ...shimmer
        }} />
      </div>

      {/* Liste Skeleton */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '15px 0',
            borderBottom: i < 4 ? '1px solid #f0f0f0' : 'none'
          }}>
            <div style={{
              height: '16px',
              width: '200px',
              borderRadius: '4px',
              ...shimmer
            }} />
            <div style={{
              height: '16px',
              width: '150px',
              borderRadius: '4px',
              ...shimmer
            }} />
            <div style={{
              height: '32px',
              width: '80px',
              borderRadius: '6px',
              ...shimmer
            }} />
          </div>
        ))}
      </div>
    </div>
  );
};

function AbsenceApprenant({ user, logout, inactivityTime, priority }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [apprenants, setApprenants] = useState([]);
  const [lieux, setLieux] = useState([]);
  const [absences, setAbsences] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filtreNom, setFiltreNom] = useState(''); // Filtre par nom d'apprenant
  const [connectedAdmins, setConnectedAdmins] = useState([]); // Liste des admins connectés
  const [apprenantsVerrouilles, setApprenantsVerrouilles] = useState([]); // Apprenants en cours d'édition
  const [editingId, setEditingId] = useState(null); // ID de l'absence en cours de modification

  // État du formulaire
  const [formData, setFormData] = useState({
    type: 'absence_periode', // absence_periode, absence_ponctuelle, presence_exceptionnelle
    apprenant_id: '',
    date_debut: '',
    date_fin: '',
    date_specifique: '',
    creneau: '',
    lieu_id: '',
    motif: '',
    commentaire: ''
  });

  // États pour le récapitulatif présences/absences
  const [showRecap, setShowRecap] = useState(false);
  const [recapApprenantId, setRecapApprenantId] = useState('');
  const [recapData, setRecapData] = useState([]);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapDateDebut, setRecapDateDebut] = useState('');
  const [recapDateFin, setRecapDateFin] = useState('');

  // 🎯 MODE ÉDITION : On peut modifier SI l'apprenant sélectionné n'est PAS verrouillé par un autre admin
  const apprenantEstVerrouille = formData.apprenant_id && apprenantsVerrouilles.some(v => v.apprenant_id === formData.apprenant_id);
  const canEdit = !apprenantEstVerrouille;

  useEffect(() => {
    loadData();
  }, []);

  // 👥 Charger et écouter les admins connectés en temps réel
  useEffect(() => {
    if (!user) return;

    fetchConnectedAdmins();
    fetchApprenantsVerrouilles();

    const channel = supabase
      .channel('admin_sessions_changes_absence_apprenant')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_sessions'
        },
        () => {
          fetchConnectedAdmins();
          fetchApprenantsVerrouilles();
        }
      )
      .subscribe();

    const refreshInterval = setInterval(() => {
      fetchConnectedAdmins();
      fetchApprenantsVerrouilles();
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(refreshInterval);
    };
  }, [user, apprenants]);

  // 🔓 Libérer le lock au unmount de la page
  useEffect(() => {
    return () => {
      // Libérer le lock à la sortie
      if (user?.email) {
        supabase
          .from('admin_sessions')
          .update({ editing_apprenant_id: null })
          .eq('admin_email', user.email)
          .eq('is_active', true)
          .then(() => console.log('🔓 Lock apprenant libéré'));
      }
    };
  }, [user]);

  // 🔄 Recharger les données quand la priorité change
  useEffect(() => {
    console.log('🔄 Priorité changée, rechargement absences...');
    loadAbsences();
  }, [priority]);

  // 👂 Écoute en temps réel des modifications des absences apprenants
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('absences_apprenants_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'absences_apprenants'
      }, (payload) => {
        console.log('🔄 Modification absences apprenants détectée, refresh...');
        loadAbsences();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Charger les apprenants
      const { data: apprenantsData, error: apprenantsError } = await supabase
        .from('users')
        .select('id, nom, prenom, date_entree_formation')
        .eq('role', 'apprenant')
        .eq('archive', false)
        .order('nom', { ascending: true });

      if (apprenantsError) throw apprenantsError;
      setApprenants(apprenantsData || []);

      // Charger les lieux
      const { data: lieuxData, error: lieuxError } = await supabase
        .from('lieux')
        .select('id, nom, initiale')
        .order('nom', { ascending: true });

      if (lieuxError) throw lieuxError;
      setLieux(lieuxData || []);

      // Charger les absences récentes
      await loadAbsences();

    } catch (error) {
      console.error('Erreur chargement données:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const loadAbsences = async () => {
    try {
      const response = await fetch('/api/admin/absences-apprenants');
      if (!response.ok) throw new Error('Erreur chargement absences');

      const data = await response.json();
      setAbsences(data);
    } catch (error) {
      console.error('Erreur chargement absences:', error);
      setError('Erreur lors du chargement des absences');
    }
  };

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

  // Fonction pour récupérer les apprenants en cours d'édition par d'autres admins
  const fetchApprenantsVerrouilles = async () => {
    try {
      const { data: sessions, error } = await supabase
        .from('admin_sessions')
        .select('editing_apprenant_id, admin_email')
        .eq('is_active', true)
        .not('editing_apprenant_id', 'is', null)
        .neq('admin_email', user?.email);

      if (error) {
        console.error('❌ Erreur fetchApprenantsVerrouilles:', error);
        return;
      }

      // Enrichir avec les noms des apprenants
      const enrichi = sessions.map(lock => {
        const apprenant = apprenants.find(a => a.id === lock.editing_apprenant_id);
        return {
          apprenant_id: lock.editing_apprenant_id,
          admin_email: lock.admin_email,
          admin_name: lock.admin_email.split('@')[0].charAt(0).toUpperCase() + lock.admin_email.split('@')[0].slice(1),
          apprenant_nom: apprenant ? `${apprenant.prenom} ${apprenant.nom}` : 'Inconnu'
        };
      });

      setApprenantsVerrouilles(enrichi);
    } catch (error) {
      console.error('❌ Erreur fetchApprenantsVerrouilles:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const isEditing = editingId !== null;
      const response = await fetch('/api/admin/absences-apprenants', {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(isEditing ? { ...formData, id: editingId } : formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || (isEditing ? 'Erreur lors de la modification' : 'Erreur lors de la création'));
      }

      setSuccess(isEditing ? 'Absence modifiée avec succès' : 'Absence créée avec succès');
      setEditingId(null);
      setFormData({
        type: 'absence_periode',
        apprenant_id: '',
        date_debut: '',
        date_fin: '',
        date_specifique: '',
        creneau: '',
        lieu_id: '',
        motif: '',
        commentaire: ''
      });

      await loadAbsences();
    } catch (error) {
      console.error('Erreur absence:', error);
      setError(error.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette absence ?')) return;

    try {
      const response = await fetch(`/api/admin/absences-apprenants?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Erreur lors de la suppression');

      setSuccess('Absence supprimée avec succès');
      await loadAbsences();
    } catch (error) {
      console.error('Erreur suppression:', error);
      setError('Erreur lors de la suppression');
    }
  };

  const handleEdit = (absence) => {
    setEditingId(absence.id);
    setFormData({
      type: absence.type,
      apprenant_id: absence.apprenant_id,
      date_debut: absence.date_debut || '',
      date_fin: absence.date_fin || '',
      date_specifique: absence.date_specifique || '',
      creneau: absence.creneau || '',
      lieu_id: absence.lieu_id || '',
      motif: absence.motif || '',
      commentaire: absence.commentaire || ''
    });
    setError('');
    setSuccess('');
    // Scroll vers le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({
      type: 'absence_periode',
      apprenant_id: '',
      date_debut: '',
      date_fin: '',
      date_specifique: '',
      creneau: '',
      lieu_id: '',
      motif: ''
    });
  };

  // Charger le récapitulatif présences/absences pour un apprenant
  const loadRecapData = async (apprenantId, dateDebut, dateFin) => {
    if (!apprenantId) return;
    setRecapLoading(true);
    setRecapData([]);

    try {
      // 1. Récupérer les séances planifiées contenant cet apprenant
      let query = supabase
        .from('planning_hebdomadaire')
        .select('date, jour, creneau, lieu_id')
        .contains('apprenants_ids', [apprenantId])
        .order('date', { ascending: true });

      if (dateDebut) query = query.gte('date', dateDebut);
      if (dateFin) query = query.lte('date', dateFin);

      const { data: seances, error: seancesError } = await query;
      if (seancesError) throw seancesError;

      // 2. Récupérer les absences de cet apprenant
      const { data: absencesApprenant, error: absError } = await supabase
        .from('absences_apprenants')
        .select('type, date_debut, date_fin, date_specifique, creneau, motif')
        .eq('apprenant_id', apprenantId)
        .eq('statut', 'actif');
      if (absError) throw absError;

      // 3. Récupérer le planning type de l'apprenant (pour absences période)
      const { data: planningType } = await supabase
        .from('planning_apprenants')
        .select('jour, creneau, lieu_id')
        .eq('apprenant_id', apprenantId)
        .eq('actif', true);

      // 4. Croiser les données - séances planifiées
      const recap = (seances || []).map(seance => {
        const dateSeance = new Date(seance.date);
        const creneauDB = seance.creneau; // 'matin' ou 'AM'

        // Chercher une absence correspondante
        const absence = (absencesApprenant || []).find(abs => {
          if (abs.type === 'absence_periode') {
            return new Date(abs.date_debut) <= dateSeance && new Date(abs.date_fin) >= dateSeance;
          }
          if (abs.type === 'absence_ponctuelle') {
            return abs.date_specifique === seance.date && abs.creneau === creneauDB;
          }
          return false;
        });

        const lieu = lieux.find(l => l.id === seance.lieu_id);

        return {
          date: seance.date,
          jour: seance.jour,
          creneau: creneauDB === 'matin' ? 'Matin' : 'Après-midi',
          lieu_nom: lieu ? lieu.nom : '-',
          statut: absence ? 'absent' : 'present',
          type_absence: absence ? absence.type : null,
          motif: absence ? (absence.motif || '-') : ''
        };
      });

      // 5. Ajouter les absences non couvertes par le planning hebdomadaire
      const existingKeys = new Set(recap.map(r => `${r.date}-${r.creneau === 'Matin' ? 'matin' : 'AM'}`));
      const joursSemaine = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

      for (const abs of absencesApprenant || []) {
        if (abs.type === 'absence_ponctuelle' && abs.date_specifique && abs.creneau) {
          const key = `${abs.date_specifique}-${abs.creneau}`;
          if (!existingKeys.has(key)) {
            if ((!dateDebut || abs.date_specifique >= dateDebut) && (!dateFin || abs.date_specifique <= dateFin)) {
              recap.push({
                date: abs.date_specifique,
                jour: joursSemaine[new Date(abs.date_specifique).getDay()],
                creneau: abs.creneau === 'matin' ? 'Matin' : 'Après-midi',
                lieu_nom: '-',
                statut: 'absent',
                type_absence: abs.type,
                motif: abs.motif || '-'
              });
              existingKeys.add(key);
            }
          }
        } else if (abs.type === 'absence_periode' && abs.date_debut && abs.date_fin) {
          const start = new Date(abs.date_debut);
          const end = new Date(abs.date_fin);
          const effectiveStart = dateDebut && new Date(dateDebut) > start ? new Date(dateDebut) : new Date(start);
          const effectiveEnd = dateFin && new Date(dateFin) < end ? new Date(dateFin) : new Date(end);

          for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const jourNom = joursSemaine[d.getDay()];

            // Utiliser le planning type pour savoir quels créneaux l'apprenant a ce jour-là
            const creneauxDuJour = (planningType || [])
              .filter(pt => pt.jour === jourNom)
              .map(pt => pt.creneau);

            for (const cr of creneauxDuJour) {
              const key = `${dateStr}-${cr}`;
              if (!existingKeys.has(key)) {
                const lieuPT = (planningType || []).find(pt => pt.jour === jourNom && pt.creneau === cr);
                const lieu = lieuPT ? lieux.find(l => l.id === lieuPT.lieu_id) : null;
                recap.push({
                  date: dateStr,
                  jour: jourNom,
                  creneau: cr === 'matin' ? 'Matin' : 'Après-midi',
                  lieu_nom: lieu ? lieu.nom : '-',
                  statut: 'absent',
                  type_absence: abs.type,
                  motif: abs.motif || '-'
                });
                existingKeys.add(key);
              }
            }
          }
        }
      }

      // Trier par date puis créneau
      recap.sort((a, b) => a.date.localeCompare(b.date) || (a.creneau === 'Matin' ? -1 : 1));

      setRecapData(recap);
    } catch (err) {
      setError('Erreur chargement récapitulatif: ' + err.message);
    } finally {
      setRecapLoading(false);
    }
  };

  const handleInputChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Mettre à jour le lock si c'est la sélection d'apprenant
    if (name === 'apprenant_id') {
      const { error } = await supabase
        .from('admin_sessions')
        .update({ editing_apprenant_id: value || null })
        .eq('admin_email', user?.email)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Erreur update lock apprenant:', error);
      }
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'absence_periode': return '🗓️ Absence par période';
      case 'absence_ponctuelle': return '⏰ Absence ponctuelle';
      case 'presence_exceptionnelle': return '✨ Présence exceptionnelle';
      default: return type;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'absence_periode': return '#ff6b6b';
      case 'absence_ponctuelle': return '#ffa726';
      case 'presence_exceptionnelle': return '#66bb6a';
      default: return '#757575';
    }
  };

  if (loading) {
    return <SkeletonAbsenceLoader />;
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '40px 60px'
    }}>
      <style jsx>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
      {/* Header Navigation */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '15px 25px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backdropFilter: 'blur(10px)'
      }}>
        <nav style={{ fontSize: '14px' }}>
          <span style={{ color: '#6b7280' }}>Dashboard</span>
          <span style={{ margin: '0 10px', color: '#9ca3af' }}>/</span>
          <span style={{ color: '#8b5cf6', fontWeight: '500' }}>Gestion des Absences Apprenants</span>
        </nav>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '8px 16px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Accueil
          </button>


          <button
            onClick={logout}
            style={{
              backgroundColor: '#ff4757',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Déconnexion
          </button>
        </div>
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
            height: '24px',
            backgroundColor: '#e5e7eb'
          }}></div>
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

      {/* Titre principal */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          color: 'white',
          marginBottom: '10px',
          textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
        }}>
          🎓 Gestion des Absences Apprenants
        </h1>
        <p style={{
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: '1.1rem',
          textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        }}>
          Gérer les absences par période, ponctuelles et les présences exceptionnelles
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          backgroundColor: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#c62828'
        }}>
          ❌ {error}
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: '#e8f5e8',
          border: '1px solid #4caf50',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px',
          color: '#2e7d32'
        }}>
          ✅ {success}
        </div>
      )}

      {/* Formulaire de création */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '30px',
        marginBottom: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px', color: '#333' }}>
          {editingId ? '✏️ Modifier l\'absence/présence' : '➕ Nouvelle absence/présence'}
        </h2>

        {/* Bandeau d'avertissement si apprenant verrouillé */}
        {formData.apprenant_id && apprenantsVerrouilles.some(v => v.apprenant_id === formData.apprenant_id) && (
          <div style={{
            backgroundColor: '#f59e0b',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            marginBottom: '20px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: '600',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            ⚠️ {apprenantsVerrouilles.find(v => v.apprenant_id === formData.apprenant_id)?.admin_name} édite les changements de {apprenantsVerrouilles.find(v => v.apprenant_id === formData.apprenant_id)?.apprenant_nom}. Vous ne pouvez pas le modifier pour le moment.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* Type */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Type d'événement
              </label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                disabled={!canEdit}
                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  cursor: !canEdit ? 'not-allowed' : 'pointer',
                  opacity: !canEdit ? 0.6 : 1
                }}
              >
                <option value="absence_periode">🗓️ Absence par période</option>
                <option value="absence_ponctuelle">⏰ Absence ponctuelle</option>
                <option value="presence_exceptionnelle">✨ Présence exceptionnelle</option>
              </select>
            </div>

            {/* Apprenant */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Apprenant
              </label>
              <select
                name="apprenant_id"
                value={formData.apprenant_id}
                onChange={handleInputChange}
                required
                disabled={!canEdit}
                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  cursor: !canEdit ? 'not-allowed' : 'pointer',
                  opacity: !canEdit ? 0.6 : 1
                }}
              >
                <option value="">Sélectionner un apprenant</option>
                {apprenants.map(apprenant => {
                  const estVerrouille = apprenantsVerrouilles.some(v => v.apprenant_id === apprenant.id);
                  return (
                    <option
                      key={apprenant.id}
                      value={apprenant.id}
                      disabled={estVerrouille}
                    >
                      {apprenant.prenom} {apprenant.nom}
                      {estVerrouille && ' (En cours d\'édition)'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Lieu (pour présence exceptionnelle) */}
            {formData.type === 'presence_exceptionnelle' && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                  Lieu
                </label>
                <select
                  name="lieu_id"
                  value={formData.lieu_id}
                  onChange={handleInputChange}
                  required
                  disabled={!canEdit}
                  title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '16px',
                    cursor: !canEdit ? 'not-allowed' : 'pointer',
                    opacity: !canEdit ? 0.6 : 1
                  }}
                >
                  <option value="">Sélectionner un lieu</option>
                  {lieux.map(lieu => (
                    <option key={lieu.id} value={lieu.id}>
                      {lieu.nom} ({lieu.initiale})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Dates selon le type */}
          <div style={{ display: 'grid', gridTemplateColumns: formData.type === 'absence_periode' ? '1fr 1fr' : '1fr 1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {formData.type === 'absence_periode' ? (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Date de début
                  </label>
                  <input
                    type="date"
                    name="date_debut"
                    value={formData.date_debut}
                    onChange={handleInputChange}
                    required
                    disabled={!canEdit}
                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      cursor: !canEdit ? 'not-allowed' : 'text',
                      opacity: !canEdit ? 0.6 : 1
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Date de fin
                  </label>
                  <input
                    type="date"
                    name="date_fin"
                    value={formData.date_fin}
                    onChange={handleInputChange}
                    required
                    disabled={!canEdit}
                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      cursor: !canEdit ? 'not-allowed' : 'text',
                      opacity: !canEdit ? 0.6 : 1
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    name="date_specifique"
                    value={formData.date_specifique}
                    onChange={handleInputChange}
                    required
                    disabled={!canEdit}
                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      cursor: !canEdit ? 'not-allowed' : 'text',
                      opacity: !canEdit ? 0.6 : 1
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                    Créneau
                  </label>
                  <select
                    name="creneau"
                    value={formData.creneau}
                    onChange={handleInputChange}
                    required
                    disabled={!canEdit}
                    title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #ddd',
                      fontSize: '16px',
                      cursor: !canEdit ? 'not-allowed' : 'pointer',
                      opacity: !canEdit ? 0.6 : 1
                    }}
                  >
                    <option value="">Sélectionner</option>
                    <option value="matin">Matin</option>
                    <option value="AM">Après-midi</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Motif et Commentaire côte à côte */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Motif (optionnel)
              </label>
              <textarea
                name="motif"
                value={formData.motif}
                onChange={handleInputChange}
                rows="3"
                disabled={!canEdit}
                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  resize: 'vertical',
                  cursor: !canEdit ? 'not-allowed' : 'text',
                  opacity: !canEdit ? 0.6 : 1
                }}
                placeholder="Motif (visible à l'impression)..."
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                Commentaire (optionnel)
              </label>
              <textarea
                name="commentaire"
                value={formData.commentaire}
                onChange={handleInputChange}
                rows="3"
                disabled={!canEdit}
                title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '16px',
                  resize: 'vertical',
                  cursor: !canEdit ? 'not-allowed' : 'text',
                  opacity: !canEdit ? 0.6 : 1
                }}
                placeholder="Commentaire interne (non imprimé)..."
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              disabled={!canEdit}
              title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
              style={{
                background: !canEdit ? '#94a3b8' : '#4CAF50',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: !canEdit ? 'not-allowed' : 'pointer',
                fontWeight: 'bold',
                opacity: !canEdit ? 0.6 : 1
              }}
            >
              {editingId ? '✏️ Modifier' : '💾 Enregistrer'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ❌ Annuler
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Liste des absences */}
      <div style={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          gap: '20px'
        }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, color: '#333' }}>
            📋 Absences récentes
          </h2>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowRecap(true)}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                cursor: 'pointer',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              Recapitulatif
            </button>
            <input
              type="text"
              placeholder="Filtrer par nom..."
              value={filtreNom}
              onChange={(e) => setFiltreNom(e.target.value)}
              style={{
                padding: '8px 15px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '14px',
                minWidth: '250px',
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = '#667eea'}
              onBlur={(e) => e.target.style.borderColor = '#ddd'}
            />
          </div>
        </div>

        {(() => {
          // Filtrer les absences par nom d'apprenant
          const absencesFiltrees = absences.filter(absence => {
            if (!filtreNom.trim()) return true;
            const nomComplet = absence.apprenant_nom?.toLowerCase() || '';
            return nomComplet.includes(filtreNom.toLowerCase());
          });

          return absencesFiltrees.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', fontStyle: 'italic' }}>
              {filtreNom.trim() ? `Aucune absence trouvée pour "${filtreNom}"` : 'Aucune absence enregistrée'}
            </p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Apprenant</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date(s)</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Détails</th>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Motif</th>
                    <th className="no-print" style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Commentaire</th>
                    <th className="no-print" style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {absencesFiltrees.map((absence, index) => (
                  <tr key={absence.id} style={{
                    backgroundColor: index % 2 === 0 ? 'white' : '#f9f9f9',
                    borderBottom: '1px solid #eee'
                  }}>
                    <td style={{ padding: '12px' }}>
                      <strong>{absence.apprenant_nom}</strong>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        backgroundColor: getTypeColor(absence.type) + '20',
                        color: getTypeColor(absence.type),
                        fontWeight: 'bold'
                      }}>
                        {getTypeLabel(absence.type)}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      {absence.date_affichage}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {absence.creneau_affichage && (
                        <div>{absence.creneau_affichage}</div>
                      )}
                      {absence.lieu_nom && (
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          📍 {absence.lieu_nom}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px', maxWidth: '150px' }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        {absence.motif || '-'}
                      </div>
                    </td>
                    <td className="no-print" style={{ padding: '12px', maxWidth: '150px' }}>
                      <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontSize: '14px',
                        color: '#666'
                      }}>
                        {absence.commentaire || '-'}
                      </div>
                    </td>
                    <td className="no-print" style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEdit(absence)}
                          disabled={!canEdit}
                          title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                          style={{
                            background: !canEdit ? '#94a3b8' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            opacity: !canEdit ? 0.6 : 1
                          }}
                        >
                          ✏️ Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(absence.id)}
                          disabled={!canEdit}
                          title={!canEdit ? 'Mode consultation - Seul le 1er admin peut modifier' : ''}
                          style={{
                            background: !canEdit ? '#94a3b8' : '#ff4757',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '4px',
                            cursor: !canEdit ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            opacity: !canEdit ? 0.6 : 1
                          }}
                        >
                          🗑️ Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      {/* Modal Récapitulatif Présences/Absences */}
      {showRecap && (
        <div
          onClick={() => setShowRecap(false)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '30px',
              maxWidth: '900px',
              width: '90%',
              maxHeight: '85vh',
              overflow: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#333' }}>Recapitulatif Presences / Absences</h2>
              <button
                onClick={() => setShowRecap(false)}
                style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#666' }}
              >
                X
              </button>
            </div>

            {/* Filtres */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '20px' }}>
              <div style={{ flex: '1', minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Apprenant</label>
                <select
                  value={recapApprenantId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setRecapApprenantId(id);
                    setRecapData([]);
                    if (!id) return;
                    // Pré-remplir dates et charger automatiquement
                    const app = apprenants.find(a => a.id === id);
                    const debut = (app && app.date_entree_formation) || '';
                    const today = new Date().toISOString().split('T')[0];
                    setRecapDateDebut(debut);
                    setRecapDateFin(today);
                    loadRecapData(id, debut, today);
                  }}
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                >
                  <option value="">-- Choisir un apprenant --</option>
                  {apprenants.map(a => (
                    <option key={a.id} value={a.id}>{a.prenom} {a.nom}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Debut</label>
                <input
                  type="date"
                  value={recapDateDebut}
                  onChange={(e) => setRecapDateDebut(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px', color: '#555' }}>Fin</label>
                <input
                  type="date"
                  value={recapDateFin}
                  onChange={(e) => setRecapDateFin(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', fontSize: '13px' }}
                />
              </div>
              <button
                onClick={() => loadRecapData(recapApprenantId, recapDateDebut, recapDateFin)}
                disabled={!recapApprenantId || recapLoading}
                style={{
                  padding: '8px 20px',
                  background: !recapApprenantId ? '#94a3b8' : 'linear-gradient(135deg, #667eea, #764ba2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: !recapApprenantId ? 'not-allowed' : 'pointer',
                  fontWeight: '600'
                }}
              >
                {recapLoading ? 'Chargement...' : 'Charger'}
              </button>
            </div>

            {/* Compteurs */}
            {recapData.length > 0 && (() => {
              const total = recapData.length;
              const presents = recapData.filter(r => r.statut === 'present').length;
              const absents = recapData.filter(r => r.statut === 'absent').length;
              return (
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                  <div style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#f0f0f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700' }}>{total}</div>
                    <div style={{ fontSize: '11px', color: '#666' }}>Seances</div>
                  </div>
                  <div style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#dcfce7', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#16a34a' }}>{presents}</div>
                    <div style={{ fontSize: '11px', color: '#166534' }}>Presents</div>
                  </div>
                  <div style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#fef2f2', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#dc2626' }}>{absents}</div>
                    <div style={{ fontSize: '11px', color: '#991b1b' }}>Absents</div>
                  </div>
                  <div style={{ padding: '10px 20px', borderRadius: '8px', backgroundColor: '#eff6ff', textAlign: 'center' }}>
                    <div style={{ fontSize: '22px', fontWeight: '700', color: '#2563eb' }}>
                      {total > 0 ? Math.round((presents / total) * 100) : 0}%
                    </div>
                    <div style={{ fontSize: '11px', color: '#1e40af' }}>Taux presence</div>
                  </div>
                </div>
              );
            })()}

            {/* Tableau */}
            {recapData.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc' }}>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Date</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Jour</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Creneau</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Lieu</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>Statut</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Motif</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapData.map((row, idx) => (
                      <tr key={idx} style={{
                        backgroundColor: row.statut === 'absent' ? '#fef2f2' : (idx % 2 === 0 ? 'white' : '#f9fafb')
                      }}>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>
                          {new Date(row.date).toLocaleDateString('fr-FR')}
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>{row.jour}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>{row.creneau}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb' }}>{row.lieu_nom}</td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: row.statut === 'present' ? '#dcfce7' : '#fecaca',
                            color: row.statut === 'present' ? '#166534' : '#991b1b'
                          }}>
                            {row.statut === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', color: row.statut === 'absent' ? '#dc2626' : '#666' }}>
                          {row.motif || ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Message si pas de données */}
            {recapApprenantId && !recapLoading && recapData.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6b7280', padding: '30px' }}>
                Cliquez sur "Charger" pour afficher le recapitulatif
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuthAdmin(AbsenceApprenant);
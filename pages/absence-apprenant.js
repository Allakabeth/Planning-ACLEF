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
    motif: ''
  });

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
        .select('id, nom, prenom')
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
        motif: ''
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
      motif: absence.motif || ''
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

          {/* Motif */}
          <div style={{ marginBottom: '20px' }}>
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
              placeholder="Motif de l'absence ou présence exceptionnelle..."
            />
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
          <input
            type="text"
            placeholder="🔍 Filtrer par nom..."
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
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Actions</th>
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
                    <td style={{ padding: '12px', maxWidth: '200px' }}>
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
                    <td style={{ padding: '12px', textAlign: 'center' }}>
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
    </div>
  );
}

export default withAuthAdmin(AbsenceApprenant);
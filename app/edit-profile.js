// Edit profile page functionality for dmto.me

let currentUser = null;
let currentPhotoData = null;

document.addEventListener('DOMContentLoaded', function() {
  // Verifica autenticazione persistente
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.log('🔓 Accesso negato alla modifica profilo - reindirizzamento al login');
      window.location.href = './index.html';
      return;
    }

    console.log('👤 Utente autenticato nella modifica profilo:', user.email);
    currentUser = user;
    await loadCurrentProfile();
  });
});

async function loadCurrentProfile() {
  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();

    if (!userDoc.exists) {
      showToast('Profilo non trovato');
      return;
    }

    const profile = userDoc.data();

    // Popola il form con i dati attuali
    const form = document.getElementById('editForm');
    form.username.value = profile.username || '';
    form.displayName.value = profile.displayName || '';
    form.status.value = profile.status || 'Disponibile per chat anonime';
    form.email.value = currentUser.email || '';
    form.showOnline.checked = profile.showOnline !== false;
    form.allowNewChats.checked = profile.allowNewChats !== false;
    form.notifications.checked = profile.notifications !== false;

    // Aggiorna preview link username
    updateUsernamePreview(profile.username || '');

    // Carica foto profilo se presente
    if (profile.photoURL) {
      currentPhotoData = profile.photoURL;
      document.getElementById('profilePhotoPreview').style.backgroundImage = `url(${profile.photoURL})`;
      document.getElementById('profilePhotoPreview').style.backgroundSize = 'cover';
      document.getElementById('profilePhotoPreview').style.backgroundPosition = 'center';
      document.getElementById('profilePhotoPreview').textContent = '';
    }

  } catch (error) {
    console.error('Errore caricamento profilo:', error);
    showToast('Errore nel caricamento del profilo');
  }
}

async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validazione tipo file
  if (!file.type.startsWith('image/')) {
    showToast('Seleziona un file immagine valido');
    return;
  }

  // Validazione dimensione (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('L\'immagine deve essere più piccola di 5MB');
    return;
  }

  try {
    showToast('Caricamento foto...');

    // Carica su Firebase Storage
    const storageRef = storage.ref();
    const photoRef = storageRef.child(`profile-photos/${currentUser.uid}`);
    const uploadTask = await photoRef.put(file);

    // Ottieni URL download
    const photoURL = await uploadTask.ref.getDownloadURL();

    currentPhotoData = photoURL;
    document.getElementById('profilePhotoPreview').style.backgroundImage = `url(${photoURL})`;
    document.getElementById('profilePhotoPreview').style.backgroundSize = 'cover';
    document.getElementById('profilePhotoPreview').style.backgroundPosition = 'center';
    document.getElementById('profilePhotoPreview').textContent = '';
    showToast('Foto caricata con successo!');

  } catch (error) {
    console.error('Errore caricamento foto:', error);
    showToast('Errore nel caricamento della foto');
  }
}

function goBack() {
  window.location.href = './profile.html';
}

// Gestione submit form
document.getElementById('editForm').addEventListener('submit', async function(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const username = formData.get('username').trim();
  const displayName = formData.get('displayName').trim();

  // Validazione
  if (!username) {
    showToast('Inserisci un username');
    return;
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    showToast('Username può contenere solo lettere, numeri e underscore');
    return;
  }

  if (!displayName) {
    showToast('Inserisci un nome visualizzato');
    return;
  }

  try {
    // Verifica se l'username è già in uso
    const usernameExists = await checkUsernameExists(username);
    if (usernameExists) {
      showToast('Questo username è già in uso');
      return;
    }

    // Prepara dati profilo
    const trimmedUsername = username.trim();
    const profileData = {
      username: trimmedUsername,
      username_lowercase: trimmedUsername.toLowerCase(), // Per ricerche case-insensitive
      displayName: displayName,
      status: formData.get('status').trim() || 'Disponibile per chat anonime',
      showOnline: formData.has('showOnline'),
      allowNewChats: formData.has('allowNewChats'),
      notifications: formData.has('notifications'),
      lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Aggiungi foto se caricata
    if (currentPhotoData) {
      profileData.photoURL = currentPhotoData;
    }

    // Salva profilo su Firebase
    await db.collection('users').doc(currentUser.uid).update(profileData);

    showToast('Profilo aggiornato con successo!');
    setTimeout(() => {
      goBack();
    }, 1500);

  } catch (error) {
    console.error('Errore salvataggio profilo:', error);
    showToast('Errore nell\'aggiornamento del profilo');
  }
});

// Aggiorna preview link username
function updateUsernamePreview(username) {
  const baseUrl = (window.APP_CONFIG && window.APP_CONFIG.BASE_URL) || 'https://dmtome.vercel.app';
  const previewElement = document.getElementById('usernamePreview');
  if (previewElement) {
    const displayUrl = baseUrl.replace('https://', '');
    previewElement.textContent = username ? `${displayUrl}/${username}` : `${displayUrl}/tuo-username`;
  }
}

// Aggiorna preview quando cambia username
document.addEventListener('DOMContentLoaded', function() {
  const usernameInput = document.getElementById('editForm')?.username;
  if (usernameInput) {
    usernameInput.addEventListener('input', function(e) {
      updateUsernamePreview(e.target.value.trim());
    });
  }
});

// Funzione per verificare se username esiste già (OTTIMIZZATA)
async function checkUsernameExists(username) {
  try {
    // Ottieni username corrente dell'utente
    const currentUserDoc = await db.collection('users').doc(currentUser.uid).get();
    const currentUsername = currentUserDoc.data()?.username;

    // Se è lo stesso username (case-insensitive), è ok
    if (username.toLowerCase() === currentUsername?.toLowerCase()) return false;

    // Query ottimizzata con timeout
    const normalizedUsername = username.toLowerCase();
    const queryPromise = db.collection('users')
      .where('username_lowercase', '==', normalizedUsername)
      .limit(1)
      .get();
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Query timeout')), 5000)
    );
    
    const snapshot = await Promise.race([queryPromise, timeoutPromise]);
    return !snapshot.empty;
  } catch (error) {
    if (error.message === 'Query timeout') {
      console.warn('⚠️ Timeout verifica username');
      return false;
    }
    console.error('Errore verifica username:', error);
    return false;
  }
}

// Funzioni rimosse - ora usiamo Firebase

// Toast system
const toast = createToast();
document.body.appendChild(toast.node);

function showToast(message) {
  toast.show(message);
}

function createToast() {
  const node = document.createElement("div");
  node.className = "toast";

  let timeout;

  return {
    node,
    show(message) {
      node.textContent = message;
      node.classList.add("is-visible");
      clearTimeout(timeout);
      timeout = setTimeout(() => node.classList.remove("is-visible"), 3000);
    },
  };
}
// Profile page functionality for dmto.me

let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
  // Verifica autenticazione
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = './index.html';
      return;
    }

    currentUser = user;
    await loadProfileData();
  });
});

async function loadProfileData() {
  try {
    const userDoc = await db.collection('users').doc(currentUser.uid).get();

    if (!userDoc.exists) {
      showToast('Profilo non trovato');
      return;
    }

    const profile = userDoc.data();

    // Aggiorna avatar
    if (profile.photoURL) {
      document.getElementById('profileAvatar').style.backgroundImage = `url(${profile.photoURL})`;
      document.getElementById('profileAvatar').style.backgroundSize = 'cover';
      document.getElementById('profileAvatar').style.backgroundPosition = 'center';
      document.getElementById('profileAvatar').textContent = '';
    }

    // Aggiorna nome
    const displayName = profile.displayName || profile.username || 'Anonimo';
    document.getElementById('profileName').textContent = displayName;

    // Aggiorna status
    const statusText = profile.status || 'Disponibile per chat anonime';
    const onlineText = profile.isOnline ? 'Online' : 'Offline';
    document.getElementById('profileStatus').textContent = `${statusText} • ${onlineText}`;

    // Aggiorna link profilo - username è sempre univoco
    // Se per qualche motivo non c'è username, crea uno temporaneo basato su uid
    let username = profile.username;
    if (!username || username.trim() === '') {
      // Genera username temporaneo univoco (mai visto nell'UI, ma usato nel link)
      username = 'user_' + currentUser.uid.substring(0, 8);
    }
    const profileLink = `dmto.me/${username}`;
    document.getElementById('profileLink').textContent = profileLink;

    // Carica statistiche
    await loadUserStats();

  } catch (error) {
    console.error('Errore caricamento profilo:', error);
    showToast('Errore nel caricamento del profilo');
  }
}

async function loadUserStats() {
  try {
    // Conta conversazioni
    const conversations = await db.collection('conversations')
      .where('participants', 'array-contains', currentUser.uid)
      .get();

    // Conta messaggi totali
    let totalMessages = 0;
    for (const conversation of conversations.docs) {
      const messages = await conversation.ref.collection('messages').get();
      totalMessages += messages.size;
    }

    // Calcola messaggi inviati e ricevuti
    let sentMessages = 0;
    let receivedMessages = 0;
    
    for (const conversation of conversations.docs) {
      const messages = await conversation.ref.collection('messages').get();
      messages.forEach(msg => {
        if (msg.data().senderId === currentUser.uid) {
          sentMessages++;
        } else {
          receivedMessages++;
        }
      });
    }
    
    // Aggiorna statistiche nell'UI
    const statChats = document.getElementById('statChats');
    const statSent = document.getElementById('statSent');
    const statReceived = document.getElementById('statReceived');
    
    if (statChats) statChats.textContent = conversations.size;
    if (statSent) statSent.textContent = sentMessages;
    if (statReceived) statReceived.textContent = receivedMessages;

  } catch (error) {
    console.error('Errore caricamento statistiche:', error);
  }
}

function goBack() {
  window.location.href = './chat.html';
}

function editProfile() {
  window.location.href = './edit-profile.html';
}

function copyProfileLink() {
  const profileLink = document.getElementById('profileLink').textContent;
  const username = profileLink.split('/')[1];
  
  // Crea link nel formato dmto.me/username
  // Se configurato con rewrite, usa user.html?u=username come fallback
  const fullUrl = `https://dmto.me/${username}`;

  // Usa l'API Clipboard moderna se disponibile, altrimenti fallback
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showToast('Link profilo copiato! 📋');
    }).catch(() => {
      fallbackCopyTextToClipboard(fullUrl);
    });
  } else {
    fallbackCopyTextToClipboard(fullUrl);
  }
}

function shareProfile() {
  const profileLink = document.getElementById('profileLink').textContent;
  const username = profileLink.split('/')[1];
  const fullUrl = `https://dmto.me/${username}`;
  const profile = getStoredProfile();
  const profileName = profile.displayName || 'Anonimo';

  // Usa Web Share API se disponibile (mobile)
  if (navigator.share) {
    navigator.share({
      title: `Chat con ${profileName}`,
      text: `Inizia una chat anonima temporanea con ${profileName}`,
      url: fullUrl
    }).catch(() => {
      // Fallback alla copia
      copyProfileLink();
    });
  } else {
    // Desktop: copia negli appunti
    copyProfileLink();
  }
}

function fallbackCopyTextToClipboard(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.left = "-999999px";
  textArea.style.top = "-999999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (successful) {
      showToast('Link copiato negli appunti!');
    } else {
      showToast('Errore nella copia del link');
    }
  } catch (err) {
    showToast('Errore nella copia del link');
  }

  document.body.removeChild(textArea);
}


function privacySettings() {
  showToast("🛡️ Anonimato totale - zero moderazione, libertà assoluta.");
}

function logout() {
  if (confirm("Sei sicuro di voler effettuare il logout?\n\nVerrai disconnesso da tutti i dispositivi e dovrai accedere nuovamente.")) {
    // Prima aggiorna lo stato offline
    if (currentUser) {
      db.collection('users').doc(currentUser.uid).update({
        isOnline: false,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      }).catch(error => console.error('Errore aggiornamento stato offline:', error));
    }

    // Poi effettua il logout
    auth.signOut()
      .then(() => {
        console.log('🚪 Logout effettuato con successo');
        showToast("Logout effettuato - arrivederci!");
        setTimeout(() => {
          window.location.href = './index.html';
        }, 1000);
      })
      .catch((error) => {
        console.error('Errore logout:', error);
        showToast("Errore durante il logout - riprova");
      });
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

// Stili aggiuntivi per la pagina profilo sono definiti in style.css
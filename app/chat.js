// Chat functionality for dmto.me
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
  // Verifica autenticazione con gestione caricamento
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      // Non autenticato, torna al login
      console.log('🔓 Accesso negato - reindirizzamento al login');
      window.location.href = './index.html';
      return;
    }

    console.log('👤 Utente autenticato nella chat:', user.email);
    currentUser = user;

    // Controlla se c'è una conversazione temporanea da salvare
    const tempConversationData = localStorage.getItem('temp_conversation');
    if (tempConversationData) {
      try {
        const tempData = JSON.parse(tempConversationData);
        await saveTempConversation(tempData);
        localStorage.removeItem('temp_conversation');
        showToast('Conversazione temporanea salvata!');
      } catch (error) {
        console.error('Errore salvataggio conversazione temporanea:', error);
      }
    }

    await loadUserProfile();
    loadChatList();
    setupPresence();
  });
});

// Imposta presenza online/offline con persistenza Firebase Auth
function setupPresence() {
  if (!currentUser) return;

  const userStatusRef = db.collection('users').doc(currentUser.uid);

  // Funzione per aggiornare stato online
  const updateOnlineStatus = async (isOnline) => {
    try {
      await userStatusRef.update({
        isOnline: isOnline,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log(`🔄 Stato presenza aggiornato: ${isOnline ? 'online' : 'offline'}`);
    } catch (error) {
      console.error('Errore aggiornamento presenza:', error);
    }
  };

  // Imposta online all'avvio
  updateOnlineStatus(true);

  // Gestione visibility change (quando utente minimizza/riapre scheda)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Utente ha lasciato la pagina
      updateOnlineStatus(false);
    } else {
      // Utente è tornato
      updateOnlineStatus(true);
    }
  });

  // Imposta offline quando chiude la pagina
  window.addEventListener('beforeunload', () => {
    // Questa chiamata potrebbe non completarsi, ma Firebase Auth gestisce la disconnessione
    navigator.sendBeacon('/api/offline', JSON.stringify({ userId: currentUser.uid }));
  });

  // Gestione connessione rete
  window.addEventListener('offline', () => {
    updateOnlineStatus(false);
  });

  window.addEventListener('online', () => {
    updateOnlineStatus(true);
  });

  // Gestione logout Firebase Auth
  auth.onAuthStateChanged((user) => {
    if (!user) {
      // Utente si è disconnesso, aggiorna stato
      updateOnlineStatus(false);
    }
  });
}

function loadUserProfile() {
  const profile = getStoredProfile();

  // Aggiorna il pulsante profilo con avatar se presente
  if (profile.photo) {
    const profileBtn = document.getElementById('profileButton');
    if (profileBtn) {
      profileBtn.style.backgroundImage = `url(${profile.photo})`;
      profileBtn.style.backgroundSize = 'cover';
      profileBtn.style.backgroundPosition = 'center';
      profileBtn.textContent = '';
    }
  }

  // Aggiorna status online
  const onlineStatus = document.getElementById('onlineStatus');
  if (onlineStatus && profile.showOnline !== false) {
    onlineStatus.textContent = '12 online';
  } else if (onlineStatus) {
    onlineStatus.textContent = 'invisibile';
  }
}

function openChat(conversationId) {
  // Naviga alla pagina messaggio per questa conversazione
  window.location.href = `./message.html?conversation=${conversationId}`;
}

function goToProfile() {
  // Naviga alla pagina profilo
  window.location.href = "./profile.html";
}

async function startNewChat() {
  if (!currentUser) return;

  showToast("Ricerca di un nuovo contatto anonimo...");

  try {
    // Trova un utente casuale online (diverso da se stesso)
    const onlineUsers = await db.collection('users')
      .where('isOnline', '==', true)
      .where('uid', '!=', currentUser.uid)
      .limit(50)
      .get();

    if (onlineUsers.empty) {
      showToast("Nessun utente online al momento");
      return;
    }

    // Seleziona utente casuale
    const randomIndex = Math.floor(Math.random() * onlineUsers.docs.length);
    const randomUser = onlineUsers.docs[randomIndex].data();
    const randomUserId = onlineUsers.docs[randomIndex].id;

    // Verifica se esiste già una conversazione
    const existingConversation = await db.collection('conversations')
      .where('participants', 'array-contains', currentUser.uid)
      .get()
      .then(snapshot => {
        return snapshot.docs.find(doc => {
          const participants = doc.data().participants;
          return participants.includes(currentUser.uid) && participants.includes(randomUserId);
        });
      });

    if (existingConversation) {
      // Conversazione esistente, aprila
      showToast("Conversazione esistente trovata!");
      openChat(existingConversation.id);
      return;
    }

    // Crea nuova conversazione
    const conversationData = {
      participants: [currentUser.uid, randomUserId],
      participantsData: {
        [currentUser.uid]: {
          displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'Anonimo',
          avatar: String.fromCharCode(65 + Math.floor(Math.random() * 26))
        },
        [randomUserId]: {
          displayName: randomUser.displayName || randomUser.username || 'Anonimo',
          avatar: String.fromCharCode(65 + Math.floor(Math.random() * 26))
        }
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      lastMessage: null,
      unreadCounts: {
        [currentUser.uid]: 0,
        [randomUserId]: 1
      }
    };

    const conversationRef = await db.collection('conversations').add(conversationData);

    // Aggiungi messaggio di sistema
    await db.collection('conversations').doc(conversationRef.id).collection('messages').add({
      type: 'system',
      content: 'Conversazione iniziata',
      senderId: 'system',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Aggiorna la conversazione con l'ultimo messaggio
    await conversationRef.update({
      lastMessage: {
        type: 'system',
        content: 'Conversazione iniziata',
        senderId: 'system',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      }
    });

    showToast("Nuova chat anonima creata!");
    openChat(conversationRef.id);

  } catch (error) {
    console.error('Errore creazione chat:', error);
    showToast("Errore nella creazione della chat");
  }
}

function refreshChats() {
  // Aggiorna la lista chat
  showToast("Aggiornamento chat...");
  // Simula refresh
  setTimeout(() => {
    showToast("Chat aggiornate!");
  }, 1000);
}

function addNewChatToList(chatId, name) {
  const chatList = document.querySelector('.chat-list');

  // Salva i dati della nuova chat
  const savedChats = JSON.parse(localStorage.getItem('dmto_chat_names') || '{}');
  const avatarLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  savedChats[chatId] = { name, avatar: avatarLetter };
  localStorage.setItem('dmto_chat_names', JSON.stringify(savedChats));

  const newChatItem = document.createElement('div');
  newChatItem.className = 'chat-item';
  newChatItem.onclick = () => openChat(chatId);

  newChatItem.innerHTML = `
    <div class="chat-avatar">${avatarLetter}</div>
    <div class="chat-info">
      <div class="chat-name">${name}</div>
      <div class="chat-preview">Nuova conversazione iniziata</div>
    </div>
    <div class="chat-meta">
      <span class="chat-time">ora</span>
      <span class="chat-unread">1</span>
    </div>
  `;

  chatList.insertBefore(newChatItem, chatList.firstChild);
}

// Funzione storage profilo
async function loadChatList() {
  const chatList = document.querySelector('.chat-list');
  if (!chatList) return;

  try {
    // Carica le conversazioni dell'utente da Firebase (non ancora scadute)
    const now = new Date();
    const conversationsRef = db.collection('conversations')
      .where('participants', 'array-contains', currentUser.uid)
      .where('expiresAt', '>', firebase.firestore.Timestamp.fromDate(now))
      .orderBy('expiresAt', 'desc')
      .orderBy('lastMessage.timestamp', 'desc')
      .limit(20);

    const snapshot = await conversationsRef.get();

    chatList.innerHTML = ''; // Pulisce la lista

    if (snapshot.empty) {
      // Nessuna conversazione attiva, mostra messaggio vuoto
      chatList.innerHTML = `
        <div class="empty-state">
          <p>Nessuna conversazione attiva.<br>Le chat scadono dopo 24 ore per privacy.</p>
          <small>🕒 Inizia una nuova chat anonima!</small>
        </div>
      `;
      return;
    }

    // Crea elementi chat per ogni conversazione
    snapshot.forEach(doc => {
      const conversation = doc.data();
      const chatItem = createChatItem(doc.id, conversation);
      chatList.appendChild(chatItem);
    });

    // Avvia pulizia automatica delle conversazioni scadute
    cleanupExpiredConversations();

  } catch (error) {
    console.error('Errore caricamento chat:', error);
    showToast('Errore nel caricamento delle chat');
  }
}

function createChatItem(conversationId, conversation) {
  const chatItem = document.createElement('div');
  chatItem.className = 'chat-item';
  chatItem.onclick = () => openChat(conversationId);

  // Determina l'altro partecipante (anonimo)
  const otherParticipantId = conversation.participants.find(id => id !== currentUser.uid);
  const otherParticipant = conversation.participantsData?.[otherParticipantId] || {};

  // Genera avatar casuale se non presente
  const avatar = otherParticipant.avatar || String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const displayName = otherParticipant.displayName || generateRandomName();

  // Calcola messaggi non letti
  const unreadCount = conversation.unreadCounts?.[currentUser.uid] || 0;

  // Anteprima ultimo messaggio
  const lastMessage = conversation.lastMessage;
  const preview = lastMessage ? (
    lastMessage.type === 'text' ? lastMessage.content :
    lastMessage.type === 'image' ? '📷 Immagine' :
    'Messaggio'
  ) : 'Nuova conversazione';

  // Calcola tempo rimanente prima della scadenza
  const expiresAt = conversation.expiresAt?.toDate();
  const timeLeft = expiresAt ? getTimeLeft(expiresAt) : 'N/A';

  chatItem.innerHTML = `
    <div class="chat-avatar">${avatar}</div>
    <div class="chat-info">
      <div class="chat-name">${displayName}</div>
      <div class="chat-preview">${preview}</div>
    </div>
    <div class="chat-meta">
      <span class="chat-time">${timeLeft}</span>
      ${unreadCount > 0 ? `<span class="chat-unread">${unreadCount}</span>` : ''}
    </div>
  `;

  return chatItem;
}

function getTimeAgo(date) {
  if (!date) return 'ora';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'ora';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}g`;
  return date.toLocaleDateString();
}

function getTimeLeft(expiresAt) {
  if (!expiresAt) return 'N/A';

  const now = new Date();
  const diffInSeconds = Math.floor((expiresAt - now) / 1000);

  if (diffInSeconds <= 0) return 'scaduta';

  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  return `${Math.floor(diffInSeconds / 86400)}g`;
}

async function cleanupExpiredConversations() {
  try {
    const now = new Date();
    const expiredConversations = await db.collection('conversations')
      .where('expiresAt', '<=', firebase.firestore.Timestamp.fromDate(now))
      .get();

    // Elimina conversazioni scadute e relativi messaggi
    const deletePromises = [];
    expiredConversations.forEach(doc => {
      const conversationRef = db.collection('conversations').doc(doc.id);
      deletePromises.push(conversationRef.delete());

      // Elimina anche la sottocollezione messaggi
      const messagesRef = conversationRef.collection('messages');
      deletePromises.push(
        messagesRef.get().then(snapshot => {
          const messageDeletes = [];
          snapshot.forEach(msgDoc => {
            messageDeletes.push(msgDoc.ref.delete());
          });
          return Promise.all(messageDeletes);
        })
      );
    });

    await Promise.all(deletePromises);

    if (expiredConversations.size > 0) {
      console.log(`Eliminate ${expiredConversations.size} conversazioni scadute`);
    }

  } catch (error) {
    console.error('Errore pulizia conversazioni scadute:', error);
  }
}

// Funzioni rimosse - ora usiamo Firebase direttamente

// Toast system (riutilizzato dal login)
const toast = createToast();
document.body.appendChild(toast.node);

function showToast(message) {
  toast.show(message);
}

async function saveTempConversation(tempData) {
  try {
    const targetUsername = tempData.targetUsername;

    // Trova l'utente target
    const userQuery = await db.collection('users').where('username', '==', targetUsername).get();
    if (userQuery.empty) return;

    const targetUserId = userQuery.docs[0].id;

    // Crea conversazione reale con scadenza 24 ore
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 ore da ora

    const conversationData = {
      participants: [currentUser.uid, targetUserId],
      participantsData: {
        [currentUser.uid]: {
          displayName: 'Nuovo Utente',
          avatar: String.fromCharCode(65 + Math.floor(Math.random() * 26))
        },
        [targetUserId]: {
          displayName: targetUsername,
          avatar: String.fromCharCode(65 + Math.floor(Math.random() * 26))
        }
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      expiresAt: firebase.firestore.Timestamp.fromDate(expiresAt),
      lastMessage: tempData.messages[tempData.messages.length - 1],
      unreadCounts: {
        [currentUser.uid]: 0,
        [targetUserId]: 1
      }
    };

    const conversationRef = await db.collection('conversations').add(conversationData);

    // Salva messaggi
    for (const message of tempData.messages) {
      if (message.senderId !== 'system') {
        await conversationRef.collection('messages').add({
          ...message,
          senderId: message.senderId === tempData.tempUserId ? currentUser.uid : targetUserId,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }

  } catch (error) {
    console.error('Errore salvataggio conversazione temporanea:', error);
    throw error;
  }
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
      timeout = setTimeout(() => node.classList.remove("is-visible"), 2600);
    },
  };
}
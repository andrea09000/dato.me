// Message page functionality for dmto.me

let currentConversationId = '';
let currentConversation = null;
let currentUser = null;
let partnerData = null;
let messagesUnsubscribe = null;

document.addEventListener('DOMContentLoaded', function() {
  // Verifica autenticazione persistente
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      console.log('🔓 Accesso negato alla chat - reindirizzamento al login');
      window.location.href = './index.html';
      return;
    }

    console.log('👤 Utente autenticato nella chat individuale:', user.email);
    currentUser = user;

    // Ottieni ID conversazione dall'URL
    const urlParams = new URLSearchParams(window.location.search);
    currentConversationId = urlParams.get('conversation');

    if (!currentConversationId) {
      window.location.href = './chat.html';
      return;
    }

    await loadConversation();
    setupRealTimeMessages();

    // Focus sull'input
    document.getElementById('messageInput').focus();
  });
});

// Rimossa - ora usiamo Firebase per i nomi

async function loadConversation() {
  try {
    const conversationDoc = await db.collection('conversations').doc(currentConversationId).get();

    if (!conversationDoc.exists) {
      showToast('Conversazione non trovata');
      window.location.href = './chat.html';
      return;
    }

    currentConversation = conversationDoc.data();

    // Determina il partner
    const otherParticipantId = currentConversation.participants.find(id => id !== currentUser.uid);
    partnerData = currentConversation.participantsData[otherParticipantId] || {};

    // Aggiorna UI
    document.getElementById('partnerName').textContent = partnerData.displayName || 'Anonimo';
    document.getElementById('partnerAvatar').textContent = partnerData.avatar || 'A';

    // Mostra tempo rimanente
    if (currentConversation.expiresAt) {
      const expiresAt = currentConversation.expiresAt.toDate();
      const timeLeft = getTimeLeft(expiresAt);
      document.getElementById('expiresIn').textContent = timeLeft;

      // Aggiorna ogni minuto
      setInterval(() => {
        const updatedTimeLeft = getTimeLeft(expiresAt);
        document.getElementById('expiresIn').textContent = updatedTimeLeft;
      }, 60000);
    }

    // Segna messaggi come letti
    await markMessagesAsRead();

  } catch (error) {
    console.error('Errore caricamento conversazione:', error);
    showToast('Errore nel caricamento della conversazione');
  }
}

function setupRealTimeMessages() {
  // Ascolta i messaggi in tempo reale
  messagesUnsubscribe = db.collection('conversations')
    .doc(currentConversationId)
    .collection('messages')
    .orderBy('timestamp', 'asc')
    .onSnapshot((snapshot) => {
      renderMessages(snapshot);
    }, (error) => {
      console.error('Errore ascolto messaggi:', error);
    });
}

function renderMessages(snapshot) {
  const messageArea = document.getElementById('messageArea');

  // Salva posizione scroll
  const wasAtBottom = messageArea.scrollHeight - messageArea.clientHeight <= messageArea.scrollTop + 1;

  messageArea.innerHTML = '';

  snapshot.forEach(doc => {
    const message = doc.data();
    const messageElement = createMessageElement(message);
    messageArea.appendChild(messageElement);
  });

  // Scroll automatico se era in fondo
  if (wasAtBottom) {
    messageArea.scrollTop = messageArea.scrollHeight;
  }
}

function createMessageElement(message) {
  const messageBubble = document.createElement('div');
  const isSent = message.senderId === currentUser.uid;
  messageBubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;

  const timestamp = message.timestamp?.toDate();
  const timeString = timestamp ? timestamp.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  let content = '';
  switch (message.type) {
    case 'text':
      content = message.content;
      break;
    case 'image':
      content = `<img src="${message.content}" alt="Immagine" style="max-width: 200px; border-radius: 12px;">`;
      break;
    case 'system':
      content = `<em>${message.content}</em>`;
      break;
    default:
      content = message.content;
  }

  messageBubble.innerHTML = `
    <div class="message-content">${content}</div>
    <div class="message-time">${timeString}</div>
  `;

  return messageBubble;
}

async function markMessagesAsRead() {
  if (!currentConversation) return;

  try {
    // Azzera contatore messaggi non letti per l'utente corrente
    await db.collection('conversations').doc(currentConversationId).update({
      [`unreadCounts.${currentUser.uid}`]: 0
    });
  } catch (error) {
    console.error('Errore aggiornamento letti:', error);
  }
}

async function sendMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();

  if (!message || !currentConversationId) return;

  try {
    const messageData = {
      type: 'text',
      content: message,
      senderId: currentUser.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Aggiungi messaggio alla collezione
    await db.collection('conversations')
      .doc(currentConversationId)
      .collection('messages')
      .add(messageData);

    // Aggiorna ultimo messaggio nella conversazione
    await db.collection('conversations').doc(currentConversationId).update({
      lastMessage: messageData,
      [`unreadCounts.${getOtherParticipantId()}`]: firebase.firestore.FieldValue.increment(1)
    });

    input.value = '';
    input.rows = 1;
    input.focus();

  } catch (error) {
    console.error('Errore invio messaggio:', error);
    showToast('Errore nell\'invio del messaggio');
  }
}

function getOtherParticipantId() {
  if (!currentConversation) return null;
  return currentConversation.participants.find(id => id !== currentUser.uid);
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

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }

  // Auto-resize textarea
  const textarea = event.target;
  textarea.rows = 1;
  const scrollHeight = textarea.scrollHeight;
  textarea.rows = Math.min(Math.ceil(scrollHeight / 20), 5);
}

function goBack() {
  window.location.href = './chat.html';
}

function goToProfile() {
  window.location.href = './profile.html';
}


// Toast system (riutilizzato)
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
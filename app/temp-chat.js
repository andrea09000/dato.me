// Chat temporanea functionality per dmto.me

let tempConversationId = null;
let tempMessages = [];
let timerInterval = null;
let timeRemaining = 180; // 3 minuti in secondi
let tempUserId = null;

document.addEventListener('DOMContentLoaded', function() {
  // Genera ID temporaneo per l'utente
  tempUserId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Ottieni username dal parametro URL
  const urlParams = new URLSearchParams(window.location.search);
  const targetUsername = urlParams.get('user');

  if (targetUsername) {
    initializeTempChat(targetUsername);
  } else {
    showToast('Link non valido');
    setTimeout(() => window.location.href = './index.html', 2000);
  }

  // Avvia il timer
  startTimer();

  // Aggiorna il display del timer ogni secondo
  setInterval(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const display = timeRemaining > 0 ?
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}` :
      '00:00';
    const expiresElement = document.getElementById('expiresIn');
    if (expiresElement) {
      expiresElement.textContent = display;
    }
  }, 1000);
});

async function initializeTempChat(targetUsername) {
  try {
    // Cerca l'utente target tramite username univoco
    const usersRef = db.collection('users');
    const userQuery = await usersRef.where('username', '==', targetUsername).limit(1).get();

    if (userQuery.empty) {
      showToast('Utente non trovato');
      setTimeout(() => window.location.href = './index.html', 2000);
      return;
    }
    
    // Verifica unicità (dovrebbe essere sempre 1, ma meglio verificare)
    if (userQuery.size > 1) {
      console.error('⚠️ Errore: trovati più utenti con lo stesso username!', targetUsername);
    }

    const targetUser = userQuery.docs[0].data();
    const targetUserId = userQuery.docs[0].id;

    // Imposta informazioni partner
    document.getElementById('partnerName').textContent = targetUser.displayName || targetUsername;
    document.getElementById('partnerAvatar').textContent = targetUser.avatar || 'A';

    // Crea conversazione temporanea
    tempConversationId = `temp_${tempUserId}_${targetUserId}_${Date.now()}`;

    // Aggiungi messaggio di benvenuto
    addTempMessage({
      type: 'text',
      content: `Ciao! Hai ricevuto un link condiviso. Questa è una chat temporanea anonima.`,
      senderId: 'system',
      timestamp: new Date()
    });

    showToast('Chat temporanea iniziata - hai 3 minuti!');

  } catch (error) {
    console.error('Errore inizializzazione chat:', error);
    showToast('Errore nell\'inizializzazione della chat');
  }
}

function startTimer() {
  timerInterval = setInterval(() => {
    timeRemaining--;

    // Aggiorna display timer
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    document.getElementById('timerDisplay').textContent =
      `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Cambia colore negli ultimi 30 secondi
    if (timeRemaining <= 30) {
      document.getElementById('timerDisplay').style.color = '#ff6b6b';
    }

    // Mostra popup quando il tempo finisce
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      showAuthModal();
    }
  }, 1000);
}

function sendTempMessage() {
  const input = document.getElementById('messageInput');
  const message = input.value.trim();

  if (!message) return;

  const tempMessage = {
    type: 'text',
    content: message,
    senderId: tempUserId,
    timestamp: new Date()
  };

  addTempMessage(tempMessage);

  input.value = '';
  input.rows = 1;
  input.focus();
}

function addTempMessage(message) {
  tempMessages.push(message);

  const messageArea = document.getElementById('messageArea');
  const messageElement = createMessageElement(message);
  messageArea.appendChild(messageElement);
  messageArea.scrollTop = messageArea.scrollHeight;
}

function createMessageElement(message) {
  const messageBubble = document.createElement('div');
  const isSent = message.senderId === tempUserId;
  messageBubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;

  const timeString = message.timestamp.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });

  messageBubble.innerHTML = `
    <div class="message-content">${message.content}</div>
    <div class="message-time">${timeString}</div>
  `;

  return messageBubble;
}

function handleKeyPress(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendTempMessage();
  }

  // Auto-resize textarea
  const textarea = event.target;
  textarea.rows = 1;
  const scrollHeight = textarea.scrollHeight;
  textarea.rows = Math.min(Math.ceil(scrollHeight / 20), 5);
}

function showAuthModal() {
  document.getElementById('authModal').style.display = 'flex';
  document.getElementById('messageInput').disabled = true;
  document.querySelector('.btn-send').disabled = true;
}

function closeAuthModal() {
  document.getElementById('authModal').style.display = 'none';
  document.getElementById('messageInput').disabled = false;
  document.querySelector('.btn-send').disabled = false;
  showToast('Chat terminata - Registrati per salvare la conversazione');
}

function saveAndRegister() {
  // Salva conversazione temporanea nel localStorage
  const conversationData = {
    tempUserId: tempUserId,
    tempConversationId: tempConversationId,
    messages: tempMessages,
    targetUsername: new URLSearchParams(window.location.search).get('user'),
    timestamp: Date.now()
  };

  localStorage.setItem('temp_conversation', JSON.stringify(conversationData));
  window.location.href = './index.html';
}

function justRegister() {
  window.location.href = './index.html';
}

// Salva conversazione temporanea quando utente si registra
window.saveTempConversation = async function(userId) {
  if (!tempConversationId || tempMessages.length === 0) return;

  try {
    // Crea conversazione permanente
    const urlParams = new URLSearchParams(window.location.search);
    const targetUsername = urlParams.get('user');

    if (!targetUsername) return;

    // Trova ID utente target
    const userQuery = await db.collection('users').where('username', '==', targetUsername).get();
    if (userQuery.empty) return;

    const targetUserId = userQuery.docs[0].id;

    // Crea conversazione con scadenza 24 ore
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const conversationData = {
      participants: [userId, targetUserId],
      participantsData: {
        [userId]: {
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
      lastMessage: tempMessages[tempMessages.length - 1],
      unreadCounts: {
        [userId]: 0,
        [targetUserId]: 1
      }
    };

    const conversationRef = await db.collection('conversations').add(conversationData);

    // Salva messaggi
    for (const message of tempMessages) {
      if (message.senderId !== 'system') {
        await conversationRef.collection('messages').add({
          ...message,
          senderId: message.senderId === tempUserId ? userId : targetUserId,
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }

    showToast('Conversazione salvata! Ora puoi continuare dal tuo profilo.');
    setTimeout(() => window.location.href = './chat.html', 2000);

  } catch (error) {
    console.error('Errore salvataggio conversazione:', error);
    showToast('Errore nel salvataggio della conversazione');
  }
}

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
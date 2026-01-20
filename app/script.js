const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetId = tab.dataset.target;

    tabs.forEach((btn) => btn.classList.toggle("is-active", btn === tab));
    panels.forEach((panel) =>
      panel.classList.toggle("is-active", panel.id === targetId),
    );
  });
});

// Gestione accettazione termini
const acceptTermsCheckbox = document.getElementById('acceptTerms');
const registerBtn = document.getElementById('registerBtn');

if (acceptTermsCheckbox && registerBtn) {
  acceptTermsCheckbox.addEventListener('change', function() {
    registerBtn.disabled = !this.checked;
  });
}

// Validazione username in tempo reale
const usernameInput = document.getElementById('registerUsername');
const usernameHint = document.getElementById('usernameHint');

if (usernameInput && usernameHint) {
  let usernameCheckTimeout;
  
  usernameInput.addEventListener('input', async function() {
    const username = this.value.trim();
    clearTimeout(usernameCheckTimeout);
    
    if (username.length === 0) {
      usernameHint.style.display = 'none';
      return;
    }
    
    // Validazione formato
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      usernameHint.style.display = 'block';
      usernameHint.textContent = 'Solo lettere, numeri e underscore';
      usernameHint.style.color = '#ff6b6b';
      return;
    }
    
    if (username.length < 3) {
      usernameHint.style.display = 'block';
      usernameHint.textContent = 'Minimo 3 caratteri';
      usernameHint.style.color = '#ff6b6b';
      return;
    }
    
    if (username.length > 30) {
      usernameHint.style.display = 'block';
      usernameHint.textContent = 'Massimo 30 caratteri';
      usernameHint.style.color = '#ff6b6b';
      return;
    }
    
    // Controlla disponibilità dopo 500ms di inattività
    usernameHint.style.display = 'block';
    usernameHint.textContent = 'Verifica disponibilità...';
    usernameHint.style.color = '#999';
    
    usernameCheckTimeout = setTimeout(async () => {
      try {
        const exists = await checkUsernameExists(username);
        if (exists) {
          usernameHint.textContent = '❌ Username non disponibile';
          usernameHint.style.color = '#ff6b6b';
        } else {
          usernameHint.textContent = '✅ Username disponibile';
          usernameHint.style.color = '#4ecdc4';
        }
      } catch (error) {
        usernameHint.style.display = 'none';
      }
    }, 500);
  });
}

const toast = createToast();
document.body.appendChild(toast.node);

// Funzioni Loading Screen
function showLoadingScreen() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.style.display = 'flex';
    updateLoadingProgress(10);
    updateLoadingMessage('Inizializzazione...');
  }
}

function hideLoadingScreen() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    updateLoadingProgress(100);
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 500);
  }
}

function updateLoadingProgress(percent) {
  const progress = document.getElementById('loadingProgress');
  if (progress) {
    progress.style.width = percent + '%';
  }
}

function updateLoadingMessage(message) {
  const messageEl = document.getElementById('loadingMessage');
  if (messageEl) {
    messageEl.textContent = message;
  }
}

// Mostra loading all'avvio
document.addEventListener('DOMContentLoaded', function() {
  showLoadingScreen();

  // Simula caricamento progressivo
  setTimeout(() => updateLoadingProgress(30), 300);
  setTimeout(() => {
    updateLoadingProgress(60);
    updateLoadingMessage('Connessione Firebase...');
  }, 600);
  setTimeout(() => {
    updateLoadingProgress(90);
    updateLoadingMessage('Controllo autenticazione...');
  }, 900);
});

// Osserva lo stato di autenticazione
let authStateInitialized = false;
auth.onAuthStateChanged(async (user) => {
  if (user) {
    // Utente autenticato
    console.log('👤 Utente autenticato:', user.email);
    
    // Verifica che il profilo esista, altrimenti creane uno
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (!userDoc.exists) {
        // Profilo mancante, creane uno temporaneo
        console.log('⚠️ Profilo mancante, creazione profilo base...');
        const tempUsername = 'user_' + user.uid.substring(0, 8);
        await db.collection('users').doc(user.uid).set({
          username: tempUsername,
          username_lowercase: tempUsername.toLowerCase(),
          email: user.email || '',
          displayName: user.email ? user.email.split('@')[0] : 'Utente',
          status: 'Disponibile per chat anonime',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          isOnline: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
          showOnline: true,
          allowNewChats: true,
          notifications: true
        });
      } else {
        // Aggiorna stato online
        await db.collection('users').doc(user.uid).update({
          isOnline: true,
          lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Errore verifica/creazione profilo:', error);
    }
    
    // Redirect solo se siamo sulla pagina di login
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
      updateLoadingMessage('Accesso effettuato!');
      setTimeout(() => {
        hideLoadingScreen();
        window.location.href = './chat.html';
      }, 800);
    } else if (!authStateInitialized) {
      // Se siamo su un'altra pagina, nascondi solo il loading
      hideLoadingScreen();
    }
  } else {
    // Utente non autenticato
    console.log('🔓 Nessun utente autenticato');
    
    // Se siamo su una pagina protetta, reindirizza al login
    if (!window.location.pathname.includes('index.html') && 
        !window.location.pathname.includes('temp-chat.html') &&
        !window.location.pathname.includes('user.html') &&
        !window.location.pathname.includes('privacy-policy.html') &&
        !window.location.pathname.includes('terms-conditions.html')) {
      window.location.href = './index.html';
      return;
    }
    
    // Se siamo sulla pagina di login, nascondi loading
    if (window.location.pathname.includes('index.html') || window.location.pathname.endsWith('/')) {
      updateLoadingMessage('Pronto per l\'accesso');
      setTimeout(() => {
        hideLoadingScreen();
      }, 500);
    }
  }
  
  authStateInitialized = true;
});

const forms = document.querySelectorAll("form");
forms.forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);

    if (!form.checkValidity()) {
      // Mostra errore per il primo campo non valido
      const firstInvalid = form.querySelector(':invalid');
      if (firstInvalid) {
        firstInvalid.focus();
      }
      toast.show("Compila tutti i campi richiesti correttamente");
      return;
    }

    const formId = form.id;

    try {
      if (formId === 'login') {
        // LOGIN
        const email = data.get('email').trim();
        const password = data.get('password');

        if (!email || !password) {
          toast.show("Inserisci email e password");
          return;
        }

        showLoadingScreen();
        updateLoadingMessage('Accesso in corso...');

        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        
        // Verifica che il profilo esista
        const userDoc = await db.collection('users').doc(userCredential.user.uid).get();
        
        if (!userDoc.exists) {
          // Profilo mancante, creane uno base
          const tempUsername = 'user_' + userCredential.user.uid.substring(0, 8);
          await db.collection('users').doc(userCredential.user.uid).set({
            username: tempUsername,
            username_lowercase: tempUsername.toLowerCase(),
            email: email,
            displayName: email.split('@')[0],
            status: 'Disponibile per chat anonime',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
          });
        } else {
          // Aggiorna stato online
          await db.collection('users').doc(userCredential.user.uid).update({
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
          });
        }

        updateLoadingMessage('Accesso effettuato!');
        // Il redirect avverrà automaticamente tramite onAuthStateChanged
        setTimeout(() => {
          window.location.href = './chat.html';
        }, 500);

      } else if (formId === 'register') {
        // REGISTRAZIONE
        const email = data.get('email').trim();
        const password = data.get('password');
        const username = data.get('username').trim();
        const acceptTerms = data.get('acceptTerms');

        // Validazione email
        if (!email || !email.includes('@')) {
          toast.show("Inserisci un'email valida");
          return;
        }

        // Validazione password
        if (!password || password.length < 6) {
          toast.show("La password deve essere di almeno 6 caratteri");
          return;
        }

        // Validazione username
        if (!username || username.length < 3) {
          toast.show("Lo username deve essere di almeno 3 caratteri");
          return;
        }

        if (username.length > 30) {
          toast.show("Lo username non può superare i 30 caratteri");
          return;
        }

        // Verifica formato username (solo lettere, numeri, underscore)
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
          toast.show("Lo username può contenere solo lettere, numeri e underscore");
          return;
        }

        // Verifica accettazione termini
        if (!acceptTerms) {
          toast.show("Devi accettare i Termini e Condizioni per registrarti");
          return;
        }

        showLoadingScreen();
        updateLoadingMessage('Verifica disponibilità username...');

        // Verifica se username è già in uso (con timeout)
        try {
          const checkPromise = checkUsernameExists(username);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('timeout')), 10000)
          );
          
          const usernameExists = await Promise.race([checkPromise, timeoutPromise]);
          
          if (usernameExists) {
            hideLoadingScreen();
            toast.show("Questo username è già in uso. Scegline un altro.");
            return;
          }
        } catch (checkError) {
          console.warn('⚠️ Errore verifica username, continuo comunque:', checkError);
          // Continua comunque - Firebase rifiuterà se l'username esiste
        }

        updateLoadingMessage('Creazione account Firebase...');

        // Crea utente Firebase Authentication
        let userCredential;
        try {
          userCredential = await auth.createUserWithEmailAndPassword(email, password);
          console.log('✅ Utente Firebase Authentication creato:', userCredential.user.uid);
        } catch (authError) {
          hideLoadingScreen();
          console.error('❌ Errore creazione account:', authError);
          throw authError; // Lascia che venga gestito dal catch esterno
        }

        updateLoadingMessage('Salvataggio profilo nel database...');

        // Salva profilo nel database Firestore
        const trimmedUsername = username.trim();
        try {
          await db.collection('users').doc(userCredential.user.uid).set({
            username: trimmedUsername,
            username_lowercase: trimmedUsername.toLowerCase(), // Per ricerche case-insensitive
            email: email.toLowerCase(),
            displayName: trimmedUsername,
            status: 'Disponibile per chat anonime',
            termsAccepted: true,
            termsAcceptedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            isOnline: true,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            showOnline: true,
            allowNewChats: true,
            notifications: true
          }, { merge: false });
          
          console.log('✅ Profilo salvato nel database Firestore');
        } catch (dbError) {
          hideLoadingScreen();
          console.error('❌ Errore salvataggio profilo:', dbError);
          console.error('Dettagli:', dbError.code, dbError.message);
          
          // Se l'utente è stato creato ma il profilo no, elimina l'utente
          try {
            await userCredential.user.delete();
            console.log('⚠️ Utente eliminato a causa di errore salvataggio profilo');
          } catch (deleteError) {
            console.error('Errore eliminazione utente:', deleteError);
          }
          
          throw dbError; // Lascia che venga gestito dal catch esterno
        }

        updateLoadingMessage('Account creato con successo!');
        
        // Redirect automatico
        setTimeout(() => {
          window.location.href = './chat.html';
        }, 800);
      }
    } catch (error) {
      console.error('Errore autenticazione:', error);

      // Nascondi loading screen in caso di errore
      hideLoadingScreen();

      // Gestisci errori comuni Firebase
      let errorMessage = "Errore durante l'operazione";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "Questa email è già registrata. Prova a fare login.";
            break;
          case 'auth/weak-password':
            errorMessage = "Password troppo debole. Deve essere di almeno 6 caratteri.";
            break;
          case 'auth/invalid-email':
            errorMessage = "Email non valida. Controlla il formato.";
            break;
          case 'auth/user-not-found':
            errorMessage = "Nessun account trovato con questa email.";
            break;
          case 'auth/wrong-password':
            errorMessage = "Password errata. Riprova.";
            break;
          case 'auth/invalid-credential':
            errorMessage = "Email o password errate.";
            break;
          case 'auth/too-many-requests':
            errorMessage = "Troppi tentativi falliti. Riprova tra qualche minuto.";
            break;
          case 'auth/network-request-failed':
            errorMessage = "Errore di connessione. Controlla la tua connessione internet.";
            break;
          case 'permission-denied':
            errorMessage = "❌ Errore permessi Firestore! Le regole di sicurezza non sono configurate. Controlla Firebase Console → Firestore → Rules";
            console.error('🔴 IMPOSTA LE REGOLE FIRESTORE! Vai su Firebase Console');
            break;
          case 'failed-precondition':
            errorMessage = "Errore: multiple tab aperte. Chiudi le altre tab e riprova.";
            break;
          default:
            errorMessage = `Errore: ${error.code || 'sconosciuto'} - ${error.message || 'Si è verificato un errore imprevisto'}`;
        }
      } else if (error.message) {
        if (error.message === 'timeout') {
          errorMessage = "Timeout: la verifica username sta impiegando troppo tempo. Riprova.";
        } else {
          errorMessage = error.message;
        }
      }

      console.error('❌ ERRORE COMPLETO:', error);
      toast.show(errorMessage);
    }
  });
});

// Funzione per verificare se username esiste già
async function checkUsernameExists(username) {
  try {
    if (!username || username.trim() === '') {
      return false;
    }
    
    const trimmedUsername = username.trim();
    const normalizedUsername = trimmedUsername.toLowerCase();
    
    console.log('🔍 Verifica username:', trimmedUsername, '->', normalizedUsername);
    
    // Prima prova con username originale (più comune)
    let snapshot = await db.collection('users')
      .where('username', '==', trimmedUsername)
      .limit(1)
      .get();
    
    console.log('Query username originale:', snapshot.size, 'risultati');
    
    // Se non trova nulla, prova anche con username_lowercase (per nuovi documenti)
    if (snapshot.empty) {
      snapshot = await db.collection('users')
        .where('username_lowercase', '==', normalizedUsername)
        .limit(1)
        .get();
      console.log('Query username_lowercase:', snapshot.size, 'risultati');
    }
    
    const exists = !snapshot.empty;
    console.log('✅ Username', trimmedUsername, exists ? 'ESISTE' : 'DISPONIBILE');
    
    return exists;
    
  } catch (error) {
    console.error('❌ Errore verifica username:', error);
    console.error('Dettagli errore:', error.code, error.message);
    
    // Se è un errore di permessi, NON bloccare - lascia che Firebase gestisca
    if (error.code === 'permission-denied') {
      console.warn('⚠️ Permessi Firestore - query non permessa, permettendo tentativo');
      return false; // Permette di provare, Firebase rifiuterà se duplicato
    }
    
    // Per altri errori (rete, etc), permette di provare
    return false; // false = username disponibile (ottimistico)
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
      timeout = setTimeout(() => node.classList.remove("is-visible"), 3000);
    },
  };
}

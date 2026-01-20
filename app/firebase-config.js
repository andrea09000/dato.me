// Firebase Configuration
// Configurazione Firebase per dmto.me
const firebaseConfig = {
  apiKey: "AIzaSyAT783NpElPkPEsOxsNDg9fdp3XCW1J7hE",
  authDomain: "spottlyweb-963b7.firebaseapp.com",
  projectId: "spottlyweb-963b7",
  storageBucket: "spottlyweb-963b7.firebasestorage.app",
  messagingSenderId: "793820550484",
  appId: "1:793820550484:web:b16793f519b11f761224c1",
  measurementId: "G-F3FCF3VJN3"
};

// Initialize Firebase
try {
  firebase.initializeApp(firebaseConfig);
  console.log('✅ Firebase inizializzato correttamente');
} catch (error) {
  console.error('❌ Errore inizializzazione Firebase:', error);
}

// Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Configurazione Firestore - abilita persistence
try {
  db.enablePersistence()
    .then(() => {
      console.log('✅ Firestore persistence abilitata');
    })
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('⚠️ Persistence fallita: multiple tab aperte');
      } else if (err.code == 'unimplemented') {
        console.warn('⚠️ Persistence non supportata dal browser');
      } else {
        console.error('❌ Errore Firestore persistence:', err);
      }
    });
} catch (error) {
  console.error('❌ Errore configurazione Firestore:', error);
}

// Configurazione Auth - Login persistente
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
  .then(() => {
    console.log('🔐 Persistenza auth impostata su LOCAL');
  })
  .catch((error) => {
    console.error('❌ Errore impostazione persistenza auth:', error);
  });

// Configurazione Storage
try {
  storage.setMaxUploadRetryTime(30000); // 30 secondi
  storage.setMaxOperationRetryTime(30000);
  console.log('✅ Firebase Storage configurato');
} catch (error) {
  console.error('❌ Errore configurazione Storage:', error);
}

// Firebase Analytics (se disponibile)
let analytics = null;
try {
  // Analytics richiede import separato, ma se disponibile lo usiamo
  if (typeof firebase.analytics !== 'undefined') {
    analytics = firebase.analytics();
    analytics.logEvent('app_initialized');
    console.log('✅ Firebase Analytics configurato');
  }
} catch (error) {
  console.warn('⚠️ Analytics non disponibile:', error);
}

// Esporta i servizi per l'uso negli altri file
window.auth = auth;
window.db = db;
window.storage = storage;
window.firebase = firebase; // Export anche firebase namespace per compatibilità
if (analytics) {
  window.analytics = analytics;
}

// Funzione helper per verificare che Firebase sia pronto
window.isFirebaseReady = function() {
  return !!(
    window.firebase &&
    window.auth &&
    window.db &&
    window.storage
  );
};

// Verifica che tutto sia caricato correttamente
if (!window.isFirebaseReady()) {
  console.error('❌ Firebase non inizializzato correttamente!');
} else {
  console.log('✅ Tutti i servizi Firebase pronti');
}

// Debug: verifica connessione
auth.onAuthStateChanged((user) => {
  if (user) {
    console.log('👤 Firebase Auth: Utente connesso -', user.email);
    // Log evento analytics se disponibile
    if (analytics) {
      analytics.logEvent('user_login', { method: 'persisted_session' });
    }
  } else {
    console.log('🔓 Firebase Auth: Nessun utente connesso');
  }
});

console.log('🚀 Firebase configurato e pronto - Progetto: spottlyweb-963b7');
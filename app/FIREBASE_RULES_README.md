# 🔐 Regole Firebase per dmto.me

Questo documento spiega come configurare le regole di sicurezza per Firebase (Firestore e Storage).

## 📋 Indice
1. [Firestore Rules](#firestore-rules)
2. [Storage Rules](#storage-rules)
3. [Come applicare le regole](#come-applicare-le-regole)
4. [Struttura Database](#struttura-database)

---

## 🔥 Firestore Rules

Le regole di Firestore sono salvate in `firestore.rules`.

### Principi di sicurezza:
- ✅ Solo utenti autenticati possono accedere ai dati
- ✅ Gli utenti possono leggere/scrivere solo i propri dati o dati condivisi
- ✅ Le conversazioni sono accessibili solo ai partecipanti
- ✅ I messaggi sono immutabili dopo la creazione
- ✅ Validazione dei dati in ingresso

### Collections principali:

#### `users/{userId}`
- **Lettura**: Proprietario (tutto) o altri (solo dati pubblici)
- **Scrittura**: Solo il proprietario
- **Campi protetti**: email, createdAt, termsAcceptedAt non modificabili

#### `conversations/{conversationId}`
- **Lettura**: Solo partecipanti
- **Creazione**: Utente autenticato deve essere nei partecipanti
- **Aggiornamento**: Solo partecipanti (no modifica partecipanti)
- **Eliminazione**: Disabilitata

#### `conversations/{conversationId}/messages/{messageId}`
- **Lettura**: Solo partecipanti della conversazione
- **Creazione**: Solo partecipanti, senderId deve corrispondere
- **Aggiornamento**: Disabilitato (messaggi immutabili)
- **Eliminazione**: Solo il mittente può eliminare

#### `temp_conversations/{tempId}`
- **Lettura/Scrittura**: Pubblica (per chat temporanee)
- Include scadenza automatica

---

## 📦 Storage Rules

Le regole di Storage sono salvate in `storage.rules`.

### Principi di sicurezza:
- ✅ Limite dimensione file: 5MB
- ✅ Solo immagini per avatar e media condivisi
- ✅ Ogni utente può gestire solo i propri file
- ✅ Immagini pubbliche accessibili a tutti gli utenti autenticati

### Path principali:

#### `users/{userId}/avatar.*`
- **Lettura**: Proprietario o pubblico (per avatar)
- **Scrittura**: Solo proprietario
- **Formati**: jpg, jpeg, png, webp
- **Dimensione max**: 5MB

#### `conversations/{conversationId}/media/{mediaId}`
- **Lettura**: Utenti autenticati
- **Scrittura**: Utenti autenticati (verifica partecipazione nell'app)
- **Solo immagini**: Tipo MIME deve essere image/*

#### `temp/{tempId}/media/{mediaId}`
- **Lettura/Scrittura**: Pubblica (per chat temporanee)
- **Limitato**: Solo immagini, max 5MB

---

## 🚀 Come applicare le regole

### Metodo 1: Firebase Console (Consigliato per test)

1. Vai su [Firebase Console](https://console.firebase.google.com/)
2. Seleziona il progetto `spottlyweb-963b7`
3. Per Firestore:
   - Vai su **Firestore Database** → **Rules**
   - Copia il contenuto di `firestore.rules`
   - Incolla e clicca **Publish**
4. Per Storage:
   - Vai su **Storage** → **Rules**
   - Copia il contenuto di `storage.rules`
   - Incolla e clicca **Publish**

### Metodo 2: Firebase CLI (Per produzione)

```bash
# Installa Firebase CLI se non l'hai fatto
npm install -g firebase-tools

# Login
firebase login

# Inizializza (se non già fatto)
firebase init firestore
firebase init storage

# Deploy delle regole
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

### Metodo 3: Firebase REST API (Per automazione)

```bash
# Firestore Rules
curl -X PUT \
  "https://firestore.googleapis.com/v1/projects/spottlyweb-963b7/databases/(default):commit" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d @firestore.rules

# Storage Rules (più complesso, meglio usare CLI o Console)
```

---

## 📊 Struttura Database

### Collection: `users`
```javascript
{
  userId: {
    username: string (max 30 chars),
    email: string,
    displayName: string,
    status: string,
    photoURL: string,
    isOnline: boolean,
    lastSeen: timestamp,
    createdAt: timestamp,
    termsAccepted: boolean,
    termsAcceptedAt: timestamp,
    showOnline: boolean,
    allowNewChats: boolean,
    notifications: boolean
  }
}
```

### Collection: `conversations`
```javascript
{
  conversationId: {
    participants: [userId1, userId2],
    participantsData: {
      userId1: { displayName, avatar },
      userId2: { displayName, avatar }
    },
    createdAt: timestamp,
    lastMessage: { type, content, senderId, timestamp },
    unreadCounts: { userId1: number, userId2: number },
    messages: {
      messageId: {
        type: 'text' | 'image' | 'system',
        content: string (max 5000 chars),
        senderId: userId,
        timestamp: timestamp
      }
    }
  }
}
```

### Collection: `temp_conversations`
```javascript
{
  tempId: {
    targetUsername: string,
    createdAt: timestamp,
    expiresAt: timestamp,
    messages: { ... }
  }
}
```

---

## 🔒 Note di sicurezza

1. **Non modificare mai le regole per "semplificare" il debug** in produzione
2. **Testa sempre le regole** usando l'emulatore Firebase prima del deploy
3. **Monitora i log** per verificare eventuali violazioni
4. **Mantieni le regole aggiornate** quando aggiungi nuove funzionalità
5. **Non esporre mai dati sensibili** (password, token, etc.) in Firestore

---

## 🧪 Test delle regole

### Usando Firebase Emulator:
```bash
firebase emulators:start --only firestore,storage
```

### Test manuali nella console:
1. Vai su **Firestore Database** → **Rules**
2. Clicca su **Rules Playground**
3. Simula letture/scritture per testare le regole

---

## ⚠️ Troubleshooting

### "Permission denied" errori comuni:
- ✅ Verifica che l'utente sia autenticato
- ✅ Verifica che l'utente sia partecipe della conversazione
- ✅ Verifica che i campi obbligatori siano presenti
- ✅ Verifica i limiti di dimensione (messaggi, file)

### Errori Storage:
- ✅ Verifica formato file (solo immagini)
- ✅ Verifica dimensione (max 5MB)
- ✅ Verifica path corretto

---

## 📝 Changelog

- **v1.0** (2026) - Regole iniziali per dmto.me
  - Sicurezza base per users, conversations, messages
  - Storage per avatar e media
  - Supporto chat temporanee

---

Per domande o problemi, controlla la [documentazione Firebase](https://firebase.google.com/docs/rules).

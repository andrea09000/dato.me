# 🔗 Setup Routing per dmto.me/username

Questo documento spiega come configurare il routing per gestire i link profilo nel formato `dmto.me/username`.

## 📋 Come funziona

I link profilo sono nel formato `dmto.me/username`. Quando qualcuno clicca su questi link:
1. Il server reindirizza a `/app/user.html?u=username`
2. `user.html` legge l'username e reindirizza a `temp-chat.html?user=username`
3. L'utente può iniziare una chat temporanea anonima

## 🚀 Configurazione Server

### Opzione 1: Apache (.htaccess)

Il file `.htaccess` è già configurato. Assicurati che:
- Apache abbia `mod_rewrite` abilitato
- `.htaccess` sia nella root del sito (non in `/app/`)
- Le regole RewriteEngine siano attive

### Opzione 2: Vercel (vercel.json)

Il file `vercel.json` è già configurato. Deploya su Vercel e funzionerà automaticamente.

### Opzione 3: Nginx

Aggiungi questa configurazione al tuo `nginx.conf`:

```nginx
location / {
    try_files $uri $uri/ @rewrite;
}

location @rewrite {
    rewrite ^/([a-zA-Z0-9_]+)$ /app/user.html?u=$1 last;
}

location /app {
    try_files $uri $uri/ =404;
}
```

### Opzione 4: Cloudflare Pages/Workers

Aggiungi un Worker con questo codice:

```javascript
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  // Match username pattern (solo lettere, numeri, underscore)
  const usernameMatch = pathname.match(/^\/([a-zA-Z0-9_]+)$/);
  
  if (usernameMatch) {
    const username = usernameMatch[1];
    // Reindirizza a user.html
    return Response.redirect(`${url.origin}/app/user.html?u=${username}`, 302);
  }
  
  // Serve file normalmente
  return fetch(request);
}
```

### Opzione 5: Netlify (_redirects)

Crea un file `_redirects` nella root:

```
/[a-zA-Z0-9_]+  /app/user.html?u=:splat  200
```

## 🔧 Test del Routing

Dopo la configurazione, testa:

1. **Link diretto**: `https://dmto.me/username`
   - Dovrebbe reindirizzare a `/app/user.html?u=username`
   - Poi a `/app/temp-chat.html?user=username`

2. **Link con parametri**: `/app/user.html?u=username`
   - Dovrebbe funzionare direttamente

3. **Link con hash**: `/app/user.html#username`
   - Dovrebbe funzionare anche questo

## 📝 Note

- Gli username supportati sono: lettere, numeri, underscore
- I link vengono sempre convertiti in `https://dmto.me/username`
- Se l'username non esiste, l'utente vedrà un errore nella chat temporanea
- Per link interni, usa sempre `dmto.me/username` nel formato assoluto

## ✅ Checklist

- [ ] Server configurato con rewrite rules
- [ ] `user.html` presente in `/app/`
- [ ] Test link `dmto.me/username` funzionante
- [ ] Link copiati da profilo usano formato `dmto.me/username`
- [ ] Error handling per username non validi

---

Per domande o problemi, consulta la documentazione del tuo provider di hosting.

// Hors connexion d'abord : lecture du cache immédiate, fraîcheur en arrière-plan.
const V='agora-v32';
const SHELL=['./','index.html','admin-sources.js','manifest.webmanifest','icon-192.png','icon-512.png','gwm-logo.png'];
// Adresse complète d'un fichier du site, à côté de ce service worker.
const abs=u=>new URL(u,location.href).href;
// À l'installation, les fichiers du site sont relus sur le serveur (jamais le cache du navigateur).
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL.map(u=>new Request(abs(u),{cache:'reload'})))));self.skipWaiting()});
// « Nouvelle version disponible » (design/VERSION_SITE.md) : le site demande de relire ses fichiers
// sur le serveur avant de se recharger ; la réponse arrive même si une lecture échoue.
self.addEventListener('message',e=>{
  if(e.data?.type!=='AGORA_MAJ')return;
  e.waitUntil((async()=>{
    const cache=await caches.open(V);
    await Promise.all(SHELL.map(async u=>{try{const r=await fetch(new Request(abs(u),{cache:'no-store'}));if(r.ok)await cache.put(abs(u),r)}catch{/* hors ligne : l'ancienne version reste lisible */}}));
    e.source?.postMessage({type:'AGORA_MAJ_OK'});
  })());
});
self.addEventListener('activate',e=>{
  e.waitUntil((async()=>{
    const actuel=await caches.open(V);
    for(const nom of await caches.keys()){
      if(!nom.startsWith('agora-')||nom===V)continue;
      // Conserver les données déjà téléchargées lors d'une mise à jour de l'application.
      const ancien=await caches.open(nom);
      for(const req of await ancien.keys())if(new URL(req.url).origin===location.origin&&new URL(req.url).pathname.endsWith('.json')&&!await actuel.match(req)){
        const r=await ancien.match(req);if(r)await actuel.put(req,r);
      }
      await caches.delete(nom);
    }
    await self.clients.claim();
  })());
});
async function actualiser(req,cle,cache,precedent){
  const controle=new AbortController(),fin=setTimeout(()=>controle.abort(),8000);
  try{
    const r=await fetch(req,{signal:controle.signal});
    if(r.ok){
      try{
        const u=new URL(req.url),donnee=u.pathname.endsWith('.json'),admin=u.pathname.endsWith('/admin.enc.json');
        let change=false;
        if(donnee&&!admin&&precedent){const a=precedent.headers.get('ETag'),b=r.headers.get('ETag');change=a&&b?a!==b:await precedent.clone().text()!==await r.clone().text()}
        await cache.put(cle,r.clone());
        if(change)for(const client of await self.clients.matchAll({type:'window'}))client.postMessage({type:'AGORA_CACHE_ACTUALISE',chemin:u.pathname});
      }catch{/* Une erreur de cache ne bloque jamais la réponse réseau. */}
    }
    return r;
  }catch{return null}finally{clearTimeout(fin)}
}
self.addEventListener('fetch',e=>{
  const url=new URL(e.request.url);
  if(e.request.method!=='GET'||url.origin!==location.origin)return;
  // Numéro de version du site : toujours lu sur le serveur, jamais dans le cache.
  if(url.pathname.endsWith('/version.json'))return;
  const cle=url.pathname.endsWith('.json')?url.pathname:e.request;
  // Enregistrer l'attente dès l'événement, avant les lectures asynchrones du cache.
  let terminer;const travail=new Promise(r=>terminer=r);e.waitUntil(travail);
  e.respondWith((async()=>{
    try{
      const cache=await caches.open(V),precedent=await cache.match(cle);
      const frais=actualiser(e.request,cle,cache,precedent);
      if(precedent){frais.finally(terminer);return precedent}
      const r=await frais;terminer();
      return r||new Response('Ce contenu n’est pas encore disponible hors connexion.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
    }catch{terminer();return new Response('Ce contenu n’est pas encore disponible hors connexion.',{status:503})}
  })());
});

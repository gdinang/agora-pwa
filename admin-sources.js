/* Sources de l'admin : composants du site existant, accès GitHub déjà configuré.
   Les liens sont préparés côté serveur ; aucune clé YouTube n'arrive au navigateur. */
const SourcesAdmin=(()=>{
  let message='',edition='',ajout=false,brouillon=null,occupe=false,activation='',actDraft=null;
  let consultation=null,provisoire='';
  let sauvegardeLocale=true;
  const cleLocale=()=> 'agora_source_brouillon_v1:'+String(ghCfg().repo||'local');
  function brouillonLocal(){try{
    const brut=localStorage.getItem(cleLocale())||'null';if(brut.length>8192)return null;
    const d=JSON.parse(brut);if(!d||d.version!==1||typeof d.lien!=='string'||d.lien.length>2000)return null;
    const s=d.selection;
    if(s&&(!['video','playlist','chaine','emission'].includes(s.choix)||['label','langue','filtre_titre'].some(k=>typeof s[k]!=='string')||[['run_hours',24],['run_weekdays',7],['edition_jours',7]].some(([k,max])=>!Array.isArray(s[k])||s[k].length>max||s[k].some(n=>!Number.isInteger(n)||n<0||n>=max))))d.selection=null;
    const w=d.web;if(w&&(!['auto','article','flux','podcast'].includes(w.format)||typeof w.langue!=='string'||[['jours',7],['heures',24]].some(([k,max])=>!Array.isArray(w[k])||w[k].length>max||w[k].some(n=>!Number.isInteger(n)||n<0||n>=max))))d.web=null;
    return d;
  }catch{return null}}
  function effacerLocal(){try{localStorage.removeItem(cleLocale())}catch{}}
  function choixCourants(){
    if(!$('so_act_mode'))return actDraft;
    const coches=nom=>[...document.querySelectorAll('[name="'+nom+'"]:checked')].map(x=>Number(x.value));
    return {choix:$('so_act_mode').value,label:$('so_act_nom').dataset.auto==='1'?'':$('so_act_nom').value.trim(),langue:$('so_act_langue').value,
      filtre_titre:$('so_act_filtre').value.trim(),max_total_seconds:Number($('so_act_duree').value)*60,
      edition_jours:coches('so_act_edition'),run_weekdays:coches('so_act_jour'),run_hours:coches('so_act_heure'),
      pays:$('so_act_pays').value||null,pays_statut:$('so_act_pays_confirme').checked?'confirme':'propose',inclure:$('so_initial').checked};
  }
  function retenirBrouillon(){
    let d;
    if(ajout&&$('so_lien')){brouillon={lien:$('so_lien').value,nom:$('so_nouveau_nom').value,pays:$('so_nouveau_pays').value};if($('so_type')?.value!=='youtube')brouillon.web={format:$('so_type').value,langue:$('so_web_langue').value,jours:[...document.querySelectorAll('[name="so_web_jour"]:checked')].map(x=>+x.value),heures:[...document.querySelectorAll('[name="so_web_heure"]:checked')].map(x=>+x.value)};d={...brouillon}}
    else if(activation){const p=(etat().preparations||[]).find(x=>x.id===activation);if(p){actDraft=choixCourants();d={lien:p.lien,nom:p.nom||'',pays:p.pays||null,selection:actDraft}}}
    if(!d||!d.lien)return;
    // Liste fermée : aucun jeton, mot de passe ou paquet admin dans le stockage local.
    try{const texte=JSON.stringify({version:1,lien:d.lien.slice(0,2000),nom:String(d.nom||'').slice(0,140),pays:d.pays||null,selection:d.selection||null,web:d.web||null});if(texte.length>8192)throw Error('Brouillon trop volumineux');localStorage.setItem(cleLocale(),texte);sauvegardeLocale=true}catch{sauvegardeLocale=false}
    const info=$('so_local');if(info)info.textContent=sauvegardeLocale?'Brouillon conservé sur cet appareil. Aucun suivi n’est encore activé.':'Le brouillon reste ouvert, mais cet appareil ne permet pas de le conserver après fermeture.';
  }
  function sansApercu(d=brouillon,selection=actDraft){
    if(!d)return;
    let u;try{u=new URL(d.lien.trim());if(u.protocol!=='https:'||u.username||u.password||u.port||!['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtu.be','www.youtu.be'].includes(u.hostname))throw Error()}catch{message='Indiquez un lien YouTube https complet.';adminRender();return}
    const morceaux=u.pathname.replace(/^\/+|\/+$/g,'').split('/');let video=null,playlist=null;
    if(u.hostname.endsWith('youtu.be'))video=morceaux[0];else if(morceaux[0]==='watch')video=u.searchParams.get('v');else if(['shorts','live','embed'].includes(morceaux[0]))video=morceaux[1];else if(morceaux[0]==='playlist')playlist=u.searchParams.get('list');
    const chaine=morceaux[0]?.startsWith('@')&&morceaux[0].length>1||morceaux[0]==='channel'&&/^UC[\w-]{22}$/.test(morceaux[1]||'')||morceaux[0]==='user'&&!!morceaux[1];
    if(video&&!/^[\w-]{11}$/.test(video)||playlist&&!/^[\w-]{10,120}$/.test(playlist)||!video&&!playlist&&!chaine){message='Utilisez le lien d’une vidéo, d’une playlist ou d’une chaîne YouTube.';adminRender();return}
    const choix=[];if(video)choix.push({mode:'video',nom:'Cette vidéo seulement'});if(playlist)choix.push({mode:'playlist',nom:'Les nouvelles vidéos de cette playlist'});choix.push({mode:'chaine',nom:'Les nouvelles vidéos de cette chaîne'});
    const p={id:crypto.randomUUID().replace(/-/g,''),lien:d.lien.trim(),nom:d.nom||'',pays:d.pays||null,a_verifier:true,youtube:{choix,nom_chaine:'Source à vérifier',video_id:video,playlist_id:playlist,apercus:{},chaine_id:'',publications_id:''}};
    if(provisoire)A.state.sources.preparations=(etat().preparations||[]).filter(x=>x.id!==provisoire);
    A.state.sources.preparations=[p,...(etat().preparations||[])];provisoire=p.id;activation=p.id;actDraft=selection;ajout=false;brouillon=null;
    message='Vous pouvez préparer vos choix sans aperçu. Une connexion sera nécessaire pour vérifier le lien et activer le suivi.';adminRender();retenirBrouillon();
  }
  const service=()=>etat().apercu_immediat||{};
  function servicePret(){try{return new URL(service().url).protocol==='https:'&&String(service().jeton||'').length>=32}catch{return false}}
  const etat=()=>((A.state||{}).sources)||{configuration:[],preparations:[],demandes:[]};
  const liste=()=>etat().configuration||[];
  const parId=id=>liste().find(s=>s.id===id);
  const champ=(nom,id,val,type='text')=>'<label class="field"><span>'+esc(nom)+'</span><input id="'+id+'" type="'+type+'" value="'+esc(val??'')+'"></label>';
  const select=(nom,id,options)=>'<label class="field"><span>'+esc(nom)+'</span><select class="source-select" id="'+id+'">'+options+'</select></label>';
  const paysOptions=cc=>'<option value=""'+(!cc?' selected':'')+'>Non renseigné</option>'+Object.entries(GEO||{CM:{nom:'Cameroun'},FR:{nom:'France'}}).sort((a,b)=>a[1].nom.localeCompare(b[1].nom,'fr')).map(([k,v])=>'<option value="'+esc(k)+'"'+(k===cc?' selected':'')+'>'+esc(v.nom)+'</option>').join('');
  const joursEdition=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  const confirme=s=>s.pays_statut==='confirme'||(!s.pays_statut&&s.mecanisme!=='youtube'&&!!s.pays);
  const confirmationPays=(id,oui)=>'<label class="source-confirm"><input type="checkbox" id="'+id+'"'+(oui?' checked':'')+'> Pays confirmé par l’équipe</label>';
  const langues={fr:'Français',en:'Anglais','fr-en':'Français et anglais',de:'Allemand',es:'Espagnol',ar:'Arabe',pt:'Portugais'};
  const langueOptions=code=>Object.entries({...langues,...(!langues[code]?{[code]:code}:{})}).map(([k,v])=>'<option value="'+esc(k)+'"'+(k===code?' selected':'')+'>'+esc(v)+'</option>').join('');
  function horaires(s){return (s.run_weekdays?['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].filter((_,i)=>s.run_weekdays.includes(i)).join(', '):'Tous les jours')+' · '+(s.run_hours?[...s.run_hours].sort((a,b)=>a-b).map(h=>h+' h').join(', '):'Chaque passage horaire')}
  function cases(id,noms,coches){const groupe=noms.length===24?'Heures de vérification':id.includes('edition')?'Jours des éditions':'Jours de vérification';return '<div role="group" aria-label="'+groupe+'"><div class="row"><button type="button" class="btn sec" aria-label="Tout sélectionner : '+groupe+'" data-so-cases="'+id+'|tout">Tout sélectionner</button><button type="button" class="btn sec" aria-label="Tout désélectionner : '+groupe+'" data-so-cases="'+id+'|rien">Tout désélectionner</button></div><div class="source-checks">'+noms.map((n,i)=>'<label><input type="checkbox" name="'+id+'" value="'+i+'"'+(coches.includes(i)?' checked':'')+'>'+esc(n)+'</label>').join('')+'</div></div>'}
  function formulaire(s){
    const d=brouillon||s;
    let h='<div class="card"><h2>Réglages de la source</h2>'+champ('Nom de votre suivi','so_nom',d.label)
      +select('Pays du média','so_pays',paysOptions(d.pays))+confirmationPays('so_pays_confirme',confirme(d))+select('Langue du contenu','so_langue',langueOptions(d.langue||'fr'))
      +select('Suivi','so_actif','<option value="1"'+(d.actif?' selected':'')+'>Actif</option><option value="0"'+(!d.actif?' selected':'')+'>En pause</option>')
      +(s.mecanisme==='youtube'&&s.mode!=='video'?'<h2>Éditions souhaitées</h2>'+cases('so_edition',joursEdition,d.edition_jours||[0,1,2,3,4,5,6])+'<p class="hint">Un journal du lundi publié mardi reste une édition du lundi.</p>':'')
      +'<details class="appr"'+(s.mecanisme!=='youtube'?' open':'')+'><summary>Jours et heures de vérification</summary>'+cases('so_jour',joursEdition,d.run_weekdays||[0,1,2,3,4,5,6])
      +'<h2>Heures de vérification</h2><p class="hint">Heure du Cameroun. Les heures du matin permettent de rattraper un contenu manqué.</p>'
      +cases('so_heure',Array.from({length:24},(_,i)=>i+' h'),d.run_hours||Array.from({length:24},(_,i)=>i))+'</details>';
    h+='<details class="appr"><summary>Réglages de lecture</summary>';
    if(s.mecanisme==='crtv')h+=champ('Noms dans les adresses CRTV, séparés par des virgules','so_slugs',(d.slugs||[]).join(', '))
      +champ('Heure de disponibilité habituelle','so_publication',d.publish_hour,'number')
      +select('Épisode recherché','so_date','<option value="today"'+(d.date_mode==='today'?' selected':'')+'>Édition du jour ou de la veille</option><option value="last_sunday"'+(d.date_mode==='last_sunday'?' selected':'')+'>Dernier dimanche</option>');
    if(s.mecanisme==='rfi')h+=champ('Adresse de la veille RFI','so_url',d.watch_url,'url')+champ('Mots-clés séparés par des virgules','so_mots',(d.keywords||[]).join(', '));
    if(s.mecanisme==='equinoxe')h+=champ('Identifiant de la playlist existante','so_playlist',d.playlist_id)+champ('Durée maximale analysée (minutes)','so_duree',d.max_total_seconds/60,'number')
      +'<p class="hint">Pour préparer un autre média depuis un lien, utilisez « Ajouter une source ».</p>';
    if(s.mecanisme==='youtube')h+='<p class="hint">Suivi : '+esc(s.mode==='video'?'une vidéo':s.mode==='playlist'?'une playlist':'une chaîne')+'. Les identifiants ont été retrouvés automatiquement.</p>'
      +(s.mode!=='video'?champ('Expression à rechercher dans le titre (facultatif)','so_filtre',d.filtre_titre||''):'')
      +champ('Durée maximale d’une vidéo (minutes)','so_duree',d.max_total_seconds/60,'number');
    if(s.mecanisme==='web')h+=champ('Adresse de la source','so_url',d.source_url,'url')+select('Format','so_format',formatsWeb(d.format))+'<p class="hint">Lecture au prochain passage. Les podcasts sont limités à 45 minutes.</p>';
    return h+'</details><div class="notice source-preview" id="so_apercu" role="status"></div><div class="row"><button class="btn" id="so_enregistrer"'+(occupe?' disabled':'')+'>Enregistrer les réglages</button><button class="btn sec" id="so_annuler">Annuler</button></div></div>';
  }
  const formatsWeb=val=>Object.entries({auto:'Site ou flux : reconnaissance automatique',article:'Un article seulement',flux:'Flux RSS ou Atom',podcast:'Podcast (adresse du flux)'}).map(([k,v])=>'<option value="'+k+'"'+(val===k?' selected':'')+'>'+v+'</option>').join('');
  function nouveau(){const w=brouillon?.web,web=!!w;return '<div class="card"><h2>Ajouter une source</h2>'+select('Type de source','so_type','<option value="youtube">YouTube</option>'+formatsWeb(w?.format))+'<p>'+(web?'Collez une adresse publique. Le premier contenu sera lu au prochain passage, sans attente pour enregistrer votre suivi.':'Collez le lien d’une vidéo, d’une playlist ou d’une chaîne YouTube pour choisir ici ce que vous souhaitez suivre.')+'</p>'
    +champ('Lien du contenu ou de la source','so_lien',(brouillon||{}).lien||'','url')+'<details class="appr"><summary>Réglages facultatifs</summary>'+champ('Nom de votre suivi (facultatif)','so_nouveau_nom',(brouillon||{}).nom||'')+'<p class="hint">Un nom de rangement sera proposé automatiquement. Le titre et le média d’origine restent inchangés.</p>'+select('Pays du média (si vous le connaissez)','so_nouveau_pays',paysOptions((brouillon||{}).pays))+'</details>'
    +(web?select('Langue du contenu','so_web_langue',langueOptions(w.langue||'fr'))+'<details class="appr"><summary>Jours et heures de vérification</summary>'+cases('so_web_jour',joursEdition,w.jours||[0,1,2,3,4,5,6])+cases('so_web_heure',Array.from({length:24},(_,i)=>i+' h'),w.heures||Array.from({length:24},(_,i)=>i))+'</details><p class="hint">Les articles déjà présents dans un flux ne sont pas repris automatiquement. Activation dans le catalogue commun et le groupe WhatsApp.</p>':'')
    +'<p class="hint" id="so_local">Vous pouvez préparer vos choix sans aperçu, même hors connexion.</p><div class="row"><button class="btn" id="so_preparer"'+(occupe?' disabled':'')+'>'+(web?(navigator.onLine===false?'Conserver mon brouillon':'Activer ce suivi'):consultation?'Consultation de YouTube…':servicePret()&&navigator.onLine!==false?'Voir les choix et l’aperçu':'Continuer sans aperçu')+'</button>'+(web?'':servicePret()&&navigator.onLine!==false?'<button class="btn sec" id="so_sans_apercu"'+(occupe?' disabled':'')+'>Continuer sans aperçu</button>':'')+'<button class="btn sec" id="so_annuler">Annuler</button></div></div>'}
  function preparations(){
    const annules=new Set((etat().demandes||[]).filter(d=>d.annule).map(d=>d.id));
    const R=(etat().preparations||[]).filter(p=>!annules.has(p.id)&&p.id!==provisoire),D=(etat().demandes||[]).filter(d=>!d.annule),ids=new Set(R.map(r=>r.id));
    const P=[...D.filter(d=>!ids.has(d.id)).map(d=>({...d,statut:'en_cours',message:'La demande sera préparée au prochain passage horaire. Actualisez ensuite les sources.'})),...R];
    if(!P.length)return '';
    return '<h2>Sources en préparation ('+P.length+')</h2>'+P.map(p=>{
      const y=p.youtube,st={en_cours:'En préparation',identifiee:'YouTube identifié',a_adapter:'À adapter',a_reessayer:'À réessayer'}[p.statut]||'À préparer';
      return '<article class="card"><div class="meta"><span class="b '+(p.statut==='identifiee'?'ok':'warn')+'">'+esc(st)+'</span><span>'+dt(p.date)+'</span></div><b>'+esc(p.nom||(y&&y.nom_chaine)||'Nouvelle source')+'</b><div>'+link(p.lien)+'</div><p>'+esc(p.message||'')+'</p>'
        +(y?'<div class="meta">Chaîne : '+esc(y.nom_chaine)+'</div>'+(y.titre_video?'<p>'+esc(y.titre_video)+'</p>':'')+'<h2>Possibilités de suivi</h2><ul>'+y.choix.map(c=>'<li>'+esc(c.nom)+'</li>').join('')+'</ul>'
        +(y.emission_a_preciser?'<p class="hint">Pour une émission précise, fournissez sa playlist ou confirmez le nom à rechercher. Le suivi de toute la chaîne serait plus large.</p>':'')
        +(liste().some(s=>s.demande_id===p.id)?'<span class="b ok">Suivi créé · réglages dans la liste des sources</span>':'<button class="btn" data-so-activer="'+esc(p.id)+'">Configurer le suivi</button>'):'')
        +(!liste().some(s=>s.demande_id===p.id)?'<button class="btn sec" data-so-abandonner="'+esc(p.id)+'"'+(occupe?' disabled':'')+'>Annuler cette préparation</button>':'')+'</article>';
    }).join('');
  }
  function render(){
    const L=liste(),f=kf.o||'',F=L.filter(s=>!f||(f==='pause'?!s.actif:s.actif));
    let h='<div class="row"><button class="btn" id="so_ajouter"'+(occupe?' disabled':'')+'>Ajouter une source</button><button class="btn sec" id="so_actualiser"'+(occupe?' disabled':'')+'>'+I('refresh')+'Actualiser les sources</button></div><p class="hint">Réglages réservés à l’administration. Les suivis personnels premium seront ouverts avec les comptes et les abonnements.</p>';
    if(message)h+='<div class="alert" role="status">'+esc(message)+'</div>';
    if(!ajout&&!activation&&brouillonLocal())h+='<div class="card"><p>Un ajout est conservé sur cet appareil.</p><div class="row"><button class="btn sec" id="so_reprendre">Reprendre mon ajout</button><button class="btn sec" id="so_effacer_local">Supprimer le brouillon</button></div></div>';
    if(!ghCfg().token)h+='<div class="alert">Pour enregistrer, configurez l’accès GitHub en bas de l’onglet Annuaire.</div>';
    if(ajout)h+=nouveau();
    if(activation)h+=formActivation();
    if(edition&&parId(edition))h+=formulaire(parId(edition));
    h+=kpis('o',[['Sources',L.length,''],['Actives',L.filter(s=>s.actif).length,'actif'],['En pause',L.filter(s=>!s.actif).length,'pause']]);
    h+=kbar('o',f==='pause'?'En pause':'Actives',F.length,'source');
    h+=F.map(s=>'<article class="card"><div class="meta"><span class="b '+(s.actif?'ok':'warn')+'">'+(s.actif?'Active':'En pause')+'</span><span>'+esc((GEO&&GEO[s.pays]||{}).nom||s.pays||'Pays non renseigné')+(s.pays?' · '+(confirme(s)?'confirmé':'à confirmer'):'')+' · '+esc(langues[s.langue]||s.langue||'')+'</span></div><b>'+esc(s.label)+'</b><p class="hint">Vérification : '+esc(horaires(s))+'</p>'+(s.mecanisme==='youtube'&&s.mode!=='video'?'<p class="hint">Éditions : '+esc((s.edition_jours||[0,1,2,3,4,5,6]).map(i=>joursEdition[i]).join(', '))+'</p>':'')+statutSuivi(s)+'<div class="row"><button class="btn sec" data-so-edit="'+esc(s.id)+'">Modifier</button><button class="btn sec" data-so-pause="'+esc(s.id)+'"'+(occupe?' disabled':'')+'>'+(s.actif?'Mettre en pause':'Reprendre le suivi')+'</button></div></article>').join('')||'';
    if(!F.length)h+='<p class="mono">Aucune source dans cette catégorie.</p>';
    return h;
  }
  function connexion(){const c=ghCfg();if(!c.token||!/^[-\w.]+\/[-\w.]+$/.test(c.repo||''))throw new Error('Configurez l’accès GitHub dans l’onglet Annuaire.');return {base:'https://api.github.com/repos/'+c.repo+'/contents/',headers:{Authorization:'Bearer '+c.token,Accept:'application/vnd.github+json'}}}
  const decoder=j=>JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(j.content.replace(/\n/g,'')),x=>x.charCodeAt(0))));
  function encoder(d){const b=new TextEncoder().encode(JSON.stringify(d,null,1)+'\n');let s='';for(const n of b)s+=String.fromCharCode(n);return btoa(s)}
  async function lire(c,path,facultatif=false){const r=await fetch(c.base+path+'?t='+Date.now(),{headers:c.headers,cache:'no-store'});if(facultatif&&r.status===404)return null;if(!r.ok)throw new Error('Lecture refusée ('+r.status+'). Vérifiez l’accès GitHub.');return r.json()}
  async function sauver(id,change,label){
    if(occupe)return;const attendu=JSON.stringify(parId(id));occupe=true;message='Enregistrement…';adminRender();
    try{const c=connexion();for(let essai=0;essai<2;essai++){
      const j=await lire(c,'data/sources.json'),d=decoder(j),s=(d.sources||[]).find(x=>x.id===id);
      if(!s||JSON.stringify(s)!==attendu)throw new Error('Cette source a changé depuis votre dernière lecture. Actualisez les sources avant de réessayer.');
      const avantPays={pays:s.pays??null,statut:s.pays_statut||null};change(s);
      if(avantPays.pays!==(s.pays??null)||avantPays.statut!==(s.pays_statut||null))s.pays_historique=[...(s.pays_historique||[]),{date:new Date().toISOString(),avant:avantPays,apres:{pays:s.pays??null,statut:s.pays_statut||null}}];
      const r=await fetch(c.base+'data/sources.json',{method:'PUT',headers:c.headers,body:JSON.stringify({message:'Sources : '+label,content:encoder(d),sha:j.sha})});
      if(r.ok){A.state.sources.configuration=d.sources;message='Réglages enregistrés. Ils seront lus au prochain passage du pipeline ; l’affichage sera republié automatiquement.';edition='';brouillon=null;break}
      if(r.status!==409||essai===1)throw new Error('Enregistrement refusé ('+r.status+'). Actualisez puis réessayez.');
    }}catch(e){message=e.message}finally{occupe=false;adminRender()}
  }
  async function actualiser(){
    if(occupe)return;occupe=true;message='Actualisation…';adminRender();
    try{const c=connexion(),j=await lire(c,'data/sources.json'),d=decoder(j);
      if(!Array.isArray(d.sources))throw new Error('Le fichier des sources est illisible.');
      const [memoire,web]=await Promise.all([lire(c,'data/youtube_suivis.json',true),lire(c,'data/web_suivis.json',true)]);
      const immediat=service(),temporaire=(etat().preparations||[]).find(p=>p.id===provisoire);A.state.sources={configuration:d.sources,preparations:temporaire?[temporaire]:[],demandes:[],suivis:memoire?decoder(memoire).sources:{},suivis_web:web?decoder(web).sources:{},preparation_active:false,apercu_immediat:immediat};message='Sources actualisées.';
    }catch(e){message=e.message}finally{occupe=false;adminRender()}
  }
  function lireFormulaire(){
    const s=parId(edition),d=structuredClone(s);d.label=$('so_nom').value.trim();d.pays=$('so_pays').value||null;d.pays_statut=d.pays?($('so_pays_confirme').checked?'confirme':'propose'):'non_renseigne';d.langue=$('so_langue').value.trim();d.actif=$('so_actif').value==='1';
    d.run_hours=[...document.querySelectorAll('[name="so_heure"]:checked')].map(c=>Number(c.value));
    const jours=[...document.querySelectorAll('[name="so_jour"]:checked')].map(c=>Number(c.value));d.run_weekdays=jours.length===7?null:jours;
    if(s.mecanisme==='crtv'){d.slugs=$('so_slugs').value.split(/[,\n]/).map(x=>x.trim()).filter(Boolean);d.publish_hour=Number($('so_publication').value);d.date_mode=$('so_date').value}
    if(s.mecanisme==='rfi'){d.watch_url=$('so_url').value.trim();d.keywords=$('so_mots').value.split(',').map(x=>x.trim()).filter(Boolean)}
    if(s.mecanisme==='web'){const u=new URL($('so_url').value.trim());if(u.protocol!=='https:'||u.username||u.password||u.port)throw new Error('Indiquez une adresse HTTPS publique.');d.source_url=u.href;d.format=$('so_format').value}
    if(s.mecanisme==='equinoxe'){d.playlist_id=$('so_playlist').value.trim();d.max_total_seconds=Number($('so_duree').value)*60}
    if(s.mecanisme==='youtube'){d.max_total_seconds=Number($('so_duree').value)*60;d.filtre_titre=$('so_filtre')?$('so_filtre').value.trim():'';if(s.mode!=='video'){const js=[...document.querySelectorAll('[name="so_edition"]:checked')].map(x=>Number(x.value));if(!js.length)throw new Error('Choisissez au moins un jour d’édition.');d.edition_jours=js.length===7?null:js}}
    if(!d.label||d.label.length>140||!d.langue||!d.run_hours.length||jours.length===0)throw new Error('Indiquez un nom, une langue, au moins un jour et une heure.');
    if(d.slugs&&(!d.slugs.length||d.slugs.some(x=>!/^[-a-z0-9]+$/.test(x))))throw new Error('Vérifiez les noms utilisés dans les adresses CRTV.');
    if(s.mecanisme==='crtv'&&(!Number.isInteger(d.publish_hour)||d.publish_hour<0||d.publish_hour>23))throw new Error('L’heure de disponibilité doit être comprise entre 0 et 23.');
    if(s.mecanisme==='rfi'&&(!/^https:\/\/(?:www\.)?rfi\.fr\//i.test(d.watch_url)||!d.keywords.length))throw new Error('Indiquez une page RFI et au moins un mot-clé.');
    if(s.mecanisme==='equinoxe'&&(!/^[\w-]{10,120}$/.test(d.playlist_id)||!Number.isFinite(d.max_total_seconds)||d.max_total_seconds<60||d.max_total_seconds>10800))throw new Error('Vérifiez la playlist et la durée (1 à 180 minutes).');
    if(s.mecanisme==='youtube'&&(!Number.isInteger(d.max_total_seconds)||d.max_total_seconds<60||d.max_total_seconds>10800||d.filtre_titre.length>140))throw new Error('Vérifiez le filtre (140 caractères maximum) et la durée (1 à 180 minutes).');
    brouillon=d;return d;
  }
  function apercu(){const out=$('so_apercu');if(!out)return;const hs=[...document.querySelectorAll('[name="so_heure"]:checked')].map(x=>x.value+' h');out.textContent=$('so_actif').value==='0'?'La source sera en pause.':'Vérifications : '+(hs.join(', ')||'choisissez au moins une heure')+', heure du Cameroun.'}
  async function creerWeb(){
    if(occupe)return;retenirBrouillon();
    if(navigator.onLine===false){message=sauvegardeLocale?'Brouillon conservé sur cet appareil. Aucun suivi activé.':'Cet appareil ne permet pas de conserver le brouillon après fermeture.';adminRender();return}
    let s;
    try{const d=brouillon,w=d.web,u=new URL(d.lien.trim());if(u.protocol!=='https:'||u.username||u.password||u.port||u.href.length>2048||!['auto','article','flux','podcast'].includes(w.format)||!w.jours.length||!w.heures.length||d.nom.length>140)throw Error();u.hash='';
      s={id:'web_'+crypto.randomUUID().replace(/-/g,''),label:d.nom.trim()||u.hostname,mecanisme:'web',diffusion:'commune',actif:true,channel:'whatsapp',source_url:u.href,format:w.format,pays:d.pays||null,pays_statut:d.pays?'propose':'non_renseigne',langue:w.langue,run_hours:w.heures,run_weekdays:w.jours.length===7?null:w.jours,max_age_days:2,max_total_seconds:2700,debut_suivi:new Date().toISOString()};
    }catch{message='Vérifiez l’adresse HTTPS, le nom, les jours et les heures.';adminRender();return}
    if(!confirm('Activer « '+s.label+' » dans le catalogue commun et le groupe WhatsApp ?'))return;
    occupe=true;message='Enregistrement du suivi…';adminRender();
    try{const c=connexion();for(let essai=0;essai<2;essai++){
      const j=await lire(c,'data/sources.json'),d=decoder(j);if(!Array.isArray(d.sources))throw Error('Configuration des sources illisible.');
      if(d.sources.some(x=>x.mecanisme==='web'&&x.source_url===s.source_url))throw Error('Cette source est déjà suivie. Modifiez ses réglages dans la liste.');
      d.sources.push(s);const r=await fetch(c.base+'data/sources.json',{method:'PUT',headers:c.headers,body:JSON.stringify({message:'Sources : ajouter un article, flux ou podcast',sha:j.sha,content:encoder(d)})});
      if(r.ok){A.state.sources.configuration=d.sources;effacerLocal();ajout=false;brouillon=null;message='Suivi enregistré. La lecture sera vérifiée au prochain passage.';break}
      if(r.status!==409||essai===1)throw Error('Enregistrement refusé. Réessayez après actualisation.');
    }}catch(e){message=e.message}finally{occupe=false;adminRender()}
  }
  async function demander(donnees=null,selection=null){
    if($('so_type')&&$('so_type').value!=='youtube')return creerWeb();
    if(occupe)return;brouillon=donnees||{lien:$('so_lien').value.trim(),nom:$('so_nouveau_nom').value.trim(),pays:$('so_nouveau_pays').value};
    try{const u=new URL(brouillon.lien);if(u.protocol!=='https:'||u.username||u.password||brouillon.lien.length>2000||brouillon.nom.length>140)throw new Error()}catch{message='Indiquez une adresse https complète et un nom de 140 caractères maximum.';adminRender();return}
    retenirBrouillon();
    if(!servicePret()||navigator.onLine===false){sansApercu(brouillon,selection);return}
    const controle=new AbortController(),d={...brouillon,id:crypto.randomUUID().replace(/-/g,'')};consultation=controle;
    const fin=setTimeout(()=>controle.abort('delai'),10000);occupe=true;message='Consultation de YouTube…';adminRender();
    try{let r,resultat;for(let essai=0;essai<9;essai++){
      r=await fetch(service().url,{method:'POST',headers:{Authorization:'Bearer '+service().jeton,'Content-Type':'application/json'},body:JSON.stringify({lien:d.lien}),signal:controle.signal,credentials:'omit',redirect:'error',cache:'no-store'});
      resultat=await r.json();if(consultation!==controle)return;
      if(r.status!==409||essai===8)break;
      await new Promise((resolve,reject)=>{const arret=()=>{clearTimeout(t);reject(new Error('Consultation interrompue.'))};const t=setTimeout(()=>{controle.signal.removeEventListener('abort',arret);resolve()},1000);controle.signal.addEventListener('abort',arret,{once:true});if(controle.signal.aborted)arret()});
    }
      if(!r.ok)throw new Error(resultat.message||'L’aperçu est indisponible. Réessayez.');
      if(!resultat.youtube||!Array.isArray(resultat.youtube.choix)||!resultat.date)throw new Error('La réponse est incomplète. Réessayez.');
      const p={...d,...resultat,statut:'identifiee',pays:d.pays||resultat.youtube.pays_suggere||null};
      if(provisoire)A.state.sources.preparations=(etat().preparations||[]).filter(x=>x.id!==provisoire);
      const choixRecents=selection?(choixCourants()||selection):null;
      A.state.sources.preparations=[p,...(etat().preparations||[])];provisoire=p.id;activation=p.id;actDraft=choixRecents;ajout=false;brouillon=null;message=selection?'Lien vérifié. Vérifiez les informations puis confirmez le suivi.':'Choisissez ce qui vous intéresse. Rien n’est encore activé.';
      if(actDraft&&![...p.youtube.choix.map(x=>x.mode),'emission'].includes(actDraft.choix)){actDraft.choix=p.youtube.choix[0]?.mode||'chaine';message='Le lien a été vérifié. Choisissez à nouveau le contenu à suivre.'}
    }catch(e){if(consultation===controle)message=controle.signal.aborted?'YouTube met trop de temps à répondre. Réessayez, sans quitter cet écran.':e.message==='Failed to fetch'?'Le service est momentanément inaccessible. Réessayez.':e.message}
    finally{clearTimeout(fin);if(consultation===controle){consultation=null;occupe=false;adminRender();retenirBrouillon()}}
  }
  function abandonnerBrouillon(){
    if(ajout||activation||provisoire)effacerLocal();
    if(consultation){consultation.abort();consultation=null;occupe=false}
    if(provisoire){A.state.sources.preparations=(etat().preparations||[]).filter(p=>p.id!==provisoire);provisoire=''}
    edition='';ajout=false;activation='';actDraft=null;brouillon=null;message='Ajout annulé. Aucun nouveau suivi n’a été activé.';adminRender();
  }
  async function annulerPreparation(id){
    if(occupe||!confirm('Annuler cette préparation ? Aucun suivi ne sera créé.'))return;
    occupe=true;message='Annulation…';adminRender();
    try{const c=connexion(),path='data/sources_demandes/'+id+'.json',j=await lire(c,path),d=decoder(j);d.annule=true;d.annule_le=new Date().toISOString();
      const r=await fetch(c.base+path,{method:'PUT',headers:c.headers,body:JSON.stringify({message:'Sources : annuler une préparation',sha:j.sha,content:encoder(d)})});
      if(!r.ok)throw new Error('Annulation non enregistrée. Actualisez et réessayez.');
      A.state.sources.demandes=(etat().demandes||[]).map(x=>x.id===id?d:x);activation='';message='Préparation annulée. Aucun suivi n’a été activé.';
    }catch(e){message=e.message}finally{occupe=false;adminRender()}
  }
  function statutSuivi(s){
    if(s.mecanisme==='web'){const st=(etat().suivis_web||{})[s.id]||{};return '<p class="hint">'+esc({publie:'Dernier contenu publié',aucune_nouveaute:'Aucune nouveauté',a_adapter:'Format ou accès à adapter',a_reessayer:'Lecture interrompue, nouvel essai prévu',reporte_budget:'Reporté : capacité ou temps de traitement atteint'}[st.statut]||'Lecture au prochain passage')+(st.derniere_verification?' · '+dt(st.derniere_verification):'')+'</p>'}
    if(s.mecanisme!=='youtube')return '';
    const st=(etat().suivis||{})[s.id]||{},n={publie:'Dernière vidéo publiée',aucune_nouveaute:'Aucune nouveauté correspondante',video_indisponible:'Une vidéo est indisponible ou encore en direct',duree_a_ajuster:'Une vidéo dépasse la durée autorisée',reporte_budget:'Reporté : budget de temps ou d’analyse atteint',a_reessayer:'Lecture interrompue, nouvelle tentative au prochain passage'};
    return '<p class="hint">'+esc(n[st.statut]||'En attente du premier passage')+(st.derniere_verification?' · '+dt(st.derniere_verification):'')+'</p>'+(st.dernier_titre?'<p class="hint">'+esc(st.dernier_titre)+'</p>':'');
  }
  function nomAuto(y,mode,filtre){return (mode==='video'?(y.titre_video||y.nom_chaine):y.nom_chaine+(mode==='emission'&&filtre?' · '+filtre:'')).slice(0,140)}
  function titreNormalise(t){return String(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(\d{1,2})\s*(?:h\s*00|:\s*00)\b/g,'$1h').replace(/(\d)\s+h\b/g,'$1h').replace(/[^a-z0-9]+/g,' ').trim()}
  function titreCorrespond(t,f){const mots=titreNormalise(f).split(' ').filter(m=>m&&!['de','du','le','la','les','des'].includes(m));return mots.every(m=>titreNormalise(t).split(' ').includes(m))}
  function dateEditionFr(v){return v.date_edition?new Date(v.date_edition+'T12:00:00Z').toLocaleDateString('fr-FR',{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric'}):'date inconnue'}
  function videoFraiche(v){
    if(!v||!v.lisible||!v.publie_le||!v.date_edition)return false;
    const pub=Date.parse(v.publie_le),edition=Date.parse(v.date_edition+'T00:00:00Z'),maintenant=Date.now();
    const parties=Object.fromEntries(new Intl.DateTimeFormat('fr-FR',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(maintenant)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
    const aujourdHui=Date.UTC(Number(parties.year),Number(parties.month)-1,Number(parties.day)),ecart=(aujourdHui-edition)/86400000;
    return Number.isFinite(pub)&&Number.isFinite(edition)&&pub<=maintenant+300000&&maintenant-pub<=172800000&&ecart>=0&&ecart<=2;
  }
  function editionInitiale(y,mode,filtre,jours){const v=y.video_selectionnee;return !!(v&&v.id===y.video_id&&v.chaine_id===y.chaine_id&&videoFraiche(v)&&jours.includes(v.edition_jour)&&titreCorrespond(v.titre,mode==='video'?'':filtre))}
  function afficherExemples(){
    const p=(etat().preparations||[]).find(p=>p.id===activation);if(!p||!p.youtube)return;
    const y=p.youtube,mode=$('so_act_mode').value,filtre=$('so_act_filtre').value.trim(),jours=[...document.querySelectorAll('[name="so_act_edition"]:checked')].map(c=>Number(c.value));
    $('so_act_filtre').closest('label').hidden=mode==='video';$('so_act_editions').hidden=mode==='video';
    const toutes=mode==='video'?(y.video_selectionnee?[y.video_selectionnee]:[]):((y.apercus||{})[mode==='emission'?'chaine':mode]||[]);
    const vues=toutes.filter(v=>/^[A-Za-z0-9_-]{11}$/.test(v.id||'')&&v.chaine_id===y.chaine_id&&v.lisible&&(mode==='video'||(jours.includes(v.edition_jour)&&titreCorrespond(v.titre,filtre))))
      .sort((a,b)=>String(b.date_edition||'').localeCompare(String(a.date_edition||''))||String(b.publie_le||'').localeCompare(String(a.publie_le||''))).slice(0,3);
    let h='<b>Ce qui sera suivi</b><p>'+esc(mode==='video'?'Cette vidéo uniquement':mode==='emission'?'Les prochaines éditions correspondant à « '+filtre+' »':mode==='playlist'?'Les nouvelles vidéos de cette playlist':'Les nouvelles vidéos de cette chaîne')+'</p>';
    if(mode==='emission'&&!filtre)h+='<p>Indiquez une expression du titre pour reconnaître l’émission.</p>';
    else if(vues.length)h+=(mode==='video'?'':'<p>Exemples récents correspondant à ces choix :</p>')+'<ol class="source-exemples">'+vues.map(v=>'<li><a class="source-video" href="https://www.youtube.com/watch?v='+esc(v.id)+'" target="_blank" rel="noopener noreferrer"><span class="source-miniature"><span>Miniature indisponible</span><img src="https://i.ytimg.com/vi/'+esc(v.id)+'/hqdefault.jpg" alt="" width="480" height="360" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span><span class="source-video-texte"><span>'+esc(v.titre)+'</span><small>Édition : '+esc(dateEditionFr(v))+(v.origine_date==='mise_en_ligne'?' (date de mise en ligne utilisée)':' (date du titre)')+'</small><span class="source-video-action">Voir la vidéo sur YouTube ↗</span></span></a></li>').join('')+'</ol>';
    else h+='<p>'+esc(p.a_verifier?'L’aperçu n’est pas disponible pour le moment. Vous pouvez préparer vos choix sans consulter les vidéos.':y.apercu_erreur||'Aucune édition correspondante dans les vidéos examinées. Vérifiez les jours et le filtre ; cela ne prouve pas que l’émission n’existe pas.')+'</p>';
    if(p.a_verifier)h+='<small>Choix provisoires. Le lien sera vérifié avant toute activation.</small>';
    else if(p.date)h+='<small>'+esc(y.couverture_apercu||'Exemples disponibles au moment de la consultation.')+' Relevé : '+dt(p.date)+'.</small>';
    $('so_act_exemples').innerHTML=h;
    // Les images ne retardent ni les choix ni l'activation ; conserver le texte en cas d'échec.
    $('so_act_exemples').querySelectorAll('img').forEach(img=>{
      img.onload=()=>{if(img.naturalWidth>120)img.parentElement.classList.add('chargee');else img.hidden=true};
      img.onerror=()=>{img.hidden=true;img.parentElement.classList.remove('chargee')};
      if(img.complete){if(img.naturalWidth)img.onload();else img.onerror()}
    });
    const initial=$('so_initial'),bloc=$('so_initial_bloc');bloc.hidden=mode==='video'||!y.video_id;
    const peut=editionInitiale(y,mode,filtre,jours);initial.disabled=!peut;if(!peut)initial.checked=false;
    $('so_initial_info').textContent=p.a_verifier?'Cette option sera disponible après vérification du lien.':peut?'L’édition fournie sera traitée une fois, puis les suivantes selon vos choix.':'Cette édition est trop ancienne, inaccessible ou ne correspond pas aux jours et au filtre choisis.';
    if($('so_act_nom').dataset.auto==='1')$('so_act_nom').value=nomAuto(y,mode,filtre);
  }
  function formActivation(){
    const p=(etat().preparations||[]).find(p=>p.id===activation);if(!p||!p.youtube)return '';
    const y=p.youtube,d=actDraft||{},modes=[...y.choix,{mode:'emission',nom:'Une émission de cette chaîne (par son titre)'}];
    return '<div class="card"><h2>'+ (p.a_verifier?'Préparer mon suivi':'Activer un suivi YouTube')+'</h2><p><b>'+esc(y.nom_chaine)+'</b></p>'+(y.titre_video?'<p>'+esc(y.titre_video)+'</p>':'')
      +select('Contenu à suivre','so_act_mode',modes.map((m,i)=>'<option value="'+m.mode+'"'+((d.choix||modes[0].mode)===m.mode?' selected':'')+'>'+esc(m.nom)+'</option>').join(''))
      +champ('Expression à confirmer pour reconnaître l’émission','so_act_filtre',d.filtre_titre??y.filtre_suggere??'')
      +'<div id="so_act_editions"><h2>Éditions à recevoir</h2>'+cases('so_act_edition',joursEdition,d.edition_jours||[0,1,2,3,4,5,6])+'<p class="hint">Le jour de l’édition compte, même si le média la met en ligne plus tard.</p></div>'
      +'<div class="source-preview" id="so_act_exemples" aria-live="polite"></div>'
      +'<div id="so_initial_bloc"><label class="source-confirm"><input type="checkbox" id="so_initial"'+(d.inclure!==false?' checked':'')+'> Résumer aussi cette édition</label><p class="hint" id="so_initial_info"></p></div>'
      +'<details class="appr"><summary>Réglages facultatifs</summary>'+champ('Nom de votre suivi (facultatif)','so_act_nom',d.label||p.nom||nomAuto(y,d.choix||modes[0].mode,d.filtre_titre??y.filtre_suggere??''))
      +'<p class="hint">Ce nom sert à ranger votre suivi. Le média et le titre d’origine restent affichés.</p>'
      +select('Langue du contenu','so_act_langue',langueOptions(d.langue||'fr'))
      +select('Pays du média','so_act_pays',paysOptions(d.pays===undefined?p.pays:d.pays))+confirmationPays('so_act_pays_confirme',d.pays_statut==='confirme')
      +'<p class="hint">Une suggestion de pays n’est pas une confirmation. Le pays des sujets est classé séparément.</p>'
      +champ('Durée maximale d’une vidéo (minutes)','so_act_duree',(d.max_total_seconds||2700)/60,'number')
      +'<h2>Vérification automatique</h2><p class="hint">À chaque passage horaire par défaut, tous les jours. Ces réglages sont distincts des éditions choisies.</p>'
      +cases('so_act_jour',joursEdition,d.run_weekdays||[0,1,2,3,4,5,6])
      +cases('so_act_heure',Array.from({length:24},(_,i)=>i+' h'),d.run_hours||Array.from({length:24},(_,i)=>i))+'</details>'
      +'<p class="hint">Le résumé sera préparé après la mise en ligne de l’édition et selon sa disponibilité.</p><p class="hint" id="so_local">Vos choix peuvent être conservés sur cet appareil avant activation.</p>'
      +'<div class="source-preview">Activation dans le catalogue commun et le groupe WhatsApp. Les vidéos déjà résumées ne sont pas envoyées à nouveau.</div>'
      +'<div class="row"><button class="btn" id="so_act_creer"'+(occupe?' disabled':'')+'>'+(navigator.onLine===false?'Conserver mon brouillon':p.a_verifier?'Vérifier mon lien':'Activer ce suivi')+'</button><button class="btn sec" id="so_garder_local">Garder pour plus tard</button><button class="btn sec" id="so_annuler">Annuler</button></div></div>';
  }
  async function creerSuivi(){
    if(occupe)return;
    const p=(etat().preparations||[]).find(p=>p.id===activation);if(!p||!p.youtube)return;
    retenirBrouillon();
    if(navigator.onLine===false){message=sauvegardeLocale?'Brouillon conservé sur cet appareil. Reprenez cet ajout avec une connexion pour le vérifier et l’activer.':'Les choix restent ouverts, mais ne peuvent pas être conservés après fermeture sur cet appareil.';adminRender();return}
    if(p.a_verifier){if(!servicePret()){message='Vos choix sont conservés. La vérification du lien est momentanément indisponible.';adminRender();return}await demander({lien:p.lien,nom:p.nom||'',pays:p.pays},actDraft);return}
    const y=p.youtube,choix=$('so_act_mode').value,heures=[...document.querySelectorAll('[name="so_act_heure"]:checked')].map(c=>Number(c.value)),jours=[...document.querySelectorAll('[name="so_act_jour"]:checked')].map(c=>Number(c.value));
    const filtre=$('so_act_filtre').value.trim(),label=$('so_act_nom').value.trim()||nomAuto(y,choix,filtre),duree=Number($('so_act_duree').value)*60;
    const editions=[...document.querySelectorAll('[name="so_act_edition"]:checked')].map(c=>Number(c.value)),pays=$('so_act_pays').value||null,statutPays=pays?($('so_act_pays_confirme').checked?'confirme':'propose'):'non_renseigne';
    actDraft={label,choix,langue:$('so_act_langue').value,filtre_titre:filtre,max_total_seconds:duree,run_hours:heures,run_weekdays:jours,edition_jours:editions,pays,pays_statut:statutPays,inclure:$('so_initial').checked};
    const filtreUtile=filtre.toLowerCase().split(/\s+/).some(m=>m&&!['de','du','le','la','les','des'].includes(m));
    if(!label||label.length>140||filtre.length>140||!heures.length||!jours.length||(choix!=='video'&&!editions.length)||!Number.isInteger(duree)||duree<60||duree>10800||(choix==='emission'&&!filtreUtile)){
      message='Vérifiez le nom, le filtre d’émission, les jours et heures, et la durée (1 à 180 minutes).';adminRender();return;
    }
    const option=y.choix.find(c=>c.mode===choix),s={id:'youtube_'+p.id,demande_id:p.id,label,mecanisme:'youtube',diffusion:'commune',actif:true,pays,pays_statut:statutPays,langue:actDraft.langue,channel:'whatsapp',media_nom:y.nom_chaine,chaine_id:y.chaine_id,
      mode:choix==='emission'?'chaine':choix,filtre_titre:choix==='video'?'':filtre,run_hours:heures,run_weekdays:jours.length===7?null:jours,
      debut_suivi:new Date().toISOString(),max_age_days:2,max_total_seconds:duree,chunk_seconds:900,max_par_passage:1};
    s.edition_jours=choix==='video'||editions.length===7?null:editions;
    if(choix!=='video'&&$('so_initial').checked&&editionInitiale(y,choix,filtre,editions))s.inclure_video_id=y.video_id;
    if(s.mode==='video')s.video_id=y.video_id;else s.playlist_id=choix==='emission'?y.publications_id:option&&option.playlist_id;
    if((s.mode==='video'&&!s.video_id)||(s.mode!=='video'&&!s.playlist_id)){message='Cette possibilité de suivi n’est pas disponible. Actualisez la préparation.';adminRender();return}
    if(!confirm('Activer « '+s.label+' » dans le catalogue commun et sur le groupe WhatsApp ?'))return;
    occupe=true;message='Activation du suivi…';adminRender();
    try{const c=connexion();for(let essai=0;essai<2;essai++){
      const j=await lire(c,'data/sources.json'),d=decoder(j);if(!Array.isArray(d.sources))throw new Error('Configuration des sources illisible.');
      const empreinte=x=>JSON.stringify([x.mode,x.video_id||x.playlist_id,(x.filtre_titre||'').toLowerCase().trim()]);
      if(d.sources.some(x=>x.id===s.id||(x.mecanisme==='youtube'&&empreinte(x)===empreinte(s))))throw new Error('Ce suivi existe déjà. Actualisez les sources pour modifier ses réglages.');
      d.sources.push(s);
      const r=await fetch(c.base+'data/sources.json',{method:'PUT',headers:c.headers,body:JSON.stringify({message:'Sources : activer un suivi YouTube',content:encoder(d),sha:j.sha})});
      if(r.ok){effacerLocal();A.state.sources.configuration=d.sources;if(provisoire){A.state.sources.preparations=(etat().preparations||[]).filter(p=>p.id!==provisoire);provisoire=''}activation='';actDraft=null;message='Suivi activé. Les nouvelles éditions seront recherchées aux jours et heures choisis.';break}
      if(r.status!==409||essai===1)throw new Error('Activation refusée ('+r.status+'). Actualisez et réessayez.');
    }}catch(e){message=e.message}finally{occupe=false;adminRender()}
  }
  function bind(){
    const reprendre=$('so_reprendre');if(reprendre)reprendre.onclick=()=>{const d=brouillonLocal();if(d?.web){brouillon=d;ajout=true;adminRender();retenirBrouillon()}else if(d)sansApercu(d,d.selection)};
    const effacer=$('so_effacer_local');if(effacer)effacer.onclick=()=>{if(confirm('Supprimer le brouillon conservé sur cet appareil ?')){effacerLocal();message='Brouillon supprimé.';adminRender()}};
    const garder=$('so_garder_local');if(garder)garder.onclick=()=>{retenirBrouillon();if(!sauvegardeLocale)return;suspendre();message='Brouillon conservé. Vous pourrez reprendre cet ajout plus tard.';adminRender()};
    $('so_ajouter').onclick=()=>{if(occupe)return;if(provisoire){A.state.sources.preparations=(etat().preparations||[]).filter(p=>p.id!==provisoire);provisoire=''}ajout=true;edition='';activation='';actDraft=null;brouillon=null;message='';adminRender();const f=$('so_lien');if(f)f.focus()};$('so_actualiser').onclick=actualiser;
    const annuler=$('so_annuler');if(annuler)annuler.onclick=abandonnerBrouillon;
    document.querySelectorAll('[data-so-abandonner]').forEach(b=>b.onclick=()=>annulerPreparation(b.dataset.soAbandonner));
    document.querySelectorAll('[data-so-edit]').forEach(b=>{b.disabled=occupe;b.onclick=()=>{edition=b.dataset.soEdit;ajout=false;activation='';actDraft=null;brouillon=null;message='';adminRender();$('so_nom').focus()}});
    document.querySelectorAll('[data-so-activer]').forEach(b=>{b.disabled=occupe;b.onclick=()=>{activation=b.dataset.soActiver;actDraft=null;edition='';ajout=false;brouillon=null;message='';adminRender();$('so_act_mode').focus()}});
    const creer=$('so_act_creer');if(creer)creer.onclick=creerSuivi;
    if($('so_act_exemples')){
      const p=(etat().preparations||[]).find(p=>p.id===activation);$('so_act_nom').dataset.auto=(!actDraft?.label&&!p.nom)?'1':'0';$('so_act_nom').oninput=()=>{$('so_act_nom').dataset.auto='0';retenirBrouillon()};
      document.querySelectorAll('#so_act_mode,#so_act_filtre,[name="so_act_edition"]').forEach(e=>{e.oninput=()=>afficherExemples();e.onchange=()=>afficherExemples()});afficherExemples();
    }
    for(const [paysId,checkId] of [['so_pays','so_pays_confirme'],['so_act_pays','so_act_pays_confirme']]){const p=$(paysId),c=$(checkId);if(p&&c){c.disabled=!p.value;p.onchange=()=>{c.checked=false;c.disabled=!p.value}}}
    document.querySelectorAll('[data-so-pause]').forEach(b=>b.onclick=()=>{const s=parId(b.dataset.soPause);if(s.actif&&!confirm('Mettre « '+s.label+' » en pause ? Ses résumés restent sur le site.'))return;const actif=!s.actif;sauver(s.id,x=>x.actif=actif,actif?'reprendre le suivi':'mettre en pause')});
    const enreg=$('so_enregistrer');if(enreg)enreg.onclick=()=>{try{const d=lireFormulaire();sauver(edition,x=>Object.assign(x,d),'modifier les réglages')}catch(e){message=e.message;const b=document.createElement('div');b.className='alert';b.role='alert';b.textContent=message;enreg.parentElement.before(b)}};
    const prep=$('so_preparer');if(prep)prep.onclick=()=>demander();
    const type=$('so_type');if(type)type.onchange=()=>{const w=brouillon?.web;brouillon={lien:$('so_lien').value,nom:$('so_nouveau_nom').value,pays:$('so_nouveau_pays').value,web:type.value==='youtube'?null:{format:type.value,langue:w?.langue||'fr',jours:w?.jours||[0,1,2,3,4,5,6],heures:w?.heures||Array.from({length:24},(_,i)=>i)}};adminRender();retenirBrouillon()};
    const sans=$('so_sans_apercu');if(sans)sans.onclick=()=>{retenirBrouillon();sansApercu(brouillon,null)};
    document.querySelectorAll('[data-so-cases]').forEach(b=>b.onclick=()=>{const [nom,action]=b.dataset.soCases.split('|');document.querySelectorAll('[name="'+nom+'"]').forEach(c=>{c.checked=action==='tout'});if($('so_act_exemples'))afficherExemples();if($('so_apercu'))apercu();retenirBrouillon()});
    if(ajout||activation)document.querySelectorAll('#abody input,#abody select').forEach(e=>{e.addEventListener('input',retenirBrouillon);e.addEventListener('change',retenirBrouillon)});
    if(consultation&&ajout)for(const id of ['so_lien','so_nouveau_nom','so_nouveau_pays']){const e=$(id);if(e)e.disabled=true}
    if($('so_apercu')){document.querySelectorAll('[name="so_heure"],[name="so_jour"],#so_actif').forEach(e=>e.onchange=apercu);apercu()}
  }
  function auditPays(){const L=liste().flatMap(s=>(s.pays_historique||[]).map(h=>({...h,nom:s.label}))).sort((a,b)=>String(b.date).localeCompare(String(a.date)));if(!L.length)return '';return '<details class="appr"><summary>Pays des médias : corrections et confirmations ('+L.length+')</summary><p class="hint">Métadonnées actualisées sur les anciennes fiches, textes inchangés.</p>'+L.slice(0,30).map(h=>'<div class="chg"><b>'+esc(h.nom)+'</b> · '+dt(h.date)+'<br>'+esc(h.avant.pays||'Non renseigné')+' → '+esc(h.apres.pays||'Non renseigné')+' · '+esc(h.apres.statut||'')+'</div>').join('')+'</details>'}
  function suspendre(){retenirBrouillon();if(consultation){consultation.abort();consultation=null;occupe=false}if(provisoire&&A?.state?.sources)A.state.sources.preparations=(etat().preparations||[]).filter(p=>p.id!==provisoire);provisoire='';activation='';ajout=false;edition='';actDraft=null;brouillon=null}
  addEventListener('pagehide',()=>{if(typeof A!=='undefined'&&A)retenirBrouillon()});
  for(const nom of ['online','offline'])addEventListener(nom,()=>{if(typeof A!=='undefined'&&A&&atab==='o'){retenirBrouillon();if(consultation&&navigator.onLine===false){consultation.abort('reseau');consultation=null;occupe=false}message=navigator.onLine===false?'Hors connexion : vous pouvez continuer à préparer vos choix.':'Connexion retrouvée. Vos choix attendent votre confirmation.';adminRender()}});
  return {render,bind,auditPays,suspendre};
})();

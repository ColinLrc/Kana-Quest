(()=>{'use strict';
const $=id=>document.getElementById(id);
const base='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん';
const accented='がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ';
const mapping={あ:'a',い:'i',う:'u',え:'e',お:'o',か:'ka',き:'ki',く:'ku',け:'ke',こ:'ko',さ:'sa',し:'shi',す:'su',せ:'se',そ:'so',た:'ta',ち:'chi',つ:'tsu',て:'te',と:'to',な:'na',に:'ni',ぬ:'nu',ね:'ne',の:'no',は:'ha',ひ:'hi',ふ:'fu',へ:'he',ほ:'ho',ま:'ma',み:'mi',む:'mu',め:'me',も:'mo',や:'ya',ゆ:'yu',よ:'yo',ら:'ra',り:'ri',る:'ru',れ:'re',ろ:'ro',わ:'wa',を:'wo',ん:'n',が:'ga',ぎ:'gi',ぐ:'gu',げ:'ge',ご:'go',ざ:'za',じ:'ji',ず:'zu',ぜ:'ze',ぞ:'zo',だ:'da',ぢ:'ji',づ:'zu',で:'de',ど:'do',ば:'ba',び:'bi',ぶ:'bu',べ:'be',ぼ:'bo',ぱ:'pa',ぴ:'pi',ぷ:'pu',ぺ:'pe',ぽ:'po'};
const variants={し:['shi','si'],ち:['chi','ti'],つ:['tsu','tu'],ふ:['fu','hu'],じ:['ji','zi'],ぢ:['ji','di'],づ:['zu','du'],を:['wo','o']};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const toKatakana=s=>[...s].map(c=>{const n=c.codePointAt(0);return n>=0x3041&&n<=0x3096?String.fromCodePoint(n+0x60):c}).join('');
const toHiragana=s=>[...s].map(c=>{const n=c.codePointAt(0);return n>=0x30a1&&n<=0x30f6?String.fromCodePoint(n-0x60):c}).join('');
const isReading=()=>mode==='kanaToLatin'||mode==='kataToLatin';
const isKatakana=()=>mode==='kataToLatin'||mode==='latinToKata';
const questionKana=()=>isKatakana()?toKatakana(current.hiragana):current.hiragana;
let mode='kanaToLatin',deck=[],idx=0,correct=0,answered=false,chosen=[],tileList=[],current=null;
let speed=false,survival=false,timerId=null,deadline=0,seconds=10;
const survivalTime=()=>Math.max(2.5,10-Math.floor(correct/5)*0.75);
const stopTimer=()=>{if(timerId!==null){clearInterval(timerId);timerId=null}};
function startTimer(){stopTimer();seconds=survival?survivalTime():Number($('speedSeconds').value);deadline=performance.now()+seconds*1000;const tick=()=>{const left=Math.max(0,(deadline-performance.now())/1000);$('timerText').textContent=left.toFixed(1).replace('.',',')+' s';$('timerFill').style.width=(left/seconds*100)+'%';if(left<=0){stopTimer();if(!answered)check(true)}};tick();timerId=setInterval(tick,50)}

function roman(s){return [...s].map(c=>c===' '?' ':mapping[c]||c).join('')}
function japaneseReading(s){return s.split(' ').map(word=>[...word].map(c=>mapping[c]||c).join('')).join(' ')}
// Lecture fidèle à l'écriture japonaise : chacun des romaji correspond à un kana.
function splitReading(s){return s.trim().split(/\s+/).map(word=>[...word].map(c=>mapping[c]||c).join(' · ')).join('   /   ')}
function getLongHints(s){
  const found=[];
  for(const word of s.trim().split(/\s+/)){
    const kana=[...word];
    for(let i=0;i<kana.length-1;i++){
      const rom=mapping[kana[i]];
      if(!rom)continue;
      const vowel=rom.slice(-1), next=kana[i+1];
      const pairs={a:['あ'],i:['い'],u:['う'],e:['え'],o:['う','お']};
      if((pairs[vowel]||[]).includes(next)){
        const sign={a:'ā',i:'ī',u:'ū',e:'ē',o:'ō'}[vowel];
        const exact=rom+(mapping[next]||'');
        const label=`${sign} = ${exact}`;
        if(!found.includes(label))found.push(label);
        i++;
      }
    }
  }
  return found;
}
function updatePhonetic(){
  const write=!isReading();
  $('phoneticSetting').hidden=!write;
  $('phoneticHelp').hidden=!write||!$('phoneticToggle').checked||!current||answered;
  if(!write||!current)return;
  $('phoneticText').textContent=japaneseReading(current.hiragana).replace(/(^|\s)\w/g,x=>x.toUpperCase());
  $('phoneticBreakdown').textContent=splitReading(current.hiragana);
  const hints=getLongHints(current.hiragana);
  $('longVowelHelp').textContent=hints.length?'Voyelle(s) longue(s) : '+hints.join('   ·   '):'Chaque groupe séparé par · correspond à un kana.';
}

function normLatin(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ō/g,'ou').replace(/ū/g,'uu').replace(/[^a-z]/g,'')}
function kanaNorm(s){return s.normalize('NFKC').replace(/[\s\u3000'’´`]/g,'').replace(/[\u3099\u309a]/g,'')}
function makeKanaGrid(){for(const [id,chars] of [['kanaGrid',isKatakana()?toKatakana(base):base],['accentGrid',isKatakana()?toKatakana(accented):accented]]){const box=$(id);box.innerHTML='';shuffle([...chars]).forEach(c=>{const b=document.createElement('button');b.className='kana';b.type='button';b.textContent=c;b.onclick=()=>{if(!isReading()&&!answered){$('typedAnswer').value+=c;$('typedAnswer').focus()}};box.append(b)})}}
function start(){stopTimer();survival=$('survivalMode').checked;speed=survival||$('speedMode').checked;$('speedMode').checked=speed;$('speedMode').disabled=survival;$('speedSecondsGroup').hidden=!speed||survival;$('timerPanel').hidden=!speed;const n=Number($('limit').value);const anime=$('animeFilter').value;const saga=$('sagaFilter').value;let pool=(window.CHARACTERS||[]).filter(c=>(!anime||c.anime===anime)&&(anime!=='Inazuma Eleven'||!saga||c.saga===saga));deck=speed?Array.from({length:(survival?9999:Math.min(n,9999))},()=>({hiragana:shuffle([...base,...accented])[0],latin:'Caractère japonais',anime:'Entraînement rapide',role:'Lecture et écriture des kana'})):shuffle(pool).slice(0,n);idx=0;correct=0;$('poolCount').textContent=pool.length+' personnage'+(pool.length>1?'s disponibles':' disponible');show()}
function initFilters(){const all=window.CHARACTERS||[];const anime=$('animeFilter');const names=[...new Set(all.map(c=>c.anime))].sort((a,b)=>a.localeCompare(b,'fr'));for(const name of names){const opt=document.createElement('option');opt.value=name;opt.textContent=name+' ('+all.filter(c=>c.anime===name).length+')';anime.append(opt)}const saga=$('sagaFilter');for(const name of ['Original','GO','GO Chrono Stone','GO Galaxy','Ares','Orion']){const n=all.filter(c=>c.anime==='Inazuma Eleven'&&c.saga===name).length;const opt=document.createElement('option');opt.value=name;opt.textContent=name+' ('+n+')';saga.append(opt)}$('progress').textContent=all.length+' personnages';anime.onchange=()=>{$('sagaGroup').hidden=anime.value!=='Inazuma Eleven';saga.value='';start()};saga.onchange=start;}
function show(){
 if(!deck.length){$('prompt').textContent='Base de données introuvable';$('instruction').textContent='Vérifie la présence du fichier data.js.';return}
 stopTimer();answered=false;chosen=[];current=deck[idx];const reading=isReading(),script=isKatakana()?'katakana':'hiragana';
 $('feedback').hidden=true;$('check').hidden=false;$('next').hidden=true;$('keyboardArea').hidden=false;$('typedAnswer').value='';
 $('modeLabel').textContent=reading?'LECTURE '+script.toUpperCase():'ÉCRITURE '+script.toUpperCase();
 $('instruction').textContent=speed?(reading?'Écris vite le romaji de ce caractère avant la fin du chrono.':`Écris vite le caractère en ${script} correspondant au romaji affiché.`):reading?`Écris la lecture de chaque ${script} en romaji, séparée par un espace (ex. : ka ge ya ma).`:`Écris le nom en ${script} : l’aide phonétique indique les voyelles longues.`;
 $('answerLabel').textContent=reading?'Ta réponse en romaji (une syllabe par espace)':`Ta réponse en ${script}`;
 $('typedAnswer').placeholder=reading?'Ex. : ka ge ya ma  to bi o':isKatakana()?'Ex. : ナルト ウズマキ':'Ex. : なると うずまき';
 $('keyboardHelp').textContent=reading?'Sépare chaque symbole par un espace. Tu peux mettre deux espaces entre le prénom et le nom.':'Sur PC, utilise un clavier japonais ou clique sur les caractères du tableau.';
 $('prompt').textContent=reading?questionKana():(speed?mapping[current.hiragana]:current.latin);
 $('referenceTitle').textContent=`Tableau des ${script}`;
 $('referenceDescription').textContent=`Les 46 signes de base, mélangés à chaque question. Clique pour écrire en mode latin → ${script}.`;
 $('referenceNote').textContent=`゛ et ゜ permettent de former les sons accentués en ${script}.`;
 updatePhonetic();if(speed)$('phoneticHelp').hidden=true;$('animeLabel').textContent=survival?'🔥 Survie · '+seconds.toFixed(1)+' s':speed?'Défi chrono':'Anime mystère';$('questionNum').textContent=`${idx+1} / ${deck.length}`;$('correctCount').textContent=correct;$('accuracy').textContent=idx?`${Math.round(correct/idx*100)} %`:'—';$('bar').style.width=`${idx/deck.length*100}%`;$('reference').hidden=!$('hints').checked;makeKanaGrid();if(speed){startTimer();$('typedAnswer').focus()}
}
function getAnswer(){return $('typedAnswer').value}
function align(a,b){const n=a.length,m=b.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0));for(let i=0;i<=n;i++)dp[i][0]=i;for(let j=0;j<=m;j++)dp[0][j]=j;for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));let i=n,j=m,ops=[];while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1)){ops.push({expected:a[i-1],actual:b[j-1],ok:a[i-1]===b[j-1]});i--;j--}else if(j&&dp[i][j]===dp[i][j-1]+1){ops.push({expected:'∅',actual:b[j-1],ok:false});j--}else{ops.push({expected:a[i-1],actual:'∅',ok:false});i--}}return ops.reverse()}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function latinTokens(s){return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().split(/\s+/).filter(Boolean)}
function tokenValid(k,t){const canonical=mapping[k];return t===canonical||(variants[k]||[]).includes(t)||(canonical==='o'&&t==='wo'&&k==='を')}
function alignTokens(expected,got){const n=expected.length,m=got.length,dp=Array.from({length:n+1},()=>Array(m+1).fill(0));for(let i=0;i<=n;i++)dp[i][0]=i;for(let j=0;j<=m;j++)dp[0][j]=j;for(let i=1;i<=n;i++)for(let j=1;j<=m;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(tokenValid(expected[i-1],got[j-1])?0:1));let i=n,j=m,ops=[];while(i||j){if(i&&j&&dp[i][j]===dp[i-1][j-1]+(tokenValid(expected[i-1],got[j-1])?0:1)){ops.push({expected:expected[i-1],actual:got[j-1],ok:tokenValid(expected[i-1],got[j-1])});i--;j--}else if(j&&dp[i][j]===dp[i][j-1]+1){ops.push({expected:'∅',actual:got[j-1],ok:false});j--}else{ops.push({expected:expected[i-1],actual:'∅',ok:false});i--}}return ops.reverse()}
function check(timeout=false){
 if(answered)return;const raw=getAnswer();if(!raw.trim()&&!timeout)return;stopTimer();
 const reading=isReading(),expected=questionKana();
 const ops=reading?alignTokens([...current.hiragana].filter(c=>c!==' '),latinTokens(raw)):align([...kanaNorm(expected)],[...kanaNorm(raw)]);
 const ok=!timeout&&ops.every(o=>o.ok);answered=true;updatePhonetic();if(ok)correct++;
 $('correctCount').textContent=correct;$('accuracy').textContent=`${Math.round(correct/(idx+1)*100)} %`;$('bar').style.width=`${(idx+1)/deck.length*100}%`;$('check').hidden=true;$('next').hidden=false;$('next').textContent=survival?(ok?'Continuer la survie →':'Voir mon score →'):(idx===deck.length-1?'Voir mon résultat →':'Personnage suivant →');if(survival&&!ok){$('next').dataset.ended='1'}else{$('next').dataset.ended='0'}$('animeLabel').textContent=current.anime;
 const rows=ops.map(o=>{const target=reading&&o.expected!=='∅'?mapping[o.expected]:o.expected;const note=reading&&o.expected!=='∅'?`${isKatakana()?toKatakana(o.expected):o.expected} = ${target}`:target;return `<div class="segment ${o.ok?'good':'bad'}"><span>${escapeHTML(o.actual)}</span><small>${o.ok?'✓':`→ ${escapeHTML(note)}`}</small></div>`}).join('');
 const display=reading?[...current.hiragana].map(c=>c===' '?'  /  ':mapping[c]).join(' '):expected;
 $('feedback').innerHTML=`<h3 class="${ok?'good':'bad'}">${ok?'✓ Bravo, bonne réponse !':timeout?'⏱ Temps écoulé !':'✦ Presque ! Voici la correction'}</h3><p><strong>Réponse attendue :</strong> ${escapeHTML(display)}<br><strong>Nom :</strong> ${escapeHTML(current.latin)}<br><strong>Ta réponse :</strong> ${escapeHTML(raw)}</p><div class="segments">${rows}</div><p><strong>Anime :</strong> ${escapeHTML(current.anime)}<br><strong>Rôle :</strong> ${escapeHTML(current.role)}</p>${ok?'':'<p class="helper">Chaque case correspond à un symbole. En rouge : erreur, oubli ou syllabe en trop. ∅ signifie une syllabe manquante.</p>'}`;$('feedback').hidden=false;if(survival&&!ok){$('feedback').innerHTML+='<p><strong>Fin de la survie !</strong> Série : '+correct+' bonnes réponses. Record sur cet appareil : '+Math.max(correct,Number(localStorage.getItem('kq-survival-record')||0))+'.</p>';localStorage.setItem('kq-survival-record',String(Math.max(correct,Number(localStorage.getItem('kq-survival-record')||0))))}$('next').focus();
}
function finish(){stopTimer();$('timerPanel').hidden=true;$('phoneticHelp').hidden=true;const pct=Math.round(correct/deck.length*100);$('prompt').textContent=survival?'Survie terminée 🏆':'Session terminée 🎉';$('instruction').textContent=survival?`Tu as réussi ${correct} caractères à la suite ! Record : ${Math.max(correct,Number(localStorage.getItem('kq-survival-record')||0))}. Recommence pour battre ton score.`:`Tu as réussi ${correct} réponse(s) sur ${deck.length}, soit ${pct} %. Clique sur Recommencer pour une nouvelle série.`;$('keyboardArea').hidden=true;$('check').hidden=true;$('next').hidden=true;$('feedback').hidden=true;$('questionNum').textContent=`${deck.length} / ${deck.length}`;$('bar').style.width='100%';$('animeLabel').textContent='Bravo !'}
$('check').onclick=()=>check();$('speedMode').onchange=start;$('survivalMode').onchange=start;$('speedSeconds').onchange=start;$('next').onclick=()=>{if(survival&&$('next').dataset.ended==='1'){finish();return}idx++;idx<deck.length?show():finish()};$('restart').onclick=start;$('limit').onchange=start;$('hints').onchange=()=>{$('reference').hidden=!$('hints').checked};$('phoneticToggle').onchange=updatePhonetic;$('shuffleKana').onclick=makeKanaGrid;$('typedAnswer').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();check()}};document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));start()});initFilters();start();
})();

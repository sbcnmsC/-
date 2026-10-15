// 字体异步加载：不阻塞首屏；国内访问 Google Fonts 较慢时自动回退到系统字体
addEventListener("load",()=>{const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap";document.head.append(l)});
/* Lexicon Brawl · app.js（依赖 words.js 提供的 W）
 * 目录：学习模式（艾宾浩斯 / 发音 / 音效）→ 计划与错题集 → 页面切换 → 对战（血条 / 道具 / 组队）
 */
const INT=[5,30,720,1440,2880,5760,10080,21600],K="ielts-reward-v2",DEF=10;
const $=i=>document.getElementById(i),dk=t=>new Date(t).toLocaleDateString("sv"),today=dk(Date.now());
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let S=null;try{S=JSON.parse(localStorage.getItem(K))}catch(e){}
S=S||{xp:0,combo:0,best:0,streak:0,last:"",day:"",done:0,w:{},b:[]};
if(S.day!==today){S.day=today;S.done=0}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch(e){}};
const say=t=>{try{const s=speechSynthesis;s.cancel();setTimeout(()=>{const u=new SpeechSynthesisUtterance(t),vs=s.getVoices(),v=vs.find(v=>/^en[-_]US/i.test(v.lang))||vs.find(v=>/^en/i.test(v.lang));if(v)u.voice=v;u.lang="en-US";u.rate=.9;s.speak(u)},60)}catch(e){}};
let AC=null;
function tone(f,t,d,ty,v,s){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();const o=AC.createOscillator(),g=AC.createGain(),n=AC.currentTime+(s||0);o.type=ty||"square";o.frequency.setValueAtTime(f,n);if(t)o.frequency.linearRampToValueAtTime(t,n+d);g.gain.setValueAtTime(v||.08,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(AC.destination);o.start(n);o.stop(n+d+.02)}catch(e){}}
const sfx=k=>{if(S.sfx===0)return;if(k==="ok"){tone(660,0,.1);tone(880,0,.18,"square",.08,.09)}else if(k==="no"){tone(220,110,.3,"sawtooth",.09)}else if(k==="item"){tone(990,1320,.14,"triangle",.1)}else if(k==="ko"){tone(330,80,.6,"sawtooth",.1)}};
const sm=()=>S.snd||"w",vib=n=>{try{navigator.vibrate&&navigator.vibrate(n)}catch(e){}};
let unl=0;addEventListener("pointerdown",()=>{if(unl)return;unl=1;try{const u=new SpeechSynthesisUtterance(" ");u.volume=0;speechSynthesis.speak(u)}catch(e){}});
function snd(){document.querySelectorAll("#snd button").forEach(b=>b.classList.toggle("on",b.dataset.v===sm()));document.querySelectorAll("#sfs button").forEach(b=>b.classList.toggle("on",+b.dataset.v===(S.sfx===0?0:1)))}
$("snd").onclick=e=>{const v=e.target.dataset.v;if(!v)return;S.snd=v;save();snd();if(v==="s")say(W[cur][3]||W[cur][0]);else if(v!=="o")say(W[cur][0])};
function qnUI(){document.querySelectorAll("#qn button").forEach(b=>b.classList.toggle("on",+b.dataset.v===gN()));$("qc").value=[5,10,20,50].includes(gN())?"":gN();document.querySelectorAll("#lm button").forEach(b=>b.classList.toggle("on",+b.dataset.v===(S.lim|0)));document.querySelectorAll("#od button").forEach(b=>b.classList.toggle("on",+b.dataset.v===(S.rnd?1:0)))}
function setLim(v){S.lim=+v;save();qnUI();if(mode===1){Q=build();next()}}
function setOrd(v){S.rnd=+v;save();qnUI();if(mode===1){Q=build();next()}}
$("lm").onclick=e=>{if(e.target.dataset.v!==undefined)setLim(e.target.dataset.v)};$("od").onclick=e=>{if(e.target.dataset.v!==undefined)setOrd(e.target.dataset.v)};
function setN(v){v=+v;if(!(Number.isInteger(v)&&v>=1&&v<=200)){toast("请输入 1–200 之间的整数");qnUI();return}S.n=v;save();qnUI();head();if(mode===1){Q=build();next()}}
$("qn").onclick=e=>{if(e.target.dataset.v)setN(e.target.dataset.v)};$("qc").onchange=e=>{if(e.target.value!=="")setN(e.target.value)};
$("sfs").onclick=e=>{const v=e.target.dataset.v;if(v===undefined)return;S.sfx=+v;save();snd();sfx("ok")};
const BD=[["🌱 初出茅庐",s=>s.xp>0],["⚡ 连击达人（5 连击）",s=>s.best>=5],["🔥 坚持三天",s=>s.streak>=3],["🏆 十词通关（10 词到 4 级）",s=>Object.values(s.w).filter(x=>x.b>=4).length>=10]];
const lvl=x=>Math.floor(Math.sqrt(x/50))+1;
let mode=1,Q=[],cur=0;
const due=n=>W.map((_,i)=>i).filter(i=>S.w[i]&&S.w[i].due<=n);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const clash=(i,j)=>{const f=x=>W[x][2].split("；");return f(i).some(s=>f(j).includes(s))};
const gN=()=>Math.min(200,Math.max(1,S.n|0||DEF)),lim=()=>Math.min(W.length,S.lim|0||W.length);let EX=new Set();
// 每轮题数：先出到期复习和新词；不够时用已学词加练（加练答对不改变复习计划）
// 新词按词表顺序（可切换随机），范围受“词库范围”限制
function build(){const n=Date.now(),g=gN(),r=due(n).sort((a,b)=>S.w[a].due-S.w[b].due),pool=[];for(let i=0,L=lim();i<L;i++)if(!S.w[i])pool.push(i);const nw=S.rnd?shuf(pool):pool,q=[...r,...nw.slice(0,g)].slice(0,g),qs=new Set(q),fill=shuf(Object.keys(S.w).map(Number).filter(i=>!qs.has(i))).slice(0,g-q.length);EX=new Set(fill);return[...q,...fill]}
function head(){const L=lvl(S.xp),a=(L-1)**2*50,b=L*L*50;
$("lvb").textContent="Lv."+L+" · "+S.xp+" XP";$("lv").textContent=L;$("st").textContent=S.streak;$("dn").textContent=Math.min(S.done,gN())+"/"+gN();$("du").textContent=due(Date.now()).length;
$("xpb").style.width=(S.xp-a)/(b-a)*100+"%";$("xpt").textContent="距下一级还差 "+(b-S.xp)+" XP";
$("bg").innerHTML=BD.map((b,i)=>`<span class="bd ${S.b.includes(i)?"on":"off"}">${b[0]}</span>`).join("")}
document.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.ctrlKey||e.metaKey||!$("card").offsetParent)return;const b=$("op").children[+e.key-1];if(b&&!b.disabled)b.click()});
function show(c,o,pick){$("fb").textContent="";$("ex").innerHTML="";$("nx").hidden=true;$("wd").textContent=W[c][0];$("ps").textContent=W[c][1];$("sp").onclick=()=>say(W[c][0]);$("op").innerHTML="";
o.forEach((i,k)=>{const b=document.createElement("button"),m=document.createElement("b");m.textContent=k+1;b.append(m,W[i][2]);b.dataset.i=i;b.onclick=()=>pick(i,b);$("op").append(b)});if(mode===1&&"wb".includes(sm()))say(W[c][0])}
function reveal(c){const t=W[c][3];$("ex").innerHTML=`<div class="exb"><span style="flex:1">${esc(t||W[c][0]+" · "+W[c][1]+" "+W[c][2])}</span><button class="ic" id="se">🔊</button></div>`;$("se").onclick=()=>say(t||W[c][0]);if(mode===1&&"sb".includes(sm())){if(t)say(t);else if(sm()==="s")say(W[c][0])}}
function next(){if(!Q.length){$("wd").textContent="🎉 本轮完成";$("ps").textContent="按遗忘曲线，到点后再来复习效果最好。";$("op").innerHTML="";$("fb").textContent="";$("ex").innerHTML="";$("nx").textContent="再来一轮";$("nx").hidden=false;$("nx").onclick=()=>{const q=build();if(q.length){Q=q;next()}else $("ps").textContent="暂时没有到期或新的单词，稍后再来复习。"};return}
cur=Q[0];$("nx").textContent="继续";$("nx").onclick=next;const o=[cur];while(o.length<4){const r=Math.random()*W.length|0;if(!o.includes(r)&&!clash(r,cur))o.push(r)}
show(cur,shuf(o),ans)}
function ans(i,bt){const bs=[...$("op").children];bs.forEach(b=>b.disabled=true);
const t=Date.now(),x=S.w[cur]||{b:0,due:0,m:0,r:0},ok=i===cur;vib(ok?20:[50,40,50]);sfx(ok?"ok":"no");let m="";
if(ok){S.combo++;S.best=Math.max(S.best,S.combo);const g=10+Math.min(S.combo-1,5)*2,o=lvl(S.xp);S.xp+=g;
if(!EX.has(cur)){x.due=t+INT[Math.min(x.b,7)]*6e4;x.b=Math.min(x.b+1,8)}if(x.m)x.r++;S.done++;
const d0=dk(t);if(S.day!==d0){S.day=d0;S.done=1}if(S.last!==d0){S.streak=S.last===dk(t-864e5)?S.streak+1:1;S.last=d0}
bt.classList.add("ok");Q.shift();m="✅ +"+g+" XP"+(S.combo>1?" · "+S.combo+" 连击":"")+(lvl(S.xp)>o?" 🎉 升级！":"")+" · 下次复习 "+fmt(x.due)}
else{S.combo=0;x.b=0;x.m=(x.m||0)+1;x.r=0;x.due=t+INT[0]*6e4;bt.classList.add("no");bs.find(b=>+b.dataset.i===cur).classList.add("ok");Q.push(Q.shift());m="❌ 已加入错题集 · 5 分钟后再复习"}
S.w[cur]=x;BD.forEach((b,k)=>{if(!S.b.includes(k)&&b[1](S)){S.b.push(k);m+=" 🏅 "+b[0]}});
$("fb").textContent=m;reveal(+bs.find(b=>b.classList.contains("ok")).dataset.i);$("nx").hidden=false;save();head()}
const fmt=t=>{const m=Math.max(1,Math.round((t-Date.now())/6e4));return m<60?m+" 分钟后":m<1440?Math.round(m/60)+" 小时后":Math.round(m/1440)+" 天后"};
$("nx").onclick=next;
/* ---------- plan ---------- */
const mist=()=>W.map((_,i)=>i).filter(i=>S.w[i]&&S.w[i].m>0&&S.w[i].r<3);
function plan(){const n=Date.now(),cnt=Array(9).fill(0);let nx=1e18;
W.forEach((_,i)=>{const x=S.w[i];if(x){cnt[x.b]++;if(x.due>n)nx=Math.min(nx,x.due)}});
const mx=Math.max(1,...cnt),L=["重学","5分","30分","12时","1天","2天","4天","7天","15天"],d=due(n).length;
$("stg").innerHTML=cnt.map((c,i)=>`<div class="sg"><b>${c}</b><i style="height:${c/mx*70+4}px"></i><span>${L[i]}</span></div>`).join("");
$("nxt").textContent=d?`现在有 ${d} 个单词到了复习时间`:nx<1e18?"下一个复习："+fmt(nx):"先去学习几个新词吧";
const M=mist();$("pm").hidden=!M.length;
$("ml").innerHTML=M.length?M.sort((a,b)=>S.w[b].m-S.w[a].m).slice(0,50).map(i=>`<div class="li"><div><b>${W[i][0]}</b><button class="ic" data-s="${i}">🔊</button><div class="mu">${W[i][1]} ${W[i][2]}</div><div class="mu ex">${esc(W[i][3]||"")}</div></div><span class="chip">错 ${S.w[i].m} 次</span></div>`).join("")+(M.length>50?`<div class="mu s">仅显示错得最多的 50 个，其余 ${M.length-50} 个可点“练习错题”来练习</div>`:""):'<div class="mu">还没有错题，继续保持 ✨ 同一个词答错后连续答对 3 次，就会移出错题集。</div>';
$("ml").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>say(W[b.dataset.s][0]));head()}
$("pm").onclick=()=>{Q=shuf(mist()).slice(0,gN());EX=new Set();tab(1)};
$("rs").onclick=()=>{const r=$("rs");if(r.dataset.s){try{localStorage.removeItem(K)}catch(e){}location.reload()}else{r.dataset.s=1;r.textContent="再点一次确认重置"}};
function tab(m){if((B.ph==="play"||B.ph==="cd")&&m!==3){toast("对战进行中，打完再切换");return}mode=m;[1,2,3].forEach(k=>{$("t"+k).classList.toggle("on",k===m);$("v"+k).hidden=k!==m});$("ttl").textContent=["学习","计划","赛车"][m-1];
if(m===1){$("card").classList.remove("fog","bl","fz");$("tmr").hidden=true;$("v1").append($("card"));$("card").hidden=false;if(!Q.length)Q=build();next()}
if(m===2)plan();
if(m===3){$("v3").append($("card"));$("card").hidden=B.ph!=="play"}}
[1,2,3].forEach(k=>$("t"+k).onclick=()=>tab(k));

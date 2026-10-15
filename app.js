// 字体异步加载：不阻塞首屏；国内访问 Google Fonts 较慢时自动回退到系统字体
addEventListener("load",()=>{const l=document.createElement("link");l.rel="stylesheet";l.href="https://fonts.googleapis.com/css2?family=DotGothic16&family=Press+Start+2P&display=swap";document.head.append(l)});
/* Lexicon Brawl · app.js（依赖 words.js 提供的 W）
 * 目录：学习模式（艾宾浩斯 / 发音 / 音效）→ 计划与错题集 → 页面切换 → 对战（血条 / 道具 / 组队）
 */
const INT=[5,30,720,1440,2880,5760,10080,21600],K="ielts-reward-v2",G=10,N=10;
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
$("snd").onclick=e=>{const v=e.target.dataset.v;if(!v)return;S.snd=v;save();snd();if(v==="s")say(W[cur][3]);else if(v!=="o")say(W[cur][0])};
$("sfs").onclick=e=>{const v=e.target.dataset.v;if(v===undefined)return;S.sfx=+v;save();snd();sfx("ok")};
const BD=[["🌱 初出茅庐",s=>s.xp>0],["⚡ 连击达人（5 连击）",s=>s.best>=5],["🔥 坚持三天",s=>s.streak>=3],["🏆 十词通关（10 词到 4 级）",s=>Object.values(s.w).filter(x=>x.b>=4).length>=10]];
const lvl=x=>Math.floor(Math.sqrt(x/50))+1;
let mode=1,Q=[],cur=0;
const due=n=>W.map((_,i)=>i).filter(i=>S.w[i]&&S.w[i].due<=n);
const shuf=a=>{for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const clash=(i,j)=>{const f=x=>W[x][2].split("；");return f(i).some(s=>f(j).includes(s))};
function build(){const n=Date.now(),r=due(n).sort((a,b)=>S.w[a].due-S.w[b].due),nw=shuf(W.map((_,i)=>i).filter(i=>!S.w[i]));return[...r,...nw].slice(0,G)}
function head(){const L=lvl(S.xp),a=(L-1)**2*50,b=L*L*50;
$("lvb").textContent="Lv."+L+" · "+S.xp+" XP";$("lv").textContent=L;$("st").textContent=S.streak;$("dn").textContent=Math.min(S.done,G)+"/"+G;$("du").textContent=due(Date.now()).length;
$("xpb").style.width=(S.xp-a)/(b-a)*100+"%";$("xpt").textContent="距下一级还差 "+(b-S.xp)+" XP";
$("bg").innerHTML=BD.map((b,i)=>`<span class="bd ${S.b.includes(i)?"on":"off"}">${b[0]}</span>`).join("")}
document.addEventListener("keydown",e=>{if(e.target.tagName==="INPUT"||e.ctrlKey||e.metaKey||!$("card").offsetParent)return;const b=$("op").children[+e.key-1];if(b&&!b.disabled)b.click()});
function show(c,o,pick){$("fb").textContent="";$("ex").innerHTML="";$("nx").hidden=true;$("wd").textContent=W[c][0];$("ps").textContent=W[c][1];$("sp").onclick=()=>say(W[c][0]);$("op").innerHTML="";
o.forEach((i,k)=>{const b=document.createElement("button"),m=document.createElement("b");m.textContent=k+1;b.append(m,W[i][2]);b.dataset.i=i;b.onclick=()=>pick(i,b);$("op").append(b)});if(mode===1&&"wb".includes(sm()))say(W[c][0])}
function reveal(c){$("ex").innerHTML=`<div class="exb"><span style="flex:1">${esc(W[c][3])}</span><button class="ic" id="se">🔊</button></div>`;$("se").onclick=()=>say(W[c][3]);if(mode===1&&"sb".includes(sm()))say(W[c][3])}
function next(){if(!Q.length){$("wd").textContent="🎉 本轮完成";$("ps").textContent="按遗忘曲线，到点后再来复习效果最好。";$("op").innerHTML="";$("fb").textContent="";$("ex").innerHTML="";$("nx").textContent="再来一轮";$("nx").hidden=false;$("nx").onclick=()=>{const q=build();if(q.length){Q=q;next()}else $("ps").textContent="暂时没有到期或新的单词，稍后再来复习。"};return}
cur=Q[0];$("nx").textContent="继续";$("nx").onclick=next;const o=[cur];while(o.length<4){const r=Math.random()*W.length|0;if(!o.includes(r)&&!clash(r,cur))o.push(r)}
show(cur,shuf(o),ans)}
function ans(i,bt){const bs=[...$("op").children];bs.forEach(b=>b.disabled=true);
const t=Date.now(),x=S.w[cur]||{b:0,due:0,m:0,r:0},ok=i===cur;vib(ok?20:[50,40,50]);sfx(ok?"ok":"no");let m="";
if(ok){S.combo++;S.best=Math.max(S.best,S.combo);const g=10+Math.min(S.combo-1,5)*2,o=lvl(S.xp);S.xp+=g;
x.due=t+INT[Math.min(x.b,7)]*6e4;x.b=Math.min(x.b+1,8);if(x.m)x.r++;S.done++;
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
$("ml").innerHTML=M.length?M.map(i=>`<div class="li"><div><b>${W[i][0]}</b><button class="ic" data-s="${i}">🔊</button><div class="mu">${W[i][1]} ${W[i][2]}</div><div class="mu ex">${esc(W[i][3])}</div></div><span class="chip">错 ${S.w[i].m} 次</span></div>`).join(""):'<div class="mu">还没有错题，继续保持 ✨ 同一个词答错后连续答对 3 次，就会移出错题集。</div>';
$("ml").querySelectorAll("[data-s]").forEach(b=>b.onclick=()=>say(W[b.dataset.s][0]));head()}
$("pm").onclick=()=>{Q=shuf(mist()).slice(0,G);tab(1)};
$("rs").onclick=()=>{const r=$("rs");if(r.dataset.s){try{localStorage.removeItem(K)}catch(e){}location.reload()}else{r.dataset.s=1;r.textContent="再点一次确认重置"}};
function tab(m){if((B.ph==="play"||B.ph==="cd")&&m!==3){toast("对战进行中，打完再切换");return}mode=m;[1,2,3].forEach(k=>{$("t"+k).classList.toggle("on",k===m);$("v"+k).hidden=k!==m});$("ttl").textContent=["学习","计划","对战"][m-1];
if(m===1){$("card").classList.remove("fog","bl","fz");$("tmr").hidden=true;$("v1").append($("card"));$("card").hidden=false;if(!Q.length)Q=build();next()}
if(m===2)plan();
if(m===3){$("v3").append($("card"));$("card").hidden=B.ph!=="play"}}
[1,2,3].forEach(k=>$("t"+k).onclick=()=>tab(k));

/* ---------- battle ---------- */
const px=(m,p,s=4)=>`<svg width="${m[0].length*s}" height="${m.length*s}" viewBox="0 0 ${m[0].length} ${m.length}" shape-rendering="crispEdges">${m.map((r,y)=>[...r].map((c,x)=>p[c]?`<rect x="${x}" y="${y}" width="1" height="1" fill="${p[c]}"/>`:"").join("")).join("")}</svg>`;
const PL={k:"#1a1c2c",w:"#f4f4f4",r:"#ef4d5a",o:"#ff9f1c",y:"#ffd23f",g:"#38b764",b:"#41a6f6",p:"#b388ff",c:"#94b0c2",d:"#566c86",a:"#ffcf9f"};
const HERO=["..TTTT..",".TTTTTT.",".kaaaak.",".kakaak.",".aaaaaa.","..TTTT..",".TTTTTT.",".kk..kk."];
const IT={
bomb:["炸弹","直接造成 14 点伤害",["....yo..","...ok...","..kkkk..",".kkkkkk.","kkdkkkk.","kkkkkkk.",".kkkkk..","........"]],
fog:["迷雾","对手视线模糊 7 秒",["........","..bbb...",".bwwwb..","bwwwwwb.","bwwwwwwb",".bbbbbb.","........","........"]],
blackout:["黑屏","对手选项消失 3 秒",["dddddddd","dkkkkkkd","dkwkkwkd","dkkkkkkd","dkwwwwkd","dkkkkkkd","dddddddd","........"]],
freeze:["冻结","对手 3.5 秒无法作答",["...b....","b..b..b.",".b.b.b..","..bbb...","bbbwbbb.","..bbb...",".b.b.b..","b..b..b."]],
mirror:["镜像","对手下 2 题单词倒着写",["..cccc..",".cwwwwc.",".cwwbwc.",".cwwwwc.",".cwwwwc.","..cccc..","...dd...","...dd..."]],
cipher:["乱码","对手下 2 题元音变星号",["..pppp..",".ppwwpp.","ppwppwpp","pppwwppp","ppwppwpp",".ppwwpp.","..pppp..","........"]],
limit:["限时","对手下 2 题只剩 4 秒",["..cccc..",".cwwwwc.","cwwwcwwc","cwwwccwc","cwwwwwwc",".cwwwwc.","..cccc..","........"]],
shield:["护盾","队伍 8 秒内免疫攻击与干扰",["bbbbbbbb","bwwbbwwb","bwwbbwwb","bbbbbbbb",".bbbbbb.","..bbbb..","...bb...","........"]],
heal:["治疗","队伍回复 20 点生命",[".rr..rr.","rrrrrrrr","rrwrrrrr","rrrrrrrr",".rrrrrr.","..rrrr..","...rr...","........"]],
double:["双倍","接下来 3 次攻击伤害翻倍",["....yy..","...yy...","..yy....",".yyyyyy.","....yy..","...yy...","..yy....",".y......"]],
cleanse:["净化","清除自己身上的干扰",["...g....","...g....","gg.w.gg.","..wwwg..","gg.w.gg.","...g....","...g....","........"]]};
const OFF=["bomb","fog","blackout","freeze","mirror","cipher","limit"],CL=["#ef4d5a","#41a6f6","#38b764","#ffd23f","#b388ff","#ff9f1c","#94b0c2","#f4f4f4"];
const B={cum:{},last:{},hitAt:{},lock:"",nc:0,nw:0,mc:0,ph:"off",rd:0,rc:"",mode:1,seed:"",k:0,q:null,t0:0,dur:1e4,ans:0,cb:0,dbl:0,inv:[],D:{},H:0,Sf:0,sh:0,ev:[],seq:0,seen:{},fx:{},T:{},end:0,ko:0,tk:"",paid:0};let room=null;
const pres=p=>{try{room&&room.presence(p)}catch(e){}};
const peers=()=>room?room.peers().filter(p=>p.kind==="viewer"&&p.presence):[];
const me=()=>peers().find(p=>p.isMe);
const tkey=(p,m)=>m==2?(p.presence.tm==="B"?"B":"R"):p.peer;
const tname=(t,m)=>m==2?(t.k==="R"?"🟥 红队":"🟦 蓝队"):(t.m[0].isMe?"你":esc(t.m[0].presence.n||"玩家"));
function calc(P,m){const T={},n=Date.now(),C=B.cum;
P.forEach(p=>{const k=tkey(p,m),d=p.presence,c=C[p.peer]=C[p.peer]||{D:{},H:0,S:0,sv:0,at:0};c.tk=k;
for(const x in d.D||{})c.D[x]=Math.max(c.D[x]||0,d.D[x]);c.H=Math.max(c.H,d.H|0);c.S=Math.max(c.S,d.S|0);
if(d.sh>0&&d.sh!==c.sv){c.sv=d.sh;c.at=n}
(T[k]=T[k]||{k,m:[],dmg:0,add:0,sh:0}).m.push(p);if(c.sv&&n-c.at<8000)T[k].sh=1});
for(const id in C){const c=C[id];for(const x in c.D)if(T[x])T[x].dmg+=c.D[x];if(T[c.tk])T[c.tk].add+=c.H-c.S}
for(const k in T){const t=T[k];t.max=100+40*(t.m.length-1);t.hp=Math.max(0,Math.min(t.max,Math.round(t.max-t.dmg+t.add)))}return T}
const hit=(k,t)=>{const p=B.last[k];B.last[k]=t.hp;if(p>t.hp)B.hitAt[k]=Date.now();return Date.now()-(B.hitAt[k]||0)<350};
function arena(T,m){const ks=Object.keys(T).sort(),tg=tgt();
$("hp").innerHTML=ks.map((k,i)=>{const t=T[k],c=m==2?(k==="R"?CL[0]:CL[1]):CL[i%8],pc=t.hp/t.max*100;
return `<div class="tm ${k===B.tk?"me":""} ${t.hp<=0?"ko":""} ${hit(k,t)?"hit":""}" data-k="${esc(k)}"><div class="sp">${t.m.map(()=>px(HERO,{...PL,T:c},3)).join("")}</div><div class="hb"><div class="row"><span>${tname(t,m)}${t.sh?" 🛡":""}${tg&&tg.k===k?" 🎯":""}</span><span class="px" style="font-size:10px">${t.hp}/${t.max}</span></div><div class="hbar"><i style="width:${pc}%;background-color:${pc>50?"#38b764":pc>25?"#ffd23f":"#ef4d5a"}"></i></div></div></div>`}).join("")}
function inv(){$("inv").innerHTML=(B.inv.map((k,i)=>`<button class="slot" data-i="${i}">${px(IT[k][2],PL,4)}<span>${IT[k][0]}</span></button>`).join("")||'<div class="mu" style="margin-top:8px">连击 3 次必掉道具，答对也可能掉落（最多持有 3 个）</div>')+(B.inv.length?`<div class="mu s">${B.inv.map(k=>IT[k][0]+"："+IT[k][1]).join(" ｜ ")}</div>`:"")}
$("inv").onclick=e=>{const b=e.target.closest("button");if(b)use(+b.dataset.i)};
$("hp").onclick=e=>{const r=e.target.closest(".tm");if(r&&r.dataset.k!==B.tk&&B.ph==="play"&&!B.ko){B.lock=B.lock===r.dataset.k?"":r.dataset.k;toast(B.lock?"🎯 已锁定该目标（再点取消）":"🎯 自动攻击血量最低者")}};
function toast(t){const e=$("ts");e.textContent=t;e.hidden=false;clearTimeout(B.tt);B.tt=setTimeout(()=>e.hidden=true,2200)}
const tgt=()=>{const a=Object.values(B.T).filter(t=>t.k!==B.tk&&t.hp>0);return a.find(t=>t.k===B.lock)||a.sort((x,y)=>x.hp-y.hp)[0]};
function hitT(t,d){B.D[t.k]=(B.D[t.k]||0)+d;pres({D:B.D})}
function use(i){if(B.ph!=="play"||B.ko)return;const k=B.inv[i],t=tgt();if(!k||(OFF.includes(k)&&!t))return;if(k==="heal"){const q=B.T[B.tk];if(!q||q.hp>=q.max){toast("血量已满，先留着");return}}B.inv.splice(i,1);inv();
if(k==="heal"){const q=B.T[B.tk],g=Math.min(20,q.max-q.hp);B.H+=g;pres({H:B.H});toast("💊 队伍回复 "+g+" 点生命")}
else if(k==="shield"){B.sh=Date.now()+8000;pres({sh:B.sh});toast("🛡 护盾开启 8 秒")}
else if(k==="double"){B.dbl=3;toast("⚡ 接下来 3 次攻击伤害翻倍")}
else if(k==="cleanse"){B.fx={};fxUI();toast("✨ 干扰已清除")}
else if(t.sh)toast("🛡 被对方护盾挡下了")
else if(k==="bomb"){hitT(t,14);toast("💣 炸弹命中 -14 HP")}
else{B.ev=[...B.ev,[++B.seq,k,t.k]].slice(-6);pres({ev:B.ev});toast("已对对手使用【"+IT[k][0]+"】")}}
function fxIn(P){P.forEach(p=>{if(p.isMe)return;(p.presence.ev||[]).forEach(e=>{if(e[0]>(B.seen[p.peer]|0)){B.seen[p.peer]=e[0];if(e[2]===B.tk&&!B.ko){const n=Date.now(),k=e[1],f=B.fx;
if(k==="fog")f.fog=n+7e3;else if(k==="blackout")f.bl=n+3e3;else if(k==="freeze")f.fz=n+3500;else if(k==="mirror")f.mi=2;else if(k==="cipher")f.ci=2;else if(k==="limit")f.li=2;
toast("⚠️ 对手对你使用了【"+IT[k][0]+"】！");fxUI()}}})})}
function fxUI(){const n=Date.now(),f=B.fx,c=$("card"),fz=f.fz>n;c.classList.toggle("fog",f.fog>n);c.classList.toggle("bl",f.bl>n);c.classList.toggle("fz",fz);[...$("op").children].forEach(b=>b.disabled=fz||!!B.ans)}
function rng(s){let a=0;for(const c of s)a=(a*31+c.charCodeAt(0))>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function qk(k){const r=rng(B.seed+":"+k),c=r()*W.length|0,o=[c];while(o.length<4){const x=r()*W.length|0;if(!o.includes(x)&&!clash(x,c))o.push(x)}for(let i=3;i>0;i--){const j=r()*(i+1)|0;[o[i],o[j]]=[o[j],o[i]]}return{c,o}}
function ask(){const q=B.q=qk(B.k),f=B.fx;B.ans=0;let w=W[q.c][0];
if(f.mi>0){w=[...w].reverse().join("");f.mi--}else if(f.ci>0){w=w.replace(/[aeiou]/g,"*");f.ci--}
B.dur=f.li>0?4000:1e4;if(f.li>0)f.li--;B.t0=Date.now();show(q.c,q.o,bpick);$("wd").textContent=w;$("tmr").hidden=false;$("tmr").firstElementChild.style.width="100%";$("tmr").classList.remove("low");$("tn").textContent=Math.ceil(B.dur/1000)+"s";fxUI()}
const nxq=ms=>setTimeout(()=>{if(B.ph==="play"&&!B.ko){B.k++;ask()}},ms);
function miss(c){const x=S.w[c]||{b:0,due:0,m:0,r:0};x.b=0;x.m=(x.m||0)+1;x.r=0;x.due=Date.now()+3e5;S.w[c]=x;save()}
function drop(){if(B.inv.length>=3)return;const ks=Object.keys(IT),k=ks[Math.random()*ks.length|0];B.inv.push(k);inv();sfx("item");toast("🎁 获得道具：【"+IT[k][0]+"】")}
function bwrong(bt){vib([50,40,50]);sfx("no");B.nw++;B.ans=1;B.cb=0;B.Sf+=6;pres({S:B.Sf});if(bt)bt.classList.add("no");const c=B.q.c,ob=[...$("op").children].find(b=>+b.dataset.i===c);if(ob)ob.classList.add("ok");
[...$("op").children].forEach(b=>b.disabled=true);$("fb").textContent="💥 "+(bt?"答错":"超时")+"，队伍受到 6 点反噬";miss(c);if(!bt)nxq(1300)}
function bpick(i,bt){if(B.ans||B.ph!=="play")return;B.ans=1;const c=B.q.c;[...$("op").children].forEach(b=>b.disabled=true);
if(i===c){B.cb++;B.nc++;B.mc=Math.max(B.mc,B.cb);sfx("ok");const l=Math.max(0,B.dur-(Date.now()-B.t0))/B.dur;let d=8+Math.round(l*6)+Math.min(B.cb-1,4)*2;if(B.dbl>0){d*=2;B.dbl--}
const t=tgt();let m="✅ ";if(t){if(t.sh)m+="被对方护盾格挡";else{hitT(t,d);m+="命中 -"+d+" HP"}}
if(B.cb>1)m+=" · "+B.cb+" 连击";$("fb").textContent=m;bt.classList.add("ok");if(B.cb%3===0||Math.random()<(B.T[B.tk]&&B.T[B.tk].hp/B.T[B.tk].max<.35?.35:.2))drop();nxq(650)}
else{bwrong(bt);nxq(1300)}}
function start(m){B.ph="cd";B.mode=m;B.seed=B.rc+":"+B.rd;B.k=0;B.cb=0;B.dbl=0;B.inv=[];B.D={};B.H=0;B.Sf=0;B.sh=0;B.ev=[];B.seq=0;B.seen={};B.fx={};B.ko=0;B.paid=0;B.cum={};B.last={};B.hitAt={};B.lock="";B.nc=0;B.nw=0;B.mc=0;
B.tk=tkey(me(),m);B.T=calc(peers(),m);pres({D:{},H:0,S:0,sh:0,ev:[]});$("lb").hidden=true;$("ar").hidden=false;$("rsx").hidden=true;$("card").hidden=true;inv();
let n=3;const c=$("cd");c.hidden=false;const go=()=>{if(n>0){c.textContent=n--;setTimeout(go,700)}else{c.textContent="开战!";setTimeout(()=>{c.hidden=true;B.ph="play";B.end=Date.now()+3e5;$("card").hidden=false;ask()},500)}};go()}
function over(T){B.ph="over";B.fx={};fxUI();$("card").hidden=true;$("tmr").hidden=true;const a=Object.values(T).sort((x,y)=>y.hp-x.hp),tie=a.length>1&&a[1].hp===a[0].hp,win=!tie&&a[0].k===B.tk;
$("res").textContent=tie?"🤝 平局":win?"🏆 胜利！":"💀 失败";$("rs2").textContent="答对 "+B.nc+" · 答错 "+B.nw+" · 最高连击 "+B.mc+" · 正确率 "+Math.round(B.nc/Math.max(1,B.nc+B.nw)*100)+"%";if(!B.paid){B.paid=1;S.xp+=win?60:20;save();head()}$("rsx").hidden=false}
$("again").onclick=()=>{B.rd++;B.ph="lobby";pres({r:false,rd:B.rd,D:{},H:0,S:0,sh:0,ev:[]});$("ar").hidden=true;$("rsx").hidden=true;$("card").hidden=true;$("lb").hidden=false};
setInterval(()=>{if(!room||(B.ph!=="play"&&B.ph!=="over"&&B.ph!=="cd"))return;const P=peers(),m=B.mode,T=B.T=calc(P,m);fxIn(P);
if(B.ph==="play"){if(!B.ko&&B.q){const left=B.dur-(Date.now()-B.t0);fxUI();$("tmr").firstElementChild.style.width=Math.max(0,left/B.dur*100)+"%";$("tmr").classList.toggle("low",left<3000);$("tn").textContent=B.ans?"":Math.ceil(Math.max(0,left)/1000)+"s";if(left<=0&&!B.ans)bwrong(null)}
const mt=T[B.tk];if(mt&&mt.hp<=0&&!B.ko){B.ko=1;$("card").hidden=true;sfx("ko");toast("💀 你的队伍被击倒了")}
$("clk").textContent="第 "+(B.k+1)+" 题";
if(Object.keys(T).length&&(Object.values(T).filter(t=>t.hp>0).length<=1||Date.now()>=B.end))over(T)}
arena(T,m)},120);
$("go").onclick=async()=>{const nm=$("nm").value.trim()||"玩家",rc=$("rc").value.trim();if(!rc){$("jm").textContent="请先输入房间号";return}
try{localStorage.setItem("duel-nm",nm)}catch(e){}
$("jm").textContent="连接中…";let rm=null;try{rm=window.claude&&await claude.use("room")}catch(e){}
try{room=rm?await rm.join("duel-"+rc):await Net.join(rc);B.ph="lobby";B.rd=0;B.rc=rc;await room.presence({n:nm,r:false,tm:"R",md:1,D:{},H:0,S:0,sh:0,ev:[],rd:0});
room.onPeers(()=>{const P=peers();if(B.ph==="lobby"&&P.some(p=>p.isMe))lobby(P)});$("jn").hidden=true;$("lb").hidden=false}catch(e){$("jm").textContent=rm?"加入失败，请稍后重试":"连接失败：GitHub 版使用 PeerJS 公共服务器，网络受限时可能连不上"}};
try{$("nm").value=localStorage.getItem("duel-nm")||""}catch(e){}
function lobby(P){const hs=[...P].sort((a,b)=>a.peer<b.peer?-1:1),m=hs[0].presence.md==2?2:1,iH=hs[0].isMe,mp=P.find(p=>p.isMe).presence;
$("lb").innerHTML=`<div class="row"><span>房间 ${esc(B.rc)} · ${P.length} 人</span></div>`+
(iH?`<div class="seg"><button data-a="md1" class="${m==1?"on":""}">对决（混战）</button><button data-a="md2" class="${m==2?"on":""}">组队（红 vs 蓝）</button></div>`:`<div class="mu" style="margin:8px 0">模式：${m==2?"组队":"对决"}（由房主选择）</div>`)+
hs.map(p=>{const d=p.presence;return `<div class="row li"><span>${m==2?(d.tm==="B"?"🟦":"🟥"):"⚔️"} ${esc(d.n||"玩家")}${p.isMe?"（你）":""}${p===hs[0]?" 👑":""}</span><span class="mu">${d.r?"✅ 已准备":"…"}</span></div>`}).join("")+
(m==2?`<div class="seg"><button data-a="tmR" class="${mp.tm!=="B"?"on":""}">加入红队</button><button data-a="tmB" class="${mp.tm==="B"?"on":""}">加入蓝队</button></div>`:"")+
`<button class="btn" data-a="rdy" ${mp.r?"disabled":""}>${mp.r?"等待其他人…":"准备"}</button>`+(m==2?'<div class="mu s" style="text-align:center">组队需要红蓝两队各至少 1 人</div>':"");
if(P.length>=2&&P.every(p=>p.presence.r&&(p.presence.rd|0)===B.rd)&&(m==1||(P.some(p=>p.presence.tm!=="B")&&P.some(p=>p.presence.tm==="B"))))start(m)}
$("lb").onclick=e=>{const a=e.target.dataset.a;if(!a||!room)return;if(a==="rdy")pres({r:true});else if(a[0]==="m")pres({md:+a[2]});else pres({tm:a[2]})};

Net.onLost=()=>{room=null;B.ph="off";["ar","lb","rsx","card"].forEach(i=>$(i).hidden=true);$("jn").hidden=false;$("jm").textContent="房主已离开，房间已关闭，请重新加入";toast("房主已离开")};
snd();head();tab(1);

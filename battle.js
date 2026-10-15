/* Lexicon Brawl · battle.js：赛车追逐对战（依赖 words.js / net.js / app.js）
 * 每个人在本地模拟自己的赛车（位置 x、速度 v），通过 presence 广播；其他客户端按 (x,v) 外推显示，
 * 不依赖各设备时钟。答对加速、答错打滑；道具干扰对手背词；落后者有尾流与追赶加速，领先者要防追击。 */
const px=(m,p,s=4)=>`<svg width="${m[0].length*s}" height="${m.length*s}" viewBox="0 0 ${m[0].length} ${m.length}" shape-rendering="crispEdges">${m.map((r,y)=>[...r].map((c,x)=>p[c]?`<rect x="${x}" y="${y}" width="1" height="1" fill="${p[c]}"/>`:"").join("")).join("")}</svg>`;
const PL={k:"#1a1c2c",w:"#f4f4f4",r:"#ef4d5a",o:"#ff9f1c",y:"#ffd23f",g:"#38b764",b:"#41a6f6",p:"#b388ff",c:"#94b0c2",d:"#566c86",a:"#ffcf9f"};
const CAR=["...kkkk...","..kwwwwk..",".kTTTTTTk.","kTTTTTTTTk","kkkTTTTkkk",".kyk..kyk."];
const IT={
oil:["油渍","对手减速 3.5 秒",["...dd...","..dccd..",".dcccd..","dcccccd.","dccccdd.",".dddd...","........","........"]],
bomb:["炸弹","对手被击退 40 米并失去加速",["....yo..","...ok...","..kkkk..",".kkkkkk.","kkdkkkk.","kkkkkkk.",".kkkkk..","........"]],
fog:["迷雾","对手视线模糊 7 秒",["........","..bbb...",".bwwwb..","bwwwwwb.","bwwwwwwb",".bbbbbb.","........","........"]],
blackout:["黑屏","对手选项消失 3 秒",["dddddddd","dkkkkkkd","dkwkkwkd","dkkkkkkd","dkwwwwkd","dkkkkkkd","dddddddd","........"]],
freeze:["熄火","对手 3 秒无法作答且停车",["...b....","b..b..b.",".b.b.b..","..bbb...","bbbwbbb.","..bbb...",".b.b.b..","b..b..b."]],
mirror:["镜像","对手下 2 题单词倒着写",["..cccc..",".cwwwwc.",".cwwbwc.",".cwwwwc.",".cwwwwc.","..cccc..","...dd...","...dd..."]],
cipher:["乱码","对手下 2 题元音变星号",["..pppp..",".ppwwpp.","ppwppwpp","pppwwppp","ppwppwpp",".ppwwpp.","..pppp..","........"]],
limit:["限时","对手下 2 题只剩 4 秒",["..cccc..",".cwwwwc.","cwwwcwwc","cwwwccwc","cwwwwwwc",".cwwwwc.","..cccc..","........"]],
nitro:["氮气","立即大幅加速",["...r....","..ror...",".rooyr..",".royyor.",".royyor.","..royr..","...rr...","........"]],
shield:["护盾","8 秒内免疫对手的道具",["bbbbbbbb","bwwbbwwb","bwwbbwwb","bbbbbbbb",".bbbbbb.","..bbbb..","...bb...","........"]],
turbo:["涡轮","接下来 3 次答对加速翻倍",["....yy..","...yy...","..yy....",".yyyyyy.","....yy..","...yy...","..yy....",".y......"]],
cleanse:["净化","清除自己身上的干扰",["...g....","...g....","gg.w.gg.","..wwwg..","gg.w.gg.","...g....","...g....","........"]],
jump:["近道","瞬间前进 40 米",["....g...","....gg..","gggggggg","gggggggg","....gg..","....g...","........","........"]]};
const OFF=["oil","bomb","fog","blackout","freeze","mirror","cipher","limit"],CL=["#ef4d5a","#41a6f6","#38b764","#ffd23f","#b388ff","#ff9f1c","#94b0c2","#f4f4f4"];
const TRACK=1000,CAP=15e4,GRACE=15e3;
const B={pool:3000,ph:"off",rd:0,rc:"",mode:1,seed:"",k:0,q:null,t0:0,dur:1e4,ans:0,cb:0,tur:0,inv:[],ev:[],seq:0,seen:{},fx:{},cars:[],rk:[],R:{},shc:{},L:{},me:"",tk:"",paid:0,lock:"",x:0,v:0,boost:0,spin:0,stall:0,oil:0,fin:0,fa:0,gs:0,lt:0,pt:0,nc:0,nw:0,mc:0};let room=null;
const pres=p=>{try{room&&room.presence(p)}catch(e){}};
const peers=()=>room?room.peers().filter(p=>p.kind==="viewer"&&p.presence):[];
const me=()=>peers().find(p=>p.isMe);
const tkey=(p,m)=>m==2?(p.presence.tm==="B"?"B":"R"):p.peer;
/* ---------- 通用：提示 / 道具栏 / 题目 ---------- */
function toast(t){const e=$("ts");e.textContent=t;e.hidden=false;clearTimeout(B.tt);B.tt=setTimeout(()=>e.hidden=true,2200)}
function inv(){$("inv").innerHTML=(B.inv.map((k,i)=>`<button class="slot" data-i="${i}">${px(IT[k][2],PL,4)}<span>${IT[k][0]}</span></button>`).join("")||'<div class="mu" style="margin-top:8px">连击 3 次必掉道具，答对也可能掉落；落后时掉率更高（最多持有 3 个）</div>')+(B.inv.length?`<div class="mu s">${B.inv.map(k=>IT[k][0]+"："+IT[k][1]).join(" ｜ ")}</div>`:"")}
$("inv").onclick=e=>{const b=e.target.closest("button");if(b)use(+b.dataset.i)};
function rng(s){let a=0;for(const c of s)a=(a*31+c.charCodeAt(0))>>>0;return()=>{a=a+0x6D2B79F5>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
function qk(k){const r=rng(B.seed+":"+k),c=r()*B.pool|0,o=[c];while(o.length<4){const x=r()*B.pool|0;if(!o.includes(x)&&!clash(x,c))o.push(x)}for(let i=3;i>0;i--){const j=r()*(i+1)|0;[o[i],o[j]]=[o[j],o[i]]}return{c,o}}
function fxUI(){const n=Date.now(),f=B.fx,c=$("card"),fz=f.fz>n;c.classList.toggle("fog",f.fog>n);c.classList.toggle("bl",f.bl>n);c.classList.toggle("fz",fz);[...$("op").children].forEach(b=>b.disabled=fz||!!B.ans)}
function ask(){const q=B.q=qk(B.k),f=B.fx;B.ans=0;let w=W[q.c][0];
if(f.mi>0){w=[...w].reverse().join("");f.mi--}else if(f.ci>0){w=w.replace(/[aeiou]/g,"*");f.ci--}
B.dur=f.li>0?4000:1e4;if(f.li>0)f.li--;B.t0=Date.now();show(q.c,q.o,bpick);$("wd").textContent=w;$("tmr").hidden=false;$("tmr").firstElementChild.style.width="100%";$("tmr").classList.remove("low");$("tn").textContent=Math.ceil(B.dur/1000)+"s";fxUI()}
const nxq=ms=>setTimeout(()=>{if(B.ph==="play"&&!B.fin){B.k++;ask()}},ms);
function miss(c){const x=S.w[c]||{b:0,due:0,m:0,r:0};x.b=0;x.m=(x.m||0)+1;x.r=0;x.due=Date.now()+3e5;S.w[c]=x;save()}
const myRank=()=>B.rk.findIndex(c=>c.me)+1;
function drop(){if(B.inv.length>=3)return;const ks=Object.keys(IT),k=ks[Math.random()*ks.length|0];B.inv.push(k);inv();sfx("item");toast("🎁 获得道具：【"+IT[k][0]+"】")}
/* ---------- 答题：加速 / 打滑 ---------- */
function bpick(i,bt){if(B.ans||B.ph!=="play"||B.fin)return;B.ans=1;const c=B.q.c;[...$("op").children].forEach(b=>b.disabled=true);
if(i===c){B.cb++;B.nc++;B.mc=Math.max(B.mc,B.cb);sfx("ok");const l=Math.max(0,B.dur-(Date.now()-B.t0))/B.dur;let g=7+Math.min(B.cb,5)+Math.round(l*5);if(B.tur>0){g*=2;B.tur--}
B.boost=Math.min(40,B.boost+g);$("fb").textContent="✅ 加速 +"+Math.round(g*3.6)+" km/h"+(B.cb>1?" · "+B.cb+" 连击":"");bt.classList.add("ok");
if(B.cb%3===0||Math.random()<(myRank()>1&&myRank()===B.rk.length?.4:.2))drop();nxq(650)}
else{bwrong(bt);nxq(1300)}}
function bwrong(bt){vib([50,40,50]);sfx("no");B.nw++;B.ans=1;B.cb=0;B.boost=Math.max(0,B.boost-10);B.spin=Date.now()+700;if(bt)bt.classList.add("no");const c=B.q.c,ob=[...$("op").children].find(b=>b.dataset.i==c);if(ob)ob.classList.add("ok");
[...$("op").children].forEach(b=>b.disabled=true);$("fb").textContent="💥 "+(bt?"答错":"超时")+"，打滑减速！";miss(c);if(!bt)nxq(1300)}
/* ---------- 道具 ---------- */
function tgt(){const e=B.cars.filter(c=>!c.me&&!c.f&&(B.mode!==2||c.tk!==B.tk));return e.find(c=>c.peer===B.lock)||e.filter(c=>c.x>B.x).sort((a,b)=>a.x-b.x)[0]||e.sort((a,b)=>b.x-a.x)[0]}
function use(i){if(B.ph!=="play"||B.fin)return;const k=B.inv[i],t=tgt();if(!k||(OFF.includes(k)&&!t))return;B.inv.splice(i,1);inv();
if(k==="nitro"){B.boost=Math.min(40,B.boost+22);toast("🔥 氮气加速！")}
else if(k==="shield"){pres({sh:Date.now()});toast("🛡 护盾开启 8 秒")}
else if(k==="turbo"){B.tur=3;toast("⚡ 接下来 3 次答对加速翻倍")}
else if(k==="cleanse"){B.fx={};B.oil=0;B.stall=0;B.spin=0;fxUI();toast("✨ 干扰已清除")}
else if(k==="jump"){B.x=Math.min(TRACK-1,B.x+40);toast("🚀 近道！前进 40 米")}
else if(t.sh)toast("🛡 被 "+t.raw+" 的护盾挡下了")
else{B.ev=[...B.ev,[++B.seq,k,t.peer]].slice(-6);pres({ev:B.ev});toast("已对 "+t.raw+" 使用【"+IT[k][0]+"】")}}
function fxIn(P){const n=Date.now();P.forEach(p=>{if(p.isMe)return;(p.presence.ev||[]).forEach(e=>{if(e[0]>(B.seen[p.peer]|0)){B.seen[p.peer]=e[0];if(e[2]===B.me&&!B.fin){const k=e[1],f=B.fx;
if(k==="fog")f.fog=n+7e3;else if(k==="blackout")f.bl=n+3e3;else if(k==="freeze"){f.fz=n+3e3;B.stall=n+3e3}else if(k==="mirror")f.mi=2;else if(k==="cipher")f.ci=2;else if(k==="limit")f.li=2;
else if(k==="oil")B.oil=n+3500;else if(k==="bomb"){B.x=Math.max(0,B.x-40);B.boost=0;B.spin=n+600}
toast("⚠️ "+(p.presence.n||"对手")+" 对你使用了【"+IT[k][0]+"】！");fxUI()}}})})}
/* ---------- 赛道：车辆状态 / 物理 / 绘制 ---------- */
function carsOf(P,n,dt){return P.map(p=>{const d=p.presence,id=p.peer,s=B.shc[id]=B.shc[id]||{sv:0,at:0};if(d.sh>0&&d.sh!==s.sv){s.sv=d.sh;s.at=n}
let x,v;if(p.isMe){x=B.x;v=B.v}else if(d.f>0){x=TRACK;v=0}else{const px0=+d.x||0,pv=+d.v||0;let r=B.R[id];if(!r||r.px!==px0||r.pv!==pv)r=B.R[id]={px:px0,pv,at:n,dx:r?r.dx:px0};
r.dx+=(r.px+r.pv*Math.min(n-r.at,600)/1e3-r.dx)*Math.min(1,dt*8);x=r.dx;v=r.pv}
return{peer:id,raw:d.n||"玩家",name:esc(d.n||"玩家"),x,v,f:d.f|0,tk:tkey(p,B.mode),me:!!p.isMe,sh:!!s.sv&&n-s.at<8e3}})}
const rank=cs=>cs.slice().sort((a,b)=>a.f&&b.f?a.f-b.f:a.f?-1:b.f?1:b.x-a.x||(a.peer<b.peer?-1:1));
function sim(cs,n,dt){if(B.fin)return;const ahead=cs.some(c=>!c.me&&c.x>B.x&&c.x-B.x<35),lead=Math.max(...cs.map(c=>c.x)),rub=cs.length>1&&lead-B.x>120?4:0;
let tg=10+B.boost+(ahead?5:0)+rub;if(n<B.spin)tg=Math.min(tg,3);if(n<B.stall)tg=Math.min(tg,2);if(n<B.oil)tg*=.5;
B.v+=Math.max(-24*dt,Math.min(14*dt,tg-B.v));B.x=Math.min(TRACK,B.x+B.v*dt);B.boost=Math.max(0,B.boost-2.5*dt);B.dr=ahead;
if(B.x>=TRACK){B.fin=Math.max(1,n-B.gs);B.v=0;pres({x:TRACK,v:0,f:B.fin});$("card").hidden=true;$("tmr").hidden=true;sfx("item");toast("🏁 冲线！第 "+myRank()+" 名")}
else if(n-B.pt>250){B.pt=n;pres({x:+B.x.toFixed(1),v:+B.v.toFixed(1)})}}
function lanes(P,m){B.L={};$("hp").innerHTML="";P.slice().sort((a,b)=>a.peer<b.peer?-1:1).forEach((p,i)=>{const c=m==2?(p.presence.tm==="B"?CL[1]:CL[0]):CL[i%8],ln=document.createElement("div");ln.className="ln"+(p.isMe?" me":"");
ln.innerHTML=`<div class="row"><span>${p.isMe?"你":esc(p.presence.n||"玩家")}${m==2?(p.presence.tm==="B"?" 🟦":" 🟥"):""}<b class="tg"></b></span><span class="px sp"></span></div><div class="rd"><i class="fin"></i><div class="car">${px(CAR,{...PL,T:c},3)}</div></div>`;
ln.onclick=()=>{if(!p.isMe&&B.ph==="play"&&!B.fin){B.lock=B.lock===p.peer?"":p.peer;toast(B.lock?"🎯 已锁定 "+(p.presence.n||"对手")+"（再点取消）":"🎯 自动选择最近的前车")}};
$("hp").append(ln);B.L[p.peer]={car:ln.querySelector(".car"),sp:ln.querySelector(".sp"),tg:ln.querySelector(".tg"),rd:ln.querySelector(".rd")}})}
function paint(cs,rk){cs.forEach(c=>{const l=B.L[c.peer];if(!l)return;l.car.style.left=`calc((100% - 30px)*${(Math.min(TRACK,c.x)/TRACK).toFixed(4)})`;l.car.classList.toggle("bst",c.me?B.boost>8:c.v>24);
l.sp.textContent=Math.round(c.v*3.6)+" km/h · "+(rk.indexOf(c)+1)+"/"+cs.length;l.tg.textContent=(c.f?" 🏁":"")+(B.lock===c.peer?" 🎯":"")+(c.sh?" 🛡":"")+(c.me&&B.dr?" 🌀":"");l.rd.style.setProperty("--d",Math.max(.12,Math.min(2,30/(c.v+3)))+"s")})}
function tick(){if(!room||(B.ph!=="play"&&B.ph!=="over"&&B.ph!=="cd"))return;const n=Date.now(),dt=Math.min(.5,(n-B.lt)/1e3),P=peers();B.lt=n;
let cs=B.cars=carsOf(P,n,dt);
if(B.ph==="play"){fxIn(P);sim(cs,n,dt);cs=B.cars=carsOf(P,n,0);
if(!B.fin&&B.q){const left=B.dur-(n-B.t0);fxUI();$("tmr").firstElementChild.style.width=Math.max(0,left/B.dur*100)+"%";$("tmr").classList.toggle("low",left<3000);$("tn").textContent=B.ans?"":Math.ceil(Math.max(0,left)/1e3)+"s";if(left<=0&&!B.ans)bwrong(null)}}
const rk=B.rk=rank(cs);paint(cs,rk);
if(B.ph==="play"){$("clk").textContent=Math.round(B.v*3.6)+" km/h · 第 "+myRank()+"/"+cs.length+" 名";$("bst").style.width=B.boost/40*100+"%";
if(cs.some(c=>c.f)&&!B.fa)B.fa=n;if(cs.length&&(cs.every(c=>c.f)||(B.fa&&n-B.fa>GRACE)||n-B.gs>CAP))over(rk)}}
setInterval(tick,60);
/* ---------- 开局 / 结算 ---------- */
function start(m){const P=peers(),hh=P.slice().sort((a,b)=>a.peer<b.peer?-1:1)[0];B.pool=Math.min(W.length,hh.presence.pl|0||3000);B.ph="cd";B.mode=m;B.seed=B.rc+":"+B.rd;B.k=0;B.cb=0;B.tur=0;B.inv=[];B.ev=[];B.seq=0;B.seen={};B.fx={};B.paid=0;B.R={};B.shc={};B.lock="";B.nc=0;B.nw=0;B.mc=0;B.x=0;B.v=0;B.boost=0;B.spin=0;B.stall=0;B.oil=0;B.fin=0;B.fa=0;B.pt=0;B.dr=false;B.me=me().peer;B.tk=tkey(me(),m);B.lt=Date.now();
pres({x:0,v:0,f:0,sh:0,ev:[]});$("lb").hidden=true;$("ar").hidden=false;$("rsx").hidden=true;$("card").hidden=true;lanes(P,m);B.cars=carsOf(P,Date.now(),0);inv();
let n=3;const c=$("cd");c.hidden=false;const go=()=>{if(n>0){c.textContent=n--;setTimeout(go,700)}else{c.textContent="出发!";setTimeout(()=>{c.hidden=true;B.ph="play";B.gs=B.lt=Date.now();$("card").hidden=false;ask()},500)}};go()}
function over(rk){B.ph="over";B.fx={};fxUI();$("card").hidden=true;$("tmr").hidden=true;const mi=rk.findIndex(c=>c.me)+1;let txt,win;
if(B.mode===2){const pt={R:0,B:0},bs={R:99,B:99};rk.forEach((c,i)=>{pt[c.tk]+=i+1;bs[c.tk]=Math.min(bs[c.tk],i+1)});const a=pt.R<pt.B||(pt.R===pt.B&&bs.R<bs.B)?"R":pt.R===pt.B?"":"B";win=a===B.tk;
txt=a?(a==="R"?"🟥 红队":"🟦 蓝队")+"获胜（名次积分 "+pt.R+" : "+pt.B+"，越低越好）":"🤝 平局"}
else{win=mi===1;txt=mi===1?"🏆 冠军！":mi===2?"🥈 第 2 名":mi===3?"🥉 第 3 名":"🏁 第 "+mi+" 名"}
$("res").textContent=txt;$("rsl").innerHTML=rk.map((c,i)=>`${i+1}. ${c.name}${c.me?"（你）":""} — ${c.f?(c.f/1e3).toFixed(1)+" 秒":"未完赛 "+Math.round(c.x)+" 米"}`).join("<br>");
$("rs2").textContent="答对 "+B.nc+" · 答错 "+B.nw+" · 最高连击 "+B.mc+" · 正确率 "+Math.round(B.nc/Math.max(1,B.nc+B.nw)*100)+"%";
if(!B.paid){B.paid=1;S.xp+=win?60:B.fin?30:20;save();head()}$("rsx").hidden=false}
$("again").onclick=()=>{B.rd++;B.ph="lobby";pres({r:false,rd:B.rd,x:0,v:0,f:0,sh:0,ev:[]});$("ar").hidden=true;$("rsx").hidden=true;$("card").hidden=true;$("lb").hidden=false};
/* ---------- 联机：加入房间 / 大厅 ---------- */
$("go").onclick=async()=>{const nm=$("nm").value.trim()||"玩家",rc=$("rc").value.trim();if(!rc){$("jm").textContent="请先输入房间号";return}
try{localStorage.setItem("duel-nm",nm)}catch(e){}
$("jm").textContent="连接中…";let rm=null;try{rm=window.claude&&await claude.use("room")}catch(e){}
try{room=rm?await rm.join("duel-"+rc):await Net.join(rc);B.ph="lobby";B.rd=0;B.rc=rc;await room.presence({n:nm,r:false,tm:"R",md:1,pl:3000,x:0,v:0,f:0,sh:0,ev:[],rd:0});
room.onPeers(()=>{const P=peers();if(B.ph==="lobby"&&P.some(p=>p.isMe))lobby(P)});$("jn").hidden=true;$("lb").hidden=false}catch(e){$("jm").textContent=rm?"加入失败，请稍后重试":"连接失败：GitHub 版使用 PeerJS 公共服务器，网络受限时可能连不上"}};
try{$("nm").value=localStorage.getItem("duel-nm")||""}catch(e){}
function lobby(P){const hs=[...P].sort((a,b)=>a.peer<b.peer?-1:1),m=hs[0].presence.md==2?2:1,iH=hs[0].isMe,mp=P.find(p=>p.isMe).presence;
$("lb").innerHTML=`<div class="row"><span>房间 ${esc(B.rc)} · ${P.length} 人</span></div>`+
(iH?`<div class="seg"><button data-a="md1" class="${m==1?"on":""}">竞速（混战）</button><button data-a="md2" class="${m==2?"on":""}">组队（红 vs 蓝）</button></div>`:`<div class="mu" style="margin:8px 0">模式：${m==2?"组队":"竞速"}（由房主选择）</div>`)+
(iH?`<div class="seg">${[500,1000,3000,10000].map(n=>`<button data-a="pl${n}" class="${(hs[0].presence.pl|0||3000)===n?"on":""}">${n>=10000?"全部词库":"前 "+n}</button>`).join("")}</div>`:`<div class="mu" style="margin:8px 0">词库范围：${(hs[0].presence.pl|0||3000)>=10000?"全部":"前 "+(hs[0].presence.pl|0||3000)}</div>`)+hs.map(p=>{const d=p.presence;return `<div class="row li"><span>${m==2?(d.tm==="B"?"🟦":"🟥"):"⚔️"} ${esc(d.n||"玩家")}${p.isMe?"（你）":""}${p===hs[0]?" 👑":""}</span><span class="mu">${d.r?"✅ 已准备":"…"}</span></div>`}).join("")+
(m==2?`<div class="seg"><button data-a="tmR" class="${mp.tm!=="B"?"on":""}">加入红队</button><button data-a="tmB" class="${mp.tm==="B"?"on":""}">加入蓝队</button></div>`:"")+
`<button class="btn" data-a="rdy" ${mp.r?"disabled":""}>${mp.r?"等待其他人…":"准备"}</button>`+(m==2?'<div class="mu s" style="text-align:center">组队需要红蓝两队各至少 1 人</div>':"");
if(P.length>=2&&P.every(p=>p.presence.r&&(p.presence.rd|0)===B.rd)&&(m==1||(P.some(p=>p.presence.tm!=="B")&&P.some(p=>p.presence.tm==="B"))))start(m)}
$("lb").onclick=e=>{const a=e.target.dataset.a;if(!a||!room)return;if(a==="rdy")pres({r:true});else if(a[0]==="m")pres({md:+a[2]});else if(a.slice(0,2)==="pl")pres({pl:+a.slice(2)});else pres({tm:a[2]})};

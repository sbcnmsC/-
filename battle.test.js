// 赛车追逐对战：混战 3 人 + 组队 2v2（模拟 Claude room）
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs'),path=require('path');
const html=fs.readFileSync(path.join(__dirname,'..','dist','lexicon-brawl.html'),'utf8').replace(/<link[^>]*>/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ok=0,bad=0;
const T=(n,c)=>{c?ok++:bad++;console.log((c?"PASS ":"FAIL ")+n)};
let store={},subs=[];const mkRoom=id=>({peers:()=>Object.keys(store).map(k=>({peer:k,kind:"viewer",isMe:k===id,presence:store[k]})),presence:async p=>{store[id]=Object.assign(store[id]||{},p);subs.forEach(f=>f())},onPeers:f=>subs.push(f)});
const ALL=[];
async function mk(id){const vc=new VirtualConsole(),errs=[];vc.on("jsdomError",e=>errs.push(e.message));
 const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/",virtualConsole:vc,beforeParse(w){w.claude={use:async()=>({join:async()=>mkRoom(id)})};w.speechSynthesis=undefined}});await wait(40);
 const P={id,w:dom.window,d:dom.window.document,errs,ev:s=>dom.window.eval(s)};ALL.push(P);return P}
const join=async(P,rc)=>{P.d.getElementById("t3").click();P.d.getElementById("nm").value=P.id;P.d.getElementById("rc").value=rc;P.d.getElementById("go").click();await wait(60)};
const ready=async Ps=>{for(const P of Ps){P.d.querySelector('[data-a="rdy"]').click();await wait(60)}};
const opts=P=>[...P.d.getElementById("op").children];
const right=P=>{const c=P.ev("W[B.q.c][2]");opts(P).find(b=>b.textContent.includes(c)).click()};
const wrong=P=>{const c=P.ev("W[B.q.c][2]");opts(P).find(b=>!b.textContent.includes(c)).click()};
const finish=async(P)=>{P.ev("B.x=999.5");await wait(350)};
(async()=>{
 // ===== A: 混战 3 人 =====
 const a=await mk("a"),b=await mk("b"),c=await mk("c");
 const before=a.ev("Object.keys(S.w).length");
 await join(a,"7");a.d.getElementById("rc").dispatchEvent(new a.w.KeyboardEvent("keydown",{key:"1",bubbles:true}));
 T("typing a digit in the room box does not answer the hidden question",a.ev("Object.keys(S.w).length")===before);
 await join(b,"7");await join(c,"7");a.d.querySelector('[data-a="pl500"]').click();await wait(80);await ready([a,b,c]);
 await wait(300);T("3-2-1 countdown after everyone is ready",[a,b,c].every(P=>P.ev("B.ph")==="cd"));
 await wait(3000);T("race starts on all devices",[a,b,c].every(P=>P.ev("B.ph")==="play"));
 T("host-selected word range (前500) is shared by everyone",[a,b,c].every(P=>P.ev("B.pool")===500&&P.ev("B.q.c")<500));
 T("one lane per player",[a,b,c].every(P=>P.d.querySelectorAll(".ln").length===3));
 T("same first word for everyone",new Set([a,b,c].map(P=>P.ev("B.q.c"))).size===1);
 await wait(1200);T("cars roll on their own at base speed (v="+a.ev("B.v").toFixed(1)+")",a.ev("B.v")>3&&a.ev("B.x")>0);
 right(a);T("correct answer adds boost",a.ev("B.boost")>6);
 wrong(b);T("wrong answer: boost cut + spin-out",b.ev("B.nw")===1&&b.ev("B.spin")>Date.now()&&b.ev("B.boost")===0);
 await wait(1600);
 T("other cars are visible and moving on a remote screen",c.ev('B.cars.find(x=>x.peer==="a").x')>0);
 T("boosted car is faster than base on a remote screen",c.ev('B.cars.find(x=>x.peer==="a").v')>10.5);
 // items
 a.ev('B.boost=0;B.inv=["nitro"];use(0)');T("nitro boost",a.ev("B.boost")>=22);
 a.ev('B.lock="b";B.inv=["oil"];use(0)');await wait(300);T("oil slick slows the target",b.ev("B.oil")>Date.now());
 b.ev("B.x=200");await wait(400);a.ev('B.lock="b";B.inv=["bomb"];use(0)');await wait(400);T("bomb knocks the target back ~40 m (x="+b.ev("B.x").toFixed(0)+")",b.ev("B.x")<195);
 a.ev('B.lock="b";B.inv=["freeze"];use(0)');await wait(400);T("freeze stalls the target and disables answers",b.d.getElementById("card").classList.contains("fz")&&opts(b).every(o=>o.disabled));
 c.ev('B.inv=["shield"];use(0)');await wait(350);a.ev('B.lock="c";B.inv=["fog"];use(0)');await wait(350);T("shield blocks an incoming item",!(c.ev("B.fx.fog|0"))&&a.ev("B.inv.length")===0);
 T("jump moves the car forward 40 m",Math.abs(a.ev('(()=>{B.inv=["jump"];const x0=B.x;use(0);return B.x-x0})()')-40)<1e-6);
 a.d.getElementById("t1").click();T("tab switch is blocked during the race",a.ev("mode")===3);
 const nw0=c.ev("B.nw");c.ev("B.t0-=11000");await wait(300);T("timeout counts as a wrong answer",c.ev("B.nw")===nw0+1);
 // disconnect
 b.w.close();delete store.b;subs.forEach(f=>f());await wait(300);T("a player leaving mid-race does not break the others",a.ev("B.cars.length")===2&&c.ev("B.cars.length")===2);
 // finish: a first, then c
 await finish(a);T("crossing the line publishes the finish time",store.a.f>0);
 await finish(c);await wait(300);
 T("race ends when everyone has finished",a.ev("B.ph")==="over"&&c.ev("B.ph")==="over");
 T("winner is the first to cross the line",/冠军/.test(a.d.getElementById("res").textContent)&&/第 2 名/.test(c.d.getElementById("res").textContent));
 T("results list shows times and names",/1\. a/.test(a.d.getElementById("rsl").textContent)&&/正确率/.test(a.d.getElementById("rs2").textContent));
 T("winner earns 60 XP",a.ev("S.xp")>=60);
 T("fog cleared after the race",!c.d.getElementById("card").classList.contains("fog"));
 for(const P of [a,c]){P.d.getElementById("again").click();await wait(50)}await ready([a,c]);await wait(3600);
 T("rematch resets position and speed",a.ev("B.ph")==="play"&&a.ev("B.rd")===1&&a.ev("B.x")<30&&c.ev("B.fin")===0);
 // ===== B: 组队 2v2 =====
 [a,c].forEach(P=>P.w.close());store={};subs=[];
 const [w,x,y,z]=[await mk("w"),await mk("x"),await mk("y"),await mk("z")];
 for(const P of [w,x,y,z])await join(P,"9");
 w.d.querySelector('[data-a="md2"]').click();await wait(60);
 for(const P of [y,z]){P.d.querySelector('[data-a="tmB"]').click();await wait(40)}
 await ready([w,x,y,z]);await wait(3900);
 T("team mode starts (2v2)",[w,x,y,z].every(P=>P.ev("B.ph")==="play"&&P.ev("B.mode")===2));
 const tg=w.ev("(()=>{const t=tgt();return t&&t.tk})()");T("team items only target the enemy team (target team "+tg+")",tg==="B");
 for(const P of [w,y,x,z])await finish(P);await wait(300);
 T("team race ends and red wins on rank points (1+3 vs 2+4)",[w,x,y,z].every(P=>P.ev("B.ph")==="over"&&/红队/.test(P.d.getElementById("res").textContent)));
 const errs=ALL.flatMap(P=>P.errs);T("no script errors ("+errs.length+")",errs.length===0);if(errs.length)console.log(errs.slice(0,3));
 console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0)})().catch(e=>{console.error(e);console.log("script errors:",ALL.flatMap(P=>P.errs).slice(0,4));process.exit(2)});

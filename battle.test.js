const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync('/mnt/user-data/outputs/lexicon-brawl.html','utf8').replace(/<link[^>]*>/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ok=0,bad=0;
const T=(n,c)=>{c?ok++:bad++;console.log((c?"PASS ":"FAIL ")+n)};
const store={};let subs=[];const mkRoom=id=>({peers:()=>Object.keys(store).map(k=>({peer:k,kind:"viewer",isMe:k===id,presence:store[k]})),presence:async p=>{store[id]=Object.assign(store[id]||{},p);subs.forEach(f=>f())},onPeers:f=>subs.push(f)});
const ALL=[];
async function mk(id,name){const vc=new VirtualConsole(),errs=[];vc.on("jsdomError",e=>errs.push(e.message));
 const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/",virtualConsole:vc,beforeParse(w){w.claude={use:async()=>({join:async()=>mkRoom(id)})};w.speechSynthesis=undefined}});await wait(40);
 const P={id,w:dom.window,d:dom.window.document,errs,ev:s=>dom.window.eval(s)};ALL.push(P);return P}
const join=async(P,rc)=>{P.d.getElementById("t3").click();P.d.getElementById("nm").value=P.id;P.d.getElementById("rc").value=rc;P.d.getElementById("go").click();await wait(60)};
const ready=async Ps=>{for(const P of Ps){P.d.querySelector('[data-a="rdy"]').click();await wait(60)}};
const right=P=>{const c=P.ev("W[B.q.c][2]");[...P.d.getElementById("op").children].find(b=>b.textContent.includes(c)).click()};
(async()=>{
 // ---- A: FFA 3 players ----
 const a=await mk("a"),b=await mk("b"),c=await mk("c");
 const before=a.ev("Object.keys(S.w).length");
 await join(a,"7");a.d.getElementById("rc").dispatchEvent(new a.w.KeyboardEvent("keydown",{key:"1",bubbles:true}));
 T("typing digit in room box does not answer hidden question",a.ev("Object.keys(S.w).length")===before);
 await join(b,"7");await join(c,"7");await ready([a,b,c]);
 await wait(300);T("countdown phase after all ready",[a,b,c].every(P=>P.ev("B.ph")==="cd"));
 await wait(3000);T("all clients enter play after 3-2-1",[a,b,c].every(P=>P.ev("B.ph")==="play"));
 T("same first question on all clients",new Set([a,b,c].map(P=>P.ev("B.q.c"))).size===1);
 a.ev('B.inv=["heal"];use(0)');T("heal at full HP is refused and item kept",a.ev("B.inv.length")===1);a.ev("B.inv=[]");
 right(a);await wait(200);
 const dm=Object.values(store.a.D||{}).reduce((x,y)=>x+y,0);T("correct answer deals damage ("+dm+")",dm>0);
 a.d.querySelector('.tm[data-k="c"]').click();await wait(50);T("tap-to-lock target",a.ev("B.lock")==="c");
 await wait(900);const cb=(store.a.D||{}).c|0;right(a);await wait(200);T("locked target takes the hit",((store.a.D||{}).c|0)>cb);
 a.d.getElementById("t1").click();T("tab switch is blocked mid-battle",a.ev("mode")===3);
 // shield blocks bomb
 b.ev('B.inv=["shield"];use(0)');await wait(350);
 const db=(store.a.D||{}).b|0;a.ev('B.lock="b";B.inv=["bomb"];use(0)');await wait(200);T("shield blocks bomb",((store.a.D||{}).b|0)===db);
 b.ev('B.sh=0');
 // timeout
 const s0=store.c.S|0;c.ev('B.t0-=11000');await wait(400);T("timeout costs 6 HP (S "+s0+"→"+store.c.S+")",(store.c.S|0)===s0+6);
 const miss=c.ev("B.T.c.max-B.T.c.hp"),h0=store.c.H|0;c.ev('B.inv=["heal"];use(0)');await wait(150);T("heal restores min(20, missing HP): missing "+miss+", healed "+((store.c.H|0)-h0),((store.c.H|0)-h0)===Math.min(20,miss)&&c.ev("B.inv.length")===0);
 // disconnect persistence
 const hpBefore=c.ev("B.T.c.hp");delete store.a;subs.forEach(f=>f());await wait(300);
 T("damage persists after attacker disconnects",c.ev("B.T.c.hp")<=hpBefore&&c.ev("B.T.c.hp")<100);
 // finish
 b.ev('B.D={c:999};pres({D:B.D});B.fx.fog=Date.now()+99999');await wait(500);
 T("game over detected",b.ev("B.ph")==="over"&&c.ev("B.ph")==="over");
 T("winner/loser text",/胜利/.test(b.d.getElementById("res").textContent)&&/失败/.test(c.d.getElementById("res").textContent));
 T("stats line shown",/正确率/.test(c.d.getElementById("rs2").textContent));
 T("fog cleared after game over",!b.d.getElementById("card").classList.contains("fog"));
 // rematch
 for(const P of [b,c]){P.d.getElementById("again").click();await wait(50)}await ready([b,c]);await wait(3600);
 T("rematch starts with reset counters",b.ev("B.ph")==="play"&&!(store.b.D&&Object.keys(store.b.D).length)&&b.ev("B.rd")===1);
 // ---- B: team 2v2 ----
 for(const k of Object.keys(store))delete store[k];subs=[];
 const [w,x,y,z]=[await mk("w"),await mk("x"),await mk("y"),await mk("z")];
 for(const P of [w,x,y,z])await join(P,"9");
 w.d.querySelector('[data-a="md2"]').click();await wait(60);
 for(const P of [y,z]){P.d.querySelector('[data-a="tmB"]').click();await wait(40)}
 await ready([w,x,y,z]);await wait(3900);
 T("team mode starts (2v2)",[w,x,y,z].every(P=>P.ev("B.ph")==="play"&&P.ev("B.mode")===2));
 T("two team HP rows, shared pool 140",w.ev("Object.keys(B.T).length")===2&&w.ev("B.T.R.max")===140);
 right(w);await wait(200);T("team attack hits enemy team",(store.w.D||{}).B>0);
 const errs=ALL.flatMap(P=>P.errs);T("no script errors ("+errs.length+")",errs.length===0);if(errs.length)console.log(errs.slice(0,3));
 console.log(`\n${ok} passed, ${bad} failed`);process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});

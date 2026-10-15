// GitHub-like environment: no window.claude, PeerJS (mocked) star topology
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','dist','lexicon-brawl.html'),'utf8').replace(/<link[^>]*>/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ok=0,bad=0;const T=(n,c)=>{c?ok++:bad++;console.log((c?"PASS ":"FAIL ")+n)};
const reg={};
class Conn{constructor(peer){this.peer=peer;this.open=false;this.h={};this.o=null}on(e,f){(this.h[e]=this.h[e]||[]).push(f)}emit(e,a){(this.h[e]||[]).forEach(f=>f(a))}send(m){const o=this.o;setTimeout(()=>o&&o.emit("data",JSON.parse(JSON.stringify(m))),2)}close(){const o=this.o;this.open=false;setTimeout(()=>{this.emit("close");o&&o.emit("close")},2)}}
class Peer{constructor(id){this.id=id||"p"+Math.random().toString(36).slice(2,8);this.h={};setTimeout(()=>{if(id&&reg[id])this.emit("error",{type:"unavailable-id"});else{reg[this.id]=this;this.emit("open",this.id)}},3)}
on(e,f){(this.h[e]=this.h[e]||[]).push(f)}emit(e,a){(this.h[e]||[]).forEach(f=>f(a))}
connect(id){const host=reg[id],c=new Conn(id),s=new Conn(this.id);c.o=s;s.o=c;setTimeout(()=>{c.open=s.open=true;host.emit("connection",s);c.emit("open")},3);return c}}
const errs=[];
async function mk(name){const vc=new VirtualConsole();vc.on("jsdomError",e=>errs.push(e.message));
 const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/",virtualConsole:vc,beforeParse(w){w.Peer=Peer;w.speechSynthesis=undefined}});
 await wait(40);const P={name,w:dom.window,d:dom.window.document,ev:s=>dom.window.eval(s)};
 P.d.getElementById("t3").click();P.d.getElementById("nm").value=name;P.d.getElementById("rc").value="房间1";P.d.getElementById("go").click();await wait(120);return P}
(async()=>{
 const h=await mk("host"),b=await mk("b"),c=await mk("c");await wait(200);
 T("all 3 see each other through the host relay",[h,b,c].every(P=>P.ev("room.peers().length")===3));
 T("lobby shown, not an error",[h,b,c].every(P=>!P.d.getElementById("lb").hidden&&P.d.getElementById("jn").hidden));
 for(const P of [h,b,c]){P.d.querySelector('[data-a="rdy"]').click();await wait(120)}
 await wait(3700);
 T("all start the match together",[h,b,c].every(P=>P.ev("B.ph")==="play"));
 const q=P=>{const x=P.ev("W[B.q.c][2]");[...P.d.getElementById("op").children].find(e=>e.textContent.includes(x)).click()};
 q(b);await wait(1500);
 T("client boost is relayed to everyone (speed above base on every screen)",[h,c].every(P=>P.ev('B.cars.find(x=>x.raw==="b").v')>10.5));
 b.ev('B.inv=["fog"];B.lock="";use(0)');await wait(300);
 T("item event reaches its target",[h,c].some(P=>P.d.getElementById("card").classList.contains("fog")||P.ev("B.fx.fog>0")));
 // host leaves
 let lost=0;c.w.eval("Net.onLost=()=>{window.__lost=1}");for(const k of Object.keys(reg))if(k.startsWith("lexbrawl"))reg[k].emit("x");
 T("no script errors ("+errs.length+")",errs.length===0);if(errs.length)console.log(errs.slice(0,3));
 console.log(`${ok} passed, ${bad} failed`);process.exit(bad?1:0)})().catch(e=>{console.error(e);process.exit(2)});

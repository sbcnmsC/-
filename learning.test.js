const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','dist','lexicon-brawl.html'),'utf8').replace(/<link[^>]*>/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ok=0,bad=0;const T=(n,c)=>{c?ok++:bad++;console.log((c?"PASS ":"FAIL ")+n)};
(async()=>{const vc=new VirtualConsole(),errs=[];vc.on("jsdomError",e=>errs.push(e.message));
 const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/",virtualConsole:vc,beforeParse(w){w.speechSynthesis=undefined}});
 const w=dom.window,d=w.document,ev=s=>w.eval(s);await wait(60);
 // synonym clash: no distractor shares a meaning fragment with the answer (battle generator, many seeds)
 const bad1=ev(`(()=>{let n=0;B.seed="t";for(let k=0;k<3000;k++){const q=qk(k);if(new Set(q.o).size!==4)n++;q.o.forEach(o=>{if(o!==q.c&&clash(o,q.c))n++})}return n})()`);
 T("no synonym/duplicate options in 3000 battle questions",bad1===0);
 const imp=ev(`W.findIndex(x=>x[0]==="impact")`),inf=ev(`W.findIndex(x=>x[0]==="influence")`);
 T("impact and influence never appear together (clash detected)",ev(`clash(${imp},${inf})`)===true);
 // single mode: 300 questions
 let clashes=0;for(let i=0;i<300;i++){ev("Q=[Math.random()*W.length|0];next()");const c=ev("cur");[...d.getElementById("op").children].forEach(b=>{const o=+b.dataset.i;if(o!==c&&ev(`clash(${o},${c})`))clashes++})}
 T("no clashes in 300 single-mode questions",clashes===0);
 // shuffle uniformity
 const cnt=ev(`(()=>{const m={};for(let i=0;i<60000;i++){const k=shuf([0,1,2]).join("");m[k]=(m[k]||0)+1}return Object.values(m)})()`);
 T("shuffle uniform over 6 permutations "+JSON.stringify(cnt),cnt.length===6&&cnt.every(c=>Math.abs(c-10000)<500));
 // round restart
 ev("Q=build().slice(0,3);next()");
 for(let i=0;i<3;i++){const c=ev("W[cur][2]");[...d.getElementById("op").children].find(b=>b.textContent.includes(c)).click();d.getElementById("nx").click()}
 T("end of round shows 再来一轮",d.getElementById("wd").textContent.includes("本轮完成")&&d.getElementById("nx").textContent==="再来一轮"&&!d.getElementById("nx").hidden);
 d.getElementById("nx").click();T("再来一轮 starts a new round",!d.getElementById("wd").textContent.includes("本轮完成")&&d.getElementById("nx").textContent==="继续"||d.getElementById("nx").hidden);
 // day rollover
 ev('S.day="2000-01-01";S.done=7;S.last="2000-01-01"');const c=ev("W[cur][2]");[...d.getElementById("op").children].find(b=>b.textContent.includes(c)).click();
 T("daily counter resets after midnight rollover",ev("S.done")===1&&ev("S.streak")===1);
 T("no script errors",errs.length===0);if(errs.length)console.log(errs.slice(0,3));
 console.log(`${ok} passed, ${bad} failed`);process.exit(bad?1:0)})();

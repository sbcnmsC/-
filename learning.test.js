const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');
const html=fs.readFileSync(require('path').join(__dirname,'..','dist','lexicon-brawl.html'),'utf8').replace(/<link[^>]*>/,'');
const wait=ms=>new Promise(r=>setTimeout(r,ms));let ok=0,bad=0;const T=(n,c)=>{c?ok++:bad++;console.log((c?"PASS ":"FAIL ")+n)};
(async()=>{const vc=new VirtualConsole(),errs=[];vc.on("jsdomError",e=>errs.push(e.message));
 const dom=new JSDOM(html,{runScripts:"dangerously",pretendToBeVisual:true,url:"https://x.test/",virtualConsole:vc,beforeParse(w){w.speechSynthesis=undefined}});
 const w=dom.window,d=w.document,ev=s=>w.eval(s);await wait(60);
 // full-screen practice
 T("practice opens full-screen by default",d.getElementById("card").classList.contains("fs")&&d.body.classList.contains("fsmode"));
 ev("setN(5)");T("top bar shows round progress (1 / 5)",d.getElementById("fp").textContent==="1 / 5");
 { const c=ev("W[cur][2]");[...d.getElementById("op").children].find(b=>b.textContent.includes(c)).click();d.getElementById("nx").click();T("progress advances (2 / 5)",d.getElementById("fp").textContent==="2 / 5"); }
 d.getElementById("fx").click();T("✕ returns to the dashboard",!d.getElementById("card").classList.contains("fs")&&d.getElementById("card").hidden&&!d.getElementById("home").hidden&&!d.body.classList.contains("fsmode"));
 d.getElementById("st1").click();T("start button re-enters full screen",d.getElementById("card").classList.contains("fs")&&!d.getElementById("card").hidden&&d.getElementById("home").hidden);
 d.getElementById("t3").click();T("leaving the study tab drops full screen",!d.getElementById("card").classList.contains("fs")&&!d.body.classList.contains("fsmode"));
 d.getElementById("t1").click();T("returning to the study tab re-enters full screen",d.getElementById("card").classList.contains("fs"));
 d.querySelector('#fm [data-v="0"]').click();T("setting off: question shows inline again",!d.getElementById("card").classList.contains("fs")&&!d.getElementById("card").hidden&&d.getElementById("home").hidden&&!d.body.classList.contains("fsmode"));
 d.getElementById("t3").click();d.getElementById("t1").click();T("setting off persists across tabs",!d.getElementById("card").classList.contains("fs")&&ev("S.fs")===0);
 d.querySelector('#fm [data-v="1"]').click();d.getElementById("st1").click();T("setting on again: start button works",d.getElementById("card").classList.contains("fs"));
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
 // custom question count
 const qlen=n=>{ev(`setN(${n})`);return ev("Q.length")};
 T("custom count 5 -> 5 questions",qlen(5)===5);
 T("custom count 20 -> 20 questions",qlen(20)===20);
 d.getElementById("qc").value="7";d.getElementById("qc").dispatchEvent(new w.Event("change"));
 T("custom input 7 applied, presets deselected",ev("Q.length")===7&&ev("S.n")===7&&![...d.querySelectorAll("#qn button")].some(b=>b.classList.contains("on")));
 for(const bad of ["0","999","abc","3.5"]){d.getElementById("qc").value=bad;d.getElementById("qc").dispatchEvent(new w.Event("change"))}
 T("invalid input (0 / 999 / abc / 3.5) is rejected",ev("S.n")===7);
 d.querySelector('#qn [data-v="50"]').click();T("preset 50 -> 50 distinct questions",ev("Q.length")===50&&new Set(ev("Q")).size===50);
 // word range + order (fresh state)
 ev("S.w={};setN(10);setOrd(0);setLim(500)");T("range 前500: all new words come from the first 500",ev("Q.every(i=>i<500)"));
 T("list order: first 10 words in order",JSON.stringify(ev("Q"))===JSON.stringify([0,1,2,3,4,5,6,7,8,9]));
 ev("setOrd(1)");T("random order differs from list order",JSON.stringify(ev("Q"))!==JSON.stringify([0,1,2,3,4,5,6,7,8,9])&&ev("Q.every(i=>i<500)"));
 ev("setLim(0);setOrd(0)");
 // words without an example sentence
 const ne=ev("W.findIndex(x=>!x[3])");ev(`reveal(${ne})`);T("word without example: reveal shows word + meaning, no 'undefined'",!/undefined/.test(d.getElementById("ex").textContent)&&d.getElementById("ex").textContent.includes(ev(`W[${ne}][0]`)));
 ev(`S.w[${ne}]={b:0,due:0,m:2,r:0};plan()`);T("mistake list shows words without examples cleanly",!/undefined/.test(d.getElementById("ml").textContent));
 ev("for(let i=0;i<200;i++)S.w[i]={b:0,due:Date.now()+1e6,m:1+i%5,r:0};plan()");T("mistake list is capped at 50 rows (worst first) for large notebooks",d.querySelectorAll("#ml .li").length===50&&/其余 150 个/.test(d.getElementById("ml").textContent));
 T("bank is the full list (>= 9000 words)",ev("W.length")>=9000);

 // practice filler: all words learned and not due -> filler, correct answer keeps schedule
 ev('W.forEach((_,i)=>{S.w[i]={b:3,due:Date.now()+864e5*5,m:0,r:0}});setN(12)');
 T("when nothing is due, 12 extra-practice questions are filled",ev("Q.length")===12&&ev("EX.size")===12);
 const cw=ev("cur"),due0=ev("S.w[cur].due");const cc=ev("W[cur][2]");[...d.getElementById("op").children].find(b=>b.textContent.includes(cc)).click();
 T("extra practice does not move the review schedule",ev("S.w["+cw+"].due")===due0&&ev("S.w["+cw+"].b")===3);
 // day rollover
 d.getElementById("nx").click();ev('S.day="2000-01-01";S.done=7;S.last="2000-01-01"');const c=ev("W[cur][2]");[...d.getElementById("op").children].find(b=>b.textContent.includes(c)).click();
 T("daily counter resets after midnight rollover",ev("S.done")===1&&ev("S.streak")===1);
 T("no script errors",errs.length===0);if(errs.length)console.log(errs.slice(0,3));
 console.log(`${ok} passed, ${bad} failed`);process.exit(bad?1:0)})();

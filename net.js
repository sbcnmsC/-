/* Lexicon Brawl · net.js：联机传输层（GitHub Pages / 本地使用）
 * 在 Claude 发布页里，app.js 直接使用内置 room 能力，不会走这里。
 * 其余环境走 PeerJS（WebRTC）星型拓扑：先占用房间 ID 的人是房主，其他人连接房主，
 * 房主汇总并广播所有人的 presence。对外接口与 room 一致：peers() / presence(patch) / onPeers(fn)。
 * 房主离开则房间关闭（触发 Net.onLost）。 */
const Net={
onLost:null,
load(){return new Promise((ok,no)=>{if(window.Peer)return ok();const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js";s.onload=ok;s.onerror=()=>no(new Error("peerjs"));document.head.append(s)})},
join(code){return Net.load().then(()=>new Promise((res,rej)=>{
const hid="lexbrawl-"+[...code].map(c=>c.charCodeAt(0).toString(36)).join("").slice(0,40),S={},subs=[];let me="",host=false,conns=[],hc=null,done=false;
const emit=()=>subs.forEach(f=>f()),bc=()=>conns.forEach(c=>c.open&&c.send({t:"s",s:S}));
const api={peers:()=>Object.keys(S).map(k=>({peer:k,kind:"viewer",isMe:k===me,presence:S[k]})),
presence:async p=>{S[me]=Object.assign(S[me]||{},p);if(host)bc();else if(hc&&hc.open)hc.send({t:"p",d:p});emit()},
onPeers:f=>subs.push(f)};
const ok=()=>{if(!done){done=true;res(api)}},fail=e=>{if(!done){done=true;rej(e)}};
setTimeout(()=>fail(new Error("timeout")),12000);
const p=new Peer(hid);
p.on("open",()=>{host=true;me=hid;S[me]={};
p.on("connection",c=>{conns.push(c);
c.on("data",m=>{if(m&&m.t==="p"){S[c.peer]=Object.assign(S[c.peer]||{},m.d);bc();emit()}});
c.on("close",()=>{conns=conns.filter(x=>x!==c);delete S[c.peer];bc();emit()})});ok()});
p.on("error",e=>{if(e.type!=="unavailable-id")return fail(e);
const q=new Peer();q.on("error",fail);
q.on("open",id=>{me=id;hc=q.connect(hid,{reliable:true});
hc.on("open",()=>{S[me]={};ok()});
hc.on("data",m=>{if(m&&m.t==="s"){const mine=S[me];for(const k in S)delete S[k];Object.assign(S,m.s);S[me]=Object.assign({},S[me],mine);emit()}});
hc.on("close",()=>{for(const k in S)delete S[k];emit();Net.onLost&&Net.onLost()})})})}))}};

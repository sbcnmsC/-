/* Lexicon Brawl · main.js：初始化（需最后加载） */
Net.onLost=()=>{room=null;B.ph="off";["ar","lb","rsx","card"].forEach(i=>$(i).hidden=true);$("jn").hidden=false;$("jm").textContent="房主已离开，房间已关闭，请重新加入";toast("房主已离开")};
snd();qnUI();head();tab(1);

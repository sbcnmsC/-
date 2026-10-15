#!/usr/bin/env python3
"""把 index.html + style.css + words.js + net.js + app.js + battle.js + main.js 合并成单个 HTML（用于 Claude 页面发布或离线分享）。
用法：python3 tools/bundle.py   →  生成 dist/lexicon-brawl.html"""
import os
r=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..")
rd=lambda f:open(os.path.join(r,f),encoding="utf8").read()
h=rd("index.html")
h=h.replace('<link rel="stylesheet" href="style.css">',"<style>\n"+rd("style.css")+"</style>")
tags='<script src="words.js"></script>\n<script src="net.js"></script>\n<script src="app.js"></script>\n<script src="battle.js"></script>\n<script src="main.js"></script>'
assert tags in h
h=h.replace(tags,"<script>\n"+rd("words.js")+rd("net.js")+rd("app.js")+rd("battle.js")+rd("main.js")+"</script>")
os.makedirs(os.path.join(r,"dist"),exist_ok=True)
open(os.path.join(r,"dist","lexicon-brawl.html"),"w",encoding="utf8").write(h)
print("ok -> dist/lexicon-brawl.html",len(h.encode()),"bytes")

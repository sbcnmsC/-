"""从“痛单词 TOP 10000”类 PDF 提取词表。
步骤：
  1. pdftotext -bbox 词表.pdf all.html
  2. 准备 tesseract + chi_sim 模型（tessdata_fast 即可，含 configs 目录），设置 TESSDATA_PREFIX
  3. PDF=词表.pdf python3 tools/pdf_extract.py 1 334 full.jsonl   （页码范围、输出文件）
  4. python3 tools/build_words.py   → 覆盖仓库根目录的 words.js（会应用 tools/manual_fixes.json 的手工校对）
原理：PDF 文本层里部分汉字没有字形映射（提取时缺字），脚本按字符间距算出缺几个字，再用整页 OCR 的上下文补回；
行尾缺字则用 OCR 延伸并核对页面外隐藏的未映射字符（约 95% 吻合）。无法补全的片段整段丢弃，文本层完全没有释义的词改用整行 OCR。
"""
import re,html,subprocess,sys,json,os,collections
from PIL import Image
PDF=os.environ.get('PDF','painless-TOP_10000.pdf')
os.environ.setdefault('TESSDATA_PREFIX',os.path.abspath('tessdata'));os.environ['OMP_THREAD_LIMIT']='1'
ALL=open('all.html',encoding='utf8').read();PAGES=re.split(r'<page ',ALL)[1:]
WR=re.compile(r'<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">(.*?)</word>')
words=lambda pg:[(float(a),float(b),float(c),float(d),html.unescape(t)) for a,b,c,d,t in WR.findall(pg)]
CJK='\u4e00-\u9fff';FILL='['+CJK+'；，、]'
POS=re.compile(r'\s*(?<![A-Za-z])(n|v|vt|vi|adj|adv|prep|conj|pron|int|interj|num|art|aux|abbr|det)\.\s*')
def skeleton(toks):
    toks=sorted(toks);cur='';pe=None
    for t in toks:
        txt=t[4].replace('**','')
        if pe is None:cur=txt
        else:
            g=t[0]-pe;cur+=(' ' if g<5.5 else '⍰'*max(1,round(g/9.2)))+txt
        pe=t[2]
    return cur
def ocr_page(p):
    s=200/72;png=f'/tmp/pg{p}';subprocess.run(['pdftoppm','-f',str(p),'-l',str(p),'-r','200','-gray','-png',PDF,png],check=True)
    f=[x for x in os.listdir('/tmp') if x.startswith(f'pg{p}-')][0];im=Image.open('/tmp/'+f)
    y0=int(92*s);c=im.crop((int(131*s),y0,int(333*s),int(835*s)));c.save('/tmp/crop.png');os.remove('/tmp/'+f)
    out=subprocess.run(['tesseract','/tmp/crop.png','stdout','-l','chi_sim','--psm','6','tsv'],capture_output=True,text=True).stdout
    L=collections.OrderedDict()
    for ln in out.split('\n')[1:]:
        c_=ln.split('\t')
        if len(c_)<12 or c_[0]!='5':continue
        k=tuple(c_[2:5]);top,h=int(c_[7]),int(c_[9]);t=c_[11]
        e=L.setdefault(k,{'top':top,'bot':top+h,'t':''});e['top']=min(e['top'],top);e['bot']=max(e['bot'],top+h);e['t']+=t
    return [((y0+(e['top']+e['bot'])/2)/s,e['t'].replace(';','；')) for e in L.values()]
def fill(skel,O,stats):
    parts=re.split(r'(⍰+)',skel);out='';fills=[]
    for i,p in enumerate(parts):
        if not p.startswith('⍰'):out+=p;continue
        k=len(p);after=parts[i+1] if i+1<len(parts) else ''
        L=re.search('['+CJK+']{1,2}$',out);L=L.group(0) if L else '';R=re.match('['+CJK+']{1,2}',after);R=R.group(0) if R else ''
        mL=re.search('(['+CJK+']{1,2})[\\s,，;；]*$',out);mR=re.match('[\\s,，;；]*(['+CJK+']{1,2})',after);L2=mL.group(1) if mL else '';R2=mR.group(1) if mR else ''
        NZ='[^'+CJK+']{0,4}'
        tries=[(L,R,k,0),(L[-1:],R[:1],k,0),(L,R,k+1,0),(L[-1:],R[:1],k+1,0),(L,'',k,0),('',R,k,0),(L[-1:],'',k,0),('',R[:1],k,0),
               (L2,R2,k,1),(L2,'',k,1),('',R2,k,1)];got=None
        for l,r,kk,sep in tries:
            if not(l or r) or (kk>k and not(l and r)):continue
            m=re.search((re.escape(l)+(NZ if sep and l else ''))+'('+FILL+'{%d})'%kk+((NZ if sep and r else '')+re.escape(r)),O)
            if m and (kk==k or re.search('[；，]',m.group(1))) and (not sep or re.search('['+CJK+']',m.group(1))):got=m.group(1);break
        if got is None:stats['unres']+=1;out+='⍰'*k
        else:out+=got;fills+=list(got)
    return out,fills
def parse(text):
    t=text.strip();trunc=bool(re.search(r'(\.\.\.|…)\s*$',t));t=re.sub(r'(\.\.\.|…)\s*$','',t)
    cut=trunc and not re.search(r'[,，;；]\s*$',t);parts=POS.split(t);pos=[];segs=[]
    for i in range(1,len(parts),2):
        pos.append(parts[i]);segs+=re.split(r'[,，;；]\s*',parts[i+1])
    segs=[x.strip() for x in segs if x.strip()]
    if cut and len(segs)>1:segs=segs[:-1]          # 被 PDF 截断的最后一项不可靠，丢弃
    seen=[]
    for x in segs:
        if x not in seen and '⍰' not in x:seen.append(x)
    pp=[];[pp.append(x) for x in pos if x not in pp]
    return '/'.join(pp)+'.' if pp else '',seen
def page(p,stats):
    ws=words(PAGES[p-1]);body=[w for w in ws if 95<=w[1]<835];off=[w[4] for w in ws if w[1]>=835]
    wc=sorted([w for w in body if w[0]<130],key=lambda w:(round(w[1]),w[0]));rows=[]
    for w in wc:
        if rows and abs(rows[-1]['y']-w[1])<4:rows[-1]['w']+=' '+w[4]
        else:rows.append({'y':w[1],'w':w[4],'t':[]})
    for w in body:
        if w[0]>=130:
            r=min(rows,key=lambda r:abs(r['y']-w[1]))
            if abs(r['y']-w[1])<8:r['t'].append(w)
    oc=ocr_page(p);res=[];allfills=[]
    for r in rows:
        sk=skeleton(r['t']);cy=r['y']+6
        O=''.join(t for y,t in oc if abs(y-cy)<9)
        if '⍰' in sk:
            fx,fl=fill(sk,O,stats);allfills+=fl;stats['gaps']+=sk.count('⍰')
        else:fx=sk
        res.append({'w':r['w'],'raw':sk,'fx':fx,'ocr':O})
    left=collections.Counter(off)-collections.Counter(allfills)
    for r in res:
        while '⍰' in r['fx']:
            m=re.search('⍰+',r['fx']);k=len(m.group(0))
            if k!=1:break
            L=re.search('['+CJK+']{1,2}$',r['fx'][:m.start()]);R=re.match('['+CJK+']{1,2}',r['fx'][m.end():]);L=L.group(0) if L else '';R=R.group(0) if R else ''
            if not(L or R):break
            cand=[c for c in left if re.search(re.escape(L)+re.escape(c)+re.escape(R),r['ocr'])]
            if len(cand)!=1:break
            r['fx']=r['fx'][:m.start()]+cand[0]+r['fx'][m.end():];left[cand[0]]-=1;left+=collections.Counter();allfills.append(cand[0]);stats['unres']-=1;stats['rescued']+=1
    c=collections.Counter(off);d=collections.Counter(allfills)
    stats['off']+=sum(c.values());stats['fills']+=sum(d.values());stats['match']+=sum((c&d).values())
    return res
if __name__=='__main__':
    a,b=int(sys.argv[1]),int(sys.argv[2]);out=sys.argv[3];stats=collections.Counter()
    with open(out,'w',encoding='utf8') as f:
        for p in range(a,b+1):
            for r in page(p,stats):f.write(json.dumps({'p':p,**r},ensure_ascii=False)+'\n')
            if p%20==0:print('page',p,dict(stats),flush=True)
    print('DONE',dict(stats),flush=True)

import json,re,sys,collections,os
import sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import pdf_extract as E
ROOT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..')
rows=[json.loads(l) for l in open('full.jsonl',encoding='utf8')]
old=json.loads(re.search(r'const W=(\[.*\]);',open(os.path.join(ROOT,'words.js'),encoding='utf8').read(),re.S).group(1))
keep={w[0].lower():w for w in old if len(w)>3}          # 手写释义 + 例句的 48 个词
FX0=json.load(open('manual_fixes.json',encoding='utf8')) if os.path.exists('manual_fixes.json') else json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'manual_fixes.json'),encoding='utf8'))
seen=set();out=[];st=collections.Counter();ocr_only_list=[];gap_list=[]
import subprocess,os
def fills_of(raw,fx):
    parts=re.split('⍰+',raw);res=[];i=0
    for n,p in enumerate(parts):
        if fx[i:i+len(p)]!=p:return None
        i+=len(p)
        if n+1<len(parts):
            nxt=parts[n+1];k=fx.find(nxt,i) if nxt else len(fx)
            if k<0:return None
            res+=list(fx[i:k]);i=k
    return res
def extend_tail(fx,O,left):
    t=fx.rstrip()
    if re.search(r'(\.\.\.|…|[,，;；])\s*$',t):return fx
    m=re.search('(['+E.CJK+']+)$',t)
    if not m:return fx
    anchor=m.group(1)[-2:];mm=None
    for mm in re.finditer(re.escape(anchor)+'(['+E.CJK+']{1,2})(?!['+E.CJK+'])',O):pass
    if not mm:return fx
    ext=mm.group(1);c=collections.Counter(ext)
    if all(left[x]>=n for x,n in c.items()):
        left.subtract(c);return t+ext
    return fx
class _S(collections.Counter):pass
excess={}
for p in sorted({r['p'] for r in rows}):
    pr=[r for r in rows if r['p']==p];ws=E.words(E.PAGES[p-1]);off=collections.Counter(w[4] for w in ws if w[1]>=835);used=collections.Counter()
    for r in pr:
        if '⍰' in r['raw']:
            r['fx'],fl_=E.fill(r['raw'],r['ocr'],_S());used.update(fl_)
        else:r['fx']=r['raw']
    left=off-used
    for r in pr:
        while '⍰' in r['fx']:
            m=re.search('⍰+',r['fx']);k=len(m.group(0))
            if k!=1:break
            L=re.search('['+E.CJK+']{1,2}$',r['fx'][:m.start()]);R=re.match('['+E.CJK+']{1,2}',r['fx'][m.end():]);L=L.group(0) if L else '';R=R.group(0) if R else ''
            if not(L or R):break
            cand=[c for c in left if left[c]>0 and re.search(re.escape(L)+re.escape(c)+re.escape(R),r['ocr'])]
            if len(cand)!=1:break
            r['fx']=r['fx'][:m.start()]+cand[0]+r['fx'][m.end():];left[cand[0]]-=1
        r['fx']=extend_tail(r['fx'],r['ocr'],left)
    fl=collections.Counter()
    for r in rows:
        if r['p']==p:
            f=fills_of(r['raw'],r['fx']);r['fills']=f or []
            fl.update(r['fills'])
    excess[p]=set((fl-off).keys())
def row_ocr(p,w):
    ws=E.words(E.PAGES[p-1]);ys=[x[1] for x in ws if x[4]==w and x[0]<130 and 95<=x[1]<835]
    if not ys:return ''
    y=ys[0]-3;subprocess.run(['pdftoppm','-f',str(p),'-l',str(p),'-r','300','-gray','-x',str(int(131*300/72)),'-y',str(int(y*300/72)),'-W',str(int(202*300/72)),'-H',str(int(18*300/72)),'-png',E.PDF,'/tmp/rw'],check=True)
    f=[x for x in os.listdir('/tmp') if x.startswith('rw-')][0]
    t=subprocess.run(['tesseract','/tmp/'+f,'stdout','-l','chi_sim','--psm','7'],capture_output=True,text=True).stdout.strip();os.remove('/tmp/'+f)
    return t.replace(';','；')
def clean_segs(t):
    t=re.sub(r'^[^.]{0,6}\.\s*','',t.strip())          # 去掉 OCR 误识的词性前缀（如“站.”“adlj.”）
    m=re.search('[\u4e00-\u9fff]',t)
    if not m:return []
    t=re.sub(r'[*#%$?+=]+\s*',',',t[m.start():]);t=re.sub('[()（）]','',t);return [x.strip(' .…。') for x in re.split('[,，;；、]\\s*',t) if x.strip(' .…。')]
BAD=re.compile(r'[*#%$?+=<>\\|~^_@&\[\]{}「」\'"“”0-9]|[A-Za-z]{3,}')
for r in rows:
    w=r['w'].strip()
    if not re.fullmatch(r"[A-Za-z][A-Za-z\-' .]*",w):st['bad_word']+=1;continue
    k=w.lower()
    if k in seen:st['dup']+=1;continue
    seen.add(k)
    if k in keep:out.append(keep[k]);st['hand']+=1;continue
    pos,segs=E.parse(r['fx'])
    ex=excess.get(r['p'],set())&set(r['fills'])
    def good(s):return s and 1<=len(s)<=14 and not BAD.search(s) and re.search('[\u4e00-\u9fff]',s)
    segs=[s.strip(' .…。') for s in segs];segs=[s for s in segs if good(s) and not any(c in s for c in ex)]
    if not segs:      # 文本层没有可用释义：整行 OCR 兜底
        t=r['ocr'] if len(r['ocr'])>2 else row_ocr(r['p'],w)
        segs=[s for s in clean_segs(t) if good(s)][:3]
        if segs:st['ocr_only']+=1;ocr_only_list.append(w)
        if not pos:
            pm=E.POS.search(r['raw']);pos=''
    if not segs and k in FX0.get('add',{}):out.append([w,*FX0['add'][k]]);st['manual_add']+=1;continue
    if not segs:st['no_meaning']+=1;continue
    if '⍰' in r['fx']:st['row_with_gap_dropped_segments']+=1
    if r['fills']:gap_list.append(w)
    pos='/'.join(x if x.endswith('.') else x+'.' for x in pos.rstrip('.').split('/')) if pos else '';out.append([w,pos,'；'.join(segs[:3])]);st['ok']+=1
FX=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'manual_fixes.json') if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)),'manual_fixes.json')) else 'manual_fixes.json',encoding='utf8'))
for e in out:
    k=e[0].lower()
    if len(e)<4 and k in FX['meanings']:e[2]=FX['meanings'][k];st['manual']+=1
    if len(e)<4 and k in FX['pos']:e[1]=FX['pos'][k]
print(dict(st),'total',len(out))
open(os.path.join(ROOT,'words.js'),'w',encoding='utf8').write('// 词库（共 %d 词，按 PDF 词表顺序）。每项：["单词","词性","中文释义","例句(可选)"]，按此格式追加即可。\n// 前 48 个高频词有手写释义与例句；其余释义由 PDF 提取（OCR 补字），每词保留前 3 个释义。\nconst W=[\n'%len(out)+',\n'.join('  '+json.dumps(w,ensure_ascii=False,separators=(',',':')) for w in out)+'\n];\n')

json.dump({'ocr_only':ocr_only_list,'filled':gap_list},open('flags.json','w'),ensure_ascii=False)

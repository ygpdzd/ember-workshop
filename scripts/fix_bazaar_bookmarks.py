from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from lxml import etree
import os
p=Path(r'E:\FileSys\AIProject\tap01\docs\大巴扎_游戏设计分析_2026-09-26.docx')
with ZipFile(p) as z: data={n:z.read(n) for n in z.namelist()}
root=etree.fromstring(data['word/document.xml']); ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
stack=[]; count=0
for e in root.iter():
 if e.tag=='{'+ns['w']+'}bookmarkStart':
  count+=1; stack.append(str(count));e.set('{'+ns['w']+'}id',str(count))
 elif e.tag=='{'+ns['w']+'}bookmarkEnd':
  e.set('{'+ns['w']+'}id',stack.pop())
data['word/document.xml']=etree.tostring(root,encoding='UTF-8',xml_declaration=True,standalone=True)
t=p.with_suffix('.fixed.docx')
with ZipFile(t,'w',ZIP_DEFLATED) as z:
 for n,v in data.items():z.writestr(n,v)
os.replace(t,p)
print('Assigned unique IDs to',count,'source bookmarks')

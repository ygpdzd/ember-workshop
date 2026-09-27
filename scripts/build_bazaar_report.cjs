const fs = require('fs');
const path = require('path');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  Header, Footer, AlignmentType, LevelFormat, TableOfContents, HeadingLevel,
  BorderStyle, WidthType, ShadingType, PageNumber, TableLayoutType, Bookmark, InternalHyperlink } = require('C:/Users/86158/AppData/Roaming/npm/node_modules/docx');
const ROOT = 'E:/FileSys/AIProject/tap01';
const base = '大巴扎_游戏设计分析_2026-09-26';
const lines=fs.readFileSync(path.join(ROOT,'docs',base+'.md'),'utf8').replace(/^\uFEFF/,'').split(/\r?\n/);
const FONT={ascii:'Arial',hAnsi:'Arial',eastAsia:'Microsoft YaHei',cs:'Arial'};
const WIDTH=9586;
function runs(s,opts={}){
 const tokens=s.split(/(\*\*[^*]+\*\*|`[^`]+`|\[S\d{2}\])/g).filter(Boolean);
 return tokens.map(t=>{
  if(/^\[S\d{2}\]$/.test(t) && !opts.source) return new InternalHyperlink({anchor:t.slice(1,-1),children:[new TextRun({text:t,color:'176B75',size:18,...opts})]});
  return new TextRun({text:t.replace(/^\*\*|\*\*$/g,'').replace(/^`|`$/g,''),bold:t.startsWith('**')||opts.bold,...opts});
 });
}
function para(s,extra={}){return new Paragraph({children:runs(s),spacing:{after:100,line:300},...extra});}
function table(rows){
 const n=rows[0].length;
 let ws=n===3?[2300,3500,3786]:n===4?[1900,2500,2500,2686]:n===5?[1650,1984,1984,1984,1984]:Array(n).fill(Math.floor(WIDTH/n));
 ws[ws.length-1]+=WIDTH-ws.reduce((a,b)=>a+b,0);
 const border={style:BorderStyle.SINGLE,size:4,color:'D7E0E4'};
 return new Table({width:{size:WIDTH,type:WidthType.DXA},columnWidths:ws,layout:TableLayoutType.FIXED,
  rows:rows.map((row,ri)=>new TableRow({tableHeader:ri===0,cantSplit:true,children:row.map((text,ci)=>new TableCell({
   width:{size:ws[ci],type:WidthType.DXA},margins:{top:100,bottom:100,left:120,right:120},
   shading:{fill:ri===0?'E7F0F2':(ri%2===0?'F6F8F9':'FFFFFF'),type:ShadingType.CLEAR},
   borders:{top:border,bottom:border,left:border,right:border},
   children:[new Paragraph({children:runs(text,{size:19,bold:ri===0}),spacing:{after:30,line:270},widowControl:true})]
  }))}))});
}
const children=[];
children.push(new Paragraph({spacing:{before:1900,after:260},children:[new TextRun({text:'THE BAZAAR',size:24,color:'176B75',bold:true,characterSpacing:90})]}));
children.push(new Paragraph({children:[new TextRun({text:'《大巴扎》',size:62,bold:true,color:'102737'})],spacing:{after:180}}));
children.push(new Paragraph({children:[new TextRun({text:'游戏设计拆解',size:54,bold:true,color:'102737'})],spacing:{after:480}}));
children.push(para('从异步构筑到风险管理',{children:[new TextRun({text:'从异步构筑到风险管理',size:30,color:'415B6A'})],spacing:{after:120}}));
children.push(para('机制、体验与可迁移原则',{children:[new TextRun({text:'机制、体验与可迁移原则',size:25,color:'415B6A'})],spacing:{after:600}}));
children.push(para('资料截止：2026-09-26（北京时间）',{spacing:{after:140}}));
children.push(para('版本锚点：18.3 / 2026-09-16',{spacing:{after:300}}));
children.push(para('面向游戏策划、系统设计与原型团队',{children:[new TextRun({text:'面向游戏策划、系统设计与原型团队',size:21,color:'647581'})],spacing:{after:150}}));
children.push(para('桌面研究 · 事实与判断分列 · 非强度榜',{children:[new TextRun({text:'桌面研究 · 事实与判断分列 · 非强度榜',size:21,color:'647581'})]}));
children.push(new Paragraph({pageBreakBefore:true,children:[new TextRun({text:'阅读导航',size:32,bold:true})],spacing:{after:220}}));
children.push(new TableOfContents('目录',{hyperlink:true,headingStyleRange:'1-1'}));
children.push(para('正文中的 [Sxx] 为参考资料编号，可跳转至文末出处。分析示意图为作者绘制，不是游戏截图。',{spacing:{before:220,after:100},children:[new TextRun({text:'正文中的 [Sxx] 为参考资料编号，可跳转至文末出处。分析示意图为作者绘制，不是游戏截图。',size:19,color:'647581'})]}));
let first=true;
for(let i=4;i<lines.length;i++){
 const l=lines[i].trim();if(!l)continue;
 if(l.startsWith('## ')){
  const text=l.slice(3);children.push(new Paragraph({heading:HeadingLevel.HEADING_1,pageBreakBefore:text.startsWith('1. 产品')||text.startsWith('9. 用真实')||text==='参考资料与证据分级',children:runs(text),spacing:{before:280,after:150},keepNext:true}));continue;
 }
 if(l.startsWith('### ')){
  children.push(new Paragraph({heading:HeadingLevel.HEADING_2,children:runs(l.slice(4)),spacing:{before:220,after:110},keepNext:true}));continue;
 }
 if(l.startsWith('|')){
  const rows=[];
  while(i<lines.length&&lines[i].trim().startsWith('|')){
   const cells=lines[i].trim().split('|').slice(1,-1).map(x=>x.trim());
   if(!cells.every(c=>/^:?-+:?$/.test(c)))rows.push(cells);i++;
  }i--;children.push(table(rows));children.push(para('',{spacing:{after:50,line:80}}));continue;
 }
 const image=l.match(/^!\[(.*?)\]\((.*?)\)$/);
 if(image){
  const p=path.join(ROOT,'docs',image[2]);const height=image[2].includes('core_loop')?291:277;
  children.push(new Paragraph({alignment:AlignmentType.CENTER,keepNext:true,children:[new ImageRun({type:'png',data:fs.readFileSync(p),transformation:{width:618,height},altText:{title:image[1],description:image[1],name:path.basename(p)}})],spacing:{before:80,after:60}}));
  children.push(new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:image[1],size:18,color:'647581'})],spacing:{after:160}}));continue;
 }
 if(l.startsWith('- ')){children.push(new Paragraph({children:runs(l.slice(2)),numbering:{reference:'bullet',level:0},spacing:{after:85,line:300},widowControl:true}));continue;}
 if(l.startsWith('> ')){children.push(para(l.slice(2),{shading:{fill:'EFF5F5',type:ShadingType.CLEAR},indent:{left:160,right:160},spacing:{before:120,after:160,line:310},border:{left:{style:BorderStyle.SINGLE,size:14,color:'176B75',space:9}}}));continue;}
 if(/^\[S\d{2}\]/.test(l)){
  const id=l.match(/^\[(S\d{2})\]/)[1];children.push(new Paragraph({children:[new Bookmark({id,children:runs(l,{source:true,size:19})})],spacing:{after:150,line:290},widowControl:true}));continue;
 }
 const ex=first?{pageBreakBefore:true}:{};first=false;children.push(para(l,ex));
}
const doc=new Document({creator:'Research',title:'大巴扎：游戏设计拆解',subject:'The Bazaar 的机制、体验与可迁移原则',description:'基于公开来源的中文游戏设计分析，检索截止 2026-09-26。',
 features:{updateFields:true},
 styles:{default:{document:{run:{font:FONT,size:22,color:'263A46'},paragraph:{spacing:{after:100,line:300},widowControl:true}}},paragraphStyles:[
 {id:'Normal',name:'Normal',run:{font:FONT,size:22},paragraph:{spacing:{after:100,line:300},widowControl:true}},
 {id:'Heading1',name:'Heading 1',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:31,bold:true,color:'143949'},paragraph:{outlineLevel:0,keepNext:true,spacing:{before:280,after:150}}},
 {id:'Heading2',name:'Heading 2',basedOn:'Normal',next:'Normal',quickFormat:true,run:{font:FONT,size:25,bold:true,color:'234E5B'},paragraph:{outlineLevel:1,keepNext:true,spacing:{before:220,after:110}}},
 {id:'TOC1',name:'toc 1',basedOn:'Normal',run:{font:FONT,size:21},paragraph:{spacing:{after:110,line:290}}}
 ]},
 numbering:{config:[{reference:'bullet',levels:[{level:0,format:LevelFormat.BULLET,text:'•',alignment:AlignmentType.LEFT,style:{paragraph:{indent:{left:330,hanging:220}}}}]}]},
 sections:[{properties:{titlePage:true,page:{size:{width:11906,height:16838},margin:{top:1160,bottom:1130,left:1160,right:1160,header:480,footer:500}}},
 headers:{default:new Header({children:[new Paragraph({children:[new TextRun({text:'THE BAZAAR  /  游戏设计拆解',size:17,color:'627480'})],spacing:{after:100},border:{bottom:{style:BorderStyle.SINGLE,color:'D7E0E4',size:4,space:6}}})]})},
 footers:{default:new Footer({children:[new Paragraph({alignment:AlignmentType.RIGHT,children:[new TextRun({text:'桌面研究 · 2026-09-26    |    ',size:16,color:'627480'}),new TextRun({children:[PageNumber.CURRENT],size:16,color:'627480'})]})]})},children}]
});
Packer.toBuffer(doc).then(b=>{const out=path.join(ROOT,'docs',base+'.docx');fs.writeFileSync(out,b);console.log(JSON.stringify({output:out,bytes:b.length,blocks:children.length}));});


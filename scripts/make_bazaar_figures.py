from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math
ROOT=Path(r'E:\FileSys\AIProject\tap01')
ASSETS=ROOT/'docs'/'assets'; ASSETS.mkdir(exist_ok=True)
FONTS=Path(r'C:\Windows\Fonts')
def font(n,b=False): return ImageFont.truetype(str(FONTS/('msyhbd.ttc' if b else 'msyh.ttc')),n)
ink='#182F40'; muted='#526572'; teal='#176B75'; pale='#EAF3F4'; gold='#B48739'
def center(d,text,box,size=30,b=False,color=ink):
 x0,y0,x1,y1=box; f=font(size,b); lines=text.split('\n'); h=size*1.55; sy=(y0+y1-h*len(lines))/2
 for i,line in enumerate(lines):
  w=d.textlength(line,font=f);d.text(((x0+x1-w)/2,sy+i*h),line,font=f,fill=color)
def arrow(d,pts,c=teal,w=5):
 d.line(pts,fill=c,width=w,joint='curve');x,y=pts[-1];px,py=pts[-2];a=math.atan2(y-py,x-px)
 d.polygon([(x,y),(x-19*math.cos(a-.48),y-19*math.sin(a-.48)),(x-19*math.cos(a+.48),y-19*math.sin(a+.48))],fill=c)
im=Image.new('RGB',(1800,850),'white');d=ImageDraw.Draw(im)
d.text((50,25),'核心循环：计划不是终点，战斗才是检验',font=font(38,True),fill=ink)
d.text((50,86),'作者分析示意｜顺序概括主要决策，不代表完整事件日程',font=font(24),fill=muted)
boxes=[(75,165,525,325),(675,165,1125,325),(1275,165,1725,325),(1275,435,1725,595),(675,435,1125,595),(75,435,525,595)]
labels=['读取供给\n看见商店、事件与奖励','比较成本\n金币 · 日程 · 空间 · 容错','购买与摆放\n建立或修补一个组合','自动战斗\nPvE / 玩家构筑快照','读取结果\n何时启动，哪里失效','保留 / 替换 / 转型\n把本轮信息带入下一轮']
for i,(b,t) in enumerate(zip(boxes,labels)):
 d.rounded_rectangle(b,radius=22,fill=pale,outline='#8FB6BC',width=3);center(d,t,b,31,i in [2,3]);d.text((b[0]+15,b[1]+9),str(i+1).zfill(2),font=font(20,True),fill=teal)
arrow(d,[(525,245),(675,245)]);arrow(d,[(1125,245),(1275,245)]);arrow(d,[(1500,325),(1500,435)]);arrow(d,[(1275,515),(1125,515)]);arrow(d,[(675,515),(525,515)]);arrow(d,[(75,515),(30,515),(30,245),(75,245)])
d.rounded_rectangle((75,665,1725,800),radius=18,fill='#F7F2E8')
center(d,'长期循环：本局物品会重置，判断能力与规则知识被保留\n核心问题：玩家是否学会了下一次可以验证的东西？',(75,665,1725,800),29,False)
im.save(ASSETS/'core_loop.png')
im=Image.new('RGB',(1800,810),'white');d=ImageDraw.Draw(im)
d.text((50,25),'组合网络：调节放大器，不只盯着最终伤害',font=font(38,True),fill=ink)
d.text((50,86),'作者分析模型｜不是某套真实构筑，也不表示游戏存在无条件无限循环',font=font(24),fill=muted)
bs=[(80,200,480,360),(700,200,1100,360),(1320,200,1720,360)]
for b,t in zip(bs,['启动件 A\n第一次可靠激活','加速 / 反馈件 B\n让下一次更快或更强','收益件 C\n把触发转成胜利条件']):
 d.rounded_rectangle(b,radius=22,fill=pale,outline='#8FB6BC',width=3);center(d,t,b,31,True)
arrow(d,[(480,280),(700,280)]);arrow(d,[(1100,280),(1320,280)])
arrow(d,[(900,360),(900,445),(280,445),(280,360)],c=gold)
center(d,'条件满足时，反馈到前端',(380,383,790,442),25,False,gold)
d.rounded_rectangle((220,550,1580,680),radius=20,fill='#F1F4F6',outline='#CCD6DD',width=2)
center(d,'生存 / 控制 / 空间限制\n决定系统有没有运行时间，以及玩家付出了什么代价',(220,550,1580,680),28)
arrow(d,[(900,550),(900,480)],c=muted)
d.text((80,737),'检查顺序：启动时点 → 反馈强度 → 生存条件 → 结果转化',font=font(28,True),fill=teal)
im.save(ASSETS/'trigger_network.png')
print('Created two analysis diagrams')

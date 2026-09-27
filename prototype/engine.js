(function(root){
'use strict';
// Prototype rules, not a reproduction of The Bazaar or Noita.
const KEYWORDS={
 haste:{name:'加速',target:'wand',kind:'duration',icon:'»',color:'#e3c47d',desc:'目标法杖计时速度×1.5，持续时间由卡牌指定。重复施加刷新，不叠加强度；与减速相乘。'},
 slow:{name:'减速',target:'wand',kind:'duration',icon:'❄',color:'#8fdbed',desc:'目标法杖计时速度×0.7，持续时间由卡牌指定。重复施加刷新，不叠加强度；与加速同时存在时为×1.05。'},
 charge:{name:'充能',target:'wand',kind:'instant',icon:'↗',color:'#a9d9ec',desc:'立即扣减目标法杖当前剩余计时，数值由卡牌指定。最低为0，溢出丢弃；下一模拟步施放，不增加第二条资源。'},
 burn:{name:'灼烧',target:'character',kind:'stack',icon:'♨',color:'#f59b64',desc:'每秒造成层数等量伤害，先扣护盾，然后减少1层。无视固定减伤；上限30层。'},
 poison:{name:'中毒',target:'character',kind:'stack',icon:'☠',color:'#acd774',desc:'每秒造成层数等量生命伤害，无视护盾和固定减伤。不自然衰减，上限30层；可被净化。'},
 shock:{name:'感电',target:'character',kind:'stack',icon:'ϟ',color:'#edd97f',desc:'每次被弹丸命中消耗1层，该次直伤额外+6。持续伤害不触发；上限6层。'},
 shield:{name:'护盾',target:'character',kind:'pool',icon:'⬡',color:'#7ed8be',desc:'优先吸收直伤和灼烧，不能阻挡中毒，也不阻止状态附着。上限55，不自然衰减。'}
};
const SPELLS={
 surge:{name:'疾行符',icon:'»',type:'辅助',keyword:'haste',color:'#e3c47d',effects:[{when:'cast',target:'selfWand',keyword:'haste',duration:3}],desc:'施放时：自身法杖加速3秒，计时速度×1.5。占用一次施法。'},
 charge:{name:'充能符',icon:'↗',type:'辅助',keyword:'charge',color:'#a9d9ec',effects:[{when:'cast',target:'selfWand',keyword:'charge',amount:.5}],desc:'施放时：自身法杖充能0.5秒，立即减少下一发的剩余计时。溢出不保留。'},
 relay:{name:'回响弹',icon:'⤴',type:'弹丸',keyword:'charge',color:'#a9d9ec',damage:5,speed:400,effects:[{when:'hit',target:'selfWand',keyword:'charge',amount:.25}],desc:'5直伤，命中敌方角色时：自身法杖充能0.25秒。命中障碍不充能。'},
 spark:{name:'火花弹',icon:'✦',type:'弹丸',color:'#efbc65',damage:10,speed:450,desc:'10直伤。快速、可靠的基础弹丸；可消耗感电层数。'},
 ember:{name:'余烬弹',icon:'♨',type:'弹丸',keyword:'burn',color:'#f59b64',damage:4,speed:400,desc:'4直伤，施加4层灼烧。每秒按层数伤害，随后减少1层。'},
 venom:{name:'毒刺',icon:'☠',type:'弹丸',keyword:'poison',color:'#acd774',damage:2,speed:420,desc:'2直伤，施加2层中毒。每秒穿盾伤害，不自然衰减。'},
 ice:{name:'冰针',icon:'❄',type:'弹丸',keyword:'slow',effects:[{when:'hit',target:'enemyWand',keyword:'slow',duration:2}],color:'#8fdbed',damage:5,speed:360,desc:'5直伤，命中后使敌方法杖减速2秒：计时速度×0.7；重复命中刷新。'},
 shock:{name:'电弧',icon:'ϟ',type:'弹丸',keyword:'shock',color:'#edd97f',damage:6,speed:480,desc:'6直伤，施加2层感电。后续弹丸每次命中消耗1层，直伤+6。'},
 detonate:{name:'引爆弹',icon:'✹',type:'弹丸',action:'消耗灼烧',color:'#f38f80',damage:8,speed:400,desc:'8直伤，消耗目标全部灼烧；每层追加2伤害，提前兑现灼烧。'},
 shield:{name:'护盾术',icon:'⬡',type:'辅助',keyword:'shield',color:'#7ed8be',desc:'自身获得17护盾，上限55。能阻挡直伤和灼烧，不能阻挡中毒。'},
 cleanse:{name:'净化',icon:'✧',type:'辅助',action:'移除负面',color:'#8cdac9',desc:'自身灼烧、中毒各减3层；清除自身感电及自身法杖减速，回复4生命。'},
 heal:{name:'修复',icon:'+',type:'辅助',color:'#7ed8be',desc:'自身回复11生命，不超过生命上限；不清除负面状态。'},
 bomb:{name:'爆裂弹',icon:'◈',type:'弹丸',color:'#f58a6c',damage:16,speed:265,desc:'16直伤。慢速弹丸，爆炸仅为视觉效果，不造成范围伤害。'},
 lance:{name:'重矛',icon:'◆',type:'弹丸',color:'#f58a6c',damage:20,speed:230,desc:'20直伤。弹速慢，命中更晚，适合突破固定减伤。'},
 trigger:{name:'命中触发',icon:'⌖',type:'结构',advanced:true,color:'#b9a0ef',damage:4,speed:400,desc:'进阶：发射载体，命中敌人或障碍后执行下一个完整组合。'},
 double:{name:'双重施放',icon:'⑵',type:'结构',advanced:true,color:'#b9a0ef',desc:'进阶：同时执行后面两个完整组合，共占用一次施法。'},
 power:{name:'强化',icon:'↑',type:'修饰',advanced:true,color:'#efbc65',desc:'进阶：下一个组合及载荷的基础直伤×1.7。不增加状态层数、感电或引爆追加伤害。'},
 haste:{name:'弹速强化',icon:'»',type:'修饰',advanced:true,color:'#8fdbed',desc:'进阶：下一个组合及载荷的弹速×1.65，不改变施法间隔。'},
 pierce:{name:'穿透',icon:'⇢',type:'修饰',advanced:true,color:'#8fdbed',desc:'进阶：下一个组合及载荷穿过中场障碍，不在障碍上触发。'}
};
const WANDS={
 balanced:{name:'铜枝 · 均衡',interval:.95,power:1},
 rapid:{name:'蜂鸣 · 速射',interval:.65,power:.65},
 deep:{name:'沉星 · 重击',interval:1.3,power:1.45}
};
const PRESETS={
 tempo:{name:'加速充能',cards:['surge','relay','charge','lance']},
 burn:{name:'灼烧引爆',cards:['ember','ember','detonate']},
 poison:{name:'毒盾消耗',cards:['venom','shield','ice']},
 shock:{name:'感电连击',cards:['shock','spark','spark']},
 defense:{name:'净化反击',cards:['cleanse','shield','lance']},
 steady:{name:'稳定速射',cards:['spark','spark','ice']},
 payload:{name:'进阶·触发爆发',cards:['trigger','double','ember','detonate']}
};
const ENEMIES={
 sentinel:{name:'哨卫',desc:'基础弹丸循环，适合对照。',cards:['spark','spark','ice'],wand:'balanced',armor:0},
 bulwark:{name:'壁垒',desc:'固定减伤3与周期护盾；可以测试中毒穿盾。',cards:['shield','spark','bomb'],wand:'balanced',armor:3},
 gunner:{name:'蜂群',desc:'快速弹丸，低单发伤害。',cards:['spark','spark'],wand:'rapid',armor:0},
 alchemist:{name:'蚀火术士',desc:'交替施加灼烧与中毒，适合测试净化。',cards:['ember','venom','spark'],wand:'balanced',armor:0}
};
function compile(cards){
 let at=0;const errors=[];
 function read(depth=0){
  if(at>=cards.length)throw Error('进阶组合缺少后续法术，请补齐或移除结构模块。');
  if(depth>8)throw Error('嵌套超过8层。');
  const index=at++,id=cards[index],s=SPELLS[id];if(!s)throw Error('未知法术：'+id);
  const n={id,index,children:[]};
  const count=id==='double'?2:['trigger','power','haste','pierce'].includes(id)?1:0;
  for(let i=0;i<count;i++)n.children.push(read(depth+1));
  return n;
 }
 const roots=[];
 try{if(cards.length>8)throw Error('最多装填8个法术槽。');while(at<cards.length)roots.push(read());if(!roots.length)errors.push('请先装入至少一个法术。');}catch(e){errors.push(e.message);}
 return {roots,errors};
}
function treeText(n,indent=''){return indent+SPELLS[n.id].name+n.children.map(c=>'\n'+treeText(c,indent+'  └ ')).join('');}
class Battle{
 constructor(config={}){
  this.time=0;this.projectiles=[];this.effects=[];this.events=[];this.result=null;this.nextId=1;this.sequence=0;this.traces=[];this.nextCastId=1;
  this.wall=config.wall?{x:480,hp:50,max:50}:null;
  const enemy=ENEMIES[config.enemy||'sentinel'];if(!enemy)throw Error('未知对手。');
  this.units=[this.unit(0,config.cards||PRESETS.burn.cards,config.wand||'balanced',0),this.unit(1,enemy.cards,enemy.wand,enemy.armor)];
  this.units.forEach(u=>{if(u.program.errors.length)throw Error(u.program.errors.join(' '));});
  this.log('实验启动 · 从左到右自动施法，末尾直接循环','system');
 }
 unit(side,cards,wand,armor){const w=WANDS[wand];if(!w)throw Error('未知法杖。');return {side,x:side?835:125,y:205,hp:220,maxHp:220,shield:0,interval:w.interval,power:w.power,armor,program:compile(cards),cards:[...cards],cursor:0,timer:w.interval,timerTotal:w.interval,status:'施法倒计时',slowUntil:0,hasteUntil:0,lastChargeAt:-99,lastChargeAmount:0,burn:0,poison:0,shock:0,burnAt:0,poisonAt:0,lastIndex:-1,lastCastAt:-99,lastTrace:null,stats:{casts:0,damage:0,dot:0,absorbed:0,triggers:0,detonations:0,cleansed:0}};}
 log(text,kind='cast'){this.events.push({id:++this.sequence,t:this.time,text,kind});if(this.events.length>180)this.events.shift();}
 fx(x,y,color,text='',r=15){this.effects.push({x,y,color,text,r,life:.6,max:.6});}
 // Actual HP loss, not overkill, is counted; status ticks bypass fixed armor.
 damage(target,source,amount,{bypassShield=false,armor=false,dot=false}={}){
  const raw=Math.max(0,amount-(armor?target.armor:0)),blocked=bypassShield?0:Math.min(target.shield,raw);
  target.shield-=blocked;const loss=Math.min(target.hp,raw-blocked);target.hp-=loss;
  source.stats.damage+=loss;if(dot)source.stats.dot+=loss;target.stats.absorbed+=blocked;
  return {loss,blocked};
 }
 addStatus(target,kind,amount){
  const cap=kind==='shock'?6:30,was=target[kind];target[kind]=Math.min(cap,was+amount);
  if(!was&&kind!=='shock')target[kind+'At']=this.time+1;
  this.log((target.side?'敌方':'我方')+'获得'+KEYWORDS[kind].name+' '+(target[kind]-was)+'层（现'+target[kind]+'层）','status');
 }
 // Wand keywords are reusable effects, not individual spell implementations.
 wandRate(u){return (u.hasteUntil>this.time?1.5:1)*(u.slowUntil>this.time?.7:1);}
 wandEffect(u,e){
  const k=KEYWORDS[e.keyword];
  if(e.keyword==='charge'){
   const before=Math.max(0,u.timer);u.timer=Math.max(0,before-e.amount);
   u.lastChargeAt=this.time;u.lastChargeAmount=before-u.timer;
   this.fx(u.x+(u.side?-23:23),u.y,k.color,'充能 −'+u.lastChargeAmount.toFixed(2)+'s');
   this.log((u.side?'敌方':'我方')+'法杖充能：剩余 '+before.toFixed(2)+'s → '+u.timer.toFixed(2)+'s','status');
  }else{
   const field=e.keyword==='haste'?'hasteUntil':'slowUntil';u[field]=Math.max(u[field],this.time+e.duration);
   this.fx(u.x+(u.side?-23:23),u.y,k.color,k.name+' '+e.duration+'s');
   this.log((u.side?'敌方':'我方')+'法杖'+k.name+' '+e.duration+'秒','status');
  }
 }
 spellEffects(id,when,source){
  for(const e of SPELLS[id].effects||[])if(e.when===when)this.wandEffect(e.target==='selfWand'?source:this.units[1-source.side],e);
 }
 tickStatuses(){
  for(const u of this.units){const source=this.units[1-u.side];
   for(const kind of ['burn','poison']){
    if(u[kind]&&this.time+1e-9>=u[kind+'At']){
     const {loss,blocked}=this.damage(u,source,u[kind],{bypassShield:kind==='poison',dot:true});
     this.fx(u.x,u.y,KEYWORDS[kind].color,KEYWORDS[kind].name+' −'+Math.round(loss),24);
     this.log((u.side?'敌方':'我方')+KEYWORDS[kind].name+'结算：'+loss.toFixed(1)+'伤害'+(blocked?'，护盾吸收'+blocked.toFixed(1):''),'status');
     if(kind==='burn')u.burn--;u[kind+'At']=u[kind]?u[kind+'At']+1:0;
    }
   }
  }
 }
 cast(n,u,x,y,mods={damage:1,speed:1,pierce:false},trace=null){
  const id=n.id;this.spellEffects(id,'cast',u);if(trace)trace.nodes[n.index]=this.time;
  if(id==='double'){n.children.forEach(c=>this.cast(c,u,x,y,mods,trace));return;}
  if(['power','haste','pierce'].includes(id)){const m={...mods};if(id==='power')m.damage*=1.7;if(id==='haste')m.speed*=1.65;if(id==='pierce')m.pierce=true;this.cast(n.children[0],u,x,y,m,trace);return;}
  if(id==='surge'||id==='charge')return;
  if(id==='shield'){u.shield=Math.min(55,u.shield+17);this.fx(u.x,u.y,'#7ed8be','+护盾');return;}
  if(id==='heal'){u.hp=Math.min(u.maxHp,u.hp+11);this.fx(u.x,u.y,'#7ed8be','+11 HP');return;}
  if(id==='cleanse'){
   u.stats.cleansed+=Math.min(3,u.burn)+Math.min(3,u.poison)+u.shock+(u.slowUntil>this.time?1:0);
   u.burn=Math.max(0,u.burn-3);u.poison=Math.max(0,u.poison-3);u.shock=0;u.slowUntil=0;
   if(!u.burn)u.burnAt=0;if(!u.poison)u.poisonAt=0;
   u.hp=Math.min(u.maxHp,u.hp+4);this.fx(u.x,u.y,'#8cdac9','净化 +4 HP');this.log((u.side?'敌方':'我方')+'净化：灼烧/中毒各−3，清除角色感电/法杖减速','status');return;
  }
  const s=SPELLS[id],target=this.units[1-u.side],speed=s.speed*mods.speed;
  const offset=((this.nextId%3)-1)*12,dy=target.y-(y+offset),dx=target.x-x,len=Math.hypot(dx,dy)||1;
  this.projectiles.push({id:this.nextId++,side:u.side,x,y:y+offset,px:x,py:y+offset,vx:dx/len*speed,vy:dy/len*speed,damage:s.damage*mods.damage*u.power,type:id,pierce:mods.pierce,payload:n.children[0]||null,mods:{...mods},trace,age:0,color:s.color});
 }
 hit(p,target){
  const source=this.units[p.side];let extra=0;
  if(target.shock){target.shock--;extra+=6;this.fx(target.x,target.y,KEYWORDS.shock.color,'感电 +6');this.log('感电消耗1层 → 本次命中+6直伤','status');}
  if(p.type==='detonate'&&target.burn){const stacks=target.burn;extra+=stacks*2;target.burn=0;target.burnAt=0;source.stats.detonations++;this.fx(target.x,target.y,SPELLS.detonate.color,'引爆 '+stacks+'层',48);this.log((p.side?'敌方':'我方')+'引爆'+stacks+'层灼烧 → +'+stacks*2+'直伤','status');}
  const {loss,blocked}=this.damage(target,source,p.damage+extra,{armor:true});
  if(p.trace)p.trace.hits++;
  // A shield blocks damage, not status application. Walls do not receive statuses.
  this.spellEffects(p.type,'hit',source);
  if(p.type==='ember')this.addStatus(target,'burn',4);
  if(p.type==='venom')this.addStatus(target,'poison',2);
  if(p.type==='shock')this.addStatus(target,'shock',2);
  this.fx(target.x,target.y,p.color,blocked&&!loss?'格挡':('-'+Math.round(loss)),p.type==='bomb'?55:20);
  this.log((p.side?'敌方':'我方')+SPELLS[p.type].name+'命中：'+loss.toFixed(1)+'伤害'+(blocked?'，护盾吸收'+blocked.toFixed(1):''),'hit');
 }
 step(dt=1/60){
  if(this.result)return;
  if(!Number.isFinite(dt)||dt<=0||dt>1/30)throw Error('请使用不超过1/30秒的固定步长。');
  this.time+=dt;
  // Both sides resolve this step before deciding the outcome, including DoT lethals.
  for(const u of this.units){
   u.timer-=dt*this.wandRate(u);if(u.timer>1e-9)continue;
   const n=u.program.roots[u.cursor];u.stats.casts++;u.lastIndex=n.index;u.lastCastAt=this.time;
   const trace={id:this.nextCastId++,side:u.side,root:n.index,group:u.cursor+1,time:this.time,nodes:{},triggers:[],hits:0,wallHits:0,expired:0};
   this.traces.push(trace);if(this.traces.length>120)this.traces.shift();u.lastTrace=trace;
   this.log((u.side?'敌方':'我方')+'施放 '+SPELLS[n.id].name);
   // Set up the next cast BEFORE effects; self-charge must not be overwritten.
   u.cursor=(u.cursor+1)%u.program.roots.length;u.timer=u.interval;u.timerTotal=u.interval;
   this.cast(n,u,u.x+(u.side?-23:23),u.y,undefined,trace);
  }
  const current=this.projectiles;this.projectiles=[];
  for(const p of current){
   p.px=p.x;p.py=p.y;p.x+=p.vx*dt;p.y+=p.vy*dt;p.age+=dt;
   const target=this.units[1-p.side];let collision=false,hitX=p.x;
   if(this.wall&&this.wall.hp>0&&!p.pierce&&((p.px-this.wall.x)*(p.x-this.wall.x)<=0)){
    this.wall.hp=Math.max(0,this.wall.hp-p.damage);hitX=this.wall.x;collision=true;this.fx(hitX,p.y,p.color,'障碍',20);
    if(p.trace)p.trace.wallHits++;this.log((p.side?'敌方':'我方')+SPELLS[p.type].name+'命中障碍','wall');
   }else if((p.side===0&&p.x>=target.x-19)||(p.side===1&&p.x<=target.x+19)){
    this.hit(p,target);hitX=target.x+(p.side?24:-24);collision=true;
   }
   if(collision){if(p.payload){this.units[p.side].stats.triggers++;if(p.trace)p.trace.triggers.push({time:this.time,x:hitX,node:p.payload.index});this.log((p.side?'敌方':'我方')+'载体触发 → '+SPELLS[p.payload.id].name,'trigger');this.fx(hitX,p.y,'#b9a0ef','触发',32);this.cast(p.payload,this.units[p.side],hitX+(p.side?-2:2),p.y,p.mods,p.trace);}}
   else if(p.age<8&&p.x>-50&&p.x<1010)this.projectiles.push(p);else if(p.trace)p.trace.expired++;
  }
  this.tickStatuses();
  this.effects=this.effects.filter(e=>(e.life-=dt)>0);
  const [a,b]=this.units;
  if(a.hp<=0||b.hp<=0)this.result=a.hp<=0&&b.hp<=0?'draw':a.hp<=0?'loss':'win';else if(this.time>=45)this.result='timeout';
  if(this.result)this.log(({win:'胜利',loss:'落败',draw:'双方同时倒下',timeout:'45秒到时 · 平局'})[this.result],'result');
 }
 run(){for(let i=0;i<2800&&!this.result;i++)this.step();return this.result;}
}
const api={KEYWORDS,SPELLS,WANDS,PRESETS,ENEMIES,compile,treeText,Battle};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WandLab=api;
})(typeof globalThis!=='undefined'?globalThis:this);

(function(root){
'use strict';
const STEP=1/60,MIN_GAP=.2,MAX_TIME=45,MAX_SLOTS=8,SHIELD_CAP=80;
const field=(label,value,min,max,step=1)=>({label,value,min,max,step});
const CARDS={
 ember:{name:'余烬弹',icon:'♨',kind:'spell',color:'#f0a06c',tag:'角色 · 灼烧',desc:'命中敌方角色：造成伤害并施加灼烧。',fields:{damage:field('基础伤害',4,0,50),stacks:field('灼烧层数',4,1,12),speed:field('弹速 px/s',400,180,800,20)}},
 detonate:{name:'引爆弹',icon:'✹',kind:'spell',color:'#f18372',tag:'角色 · 消耗灼烧',desc:'命中后消耗灼烧，每层增加直伤；引爆是卡牌动作，不是关键词。',fields:{damage:field('基础伤害',8,0,50),consume:field('最多消耗层数',30,1,30),ratio:field('每层追加伤害',2,0,5,.5),speed:field('弹速 px/s',400,180,800,20)}},
 spark:{name:'火花弹',icon:'✦',kind:'spell',color:'#dfc287',tag:'角色 · 直伤',desc:'一发弹丸，一次命中。基础伤害直接来自法术，没有法杖威力乘区。',fields:{damage:field('基础伤害',12,0,50),speed:field('弹速 px/s',480,180,800,20)}},
 venom:{name:'毒刺',icon:'☠',kind:'spell',color:'#b3cd85',tag:'角色 · 中毒',desc:'命中施加中毒，每秒穿盾伤害，不自然衰减。',fields:{damage:field('基础伤害',2,0,50),stacks:field('中毒层数',2,1,10),speed:field('弹速 px/s',400,180,800,20)}},
 shock:{name:'电弧',icon:'ϟ',kind:'spell',color:'#eadb84',tag:'角色 · 感电',desc:'先结算已有感电，再附加新感电；后续每次命中耗1层，追加6直伤。',fields:{damage:field('基础伤害',6,0,50),stacks:field('感电层数',2,1,6),speed:field('弹速 px/s',500,180,800,20)}},
 ice:{name:'冰针',icon:'❄',kind:'spell',color:'#90cbdc',tag:'敌杖 · 减速',desc:'命中敌方角色后，使敌方同编号法杖减速。速度×0.7，重复刷新。',fields:{damage:field('基础伤害',5,0,50),duration:field('减速持续秒数',2,.5,6,.5),speed:field('弹速 px/s',360,180,800,20)}},
 shield:{name:'护盾术',icon:'⬡',kind:'spell',color:'#8bcbb7',tag:'角色 · 护盾',desc:'施放时自身角色获得护盾。只有实际增加的护盾才产生获得护盾事件。',fields:{amount:field('护盾量',15,1,40)}},
 heal:{name:'修复',icon:'+',kind:'spell',color:'#8bcbb7',tag:'角色 · 治疗',desc:'施放时回复自身角色生命，不超过上限。',fields:{amount:field('治疗量',10,1,35)}},
 charge:{name:'接力符',icon:'↗',kind:'spell',color:'#91c9df',tag:'另一根杖 · 充能',desc:'施放时为另一根己方法杖充能。计时最低推进到安全发动边界，不储存溢出。',fields:{amount:field('充能秒数',.4,.1,1.2,.1)}},
 haste:{name:'鼓舞符',icon:'»',kind:'spell',color:'#e5c887',tag:'另一根杖 · 加速',desc:'施放时使另一根己方法杖加速，计时速度×1.5。重复刷新，不叠强度。',fields:{duration:field('加速持续秒数',3,.5,6,.5)}},
 relay:{name:'回响弹',icon:'⤴',kind:'spell',color:'#91c9df',tag:'命中 → 另一根杖',desc:'命中敌方角色后，为另一根己方法杖充能。护盾不阻止命中触发。',fields:{damage:field('基础伤害',5,0,50),amount:field('命中充能秒数',.25,.05,.8,.05),speed:field('弹速 px/s',400,180,800,20)}},
 relayRune:{name:'接力符文',icon:'⟿',kind:'rune',color:'#b4a0d8',tag:'施法计数 → 充能',desc:'本杖每完成N次计时发动，为另一根己方法杖充能。占槽，不进入主动队列。',fields:{every:field('每几次发动',2,1,5),amount:field('充能秒数',.3,.1,1,.1),cooldown:field('最短触发间隔',.5,.2,3,.1)}},
 harvest:{name:'余烬护符',icon:'♧',kind:'rune',color:'#b4a0d8',tag:'本杖消耗灼烧 → 护盾',desc:'本杖的法术实际消耗灼烧时，角色获得护盾。每次消耗事件触发一次，不按层数触发。',fields:{amount:field('护盾量',6,1,20),cooldown:field('最短触发间隔',.5,.2,3,.1)}},
 conduit:{name:'护盾导流',icon:'⋈',kind:'rune',color:'#b4a0d8',tag:'角色获得护盾 → 充能',desc:'己方角色实际获得护盾时，为安装此符文的另一根法杖充能。',fields:{amount:field('充能秒数',.2,.1,.8,.1),cooldown:field('最短触发间隔',1,.2,3,.1)}}
};
function makeCard(id,params={}){const def=CARDS[id];if(!def)throw Error('未知模块：'+id);return {id,params:Object.assign(Object.fromEntries(Object.entries(def.fields).map(([k,f])=>[k,f.value])),params)};}
const wand=(interval,capacity,ids)=>({interval,capacity,cards:ids.map(id=>makeCard(id))});
const PRESETS={
 loop:{name:'点火 · 接力 · 引爆',hint:'A 点火并每两次发动推进 B；B 消耗灼烧获得护盾，再经导流推进 A。',wands:[wand(.9,3,['ember','ember','relayRune']),wand(1.6,4,['detonate','harvest','conduit'])]},
 tempo:{name:'双杖节奏',hint:'A 的鼓舞和回响只影响 B。调节弹速，观察命中充能落在哪次等待中。',wands:[wand(1.1,4,['haste','relay','charge']),wand(1.7,3,['spark','spark'])]},
 poison:{name:'毒盾互助',hint:'A 叠毒，B 获盾；B 的导流符文将实际护盾收益转成 A 的计时推进。',wands:[wand(1,3,['venom','ice']),wand(1.5,4,['shield','heal','conduit'])]},
 plain:{name:'无联动对照',hint:'两根杖只发射火花弹。分别修改法杖间隔与法术伤害，观察次数和单次伤害的区别。',wands:[wand(1,3,['spark']),wand(1.5,4,['spark'])]}
};
const ENEMIES={
 sentinel:{name:'双杖哨卫',desc:'双路直伤，偶尔减速同编号法杖。',hp:300,wands:[wand(1.15,3,['spark','ice']),wand(1.7,3,['spark','shield'])]},
 alchemist:{name:'蚀火术士',desc:'灼烧与中毒压力。',hp:300,wands:[wand(1.3,3,['ember','venom']),wand(1.8,3,['spark','heal'])]},
 dummy:{name:'静止试验靶',desc:'不施法，800生命；适合纯输出与参数对照。',hp:800,wands:[wand(2,3,['spark']),wand(2,3,['spark'])],passive:true}
};
function clone(x){return JSON.parse(JSON.stringify(x));}
function configFor(id='loop'){return {hp:300,enemy:'sentinel',links:true,wands:clone(PRESETS[id].wands)};}
function validate(config){
 const errors=[];if(!config||!Array.isArray(config.wands)||config.wands.length!==2)return ['需要两根法杖。'];
 if(!Number.isFinite(config.hp)||config.hp<100||config.hp>800)errors.push('角色生命上限须为100～800。');
 if(!ENEMIES[config.enemy])errors.push('未知对手。');
 let slots=0;
 config.wands.forEach((w,i)=>{const tag='法杖 '+(i?'B':'A');
  if(!Number.isFinite(w.interval)||w.interval<.4||w.interval>3)errors.push(tag+'间隔须为0.4～3秒。');
  if(!Number.isInteger(w.capacity)||w.capacity<1||w.capacity>5)errors.push(tag+'容量须为1～5槽。');
  if(!Array.isArray(w.cards)){errors.push(tag+'缺少装填配置。');return;}
  slots+=w.cards.length;if(w.cards.length>w.capacity)errors.push(tag+'装填超过容量。');
  if(!w.cards.some(c=>CARDS[c.id]?.kind==='spell'))errors.push(tag+'至少装入一张主动法术。');
  w.cards.forEach(c=>{const d=CARDS[c.id];if(!d){errors.push('未知模块。');return;}
   for(const [key,f] of Object.entries(d.fields)){const v=c.params?.[key];if(!Number.isFinite(v)||v<f.min-1e-9||v>f.max+1e-9||Math.abs((v-f.min)/f.step-Math.round((v-f.min)/f.step))>1e-6)errors.push(d.name+'的'+f.label+'不在允许范围或步长内。');}
  });
 });
 if(slots>MAX_SLOTS)errors.push('两根法杖合计最多装填8槽。');return errors;
}
class Battle{
 constructor(config=configFor()){
  const errors=validate(config);if(errors.length)throw Error(errors.join(' '));
  this.config=clone(config);this.time=0;this.tick=0;this.result=null;this.projectiles=[];this.logs=[];this.links=[];this.effects=[];this.queue=[];this.serial=0;
  const enemy=ENEMIES[config.enemy];
  this.actors=[this.actor(0,config.hp),this.actor(1,enemy.hp)];
  this.wands=[...config.wands.map((w,i)=>this.wand(w,0,i)),...enemy.wands.map((w,i)=>this.wand(w,1,i))];
  this.log('system','实验开始 · 两根法杖独立计时，共享角色生命与状态');
 }
 actor(side,hp){return {side,x:side?1010:90,y:165,hp,maxHp:hp,shield:0,burn:0,poison:0,shock:0,burnAt:0,poisonAt:0,stats:{damage:0,dot:0,absorbed:0,shield:0,casts:0,links:0,charge:0}};}
 wand(w,side,index){const cards=clone(w.cards);return {id:side*2+index,side,index,x:side?850:250,y:index?238:95,interval:w.interval,capacity:w.capacity,cards,active:cards.map((c,i)=>CARDS[c.id].kind==='spell'?i:-1).filter(i=>i>=0),runes:cards.map((c,slot)=>({c,slot,count:0,lastAt:-99,procs:0})).filter(r=>CARDS[r.c.id].kind==='rune'),cursor:0,timer:w.interval,hasteUntil:0,slowUntil:0,lastAt:-99,lastSlot:-1,lastChargeAt:-99,lastCharge:0,stats:{casts:0,damage:0,links:0,charge:0}};}
 name(w){return (w.side?'敌':'我')+'方 '+(w.index?'B':'A')+'杖';}
 other(w){return this.wands[w.side*2+1-w.index];}
 rate(w){return (w.hasteUntil>this.time?1.5:1)*(w.slowUntil>this.time?.7:1);}
 log(kind,text){this.logs.push({id:++this.serial,time:this.time,kind,text});if(this.logs.length>240)this.logs.shift();}
 fx(x,y,text,color){this.effects.push({x,y,text,color,time:this.time});}
 event(type,source,data={}){this.queue.push({type,source,...data});}
 link(source,target,kind,amount,reason){
  const e={id:++this.serial,time:this.time,from:source.id,to:target.id,kind,amount,reason};this.links.push(e);if(this.links.length>80)this.links.shift();
  source.stats.links++;this.actors[source.side].stats.links++;
 }
 charge(source,target,amount,reason){
  if(source.side===0&&!this.config.links&&source.id!==target.id)return 0;
  const before=Math.max(0,target.timer),floor=Math.max(0,MIN_GAP-(this.time-target.lastAt));
  target.timer=Math.max(Math.min(before,floor),before-amount);const actual=Math.max(0,before-target.timer);
  target.lastChargeAt=this.time;target.lastCharge=actual;
  if(actual>1e-9){source.stats.charge+=actual;this.actors[source.side].stats.charge+=actual;this.link(source,target,'charge',actual,reason);this.fx(target.x,target.y,'充能 −'+actual.toFixed(2)+'s','#91c9df');}
  this.log('link',`${this.name(source)} · ${reason} → ${this.name(target)}充能 ${actual.toFixed(2)}s（${before.toFixed(2)} → ${target.timer.toFixed(2)}）${actual<amount-1e-9?' · 溢出/安全边界':''}`);return actual;
 }
 haste(source,target,duration,reason){
  if(source.side===0&&!this.config.links&&source.id!==target.id)return;
  target.hasteUntil=Math.max(target.hasteUntil,this.time+duration);this.link(source,target,'haste',duration,reason);this.log('link',`${this.name(source)} · ${reason} → ${this.name(target)}加速 ${duration}s`);this.fx(target.x,target.y,'加速 ×1.5','#e5c887');
 }
 shield(source,amount,reason){const a=this.actors[source.side],actual=Math.min(SHIELD_CAP-a.shield,amount);a.shield+=actual;a.stats.shield+=actual;if(actual>0){this.event('shield',source,{amount:actual});this.fx(a.x,a.y,'护盾 +'+actual,'#8bcbb7');this.log('status',`${this.name(source)} · ${reason} → 角色实际获得 ${actual} 护盾`);}return actual;}
 damage(source,target,amount,dot=false,bypass=false){const blocked=bypass?0:Math.min(target.shield,amount);target.shield-=blocked;target.stats.absorbed+=blocked;const loss=Math.min(target.hp,Math.max(0,amount-blocked));target.hp-=loss;const actor=this.actors[source.side];actor.stats.damage+=loss;if(dot)actor.stats.dot+=loss;else source.stats.damage+=loss;return {loss,blocked};}
 addStatus(source,target,kind,amount){const before=target[kind];target[kind]=Math.min(kind==='shock'?6:30,before+amount);if(!before&&kind!=='shock')target[kind+'At']=this.time+1;this.log('status',`${this.name(source)} → 敌方角色${kind==='burn'?'灼烧':kind==='poison'?'中毒':'感电'} +${target[kind]-before}`);}
 drain(){let budget=0;while(this.queue.length){if(++budget>256)throw Error('事件循环超出安全预算');const e=this.queue.shift();for(const w of this.wands){if(w.side!==e.source.side)continue;for(const r of w.runes){let eligible=false;const p=r.c.params;
   if(r.c.id==='relayRune'&&e.type==='cast'&&e.source.id===w.id){r.count++;if(r.count>=p.every){r.count=0;eligible=true;}}
   if(r.c.id==='harvest'&&e.type==='consume'&&e.source.id===w.id)eligible=true;
   if(r.c.id==='conduit'&&e.type==='shield'&&e.amount>0)eligible=true;
   if(!eligible||this.time-r.lastAt<p.cooldown-1e-9)continue;
   if(r.c.id!=='harvest'&&w.side===0&&!this.config.links)continue;
   r.lastAt=this.time;r.procs++;this.log('rune',`${this.name(w)} · ${CARDS[r.c.id].name}触发`);
   if(r.c.id==='harvest')this.shield(w,p.amount,CARDS[r.c.id].name);else this.charge(w,this.other(w),p.amount,CARDS[r.c.id].name);
  }}
 }}
 cast(w){const slot=w.active[w.cursor],c=w.cards[slot],d=CARDS[c.id],p=c.params;w.lastSlot=slot;w.lastAt=this.time;w.stats.casts++;this.actors[w.side].stats.casts++;w.cursor=(w.cursor+1)%w.active.length;
  this.log('cast',`${this.name(w)} #${w.stats.casts} → ${d.name}`);this.fx(w.x,w.y,d.name,d.color);
  if(p.speed){const target=this.actors[1-w.side],dx=target.x-w.x,dy=target.y-w.y,len=Math.hypot(dx,dy);this.projectiles.push({id:++this.serial,source:w.id,c:clone(c),x:w.x,y:w.y,vx:dx/len*p.speed,vy:dy/len*p.speed,left:len});}
  else if(c.id==='shield')this.shield(w,p.amount,d.name);
  else if(c.id==='heal'){const a=this.actors[w.side],actual=Math.min(a.maxHp-a.hp,p.amount);a.hp+=actual;this.fx(a.x,a.y,'治疗 +'+actual,d.color);}
  else if(c.id==='charge')this.charge(w,this.other(w),p.amount,d.name);
  else if(c.id==='haste')this.haste(w,this.other(w),p.duration,d.name);
  this.event('cast',w);
 }
 hit(projectile){const w=this.wands[projectile.source],c=projectile.c,p=c.params,d=CARDS[c.id],target=this.actors[1-w.side];let amount=p.damage;
  if(target.shock){target.shock--;amount+=6;}
  if(c.id==='detonate'&&target.burn){const n=Math.min(target.burn,p.consume);target.burn-=n;if(!target.burn)target.burnAt=0;amount+=n*p.ratio;this.event('consume',w,{amount:n});this.log('status',`${this.name(w)}引爆消耗 ${n} 层灼烧 → 追加 ${n*p.ratio} 直伤`);}
  const result=this.damage(w,target,amount);this.log('hit',`${this.name(w)} · ${d.name}命中 ${result.loss.toFixed(1)} 生命伤害${result.blocked?' / 护盾吸收 '+result.blocked.toFixed(1):''}`);this.fx(target.x,target.y,'−'+result.loss.toFixed(0),d.color);
  if(c.id==='ember')this.addStatus(w,target,'burn',p.stacks);
  if(c.id==='venom')this.addStatus(w,target,'poison',p.stacks);
  if(c.id==='shock')this.addStatus(w,target,'shock',p.stacks);
  if(c.id==='relay')this.charge(w,this.other(w),p.amount,d.name+'命中');
  if(c.id==='ice'){const targetWand=this.wands[(1-w.side)*2+w.index];targetWand.slowUntil=Math.max(targetWand.slowUntil,this.time+p.duration);this.log('status',`${this.name(w)}冰针 → ${this.name(targetWand)}减速 ${p.duration}s`);}
 }
 step(dt=STEP){
  if(!Number.isFinite(dt)||Math.abs(dt-STEP)>1e-10)throw Error('本版本只接受固定1/60秒步长。');if(this.result)return;
  this.tick++;this.time=this.tick*STEP;
  const enabled=this.wands.filter(w=>!(w.side===1&&ENEMIES[this.config.enemy].passive));
  for(const w of enabled)w.timer=Math.max(0,w.timer-dt*this.rate(w));
  // Snapshot readiness before any effects; all next timers are reset before casts.
  const ready=enabled.filter(w=>w.timer<=1e-9&&this.time-w.lastAt>=MIN_GAP-1e-9);
  for(const w of ready)w.timer=w.interval;
  for(const w of ready)this.cast(w);
  this.drain();
  const current=this.projectiles;this.projectiles=[];
  for(const p of current){p.x+=p.vx*dt;p.y+=p.vy*dt;p.left-=p.c.params.speed*dt;if(p.left<=1e-9){this.hit(p);this.drain();}else this.projectiles.push(p);}
  for(const a of this.actors)for(const kind of ['burn','poison'])if(a[kind]&&this.time>=a[kind+'At']-1e-9){const source=this.wands[(1-a.side)*2];const res=this.damage(source,a,a[kind],true,kind==='poison');this.fx(a.x,a.y,(kind==='burn'?'灼烧':'中毒')+' −'+res.loss.toFixed(0),kind==='burn'?'#f0a06c':'#b3cd85');this.log('dot',`${a.side?'敌':'我'}方角色${kind==='burn'?'灼烧':'中毒'}结算 ${res.loss.toFixed(1)} 生命伤害`);if(kind==='burn')a.burn--;a[kind+'At']=a[kind]?a[kind+'At']+1:0;}
  this.effects=this.effects.filter(e=>this.time-e.time<1);
  const [a,b]=this.actors;if(a.hp<=0||b.hp<=0)this.result=a.hp<=0&&b.hp<=0?'draw':a.hp<=0?'loss':'win';else if(this.time>=MAX_TIME)this.result='timeout';
  if(this.result)this.log('result',({win:'构筑获胜',loss:'构筑落败',draw:'双方同时倒下',timeout:'45秒到时 · 平局'})[this.result]);
 }
 run(){while(!this.result)this.step();return this;}
 summary(){return {result:this.result,time:this.time,hp:this.actors[0].hp,enemyHp:this.actors[1].hp,damage:this.actors[0].stats.damage,dot:this.actors[0].stats.dot,casts:this.wands.slice(0,2).map(w=>w.stats.casts),links:this.actors[0].stats.links,charge:this.actors[0].stats.charge};}
}
function compare(config){return {on:new Battle({...clone(config),links:true}).run().summary(),off:new Battle({...clone(config),links:false}).run().summary()};}
const api={STEP,MIN_GAP,MAX_TIME,MAX_SLOTS,SHIELD_CAP,CARDS,PRESETS,ENEMIES,makeCard,configFor,validate,clone,Battle,compare};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WandLinkLab=api;
})(typeof globalThis!=='undefined'?globalThis:this);

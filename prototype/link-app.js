'use strict';
const {CARDS,ENEMIES,configFor,makeCard,validate,Battle}=WandLinkLab;
const $=id=>document.getElementById(id);
let config=configFor(),battle=null,paused=false,speed=.5,selectedWand=0,selectedSlot=0,filter='all',accumulator=0,lastStamp=0,lastUi=0;
const canvas=$('arena'),ctx=canvas.getContext('2d');
const names=['A','B'],resultNames={win:'胜利',loss:'落败',draw:'同时倒下',timeout:'平局'};
function locked(){return battle!==null;}
function fmt(n){return Number.isInteger(n)?String(n):Number(n.toFixed(2)).toString();}
function totalSlots(){return config.wands.reduce((n,w)=>n+w.cards.length,0);}
function shortParams(c){const p=c.params;if(p.damage!==undefined)return `${p.damage}伤害${p.stacks?' · '+p.stacks+'层':''}${p.amount?' · 充能'+fmt(p.amount)+'s':''}`;if(p.every)return `每${p.every}次 · 充能${fmt(p.amount)}s`;if(p.duration)return `加速 ${p.duration}s`;return `${c.id==='charge'||c.id==='conduit'?'充能 ':c.id==='heal'?'治疗 ':'护盾 '}${fmt(p.amount)}${c.id==='charge'||c.id==='conduit'?'s':''}`;}
function changed(){renderEditor();refresh();}
function renderEditor(){
 const invalid=validate(config);$('error').textContent=invalid.join(' ');$('budget').textContent=`${totalSlots()} / 8`;
 $('enemy').value=config.enemy;$('linksEnabled').checked=config.links;$('enemy').disabled=locked();$('linksEnabled').disabled=locked();
 $('wandEditors').innerHTML=config.wands.map((w,i)=>`<article class="wand-editor ${i===selectedWand?'selected':''}"><div class="wand-editor-top"><b>法杖 ${names[i]} <span class="muted">${w.cards.length}/${w.capacity}</span></b><button data-select-wand="${i}" ${locked()?'disabled':''}>${i===selectedWand?'编辑中':'选择'}</button></div><div class="wand-numbers"><label>间隔 <input aria-label="法杖${names[i]}间隔" data-wand-field="interval" data-wand="${i}" type="number" min="0.4" max="3" step="0.1" value="${w.interval}" ${locked()?'disabled':''}> 秒</label><label>容量 <select aria-label="法杖${names[i]}容量" data-wand-field="capacity" data-wand="${i}" ${locked()?'disabled':''}>${[1,2,3,4,5].map(v=>`<option ${v===w.capacity?'selected':''}>${v}</option>`).join('')}</select></label></div><div class="slots">${w.cards.map((c,j)=>{const d=CARDS[c.id];return `<div class="slot ${d.kind==='rune'?'rune':''} ${i===selectedWand&&j===selectedSlot?'is-selected':''}" data-slot-wand="${i}" data-slot-index="${j}" draggable="${!locked()}" style="--card:${d.color}"><button class="slot-select" data-inspect-wand="${i}" data-inspect-slot="${j}" aria-label="查看${names[i]}杖第${j+1}槽${d.name}"><small>${String(j+1).padStart(2,'0')}</small><strong>${d.icon}</strong><span>${d.name}</span></button><div class="slot-actions"><button aria-label="左移" data-move="${i},${j},-1" ${locked()||j===0?'disabled':''}>‹</button><button aria-label="移除" data-remove="${i},${j}" ${locked()?'disabled':''}>×</button><button aria-label="右移" data-move="${i},${j},1" ${locked()||j===w.cards.length-1?'disabled':''}>›</button></div></div>`;}).join('')}${Array.from({length:Math.max(0,w.capacity-w.cards.length)},()=>'<div class="slot empty">＋</div>').join('')}</div></article>`).join('');
 renderLibrary();renderInspector();
}function renderLibrary(){
 const w=config.wands[selectedWand];$('installTarget').textContent='装入 '+names[selectedWand]+' 杖';
 $('library').innerHTML=Object.entries(CARDS).filter(([,d])=>filter==='all'||d.kind===filter).map(([id,d])=>`<button class="library-card ${d.kind}" data-add="${id}" style="--card:${d.color}" ${locked()||totalSlots()>=8||w.cards.length>=w.capacity?'disabled':''} title="${d.desc}"><span class="icon">${d.icon}</span><span class="plus">+</span><strong>${d.name}</strong><small>${d.tag}</small><small>${shortParams(makeCard(id))}</small></button>`).join('');
}
function renderInspector(){
 const c=config.wands[selectedWand].cards[selectedSlot];
 if(!c){$('inspector').innerHTML='<p class="empty">从模块档案装入一张卡，或点击卡槽查看参数。</p>';return;}
 const d=CARDS[c.id];$('inspector').innerHTML=`<div class="inspect-title" style="--card:${d.color}"><span>${d.icon}</span><div><h3>${d.name}</h3><small>${names[selectedWand]}杖 · 第${selectedSlot+1}槽 · ${d.kind==='rune'?'被动符文':'主动法术'} · 占1槽</small></div></div><p class="inspect-desc">${d.desc}</p>${Object.entries(d.fields).map(([key,f])=>`<label class="param-field"><span>${f.label}<small>${f.min}～${f.max} · 步长 ${f.step}</small></span><input aria-label="${f.label}" data-param="${key}" type="number" min="${f.min}" max="${f.max}" step="${f.step}" value="${c.params[key]}" ${locked()?'disabled':''}></label>`).join('')}<div class="inspect-foot">${d.kind==='rune'?'被动不占一次施法。触发次数与主动发动次数分开记录。':'只改这一张卡，不改变另一根杖、同名卡或对手。'}${locked()?'<br>战斗配置已锁定，重置后再修改。':''}</div>`;
}
function badges(a){if(!a)return '';return [['shield','护盾',Math.round(a.shield)],['burn','灼烧',a.burn],['poison','中毒',a.poison],['shock','感电',a.shock]].filter(([, ,n])=>n>0).map(([id,label,n])=>`<span class="status ${id}">${label} ${n}${id==='shield'?'':'层'}</span>`).join('')||'<span>暂无角色状态</span>';}
function badges(a){if(!a)return '';return [['shield','护盾',Math.round(a.shield)],['burn','灼烧',a.burn],['poison','中毒',a.poison],['shock','感电',a.shock]].filter(([, ,n])=>n>0).map(([id,label,n])=>`<span class="status ${id}">${label} ${n}${id==='shield'?'':'层'}</span>`).join('')||'<span>暂无状态</span>';}
function refresh(){const a=battle?.actors[0]||{hp:config.hp,maxHp:config.hp,shield:0,burn:0,poison:0,shock:0},e=battle?.actors[1]||{hp:ENEMIES[config.enemy].hp,maxHp:ENEMIES[config.enemy].hp,shield:0,burn:0,poison:0,shock:0};$('playerHpText').textContent=`${Math.ceil(a.hp)} / ${a.maxHp}`;$('enemyHpText').textContent=`${Math.ceil(e.hp)} / ${e.maxHp}`;$('enemyName').textContent=ENEMIES[config.enemy].name;$('playerHpBar').style.width=Math.max(0,a.hp/a.maxHp*100)+'%';$('enemyHpBar').style.width=Math.max(0,e.hp/e.maxHp*100)+'%';$('playerEffects').innerHTML=badges(a);$('enemyEffects').innerHTML=badges(e);$('clock').textContent=(battle?.time||0).toFixed(2).padStart(5,'0');$('phase').textContent=battle?.result?resultNames[battle.result]:(battle?(paused?'已暂停':'自动战斗'):'等待启动');$('start').disabled=validate(config).length>0||!!battle&&!battle.result;$('pause').disabled=!battle||!!battle.result;$('pause').textContent=paused?'继续':'暂停';$('result').hidden=!battle?.result;if(battle?.result){const x=battle.summary();$('result').innerHTML=`<b>${resultNames[x.result]}</b><span>${x.time.toFixed(2)}s · A/B ${x.casts.join(' / ')}</span>`;}}
function start(){try{battle=new Battle(config);paused=false;accumulator=0;renderEditor();refresh();}catch(e){$('error').textContent=e.message;}}
function reset(){battle=null;paused=false;accumulator=0;renderEditor();refresh();}
$('enemy').innerHTML=Object.entries(ENEMIES).map(([id,e])=>`<option value="${id}">${e.name}</option>`).join('');
function setLoadoutView(view){
 const modal=$('loadoutModal'),body=$('loadoutDialogBody');
 modal.hidden=false;body.dataset.view=view;
 $('loadoutTitle').textContent=view==='bag'?'背包':'法杖编辑';
 $('wandTab').classList.toggle('active',view==='wand');$('bagTab').classList.toggle('active',view==='bag');
 $('modalStatus').textContent=locked()?'战斗进行中，配置已锁定':'编辑完成后关闭此窗口返回战斗';
 renderEditor();
}
function closeLoadout(){$('loadoutModal').hidden=true;}
// Use delegated clicks for the two entry buttons as well as the modal tabs.
// This keeps the controls working if the page is restored from the bfcache or
// a host injects/replaces the top bar after the initial script evaluation.
document.addEventListener('click',e=>{
 const target=e.target.closest?.('#wandOpen,#bagOpen,#wandTab,#bagTab,#closeLoadout');
 if(!target)return;
 if(target.id==='wandOpen')setLoadoutView('wand');
 else if(target.id==='bagOpen')setLoadoutView('bag');
 else if(target.id==='wandTab')setLoadoutView('wand');
 else if(target.id==='bagTab')setLoadoutView('bag');
 else closeLoadout();
});
$('loadoutModal').addEventListener('click',e=>{if(e.target.closest('[data-close-loadout]'))closeLoadout();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('loadoutModal').hidden)closeLoadout();});
let nativeDrag=null,pointerDrag=null,ignoreNextClick=false;
function moveSlot(fromWand,fromIndex,toWand,toIndex){
 if(locked()||fromWand!==toWand)return;
 const cards=config.wands[fromWand].cards;
 if(fromIndex===toIndex||!cards[fromIndex]||!cards[toIndex])return;
 const [card]=cards.splice(fromIndex,1);
 const insert=Math.max(0,Math.min(cards.length,toIndex));
 cards.splice(insert,0,card);selectedWand=fromWand;selectedSlot=insert;changed();
}
function clearDragClasses(){document.querySelectorAll('.slot.dragging,.slot.drag-over').forEach(x=>x.classList.remove('dragging','drag-over'));}
function slotFromPoint(x,y){const el=document.elementFromPoint(x,y);return el&&el.closest?.('.slot[data-slot-wand]');}
$('wandEditors').onclick=e=>{if(ignoreNextClick){ignoreNextClick=false;return;}const inspect=e.target.closest('[data-inspect-wand]');if(inspect){selectedWand=Number(inspect.dataset.inspectWand);selectedSlot=Number(inspect.dataset.inspectSlot);renderEditor();return;}if(locked())return;const select=e.target.closest('[data-select-wand]'),remove=e.target.closest('[data-remove]'),move=e.target.closest('[data-move]');if(select){selectedWand=Number(select.dataset.selectWand);selectedSlot=0;renderEditor();}if(remove){const [i,j]=remove.dataset.remove.split(',').map(Number);config.wands[i].cards.splice(j,1);selectedWand=i;selectedSlot=Math.max(0,Math.min(j,config.wands[i].cards.length-1));changed();}if(move){const [i,j,d]=move.dataset.move.split(',').map(Number),a=config.wands[i].cards;[a[j],a[j+d]]=[a[j+d],a[j]];selectedWand=i;selectedSlot=j+d;changed();}};
$('wandEditors').ondragstart=e=>{
 if(locked())return;
 const slot=e.target.closest('.slot[data-slot-wand]');if(!slot)return;
 nativeDrag={wand:Number(slot.dataset.slotWand),index:Number(slot.dataset.slotIndex)};
 slot.classList.add('dragging');e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',JSON.stringify(nativeDrag));
};
$('wandEditors').ondragover=e=>{
 const slot=e.target.closest('.slot[data-slot-wand]');if(!slot||!nativeDrag||Number(slot.dataset.slotWand)!==nativeDrag.wand)return;
 e.preventDefault();clearDragClasses();slot.classList.add('drag-over');e.dataTransfer.dropEffect='move';
};
$('wandEditors').ondrop=e=>{
 const slot=e.target.closest('.slot[data-slot-wand]');if(!slot||!nativeDrag)return;
 e.preventDefault();moveSlot(nativeDrag.wand,nativeDrag.index,Number(slot.dataset.slotWand),Number(slot.dataset.slotIndex));nativeDrag=null;clearDragClasses();
};
$('wandEditors').ondragend=()=>{nativeDrag=null;clearDragClasses();};
$('wandEditors').addEventListener('pointerdown',e=>{
 if(locked()||e.pointerType==='mouse')return;
 const slot=e.target.closest('.slot[data-slot-wand]');if(!slot)return;
 pointerDrag={slot,wand:Number(slot.dataset.slotWand),index:Number(slot.dataset.slotIndex),x:e.clientX,y:e.clientY,active:false};slot.setPointerCapture?.(e.pointerId);
});
$('wandEditors').addEventListener('pointermove',e=>{
 if(!pointerDrag)return;
 const distance=Math.hypot(e.clientX-pointerDrag.x,e.clientY-pointerDrag.y);
 if(!pointerDrag.active&&distance<8)return;
 pointerDrag.active=true;e.preventDefault();pointerDrag.slot.classList.add('dragging');clearDragClasses();pointerDrag.slot.classList.add('dragging');
 const over=slotFromPoint(e.clientX,e.clientY);if(over&&Number(over.dataset.slotWand)===pointerDrag.wand)over.classList.add('drag-over');
});
$('wandEditors').addEventListener('pointerup',e=>{
 if(!pointerDrag)return;
 const drag=pointerDrag;pointerDrag=null;if(!drag.active){return;}
 const over=slotFromPoint(e.clientX,e.clientY);if(over&&Number(over.dataset.slotWand)===drag.wand){moveSlot(drag.wand,drag.index,drag.wand,Number(over.dataset.slotIndex));ignoreNextClick=true;}
 clearDragClasses();
});
$('wandEditors').addEventListener('pointercancel',()=>{pointerDrag=null;clearDragClasses();});
$('wandEditors').onchange=e=>{if(locked()||!e.target.dataset.wandField)return;const el=e.target;config.wands[Number(el.dataset.wand)][el.dataset.wandField]=el.value===''?NaN:Number(el.value);changed();};$('library').onclick=e=>{const b=e.target.closest('[data-add]');if(!b||locked())return;const w=config.wands[selectedWand];if(w.cards.length>=w.capacity||totalSlots()>=8)return;w.cards.push(makeCard(b.dataset.add));selectedSlot=w.cards.length-1;changed();};$('inspector').onchange=e=>{if(locked()||!e.target.dataset.param)return;config.wands[selectedWand].cards[selectedSlot].params[e.target.dataset.param]=e.target.value===''?NaN:Number(e.target.value);changed();};$('enemy').onchange=()=>{if(!locked()){config.enemy=$('enemy').value;changed();}};$('linksEnabled').onchange=()=>{if(!locked()){config.links=$('linksEnabled').checked;changed();}};$('start').onclick=start;$('reset').onclick=reset;$('pause').onclick=()=>{paused=!paused;accumulator=0;refresh();};for(const b of document.querySelectorAll('[data-speed]'))b.onclick=()=>{speed=Number(b.dataset.speed);accumulator=0;document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===b));};for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLibrary();};function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function circle(x,y,r,color,fill=false){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=color;ctx.fill();}else{ctx.strokeStyle=color;ctx.stroke();}}
function text(str,x,y,color='#9aad8d',size=12,align='center'){ctx.font=`${size}px "Microsoft YaHei",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(str,x,y);}
function draw(){
 ctx.clearRect(0,0,1100,330);
 const horizon=166, floor=330;
 const bg=ctx.createLinearGradient(0,0,0,floor);bg.addColorStop(0,'#11151b');bg.addColorStop(.48,'#272a31');bg.addColorStop(1,'#171b1e');ctx.fillStyle=bg;ctx.fillRect(0,0,1100,floor);
 const moon=ctx.createRadialGradient(550,78,8,550,78,230);moon.addColorStop(0,'#b5b08a22');moon.addColorStop(1,'#0e111500');ctx.fillStyle=moon;ctx.fillRect(0,0,1100,210);
 // The arena is drawn as a place first: broken masonry, an archway, braziers and a stone floor.
 ctx.fillStyle='#171a20';ctx.fillRect(0,0,1100,horizon);
 ctx.fillStyle='#0c0f14';ctx.fillRect(0,0,34,horizon);ctx.fillRect(1066,0,34,horizon);
 for(let x=54;x<1060;x+=92){ctx.fillStyle=x%184?'#24262b':'#1e2127';ctx.fillRect(x,46+(x%3)*5,68,120);ctx.strokeStyle='#0d1015';ctx.lineWidth=3;ctx.strokeRect(x,46+(x%3)*5,68,120);}
 ctx.fillStyle='#0d1117';ctx.beginPath();ctx.moveTo(380,166);ctx.lineTo(380,102);ctx.quadraticCurveTo(550,4,720,102);ctx.lineTo(720,166);ctx.closePath();ctx.fill();ctx.strokeStyle='#3f4145';ctx.lineWidth=7;ctx.stroke();
 ctx.fillStyle='#080b10';ctx.fillRect(454,82,192,84);ctx.fillStyle='#b39b6830';ctx.beginPath();ctx.arc(550,88,90,Math.PI,Math.PI*2);ctx.fill();
 ctx.fillStyle='#353337';ctx.fillRect(0,horizon,1100,12);ctx.fillStyle='#202328';ctx.fillRect(0,horizon+12,1100,floor-horizon-12);
 for(let x=20;x<1100;x+=116){ctx.strokeStyle='#45434855';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,horizon+12);ctx.lineTo(x+42,floor);ctx.stroke();}
 for(let y=198;y<floor;y+=32){ctx.strokeStyle='#080b0d77';ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1100,y);ctx.stroke();}
 ctx.fillStyle='#0a0d10';ctx.beginPath();ctx.moveTo(390,330);ctx.lineTo(458,238);ctx.lineTo(642,238);ctx.lineTo(710,330);ctx.closePath();ctx.fill();ctx.strokeStyle='#b0966338';ctx.lineWidth=2;ctx.stroke();
 ctx.strokeStyle='#a98e5d44';ctx.beginPath();ctx.arc(550,282,51,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(550,282,24,0,Math.PI*2);ctx.stroke();
 function brazier(x){ctx.fillStyle='#0b0d10';ctx.fillRect(x-7,133,14,38);ctx.fillRect(x-18,169,36,6);ctx.fillStyle='#b9673e';ctx.beginPath();ctx.arc(x,126,16,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffd892';ctx.beginPath();ctx.arc(x,124,7,0,Math.PI*2);ctx.fill();ctx.shadowColor='#e38c4d';ctx.shadowBlur=22;ctx.fillStyle='#e38c4d55';ctx.beginPath();ctx.arc(x,124,32,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}
 brazier(126);brazier(974);
 function drawActor(side){
  const x=side?1000:100, a=battle?.actors[side], hp=a?Math.max(0,a.hp/a.maxHp):1, robe=side?'#33262a':'#252d2c', trim=side?'#b57860':'#aab681';
  ctx.fillStyle='#07090b99';ctx.beginPath();ctx.ellipse(x,286,59,13,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=robe;ctx.beginPath();ctx.moveTo(x-42,278);ctx.quadraticCurveTo(x-38,220,x-23,199);ctx.lineTo(x+23,199);ctx.quadraticCurveTo(x+38,220,x+42,278);ctx.closePath();ctx.fill();
  ctx.strokeStyle=trim;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,203);ctx.lineTo(x,276);ctx.stroke();ctx.beginPath();ctx.moveTo(x-30,259);ctx.lineTo(x,243);ctx.lineTo(x+30,259);ctx.stroke();
  ctx.fillStyle=side?'#9e6a59':'#c3aa78';ctx.beginPath();ctx.arc(x,177,19,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=side?'#171217':'#181e20';ctx.beginPath();ctx.moveTo(x-28,177);ctx.quadraticCurveTo(x,137,x+28,177);ctx.lineTo(x+19,184);ctx.lineTo(x-19,184);ctx.closePath();ctx.fill();
  ctx.strokeStyle=trim;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(x-18,220);ctx.lineTo(x-39,253);ctx.moveTo(x+18,220);ctx.lineTo(x+34,248);ctx.stroke();
  ctx.fillStyle='#080b0d';ctx.fillRect(x-43,291,86,5);ctx.fillStyle=trim;ctx.fillRect(x-43,291,86*hp,5);
  if(a?.shield){ctx.strokeStyle='#8bcbb7';ctx.lineWidth=2;ctx.globalAlpha=.72;ctx.beginPath();ctx.arc(x,226,53,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
 }
 drawActor(0);drawActor(1);
 const wandStates=battle?.wands||[...config.wands.map((w,i)=>({id:i,side:0,index:i,x:250,y:i?238:95,interval:w.interval,timer:w.interval,cards:w.cards,active:w.cards.map((c,j)=>CARDS[c.id].kind==='spell'?j:-1).filter(j=>j>=0),cursor:0,lastAt:-99})),...ENEMIES[config.enemy].wands.map((w,i)=>({id:i+2,side:1,index:i,x:850,y:i?238:95,interval:w.interval,timer:w.interval,cards:w.cards,active:w.cards.map((c,j)=>CARDS[c.id].kind==='spell'?j:-1).filter(j=>j>=0),cursor:0,lastAt:-99}))];
 for(const w of wandStates){
  const col=w.index?'#91c9df':'#dfc287',next=w.cards[w.active[w.cursor]],card=next&&CARDS[next.id],spellCol=card?.color||col,age=battle?battle.time-w.lastAt:99,progress=Math.max(0,Math.min(1,1-w.timer/w.interval));
  const targetX=w.side?1000:100,angle=Math.atan2(226-w.y,targetX-w.x),dx=Math.cos(angle),dy=Math.sin(angle),recoil=age<.18?(1-age/.18)*7:0;
  ctx.fillStyle='#07090aaa';ctx.beginPath();ctx.ellipse(w.x,w.y+25,42,8,0,0,Math.PI*2);ctx.fill();
  if(w.hasteUntil>battle?.time)circle(w.x,w.y,39,'#e5c88755');if(w.slowUntil>battle?.time)circle(w.x,w.y,43,'#90cbdc55');
  ctx.save();ctx.translate(w.x,w.y);ctx.rotate(angle);ctx.fillStyle='#4a3022';ctx.beginPath();ctx.moveTo(-40,-4);ctx.lineTo(17,-7);ctx.lineTo(28,0);ctx.lineTo(17,7);ctx.lineTo(-40,4);ctx.closePath();ctx.fill();ctx.strokeStyle='#8e6842';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#bd9b5f';ctx.fillRect(-16,-8,8,16);ctx.fillStyle='#d7c787';ctx.fillRect(20,-8,12,16);ctx.restore();
  ctx.save();ctx.shadowColor=col;ctx.shadowBlur=11;circle(w.x,w.y,28,'#0b1113',true);ctx.restore();circle(w.x,w.y,28,col);
  ctx.strokeStyle='#d5bf82';ctx.lineWidth=2;ctx.beginPath();ctx.arc(w.x,w.y,25,.25,2.9);ctx.stroke();
  if(card){ctx.save();ctx.shadowColor=spellCol;ctx.shadowBlur=22;circle(w.x,w.y,19,spellCol+'66',true);ctx.restore();circle(w.x,w.y,18,'#12171a',true);text(card.icon,w.x,w.y+8,spellCol,21);
  } else {circle(w.x,w.y,18,'#12171a',true);text('—',w.x,w.y+6,'#71816d',16);}
  ctx.strokeStyle=col;ctx.lineWidth=3;ctx.beginPath();ctx.arc(w.x,w.y,35,-Math.PI/2,-Math.PI/2+Math.PI*2*progress);ctx.stroke();ctx.lineWidth=1;
  if(age<.3){ctx.save();ctx.globalAlpha=1-age/.3;ctx.shadowColor=spellCol;ctx.shadowBlur=24;circle(w.x+dx*31,w.y+dy*31,10+age*20,'#fff4d0',true);ctx.restore();}
  if(age<.4){ctx.globalAlpha=1-age/.4;circle(w.x,w.y,34+age*42,spellCol);ctx.globalAlpha=1;}
 }
 if(!battle)return;
 for(const l of battle.links.filter(l=>battle.time-l.time<.9).slice(-8)){const a=battle.wands[l.from],b=battle.wands[l.to],age=battle.time-l.time,color=l.kind==='charge'?'#91c9df':'#e5c887',cx=a.x+(a.side?-110:110);ctx.globalAlpha=1-age/.9;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx,(a.y+b.y)/2,b.x,b.y);ctx.stroke();const t=Math.min(1,age/.45),px=(1-t)*(1-t)*a.x+2*(1-t)*t*cx+t*t*b.x,py=(1-t)*a.y+t*b.y;circle(px,py,4,color,true);ctx.globalAlpha=1;}
 const latest=new Map();for(const p of battle.projectiles)latest.set(p.source,p.id);
 for(const p of battle.projectiles){const d=CARDS[p.c.id];ctx.save();ctx.shadowColor=d.color;ctx.shadowBlur=16;line(p.x-p.vx*.085,p.y-p.vy*.085,p.x,p.y,d.color,5);circle(p.x,p.y,7,d.color,true);circle(p.x,p.y,2.5,'#fff7df',true);ctx.restore();}
 const stacks=new Map();for(const e of battle.effects.slice(-12)){const age=battle.time-e.time,key=e.x+','+e.y,stack=stacks.get(key)||0;stacks.set(key,stack+1);ctx.globalAlpha=Math.max(0,1-age);
  if(e.text.startsWith('−')){ctx.lineWidth=2;circle(e.x,e.y,28+age*42,e.color);ctx.lineWidth=1;}
  const origin=battle.wands.find(w=>w.x===e.x&&w.y===e.y);
  if(origin){text(e.text,e.x+(origin.side?-48:48),e.y-20-age*15-stack*17,e.color,12,origin.side?'right':'left');}
  else text(e.text,e.x,e.y-30-age*25-stack*17,e.color,13);ctx.globalAlpha=1;
 }
}function frame(stamp){const elapsed=Math.min(.1,(stamp-lastStamp)/1000);lastStamp=stamp;if(battle&&!paused&&!battle.result){accumulator+=elapsed*speed;while(accumulator>=1/60&&!battle.result){battle.step();accumulator-=1/60;}}if(stamp-lastUi>80){refresh();lastUi=stamp;}draw();requestAnimationFrame(frame);}
renderEditor();refresh();requestAnimationFrame(frame);







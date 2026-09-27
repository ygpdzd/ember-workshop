'use strict';
const {KEYWORDS,SPELLS,WANDS,PRESETS,ENEMIES,compile,treeText,Battle}=WandLab;
const $=id=>document.getElementById(id);
let cards=[...PRESETS.burn.cards],battle=null,paused=false,speed=.5,filter='全部',accumulator=0,lastStamp=0,lastUi=0,lastLog=0;
let cached=compile(cards);
const canvas=$('arenaCanvas'),ctx=canvas.getContext('2d');
function locked(){return battle!==null;}
const PRESET_HINTS={tempo:'疾行符加速自己的法杖 → 回响弹命中为自己的法杖充能 → 充能符推进下一发重矛。只有一条施法计时。',burn:'余烬 → 余烬 → 引爆：先堆状态，再选择提前兑现。',poison:'毒刺 → 护盾 → 冰针：穿盾消耗，用防御和减速争取时间。',shock:'电弧 → 火花 → 火花：先施加感电，后续两次命中各消耗一层。',defense:'净化 → 护盾 → 重矛：对抗蚀火术士，观察净化与少打一发的取舍。',steady:'三发直接弹丸循环；适合作为无复杂组合的对照。',payload:'进阶：载体命中后，同时释放余烬与引爆。结构模块会把多个槽合成一组。'};
function keywordLabel(s){return s.keyword?(KEYWORDS[s.keyword].target==='wand'?'法杖·':'角色·')+KEYWORDS[s.keyword].name:s.action?s.action:s.advanced?'进阶':s.type==='辅助'?'自身':'直伤';}
function renderLibrary(){
 const advanced=$('advanced').checked;
 $('spellCount').textContent=Object.values(SPELLS).filter(s=>advanced||!s.advanced).length;
 document.querySelectorAll('.advanced-filter').forEach(el=>el.classList.toggle('hidden',!advanced));
 $('library').innerHTML=Object.entries(SPELLS).filter(([id,s])=>(advanced||!s.advanced)&&(filter==='全部'||s.type===filter)).map(([id,s])=>`<button class="spell" data-add="${id}" style="--spell:${s.color}" title="${s.desc}" ${locked()||cards.length>=8?'disabled':''}><span class="spell-icon">${s.icon}</span><span class="spell-info"><span class="spell-name">${s.name} <small class="keyword-chip">${keywordLabel(s)}</small></span><span class="spell-type">${s.desc}</span></span><span class="spell-add">+</span></button>`).join('');
}
function statusBadges(u,target='character'){
 if(!u)return '<span class="no-status">暂无效果</span>';
 const entries=(target==='wand'?[['haste',Math.max(0,u.hasteUntil-battle.time)],['slow',Math.max(0,u.slowUntil-battle.time)],['charge',battle.time-u.lastChargeAt<.8?u.lastChargeAmount:0]]:[['burn',u.burn],['poison',u.poison],['shock',u.shock],['shield',u.shield]]).filter(([,v])=>v>0);
 return entries.map(([id,v])=>{const k=KEYWORDS[id];const label=k.kind==='duration'?v.toFixed(1)+'s':id==='charge'?'刚刚 −'+v.toFixed(2)+'s':id==='shield'?Math.round(v)+'点':v+'层';const tick=id==='burn'||id==='poison'?` · 下一跳${Math.max(0,u[id+'At']-battle.time).toFixed(1)}s`:'';return `<span class="status-badge" style="--status:${k.color}" title="${k.desc}${tick}">${k.icon} ${k.name} ${label}${tick?`<small>${tick}</small>`:''}</span>`;}).join('')||'<span class="no-status">暂无效果</span>';
}
function leafNames(n){return n.children.length?n.children.map(leafNames).join(' + '):SPELLS[n.id].name;}
function nodeHTML(n){const s=SPELLS[n.id];return `<div class="tree-spell"><span style="color:${s.color}">${s.icon} ${s.name}</span>${n.children.length?`<div class="tree-children"><small>${n.id==='trigger'?'命中后释放 ↓':n.id==='double'?'同时施放 ↓':'作用于 ↓'}</small>${n.children.map(nodeHTML).join('')}</div>`:''}</div>`;}
function renderMonitor(){
 const u=battle?.units[0],next=u?.cursor||0;
 $('step').disabled=!battle||!paused||!!battle.result;
 let status=`${cached.roots.length} 发循环 · 每发间隔 ${WANDS[$('wand').value].interval.toFixed(2)}s`;
 let progress=0;
 if(u){progress=1-Math.max(0,u.timer)/u.timerTotal;
  status=battle.result?'战斗结束 · 重置后可编辑':`下一发：${SPELLS[u.program.roots[next].id].name} · 剩余计时 ${Math.max(0,u.timer).toFixed(2)}s · 计时速度 ×${battle.wandRate(u).toFixed(2)}`;
  if(paused&&!battle.result)status='已暂停 · '+status;
 }
 $('castCountdown').textContent=status;
 $('castProgress').style.width=Math.max(0,Math.min(100,progress*100))+'%';
 $('castQueue').innerHTML=cached.errors.length?'<span class="muted">补齐进阶组合后即可运行</span>':cached.roots.map((n,i)=>{const spell=SPELLS[n.id],active=u&&u.lastIndex===n.index&&battle.time-u.lastCastAt<.45;return `<div class="queue-group ${active?'firing':''} ${u&&!battle.result&&next===i?'up-next':''}"><b>${i+1} <small>${n.children.length?'组合':keywordLabel(spell)}</small></b><span style="color:${spell.color}">${spell.icon} ${spell.name}</span>${n.children.length?`<small>${n.id==='trigger'?'命中后：':'包含：'}${leafNames(n)}</small>`:''}<em>${active?'刚刚施放':u&&!battle.result&&next===i?'下一发':'按序循环'}</em></div>`;}).join('<span class="queue-arrow">→</span>');
 if(!battle){$('flightTracks').innerHTML='<div class="track-empty">等待 → 杖尖发射 → 命中生效。辅助法术只作用于自身；进阶载体命中后才释放内部法术。</div>';return;}
 const all=battle.traces.filter(t=>!t.side),live=t=>battle.projectiles.filter(p=>p.trace===t),inFlight=all.filter(t=>live(t).length),recent=all.slice(-3);
 const traces=[...new Set([...inFlight,...recent])].sort((a,b)=>b.id-a.id).slice(0,5);
 $('flightTracks').innerHTML=traces.map(t=>{const flying=live(t),root=u.program.roots.find(n=>n.index===t.root),hasTrigger=contains(root,'trigger');
 const stage=flying.length?(t.triggers.length?'已触发 · 子法术飞行中':'飞行中'):t.hits?`已命中 ${t.hits} 次`:t.wallHits?'撞击障碍':t.expired?'飞行结束':'辅助已生效';
 const stopped=battle.result&&flying.length?'战斗结束 · 飞行已停止':stage;
 return `<div class="flight-row ${flying.length?'in-flight':''}"><div><b>#${t.id} · 第 ${t.group} 发</b><small>${t.time.toFixed(2)}s 发动</small></div><div class="trace-path"><span class="done">${!emits(root)?'自身施法':'杖尖发射'}</span><i>→</i><span class="${!emits(root)||t.hits||t.wallHits?'done':flying.length?'trace-active':''}">${!emits(root)?'立即生效':'飞行 / 命中'}</span>${hasTrigger?`<i>→</i><span class="${t.triggers.length?'done':''}">${t.triggers.length?'载荷已触发 '+t.triggers.length+' 次':'等待载荷触发'}</span>`:''}<strong>${stopped}</strong></div></div>`;
 }).join('')||'<div class="track-empty">倒计时中，尚未施法。</div>';
}
function immediateActions(n){return n.id!=='trigger'&&n.children.length?n.children.flatMap(immediateActions):[n];}
function emits(n){return n.id==='trigger'||SPELLS[n.id].type==='弹丸'||n.children.some(emits);}
function contains(n,id){return n.id===id||n.children.some(c=>contains(c,id));}
function tag(text,x,y,color){ctx.save();ctx.font='13px "Microsoft YaHei"';ctx.textAlign='center';const width=ctx.measureText(text).width+16;ctx.fillStyle='#101a15ee';ctx.fillRect(x-width/2,y-16,width,23);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();}
function editor(){
 cached=compile(cards);renderLibrary();
 $('slots').innerHTML=Array.from({length:8},(_,i)=>{const s=SPELLS[cards[i]];if(!s)return `<div class="slot empty"><span>${String(i+1).padStart(2,'0')}</span></div>`;return `<div class="slot" data-slot="${i}" style="--spell:${s.color}" title="${s.desc}"><span class="slot-index">${String(i+1).padStart(2,'0')}</span><button class="slot-remove" data-remove="${i}" aria-label="移除第 ${i+1} 槽${s.name}" ${locked()?'disabled':''}>×</button><div class="slot-icon">${s.icon}</div><div class="slot-name">${s.name}</div><div class="slot-tools"><button data-move="${i}" data-dir="-1" aria-label="第 ${i+1} 槽左移" ${locked()||i===0?'disabled':''}>←</button><button data-move="${i}" data-dir="1" aria-label="第 ${i+1} 槽右移" ${locked()||i===cards.length-1?'disabled':''}>→</button></div></div>`;}).join('');
 $('slotCount').textContent=cards.length+' / 8';
 const w=WANDS[$('wand').value];$('wandStats').innerHTML=`<span>唯一施法间隔<b>${w.interval.toFixed(2)} s</b></span><span>基础直伤<b>×${w.power.toFixed(2)}</b></span><span>循环规则<b>末尾回到第一发</b></span>`;
 const errors=[...cached.errors];
 $('error').textContent=errors.join(' ');
 $('program').innerHTML=cached.errors.length?'<span class="muted">补齐结构后，这里将显示实际执行关系。</span>':cached.roots.map((n,i)=>`<div class="root-node" data-root="${n.index}"><strong>第 ${i+1} 发${n.children.length?' · 进阶组合':''}</strong>${nodeHTML(n)}</div>`).join('');
 $('start').disabled=errors.length>0||(battle&&!battle.result);$('start').textContent=battle&&battle.result?'▶ 同配置再试':'▶ 开始实验';
 ['wand','enemy','wall','clear','advanced'].forEach(id=>$(id).disabled=locked());
 document.querySelectorAll('[data-preset]').forEach(b=>{b.disabled=locked();b.classList.toggle('active',JSON.stringify(PRESETS[b.dataset.preset].cards)===JSON.stringify(cards));});
 $('editState').textContent=locked()?'配置已锁定 · 重置后可编辑':'战斗开始后锁定配置';
 const preset=Object.keys(PRESETS).find(id=>JSON.stringify(PRESETS[id].cards)===JSON.stringify(cards));$('presetHint').textContent=PRESET_HINTS[preset]||'自定义编排：普通法术一槽一发，按从左到右的顺序循环。';
 $('enemyName').textContent=ENEMIES[$('enemy').value].name;$('enemy').title=ENEMIES[$('enemy').value].desc;renderMonitor();
}
function refresh(){
 const a=battle?.units[0],b=battle?.units[1];
 $('clock').textContent=(battle?.time||0).toFixed(2).padStart(5,'0');
 $('phase').textContent=battle?(battle.result?'COMPLETE':paused?'PAUSED':'LIVE / AUTO'):'STANDBY';
 $('playerStatus').textContent=a?('法杖计时 ×'+battle.wandRate(a).toFixed(2)):'等待启动';
 $('enemyStatus').textContent=b?('法杖计时 ×'+battle.wandRate(b).toFixed(2)):'等待启动';
 $('playerHp').style.width=(a?a.hp/a.maxHp*100:100)+'%';$('enemyHp').style.width=(b?b.hp/b.maxHp*100:100)+'%';
 $('playerEffects').innerHTML=statusBadges(a);$('enemyEffects').innerHTML=statusBadges(b);
 $('playerWandEffects').innerHTML=statusBadges(a,'wand');$('enemyWandEffects').innerHTML=statusBadges(b,'wand');
 $('playerNumbers').textContent=Math.ceil(a?.hp??220)+' / 220 HP';$('enemyNumbers').textContent=Math.ceil(b?.hp??220)+' / 220 HP';
 $('playerShield').textContent=Math.round(a?.shield||0)+' 护盾';$('enemyShield').textContent=Math.round(b?.shield||0)+' 护盾';
 $('damageStat').textContent=a?Math.round(a.stats.damage):'—';$('castStat').textContent=a?a.stats.casts:'—';$('triggerStat').textContent=a?a.stats.triggers:'—';$('dotStat').textContent=a?Math.round(a.stats.dot):'—';
 document.querySelectorAll('[data-slot]').forEach(el=>{const index=Number(el.dataset.slot);const recent=battle?.traces.some(t=>!t.side&&t.nodes[index]!==undefined&&battle.time-t.nodes[index]<.65);el.classList.toggle('current',!!recent);});
 renderMonitor();
 document.querySelectorAll('[data-root]').forEach(el=>el.classList.toggle('current',!!a&&a.lastIndex===Number(el.dataset.root)));
 if(battle&&battle.sequence!==lastLog){lastLog=battle.sequence;$('log').innerHTML=battle.events.slice(-28).reverse().map(e=>`<div class="log-line ${e.kind}"><time>${e.t.toFixed(2).padStart(5,'0')}</time>${e.text}</div>`).join('');}
 if(battle?.result){$('result').classList.remove('hidden');const title={win:'构筑获胜',loss:'实验未通过',draw:'同时倒下',timeout:'对局平局'}[battle.result];$('result').innerHTML=`<strong>${title}</strong><p>${battle.time.toFixed(2)} 秒 · ${Math.round(a.stats.damage)} 伤害 · ${a.stats.triggers} 次载荷触发</p><p>${battle.result==='loss'?'看一眼运行记录，重置后试试另一种排列。':'重置后修改配置，比较下一次运行。'}</p>`;$('pause').disabled=true;$('start').disabled=false;$('start').textContent='▶ 同配置再试';}
}
function start(){try{battle=new Battle({cards,wand:$('wand').value,enemy:$('enemy').value,wall:$('wall').checked});paused=false;accumulator=0;lastLog=0;$('result').classList.add('hidden');$('pause').disabled=false;$('pause').textContent='暂停';editor();refresh();}catch(e){$('error').textContent=e.message;}}
function reset(){battle=null;paused=false;accumulator=0;lastLog=0;$('result').classList.add('hidden');$('pause').disabled=true;$('pause').textContent='暂停';$('log').innerHTML='<p class="log-empty">配置已解锁。改变你的法杖，再做一次实验。</p>';editor();refresh();}
$('library').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b&&!locked()&&cards.length<8){cards.push(b.dataset.add);editor();}});
$('slots').addEventListener('click',e=>{if(locked())return;const remove=e.target.closest('[data-remove]'),move=e.target.closest('[data-move]');if(remove)cards.splice(Number(remove.dataset.remove),1);else if(move){const i=Number(move.dataset.move),j=i+Number(move.dataset.dir);if(j>=0&&j<cards.length)[cards[i],cards[j]]=[cards[j],cards[i]];}else return;editor();});
$('clear').onclick=()=>{if(!locked()){cards=[];editor();}};
$('start').onclick=start;$('reset').onclick=reset;
$('step').onclick=()=>{if(!battle||!paused||battle.result)return;accumulator=0;for(let i=0;i<15&&!battle.result;i++)battle.step(1/60);refresh();draw();};
$('pause').onclick=()=>{paused=!paused;accumulator=0;$('pause').textContent=paused?'继续':'暂停';refresh();};
['wand','enemy','wall'].forEach(id=>$(id).onchange=()=>{editor();refresh();});
for(const b of document.querySelectorAll('[data-filter]'))b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderLibrary();};
$('presets').innerHTML='<span>一键配方</span>'+Object.entries(PRESETS).map(([id,p])=>`<button data-preset="${id}">${p.name}</button>`).join('');
$('keywordGuide').innerHTML=[['wand','法杖目标','改变施法节奏 · 不增加资源条'],['character','角色目标','改变生存与伤害结算']].map(([target,title,hint])=>`<section class="keyword-target"><h3>${title}<small>${hint}</small></h3><div class="keyword-target-grid">${Object.entries(KEYWORDS).filter(([,k])=>k.target===target).map(([id,k])=>`<details class="keyword-card" data-keyword="${id}" style="--status:${k.color}"><summary>${k.icon} ${k.name}<span>${k.kind==='instant'?'即时效果':'规则'} +</span></summary><p>${k.desc}</p></details>`).join('')}</div></section>`).join('')+'<p class="keyword-note">引爆弹、净化是卡牌，不是关键词。卡牌决定何时、对谁、施加或消耗多少效果。</p>';
$('advanced').onchange=()=>{filter='全部';document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b.dataset.filter==='全部'));renderLibrary();};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>{if(locked())return;cards=[...PRESETS[b.dataset.preset].cards];$('advanced').checked=cards.some(id=>SPELLS[id].advanced);filter='全部';document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x.dataset.filter==='全部'));editor();};
for(const b of document.querySelectorAll('[data-speed]'))b.onclick=()=>{speed=Number(b.dataset.speed);document.querySelectorAll('[data-speed]').forEach(x=>x.classList.toggle('active',x===b));};
$('helpBtn').onclick=()=>$('help').showModal();$('closeHelp').onclick=()=>$('help').close();
function line(x1,y1,x2,y2,color,width=1){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}
function circle(x,y,r,color,fill=false){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=color;ctx.fill();}else{ctx.strokeStyle=color;ctx.stroke();}}
function drawUnit(side){const u=battle?.units[side],x=side?835:125,y=205,color=side?'#eaa386':'#e6c887';ctx.save();ctx.translate(x,y);if(u?.hp===0)ctx.globalAlpha=.25;
 const glow=ctx.createRadialGradient(0,0,0,0,0,85);glow.addColorStop(0,side?'#b36e4222':'#c5a65a22');glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;ctx.fillRect(-85,-85,170,170);
 ctx.fillStyle=side?'#594438':'#4c5440';ctx.beginPath();ctx.moveTo(0,-36);ctx.lineTo(-19,13);ctx.lineTo(21,13);ctx.closePath();ctx.fill();
 ctx.fillStyle=side?'#b38365':'#b4ad7b';ctx.fillRect(-9,-10,18,21);ctx.fillStyle='#131e18';ctx.fillRect(-7,-5,5,4);ctx.fillRect(3,-5,5,4);ctx.fillStyle='#3a4635';ctx.fillRect(-14,11,28,25);ctx.fillRect(-17,32,12,8);ctx.fillRect(5,32,12,8);
 const dir=side?-1:1;const age=u?battle.time-u.lastCastAt:99;
 line(dir*8,13,dir*23,0,color,5);circle(dir*23,0,5,color,true);
 if(age<.35){ctx.globalAlpha=1-age/.35;const shot=emits(u.program.roots.find(n=>n.index===u.lastIndex));if(shot){circle(dir*23,0,12+age*35,color);line(dir*23,0,dir*55,0,color,3);}else{circle(0,0,35+age*40,'#7ed8be');}ctx.globalAlpha=1;}
 if(u&&age<.8){ctx.font='bold 13px "Microsoft YaHei"';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(`#${u.lastTrace.id} 第${u.lastTrace.group}发`,0,-88);ctx.font='12px "Microsoft YaHei"';ctx.fillText(SPELLS[u.cards[u.lastIndex]].name,0,-69);}
 if(u?.shield>0){ctx.lineWidth=2;circle(0,0,49,'#8fd4c6aa');ctx.lineWidth=1;circle(0,0,54,'#8fd4c633');}
 if(u?.slowUntil>battle?.time){circle(dir*23,0,18,KEYWORDS.slow.color);}
 if(u?.hasteUntil>battle?.time){circle(dir*23,0,23,KEYWORDS.haste.color);}
 if(u){const active=[['burn',u.burn],['poison',u.poison],['shock',u.shock]].filter(([,n])=>n);active.forEach(([id,n],i)=>{const k=KEYWORDS[id];ctx.font='12px Microsoft YaHei';ctx.fillStyle=k.color;ctx.textAlign='center';ctx.fillText(`${k.icon} ${k.name}${n}`,0,60+i*17);});}
 ctx.restore();line(x-48,253,x+48,253,'#7b876143',2);ctx.font='10px monospace';ctx.textAlign='center';ctx.fillStyle='#6f7f64';ctx.fillText(side?'OPPONENT / 02':'YOUR WAND / 01',x,278);}
function draw(){ctx.clearRect(0,0,960,370);const g=ctx.createLinearGradient(0,0,0,370);g.addColorStop(0,'#141e19');g.addColorStop(.7,'#19261d');g.addColorStop(1,'#152018');ctx.fillStyle=g;ctx.fillRect(0,0,960,370);
 // Architectural silhouettes and floor grid are generated locally, no image assets required.
 for(let i=0;i<9;i++){const x=35+i*112;ctx.fillStyle='#1d2b2066';ctx.fillRect(x,35,24,185);ctx.fillRect(x-6,35,36,8);line(x+2,44,x+2,214,'#38483340');}
 line(0,254,960,254,'#3e513335');for(let y=268;y<370;y+=25)line(0,y,960,y,'#3a4a3025');for(let x=-700;x<1600;x+=120)line(480+(x-480)*.45,254,x,370,'#3a4a3025');
 ctx.setLineDash([3,9]);line(480,32,480,244,'#5e70433b');ctx.setLineDash([]);circle(480,154,36,'#50663a22');circle(480,154,25,'#50663a22');
 const wall=battle?battle.wall:($('wall').checked?{hp:50,max:50}:null);if(wall&&wall.hp>0){ctx.fillStyle='#586249';ctx.fillRect(467,135,26,110);for(let y=135;y<245;y+=22){line(467,y,493,y,'#253320',2);line(480,y,480,y+22,'#253320',1);}ctx.fillStyle='#c4c4a2';ctx.font='10px monospace';ctx.textAlign='center';ctx.fillText('BARRIER '+Math.ceil(wall.hp),480,121);}
 drawUnit(0);drawUnit(1);
 if(battle){for(const p of battle.projectiles){ctx.save();ctx.shadowBlur=13;ctx.shadowColor=p.color;line(p.x-p.vx*.08,p.y-p.vy*.08,p.x,p.y,p.color,p.type==='lance'?4:2);circle(p.x,p.y,p.payload?9:p.type==='bomb'?7:5,p.color,true);if(p.payload){circle(p.x,p.y,15,'#b9a0ef');}ctx.restore();
 if(!p.side){const labelY=p.y-(p.type==='bomb'?56:29);tag(`#${p.trace?.id||'–'} ${p.payload?'载体 · 内含 '+leafNames(p.payload):SPELLS[p.type].name}`,Math.max(105,Math.min(800,p.x)),labelY,p.color);line(p.x,labelY+6,p.x,p.y-12,p.color+'77');}}
 const triggered=battle.traces.filter(t=>!t.side&&t.triggers.some(e=>battle.time-e.time<1.2)).slice(-1)[0];
 if(triggered){const e=triggered.triggers.at(-1);const root=battle.units[0].program.roots.find(n=>n.index===triggered.root);const find=(n,index)=>n.index===index?n:n.children.map(c=>find(c,index)).find(Boolean);const payload=find(root,e.node);const center=Math.max(250,Math.min(650,e.x));const spells=immediateActions(payload);tag(`#${triggered.id} 命中 → ${payload.id==='double'?'同时释放':'执行内部法术'}`,center,60,'#d1b7ff');
 ctx.save();ctx.setLineDash([3,4]);line(e.x,193,center,78,'#a88acf99');ctx.setLineDash([]);circle(e.x,193,19+(battle.time-e.time)*10,'#cbb0ff77');
 spells.forEach((n,i)=>{const x=center+(i-(spells.length-1)/2)*98;const s=SPELLS[n.id];line(center,78,x,108,'#a88acf77');circle(x,125,17,s.color+'55',true);ctx.font='23px "Microsoft YaHei"';ctx.textAlign='center';ctx.fillStyle=s.color;ctx.fillText(s.icon,x,133);tag(s.name,x,162,s.color);});ctx.restore();} 
 for(const e of battle.effects){ctx.save();const t=1-e.life/e.max;ctx.globalAlpha=1-t;ctx.lineWidth=1.5;circle(e.x,e.y,e.r*(.4+t),e.color);if(e.text){ctx.fillStyle=e.color;ctx.textAlign='center';ctx.font='12px monospace';ctx.fillText(e.text,e.x,e.y-27-t*28);}ctx.restore();}}
 else{ctx.textAlign='center';ctx.font='12px "Microsoft YaHei"';ctx.fillStyle='#8c997d';ctx.fillText('你的法术，将在这里展开。',480,316);}
}
function frame(stamp){const elapsed=Math.min((stamp-lastStamp)/1000,.1);lastStamp=stamp;if(battle&&!paused&&!battle.result){accumulator+=elapsed*speed;while(accumulator>=1/60&&!battle.result){battle.step(1/60);accumulator-=1/60;}}if(stamp-lastUi>90){refresh();lastUi=stamp;}draw();requestAnimationFrame(frame);}
editor();refresh();requestAnimationFrame(frame);

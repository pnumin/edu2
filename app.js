/* Offline, dependency-free SVG dashboard. All figures use the workbook's rounded values. */
(() => {
'use strict';
const all=window.BUDGET_DATA;
const $=id=>document.getElementById(id);
const palette=['#6270ee','#a368e7','#12b9a5','#f49953','#ed7298','#42afd8','#c9a342','#8696c8'];
const colors={'전력운영':palette[0],'방위력개선':palette[1],'병무행정':palette[2]};
const fmt=n=>new Intl.NumberFormat('ko-KR',{maximumFractionDigits:0}).format(n);
const money=n=>`${n<0?'−':''}${Math.abs(n)>=10000?`${fmt(Math.floor(Math.abs(n)/10000))}조 ${fmt(Math.abs(n)%10000)}`:fmt(Math.abs(n))}억`;
const pct=n=>Number.isFinite(n)?`${n>0?'+':''}${(n*100).toFixed(1)}%`:'—';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum=(rows,key)=>rows.reduce((a,r)=>a+r[key],0);
const group=(rows,key)=>[...new Set(rows.map(r=>r[key]))].map(name=>({name,y2026:sum(rows.filter(r=>r[key]===name),'y2026'),y2027:sum(rows.filter(r=>r[key]===name),'y2027')}));
const tip=r=>`${r.program}\n${r.sector} · ${r.account}\n2026년 ${fmt(r.y2026)}억 원\n2027년 ${fmt(r.y2027)}억 원\n증감 ${fmt(r.change)}억 원 / ${pct(r.rate)}`;
const attr=s=>`data-tip="${esc(s)}"`;
const svg=(content,w=600,h=300)=>`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="필터된 예산 시각화">${content}</svg>`;
const text=(x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra}>${esc(t)}</text>`;
const rect=(x,y,w,h,fill,extra='')=>`<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${fill}" ${extra}/>`;
const empty=(id,msg='해당 조건의 양수 재원이 없습니다')=>$(id).innerHTML=`<div class="empty"><span>◌</span>${esc(msg)}</div>`;
let filtered=[...all],sortKey='y2027',sortDirection=-1;

function init(){
 $('sector').innerHTML='<option value="">전체 부문</option>'+[...new Set(all.map(r=>r.sector))].map(x=>`<option>${esc(x)}</option>`).join('');
 updateAccounts();
 $('sector').addEventListener('change',()=>{updateAccounts();render();});
 $('account').addEventListener('change',render);
 $('reset').addEventListener('click',()=>{$('sector').value='';updateAccounts();$('account').value='';$('search').value='';render();});
 $('search').addEventListener('input',renderTable);
 $('download').addEventListener('click',download);
 document.querySelectorAll('[data-sort]').forEach(el=>el.addEventListener('click',()=>{const key=el.dataset.sort;sortDirection=key===sortKey?-sortDirection:(['y2026','y2027','change','rate'].includes(key)?-1:1);sortKey=key;renderTable();}));
 document.addEventListener('pointermove',e=>{const el=e.target.closest('[data-tip]');const box=$('tooltip');if(!el){box.style.display='none';return;}box.innerHTML=el.dataset.tip.split('\n').map((t,i)=>i===0?`<strong>${esc(t)}</strong>`:esc(t)).join('<br>');box.style.display='block';box.style.left=`${Math.max(8,Math.min(e.clientX+16,window.innerWidth-310))}px`;box.style.top=`${Math.max(8,Math.min(e.clientY+16,window.innerHeight-box.offsetHeight-12))}px`;});
 document.addEventListener('pointerleave',()=>{$('tooltip').style.display='none';});
 render();
}
function updateAccounts(){const previous=$('account').value;const options=[...new Set(all.filter(r=>!$('sector').value||r.sector===$('sector').value).map(r=>r.account))];$('account').innerHTML='<option value="">전체 회계</option>'+options.map(x=>`<option>${esc(x)}</option>`).join('');$('account').value=options.includes(previous)?previous:'';}
function render(){
 filtered=all.filter(r=>(!$('sector').value||r.sector===$('sector').value)&&(!$('account').value||r.account===$('account').value));
 $('filter-count').textContent=`${filtered.length} / ${all.length}개 항목`;
 const a=sum(filtered,'y2026'),b=sum(filtered,'y2027'),d=b-a,rate=a?d/a:NaN;
 const kpis=[['2027년 순재원',money(b),'정부안 · 차감액 포함',palette[0],'◈'],['2026년 순재원',money(a),'전년도 비교 기준',palette[1],'◫'],['전년 대비 증감',money(d),`증가 ${filtered.filter(r=>r.change>0).length}개 · 감소 ${filtered.filter(r=>r.change<0).length}개`,d>=0?palette[2]:palette[4],d>=0?'↗':'↘'],['전년 대비 증감률',pct(rate),`${filtered.length}개 항목 합계 기준`,palette[3],'%']];
 $('kpis').innerHTML=kpis.map(k=>`<article class="kpi" style="--accent:${k[3]}"><div class="kpi-top">${k[0]}<span class="kpi-icon">${k[4]}</span></div><div class="kpi-value">${k[1]}</div><div class="kpi-caption">${k[2]}</div></article>`).join('');
 sectorChart();accountChart();rankingChart();changeChart();treemapChart();scatterChart();categoryChart();heatmapChart();renderTable();
}
function sectorChart(){
 const rows=group(filtered,'sector');if(!rows.length)return empty('sector-chart','조건에 맞는 항목이 없습니다');
 const W=600,H=270,L=58,R=18,T=18,B=35,span=H-T-B;const min=Math.min(0,...rows.flatMap(r=>[r.y2026,r.y2027])),max=Math.max(0,...rows.flatMap(r=>[r.y2026,r.y2027]));const range=max-min||1,y=v=>T+(max-v)/range*span;
 let s='';for(let i=0;i<=4;i++){const v=min+(max-min)*i/4,yy=y(v);s+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#edf0f7"/>`+text(L-8,yy+4,fmt(v),'text-anchor="end"');}
 const slot=(W-L-R)/rows.length,bw=Math.min(48,slot/3);
 rows.forEach((r,i)=>{const x=L+slot*(i+.5);[['y2026','#c5c9f9',-bw-3],['y2027',colors[r.name],3]].forEach(([key,c,off])=>{const v=r[key];s+=rect(x+off,Math.min(y(v),y(0)),bw,Math.abs(y(v)-y(0)),c,`rx="5" ${attr(`${r.name}\n${key==='y2026'?'2026':'2027'}년 ${fmt(v)}억 원`)}`);});s+=text(x,H-10,r.name,'text-anchor="middle"');});
 $('sector-chart').innerHTML='<div class="legend"><span><i style="background:#c5c9f9"></i>2026년</span><span><i style="background:#6270ee"></i>2027년</span></div>'+svg(s,W,H);
}
function accountChart(){
 const positive=filtered.filter(r=>r.y2027>0),rows=group(positive,'account').sort((a,b)=>b.y2027-a.y2027),total=sum(positive,'y2027'),neg=sum(filtered.filter(r=>r.y2027<0),'y2027');
 if(!total)return empty('account-chart',`양수 재원 없음 · 차감액 ${fmt(neg)}억 원`);
 const R=77,C=2*Math.PI*R;let offset=0,s=`<circle cx="110" cy="120" r="${R}" fill="none" stroke="#f0f2f9" stroke-width="29"/>`;
 rows.forEach((r,i)=>{const len=r.y2027/total*C;s+=`<circle cx="110" cy="120" r="${R}" fill="none" stroke="${palette[i]}" stroke-width="29" stroke-dasharray="${Math.max(0,len-3)} ${C}" stroke-dashoffset="${-offset}" transform="rotate(-90 110 120)" ${attr(`${r.name}\n${fmt(r.y2027)}억 원\n양수 재원의 ${(r.y2027/total*100).toFixed(1)}%`)}/>`;offset+=len;});
 s+=text(110,113,'2027 양수 재원','text-anchor="middle"')+text(110,141,money(total),'text-anchor="middle" class="value" style="font-size:17px"');
 $('account-chart').innerHTML=`<div class="donut-wrap"><div class="donut">${svg(s,220,240)}</div><div class="donut-legend">${rows.map((r,i)=>`<div class="legend-row"><span><i class="dot" style="background:${palette[i]}"></i>${esc(r.name)}</span><strong>${(r.y2027/total*100).toFixed(1)}%</strong></div>`).join('')}<div class="deduction">내부거래 등 차감액<br><strong>${fmt(neg)}억 원</strong></div></div></div>`;
}
function rankingChart(){
 const rows=filtered.filter(r=>r.y2027>0).sort((a,b)=>b.y2027-a.y2027).slice(0,10);if(!rows.length)return empty('ranking-chart');
 const max=rows[0].y2027;let s='';rows.forEach((r,i)=>{const y=12+i*34; s+=text(0,y+13,`${i+1}. ${r.program.length>16?r.program.slice(0,15)+'…':r.program}`);s+=rect(188,y,310,19,'#f5f6fc','rx="5"');s+=rect(188,y,r.y2027/max*310,19,colors[r.sector],`rx="5" ${attr(tip(r))}`);s+=text(590,y+14,fmt(r.y2027),'text-anchor="end" class="value"');});$('ranking-chart').innerHTML=svg(s,600,350);
}
function changeChart(){
 const rows=[...filtered].sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,10);if(!rows.length)return empty('change-chart','조건에 맞는 항목이 없습니다');
 const max=Math.max(1,...rows.map(r=>Math.abs(r.change))),zero=380;let s=`<line x1="${zero}" x2="${zero}" y1="0" y2="345" stroke="#dde2ef"/>`;
 rows.forEach((r,i)=>{const y=12+i*34,w=Math.abs(r.change)/max*140; s+=text(0,y+13,r.program.length>16?r.program.slice(0,15)+'…':r.program);s+=rect(r.change>=0?zero:zero-w,y,w,19,r.change>=0?palette[1]:palette[4],`rx="4" ${attr(tip(r))}`);s+=text(595,y+14,`${r.change>0?'+':''}${fmt(r.change)}`,'text-anchor="end" class="value"');});$('change-chart').innerHTML=svg(s,600,350);
}
function treemapChart(){
 const rows=filtered.filter(r=>r.y2027>0).sort((a,b)=>b.y2027-a.y2027);if(!rows.length)return empty('treemap-chart');
 let s='',serial=0;
 function split(items,x,y,w,h){if(!items.length)return;if(items.length===1){const r=items[0],id=`tile${serial++}`,pad=3;s+=`<g ${attr(tip(r))}>`+rect(x+pad,y+pad,w-pad*2,h-pad*2,colors[r.sector],`rx="7" opacity="${.72+(serial%4)*.07}"`);if(w>95&&h>43){s+=`<clipPath id="${id}">${rect(x+12,y+6,w-24,h-12,'white')}</clipPath><g clip-path="url(#${id})">`+text(x+13,y+27,r.program,'style="fill:white;font-size:12px;font-weight:600"');if(h>65)s+=text(x+13,y+49,`${fmt(r.y2027)}억`,'style="fill:#ffffffc9;font-size:11px"');s+='</g>';}s+='</g>';return;}const total=sum(items,'y2027');let n=1,acc=items[0].y2027;while(n<items.length-1&&acc<total/2){acc+=items[n++].y2027;}const f=acc/total;if(w>=h){split(items.slice(0,n),x,y,w*f,h);split(items.slice(n),x+w*f,y,w*(1-f),h);}else{split(items.slice(0,n),x,y,w,h*f);split(items.slice(n),x,y+h*f,w,h*(1-f));}}
 const mapWidth=Math.max(300,$('treemap-chart').clientWidth),mapHeight=window.innerWidth<=680?310:245;
 split(rows,0,0,mapWidth,mapHeight);$('treemap-chart').innerHTML='<div class="legend">'+[...new Set(rows.map(r=>r.sector))].map(k=>`<span><i style="background:${colors[k]}"></i>${esc(k)}</span>`).join('')+'</div>'+svg(s,mapWidth,mapHeight);
}
function scatterChart(){
 const rows=filtered.filter(r=>r.y2026>0&&r.y2027>0&&Number.isFinite(r.rate));if(!rows.length)return empty('scatter-chart');
 const W=600,H=300,L=55,T=18,B=38,R=24,maxX=Math.max(1,...rows.map(r=>r.y2027))*1.08,minY=Math.min(0,...rows.map(r=>r.rate))-.06,maxY=Math.max(.05,...rows.map(r=>r.rate))+.08,x=v=>L+v/maxX*(W-L-R),y=v=>T+(maxY-v)/(maxY-minY)*(H-T-B);let s='';
 for(let i=0;i<=4;i++){const xx=x(maxX*i/4),v=minY+(maxY-minY)*i/4,yy=y(v);s+=`<line x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}" stroke="#edf0f7"/>`+text(L-8,yy+4,`${(v*100).toFixed(0)}%`,'text-anchor="end"')+text(xx,H-12,fmt(maxX*i/4),'text-anchor="middle"');}
 s+=`<line x1="${L}" x2="${W-R}" y1="${y(0)}" y2="${y(0)}" stroke="#ccd2e7" stroke-dasharray="4 4"/>`;
 rows.forEach(r=>{s+=`<circle cx="${x(r.y2027)}" cy="${y(r.rate)}" r="${5+Math.sqrt(r.y2027/maxX)*13}" fill="${colors[r.sector]}" fill-opacity=".68" stroke="white" stroke-width="2" ${attr(tip(r))}/>`;});
 [...rows].sort((a,b)=>b.y2027-a.y2027).slice(0,2).forEach(r=>s+=text(x(r.y2027)-5,y(r.rate)-19,r.program,'text-anchor="end" style="font-size:10px;fill:#6c7690"'));
 $('scatter-chart').innerHTML=svg(s,W,H);
}
function categoryChart(){
 const rows=group(filtered.filter(r=>r.y2027>0),'category').sort((a,b)=>b.y2027-a.y2027).slice(0,8);if(!rows.length)return empty('category-chart');
 const max=Math.max(1,...rows.flatMap(r=>[r.y2026,r.y2027]));let s='';rows.forEach((r,i)=>{const y=8+i*34; s+=text(0,y+18,r.name.length>14?r.name.slice(0,13)+'…':r.name);s+=rect(190,y,r.y2026/max*320,9,'#d5d1f5','rx="3"')+rect(190,y+12,r.y2027/max*320,9,palette[i],`rx="3" ${attr(`${r.name}\n2026년 ${fmt(r.y2026)}억 원\n2027년 ${fmt(r.y2027)}억 원`)}`)+text(595,y+20,fmt(r.y2027),'text-anchor="end" class="value"');});$('category-chart').innerHTML='<div class="legend"><span><i style="background:#d5d1f5"></i>2026년</span><span><i style="background:#6270ee"></i>2027년</span></div>'+svg(s,600,285);
}
function heatmapChart(){const rows=filtered.filter(r=>r.y2026>0&&Number.isFinite(r.rate)).sort((a,b)=>b.rate-a.rate);if(!rows.length)return empty('heatmap-chart','음수 차감액은 증감률 스펙트럼에서 제외합니다');$('heatmap-chart').innerHTML=rows.map(r=>{const c=r.rate<0?`hsl(344 64% ${Math.max(48,70-Math.abs(r.rate)*28)}%)`:`hsl(${252-Math.min(r.rate,1.3)*30} 62% ${Math.max(48,70-r.rate*16)}%)`;return `<div class="heat-tile" style="background:${c}" ${attr(tip(r))}><span class="name">${esc(r.program)}</span><strong>${pct(r.rate)}</strong></div>`;}).join('');}
function visibleTable(){const q=$('search').value.trim().toLowerCase();return filtered.filter(r=>!q||[r.program,r.category].some(t=>t.toLowerCase().includes(q))).sort((a,b)=>typeof a[sortKey]==='number'?sortDirection*(a[sortKey]-b[sortKey]):sortDirection*a[sortKey].localeCompare(b[sortKey],'ko'));}
function renderTable(){const rows=visibleTable();$('table-body').innerHTML=rows.map(r=>`<tr><td><span class="sector-tag" style="--tag:${colors[r.sector]}">${esc(r.sector)}</span></td><td>${esc(r.account)}</td><td>${esc(r.category)}</td><td class="program">${esc(r.program)}</td><td class="num">${fmt(r.y2026)}</td><td class="num">${fmt(r.y2027)}</td><td class="num ${r.change>=0?'positive':'negative'}">${r.change>0?'+':''}${fmt(r.change)}</td><td class="num ${r.rate>=0?'positive':'negative'}">${pct(r.rate)}</td></tr>`).join('')||'<tr><td colspan="8" style="text-align:center;padding:40px">검색 결과가 없습니다.</td></tr>';
 const a=sum(rows,'y2026'),b=sum(rows,'y2027');$('table-foot').innerHTML=`<tr><td colspan="4">표시 항목 합계</td><td class="num">${fmt(a)}</td><td class="num">${fmt(b)}</td><td class="num">${fmt(b-a)}</td><td class="num">${a?pct((b-a)/a):'—'}</td></tr>`;$('table-count').textContent=`${rows.length}개 표시 / 필터 결과 ${filtered.length}개 · 금액 단위: 억 원`;}
function download(){const rows=visibleTable(),quote=v=>'"'+String(v).replace(/"/g,'""')+'"',header=['부문','회계구분','구분','프로그램명','2026년(억원)','2027년(억원)','증감(억원)','증감률(%)'];const csv='\ufeff'+[header,...rows.map(r=>[r.sector,r.account,r.category,r.program,r.y2026,r.y2027,r.change,(r.rate*100).toFixed(4)])].map(r=>r.map(quote).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8;'})),a=document.createElement('a');a.href=url;a.download='국방예산_필터결과.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
init();
window.addEventListener('resize',treemapChart);
})();

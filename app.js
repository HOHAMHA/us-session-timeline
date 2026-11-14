(function(){
"use strict";
const CAT={ai:["AI·반도체·빅테크","--c-ai"],fed:["연준·금리","--c-fed"],data:["경제지표","--c-data"],etc:["지정학·기타","--c-etc"]};
const NS="http://www.w3.org/2000/svg";
const $=id=>document.getElementById(id);
const css=k=>getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const two=n=>String(n).padStart(2,"0");
const kst=t=>{const d=new Date((t+9*3600)*1000);return two(d.getUTCHours())+":"+two(d.getUTCMinutes());};
const kstFull=t=>{const d=new Date((t+9*3600)*1000);return (d.getUTCMonth()+1)+"/"+d.getUTCDate()+" "+kst(t);};
function etOffset(t){ // 미국 동부 서머타임: 3월 둘째 일요일 ~ 11월 첫째 일요일 (UTC 기준 근사)
  const y=new Date(t*1000).getUTCFullYear();
  const nth=(m,n)=>{const d=new Date(Date.UTC(y,m,1));const w=d.getUTCDay();return Date.UTC(y,m,1+((7-w)%7)+7*(n-1))/1000;};
  const s=nth(2,2)+7*3600, e=nth(10,1)+6*3600; return (t>=s&&t<e)?-4:-5;}
const et=t=>{const d=new Date((t+etOffset(t)*3600)*1000);return two(d.getUTCHours())+":"+two(d.getUTCMinutes());};
const fmt=p=>(p>0?"+":p<0?"−":"")+Math.abs(p).toFixed(2)+"%";
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

let D=null, pts=[], stats=null;

function prep(d){
  D=d; const step=d.step||300;
  pts=d.bars.map(b=>({t:b[0]+step,p:(b[1]/d.base-1)*100,lo:(b[2]/d.base-1)*100,hi:(b[3]/d.base-1)*100,s:b[0]}));
  const inReg=q=>q.s>=d.open&&q.s<d.close, pre=q=>q.s<d.open, post=q=>q.s>=d.close;
  const best=(arr,f,k)=>arr.reduce((a,b)=>a===null||f(b[k],a[k])?b:a,null);
  const P=pts.filter(pre),R=pts.filter(inReg),A=pts.filter(post);
  if(d.kind==="weekend"){const hi=best(pts,(x,y)=>x>y,"hi"),lo=best(pts,(x,y)=>x<y,"lo");stats={wk:true,hi,lo,last:pts[pts.length-1]};return;}
  stats={preHi:best(P,(x,y)=>x>y,"hi"),regLo:best(R,(x,y)=>x<y,"lo"),regHi:best(R,(x,y)=>x>y,"hi"),close:R[R.length-1],postLo:best(A,(x,y)=>x<y,"lo"),last:pts[pts.length-1]};
}
const at=t=>{let b=null;for(const q of pts){if(q.t<=t) b=q;}return b;};

function renderText(){
  if(D.kind==="weekend") return renderWeekend();
  $("title").textContent=`${D.label} 나스닥 장중 흐름과 뉴스 시각`;
  document.title=`미국장 뉴스 타임라인 · ${D.label}`;
  $("lede").textContent=`${D.symbol} ${D.step/60}분봉 종가를 전일 종가(${D.base.toFixed(2)}) 대비 등락률로 그리고, 주요 뉴스가 나온 시각을 세로선으로 겹쳤습니다. 시각은 한국 시간이며 표에 뉴욕 시간을 함께 적었습니다.`;
  const s=stats, c=v=>v<0?"neg":v>0?"pos":"";
  const it=[];
  if(s.preHi) it.push(`장전 고점 <b class="${c(s.preHi.hi)}">${fmt(s.preHi.hi)}</b> (${kst(s.preHi.s)})`);
  if(s.regHi) it.push(`장중 고점 <b class="${c(s.regHi.hi)}">${fmt(s.regHi.hi)}</b> (${kst(s.regHi.s)})`);
  if(s.regLo) it.push(`장중 저점 <b class="${c(s.regLo.lo)}">${fmt(s.regLo.lo)}</b> (${kst(s.regLo.s)})`);
  if(s.close) it.push(`정규장 종가 <b class="${c(s.close.p)}">${fmt(s.close.p)}</b>`);
  if(s.postLo) it.push(`시간외 저점 <b class="${c(s.postLo.lo)}">${fmt(s.postLo.lo)}</b> (${kst(s.postLo.s)})`);
  $("stats").innerHTML=it.map(x=>`<span>${x}</span>`).join("");
  $("legend").innerHTML=Object.values(CAT).map(([n,v])=>`<span><i class="sw" style="background:var(${v})"></i>${n}</span>`).join("")+`<span><i class="sw" style="background:var(--line);border-radius:2px;height:3px;width:16px"></i>${D.symbol} (전일 종가 대비)</span>`;
  $("note").textContent=D.notes||"";
  $("take").innerHTML=(D.takeaways||[]).map(k=>`<div><b>${esc(k.title)}</b><p>${esc(k.body)}</p></div>`).join("");
  $("take-h").hidden=true; $("th-a").textContent="당시"; $("th-b").textContent="30분 뒤";
  $("foot").textContent='회색 띠 = 정규장. "당시"는 뉴스 직전 봉 종가, "30분 뒤"는 그 30분 뒤 봉 종가(전일 종가 대비). 시간 대조 자료이며 인과를 단정하지 않습니다. 투자 권유가 아닙니다.';
  fillRows();
  $("src").textContent=D.sources||"";
}
function fillRows(){
  const rows=(D.pre||[]).map(e=>({...e,n:null})).concat(D.events.map((e,i)=>({...e,n:i+1})));
  $("rows").innerHTML=rows.map(e=>{
    const [nm,col]=CAT[e.cat]||CAT.etc; let a="장 전",b="",dd="";
    if(e.n){const p0=at(e.t),p1=at(e.t+1800);
      if(p0) a=fmt(p0.p); else a="—";
      if(p0&&p1&&p1!==p0){const v=p1.p-p0.p;b=fmt(p1.p);dd=`<span class="${v<-0.05?"neg":v>0.05?"pos":""}">${v>=0?"+":"−"}${Math.abs(v).toFixed(2)}%p</span>`;}}
    const safe=/^https:\/\//.test(e.url||"");
    const head=safe?`<a class="src-link" href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.txt)}<span class="via">${esc(e.src||"원문")} ↗</span></a>`:esc(e.txt);
    return `<tr><td>${e.n?`<span class="idx" style="background:var(${col})">${e.n}</span>`:"—"}</td><td class="t">${kstFull(e.t)}</td><td class="t">${et(e.t)}</td><td><span class="tag"><i class="sw" style="background:var(${col})"></i>${nm}</span></td><td>${head}</td><td class="num">${a}</td><td class="num">${b}</td><td class="num">${dd}</td></tr>`;}).join("");
}

function renderWeekend(){
  $("title").textContent=`${D.label} 주말 뉴스`;
  document.title=`미국장 뉴스 타임라인 · ${D.label} 주말`;
  $("lede").textContent=`미국 증시가 쉬는 동안(한국 시간 ${D.window}) 나온 주요 뉴스입니다. 차트는 주말에도 거래되는 비트코인(${D.symbol}, ${D.step/60}분봉, 구간 시작가 ${Math.round(D.base).toLocaleString()}달러 대비)이며, 뉴스 시각을 세로선으로 겹쳤습니다.`;
  const s=stats,c=v=>v<0?"neg":v>0?"pos":"";
  $("stats").innerHTML=[`BTC 구간 등락 <b class="${c(s.last.p)}">${fmt(s.last.p)}</b>`,`고점 <b class="${c(s.hi.hi)}">${fmt(s.hi.hi)}</b> (${kst(s.hi.s)})`,`저점 <b class="${c(s.lo.lo)}">${fmt(s.lo.lo)}</b> (${kst(s.lo.s)})`].map(x=>`<span>${x}</span>`).join("");
  $("legend").innerHTML=Object.values(CAT).map(([n,v])=>`<span><i class="sw" style="background:var(${v})"></i>${n}</span>`).join("")+`<span><i class="sw" style="background:var(--line);border-radius:2px;height:3px;width:16px"></i>비트코인 (구간 시작 대비)</span>`;
  $("note").textContent=D.notes||"";
  $("take-h").textContent="월요일 장 체크포인트"; $("take-h").hidden=false;
  $("take").innerHTML=(D.takeaways||[]).map(k=>`<div><b>${esc(k.title)}</b><p>${esc(k.body)}</p></div>`).join("");
  $("th-a").textContent="BTC 당시"; $("th-b").textContent="30분 뒤"; $("foot").textContent='"BTC 당시"는 뉴스 직전 봉 종가, "30분 뒤"는 그 30분 뒤 봉 종가(구간 시작 대비). 시간 대조 자료이며 인과를 단정하지 않습니다. 투자 권유가 아닙니다.';
  fillRows();
  $("src").textContent=D.sources||"";
}
function draw(){
  const svg=$("chart"); svg.innerHTML="";
  const W=1000,H=470,L=52,R=16,TOP=84,B=36;
  const tMin=pts[0].s, tMax=pts[pts.length-1].t+900;
  const all=pts.flatMap(q=>[q.lo,q.hi]);
  let yMin=Math.floor((Math.min(...all,0)-0.15)*2)/2, yMax=Math.ceil((Math.max(...all,0)+0.15)*2)/2;
  const X=t=>L+(t-tMin)/(tMax-tMin)*(W-L-R), Y=p=>TOP+(yMax-p)/(yMax-yMin)*(H-TOP-B);
  const el=(n,a,p=svg)=>{const e=document.createElementNS(NS,n);for(const k in a)e.setAttribute(k,a[k]);p.appendChild(e);return e;};
  if(D.open){el("rect",{x:X(D.open),y:TOP,width:X(D.close)-X(D.open),height:H-TOP-B,fill:css("--session")});
  el("text",{x:X(D.open)+6,y:H-B-8}).textContent="정규장";}
  const span=yMax-yMin, stepY=span>4?1:0.5;
  for(let p=yMin;p<=yMax+1e-9;p+=stepY){const y=Y(p),z=Math.abs(p)<1e-9;
    el("line",{x1:L,x2:W-R,y1:y,y2:y,stroke:z?css("--zero"):css("--grid"),"stroke-width":1,"stroke-dasharray":z?"4 3":""});
    el("text",{x:L-8,y:y+4,"text-anchor":"end"}).textContent=(p>0?"+":"")+p.toFixed(1)+"%";}
  const hrs=(tMax-tMin)/3600, every=hrs>16?2:1;
  for(let t=Math.ceil(tMin/3600)*3600;t<=tMax;t+=3600*every){const x=X(t);
    el("line",{x1:x,x2:x,y1:H-B,y2:H-B+4,stroke:css("--axis")});
    el("text",{x,y:H-B+18,"text-anchor":"middle"}).textContent=kst(t);}
  el("line",{x1:L,x2:W-R,y1:H-B,y2:H-B,stroke:css("--axis")});
  const hit=el("rect",{x:L,y:TOP,width:W-L-R,height:H-TOP-B,fill:"transparent"});
  const lanes=[];
  D.events.forEach((e,i)=>{if(e.t<tMin||e.t>tMax) return; const n=i+1,x=X(e.t),col=css((CAT[e.cat]||CAT.etc)[1]);
    el("line",{x1:x,x2:x,y1:TOP,y2:H-B,stroke:col,"stroke-width":1.25,"stroke-dasharray":"3 3",opacity:.85});
    let lane=0; while(lanes[lane]!==undefined&&x-lanes[lane]<22) lane++; lanes[lane]=x;
    const cy=TOP-14-Math.min(lane,3)*21;
    const g=el("g",{tabindex:0});
    el("circle",{cx:x,cy,r:9,fill:col,stroke:css("--surface"),"stroke-width":2},g);
    el("text",{x,y:cy+3.6,"text-anchor":"middle",style:"fill:#fff;font-size:10px;font-weight:500"},g).textContent=n;
    el("rect",{x:x-11,y:cy-11,width:22,height:22,fill:"transparent"},g);
    const html=`<b>${n}. ${kst(e.t)} KST (${et(e.t)} ET)</b><br>${esc(e.txt)}${e.url?`<br><span style="opacity:.75">${esc(e.src||"원문")} 링크는 아래 표에서</span>`:""}`;
    g.addEventListener("mousemove",ev=>tip(ev,html));g.addEventListener("mouseleave",hide);
    g.addEventListener("focus",()=>{const r=svg.getBoundingClientRect();tip({clientX:r.left+x/W*r.width,clientY:r.top+40},html);});g.addEventListener("blur",hide);});
  const d=pts.map((q,i)=>(i?"L":"M")+X(q.t).toFixed(1)+" "+Y(q.p).toFixed(1)).join(" ");
  el("path",{d,fill:"none",stroke:css("--line"),"stroke-width":2,"stroke-linejoin":"round","stroke-linecap":"round"});
  const s=stats; const placed=[];
  const mark=(q,v,label)=>{if(!q) return; const x=X(q.t),y=Y(q.p); el("circle",{cx:x,cy:y,r:4,fill:css("--line"),stroke:css("--surface"),"stroke-width":2});
    let dy=v<0?16:-8; if(placed.some(p=>Math.abs(p[0]-x)<120&&Math.abs(p[1]-(y+dy))<14)) dy=-dy; placed.push([x,y+dy]);
    const anchor=x>W-170?"end":"start"; el("text",{x:anchor==="end"?x-6:x+6,y:y+dy,"text-anchor":anchor,style:"fill:"+css("--fg2")}).textContent=label;};
  if(s.wk){mark(s.hi,1,`고점 ${fmt(s.hi.p)}`);mark(s.lo,-1,`저점 ${fmt(s.lo.p)}`);mark(s.last,s.last.p>=0?1:-1,`현재 ${fmt(s.last.p)}`);}
  if(s.preHi&&s.preHi.hi>0.2) mark(s.preHi,1,`장전 고점권 ${fmt(s.preHi.p)}`);
  if(s.regLo) mark(s.regLo,-1,`저점권 ${fmt(s.regLo.p)} (저가 ${fmt(s.regLo.lo)})`);
  if(s.close) mark(s.close,s.close.p>=0?1:-1,`종가 ${fmt(s.close.p)}`);
  if(s.postLo&&s.close&&s.postLo.lo<s.close.p-0.3) mark(s.postLo,-1,`시간외 ${fmt(s.postLo.p)}`);
  const vl=el("line",{x1:0,x2:0,y1:TOP,y2:H-B,stroke:css("--muted"),"stroke-width":1,opacity:0});
  const dot=el("circle",{r:4.5,fill:css("--line"),stroke:css("--surface"),"stroke-width":2,opacity:0});
  hit.addEventListener("mousemove",ev=>{const r=svg.getBoundingClientRect(),sx=(ev.clientX-r.left)/r.width*W;
    let b=pts[0];for(const q of pts) if(Math.abs(X(q.t)-sx)<Math.abs(X(b.t)-sx)) b=q;
    vl.setAttribute("x1",X(b.t));vl.setAttribute("x2",X(b.t));vl.setAttribute("opacity",.6);
    dot.setAttribute("cx",X(b.t));dot.setAttribute("cy",Y(b.p));dot.setAttribute("opacity",1);
    tip(ev,`<b>${kst(b.t)} KST</b> (${et(b.t)} ET)<br>${D.symbol} ${fmt(b.p)}`);});
  hit.addEventListener("mouseleave",()=>{vl.setAttribute("opacity",0);dot.setAttribute("opacity",0);hide();});
}
function tip(ev,html){const t=$("tip"),panel=t.parentElement.getBoundingClientRect();t.innerHTML=html;
  let x=ev.clientX-panel.left+14,y=ev.clientY-panel.top+14; if(x+290>panel.width) x=ev.clientX-panel.left-294;
  t.style.left=Math.max(4,x)+"px";t.style.top=y+"px";t.style.opacity=1;}
function hide(){$("tip").style.opacity=0;}

function show(d){prep(d);renderText();draw();}
let cur=null;
async function load(date){
  try{const r=await fetch(`data/${date}.json`,{cache:"no-cache"});if(!r.ok) throw 0;cur=await r.json();show(cur);$("pick").value=date;}
  catch(e){$("title").textContent="해당 날짜 데이터가 없습니다";}
}
async function boot(){
  if(window.__DATA__){document.body.classList.toggle("card",!!window.__CARD__);cur=window.__DATA__;show(cur);return;}
  let idx=[];try{const r=await fetch("data/index.json",{cache:"no-cache"});idx=await r.json();}catch(e){}
  const pick=$("pick"); pick.innerHTML=idx.map(x=>`<option value="${x.date}">${x.label}</option>`).join("");
  pick.addEventListener("change",()=>{location.hash=pick.value;});
  const go=()=>{const h=location.hash.slice(1);const d=idx.find(x=>x.date===h)?h:(idx[0]&&idx[0].date);if(d) load(d); else $("title").textContent="아직 데이터가 없습니다";};
  addEventListener("hashchange",go); go();
}
let rt;addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(()=>cur&&draw(),120);});
const mq=matchMedia("(prefers-color-scheme: dark)"); mq.addEventListener&&mq.addEventListener("change",()=>cur&&draw());
boot();
})();

'use strict';
// NASA Exoplanet Archive snapshot used by ExoScope. BJD epochs and orbital periods are in days.
const catalog = [
  {name:'Earth reference',T:5772,S:1},
  {name:'TOI-700 d',T:3459,S:.85,P:37.423457,epoch:2460763.01612},
  {name:'TOI-700 e',T:3459,S:1.27,P:27.810124,epoch:2460772.46343},
  {name:'TOI-700 b',T:3459,S:4.98,P:9.97722,epoch:2458880.0994},
  {name:'TOI-700 c',T:3459,S:2.64,P:16.0511039,epoch:2458821.6219},
  {name:'TOI-270 b',T:3506,S:131.7935,P:3.35992,epoch:2458461.01464},
  {name:'TOI-270 c',T:3506,S:47.0639,P:5.66051,epoch:2458463.08056},
  {name:'TOI-270 d',T:3506,S:9.2135,P:11.38194,epoch:2458469.33823}
];
const C2=1.438776877e7; // hc/k in nm K; common normalization cancels against Earth's reference.
function photons(wavelength,temperature,energy=1){
  return energy*1e29/(wavelength**4*temperature**4*Math.expm1(C2/(wavelength*temperature)));
}
function band(T,S){
  let integral=0;
  for(let nm=400.5;nm<700;nm+=1)integral+=photons(nm,T,S);
  return integral;
}
function overlap(d,r){
  if(d>=1+r)return 0;
  if(d<=1-r)return r*r;
  const acos=x=>Math.acos(Math.max(-1,Math.min(1,x)));
  return (r*r*acos((d*d+r*r-1)/(2*d*r))+acos((d*d+1-r*r)/(2*d))-
    .5*Math.sqrt(Math.max(0,(-d+r+1)*(d+r-1)*(d-r+1)*(d+r+1))))/Math.PI;
}
function parseCSV(text){
  const rows=[];let row=[],cell='',quoted=false;
  text=text.replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"' && quoted && text[i+1]==='"'){cell+='"';i++;}
    else if(c==='"'){quoted=!quoted;}
    else if(c===','&&!quoted){row.push(cell.trim());cell='';}
    else if((c==='\n'||c==='\r')&&!quoted){
      if(c==='\r'&&text[i+1]==='\n')i++;
      row.push(cell.trim());if(row.some(Boolean))rows.push(row);
      cell='';row=[];
    }else cell+=c;
  }
  if(quoted)throw Error('A quoted CSV field is incomplete.');
  row.push(cell.trim());if(row.some(Boolean))rows.push(row);
  if(rows.length<3||rows[0].length<2)throw Error('Include a header and at least two measurements.');
  if(rows[0].every(v=>v!==''&&Number.isFinite(Number(v))))throw Error('Give the columns names in the first row.');
  return rows;
}
function pointsFor(rows,x,y){
  return rows.slice(1).filter(r=>r[x]?.length && r[y]?.length)
    .map(r=>[Number(r[x]),Number(r[y])]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)).sort((a,b)=>a[0]-b[0]);
}
const $=id=>document.getElementById(id);
const svgNS='http://www.w3.org/2000/svg';
function mark(parent,type,attributes,text){
  const e=document.createElementNS(svgNS,type);
  for(const [key,v] of Object.entries(attributes))e.setAttribute(key,v);
  if(text!==undefined)e.textContent=text;
  parent.appendChild(e);return e;
}
const cyan='#70dce1',amber='#f8bc75',edge='#354959';
const EARTH=band(5772,1);
function axes(chart,xMin,xMax,yMin,yMax,caption,yTitle,formatX=v=>v.toFixed(0)){
  chart.replaceChildren();
  const x=v=>53+509*(v-xMin)/(xMax-xMin),y=v=>213-177*(v-yMin)/(yMax-yMin);
  for(let i=0;i<=4;i++){
    const location=xMin+(xMax-xMin)*i/4;const height=yMin+(yMax-yMin)*i/4;
    mark(chart,'line',{x1:53,x2:562,y1:y(height),y2:y(height),stroke:edge});
    mark(chart,'text',{x:48,y:y(height)+4,'text-anchor':'end'},Number(height.toPrecision(3)).toString());
    mark(chart,'text',{x:x(location),y:234,'text-anchor':'middle'},formatX(location));
  }
  mark(chart,'text',{x:53,y:19},yTitle);mark(chart,'text',{x:307,y:257,'text-anchor':'middle'},caption);
  return {x,y};
}
function spectrum(){
  const T=+$('temperature').value,S=+$('energy').value,ref=catalog[+$('world').value];
  $('tempOut').value=T.toLocaleString()+' K';$('fluxOut').value=S.toFixed(3)+' × Earth';
  $('energyMetric').textContent=(S*100).toLocaleString(undefined,{maximumFractionDigits:1})+'% of Earth';
  $('photonMetric').textContent=(band(T,S)/EARTH*100).toLocaleString(undefined,{maximumFractionDigits:1})+'% of Earth';
  $('modified').textContent=T===ref.T && Math.abs(S-ref.S)<.00051?'Catalog starting conditions.':'Modified scenario based on '+ref.name+'.';
  const earth=[],trial=[];for(let w=300;w<=1800;w+=5){earth.push(photons(w,5772));trial.push(photons(w,T,S))}
  const normal=Math.max(...earth),top=Math.max(...earth,...trial)/normal*1.06;
  const chart=$('specChart'),{x,y}=axes(chart,300,1800,0,top,'Wavelength (nm)','Photon density · Earth peak = 1');
  mark(chart,'rect',{x:x(400),width:x(700)-x(400),y:37,height:175,fill:'#70dce11a'});
  for(const [arr,color] of [[earth,amber],[trial,cyan]]){
    mark(chart,'polyline',{points:arr.map((z,i)=>x(300+i*5)+','+y(z/normal)).join(' '),fill:'none',stroke:color,'stroke-width':2.5});
  }
}
function resetSpectrum(){
  const obj=catalog[+$('world').value];$('temperature').value=obj.T;$('energy').value=obj.S;spectrum();
}
let animation=0;
function stop(){clearInterval(animation);animation=0;$('animate').textContent='Play crossing';}
function sizePlot(){
  const scale=+$('scale').value,r=scale*.1,p=+$('phase').value/1000,pos=(p*2-1)*1.5;
  $('scaleOut').value=scale.toFixed(2)+' ×';$('phaseOut').value=(p*100).toFixed(0)+'% of replay';
  $('depthMetric').textContent=(r*r*100).toFixed(3)+'%';$('radiusMetric').textContent=r.toFixed(3);
  const chart=$('sizeChart');chart.replaceChildren();
  mark(chart,'circle',{cx:102,cy:110,r:60,fill:amber});mark(chart,'circle',{cx:102+pos*60,cy:110,r:r*60,fill:'#071321'});
  const px=t=>227+333*t,py=v=>45+145*v/.044;
  for(const v of [0,.02,.04]){
    mark(chart,'line',{x1:227,x2:560,y1:py(v),y2:py(v),stroke:edge});
    mark(chart,'text',{x:223,y:py(v)+5,'text-anchor':'end'},(100-v*100).toFixed(0)+'%');
  }
  const track=Array.from({length:341},(_,i)=>{const t=i/340;return px(t)+','+py(overlap(Math.abs(t*3-1.5),r));});
  mark(chart,'polyline',{points:track.join(' '),fill:'none',stroke:cyan,'stroke-width':3});
  mark(chart,'line',{x1:px(p),x2:px(p),y1:36,y2:190,stroke:amber,'stroke-dasharray':'3 4'});
  mark(chart,'circle',{cx:px(p),cy:py(overlap(Math.abs(pos),r)),r:4,fill:amber});
  mark(chart,'text',{x:76,y:220},'Sky view');mark(chart,'text',{x:310,y:220},'Time through crossing');
}
let dataRows=null,loadSerial=0;
function renderUpload(){
  if(!dataRows)return;
  const chart=$('obsChart');chart.replaceChildren();
  const pts=pointsFor(dataRows,+$('timeCol').value,+$('fluxCol').value);
  if(pts.length<2 || pts[0][0]===pts.at(-1)[0] || $('timeCol').value===$('fluxCol').value){$('uploadStatus').textContent='Choose distinct numeric time and brightness columns with at least two different times.';return;}
  const start=pts[0][0],end=pts.at(-1)[0];let lo=Infinity,hi=-Infinity;
  for(const [,v] of pts){lo=Math.min(lo,v);hi=Math.max(hi,v);}
  const padding=(hi-lo)*.04 || Math.max(Math.abs(lo)*.01,.01);
  const {x,y}=axes(chart,0,end-start,lo-padding,hi+padding,'Time since first measurement · input units','Brightness · input units',v=>Number(v.toPrecision(4)).toString());
  let overlayStatus='';
  if($('overlay').checked){
    const planet=catalog[+$('transitWorld').value],first=Math.ceil((start-planet.epoch)/planet.P),last=Math.floor((end-planet.epoch)/planet.P);
    if(start<2000000 || end>3000000)overlayStatus=' Values fall outside the supported absolute BJD range (2–3 million).';
    else if(last-first>100)overlayStatus=' Narrow the time range to show up to 101 predicted crossings.';
    else{
      for(let k=first;k<=last;k++){
        const t=planet.epoch+k*planet.P-start;
        mark(chart,'line',{x1:x(t),x2:x(t),y1:37,y2:213,stroke:amber,'stroke-dasharray':'3 3'});
      }
      overlayStatus=' '+Math.max(0,last-first+1)+' predicted midpoint(s) in this interval.';
    }
  }
  const step=Math.max(1,Math.ceil(pts.length/3500));
  let path='';for(let i=0;i<pts.length;i+=step){path+='M'+x(pts[i][0]-start).toFixed(2)+' '+y(pts[i][1]).toFixed(2)+'h.01';}
  mark(chart,'path',{d:path,stroke:cyan,'stroke-width':3,'stroke-linecap':'round',fill:'none',opacity:.8});
  $('uploadStatus').textContent=pts.length.toLocaleString()+' numeric measurements · first timestamp '+start+
    (step>1?' · plotted every '+step+'th point':'')+'.'+overlayStatus;
}
async function loadFile(){
  const serial=++loadSerial;
  dataRows=null;$('obsChart').replaceChildren();$('overlay').checked=false;
  for(const id of ['timeCol','fluxCol','overlay','transitWorld'])$(id).disabled=true;
  const file=$('file').files[0];if(!file){$('uploadStatus').textContent='Select a file to plot your observations.';return;}
  try{
    if(file.size>8*1024*1024)throw Error('Choose a file smaller than 8 MB.');
    const rows=parseCSV(await file.text());if(serial!==loadSerial)return;dataRows=rows;
    for(const id of ['timeCol','fluxCol']){
      $(id).replaceChildren(...rows[0].map((s,i)=>new Option(s||'Column '+(i+1),String(i))));$(id).disabled=false;
    }
    $('timeCol').selectedIndex=Math.max(0,rows[0].findIndex(t=>/time|bjd|mjd|^jd$/i.test(t)));
    const fluxIndex=rows[0].findIndex(t=>/flux|brightness|intensity/i.test(t));
    $('fluxCol').selectedIndex=fluxIndex>=0?fluxIndex:($('timeCol').selectedIndex===0?1:0);
    $('overlay').disabled=false;renderUpload();
  }catch(err){if(serial===loadSerial)$('uploadStatus').textContent=err.message;}
}
function launch(){
  catalog.forEach((p,i)=>{$('world').add(new Option(p.name,String(i)));if(p.P)$('transitWorld').add(new Option(p.name,String(i)));});
  $('world').value='1';$('reset').onclick=resetSpectrum;$('world').onchange=resetSpectrum;
  $('temperature').oninput=spectrum;$('energy').oninput=spectrum;
  $('scale').oninput=sizePlot;$('phase').oninput=()=>{stop();sizePlot()};
  $('animate').onclick=()=>{
    if(animation){stop();return;}if(+$('phase').value>=1000)$('phase').value=0;
    $('animate').textContent='Pause';animation=setInterval(()=>{$('phase').value=Math.min(1000,+$('phase').value+4);sizePlot();if(+$('phase').value===1000)stop();},32);
  };
  $('file').onchange=loadFile;$('timeCol').onchange=renderUpload;$('fluxCol').onchange=renderUpload;$('transitWorld').onchange=renderUpload;
  $('overlay').onchange=()=>{$('transitWorld').disabled=!$('overlay').checked;renderUpload();};
  const tabs=Array.from(document.querySelectorAll('[data-tab]'));
  function select(id){stop();for(const b of tabs){const active=b.dataset.tab===id;b.setAttribute('aria-pressed',active);$(b.dataset.tab).hidden=!active;}}
  tabs.forEach(b=>b.onclick=()=>{location.hash=b.dataset.tab;select(b.dataset.tab)});
  const applyHash=()=>select(tabs.some(b=>b.dataset.tab===location.hash.slice(1))?location.hash.slice(1):'spectra');
  addEventListener('hashchange',applyHash);
  resetSpectrum();sizePlot();applyHash();
}
if(typeof document!=='undefined')launch();
if(typeof module!=='undefined')module.exports={catalog,band,overlap,parseCSV,pointsFor};

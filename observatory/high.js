const $=id=>document.getElementById(id);
const meta={
 quasar:{title:'3C 273',desc:'Inspect hard X-rays from an active galaxy powered by accretion onto a supermassive black hole.',id:'J1229+020'},
 blackhole:{title:'Cygnus X-1',desc:'Explore the changing hard X-ray brightness of a stellar-mass black-hole binary.',id:'J1958+352'},
 pulsar:{title:'Crab pulsar',desc:'Find the rotation period that lines up X-ray photon arrivals into a pulse.'}};
const store={};let loadId=0;
const txt=(x,y,text,align='middle')=>'<text x="'+x+'" y="'+y+'" text-anchor="'+align+'">'+text+'</text>';
const line=(x,y,a,b,c)=>'<line x1="'+x+'" y1="'+y+'" x2="'+a+'" y2="'+b+'" stroke="'+c+'"/>';
const fmt=v=>Math.abs(v)<.05&&v!==0?v.toFixed(3):v.toFixed(2);
const date=mjd=>new Date((mjd-40587)*86400000).toISOString().slice(0,10);
function points(rows,spacing){
 if(spacing===1)return rows;
 const bins=new Map();
 for(const [day,rate,error] of rows){const i=Math.floor(day/spacing),v=bins.get(i)||[0,0,0],w=1/error**2;v[0]+=day*w;v[1]+=rate*w;v[2]+=w;bins.set(i,v)}
 return [...bins.values()].map(([d,f,w])=>[d/w,f/w,Math.sqrt(1/w)]);
}
function series(rows){
 const year=$('year').value, subset=year==='all'?rows:rows.filter(row=>date(row[0]).startsWith(year));
 const vals=points(subset,+$('bin').value),lo=Math.min(...vals.map(p=>p[1]-p[2])),hi=Math.max(...vals.map(p=>p[1]+p[2])),first=vals[0][0],last=vals.at(-1)[0];
 const X=d=>60+700*(d-first)/(last-first||1),Y=v=>212-184*(v-lo)/(hi-lo||1);
 let svg='';
 for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4;svg+=line(60,Y(v),760,Y(v),'#334651')+txt(52,Y(v)+4,fmt(v),'end')}
 for(const [time,flux,err] of vals){
  const x=X(time),y=Y(flux);
  if($('errors').checked)svg+=line(x,Y(flux-err),x,Y(flux+err),'#4d7485');
  svg+='<circle cx="'+x+'" cy="'+y+'" r="2.7" fill="#9adee5"><title>'+date(time)+' · '+flux.toFixed(4)+' ± '+err.toFixed(4)+'</title></circle>';
 }
 $('plot').innerHTML=svg+txt(60,237,date(first),'start')+txt(760,237,date(last),'end')+txt(410,262,'Observation date · UTC');
 $('read').textContent=vals.length+' plotted points from '+subset.length+' daily measurements · 2–20 keV photon flux (photons / s / cm²). Hover or tap a point for its value.';
}
function fold(d){
 const period=+$('period').value;
 $('ms').value=period.toFixed(4);
 const profile=new Uint32Array(32);
 for(const us of d.us)profile[Math.floor(us%(period*1000)/(period*1000)*32)]++;
 const peak=Math.max(...profile),base=Math.min(...profile)*.96,expected=d.us.length/32;
 const y=v=>210-178*(v-base)/(peak-base||1);
 let svg='';
 for(const v of [base,(base+peak)/2,peak])svg+=line(60,y(v),760,y(v),'#31434f')+txt(52,y(v)+4,Math.round(v),'end');
 for(let cycle=0;cycle<2;cycle++)for(let i=0;i<32;i++){
  const x=60+(cycle*32+i)*700/64,yy=y(profile[i]);
  svg+='<rect x="'+x+'" y="'+yy+'" width="10.1" height="'+(210-yy)+'" fill="'+(cycle?'#718998':'#95dee2')+'"><title>Phase bin '+(i+1)+' · '+profile[i]+' events</title></rect>';
 }
 const chi=profile.reduce((s,n)=>s+(n-expected)**2/expected,0);
 $('plot').innerHTML=svg+txt(60,236,'0')+txt(410,236,'1')+txt(760,236,'2')+txt(410,260,'Rotation phase · same profile shown twice');
 $('read').textContent='Counts per phase bin · Pearson χ² against a flat profile: '+chi.toFixed(1)+' (31 degrees of freedom). The chart rescales to show structure.';
}
async function render(reset=false){
 const token=++loadId,key=$('type').value,info=meta[key],pulse=key==='pulsar';
 $('title').textContent=info.title;$('desc').textContent=info.desc;$('heading').textContent=pulse?'Fold the photon arrivals':'X-ray light curve';
 $('seriesControls').style.display=pulse?'none':'flex';$('pulseControls').style.display=pulse?'flex':'none';
 try{
 if(!store[key]){if(reset){$('plot').innerHTML='';$('read').textContent='Loading archive observations…'}const r=await fetch('./high-data/'+key+'.json');if(!r.ok)throw Error();store[key]=await r.json()}
 if(token!==loadId)return;
 if(pulse){
 const d=store[key];if(reset)$('period').value=(d.period*1000).toFixed(4);
 $('facts').textContent='AstroSat · LAXPC unit 1 · 31 March 2016 · '+d.us.length.toLocaleString()+' detected events';
 $('interpret').textContent='Adjust the trial period and watch the peaks spread out. The same 120-second event segment is regrouped at each setting. The period is an estimate in detector time for this segment.';
 $('provenance').innerHTML='Observation T01_112T01_9000000406. A segment of the first good-time interval, converted to microseconds from its start. Data: <a href="https://doi.org/10.5281/zenodo.15920843">Yash Bhargava, AstroSat/LAXPC Crab observation for the Stingray tutorial</a>.';
 fold(d);
 }else{
 $('facts').textContent='International Space Station · MAXI / Gas Slit Camera · 2–20 keV';
 $('interpret').textContent='Each daily point is a background-subtracted flux estimate; noisy measurements may be negative. The 30-day view combines available days by inverse-variance weighting. Gaps have no measurement.';
 $('provenance').innerHTML='Source: <a href="https://maxi.riken.jp/star_data/'+info.id+'/'+info.id+'.html">MAXI team archive for '+info.title+'</a> · <a href="https://maxi.riken.jp/top/lc_readme.txt">data format and units</a>. Includes daily records with positive reported uncertainty from 2020–2024.';
 series(store[key]);
 }
 }catch{$('read').textContent='Archive data could not be loaded. Reload the page to retry.'}
}
const type=new URLSearchParams(location.search).get('type');if(type&&Object.hasOwn(meta,type))$('type').value=type;
$('type').onchange=()=>{history.replaceState(null,'','?type='+$('type').value);render(true)};
for(const id of ['year','bin','errors','period'])$(id).oninput=()=>render();
$('best').onclick=()=>{$('period').value=(store.pulsar.period*1000).toFixed(4);render()};
render(true);

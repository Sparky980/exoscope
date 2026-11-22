const by=id=>document.getElementById(id);
const rad=Math.PI/180, mod=x=>(x%360+360)%360;
function altitude(time,ra,dec,lat,lon){
 const d=time/86400000+2440587.5-2451545;
 const hour=(mod(280.46061837+360.98564736629*d+lon)-ra)*rad;
 return Math.asin(Math.sin(lat*rad)*Math.sin(dec*rad)+Math.cos(lat*rad)*Math.cos(dec*rad)*Math.cos(hour))/rad;
}
function sunAltitude(time,lat,lon){
 const d=time/86400000+2440587.5-2451545;
 const g=mod(357.528+.9856003*d)*rad;
 const l=(mod(280.46+.9856474*d)+1.915*Math.sin(g)+.020*Math.sin(2*g))*rad;
 const ob=(23.439-.0000004*d)*rad;
 return altitude(time,Math.atan2(Math.cos(ob)*Math.sin(l),Math.cos(l))/rad,Math.asin(Math.sin(ob)*Math.sin(l))/rad,lat,lon);
}
const stamp=t=>new Date(t).toISOString().slice(0,16).replace('T',' ');
function render(records){
 if(!by('settings').checkValidity()){by('events').replaceChildren();by('summary').textContent='Enter coordinates and a date within the supported range.';return}
 const lat=Number(by('lat').value),lon=Number(by('lon').value),start=Date.parse(by('date').value+'T00:00:00Z'),finish=start+30*86400000;
 const rows=[];
 for(const p of records){
  if(by('target').selectedIndex&&by('target').value!==p.pl_name)continue;
  for(const [cycle,seconds] of p.events){
   const mid=seconds*1000,half=p.pl_trandur*1800000;
   if(mid<start||mid>=finish)continue;
   const alt=altitude(mid,p.ra,p.dec,lat,lon);
   const visible=t=>altitude(t,p.ra,p.dec,lat,lon)>0&&sunAltitude(t,lat,lon)<-18;
   const label=alt<=0?'Below horizon':sunAltitude(mid,lat,lon)>=-18?'Daylight / twilight':[mid-half,mid,mid+half].every(visible)?'Dark throughout':'Partial dark window';
   const err=Math.hypot(Math.max(Math.abs(p.pl_tranmiderr1),Math.abs(p.pl_tranmiderr2)),cycle*Math.max(Math.abs(p.pl_orbpererr1),Math.abs(p.pl_orbpererr2)))*1440;
   rows.push({mid,values:[p.pl_name,stamp(mid-half),stamp(mid+half),alt.toFixed(1)+'°',label,err.toFixed(1)+' min']});
  }
 }
 rows.sort((a,b)=>a.mid-b.mid);
 by('summary').textContent=rows.length+' predicted midpoints in the next 30 days · '+rows.filter(r=>r.values[4]==='Dark throughout').length+' dark throughout';
 by('events').replaceChildren(...rows.map(r=>{const tr=document.createElement('tr');for(const value of r.values){const td=document.createElement('td');td.textContent=value;if(value==='Dark throughout')td.className='good';tr.append(td)}return tr}));
}
by('date').value=new Date().toISOString().slice(0,10);
if(!by('date').checkValidity())by('date').value='2026-11-22';
fetch('./windows.json').then(r=>{if(!r.ok)throw Error();return r.json()}).then(records=>{
 for(const p of records)by('target').add(new Option(p.pl_name,p.pl_name));
 by('preset').onchange=()=>{if(by('preset').value){[by('lat').value,by('lon').value]=by('preset').value.split(',')}render(records)};
 for(const id of ['lat','lon','date','target'])by(id).oninput=()=>{if(id==='lat'||id==='lon')by('preset').value='';render(records)};
 render(records);
}).catch(()=>by('summary').textContent='Transit timing records could not be loaded. Reload to retry.');

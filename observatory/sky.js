const objects=[
 {name:'2P/Encke',aliases:['Encke','Comet Encke'],type:'comet',file:'encke'},
 {name:'1 Ceres',aliases:['Ceres','(1) Ceres','A801 AA'],type:'asteroid',file:'ceres'},
 {name:'Orion Nebula',aliases:['M42','NGC 1976'],type:'nebula',ra:83.8201,dec:-5.3876},
 {name:'Crab Nebula',aliases:['M1','NGC 1952'],type:'nebula',ra:83.6324,dec:22.0174},
 {name:'Ring Nebula',aliases:['M57','NGC 6720'],type:'nebula',ra:283.3962365,dec:33.0291342},
 {name:'Sirius',aliases:['Alpha Canis Majoris','HD 48915'],type:'star',ra:101.28715533,dec:-16.71611586},
 {name:'Vega',aliases:['Alpha Lyrae','HD 172167'],type:'star',ra:279.23473479,dec:38.78368896},
 {name:'Betelgeuse',aliases:['Alpha Orionis','HD 39801'],type:'star',ra:88.79293899,dec:7.40706400},
 {name:'Polaris',aliases:['Alpha Ursae Minoris','HD 8890'],type:'star',ra:37.95456067,dec:89.26410897}];
const $=id=>document.getElementById(id),r=Math.PI/180,wrap=n=>(n%360+360)%360, norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const sites={Bhopal:[23.2599,77.4126,5.5],Paranal:[-24.627,-70.404,-3],'Mauna Kea':[19.82,-155.47,-10],Greenwich:[51.4779,0,0]};
const files={},epoch=Date.UTC(2025,0,1),day=86400000;
function coords(o,t,lat,lon){
 let ra=o.ra,dec=o.dec,dist=1e12;
 if(o.file){
  const n=(t-epoch)/day,i=Math.floor(n),f=n-i,a=files[o.file][i],b=files[o.file][i+1];
  ra=a[0]+f*(wrap(b[0]-a[0]+180)-180);dec=a[1]+f*(b[1]-a[1]);dist=a[2]+f*(b[2]-a[2]);
 }
 // Precess J2000 mean coordinates to date, then subtract the observer vector.
 const d=t/day+2440587.5-2451545,T=d/36525;
 const zeta=(2306.2181*T+.30188*T*T+.017998*T*T*T)*r/3600;
 const z=(2306.2181*T+1.09468*T*T+.018203*T*T*T)*r/3600;
 const theta=(2004.3109*T-.42665*T*T-.041833*T*T*T)*r/3600;
 const a=ra*r+zeta,dc=dec*r,x=Math.cos(theta)*Math.cos(dc)*Math.cos(a)-Math.sin(theta)*Math.sin(dc);
 const raD=Math.atan2(Math.cos(dc)*Math.sin(a),x)+z,decD=Math.asin(Math.sin(theta)*Math.cos(dc)*Math.cos(a)+Math.cos(theta)*Math.sin(dc));
 const sid=wrap(280.46061837+360.98564736629*d+lon)*r,phi=lat*r;
 const N=6378.137/Math.sqrt(1-.00669438*Math.sin(phi)**2)/149597870.7;
 const X=dist*Math.cos(decD)*Math.cos(raD)-N*Math.cos(phi)*Math.cos(sid);
 const Y=dist*Math.cos(decD)*Math.sin(raD)-N*Math.cos(phi)*Math.sin(sid);
 const Z=dist*Math.sin(decD)-N*(1-.00669438)*Math.sin(phi);
 const ar=Math.atan2(Y,X),de=Math.atan2(Z,Math.hypot(X,Y)),h=sid-ar;
 const alt=Math.asin(Math.sin(phi)*Math.sin(de)+Math.cos(phi)*Math.cos(de)*Math.cos(h))/r;
 const az=wrap(Math.atan2(-Math.sin(h)*Math.cos(de),Math.sin(de)*Math.cos(phi)-Math.cos(de)*Math.sin(phi)*Math.cos(h))/r);
 return {alt,az,ra:wrap(ar/r),dec:de/r};
}
function solarAlt(t,lat,lon){
 const d=t/day+2440587.5-2451545,g=(357.528+.9856003*d)*r,l=(280.46+.9856474*d+1.915*Math.sin(g)+.02*Math.sin(2*g))*r;
 const ra=Math.atan2(Math.cos(23.439*r)*Math.sin(l),Math.cos(l)),dec=Math.asin(Math.sin(23.439*r)*Math.sin(l));
 return Math.asin(Math.sin(lat*r)*Math.sin(dec)+Math.cos(lat*r)*Math.cos(dec)*Math.cos(wrap(280.46061837+360.98564736629*d+lon)*r-ra))/r;
}
const line=(x1,y1,x2,y2,color)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'"/>';
const txt=(x,y,s)=>'<text x="'+x+'" y="'+y+'" text-anchor="middle">'+s+'</text>';
const ring=(x,y,n,stroke,fill='none')=>'<circle cx="'+x+'" cy="'+y+'" r="'+n+'" stroke="'+stroke+'" fill="'+fill+'"/>';
const curve=(pts,color)=>'<path d="'+pts+'" fill="none" stroke="'+color+'" stroke-width="2.5"/>';
const skyPos=p=>[160+(90-p.alt)*1.15*Math.sin(p.az*r),130-(90-p.alt)*1.15*Math.cos(p.az*r)];
let active=0;
async function render(){
 const ticket=++active,o=objects[+$('obj').value];
 if(!$('settings').checkValidity()){$('views').hidden=true;$('message').textContent='Enter a valid location, UTC offset and date within 2025–2030.';return}
 try{
 if(o.file&&!files[o.file]){const resp=await fetch('./sky-data/'+o.file+'.json');if(!resp.ok)throw Error();files[o.file]=await resp.json()}
 if(ticket!==active)return;
 const lat=+$('lat').value,lon=+$('lon').value,offset=+$('offset').value,start=Date.parse($('date').value+'T12:00:00Z')-offset*3600000;
 const selected=+$('time').value,t=start+selected*60000,p=coords(o,t,lat,lon),local=new Date(t+offset*3600000).toISOString().slice(0,16).replace('T',' ');
 const samples=Array.from({length:145},(_,i)=>coords(o,start+i*600000,lat,lon));
 $('views').hidden=false;$('title').textContent=o.name;$('clock').textContent=local.slice(-5);$('message').textContent=o.aliases.join(' · ');
 const bearing=['N','NE','E','SE','S','SW','W','NW'][Math.round(p.az/45)%8];
 $('readout').innerHTML=[['Local time',local],['Altitude',p.alt.toFixed(1)+'°'],['Azimuth',p.az.toFixed(1)+'° '+bearing],['RA / Dec of date',(p.ra/15).toFixed(3)+'h / '+p.dec.toFixed(2)+'°']].map(([k,v])=>'<div><small>'+k+'</small><b>'+v+'</b></div>').join('');
 let path='',prev=false;
 for(const s of samples){if(s.alt>=0){path+=(prev?'L':'M')+skyPos(s).join(' ');prev=true}else prev=false}
 const pos=skyPos(p);
 $('sky').innerHTML=[103.5,69,34.5].map(rad=>ring(160,130,rad,'#3b535f')).join('')+line(57,130,263,130,'#293f49')+line(160,26,160,234,'#293f49')+txt(160,18,'N')+txt(160,253,'S')+txt(279,134,'E')+txt(40,134,'W')+curve(path,'#7edce3')+(p.alt>=0?ring(...pos,5,'#ffcb91','#ffcb91'):txt(160,155,'Currently below horizon'));
 const x=m=>40+m/1440*447,y=a=>101-a*.91;
 let shade='';
 for(let i=0;i<144;i++)if(solarAlt(start+(i+.5)*600000,lat,lon)<-18)shade+='<rect x="'+x(i*10)+'" y="17" width="3.3" height="167" fill="#213647"/>';
 const track=samples.map((s,i)=>(i?'L':'M')+x(i*10)+' '+y(s.alt)).join('');
 $('alt').innerHTML=shade+[-90,0,90].map(v=>line(40,y(v),487,y(v),'#48616b')+txt(19,y(v)+4,v+'°')).join('')+curve(track,'#7edce3')+line(x(selected),17,x(selected),184,'#f3b778')+ring(x(selected),y(p.alt),4,'#ffc58c','#ffc58c')+[0,360,720,1080,1440].map((m,i)=>txt(x(m),207,['12:00','18:00','00:00','06:00','12:00'][i])).join('');
 $('source').innerHTML=o.file?'Daily geocentric RA, declination and distance from <a href="https://ssd.jpl.nasa.gov/horizons/">JPL Horizons</a>, interpolated and corrected for observer position. Planning accuracy only.':'Catalog position from <a href="https://simbad.cfa.harvard.edu/simbad/sim-id?Ident='+encodeURIComponent(o.name)+'">SIMBAD</a>. Position precessed to date. The finder omits atmospheric refraction, proper motion and local obstructions.';
 }catch{if(ticket===active){$('views').hidden=true;$('message').textContent='Could not load this track. Reload to retry.'}}
}
for(const [i,o] of objects.entries()){$('obj').add(new Option(o.name,String(i)));for(const n of [o.name,...o.aliases])$('names').append(new Option(n,n))}
const query=new URLSearchParams(location.search),exact=objects.findIndex(o=>[o.name,...o.aliases].some(s=>norm(s)===norm(query.get('name')||''))),idx=exact>=0?exact:objects.findIndex(o=>o.type===query.get('type'));
$('obj').value=String(idx<0?0:idx);
$('date').value=new Date().toISOString().slice(0,10);if(!$('date').checkValidity())$('date').value='2026-11-22';
$('search').oninput=()=>{const q=norm($('search').value),idx=objects.findIndex(o=>[o.name,...o.aliases].some(s=>norm(s)===q));if(idx>=0){$('obj').value=String(idx);render()}else $('message').textContent=q?'Choose a matching catalog alias from the list.':''};
$('obj').onchange=()=>{$('search').value='';render()};
$('site').onchange=()=>{const v=sites[$('site').value];if(v)[$('lat').value,$('lon').value,$('offset').value]=v;render()};
for(const id of ['lat','lon','offset','date','time'])$(id).oninput=()=>{if(['lat','lon','offset'].includes(id))$('site').value='Custom';render()};
$('settings').onsubmit=e=>e.preventDefault();render();


import {objectIcon} from './atlas-icons.js';
const families=['All objects','Solar system','Stars & nebulae','High energy','Exoplanets'];
const entries=[
 ['Comets',1,'Ephemeris','Follow a comet across your local sky.','sky.html?type=comet','comet','Encke 2P'],
 ['Asteroids',1,'Ephemeris','Scrub time and read the pointing direction.','sky.html?type=asteroid','rock','Ceres'],
 ['Stars',2,'Finder','Locate a star and chart its altitude through the night.','sky.html?type=star','star','Sirius Vega Betelgeuse Polaris'],
 ['Nebulae',2,'Finder','Find M42 and other targets by their catalog names.','sky.html?type=nebula','cloud','M42 Orion Nebula NGC 1976 Crab M1 Ring M57'],
 ['Quasars',3,'Archive','Examine recorded brightness from a distant active galaxy.','high.html?type=quasar','quasar','3C 273 MAXI'],
 ['Neutron stars',3,'Timing','Fold telescope measurements to inspect repeating pulses.','high.html?type=pulsar','pulse','pulsar Crab AstroSat LAXPC'],
 ['Black-hole systems',3,'X-ray observations','Inspect emission from an accreting system.','high.html?type=blackhole','blackhole','binary black hole Cygnus X-1 Cyg X-1 MAXI'],
 ['Exoplanets',4,'Planetary systems','Replay a transit and compare seven cataloged worlds.','planets.html','transit','TOI-270 TOI-700 transit detective orbital analyzer habitability priority']
];
let family=0;
const input=document.querySelector('#search'), filterBox=document.querySelector('#filters'), cards=document.querySelector('#cards');
function render(){
 const words=input.value.trim().toLowerCase().split(/\s+/);
 const result=entries.filter(([title,f,kind,desc,url,icon,aliases])=>(!family||f===family)&&words.every(w=>[title,kind,desc,aliases,families[f]].join(' ').toLowerCase().includes(w)));
 cards.replaceChildren();
 result.forEach(([title,f,kind,desc,url,icon])=>{
  const a=document.createElement('a');a.className='card';a.href=url; const q=input.value.trim(); if(q && url.startsWith('sky.')) a.href=url+'&name='+encodeURIComponent(q); if(q && /^TOI-(270|700) [bcde]$/i.test(q)) a.href='planets.html?target='+encodeURIComponent(q.toUpperCase().slice(0,-1)+q.slice(-1).toLowerCase());
  a.innerHTML=objectIcon(icon)+'<span class="type">'+kind+'</span><h3>'+title+'</h3><p>'+desc+'</p>';
  cards.append(a);
 });
 if(!result.length)cards.textContent='No matching investigations. Try an object type or clear the filter.';
}
families.forEach((s,i)=>{const b=document.createElement('button');b.textContent=s;b.setAttribute('aria-pressed',String(!i));b.onclick=()=>{family=i;Array.from(filterBox.children).forEach((btn,j)=>btn.setAttribute('aria-pressed',String(i===j)));render()};filterBox.append(b)});
input.oninput=render;render();


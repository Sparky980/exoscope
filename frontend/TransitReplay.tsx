import {useEffect, useMemo, useState} from 'react';

type ReplayProps = {name:string; duration:number; depth:number|null};
type Dot = {hour:number; brightness:number};

// Fraction of a unit stellar disk covered by a planet of radius r.
function covered(distance:number, r:number) {
  if (distance >= 1+r) return 0;
  if (distance <= 1-r) return r*r;
  const angle = (value:number) => Math.acos(Math.max(-1,Math.min(1,value)));
  const a = angle((distance*distance+r*r-1)/(2*distance*r));
  const b = angle((distance*distance+1-r*r)/(2*distance));
  const triangle = Math.sqrt(Math.max(0,(-distance+r+1)*(distance+r-1)*(distance-r+1)*(distance+r+1)));
  return (r*r*a+b-triangle/2)/Math.PI;
}

export default function TransitReplay({name,duration,depth}:ReplayProps) {
  const [step,setStep] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [reveal,setReveal] = useState(false);
  const [dots,setDots] = useState<Dot[]>([]);
  const [error,setError] = useState(false);
  useEffect(()=>{
    const controller = new AbortController();
    async function load(){
      const response = await fetch('/'+encodeURIComponent(name)+'.json',{signal:controller.signal});
      if (!response.ok) throw Error('Unavailable observations');
      const series:{mx:number[];my:number[]} = await response.json();
      setDots(series.mx.map((hour,i)=>({hour,brightness:series.my[i]*100})).filter(d=>Math.abs(d.hour)<=duration*.8));
    }
    load().catch(()=>{if(!controller.signal.aborted)setError(true)});
    return ()=>controller.abort();
  },[name,duration]);
  useEffect(()=>{
    if (!playing) return;
    const timer = window.setInterval(()=>setStep(value=>Math.min(value+3,1000)),30);
    return ()=>window.clearInterval(timer);
  },[playing]);
  useEffect(()=>{if(step===1000)setPlaying(false)},[step]);

  const radius = Math.sqrt(Math.max(0,depth??0)/1000);
  const halfSpan = duration*.8;
  const separation = (hour:number)=>2*(1+radius)*hour/duration;
  const brightness = (hour:number)=>100*(1-covered(Math.abs(separation(hour)),radius));
  const hour = (step/500-1)*halfSpan;
  const low=Math.min(100-130*radius*radius,...dots.map(d=>d.brightness))-.015;
  const high=Math.max(100,...dots.map(d=>d.brightness))+.025;
  const X=(h:number)=>53+370*(h/halfSpan+1)/2;
  const Y=(b:number)=>149-(b-low)*125/(high-low);
  const path=useMemo(()=>Array.from({length:241},(_,i)=>{
    const h=halfSpan*(i/120-1);
    return (i?'L':'M')+X(h).toFixed(2)+' '+Y(brightness(h)).toFixed(2);
  }).join(' '),[halfSpan,low,high,radius]);
  if (!depth || depth<=0 || duration<=0) return <article><h2>Transit replay</h2><p>A positive measured depth and catalog duration are needed for this replay.</p></article>;
  return <article className="replay"><h2>Transit replay</h2><p>Move {name} across its star. Watch when the light starts to fall, then compare your prediction with TESS.</p>
    <div className="replay-panels"><section><h3>View from Earth</h3><svg viewBox="0 0 300 180" role="img" aria-label="Illustrated planet crossing its host star">
      <defs><radialGradient id="starGlow"><stop stopColor="#fff2ae"/><stop offset=".75" stopColor="#ffbd61"/><stop offset="1" stopColor="#db823f"/></radialGradient></defs>
      <circle cx="150" cy="88" r="68" fill="url(#starGlow)"/><circle cx={150+68*separation(hour)} cy="88" r={68*radius} fill="#13232b"/></svg></section>
    <section><h3>Relative brightness</h3><svg viewBox="0 0 440 185" role="img" aria-label="Model light curve with synchronized time cursor">
      {[low+(high-low)*.2,100].map((v,i)=><g key={i}><line x1="53" x2="423" y1={Y(v)} y2={Y(v)} stroke="#456068"/><text x="1" y={Y(v)+4}>{v.toFixed(2)}%</text></g>)}
      <path d={path} fill="none" stroke="#ffc26e" strokeWidth="2.6"/>
      {reveal&&dots.map(d=><circle key={d.hour} cx={X(d.hour)} cy={Y(d.brightness)} r="3" fill="#95d7ee"/>)}
      <line x1={X(hour)} x2={X(hour)} y1="12" y2="151" stroke="#ecf2e8" strokeDasharray="3 4"/><circle cx={X(hour)} cy={Y(brightness(hour))} r="4" fill="#ffc26e"/>
      <text x="235" y="176" textAnchor="middle">Hours from midpoint · {hour.toFixed(2)} h</text></svg></section></div>
    <div className="replay-controls"><button onClick={()=>{if(step===1000)setStep(0);setPlaying(!playing)}}>{playing?'Pause':'Play transit'}</button>
      <label>Transit time<input type="range" min="0" max="1000" value={step} aria-valuetext={hour.toFixed(2)+' hours from midpoint'} onChange={e=>{setPlaying(false);setStep(+e.target.value)}}/></label>
      <label><input type="checkbox" checked={reveal} onChange={e=>setReveal(e.target.checked)}/> Reveal TESS data</label></div>
    <small>{error?'TESS comparison unavailable. ':''}Amber shows a central-crossing model scaled to the measured depth. Blue dots summarize real brightness measurements. The illustration assumes uniform stellar brightness.</small>
  </article>;
}

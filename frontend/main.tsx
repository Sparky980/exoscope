import {useEffect,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import './style.css';
import './replay.css';
import TransitReplay from './TransitReplay';

type Reading=number|null;
type Target={name:string;star:string;tic:string;period:number;radius:Reading;light:Reading;duration:number;events:number;flags:string[];shape:string;stats:Record<string,Reading>;pairs:Record<string,string|number>[];criteria:Reading[][]};
type Series={x:number[];y:number[];mx?:number[];my?:number[];sectors?:number[]};
declare const Plotly:{react:(node:HTMLElement,traces:unknown[],layout:unknown,config:unknown)=>Promise<void>;purge:(node:HTMLElement)=>void};
const modules=['Transit Detective','Orbital Analyzer','Habitability Explorer','Priority Engine'];
const subtitles=['Inspect stellar brightness and the evidence for a repeating transit.','Compare orbital spacing within the selected planetary system.','Screen planetary size and incident starlight.','Rank observing targets against a research objective.'];
const goals=['Transit verification','Potential habitability','System architecture'];
const criteria=[['Depth vs. scatter','Diagnostic coverage','Repeat observations'],['Planet radius','Incident starlight','Physical data coverage'],['System multiplicity','Near-ratio match','Orbital data coverage']];
const actions=[['Collect higher precision brightness measurements','Inspect alternating and half-orbit dips','Observe additional transit windows'],['Refine the radius measurement','Refine the stellar irradiation estimate','Measure mass, density and stellar temperature'],['Search for additional companions','Measure transit times over a longer baseline','Refine the orbital elements']];
const defaults=[[40,30,30],[30,40,30],[25,50,25]];
const fmt=(n:Reading,d=2)=>n===null?'Unavailable':n.toFixed(d);
async function get<T,>(path:string):Promise<T>{const r=await fetch('/'+encodeURIComponent(path)+'.json');if(!r.ok)throw Error('Could not load '+path);return r.json()}
function Chart({target,fold}:{target:Target;fold:boolean}){
 const ref=useRef<HTMLDivElement>(null);const [caption,setCaption]=useState('');
 useEffect(()=>{let active=true;const node=ref.current!;setCaption('Loading observations…');
 get<Series>(fold?target.name:target.star).then(async d=>{if(!active)return;
 const traces:unknown[]=[{type:'scattergl',mode:'markers',x:d.x,y:d.y,marker:{size:3,color:fold?'#657eaa':'#527998',opacity:.67},name:'Brightness',hovertemplate:'%{x:.3f} · %{y:.5f}<extra></extra>'}];
 if(d.mx)traces.push({type:'scatter',mode:'lines',x:d.mx,y:d.my,name:'Median',line:{color:'#c86e39',width:3}});
 await Plotly.react(node,traces,{autosize:true,height:325,margin:{l:60,r:15,t:16,b:55},font:{family:'Segoe UI, sans-serif',color:'#546774'},paper_bgcolor:'transparent',plot_bgcolor:'transparent',showlegend:false,xaxis:{title:{text:fold?'Hours from predicted transit':'Time · days since BJD 2457000'},gridcolor:'#e7ecee'},yaxis:{title:{text:'Relative brightness'},gridcolor:'#e7ecee'}},{responsive:true,displaylogo:false,scrollZoom:false});if(active)setCaption(fold?'Known companion transit windows excluded · amber line shows median brightness.':'TESS sectors '+d.sectors?.join(', ')+' · '+d.x.length.toLocaleString()+' quality-filtered measurements.');}).catch(e=>active&&setCaption(String(e)));return()=>{active=false;if(typeof Plotly!=='undefined')Plotly.purge(node)}},[target,fold]);
 return <><div ref={ref}/><small role="status">{caption}</small></>
}
function Ranking({targets}:{targets:Target[]}){
 const [goal,G]=useState(0),[w,W]=useState(defaults[0]),[selected,S]=useState('');
 const rows=targets.map(p=>{let sum=0,den=0;p.criteria[goal].forEach((v,i)=>{if(v!==null){den+=w[i];sum+=v*w[i]}});return {p,score:den?100*sum/den:null}}).sort((a,b)=>(b.score??-1)-(a.score??-1));
 const active=rows.find(r=>r.p.name===selected)??rows[0];const vals=active.p.criteria[goal];const weak=w.map((v,i)=>v? v*(1-(vals[i]??0)):-1);
 return <section><label>Research objective<select value={goal} onChange={e=>{const i=+e.target.value;G(i);W(defaults[i]);S('')}}>{goals.map((n,i)=><option key={n} value={i}>{n}</option>)}</select></label><div className="columns"><article><h2>Target ranking</h2>{rows.map(r=><button className={'rank '+(r===active?'chosen':'')} key={r.p.name} onClick={()=>S(r.p.name)}><b>{r.p.name}</b><span>{fmt(r.score,1)}</span></button>)}</article><article><h2>Ranking weights</h2>{criteria[goal].map((s,i)=><label key={s}>{s} · {w[i]}<input type="range" min="0" max="100" value={w[i]} onChange={e=>W(w.map((v,j)=>j===i?+e.target.value:v))}/></label>)}<h3>{active.p.name}</h3>{criteria[goal].map((s,i)=><p key={s}>{s} · {vals[i]===null?'Missing':fmt(vals[i]!*100,0)+' / 100'}</p>)}<p>{w.some(Boolean)?'Suggested follow-up: '+actions[goal][weak.indexOf(Math.max(...weak))]:'Set a positive weight to rank targets.'}</p><small>Scores average the weighted, available evidence. Missing criteria are excluded.</small></article></div></section>
}
function App({targets}:{targets:Target[]}){
 const [module,M]=useState(0),[name,N]=useState(targets.find(t=>t.name===new URLSearchParams(location.search).get('target'))?.name??'TOI-270 c'),[fold,F]=useState(false);
 const p=targets.find(t=>t.name===name)!;
 return <><header><div className="bar"><a className="brand" href="./index.html"><i/>ExoScope <em>Observatory</em></a><span>Planetary research workspace</span></div></header><main><nav aria-label="Research modules">{modules.map((s,i)=><button aria-current={module===i?'page':undefined} key={s} onClick={()=>M(i)}>{s}</button>)}</nav><div className="hero"><div><h1>{modules[module]}</h1><p>{subtitles[module]}</p></div><div className="planet" aria-hidden="true"/></div>
 {module===3?<Ranking targets={targets}/>:<><div className="target"><label>Observation target<select value={name} onChange={e=>N(e.target.value)}>{targets.map(t=><option key={t.name}>{t.name}</option>)}</select></label><div><small>Host star</small><strong>{p.star}</strong></div><div><small>Catalog ID</small><strong>{p.tic}</strong></div></div>
 <div className="metrics">{[['Orbital period',fmt(p.period),'days'],['Planet radius',fmt(p.radius),'R⊕'],['Incident starlight',fmt(p.light),'S⊕']].map(([s,v,u])=><div key={s}><small>{s}</small><b>{v} <em>{u}</em></b></div>)}</div>
 {module===0?<><TransitReplay key={p.name} name={p.name} duration={p.duration} depth={p.stats.depth}/><article><div className="charthead"><h2>Light curve</h2><div className="switch">{['Time series','Phase folded'].map((s,i)=><button key={s} aria-pressed={fold===!!i} onClick={()=>F(!!i)}>{s}</button>)}</div></div><Chart target={p} fold={fold}/></article><article><h2>Transit diagnostics</h2><p>{p.events} observed transit windows · Catalog duration {fmt(p.duration)} hours · {p.shape}</p><div className="diagnostics">{Object.entries(p.stats).map(([s,v])=><div key={s}><small>{{depth:'Median depth',odd:'Odd depth',even:'Even depth',secondary:'Half-orbit depth',noise:'Local scatter'}[s]}</small><strong>{fmt(v)} ppt</strong></div>)}</div><p>{p.flags.join(' · ')||'No warning threshold crossed in the available observations.'}</p><small>Depths are in parts per thousand. Timing uncertainty, blending and limited coverage can affect these checks.</small></article></>:module===1?<article><h2>Orbital pairs</h2><p>Compare period ratios with 2:1, 3:2 and 4:3. A difference within 2% flags a near match.</p><div className="scroll"><table><thead><tr>{['Inner planet','Outer planet','Period ratio','Nearest pattern','Difference (%)'].map(k=><th key={k}>{k}</th>)}</tr></thead><tbody>{p.pairs.map(r=><tr key={String(r['Inner planet'])+r['Outer planet']}>{Object.entries(r).map(([k,v])=><td key={k}>{typeof v==='number'?fmt(v,3):v}</td>)}</tr>)}</tbody></table></div><small>Period ratios alone cannot establish a dynamical resonance.</small></article>:<article><h2>Habitability screen</h2>{[['Planet radius','Up to 1.6 Earth radii',p.radius===null?null:p.radius<=1.6],['Incident starlight','0.36–1.11 times Earth’s',p.light===null?null:p.light>=.36&&p.light<=1.11]].map(([s,r,b])=><div className="check" key={String(s)}><strong>{s}</strong><span>{r}</span><b>{b===null?'Missing':b?'Within range':'Outside range'}</b></div>)}<p>{p.radius===null||p.light===null?'Insufficient measurements':p.radius<=1.6&&p.light>=.36&&p.light<=1.11?'Meets both screening criteria.':'Outside the selected screening range.'}</p><small>Size and starlight alone cannot establish surface conditions or the presence of life.</small></article>}</>}
 <footer><a href="https://exoplanetarchive.ipac.caltech.edu/">NASA Exoplanet Archive</a><a href="https://archive.stsci.edu/missions-and-data/tess">TESS / MAST</a></footer></main></>
}
const root=createRoot(document.getElementById('root')!);
get<Target[]>('catalog').then(targets=>root.render(<App targets={targets}/>)).catch(e=>root.render(<p role="alert">{String(e)}</p>));



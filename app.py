from pathlib import Path
from itertools import combinations

import numpy as np
import pandas as pd
import streamlit as st
import plotly.graph_objects as go
from astropy.io import fits

DATA = Path(__file__).resolve().parent / "data"
RATIOS = {"2:1": 2, "3:2": 1.5, "4:3": 4 / 3}


@st.cache_data
def read_star(files):
    blocks = []
    for path in files:
        with fits.open(path) as hd:
            table = hd[1].data
            t, f = table["TIME"], table["PDCSAP_FLUX"]
            good = (table["QUALITY"] == 0) & np.isfinite(t) & np.isfinite(f) & (f > 0)
            t, f = t[good].astype(float), f[good].astype(float)
            # Fit the local baseline separately across observing gaps.
            for indices in np.split(np.arange(len(t)), np.where(np.diff(t) > .5)[0] + 1):
                if len(indices) < 15:
                    continue
                times, flux = t[indices], f[indices]
                window = max(5, round(1.5 / np.median(np.diff(times))))
                baseline = pd.Series(flux).rolling(window, center=True, min_periods=1).median()
                blocks.append(pd.DataFrame({"time": times, "flux": flux / baseline,
                                            "sector": hd[0].header["SECTOR"]}))
    return pd.concat(blocks, ignore_index=True) if blocks else pd.DataFrame()


def offsets(time, row):
    period = row.pl_orbper
    delta = time - (row.pl_tranmid - 2457000)
    cycle = np.floor(delta / period + .5).astype(int)
    return cycle, delta - cycle * period


@st.cache_data
def investigate(curve, system, name):
    row = system.loc[name]
    if curve.empty or row[["pl_orbper", "pl_tranmid", "pl_trandur"]].isna().any():
        return None
    t = curve.time.to_numpy()
    f = curve.flux.to_numpy()
    keep = np.ones(len(t), dtype=bool)
    for other, companion in system.drop(name).iterrows():
        if companion[["pl_orbper", "pl_tranmid", "pl_trandur"]].notna().all():
            _, dt = offsets(t, companion)
            keep &= abs(dt) > companion.pl_trandur / 48
    t, f = t[keep], f[keep]
    cycle, dt = offsets(t, row)
    half = row.pl_trandur / 48
    local = (abs(dt) > 1.5 * half) & (abs(dt) < 4 * half)
    inside = abs(dt) < half
    events = []
    for n in np.unique(cycle[inside]):
        mask = cycle == n
        a, b = f[mask & inside], f[mask & local]
        if len(a) >= 5 and len(b) >= 10:
            events.append((n, (np.median(b) - np.median(a)) * 1000))
    depths = pd.DataFrame(events, columns=["orbit", "depth"])
    ref = np.median(f[local]) if local.any() else np.nan
    noise = 1.4826 * np.median(abs(f[local] - ref)) * 1000 if local.any() else np.nan
    depth = depths.depth.median()
    odd = depths.loc[depths.orbit % 2 == 1, "depth"].median()
    even = depths.loc[depths.orbit % 2 == 0, "depth"].median()
    secondary = f[abs(abs(dt) - row.pl_orbper / 2) < half]
    sec = (ref - np.median(secondary)) * 1000 if len(secondary) >= 5 else np.nan
    center, edge = f[abs(dt) < half * .4], f[(abs(dt) > half * .7) & inside]
    flags = []
    if np.isfinite(odd + even) and abs(odd-even) > max(noise, abs(depth)*.5):
        flags.append("Alternating events differ in depth")
    if sec > max(noise, abs(depth)*.5):
        flags.append("A dip appears halfway through the orbit")
    if not len(events) or not depth > 0:
        flags.append("No clear positive transit depth")
    shape = "Insufficient shape coverage"
    if len(center)>=5 and len(edge)>=5:
        shape = "Center deeper than edges" if np.median(center)<np.median(edge) else "No deeper center resolved"
    return dict(dt=dt, f=f, depth=depth, odd=odd, even=even, secondary=sec,
                noise=noise, events=len(events), flags=flags, shape=shape)


def pairs(system):
    result = []
    for a,b in combinations(system.sort_values("pl_orbper").index, 2):
        ratio = system.loc[b,"pl_orbper"] / system.loc[a,"pl_orbper"]
        if not np.isfinite(ratio):
            continue
        key = min(RATIOS, key=lambda k: abs(ratio/RATIOS[k]-1))
        result.append({"Inner planet":a, "Outer planet":b, "Period ratio":ratio,
                       "Nearest pattern":key, "Difference (%)":100*abs(ratio/RATIOS[key]-1)})
    return pd.DataFrame(result)


def chart(x,y,xlabel,ylabel):
    fig = go.Figure(go.Scattergl(x=x,y=y,mode="markers",marker=dict(size=3,color="#3b83ad")))
    fig.update_layout(xaxis_title=xlabel,yaxis_title=ylabel,height=330,margin=dict(t=10,b=45))
    return fig


def reading(value, digits=2):
    return f"{value:.{digits}f}" if np.isfinite(value) else "Unavailable"


st.set_page_config(page_title="ExoScope AI",layout="wide")
st.title("ExoScope AI")
module = st.sidebar.radio("Investigation", ["Transit Detective","Orbital Analyzer","Habitability Explorer","Priority Engine"])
catalog = pd.read_csv(DATA/"system-planets.csv").set_index("pl_name")
groups = dict(tuple(catalog.groupby("hostname")))
st.header(module)
if module != "Priority Engine":
    target = st.selectbox("Planet", catalog.index, index=catalog.index.get_loc("TOI-270 c"))
    row = catalog.loc[target]
    system = groups[row.hostname]
    st.caption(f"Host star · {row.hostname}  |  {row.tic_id}")
    cols = st.columns(3)
    for col,label,value in zip(cols,["Orbital period (days)","Radius (Earth radii)","Starlight (Earth = 1)"],[row.pl_orbper,row.pl_rade,row.pl_insol]):
        col.metric(label,reading(value))


def curve_for(row):
    tic = int(row.tic_id.split()[-1])
    files = tuple(sorted(DATA.glob(f"tess*-{tic:016d}-*-s_lc.fits")))
    return read_star(files)


if module == "Transit Detective":
    curve = curve_for(row)
    analysis = investigate(curve, system, target)
    if analysis is None:
        st.info("More observations or catalog timing measurements are needed.")
    else:
        st.subheader("Stellar brightness over time")
        st.caption(f"TESS sectors {', '.join(map(str,sorted(curve.sector.unique())))} · {len(curve):,} quality-filtered measurements · local median trend removed.")
        st.plotly_chart(chart(curve.time, curve.flux,"Time (days since BJD 2457000)","Relative brightness"))
        st.subheader("Repeated transits")
        st.caption("Zero marks the predicted transit midpoint. Known companion transit windows are excluded here.")
        dt, f = analysis["dt"]*24, analysis["f"]
        mask = abs(dt)<row.pl_trandur*2
        fig = chart(dt[mask],f[mask],"Hours from predicted transit","Relative brightness")
        bins = pd.cut(dt[mask],np.linspace(-2*row.pl_trandur,2*row.pl_trandur,51))
        folded = pd.DataFrame({"hour":dt[mask],"flux":f[mask]}).groupby(bins,observed=True).median()
        fig.add_scatter(x=folded.hour,y=folded.flux,mode="lines",name="Median brightness",line=dict(color="#dc8126"))
        fig.data[0].name="Measurements"
        st.plotly_chart(fig)
        st.write(f"Observed transit windows: {analysis['events']}. Catalog duration: {row.pl_trandur:.2f} hours. {analysis['shape']}.")
        st.table(pd.DataFrame({"Diagnostic":["Median transit depth","Odd-event depth","Even-event depth","Half-orbit depth","Local brightness scatter"],
                               "Parts per thousand":[reading(analysis[k]) for k in ["depth","odd","even","secondary","noise"]]}))
        st.write("Preliminary findings: "+("; ".join(analysis["flags"]) or "No warning threshold crossed in these observations."))
        st.caption("Sparse events, timing uncertainty, correlated noise and blending limit these checks. A transit-like dip alone cannot establish a planet.")
elif module == "Orbital Analyzer":
    p = pairs(system)
    st.write("Compare the outer planet’s period to the inner planet’s period. A difference within 2% flags a near match to 2:1, 3:2 or 4:3.")
    selected = p[(p["Inner planet"]==target)|(p["Outer planet"]==target)].copy()
    selected["Within 2%"] = selected["Difference (%)"]<=2
    st.dataframe(selected,hide_index=True)
    st.caption("Period ratios describe orbital spacing. Establishing a dynamical resonance requires additional evidence.")
elif module == "Habitability Explorer":
    st.write("The project screens for radius up to 1.6 Earth radii and starlight from 0.36 to 1.11 times Earth’s.")
    for label,value,passes in [("Radius",row.pl_rade,row.pl_rade<=1.6),("Starlight",row.pl_insol,.36<=row.pl_insol<=1.11)]:
        st.write(f"**{label}** · "+("Measurement missing" if pd.isna(value) else "Within range" if passes else "Outside range"))
    st.subheader("Screening result")
    if pd.isna(row.pl_rade) or pd.isna(row.pl_insol):
        st.write("Insufficient measurements")
    else:
        st.write("Meets both criteria" if row.pl_rade<=1.6 and .36<=row.pl_insol<=1.11 else "Outside the selected screening range")
    st.caption("These two measurements cannot determine surface temperature, atmospheric conditions or whether life is present.")
else:
    goal = st.selectbox("Research objective",["Verify a transit signal","Study potential habitability","Study system architecture"])
    labels,weights,actions = {
        "Verify a transit signal":(["Depth relative to scatter","Diagnostic coverage and flags","Repeat observations"],[40,30,30],["Collect higher precision brightness data","Inspect alternating and half-orbit dips","Observe additional transit windows"]),
        "Study potential habitability":(["Radius screen","Starlight screen","Physical data coverage"],[30,40,30],["Refine the radius measurement","Refine the stellar irradiation estimate","Measure mass, density and stellar temperature"]),
        "Study system architecture":(["System multiplicity","Near-ratio match","Orbital data coverage"],[25,50,25],["Search for additional companions","Measure transit times over a longer baseline","Refine the orbital elements"])
    }[goal]
    with st.expander("Adjust ranking weights"):
        weights = np.array([st.slider(label,0,100,w,key=goal+label) for label,w in zip(labels,weights)])
    if not weights.any():
        st.info("Give at least one criterion a positive weight to rank targets.")
        st.stop()
    rows=[]
    for name,r in catalog.iterrows():
        g=groups[r.hostname]
        if goal=="Verify a transit signal":
            a=investigate(curve_for(r),g,name)
            vals=[np.nan]*3 if a is None else [np.clip(a["depth"]/a["noise"],0,1) if a["noise"]>0 else np.nan,
                (1/(1+len(a["flags"]))) if np.isfinite(a["odd"]+a["even"]+a["secondary"]) else np.nan,min(a["events"]/3,1)]
        elif goal=="Study potential habitability":
            vals=[float(r.pl_rade<=1.6) if pd.notna(r.pl_rade) else np.nan,float(.36<=r.pl_insol<=1.11) if pd.notna(r.pl_insol) else np.nan,
                  r[["pl_bmasse","pl_dens","st_teff"]].notna().mean()]
        else:
            p=pairs(g)
            gaps=p.loc[(p["Inner planet"]==name)|(p["Outer planet"]==name),"Difference (%)"]
            vals=[min((len(g)-1)/2,1),max(0,1-gaps.min()/2) if len(gaps) else np.nan,r[["pl_orbper","pl_orbsmax","pl_orbeccen"]].notna().mean()]
        vals=np.array(vals)
        valid=np.isfinite(vals)&(weights>0)
        score=np.average(vals[valid],weights=weights[valid])*100 if valid.any() else np.nan
        weak=np.where(weights>0,weights*(1-np.nan_to_num(vals)), -1).argmax()
        missing=", ".join(k for k,v in zip(labels,vals) if not np.isfinite(v))
        rows.append({"Planet":name,"Score":score,**dict(zip(labels,vals*100)),"Missing":missing or "None","Suggested follow-up":actions[weak]})
    ranking=pd.DataFrame(rows).sort_values("Score",ascending=False)
    st.dataframe(ranking.round(1),hide_index=True)
    chosen=st.selectbox("Explain ranking for",ranking.Planet)
    detail=ranking.set_index("Planet").loc[chosen]
    for label,w in zip(labels,weights):
        st.write(f"{label}: {reading(detail[label],1)} / 100 · weight {w}")
    st.write("Suggested next measurement: "+detail["Suggested follow-up"])
    st.caption("Scores are weighted averages of available criteria. Missing criteria are listed and excluded. Scores express project priorities, not probabilities. The demo targets are confirmed planets.")
st.markdown("[NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) · [TESS observations at MAST](https://archive.stsci.edu/missions-and-data/tess)")

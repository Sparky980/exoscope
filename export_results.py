from pathlib import Path
from itertools import combinations

import numpy as np
import pandas as pd
import json
from plotly.offline import get_plotlyjs
from astropy.io import fits

DATA = Path(__file__).resolve().parent / "data"
RATIOS = {"2:1": 2, "3:2": 1.5, "4:3": 4 / 3}



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


def criteria(goal, r, g, name, analysis):
    if goal=="Verify a transit signal":
        a=analysis
        vals=[np.nan]*3 if a is None else [np.clip(a["depth"]/a["noise"],0,1) if a["noise"]>0 else np.nan,
            (1/(1+len(a["flags"]))) if np.isfinite(a["odd"]+a["even"]+a["secondary"]) else np.nan,min(a["events"]/3,1)]
    elif goal=="Study potential habitability":
        vals=[float(r.pl_rade<=1.6) if pd.notna(r.pl_rade) else np.nan,float(.36<=r.pl_insol<=1.11) if pd.notna(r.pl_insol) else np.nan,
              r[["pl_bmasse","pl_dens","st_teff"]].notna().mean()]
    else:
        p=pairs(g)
        gaps=p.loc[(p["Inner planet"]==name)|(p["Outer planet"]==name),"Difference (%)"]
        vals=[min((len(g)-1)/2,1),max(0,1-gaps.min()/2) if len(gaps) else np.nan,r[["pl_orbper","pl_orbsmax","pl_orbeccen"]].notna().mean()]
    return [float(v) if np.isfinite(v) else None for v in vals]

def save(name, obj):
    (out/name).write_text(json.dumps(obj, allow_nan=False, separators=(",",":")), encoding="utf-8")


if __name__ == "__main__":
    out = DATA.parent/"frontend"/"public"
    out.mkdir(exist_ok=True, parents=True)
    (out/"plotly.min.js").write_text(get_plotlyjs(),encoding="utf-8")
    catalog = pd.read_csv(DATA/"system-planets.csv").set_index("pl_name")
    targets = []
    for star, group in catalog.groupby("hostname"):
        tic = int(group.iloc[0].tic_id.split()[-1])
        curve = read_star(tuple(sorted(DATA.glob(f"tess*-{tic:016d}-*-s_lc.fits"))))
        save(star+".json", {"x":curve.time.round(6).tolist(),"y":curve.flux.round(7).tolist(),"sectors":sorted(map(int,curve.sector.unique()))})
        for name,row in group.iterrows():
            result = investigate(curve, group, name)
            if result is None:
                raise ValueError(f"No transit data for {name}")
            offset = result["dt"]*24
            mask = abs(offset)<2*row.pl_trandur
            hours,flux=offset[mask],result["f"][mask]
            bins=pd.cut(hours,np.linspace(-2*row.pl_trandur,2*row.pl_trandur,51))
            med=pd.DataFrame({"x":hours,"y":flux}).groupby(bins,observed=True).median()
            save(name+".json",dict(x=hours.round(5).tolist(),y=flux.round(7).tolist(),mx=med.x.tolist(),my=med.y.tolist()))
            stats={k:(float(result[k]) if np.isfinite(result[k]) else None) for k in ["depth","odd","even","secondary","noise"]}
            match=pairs(group)
            match=match[(match["Inner planet"]==name)|(match["Outer planet"]==name)]
            goals=["Verify a transit signal","Study potential habitability","Study system architecture"]
            targets.append(dict(name=name, star=star,tic=row.tic_id, period=row.pl_orbper,radius=row.pl_rade,light=row.pl_insol,
                duration=row.pl_trandur, events=result["events"], flags=result["flags"], shape=result["shape"],stats=stats,
                pairs=match.to_dict("records"),criteria=[criteria(goal,row,group,name,result) for goal in goals]))
    save("catalog.json",targets)

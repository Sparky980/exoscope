"""Prepare UTC transit-window midpoints from the saved NASA composite parameters."""
import json
from pathlib import Path

import numpy as np
import astropy.units as u
from astropy.coordinates import SkyCoord, EarthLocation
from astropy.time import Time
from astropy.utils import iers

iers.conf.auto_download = False
here = Path(__file__).resolve().parent
records = json.loads((here/"timing.json").read_text(encoding="utf-8-sig"))
site = EarthLocation.from_geocentric(0, 0, 0, unit=u.m)
start, end = Time("2025-01-01").jd, Time("2031-01-01").jd
for row in records:
    t0, period = row["pl_tranmid"], row["pl_orbper"]
    cycles = np.arange(np.floor((start-t0)/period),np.ceil((end-t0)/period)+1)
    epoch = Time(t0+cycles*period, format="jd", scale="tdb", location=site)
    star = SkyCoord(row["ra"]*u.deg,row["dec"]*u.deg)
    utc = (epoch-epoch.light_travel_time(star)).utc
    row["events"] = [[int(n),round(seconds)] for n,seconds in zip(cycles,utc.unix)]
(here/"windows.json").write_text(json.dumps(records,separators=(",",":")),encoding="utf-8")

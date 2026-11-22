# ExoScope Observatory

**[Open the live observatory](https://exoscope-astro-observatory.halesquid131.chatgpt.site/)**

ExoScope helps astronomy clubs and curious observers answer two questions. Where will an object be in my sky tonight? What can I learn from the light a telescope recorded? Choose an object in the atlas to open a tool built for that investigation.

## Try a one-minute investigation

Open **Neutron stars** and select **Use measured peak**. The chart groups 376,259 X-ray detections from a two-minute AstroSat observation of the Crab pulsar. Move the trial period away from **33.7245 milliseconds**, then bring it back. Watch how the pulses line up when the trial period matches the rotation. [Explore the Crab pulsar](https://exoscope-astro-observatory.halesquid131.chatgpt.site/high.html?type=pulsar)

## Explore the atlas

| Investigation | What you can do |
| --- | --- |
| Comets and asteroids | Pick a location and date, then scrub through the sky track of Encke or Ceres. Read the altitude and compass bearing for the selected time. |
| Stars and nebulae | Find targets by name or alias, such as M42 and Orion Nebula, and see when they are above the horizon. |
| Quasars and black-hole systems | Compare daily and 30-day X-ray measurements for 3C 273 and Cygnus X-1, including measurement uncertainties. |
| Exoplanets | Replay a transit beside TESS measurements, compare orbital periods, screen seven planets by size and starlight, and adjust research-priority rankings. |
| Planner and experiments | Check upcoming transit windows, vary a simulated planet’s radius, compare stellar photon budgets, or inspect your own light-curve CSV in the browser. |

## Run the full site locally

Use Git and Node.js with npm. The release was built with Node.js 26. The repository includes the prepared observation files used by the public demo.

```sh
git clone https://github.com/Sparky980/exoscope.git
cd exoscope/frontend
npm ci
npm run build
cd ..
node observatory/build.mjs
node frontend/node_modules/vite/bin/vite.js preview --outDir observatory/dist --host 127.0.0.1 --port 4173 --strictPort
```

Open [the local observatory](http://127.0.0.1:4173/) and select an object. To host the site elsewhere, serve the contents of `observatory/dist/` at the root of a static website.

## How the project fits together

- [observatory/](observatory/) contains the object atlas, original icons, sky finder, X-ray investigations, transit planner, and experiments.
- [frontend/](frontend/) contains the React and TypeScript planetary workspace. Its prepared data lives in [frontend/public/](frontend/public/).
- [data/](data/) contains the planetary catalog snapshots and TESS FITS observations. [export_results.py](export_results.py) processes them into the files used by the planetary workspace. Python dependencies are listed in [requirements.txt](requirements.txt).
- [prepare_windows.py](observatory/prepare_windows.py) converts catalog transit epochs into the approximate UTC windows used by the planner.

## Data and interpretation

The sky finder uses a curated catalog and precomputed moving-target data covering **2025–2030**. Altitude and direction are planning estimates. Check local conditions and instrument sensitivity before observing. [JPL Horizons](https://ssd.jpl.nasa.gov/horizons/) · [SIMBAD](https://simbad.cfa.harvard.edu/simbad/)

The high-energy charts use measured X-ray data. The pulsar period shown is an estimate from the selected observation. [AstroSat/LAXPC Crab dataset — Yash Bhargava](https://doi.org/10.5281/zenodo.15920843) · [MAXI/GSC archive](https://maxi.riken.jp/)

The planetary workspace combines catalog properties with stellar brightness measurements. The transit animation illustrates a simplified crossing, and the habitability screen compares radius and starlight against selected thresholds. [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/) · [TESS at MAST](https://archive.stsci.edu/missions-and-data/tess)

The homepage features Orion Nebula imagery credited to NASA, ESA, M. Robberto, and the Hubble Space Telescope Orion Treasury Project Team. [Image and credits](https://esahubble.org/images/heic0601a/)

## Team

Built for **ASTRA 2026 at VIT Bhopal University** by **Aditya Talan** (25BAI10253) and **Aradhya Negi** (25BOE10086).

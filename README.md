# Global Outlook 2027 — Ananthavix Solutions

A self-contained six-page interactive global analytics dashboard designed for GitHub Pages and Vercel.

## Pages
1. Global Overview
2. Population & Demographics
3. Economy & Employment
4. Human Development & Quality of Life
5. Markets, Companies & Sports
6. Country Deep Dive & 2027 Outlook

## Important data note
The uploaded workbook contains the country/year/indicator structure but its fact values and the Companies, Stock_Markets and Sports tables are not populated. To ensure the public dashboard is functional and never blank, this web package includes an **illustrative/modelled portfolio dataset** for all 40 countries.

It must **not** be described as an official statistical release or investment dataset.

The original supplied workbook is included as:
`assets/data/global-dashboard-source-template.xlsx`

Replace the modelled `data.js` values with verified source data before formal analytical publication.

## Reliability
- Plotly is bundled locally in `vendor/plotly.min.js`.
- World geometry is bundled locally in `assets/data/world.geojson`.
- The charts do not depend on a CDN.
- The dashboard renders from local `data.js`, so it is suitable for GitHub Pages and Vercel.

## Deploy to GitHub Pages
Upload every file/folder in this ZIP to the repository root, then enable Pages from the repository settings.

## Deploy to Vercel
Import the repository in Vercel. No build command is required.

## Ananthavix
Branding uses the supplied Ananthavix Solutions logo and the line:
`DATA • INSIGHT • SOLUTIONS • GROWTH`

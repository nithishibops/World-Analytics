const DB=window.GLOBAL_DATA;
const $=id=>document.getElementById(id);
let WORLD=null;
const C={sky:"#4cc8ff",green:"#48dfa3",violet:"#a87cff",gold:"#f5c763",orange:"#ff9860",cyan:"#5fe1dc",red:"#ff7b8d",muted:"#8ea7b9",grid:"rgba(170,210,238,.10)"};
const cfg={displayModeBar:false,responsive:true,scrollZoom:false};
const base={paper_bgcolor:"rgba(0,0,0,0)",plot_bgcolor:"rgba(0,0,0,0)",font:{family:"Inter,Segoe UI,Arial",color:"#9eb3c2",size:9},margin:{l:42,r:12,t:10,b:42},xaxis:{gridcolor:C.grid,zeroline:false,tickfont:{size:8,color:"#7692a7"}},yaxis:{gridcolor:C.grid,zeroline:false,tickfont:{size:8,color:"#7692a7"}},legend:{orientation:"h",y:-.18,font:{size:8,color:"#8ea7b9"}},hoverlabel:{bgcolor:"#10283b",font:{color:"#fff",size:10}}};
const num=v=>Number(v)||0;
const sum=(a,k)=>a.reduce((s,x)=>s+num(x[k]),0);
const wavg=(a,k,w="populationM")=>{let n=0,d=0;a.forEach(x=>{const ww=num(x[w]);n+=num(x[k])*ww;d+=ww});return d?n/d:0};
const avg=(a,k)=>a.length?sum(a,k)/a.length:0;
const fmt0=v=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(num(v));
const fmt1=v=>new Intl.NumberFormat("en-US",{maximumFractionDigits:1}).format(num(v));
const pct=v=>`${num(v).toFixed(1)}%`;
const moneyPC=v=>`$${new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(num(v))}`;
const short=v=>{const n=num(v),a=Math.abs(n);if(a>=1000)return`${(n/1000).toFixed(2)}B`;if(a>=1)return`${n.toFixed(n>=100?0:n>=10?1:2)}M`;return`${(n*1000).toFixed(0)}K`};
const gdp=v=>`$${num(v).toFixed(num(v)>=10?1:2)}T`;
const cap=v=>`$${num(v).toFixed(num(v)>=10?1:2)}T`;
const plot=(id,tr,layout={})=>{if($(id)&&window.Plotly)Plotly.react(id,tr,{...base,...layout},cfg)};
const group=(a,k)=>a.reduce((m,x)=>{(m[x[k]]??=[]).push(x);return m},{});
const top=(a,n=10)=>[...a].sort((x,y)=>y.value-x.value).slice(0,n);
const countryMeta=iso=>DB.countries.find(c=>c.iso3===iso);
function year(){return +$("yearFilter").value}
function rowsAt(y=year()){
 const rg=$("regionFilter").value,co=$("countryFilter").value;
 return DB.series.filter(r=>r.year===y&&(rg==="ALL"||r.region===rg)&&(co==="ALL"||r.iso3===co));
}
function trendRows(){
 const rg=$("regionFilter").value,co=$("countryFilter").value;
 return DB.series.filter(r=>(rg==="ALL"||r.region===rg)&&(co==="ALL"||r.iso3===co));
}
function metaScope(){
 const rg=$("regionFilter").value,co=$("countryFilter").value;
 return DB.countries.filter(c=>(rg==="ALL"||c.region===rg)&&(co==="ALL"||c.iso3===co));
}
function set(id,v){if($(id))$(id).textContent=v}
function deltaPct(a,b){return b?((a/b)-1)*100:0}
function cagr(a,b,years){return b>0&&a>0?(Math.pow(a/b,1/years)-1)*100:0}
function weightedTotalGDPpc(rows){const pop=sum(rows,"populationM");return pop?sum(rows,"gdpT")*1e6/pop:0}
function scopeName(){
 const y=year(),rg=$("regionFilter").value,co=$("countryFilter").value;
 const c=DB.countries.find(x=>x.iso3===co);
 return [y,c?c.country:null,rg!=="ALL"?rg:null].filter(Boolean).join(" • ")||String(y)
}
function fillFilters(){
 $("yearFilter").innerHTML=DB.meta.years.map(y=>`<option ${y===2027?"selected":""}>${y}</option>`).join("");
 const regs=[...new Set(DB.countries.map(c=>c.region))].sort();
 $("regionFilter").innerHTML='<option value="ALL">All Regions</option>'+regs.map(x=>`<option>${x}</option>`).join("");
 updateCountries();
 $("deepCountry").innerHTML=DB.countries.map(c=>`<option value="${c.iso3}" ${c.iso3==="IND"?"selected":""}>${c.country}</option>`).join("");
}
function updateCountries(){
 const rg=$("regionFilter").value,old=$("countryFilter").value;
 const cs=DB.countries.filter(c=>rg==="ALL"||c.region===rg).sort((a,b)=>a.country.localeCompare(b.country));
 $("countryFilter").innerHTML='<option value="ALL">All Countries</option>'+cs.map(c=>`<option value="${c.iso3}">${c.country}</option>`).join("");
 if(cs.some(c=>c.iso3===old))$("countryFilter").value=old;
}
function aggregateByYear(rows){
 return Object.entries(group(rows,"year")).map(([yy,rs])=>({
  year:+yy,populationM:sum(rs,"populationM"),gdpT:sum(rs,"gdpT"),
  hdi:wavg(rs,"hdi"),life:wavg(rs,"lifeExpectancy"),gdpGrowth:wavg(rs,"gdpGrowth"),
  gdpPerCapita:weightedTotalGDPpc(rs)
 })).sort((a,b)=>a.year-b.year);
}
function groupedWeighted(rows,key){
 return Object.entries(group(rows,"region")).map(([name,rs])=>({name,value:wavg(rs,key),rows:rs}));
}
async function loadWorld(){
 try{WORLD=await fetch("assets/data/world.geojson").then(r=>r.json())}catch(e){WORLD=null}
 renderWorldMap(rowsAt());
}
function renderWorldMap(rows){
 if(!WORLD){$("worldMap").innerHTML='<div style="padding:80px 20px;text-align:center;color:#728da1;font-size:11px">World geometry is loading. Other dashboard visuals remain available.</div>';return}
 const metric=$("mapMetric").value;
 const labels={populationM:"Population (M)",gdpT:"GDP ($T)",gdpPerCapita:"GDP per capita ($)",hdi:"HDI"};
 plot("worldMap",[{
   type:"choropleth",geojson:WORLD,featureidkey:"properties.iso_a3",locations:rows.map(r=>r.iso3),
   z:rows.map(r=>r[metric]),text:rows.map(r=>r.country),
   colorscale:[[0,"#102b42"],[.25,"#18577d"],[.5,"#1b8ec5"],[.75,"#4cc8ff"],[1,"#d5f3ff"]],
   marker:{line:{color:"#06111d",width:.45}},
   hovertemplate:`%{text}<br>${labels[metric]}: %{z:,.3g}<extra></extra>`,
   colorbar:{title:labels[metric],thickness:8,len:.62,tickfont:{size:8,color:"#7793a7"},titlefont:{size:8,color:"#7793a7"}}
 }],{margin:{l:0,r:0,t:0,b:0},geo:{fitbounds:"locations",visible:false,bgcolor:"rgba(0,0,0,0)"}})
}
function renderOverview(){
 const r=rowsAt(),tr=trendRows(),pop=sum(r,"populationM"),g=sum(r,"gdpT");
 set("ovPop",short(pop));set("ovGDP",gdp(g));set("ovGDPpc",moneyPC(weightedTotalGDPpc(r)));set("ovHDI",wavg(r,"hdi").toFixed(3));set("ovInternet",pct(wavg(r,"internetPct")));set("ovUrban",pct(wavg(r,"urbanPct")));
 const gdpRank=top(r.map(x=>({name:x.country,value:x.gdpT})),10).reverse();
 plot("topGDP",[{type:"bar",orientation:"h",y:gdpRank.map(x=>x.name),x:gdpRank.map(x=>x.value),marker:{color:C.sky},hovertemplate:"%{y}<br>$%{x:.2f}T<extra></extra>"}],{margin:{l:105,r:10,t:5,b:35},xaxis:{...base.xaxis,tickprefix:"$",ticksuffix:"T"}});
 const t=aggregateByYear(tr);
 plot("globalTrend",[
   {type:"scatter",mode:"lines+markers",name:"Population (M)",x:t.map(x=>x.year),y:t.map(x=>x.populationM),line:{color:C.green,width:2},marker:{size:4}},
   {type:"scatter",mode:"lines+markers",name:"GDP ($T)",x:t.map(x=>x.year),y:t.map(x=>x.gdpT),yaxis:"y2",line:{color:C.violet,width:2},marker:{size:4}}
 ],{xaxis:{...base.xaxis,dtick:2},yaxis:{...base.yaxis,title:"Population (M)",tickformat:".3s"},yaxis2:{overlaying:"y",side:"right",showgrid:false,title:"GDP $T",tickprefix:"$",ticksuffix:"T",tickfont:{size:8,color:"#7692a7"}},legend:{...base.legend,y:-.2}});
 const rg=Object.entries(group(r,"region")).map(([name,rs])=>({name,value:sum(rs,"gdpT")})).sort((a,b)=>b.value-a.value);
 plot("regionGDP",[{type:"pie",labels:rg.map(x=>x.name),values:rg.map(x=>x.value),hole:.62,marker:{colors:[C.sky,C.violet,C.green,C.gold,C.orange,C.cyan,"#7f96a8"]},textinfo:"percent",hovertemplate:"%{label}<br>$%{value:.2f}T<extra></extra>"}],{margin:{l:10,r:10,t:4,b:25},legend:{...base.legend,y:-.2}});
 const hi=[...r].sort((a,b)=>b.hdi-a.hdi).slice(0,5),lo=[...r].sort((a,b)=>a.hdi-b.hdi).slice(0,5);
 plot("hdiRank",[
  {type:"bar",name:"Highest",x:hi.map(x=>x.country),y:hi.map(x=>x.hdi),marker:{color:C.green}},
  {type:"bar",name:"Lowest",x:lo.map(x=>x.country),y:lo.map(x=>x.hdi),marker:{color:C.orange}}
 ],{barmode:"group",margin:{l:40,r:10,t:5,b:70},yaxis:{...base.yaxis,range:[0,1]}});
 renderWorldMap(r)
}
function renderPopulation(){
 const r=rowsAt(),y=year(),r2017=DB.series.filter(x=>x.year===2017&&r.some(z=>z.iso3===x.iso3));
 const pop=sum(r,"populationM"),old=sum(r2017,"populationM");set("pPop",short(pop));set("pGrowth",`${deltaPct(pop,old).toFixed(1)}%`);set("pFert",wavg(r,"fertility").toFixed(2));set("pMig",`${sum(r,"netMigrationM").toFixed(2)}M`);set("pUrban",pct(wavg(r,"urbanPct")));set("pSenior",pct(wavg(r,"age65plusPct")));
 const growth=r.map(x=>{const b=DB.series.find(z=>z.iso3===x.iso3&&z.year===2017);return{name:x.country,value:deltaPct(x.populationM,b?.populationM||x.populationM)}});const gr=top(growth,12).reverse();
 plot("popGrowthRank",[{type:"bar",orientation:"h",y:gr.map(x=>x.name),x:gr.map(x=>x.value),marker:{color:C.green}}],{margin:{l:115,r:10,t:5,b:35},xaxis:{...base.xaxis,ticksuffix:"%"}});
 const rg=Object.entries(group(r,"region")).map(([name,rs])=>({name,young:wavg(rs,"age0to14Pct"),work:wavg(rs,"age15to64Pct"),senior:wavg(rs,"age65plusPct")}));
 plot("ageStructure",[
  {type:"bar",name:"0–14",x:rg.map(x=>x.name),y:rg.map(x=>x.young),marker:{color:C.green}},
  {type:"bar",name:"15–64",x:rg.map(x=>x.name),y:rg.map(x=>x.work),marker:{color:C.sky}},
  {type:"bar",name:"65+",x:rg.map(x=>x.name),y:rg.map(x=>x.senior),marker:{color:C.gold}}
 ],{barmode:"stack",margin:{l:40,r:8,t:5,b:75},yaxis:{...base.yaxis,ticksuffix:"%"}});
 const fr=top(r.map(x=>({name:x.country,value:x.fertility})),10).reverse();
 plot("fertilityRank",[{type:"bar",orientation:"h",y:fr.map(x=>x.name),x:fr.map(x=>x.value),marker:{color:C.gold}}],{margin:{l:110,r:10,t:5,b:35}});
 plot("migrationScatter",[{type:"scatter",mode:"markers",x:r.map(x=>x.netMigrationM),y:r.map(x=>{const b=DB.series.find(z=>z.iso3===x.iso3&&z.year===2017);return deltaPct(x.populationM,b?.populationM||x.populationM)}),text:r.map(x=>x.country),marker:{size:r.map(x=>Math.max(7,Math.min(20,Math.sqrt(x.populationM)))),color:C.violet,opacity:.72},hovertemplate:"%{text}<br>Net migration %{x:.2f}M<br>Pop change %{y:.1f}%<extra></extra>"}],{xaxis:{...base.xaxis,title:"Net migration (M)"},yaxis:{...base.yaxis,title:"Population change",ticksuffix:"%"}});
 const ur=groupedWeighted(r,"urbanPct").sort((a,b)=>b.value-a.value);
 plot("urbanRegion",[{type:"bar",x:ur.map(x=>x.name),y:ur.map(x=>x.value),marker:{color:C.sky}}],{margin:{l:40,r:8,t:5,b:75},yaxis:{...base.yaxis,ticksuffix:"%"}});
 plot("popVsIncome",[{type:"scatter",mode:"markers",x:r.map(x=>x.populationM),y:r.map(x=>x.gdpPerCapita),text:r.map(x=>x.country),marker:{size:r.map(x=>Math.max(7,Math.min(25,Math.sqrt(x.gdpT)*8))),color:r.map(x=>x.hdi),colorscale:"Viridis",showscale:true,colorbar:{title:"HDI",thickness:8}},hovertemplate:"%{text}<br>Population %{x:.1f}M<br>GDP/person $%{y:,.0f}<extra></extra>"}],{xaxis:{...base.xaxis,title:"Population (M)",type:"log"},yaxis:{...base.yaxis,title:"GDP per person $",type:"log"}})
}
function renderEconomy(){
 const r=rowsAt(),tr=aggregateByYear(trendRows());
 set("eGDP",gdp(sum(r,"gdpT")));set("eGDPpc",moneyPC(weightedTotalGDPpc(r)));set("eGrowth",pct(wavg(r,"gdpGrowth")));set("eInflation",pct(wavg(r,"inflationPct")));set("eUnemp",pct(wavg(r,"unemploymentPct")));set("eTrade",pct(wavg(r,"tradePctGDP")));
 const gr=top(r.map(x=>({name:x.country,value:x.gdpT})),12).reverse();plot("economyGDP",[{type:"bar",orientation:"h",y:gr.map(x=>x.name),x:gr.map(x=>x.value),marker:{color:C.violet}}],{margin:{l:115,r:10,t:5,b:35},xaxis:{...base.xaxis,tickprefix:"$",ticksuffix:"T"}});
 const pc=top(r.map(x=>({name:x.country,value:x.gdpPerCapita})),10).reverse();plot("gdpPcRank",[{type:"bar",orientation:"h",y:pc.map(x=>x.name),x:pc.map(x=>x.value),marker:{color:C.gold}}],{margin:{l:110,r:10,t:5,b:35},xaxis:{...base.xaxis,tickprefix:"$",tickformat:".2s"}});
 plot("inflationUnemployment",[{type:"scatter",mode:"markers",x:r.map(x=>x.inflationPct),y:r.map(x=>x.unemploymentPct),text:r.map(x=>x.country),marker:{size:9,color:C.orange,opacity:.72},hovertemplate:"%{text}<br>Inflation %{x:.1f}%<br>Unemployment %{y:.1f}%<extra></extra>"}],{xaxis:{...base.xaxis,title:"Inflation %"},yaxis:{...base.yaxis,title:"Unemployment %"}});
 const td=top(r.map(x=>({name:x.country,value:x.tradePctGDP})),10).reverse();plot("tradeRank",[{type:"bar",orientation:"h",y:td.map(x=>x.name),x:td.map(x=>x.value),marker:{color:C.sky}}],{margin:{l:110,r:10,t:5,b:35},xaxis:{...base.xaxis,ticksuffix:"%"}});
 const rg=Object.entries(group(r,"region")).map(([name,rs])=>({name,a:wavg(rs,"agriculturePct"),i:wavg(rs,"industryPct"),s:wavg(rs,"servicesPct")}));
 plot("sectorMix",[
  {type:"bar",name:"Agriculture",x:rg.map(x=>x.name),y:rg.map(x=>x.a),marker:{color:C.green}},
  {type:"bar",name:"Industry",x:rg.map(x=>x.name),y:rg.map(x=>x.i),marker:{color:C.violet}},
  {type:"bar",name:"Services",x:rg.map(x=>x.name),y:rg.map(x=>x.s),marker:{color:C.sky}}
 ],{barmode:"stack",margin:{l:40,r:8,t:5,b:75},yaxis:{...base.yaxis,ticksuffix:"%"}});
 plot("growthTrend",[{type:"scatter",mode:"lines+markers",x:tr.map(x=>x.year),y:tr.map(x=>x.gdpGrowth),line:{color:C.violet,width:2},marker:{size:5},fill:"tozeroy",fillcolor:"rgba(168,124,255,.08)"}],{xaxis:{...base.xaxis,dtick:2},yaxis:{...base.yaxis,ticksuffix:"%",title:"GDP growth"}})
}
function renderDevelopment(){
 const r=rowsAt(),tr=aggregateByYear(trendRows()),hi=Math.max(...r.map(x=>x.hdi)),lo=Math.min(...r.map(x=>x.hdi));
 set("dHDI",wavg(r,"hdi").toFixed(3));set("dLit",pct(wavg(r,"literacyPct")));set("dLife",`${wavg(r,"lifeExpectancy").toFixed(1)} yrs`);set("dHealth",pct(wavg(r,"healthPctGDP")));set("dInternet",pct(wavg(r,"internetPct")));set("dGap",(hi-lo).toFixed(3));
 const hr=top(r.map(x=>({name:x.country,value:x.hdi})),12).reverse();plot("hdiTop",[{type:"bar",orientation:"h",y:hr.map(x=>x.name),x:hr.map(x=>x.value),marker:{color:C.gold}}],{margin:{l:115,r:10,t:5,b:35},xaxis:{...base.xaxis,range:[0.4,1]}});
 plot("healthLife",[{type:"scatter",mode:"markers",x:r.map(x=>x.healthPctGDP),y:r.map(x=>x.lifeExpectancy),text:r.map(x=>x.country),marker:{size:9,color:r.map(x=>x.hdi),colorscale:"Viridis",showscale:true,colorbar:{title:"HDI",thickness:8}},hovertemplate:"%{text}<br>Health spend %{x:.1f}% GDP<br>Life %{y:.1f} years<extra></extra>"}],{xaxis:{...base.xaxis,title:"Health spending % GDP"},yaxis:{...base.yaxis,title:"Life expectancy"}});
 const lr=groupedWeighted(r,"literacyPct").sort((a,b)=>b.value-a.value);plot("literacyRegion",[{type:"bar",x:lr.map(x=>x.name),y:lr.map(x=>x.value),marker:{color:C.green}}],{margin:{l:40,r:8,t:5,b:75},yaxis:{...base.yaxis,ticksuffix:"%",range:[40,100]}});
 const ir=groupedWeighted(r,"internetPct").sort((a,b)=>b.value-a.value);plot("internetRegion",[{type:"bar",x:ir.map(x=>x.name),y:ir.map(x=>x.value),marker:{color:C.sky}}],{margin:{l:40,r:8,t:5,b:75},yaxis:{...base.yaxis,ticksuffix:"%",range:[0,100]}});
 plot("incomeHDI",[{type:"scatter",mode:"markers",x:r.map(x=>x.gdpPerCapita),y:r.map(x=>x.hdi),text:r.map(x=>x.country),marker:{size:9,color:C.gold,opacity:.75},hovertemplate:"%{text}<br>GDP/person $%{x:,.0f}<br>HDI %{y:.3f}<extra></extra>"}],{xaxis:{...base.xaxis,title:"GDP per person $",type:"log"},yaxis:{...base.yaxis,title:"HDI",range:[.45,1]}});
 plot("developmentTrend",[
  {type:"scatter",mode:"lines+markers",name:"HDI",x:tr.map(x=>x.year),y:tr.map(x=>x.hdi),line:{color:C.gold,width:2},marker:{size:4}},
  {type:"scatter",mode:"lines+markers",name:"Life expectancy",x:tr.map(x=>x.year),y:tr.map(x=>x.life),yaxis:"y2",line:{color:C.green,width:2},marker:{size:4}}
 ],{xaxis:{...base.xaxis,dtick:2},yaxis:{...base.yaxis,title:"HDI",range:[Math.max(.4,Math.min(...tr.map(x=>x.hdi))-.03),1]},yaxis2:{overlaying:"y",side:"right",showgrid:false,title:"Years",tickfont:{size:8,color:"#7692a7"}},legend:{...base.legend,y:-.2}})
}
function renderMarkets(){
 const r=rowsAt(),cs=metaScope(),totalCap=sum(r,"marketCapT"),g=sum(r,"gdpT");
 set("mCap",cap(totalCap));set("mCapGDP",pct(g?totalCap/g*100:0));set("mListed",fmt0(cs.reduce((s,c)=>s+c.listedCompanies,0)));
 const best=[...cs].sort((a,b)=>b.companyMarketCapB-a.companyMarketCapB)[0];set("mCompany",best?best.company:"—");set("mCompanySub",best?`${best.companySector} • $${best.companyMarketCapB}B`:"—");set("mMedals",fmt0(cs.reduce((s,c)=>s+c.sportsMedals,0)));set("mSportScore",fmt1(avg(cs,"sportsScore")));
 const mr=top(r.map(x=>({name:x.country,value:x.marketCapT})),12).reverse();plot("marketCapRank",[{type:"bar",orientation:"h",y:mr.map(x=>x.name),x:mr.map(x=>x.value),marker:{color:C.orange}}],{margin:{l:115,r:10,t:5,b:35},xaxis:{...base.xaxis,tickprefix:"$",ticksuffix:"T"}});
 plot("marketGDPScatter",[{type:"scatter",mode:"markers",x:r.map(x=>x.gdpT),y:r.map(x=>x.marketCapPctGDP),text:r.map(x=>x.country),marker:{size:10,color:C.orange,opacity:.72},hovertemplate:"%{text}<br>GDP $%{x:.2f}T<br>Market cap/GDP %{y:.1f}%<extra></extra>"}],{xaxis:{...base.xaxis,title:"GDP $T",type:"log"},yaxis:{...base.yaxis,title:"Market cap / GDP %"}});
 const cr=top(cs.map(c=>({name:c.company,value:c.companyMarketCapB,country:c.country})),12).reverse();plot("companyRank",[{type:"bar",orientation:"h",y:cr.map(x=>x.name),x:cr.map(x=>x.value),text:cr.map(x=>x.country),marker:{color:C.violet},hovertemplate:"%{y}<br>%{text}<br>$%{x:.0f}B<extra></extra>"}],{margin:{l:155,r:10,t:5,b:35},xaxis:{...base.xaxis,tickprefix:"$",ticksuffix:"B"}});
 const sectors=Object.entries(group(cs,"companySector")).map(([name,x])=>({name,value:x.length})).sort((a,b)=>b.value-a.value);plot("companySector",[{type:"pie",labels:sectors.map(x=>x.name),values:sectors.map(x=>x.value),hole:.58,marker:{colors:[C.violet,C.sky,C.green,C.gold,C.orange,C.cyan,"#7f96a8"]},textinfo:"percent"}],{margin:{l:10,r:10,t:3,b:25},legend:{...base.legend,y:-.2}});
 const sr=top(cs.map(c=>({name:c.country,value:c.sportsScore,medals:c.sportsMedals})),12).reverse();plot("sportsRank",[{type:"bar",orientation:"h",y:sr.map(x=>x.name),x:sr.map(x=>x.value),text:sr.map(x=>`${x.medals} medals`),marker:{color:C.green},hovertemplate:"%{y}<br>Score %{x:.1f}<br>%{text}<extra></extra>"}],{margin:{l:110,r:10,t:5,b:35}});
 plot("marketCapGDP",[{type:"scatter",mode:"markers",x:r.map(x=>x.gdpT),y:r.map(x=>x.marketCapT),text:r.map(x=>x.country),marker:{size:r.map(x=>Math.max(7,Math.min(20,x.marketCapPctGDP/12))),color:r.map(x=>x.marketCapPctGDP),colorscale:"Plasma",showscale:true,colorbar:{title:"MCap/GDP %",thickness:8}},hovertemplate:"%{text}<br>GDP $%{x:.2f}T<br>Market cap $%{y:.2f}T<extra></extra>"}],{xaxis:{...base.xaxis,title:"GDP $T",type:"log"},yaxis:{...base.yaxis,title:"Market cap $T",type:"log"}})
}
function deepRow(iso,y){return DB.series.find(r=>r.iso3===iso&&r.year===y)}
function renderDeepDive(){
 const iso=$("deepCountry").value,meta=countryMeta(iso),r27=deepRow(iso,2027),r26=deepRow(iso,2026),r22=deepRow(iso,2022),r17=deepRow(iso,2017),r15=deepRow(iso,2015);
 set("countryBadge",`${meta.country} • ${meta.region}`);set("xPop",short(r27.populationM));set("xPopChange",`10-year: ${deltaPct(r27.populationM,r17.populationM).toFixed(1)}%`);set("xGDP",gdp(r27.gdpT));set("xGDPCagr",`10-year CAGR: ${cagr(r27.gdpT,r17.gdpT,10).toFixed(1)}%`);set("xGDPpc",moneyPC(r27.gdpPerCapita));set("xGDPpcChange",`YoY: ${deltaPct(r27.gdpPerCapita,r26.gdpPerCapita).toFixed(1)}%`);set("xHDI",r27.hdi.toFixed(3));set("xHDIChange",`10-year: ${(r27.hdi-r17.hdi).toFixed(3)}`);set("xCompany",meta.company);set("xCompanySector",`${meta.companySector} • $${meta.companyMarketCapB}B`);set("xSports",fmt1(meta.sportsScore));set("xSportsSub",`${meta.sportsMedals} medal reference count`);
 const tr=DB.series.filter(r=>r.iso3===iso).sort((a,b)=>a.year-b.year);
 plot("countryTrend",[
  {type:"scatter",mode:"lines+markers",name:"Population (M)",x:tr.map(x=>x.year),y:tr.map(x=>x.populationM),line:{color:C.green,width:2},marker:{size:4}},
  {type:"scatter",mode:"lines+markers",name:"GDP/person ($)",x:tr.map(x=>x.year),y:tr.map(x=>x.gdpPerCapita),yaxis:"y2",line:{color:C.sky,width:2},marker:{size:4}},
  {type:"scatter",mode:"lines+markers",name:"HDI ×100k",x:tr.map(x=>x.year),y:tr.map(x=>x.hdi*100000),yaxis:"y2",line:{color:C.gold,width:2,dash:"dot"},marker:{size:4}}
 ],{xaxis:{...base.xaxis,dtick:2},yaxis:{...base.yaxis,title:"Population (M)"},yaxis2:{overlaying:"y",side:"right",showgrid:false,title:"GDP/person & HDI scale",tickfont:{size:8,color:"#7692a7"}},legend:{...base.legend,y:-.2}});
 const world27=DB.series.filter(r=>r.year===2027),reg27=world27.filter(r=>r.region===meta.region);
 const metrics=[["GDP/person",r27.gdpPerCapita,wavg(reg27,"gdpPerCapita"),wavg(world27,"gdpPerCapita")],["HDI",r27.hdi,wavg(reg27,"hdi"),wavg(world27,"hdi")],["Life",r27.lifeExpectancy,wavg(reg27,"lifeExpectancy"),wavg(world27,"lifeExpectancy")],["Internet",r27.internetPct,wavg(reg27,"internetPct"),wavg(world27,"internetPct")],["Urban",r27.urbanPct,wavg(reg27,"urbanPct"),wavg(world27,"urbanPct")]];
 const idx=metrics.map(x=>({name:x[0],country:x[1]/x[3]*100,region:x[2]/x[3]*100,world:100}));
 plot("countryCompare",[
  {type:"bar",name:meta.country,x:idx.map(x=>x.name),y:idx.map(x=>x.country),marker:{color:C.cyan}},
  {type:"bar",name:meta.region,x:idx.map(x=>x.name),y:idx.map(x=>x.region),marker:{color:C.violet}},
  {type:"bar",name:"Global",x:idx.map(x=>x.name),y:idx.map(x=>x.world),marker:{color:"#5d7587"}}
 ],{barmode:"group",margin:{l:40,r:10,t:5,b:55},yaxis:{...base.yaxis,title:"Index (Global = 100)"}});
 const outlook=[{n:"GDP growth",v:r27.gdpGrowth},{n:"Inflation",v:r27.inflationPct},{n:"Unemployment",v:r27.unemploymentPct},{n:"Population growth",v:deltaPct(r27.populationM,r26.populationM)},{n:"HDI change",v:(r27.hdi-r26.hdi)*100}];
 plot("outlookBars",[{type:"bar",x:outlook.map(x=>x.n),y:outlook.map(x=>x.v),marker:{color:outlook.map(x=>x.v>=0?C.cyan:C.red)},text:outlook.map(x=>`${x.v.toFixed(1)}%`),textposition:"outside"}],{margin:{l:40,r:10,t:18,b:65},yaxis:{...base.yaxis,ticksuffix:"%"}});
 const rows=[
  ["Population",`${r27.populationM.toFixed(1)}M`,deltaPct(r27.populationM,r26.populationM),deltaPct(r27.populationM,r22.populationM),deltaPct(r27.populationM,r17.populationM),cagr(r27.populationM,r17.populationM,10)],
  ["GDP",gdp(r27.gdpT),deltaPct(r27.gdpT,r26.gdpT),deltaPct(r27.gdpT,r22.gdpT),deltaPct(r27.gdpT,r17.gdpT),cagr(r27.gdpT,r17.gdpT,10)],
  ["GDP per person",moneyPC(r27.gdpPerCapita),deltaPct(r27.gdpPerCapita,r26.gdpPerCapita),deltaPct(r27.gdpPerCapita,r22.gdpPerCapita),deltaPct(r27.gdpPerCapita,r17.gdpPerCapita),cagr(r27.gdpPerCapita,r17.gdpPerCapita,10)],
  ["HDI",r27.hdi.toFixed(3),(r27.hdi-r26.hdi)*100,(r27.hdi-r22.hdi)*100,(r27.hdi-r17.hdi)*100,cagr(r27.hdi,r17.hdi,10)],
  ["Internet",pct(r27.internetPct),r27.internetPct-r26.internetPct,r27.internetPct-r22.internetPct,r27.internetPct-r17.internetPct,cagr(r27.internetPct,r17.internetPct,10)]
 ];
 $("changeTable").innerHTML=rows.map(x=>`<tr><td>${x[0]}</td><td>${x[1]}</td>${x.slice(2).map(v=>`<td class="${v>=0?"pos":"neg"}">${v>=0?"+":""}${v.toFixed(1)}%</td>`).join("")}</tr>`).join("")
}
function renderAll(){set("scopeText",scopeName());renderOverview();renderPopulation();renderEconomy();renderDevelopment();renderMarkets();renderDeepDive()}
function switchPage(p){
 document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===p));
 const el=$(`page-${p}`);el.classList.add("active");document.documentElement.style.setProperty("--accent",getComputedStyle(el).getPropertyValue("--pageAccent"));set("pageTitle",el.dataset.title);set("pageSub",el.dataset.sub);history.replaceState(null,"",`#${p}`);$("sidebar").classList.remove("open");setTimeout(()=>window.dispatchEvent(new Event("resize")),30)
}
function init(){
 fillFilters();
 document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>switchPage(b.dataset.page));
 $("yearFilter").onchange=renderAll;$("regionFilter").onchange=()=>{updateCountries();renderAll()};$("countryFilter").onchange=renderAll;$("mapMetric").onchange=()=>renderWorldMap(rowsAt());$("deepCountry").onchange=renderDeepDive;
 $("resetBtn").onclick=()=>{$("yearFilter").value="2027";$("regionFilter").value="ALL";updateCountries();$("countryFilter").value="ALL";renderAll()};
 $("fullBtn").onclick=async()=>{try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen()}catch(e){}};
 $("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");
 const p=(location.hash||"#overview").slice(1);switchPage(["overview","population","economy","development","markets","deepdive"].includes(p)?p:"overview");
 renderAll();loadWorld()
}
init();
import"./style-Ew-D2CFs.js";import{maps as a}from"./maps-Fh_1qKl1.js";const i=document.getElementById("maps-grid"),r=document.getElementById("filters"),v=document.getElementById("footer-count"),m=[...new Set(a.flatMap(n=>n.tags??[]))].sort();let s=null;function o(){r.innerHTML="";const n=(t,e)=>{const c=document.createElement("button");c.className="filter-btn"+(s===e?" active":""),c.textContent=t,c.addEventListener("click",()=>{s=e,o(),u()}),r.appendChild(c)};n("Toutes",null),m.forEach(t=>n(t,t))}function u(){const n=s?a.filter(t=>{var e;return(e=t.tags)==null?void 0:e.includes(s)}):a;if(i.innerHTML="",v.textContent=n.length+" carte"+(n.length>1?"s":""),n.length===0){i.innerHTML='<div class="maps-empty">Aucune carte pour ce filtre.</div>';return}n.forEach(t=>{var l;const e=document.createElement("div");e.className="map-card",e.innerHTML=`
      <div class="card-border-top"></div>
      <div class="card-thumb">
        ${t.thumbnail?`<img src="${t.thumbnail}" alt="${t.title}" loading="lazy">`:'<div class="card-thumb-placeholder">⬡</div>'}
        <div class="card-thumb-overlay"></div>
        <button class="card-launch">▶ LANCER</button>
      </div>
      <div class="card-body">
        ${t.system?`<div class="card-system">${t.system}</div>`:""}
        <div class="card-title">${t.title}</div>
        ${t.description?`<div class="card-desc">${t.description}</div>`:""}
        ${(l=t.tags)!=null&&l.length?`<div class="card-tags">
          ${t.tags.map(d=>`<span class="card-tag">${d}</span>`).join("")}
        </div>`:""}
      </div>`;const c=()=>{location.href=`battlemap.html?map=${t.id}`};e.addEventListener("click",c),e.querySelector(".card-launch").addEventListener("click",d=>{d.stopPropagation(),c()}),i.appendChild(e)})}o();u();

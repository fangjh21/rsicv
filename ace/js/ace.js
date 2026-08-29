/* AMBA ACE protocol reference — bilingual (EN/ZH) content + hash router (self-contained, no build step). */
(function(){
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let LAN; try { LAN = localStorage.getItem('aceLAN')||'en'; } catch(e){ LAN = 'en'; }
  const t = (zh,en) => LAN === 'zh' ? zh : en;

  /* ------------------ sequence-diagram SVG helper ------------------ */
  function seqSVG(participants, messages, opts){
    opts = opts || {};
    const top = 44, LH = opts.h || 560, gap = LH/(messages.length+1);
    const X = participants.map((p,i)=> 80 + i*((opts.w||760)-160)/(participants.length-1 || 1));
    let s = `<svg width="${opts.w||760}" height="${LH+30}" viewBox="0 0 ${opts.w||760} ${LH+30}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="sequence diagram">`;
    if(opts.title) s += `<text x="${(opts.w||760)/2}" y="16" text-anchor="middle" font-size="13" font-weight="600" fill="#24292f" font-family="var(--sans)">${esc(opts.title)}</text>`;
    participants.forEach((p,i)=>{
      s += `<rect x="${X[i]-58}" y="22" width="116" height="24" rx="4" fill="#f6f8fa" stroke="#d0d7de"/>`;
      s += `<text x="${X[i]}" y="38" text-anchor="middle" font-size="10.5" fill="#24292f" font-family="var(--sans)">${esc(p)}</text>`;
      s += `<line x1="${X[i]}" y1="46" x2="${X[i]}" y2="${LH-6}" stroke="#d0d7de" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    });
    messages.forEach((m,i)=>{
      const y = top + (i+1)*gap;
      const from = X[m[0]], to = X[m[1]];
      const dir = from < to ? 1 : -1;
      const x0 = from + dir*16, x1 = to - dir*16;
      s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#0969da" stroke-width="1.6"/>`;
      s += `<polygon points="${x1},${y} ${x1-dir*7},${y-3} ${x1-dir*7},${y+3}" fill="#0969da"/>`;
      const mid = (from+to)/2;
      const block = [m[2], m[3]].filter(Boolean).join("\\n").split("\\n");
      const oy = y - 8 - (block.length-1)*5.5;
      block.forEach((ln,k)=>{ s += `<text x="${mid}" y="${oy+k*11}" text-anchor="middle" font-size="10" fill="#24292f" font-family="var(--mono)">${esc(ln)}</text>`; });
    });
    s += `</svg>`;
    return s;
  }

  /* ------------------ diagram builders (bilingual) ------------------ */
  function writeUniqueSVG(){
    return seqSVG(
      ["CPU 0 · L1", "Interconnect · L2", "CPU 1 · L1", "CPU 2 · L1", "Memory"],
      [
        [0,1, "1. AW: WriteUnique", "address + AWSNOOP=WriteUnique"],
        [1,2, "2. AC snoop: MakeInvalid", "broadcast to peers"],
        [1,3, "2. AC snoop: MakeInvalid", "broadcast to peers"],
        [2,1, "3. CR: snoop response", "invalidated / dirty on CD"],
        [3,1, "3. CR: snoop response", "invalidated / dirty on CD"],
        [1,0, "4. B: write response", "exclusive ownership obtained"],
        [0,1, "5. W: write data", "WDATA / WSTRB / WLAST"],
        [1,4, "6. WriteNoSnoop", "data to memory if needed"]
      ],
      { title:"AMBA ACE — WriteUnique (multi-owner broadcast)", h:760, w:920 }
    );
  }
  function chiSVG(){
    return seqSVG(["CPU 0", "Home · L2", "Memory", "CPU 1 (peer)"],
      [
        [0,1,"WriteUniquePtl", "address + control"],
        [1,0,"DBIDResp", "data-buffer ID granted"],
        [1,3,"SnpCleanInvalid", "invalidate other caches"],
        [3,1,"SnpResp", "SnpRespData_I_PD"],
        [0,1,"NCBWrData", "write data"],
        [1,2,"WriteNoSnp", "merged data"],
        [2,1,"CompDBIDResp", "write-complete response"],
        [1,0,"Comp", "global completion"]
      ],
      { title:"AMBA CHI — WriteUniquePtl", h:520, w:820 }
    );
  }
  function readUniqueSVG(){
    return seqSVG(["CPU 0","Interconnect","CPU 1","Memory"], [
      [0,1, "AR: ReadUnique", "ARSNOOP=ReadUnique"],
      [1,2, "Snoop: MakeInvalid", "ACSNOOP=MakeInvalid"],
      [2,1, "Snoop resp", "CRRESP (CD if dirty)"],
      [1,0, "R: data + RACK", "RACK=1 → CPU 0 owns Unique"]
    ], { title:"ReadUnique — read and take ownership (invalidate peer)", h:320, w:820 });
  }
  function readSharedSVG(){
    return seqSVG(["CPU 0","Interconnect","CPU 1","Memory"], [
      [0,1, "AR: ReadShared", "ARSNOOP=ReadShared"],
      [1,2, "Snoop: ReadClean", "ACSNOOP=ReadClean"],
      [2,1, "Snoop resp", "CRRESP (CD if dirty)"],
      [1,0, "R: data", "RACK → CPU 0 keeps Shared"]
    ], { title:"ReadShared — read, peer may retain a Shared copy", h:320, w:820 });
  }
  function wbSVG(){
    return seqSVG(["CPU 0 (L1)","Interconnect","Memory",""], [
      [0,1, "AW: WriteBack/WriteClean", "AWSNOOP"],
      [0,1, "W: data", "WLAST"],
      [1,2, "WriteNoSnoop", "write to memory"],
      [2,1, "B: BRESP", "OKAY"],
      [1,0, "B + WACK", "complete"]
    ], { title:"WriteBack / WriteClean — writeback, no snoop", h:360, w:760 });
  }
  function channelsSVG(){
    const N="#0969da", SN="#8250df";
    const CPU="#e1f5fe", CPUB="#01579b", ICN="#f3e5f5", ICNB="#6a1b9a", MEM="#e8f5e9", MEMB="#1b5e20";
    let s = `<svg width="820" height="360" viewBox="0 0 820 360" xmlns="http://www.w3.org/2000/svg" role="img">`;
    s += `<defs>
      <marker id="cn" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="5.5" markerHeight="5.5" orient="auto"><path d="M1 1 L11 6 L1 11 z" fill="${N}"/></marker>
      <marker id="cs" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="5.5" markerHeight="5.5" orient="auto"><path d="M1 1 L11 6 L1 11 z" fill="${SN}"/></marker>
      <marker id="cm" viewBox="0 0 12 12" refX="9" refY="6" markerWidth="5.5" markerHeight="5.5" orient="auto"><path d="M1 1 L11 6 L1 11 z" fill="${N}"/></marker>
    </defs>`;
    const box=(x,y,w,h,title,sub,fill,border)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${fill}" stroke="${border}" stroke-width="1.6"/><text x="${x+w/2}" y="${y+h/2-3}" text-anchor="middle" font-size="15" font-weight="700" fill="#1f2933" font-family="var(--sans)">${title}</text><text x="${x+w/2}" y="${y+h/2+16}" text-anchor="middle" font-size="10.5" fill="#4b5563" font-family="var(--mono)">${sub}</text>`;
    const ar=(x1,x2,y,label,c,mk)=>{ s+=`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${c}" stroke-width="2.4" stroke-linecap="round" marker-end="url(#${mk})"/><text x="${(x1+x2)/2}" y="${y-7}" text-anchor="middle" font-size="11" fill="${c}" font-family="var(--mono)" stroke="#ffffff" stroke-width="3.5" paint-order="stroke">${label}</text>`; };
    s += box(40,44,160,262, "CPU · L1", "requester (RN)", CPU, CPUB);
    s += box(320,44,180,262, "Interconnect", "coherence point", ICN, ICNB);
    s += box(620,90,150,170, "Memory", "controller · DDR", MEM, MEMB);
    const Y=[84,114,144,174,204,234,264,292];
    ar(200,320,Y[0],"AW",N,"cn"); ar(200,320,Y[1],"AR",N,"cn"); ar(200,320,Y[2],"W",N,"cn");
    ar(200,320,Y[3],"AC",SN,"cs"); ar(200,320,Y[4],"CR",SN,"cs"); ar(200,320,Y[5],"CD",SN,"cs");
    ar(200,320,Y[6],"B",N,"cn"); ar(200,320,Y[7],"R",N,"cn");
    const M=[140,180,220,258];
    ar(500,620,M[0],"AW/W",N,"cm"); ar(500,620,M[1],"AR",N,"cm"); ar(620,500,M[2],"B",N,"cm"); ar(620,500,M[3],"R",N,"cm");
    s += `<line x1="470" y1="24" x2="502" y2="24" stroke="${N}" stroke-width="2.6" stroke-linecap="round"/><text x="466" y="28" text-anchor="end" font-size="10.5" fill="${N}" font-family="var(--sans)">${"AXI read / write"}</text>`;
    s += `<line x1="512" y1="24" x2="544" y2="24" stroke="${SN}" stroke-width="2.6" stroke-linecap="round"/><text x="550" y="28" font-size="10.5" fill="${SN}" font-family="var(--sans)">${"snoop (AC/CR/CD)"}</text>`;
    s += `</svg>`;
    return s;
  }
  function statesSVG(){
    let s = `<svg width="880" height="470" viewBox="0 0 880 470" xmlns="http://www.w3.org/2000/svg" role="img">`;
    s += `<defs><marker id="st" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#0969da"/></marker></defs>`;
    const box=(x,y,n,f,fill)=>`<rect x="${x}" y="${y}" width="160" height="70" rx="8" fill="${fill}" stroke="#d0d7de" stroke-width="1.4"/><text x="${x+80}" y="${y+30}" text-anchor="middle" font-size="16" font-weight="700" fill="#24292f" font-family="var(--mono)">${n}</text><text x="${x+80}" y="${y+50}" text-anchor="middle" font-size="10.5" fill="#57606a" font-family="var(--sans)">${f}</text>`;
    const lab=(x,y,t2,rot)=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="11.5" fill="#57606a" font-family="var(--mono)" stroke="#ffffff" stroke-width="3.5" paint-order="stroke"${rot?` transform="rotate(${rot} ${x} ${y})"`:""}>${t2}</text>`;
    const ar=(x1,y1,x2,y2,t2,lx,ly,rot)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0969da" stroke-width="2" marker-end="url(#st)"/>`+lab(lx,ly,t2,rot);
    s += box(45,50,"UC","Unique Clean","#eef6ff");
    s += box(360,50,"UD","Unique Dirty","#fff3d6");
    s += box(660,50,"SD","Shared Dirty","#fff3d6");
    s += box(45,355,"SC","Shared Clean","#eef6ff");
    s += box(660,355,"I","Invalid","#ffffff");
    s += ar(205,85,360,85, "store hit (local)",282,77);
    s += ar(520,85,660,85, "ReadShared snoop",590,77);
    s += ar(740,120,740,355, "MakeInvalid",792,240);
    s += ar(660,390,205,390, "ReadShared / ReadClean",430,382);
    s += ar(125,355,125,120, "MakeUnique / CleanUnique",172,240);
    s += ar(125,120,740,355, "ReadUnique / ReadOnce",250,155,22);
    s += ar(440,120,740,355, "WriteBack",488,155,40);
    s += ar(740,120,205,355, "WriteClean",630,155,-25);
    s += `<text x="440" y="440" text-anchor="middle" font-size="11" fill="#57606a" font-family="var(--sans)" stroke="#ffffff" stroke-width="3" paint-order="stroke">${"store hit (UC→UD) is a silent cache upgrade — no bus transaction; eviction / snoop-invalidate return a line to I"}</text>`;
    s += `</svg>`;
    return s;
  }
  function c910SVG(){
    const CORE="#e1f5fe", CB="#01579b", PIU="#fff9c4", PB="#b45309", CIU="#f3e5f5", IB="#6a1b9a", L2="#fff3e0", LB="#e65100", BUS="#e8f5e9", BB="#1b5e20";
    let s = `<svg width="940" height="600" viewBox="0 0 940 600" xmlns="http://www.w3.org/2000/svg" role="img">`;
    s += `<defs><marker id="ca" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#57606a"/></marker><marker id="ca2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#57606a"/></marker></defs>`;
    const box=(x,y,w,h,title,lines,fill,border)=>{ let t2=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${border}" stroke-width="1.4"/><text x="${x+w/2}" y="${y+21}" text-anchor="middle" font-size="13" font-weight="700" fill="#1f2933" font-family="var(--sans)">${title}</text>`; const ls=Array.isArray(lines)?lines:(lines?[lines]:[]); ls.forEach((ln,k)=>t2+=`<text x="${x+w/2}" y="${y+41+k*13}" text-anchor="middle" font-size="10" fill="#4b5563" font-family="var(--mono)">${ln}</text>`); return t2; };
    const ar=(x1,y1,x2,y2,label,lx,ly,mk)=>{ const mx=lx||(x1+x2)/2,my=ly||(y1+y2)/2; s+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#57606a" stroke-width="1.5" marker-end="url(#${mk||"ca"})"/>`; if(label) s+=`<text x="${mx}" y="${my-5}" text-anchor="middle" font-size="10" fill="#57606a" font-family="var(--mono)" stroke="#ffffff" stroke-width="3" paint-order="stroke">${label}</text>`; };
    s += `<rect x="20" y="18" width="900" height="328" rx="12" fill="none" stroke="${CB}" stroke-dasharray="6 4" stroke-width="1.4"/><text x="36" y="40" font-size="13" font-weight="700" fill="${CB}" font-family="var(--sans)">${"C910 cluster · multi-core"}</text>`;
    s += box(50,46,250,78, "Core 0",["IFU · I-Cache","LSU · D-Cache","BIU · ACE master"],CORE,CB);
    s += box(340,46,250,78, "Core 1",["IFU · I-Cache","LSU · D-Cache","BIU · ACE master"],CORE,CB);
    s += box(630,46,250,78, "Core N",["IFU · I-Cache","LSU · D-Cache","BIU · ACE master"],CORE,CB);
    s += box(50,140,250,40, "PIU 0", "processor interface unit", PIU,PB);
    s += box(340,140,250,40, "PIU 1", "processor interface unit", PIU,PB);
    s += box(630,140,250,40, "PIU N", "processor interface unit", PIU,PB);
    s += box(340,214,260,86, "CIU",["coherence interface unit","arbitrate / forward snoop"],CIU,IB);
    s += box(630,214,250,86, "L2 cache",["shared 1 MB · inclusive"],L2,LB);
    ar(175,124,175,140, "coherent"); ar(465,124,465,140,""); ar(755,124,755,140,"");
    ar(175,180,360,214, "PIU → CIU"); ar(465,180,465,214,""); ar(755,180,580,214,"");
    ar(600,257,630,257, "CIU → L2");
    s += box(240,390,460,80,"ACE bus",["on-chip interconnect · snoop"],BUS,BB);
    ar(340,346,340,390, "BIU ×N · non-cache / IO",250,376);
    ar(520,346,520,390, "CIU · ACE slave / snoop",628,376);
    s += box(180,510,260,50, "Memory",["DDR / I/O"],BUS,BB);
    s += box(500,510,260,50, "Other ACE",["accelerator / other cluster"],BUS,BB);
    ar(330,470,300,510, "to memory",300,494,"ca2");
    ar(530,470,560,510,"",600,494);
    s += `</svg>`;
    return s;
  }

  /* ------------------ content (single pool, rendered per-lang via t) ------------------ */
  const CONTENT = {};
  CONTENT.overview = () => `<h1>${t("AMBA ACE 协议参考","AMBA ACE Protocol Reference")}</h1>
<h2>${t("ACE 是什么","What ACE is")}</h2>
<div class="card"><p>${t("AMBA <b>ACE</b>(AXI Coherency Extensions)在 AXI4 的 5 条通道(<code>AW/W/B/AR/R</code>)之上新增 <b>3 条监听通道</b> — <code>AC</code>(监听地址)、<code>CR</code>(监听响应)、<code>CD</code>(监听数据),并在地址通道加 <code>AWSNOOP/ARSNOOP</code> 等一致性信号、响应通道加 <code>RACK/WACK</code>,使多个带缓存的 master 能维持缓存一致性。","AMBA <b>ACE</b> (AXI Coherency Extensions) adds <b>three snoop channels</b> — <code>AC</code>, <code>CR</code>, <code>CD</code> — to the five AXI4 channels (<code>AW/W/B/AR/R</code>), plus coherent signals such as <code>AWSNOOP/ARSNOOP</code> and <code>RACK/WACK</code>, letting multiple cache-capable masters maintain coherence.")}</p></div>
<h2>${t("为什么需要一致性","Why coherence is needed")}</h2>
<div class="card"><p>${t("每个核有私有缓存,共享同一内存;某核写入后必须让其他核观察到,否则读到陈旧数据。对任意位置任一时刻仅二者之一:<b>单写者</b>或<b>多读者</b>。","Each core has private caches over one shared memory; a write must be observable to the others. For any location exactly one of <b>single writer</b> or <b>multiple readers</b> holds.")}</p></div>
<h2>${t("缓存行状态","Cache-line states")}</h2>
<div class="diagram">${statesSVG()}</div>
<div class="card"><table><tr><th>${t("状态","State")}</th><th>${t("含义","Meaning")}</th><th>${t("可静默修改","Silently modifiable")}</th></tr>
<tr><td><code>I</code> (Invalid)</td><td>${t("行无效/不存在","Line absent / invalid")}</td><td>—</td></tr>
<tr><td><code>UC</code> (Unique Clean)</td><td>${t("唯一副本,与内存一致","Only copy, matches memory")}</td><td>${t("是","Yes")}</td></tr>
<tr><td><code>UD</code> (Unique Dirty)</td><td>${t("唯一副本,比内存新","Only copy, newer than memory")}</td><td>${t("是","Yes")}</td></tr>
<tr><td><code>SC</code> (Shared Clean)</td><td>${t("多个副本,与内存一致","Multiple copies, matches memory")}</td><td>${t("否","No")}</td></tr>
<tr><td><code>SD</code> (Shared Dirty)</td><td>${t("多个副本,其一持脏","Multiple copies, one holds the dirty data")}</td><td>${t("否","No")}</td></tr></table></div>
<h2>${t("监听 vs 目录","Snoop vs directory")}</h2>
<div class="card"><table><tr><th></th><th>${t("监听(ACE)","Snoop (ACE)")}</th><th>${t("目录(CHI Home)","Directory (CHI Home)")}</th></tr>
<tr><td>${t("谁协调","Who coordinates")}</td><td>${t("互连广播事务","Broadcasts a transaction")}</td><td>${t("集中式 Home 记录目录","Central Home tracks the directory")}</td></tr>
<tr><td>${t("扩展性","Scalability")}</td><td>${t("中/小规模","Small-to-medium")}</td><td>${t("大规模","Large")}</td></tr>
<tr><td>${t("ACE 体现","In ACE")}</td><td>${t("AC 监听, CR/CD 响应","Snoop on AC, reply on CR/CD")}</td><td>${t("CHI SNP 报文","CHI SNP messages")}</td></tr></table>
<p>${t("ACE 属监听协议:收到一致性请求后,互连经 <code>AC</code> 向其他缓存发监听,令其失效或回写,把行回收为 Unique。","ACE is a snoop protocol: the interconnect issues snoops over <code>AC</code>, making caches invalidate or write back.")}</p></div>`;

  CONTENT.protocol = () => `<h1>${t("协议","Protocol")}</h1>
<h2>${t("通道","Channels")}</h2>
<div class="diagram">${channelsSVG()}</div>
<div class="card"><p>${t("<b>AW/W/B</b> 构成写通路,<b>AR/R</b> 读通路,<b>AC/CR/CD</b> 监听通路 — 监听经 AC 进入缓存,缓存经 CR 回结果、CD 回脏数据。","<b>AW/W/B</b> form the write path, <b>AR/R</b> the read path, <b>AC/CR/CD</b> the snoop path — a snoop enters the cache over AC and returns the result over CR and dirty data over CD.")}</p></div>
<h2>${t("VALID / READY 握手","VALID / READY handshake")}</h2>
<div class="card"><p>${t("<code>VALID</code> 与 <code>READY</code> 同时为高的时钟沿发生传输;VALID 保持到握手完成且等待期间不能改数据;READY 可随时变化。一个突发 = 一次地址握手 + <code>AXLEN+1</code> 次数据,末拍 <code>WLAST</code>/<code>RLAST</code>;不同 ID 可乱序、同 ID 保序。","A transfer occurs on the edge where <code>VALID</code> and <code>READY</code> are both high; a burst is one address handshake plus <code>AXLEN+1</code> data beats, the last marked by <code>WLAST</code>/<code>RLAST</code>.")}</p></div>
<h2>${t("信号","Signals")}</h2>
<div class="card"><h3>${t("AXI4 基础通道","AXI4 base channels")}</h3>
<table><tr><th>${t("通道","Channel")}</th><th>${t("关键信号","Key signals")}</th></tr>
<tr><td><code>AW</code></td><td><code>AWVALID/AWREADY/AWID/AWADDR/AWLEN/AWSIZE/AWBURST/AWLOCK/AWCACHE/AWPROT/AWQOS</code></td></tr>
<tr><td><code>W</code></td><td><code>WVALID/WREADY/WDATA/WSTRB/WLAST</code></td></tr>
<tr><td><code>B</code></td><td><code>BVALID/BREADY/BID/BRESP[1:0]</code> (OKAY/EXOKAY/SLVERR/DECERR)</td></tr>
<tr><td><code>AR</code></td><td><code>ARVALID/ARREADY/ARID/ARADDR/ARLEN/ARSIZE/ARBURST/ARLOCK/ARCACHE/ARPROT/ARQOS</code></td></tr>
<tr><td><code>R</code></td><td><code>RVALID/RREADY/RID/RDATA/RRESP/RLAST</code></td></tr></table>
<h3>ACE ${t("一致性信号","coherence signals")}</h3>
<table><tr><th>${t("信号","Signal")}</th><th>${t("通道","Ch")}</th><th>${t("宽","W")}</th><th>${t("含义","Meaning")}</th></tr>
<tr><td><code>AWSNOOP</code></td><td>AW</td><td>3b</td><td>${t("一致性写类型","Coherent write type")}</td></tr>
<tr><td><code>AWUNIQUE</code></td><td>AW</td><td>1b</td><td>${t("WriteLineUnique:已唯一可省监听","WriteLineUnique: already Unique")}</td></tr>
<tr><td><code>AWDOMAIN</code></td><td>AW</td><td>2b</td><td>${t("共享域(0b00/0b01 Inner/0b10 Outer/0b11 System)","Shareability domain")}</td></tr>
<tr><td><code>ARSNOOP</code></td><td>AR</td><td>4b</td><td>${t("一致性读类型","Coherent read type")}</td></tr>
<tr><td><code>ARDOMAIN</code></td><td>AR</td><td>2b</td><td>${t("读共享域","Read domain")}</td></tr>
<tr><td><code>RACK</code></td><td>R</td><td>1b</td><td>${t("读型完成(接收 RLAST 后)","Read-type completion (after RLAST)")}</td></tr>
<tr><td><code>WACK</code></td><td>B</td><td>1b</td><td>${t("写型完成(接收写响应后)","Write-type completion")}</td></tr>
<tr><td><code>RRESP</code></td><td>R</td><td>4b</td><td>${t("RRESP[2]=PassDirty, RRESP[3]=IsShared","RRESP[2]=PassDirty, RRESP[3]=IsShared")}</td></tr></table>
<h3>${t("监听通道","Snoop channels")}</h3>
<table><tr><th>${t("信号","Signal")}</th><th>${t("宽","W")}</th><th>${t("含义","Meaning")}</th></tr>
<tr><td><code>ACVALID/ACREADY</code></td><td>1b</td><td>${t("监听地址握手(互连→缓存)","Snoop address handshake")}</td></tr>
<tr><td><code>ACADDR</code></td><td>addr</td><td>${t("被监听地址","Address being snooped")}</td></tr>
<tr><td><code>ACSNOOP</code></td><td>4b</td><td>${t("监听命令(复用 ARSNOOP 空间)","Snoop command (reuses ARSNOOP space)")}</td></tr>
<tr><td><code>CRRESP</code></td><td>5b</td><td>${t("监听结果:ERROR / PASSDIRTY / ISSHARED / WASUNIQUE","Snoop result fields")}</td></tr>
<tr><td><code>CDDATA/CDLAST</code></td><td>data</td><td>${t("监听中交出的脏行","Dirty line returned during a snoop")}</td></tr></table>
<p>${t("<code>MemoryBarrier</code> / <code>SyncBarrier</code> 是 AR/AW 上的<b>事务类型</b>,无 AWBAR/ARBAR;ACE-Lite C-channel(<code>CACTIVE/CSYSREQ/CSYSACK</code>)是电源门控,不是一致性。","<code>MemoryBarrier</code> / <code>SyncBarrier</code> are <b>transaction types</b> on AR/AW; no AWBAR/ARBAR. The ACE-Lite C-channel is power gating, not coherence.")}</p></div>
<h2>${t("事务","Transactions")}</h2>
<div class="card"><h3>${t("一致性读 (ARSNOOP, 4b)","Coherent reads (ARSNOOP, 4 bits)")}</h3>
<table><tr><th>${t("值","Val")}</th><th>${t("事务","Tx")}</th><th>${t("含义","Meaning")}</th></tr>
<tr><td>0b0000</td><td><code>ReadNoSnoop</code></td><td>${t("非一致读","Non-coherent read")}</td></tr>
<tr><td>0b0001</td><td><code>ReadOnceCleanInvalid</code></td><td>${t("只读一次;清理+失效其他","Read-once; clean+invalidate")}</td></tr>
<tr><td>0b0100</td><td><code>ReadOnce</code></td><td>${t("只读一次,不分配","Read-once, not allocated")}</td></tr>
<tr><td>0b0101</td><td><code>ReadOnceMakeInvalid</code></td><td>${t("只读一次;失效其他,不回写","Read-once; invalidate, no writeback")}</td></tr>
<tr><td>0b1000</td><td><code>ReadClean</code></td><td>${t("行填充;数据须干净","Linefill; data must not be dirty")}</td></tr>
<tr><td>0b1001</td><td><code>ReadShared</code></td><td>${t("行填充,分配为 Shared","Linefill, allocating Shared")}</td></tr>
<tr><td>0b1010</td><td><code>CleanShared</code></td><td>${t("CMO:清理所有副本","CMO: clean all copies")}</td></tr>
<tr><td>0b1011</td><td><code>MakeUnique</code></td><td>${t("失效其他;本端独占","Invalidate others; requester owns")}</td></tr>
<tr><td>0b1100</td><td><code>ReadNotSharedDirty</code></td><td>${t("行填充;不结束为 Shared-Dirty","Linefill; not Shared-Dirty")}</td></tr>
<tr><td>0b1101</td><td><code>ReadUnique</code></td><td>${t("行填充并分配 Unique","Linefill allocating Unique")}</td></tr>
<tr><td>0b1110</td><td><code>CleanInvalid</code></td><td>${t("CMO:清理+失效","CMO: clean + invalidate")}</td></tr>
<tr><td>0b1111</td><td><code>MakeInvalid</code></td><td>${t("CMO:失效所有副本","CMO: invalidate all copies")}</td></tr></table>
<h3>${t("一致性写 (AWSNOOP, 3b)","Coherent writes (AWSNOOP, 3 bits)")}</h3>
<table><tr><th>${t("值","Val")}</th><th>${t("事务","Tx")}</th><th>${t("含义","Meaning")}</th></tr>
<tr><td>0b000</td><td><code>WriteNoSnoop</code></td><td>${t("非一致写","Non-coherent write")}</td></tr>
<tr><td>0b001</td><td><code>WriteUnique</code></td><td>${t("一致写,写穿/不分配","Coherent write, write-through / no-allocate")}</td></tr>
<tr><td>0b010</td><td><code>WriteLineUnique</code></td><td>${t("整行一致写,分配 Unique","Full-line coherent write, allocates Unique")}</td></tr>
<tr><td>0b011</td><td><code>WriteBack</code></td><td>${t("淘汰脏 Shareable 行","Evict a Dirty Shareable line")}</td></tr>
<tr><td>0b100</td><td><code>WriteClean</code></td><td>${t("清理干净 Shareable 行","Clean a Clean Shareable line")}</td></tr></table>
<p>${t("<b>ACSNOOP 复用 ARSNOOP 编码空间</b>。AMBA 5 把 <code>WriteUnique→WriteUniquePtl</code>、<code>WriteLineUnique→WriteUniqueFull</code>,重排读编码并移除屏障;上表为 AMBA 4 ACE。","<b>ACSNOOP reuses the ARSNOOP opcode space</b>. AMBA 5 renames <code>WriteUnique→WriteUniquePtl</code>, <code>WriteLineUnique→WriteUniqueFull</code>; the encodings above are AMBA 4 ACE.")}</p></div>
<h2>${t("时序","Timing")}</h2>
<div class="card"><h3>ReadUnique</h3><div class="diagram">${readUniqueSVG()}</div>
<h3>ReadShared</h3><div class="diagram">${readSharedSVG()}</div>
<h3>WriteBack / WriteClean</h3><div class="diagram">${wbSVG()}</div>
<p>${t("波形规则:数据在 <code>VALID && READY</code> 沿传输;VALID 保持到握手;监听与数据通道并行。","Waveform rules: data transfers on <code>VALID && READY</code>; snoop runs in parallel with the data channels.")}</p></div>
<h2>${t("WriteUnique","WriteUnique")}</h2>
<div class="card"><p>${t("<b>WriteUnique</b> 是<b>独占写</b>:写前互连必须监听使所有其他缓存失效,从而取得独占 — ACE 对应 CHI 的 <code>WriteUniquePtl</code>。以 <code>AWSNOOP=WriteUnique</code> 在 <code>AW</code> 发起;写穿/不分配。","<b>WriteUnique</b> is an <b>exclusive write</b>: the interconnect must snoop every other cache to invalidate it before the write. Issued on <code>AW</code> with <code>AWSNOOP=WriteUnique</code>; write-through/no-allocate.")}</p><div class="diagram">${writeUniqueSVG()}</div>
<ol><li>${t("CPU 0 于 AW 置 <code>AWSNOOP=WriteUnique</code>。","CPU 0 asserts <code>AWSNOOP=WriteUnique</code> on AW.")}</li>
<li>${t("互连向各对端发 <code>ACSNOOP=MakeInvalid</code>。","The interconnect issues <code>ACSNOOP=MakeInvalid</code> to peers.")}</li>
<li>${t("对端经 CR 响应;若脏经 CD 交数据。","The peer replies on CR; if dirty returns the line on CD.")}</li>
<li>${t("CPU 0 发 <code>WDATA/WSTRB/WLAST</code>(与监听并行)。","CPU 0 sends <code>WDATA/WSTRB/WLAST</code> (pipelined).")}</li>
<li>${t("互连合并脏回写并下发 <code>WriteNoSnoop</code>。","ICN merges the dirty writeback and issues <code>WriteNoSnoop</code>.")}</li>
<li>${t("互连回 <code>B + WACK</code> → 完成。","ICN returns <code>B + WACK</code> → complete.")}</li></ol>
<h3>${t("ACE vs CHI","ACE vs CHI")}</h3>
<table><tr><th>${t("概念","Concept")}</th><th>AMBA ACE</th><th>AMBA CHI</th></tr>
<tr><td>${t("传输","Transport")}</td><td>${t("AXI4 通道 + AC/CR/CD","AXI4 channels + AC/CR/CD")}</td><td>${t("报文(REQ/RSP/DAT/SNP)","Packet transport")}</td></tr>
<tr><td>${t("独占写","Exclusive write")}</td><td><code>AWSNOOP=WriteUnique</code></td><td><code>WriteUniquePtl</code></td></tr>
<tr><td>${t("缓冲授予","Buffer grant")}</td><td>—</td><td><code>DBIDResp</code></td></tr>
<tr><td>${t("失效监听","Invalidating snoop")}</td><td><code>ACSNOOP=MakeInvalid</code></td><td><code>SnpCleanInvalid</code></td></tr>
<tr><td>${t("完成","Completion")}</td><td><code>B + WACK</code></td><td><code>Comp</code></td></tr></table>
<div class="diagram">${chiSVG()}</div></div>`;

  CONTENT.c910 = () => `<h1>${t("C910 实现与 RTL 解读","C910 Implementation and RTL Walkthrough")}</h1>
<h2>${t("1. C910MP 集群","1. The C910MP cluster")}</h2>
<div class="card"><p>${t("开源 <code>openc910</code> 仓库是<b>双核集群 (C910MP)</b>:","The open-source <code>openc910</code> repository is a <b>two-core cluster (C910MP)</b>:")}</p>
<div class="diagram">${c910SVG()}</div>
<ul>
<li>${t("<code>openC910.v</code> 例化 2 核 <code>ct_top x0/x1</code>、1 个 <code>ct_ciu_top</code>(CIU)、1 个 <code>ct_l2c_top</code>(共享 L2)。","<code>openC910.v</code> instantiates two cores <code>ct_top x0/x1</code>, one <code>ct_ciu_top</code> (CIU), one <code>ct_l2c_top</code> (shared L2).")}</li>
<li><b>L1</b>: ${t("64KB I + 64KB D, 2 路,64B 行。","64 KB I + 64 KB D, 2-way, 64 B line.")}</li>
<li><b>L2</b>: ${t("1MB, 16 路,双子 bank,64B 行,inclusive。","1 MB, 16-way, two sub-banks, 64 B line, inclusive.")}</li>
<li>${t("<b>对外</b>:普通 AXI4-128 主口 + ACE-Lite 低功耗信号;<b>无对外 ACE 监听口</b>。","<b>External</b>: plain AXI4-128 master + ACE-Lite low-power signals; <b>no external ACE snoop port</b>.")}</li></ul>
<div class="note warn"><b>${t("关键结论(已由 RTL+手册核实)","Key conclusion (verified against RTL + manuals)")}</b>: ${t("openc910 的一致性协议是 <b>MOESI</b>(L1 为 MESI,L2 为 MOESI),ACE 监听信号出现在<b>核 BIU 与 CIU 之间</b>,SoC 顶层只暴露普通 AXI4。","openc910's coherence is <b>MOESI</b> (MESI in L1, MOESI in L2), and the ACE snoop signals appear <b>between the core BIU and the CIU</b>; the SoC top-level exposes only plain AXI4.")}</div></div>
<h2>${t("2. 一致性通路:核 ↔ CIU ↔ L2","2. The coherence path")}</h2>
<div class="card"><table><tr><th>${t("层次","Level")}</th><th>${t("模块","Module")}</th><th>${t("角色","Role")}</th></tr>
<tr><td>L1</td><td><code>ct_lsu_top / ct_lsu_dcache_top</code></td><td>${t("D 缓存 MOESI 状态;监听队列","D-cache MOESI state; snoop queues")}</td></tr>
<tr><td>${t("核 BIU","Core BIU")}</td><td><code>biu/rtl/ct_biu_top.v + ct_biu_snoop_channel.v</code></td><td>${t("ACE 风格事务(arsnoop/awsnoop/awunique/domain)","ACE-style transactions")}</td></tr>
<tr><td>CIU</td><td><code>ciu/rtl/ct_ciu_top.v + ct_ciu_snb*.v</code></td><td>${t("监听缓冲;AC 监听;CR/CD 收集","Snoop buffers; AC snoops; CR/CD collection")}</td></tr>
<tr><td>L2</td><td><code>l2c/rtl/ct_l2c_top.v + ct_l2c_icc.v</code></td><td>${t("MOESI 状态,回写,inclusive","MOESI state, writeback, inclusive")}</td></tr>
<tr><td>${t("对外","External")}</td><td><code>ciu/rtl/ct_ebiu_*.v</code></td><td>${t("转成普通 AXI4-128","Converts to plain AXI4-128")}</td></tr></table>
<p>${t("<b>一致性被封装在 CIU 内</b> — 其上是 ACE 监听,其下转成非一致 AXI4。","<b>Coherence is enclosed within the CIU</b> — above it ACE-style snooping, below it non-coherent AXI4.")}</p></div>
<h2>${t("3. 关键 RTL 文件(按层次)","3. Key RTL files, by layer")}</h2>
<div class="card"><p>${t("仓库根 <code>C910_RTL_FACTORY/gen_rtl/</code>:","Repository root <code>C910_RTL_FACTORY/gen_rtl/</code>:")}</p>
<h3>3.1 ${t("内核 (IFU / LSU / BIU)","Core (IFU / LSU / BIU)")}</h3>
<ul><li><b>IFU (+I-Cache)</b>: <code>ifu/rtl/ct_ifu_top.v</code>, <code>ct_ifu_cache_top.v</code>.</li>
<li><b>LSU (+D-Cache)</b>: <code>lsu/rtl/ct_lsu_top.v</code>, <code>ct_lsu_dcache_top.v</code>; <b>${t("L1 监听侧","L1 snoop side")}</b>: <code>ct_lsu_snoop_snq.v(+entry)</code>, <code>ct_lsu_snoop_ctcq.v(+entry)</code>, <code>ct_lsu_snoop_req_arbiter.v</code>, <code>ct_lsu_snoop_resp.v</code>, <code>ct_lsu_icc.v</code>, <code>ct_lsu_wmb.v</code>.</li>
<li><b>${t("BIU (ACE 主接口)","BIU (ACE master)")}</b>: <code>biu/rtl/ct_biu_top.v</code> (<code>_arsnoop[3:0]/_awsnoop[2:0]/_awunique/_ardomain[1:0]/_awdomain[1:0]</code>), <code>ct_biu_snoop_channel.v</code>, <code>ct_biu_read_channel.v</code>, <code>ct_biu_write_channel.v</code>, <code>ct_biu_req_arbiter.v</code>.</li></ul>
<h3>3.2 ${t("每核一致性接口(PIU 层)","Per-core coherence interface (PIU layer)")}</h3>
<ul><li>${t("openc910 中由核 <b>BIU</b> 加 LSU 监听/总线仲裁承担:<code>ct_biu_req_arbiter.v</code>, <code>ct_lsu_bus_arb.v</code>, <code>ct_lsu_snoop_req_arbiter.v</code>。","In openC910 fulfilled by the core <b>BIU</b> plus LSU snoop/bus arbiter: <code>ct_biu_req_arbiter.v</code>, <code>ct_lsu_bus_arb.v</code>, <code>ct_lsu_snoop_req_arbiter.v</code>.")}</li></ul>
<h3>3.3 CIU</h3><ul><li><code>ciu/rtl/ct_ciu_top.v</code>, <code>ct_ciu_snb.v/ct_ciu_snb_arb.v/ct_ciu_snb_sab.v</code>, <code>ct_ciu_l2cif.v</code>, <code>ct_ciu_ncq.v/ct_ciu_vb.v</code>.</li></ul>
<h3>3.4 L2</h3><ul><li><code>l2c/rtl/ct_l2c_top.v</code>, <code>ct_l2c_sub_bank.v</code>, <code>ct_l2c_icc.v</code>, <code>ct_l2c_tag.v/ct_l2c_data.v/ct_l2c_wb.v/ct_l2c_prefetch.v</code>.</li></ul>
<h3>3.5 ${t("ACE 总线 / 对外","ACE bus / external")}</h3><ul><li><code>ciu/rtl/ct_ebiu_top.v</code> + <code>ct_ebiu_read_channel.v</code>, <code>ct_ebiu_write_channel.v</code>, <code>ct_ebiu_snoop_channel_dummy.v</code>(${t("dummy 监听 — 对外无监听","dummy snoop — no external snoop")}).</li></ul></div>
<h2>${t("4. C910 内的一个 WriteUnique","4. A WriteUnique inside the C910")}</h2>
<div class="card"><ol>
<li>${t("核 0 于 AW 置 <code>AWSNOOP=WriteUnique</code>。","Core 0 asserts <code>AWSNOOP=WriteUnique</code> on AW.")}</li>
<li>${t("CIU 于 AC 监听核 1(<code>ACSNOOP=MakeInvalid</code>)。","The CIU snoops core 1 on AC (<code>ACSNOOP=MakeInvalid</code>).")}</li>
<li>${t("核 1 经 CR 响应,或经 CD 交脏数据。","Core 1 replies on CR or returns dirty data on CD.")}</li>
<li>${t("CIU 把行标为核 0 Unique,经 <code>ct_ebiu_*</code> 把合并结果写回内存。","The CIU marks the line Unique for core 0; the merged result is written to memory via <code>ct_ebiu_*</code>.")}</li></ol></div>
<div class="note"><b>${t("范围","Scope")}</b>: ${t("开源 openC910 固定为两核 + 对外 AXI4;多簇(如 4 核 TH1520)跨簇一致性不在此开源 RTL。","the open-source openC910 is fixed at two cores + external AXI4; cross-cluster coherence (e.g. four-core TH1520) is not in this open RTL.")}</div>
<p>${t("参考:","Reference:")} <a href="https://github.com/T-head-Semi/openc910">github.com/T-head-Semi/openc910</a>, TH1520 (arXiv:2311.12808).</p>`;

  CONTENT.formal = () => `<h1>${t("ACE 的形式验证","Formal Verification of ACE")}</h1>
<h2>${t("1. ACE 规范的形式分析 (FMICS 2013)","1. Formal Analysis of the ACE Specification (FMICS 2013)")}</h2>
<div class="card"><p><b>Kriouile &amp; Serwe</b> (INRIA / Verimag), FMICS 2013, LNCS 8137, DOI <code>10.1007/978-3-642-41010-9_8</code>. <a href="https://inria.hal.science/hal-00858521v1">hal</a></p>
<p>${t("验证 ACE <b>规范</b>:死锁/活锁、全局排序、监听(AC/CR)路径。翻译成 <b>LNT</b>,用 <b>CADP</b>(Evaluator/MCL)模型检查,建模为并发 agent。","Verifies the ACE <b>specification</b>: deadlock/livelock, global ordering, and the snoop path. Translated into <b>LNT</b> and model-checked with <b>CADP</b>.")}</p>
<p><b>${t("关键洞察","Key insight")}</b>: ${t("把 ACE 拆成命名通道 + 单一一致性点,建参数化参考模型。<b>结果</b>:ACE 朴素读法并非自动无死锁。","decompose ACE into named channels plus a single coherency point; build a parameterized reference model. <b>Result</b>: a naive reading of ACE is not automatically deadlock-free.")}</p></div>
<h2>${t("2. 用形式模型查真实 SoC (TACAS 2015)","2. Using the Formal Model on a Real SoC (TACAS 2015)")}</h2>
<div class="card"><p><b>Kriouile &amp; Serwe</b>, TACAS 2015, LNCS 9035, DOI <code>10.1007/978-3-662-46681-0_62</code>. <a href="https://rd.springer.com/chapter/10.1007/978-3-662-46681-0_62">springer</a></p>
<p>${t("把 FMICS'13 模型当<b>参考 oracle</b>,用<b>组合式验证</b>核对真实缓存一致 SoC 的数据完整性/一致性、无死锁、顺序。","Uses the FMICS'13 model as a <b>reference oracle</b> to verify data integrity/coherence, deadlock-freedom, and ordering of a real cache-coherent SoC via <b>compositional verification</b>.")}</p></div>
<h2>${t("3. ADVOCAT:自动化跨层死锁验证 (DATE 2016)","3. ADVOCAT (DATE 2016)")}</h2>
<div class="card"><p><b>Verbeek, Yaghini, Eghbal, Bagherzadeh</b>, DATE 2016, DOI <code>10.5555/2971808.2972190</code>; <b>IEEE Trans. Computers</b> DOI <code>10.1109/TC.2016.2584060</code>. <a href="https://dl.acm.org/doi/10.5555/2971808.2972190">acm</a></p>
<p>${t("<b>跨层</b>检验<b>死锁</b>(一致性协议 + NoC 缓冲),用 <b>SAT/SMT</b> 找等待依赖环。洞察:协议在理想互连上无死锁,在有缓冲 NoC 上可能死锁。","Checks <b>deadlock</b> cross-layer (coherence protocol + NoC buffering) with <b>SAT/SMT</b>. A protocol can be deadlock-free on an ideal interconnect yet deadlock on a buffered NoC.")}</p></div>
<h2>${t("相关方向与方法论","Related work and methodology")}</h2>
<div class="card"><table><tr><th>${t("方向","Direction")}</th><th>${t("工作","Work")}</th></tr>
<tr><td>${t("早期 AMBA 形式化","Early AMBA formalization")}</td><td>Roychoudhury &amp; Mitra, DATE 2003</td></tr>
<tr><td>${t("AMBA in HOL","AMBA in HOL")}</td><td>Cambridge <a href="https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-602.html">UCAM-CL-TR-602</a></td></tr>
<tr><td>${t("现代后继","Modern successor")}</td><td><a href="https://arxiv.org/abs/2410.15908">Formalising CXL Cache Coherence</a> (ASPLOS 2025)</td></tr>
<tr><td>RISC-V</td><td>${t("TileLink Murphi 模型检查 (ICCD 2023)","TileLink Murphi model checking (ICCD 2023)")}</td></tr>
<tr><td>${t("工业 VIP","Industrial VIP")}</td><td>${t("Cadence / Oski / SmartDV ARM ACE 形式 VIP(非同行评审)","Cadence / Oski / SmartDV ARM ACE formal VIP (not peer-reviewed)")}</td></tr></table>
<ul>
<li><b>${t("先形式化规范","Formalize the spec first")}</b>: ${t("命名通道 + 单一一致性点,参数化参考模型。","named channels + single coherency point, parameterized reference model.")}</li>
<li><b>${t("再查实现","Then check the implementation")}</b>: ${t("组合式验证 + 参考模型作 oracle。","compositional verification with the reference model as oracle.")}</li>
<li><b>${t("死锁单独查","Treat deadlock separately")}</b>: ${t("依赖环 + SAT/SMT,连同 NoC 缓冲建模。","dependency-cycle + SAT/SMT, modelling the NoC buffering.")}</li>
<li><b>${t("snoop filter 正确性","Snoop-filter correctness")}</b>: ${t("无独立强论文,折入一致性点/AC 排序模型或工业断言 VIP。","has no strong standalone paper — folded into the coherency-point model or delegated to assertion VIPs.")}</li></ul></div>`;

  const NAV = { overview:["概述","Overview"], protocol:["协议","Protocol"], c910:["C910 实现","C910 RTL"], formal:["形式验证","Formal Verification"] };
  function renderStatic(){
    const z = LAN==='zh';
    document.getElementById('brandSub').textContent = z ? "一致性 · C910 RTL" : "Coherency · C910 RTL";
    document.getElementById('langBtn').textContent = z ? "EN" : "中文";
    document.getElementById('backLink').textContent = z ? "← RISC-V 指令文档" : "← RISC-V Reference";
    const hk=document.getElementById('homeLink'); if(hk) hk.textContent = z ? "← 个人主页" : "← Homepage";
    document.querySelectorAll('#nav a').forEach(a => { a.textContent = (NAV[a.dataset.nav]||['',''])[z?0:1]; });
  }
  function route(){
    let h = location.hash.replace(/^#\/?/, "") || "overview";
    if(!NAV[h]) h = "overview";
    document.getElementById("app").innerHTML = (CONTENT[h] || CONTENT.overview)();
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.getAttribute("data-nav") === h));
    renderStatic();
    window.scrollTo(0,0);
  }
  function setLang(l){ LAN = l; try{ localStorage.setItem('aceLAN', l); }catch(e){} route(); }
  const lb = document.getElementById('langBtn');
  if(lb) lb.addEventListener('click', ()=> setLang(LAN==='en'?'zh':'en'));
  window.addEventListener("hashchange", route);
  route();
})();

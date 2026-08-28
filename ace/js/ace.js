/* AMBA ACE protocol reference — content + hash router (self-contained, no build step). */
(function(){
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  function seqSVG(participants, messages, opts){
    opts = opts || {};
    const top = 44, LH = opts.h || 560, gap = LH/(messages.length+1);
    const X = participants.map((p,i)=> 80 + i*((opts.w||760)-160)/(participants.length-1 || 1));
    let s = `<svg width="${opts.w||760}" height="${LH+30}" viewBox="0 0 ${opts.w||760} ${LH+30}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="sequence diagram">`;
    if(opts.title) s += `<text x="${(opts.w||760)/2}" y="16" text-anchor="middle" font-size="13" font-weight="600" fill="#24292f" font-family="sans-serif">${esc(opts.title)}</text>`;
    participants.forEach((p,i)=>{
      s += `<rect x="${X[i]-54}" y="22" width="108" height="24" rx="4" fill="#f6f8fa" stroke="#d0d7de"/>`;
      s += `<text x="${X[i]}" y="38" text-anchor="middle" font-size="11" fill="#24292f" font-family="sans-serif">${esc(p)}</text>`;
      s += `<line x1="${X[i]}" y1="46" x2="${X[i]}" y2="${LH-6}" stroke="#d0d7de" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    });
    messages.forEach((m,i)=>{
      const y = top + (i+1)*gap;
      const from = X[m[0]], to = X[m[1]];
      const dir = from < to ? 1 : -1;
      const x0 = from + dir*12, x1 = to - dir*12;
      s += `<line x1="${x0}" y1="${y}" x2="${x1}" y2="${y}" stroke="#0969da" stroke-width="1.6"/>`;
      s += `<polygon points="${x1},${y} ${x1-dir*8},${y-4} ${x1-dir*8},${y+4}" fill="#0969da"/>`;
      const mid = (from+to)/2;
      s += `<text x="${mid}" y="${y-6}" text-anchor="middle" font-size="10.5" fill="#24292f" font-family="monospace">${esc(m[2])}</text>`;
      if(m[3]) s += `<text x="${mid}" y="${y+13}" text-anchor="middle" font-size="9.5" fill="#57606a" font-family="monospace">${esc(m[3])}</text>`;
    });
    s += `</svg>`;
    return s;
  }

  function writeUniqueSVG(){
    return seqSVG(
      ["RN (Requester)", "ICN (Interconnect)", "Peer cache", "Memory"],
      [
        [0,1,"AW: WriteUnique","AWSNOOP=WriteUnique, AWADDR, AWCACHE"],
        [1,2,"Snoop: MakeInvalid","ACVALID/ACADDR, ACSNOOP=MakeInvalid"],
        [2,1,"Snoop resp","CRVALID/CRRESP (CD if dirty)"],
        [0,1,"W: write data","WVALID/WDATA/WSTRB/WLAST"],
        [1,3,"WriteNoSnoop","AW + W to memory (downstream)"],
        [3,1,"B: BRESP","BVALID/BRESP=OKAY"],
        [1,0,"B + WACK","BVALID/BRESP=OKAY, WACK=1 → complete"]
      ],
      { title:"AMBA ACE — WriteUnique transaction", h:560, w:820 }
    );
  }

  function c910SVG(){
    let s = `<svg width="760" height="360" viewBox="0 0 760 360" xmlns="http://www.w3.org/2000/svg" role="img">`;
    const box = (x,y,w,h,title,sub,fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill||'#f6f8fa'}" stroke="#d0d7de"/><text x="${x+w/2}" y="${y+20}" text-anchor="middle" font-size="12.5" font-weight="600" fill="#24292f" font-family="sans-serif">${esc(title)}</text><text x="${x+w/2}" y="${y+38}" text-anchor="middle" font-size="10" fill="#57606a" font-family="monospace">${esc(sub)}</text>`;
    const arrow = (x1,y1,x2,y2,label) => {
      const mx=(x1+x2)/2, my=(y1+y2)/2;
      let a = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#0969da" stroke-width="1.6"/>`;
      if(x2!==x1||y2!==y1) a += `<polygon points="${x2},${y2} ${x2-(x2-x1?Math.sign(x2-x1)*8:0)},${y2-4} ${x2-(x2-x1?Math.sign(x2-x1)*8:0)},${y2+4}" fill="#0969da"/>`;
      if(label) a += `<text x="${mx}" y="${my-6}" text-anchor="middle" font-size="9.5" fill="#0969da" font-family="sans-serif">${esc(label)}</text>`;
      return a;
    };
    s += box(60,20,240,52,"Core 0 · ct_top x0","ct_core → ct_biu_top (ACE-style)");
    s += box(460,20,240,52,"Core 1 · ct_top x1","ct_core → ct_biu_top (ACE-style)");
    s += box(180,140,400,64,"CIU · ct_ciu_top","Coherence Interconnect Unit (snoop buffer)");
    s += box(180,250,400,60,"Shared L2 · ct_l2c_top","1MB 16-way 2 sub-banks (inclusive)");
    s += box(500,330,220,24,"External AXI4-128 master","ct_ebiu_* (no snoop)");
    s += arrow(180,72,300,140,"ARSNOOP/AWSNOOP · AC/CR/CD");
    s += arrow(580,72,500,140,"ARSNOOP/AWSNOOP · AC/CR/CD");
    s += arrow(380,204,380,250,"");
    s += arrow(380,310,610,342,"WriteNoSnoop → AXI4");
    s += `<text x="60" y="110" font-size="9.5" fill="#57606a" font-family="monospace">internal ACE-style / MOESI</text>`;
    s += `</svg>`;
    return s;
  }

  const S = {};

  S.overview = () => `<h1>AMBA ACE Protocol Reference</h1>

  <h2>What ACE is</h2>
  <div class="card">
    <p>AMBA <b>ACE</b> (AXI Coherency Extensions) adds <b>three snoop channels</b> — <code>AC</code> (snoop address), <code>CR</code> (snoop response), <code>CD</code> (snoop data) — to the five AXI4 channels (<code>AW/W/B/AR/R</code>), adds coherent signals such as <code>AWSNOOP/ARSNOOP</code> on the address channels and <code>RACK/WACK</code> on the response channels, and thereby lets multiple cache-capable masters maintain cache coherence over shared memory.</p>
  </div>

  <h2>Why coherence is needed</h2>
  <div class="card">
    <p>Each core has private caches over one shared memory. The same address may be cached by several cores; a write by one core must become observable to the others, or they read stale data.</p>
    <p>For any memory location exactly one of the following holds at any moment: <b>single writer</b> (one writable copy, no other read copies) or <b>multiple readers</b> (several read-only copies, none may write). Every coherence protocol maintains this invariant — a write must first reclaim other copies, a read must first confirm the copy is current.</p>
  </div>

  <h2>Cache-line states</h2>
  <div class="card">
    <table>
      <tr><th>State</th><th>Meaning</th><th>Silently modifiable</th></tr>
      <tr><td><code>I</code> (Invalid)</td><td>Line absent / invalid</td><td>—</td></tr>
      <tr><td><code>UC</code> (Unique Clean)</td><td>Only copy, matches memory</td><td>Yes</td></tr>
      <tr><td><code>UD</code> (Unique Dirty)</td><td>Only copy, newer than memory</td><td>Yes</td></tr>
      <tr><td><code>SC</code> (Shared Clean)</td><td>Multiple copies, matches memory</td><td>No</td></tr>
      <tr><td><code>SD</code> (Shared Dirty)</td><td>Multiple copies, one holds the dirty data</td><td>No</td></tr>
    </table>
    <p><b>Unique</b> means only one cache holds it; <b>Shared</b> means others hold it too; <b>Dirty</b> means newer than memory.</p>
  </div>

  <h2>Snoop vs directory</h2>
  <div class="card">
    <table>
      <tr><th></th><th>Snoop (used by ACE)</th><th>Directory (used by CHI Home)</th></tr>
      <tr><td>Who coordinates</td><td>The interconnect broadcasts a transaction to all cache masters</td><td>A central Home node tracks the sharer directory</td></tr>
      <tr><td>Scalability</td><td>Small-to-medium systems</td><td>Large systems</td></tr>
      <tr><td>In ACE</td><td>Snoop on <code>AC</code>, reply on <code>CR/CD</code></td><td>CHI SNP messages</td></tr>
    </table>
    <p>ACE is a snoop protocol: on a coherent request the interconnect issues snoops over <code>AC</code>, making other caches invalidate or write back, so the line can be reclaimed as Unique.</p>
  </div>`;

  S.protocol = () => `<h1>Protocol</h1>

  <h2>Channels</h2>
  <div class="card">
    <table>
      <tr><th>Channel</th><th>Direction</th><th>Purpose</th></tr>
      <tr><td><code>AW</code> write address</td><td>master → interconnect</td><td>Write address/attributes (ACE adds <code>AWSNOOP/AWDOMAIN/AWUNIQUE</code>)</td></tr>
      <tr><td><code>W</code> write data</td><td>master → interconnect</td><td>Write data + <code>WSTRB</code> + <code>WLAST</code></td></tr>
      <tr><td><code>B</code> write response</td><td>interconnect → master</td><td>Write completion (ACE adds <code>WACK</code>)</td></tr>
      <tr><td><code>AR</code> read address</td><td>master → interconnect</td><td>Read address/attributes (ACE adds <code>ARSNOOP/ARDOMAIN</code>)</td></tr>
      <tr><td><code>R</code> read data</td><td>interconnect → master</td><td>Read data + response (ACE adds <code>RACK</code>)</td></tr>
      <tr><td><code>AC</code> snoop address</td><td>interconnect → cache</td><td>Snoop request (<code>ACADDR/ACSNOOP/ACPROT</code>)</td></tr>
      <tr><td><code>CR</code> snoop response</td><td>cache → interconnect</td><td>Snoop result (<code>CRRESP</code>)</td></tr>
      <tr><td><code>CD</code> snoop data</td><td>cache → interconnect</td><td>Dirty line returned during a snoop</td></tr>
    </table>
    <p><b>AW/W/B</b> form the write path, <b>AR/R</b> the read path, <b>AC/CR/CD</b> the snoop path.</p>
  </div>

  <h2>VALID / READY handshake</h2>
  <div class="card">
    <p>A transfer occurs on the clock edge where <code>VALID</code> and <code>READY</code> are both high; either side may wait independently. <code>VALID</code> must stay asserted until the handshake completes and the payload must not change while waiting; <code>READY</code> may change at any time. A burst is one address handshake plus <code>AXLEN+1</code> data beats, the last marked by <code>WLAST</code>/<code>RLAST</code>. Several transactions are distinguished by <code>AWID/ARID</code>; the interconnect may reorder responses across IDs but not within an ID.</p>
  </div>

  <h2>Signals</h2>
  <div class="card">
    <h3>AXI4 base channels</h3>
    <table>
      <tr><th>Channel</th><th>Key signals</th></tr>
      <tr><td><code>AW</code></td><td><code>AWVALID/AWREADY/AWID/AWADDR/AWLEN/AWSIZE/AWBURST/AWLOCK/AWCACHE/AWPROT/AWQOS</code></td></tr>
      <tr><td><code>W</code></td><td><code>WVALID/WREADY/WDATA/WSTRB/WLAST</code></td></tr>
      <tr><td><code>B</code></td><td><code>BVALID/BREADY/BID/BRESP[1:0]</code> (OKAY/EXOKAY/SLVERR/DECERR)</td></tr>
      <tr><td><code>AR</code></td><td><code>ARVALID/ARREADY/ARID/ARADDR/ARLEN/ARSIZE/ARBURST/ARLOCK/ARCACHE/ARPROT/ARQOS</code></td></tr>
      <tr><td><code>R</code></td><td><code>RVALID/RREADY/RID/RDATA/RRESP/RLAST</code></td></tr>
    </table>
    <h3>ACE coherence signals</h3>
    <table>
      <tr><th>Signal</th><th>Channel</th><th>Width</th><th>Meaning</th></tr>
      <tr><td><code>AWSNOOP</code></td><td>AW</td><td>3b</td><td>Coherent write type</td></tr>
      <tr><td><code>AWUNIQUE</code></td><td>AW</td><td>1b</td><td>WriteLineUnique: already Unique, snoop may be skipped</td></tr>
      <tr><td><code>AWDOMAIN</code></td><td>AW</td><td>2b</td><td>Shareability domain (0b00/0b01 Inner/0b10 Outer/0b11 System)</td></tr>
      <tr><td><code>ARSNOOP</code></td><td>AR</td><td>4b</td><td>Coherent read type</td></tr>
      <tr><td><code>ARDOMAIN</code></td><td>AR</td><td>2b</td><td>Read shareability domain</td></tr>
      <tr><td><code>RACK</code></td><td>R</td><td>1b</td><td>Read-type completion (after RLAST accepted)</td></tr>
      <tr><td><code>WACK</code></td><td>B</td><td>1b</td><td>Write-type completion (after write response accepted)</td></tr>
      <tr><td><code>RRESP</code></td><td>R</td><td>4b</td><td><code>RRESP[2]=PassDirty</code>, <code>RRESP[3]=IsShared</code></td></tr>
    </table>
    <h3>Snoop channels</h3>
    <table>
      <tr><th>Signal</th><th>Width</th><th>Meaning</th></tr>
      <tr><td><code>ACVALID/ACREADY</code></td><td>1b</td><td>Snoop address handshake (interconnect → cache)</td></tr>
      <tr><td><code>ACADDR</code></td><td>addr</td><td>Address being snooped</td></tr>
      <tr><td><code>ACSNOOP</code></td><td>4b</td><td>Snoop command (reuses ARSNOOP opcode space)</td></tr>
      <tr><td><code>CRRESP</code></td><td>5b</td><td>Snoop result: <code>ERROR / PASSDIRTY / ISSHARED / WASUNIQUE</code></td></tr>
      <tr><td><code>CDDATA/CDLAST</code></td><td>data</td><td>Dirty line returned during a snoop</td></tr>
    </table>
    <p><code>MemoryBarrier</code> / <code>SyncBarrier</code> are <b>transaction types</b> on AR/AW — there is no AWBAR/ARBAR signal. The ACE-Lite C-channel (<code>CACTIVE/CSYSREQ/CSYSACK</code>) is a power-gating handshake, not coherence.</p>
  </div>

  <h2>Transactions</h2>
  <div class="card">
    <h3>Coherent reads (ARSNOOP, 4 bits)</h3>
    <table>
      <tr><th>Value</th><th>Transaction</th><th>Meaning</th></tr>
      <tr><td>0b0000</td><td><code>ReadNoSnoop</code></td><td>Non-coherent read</td></tr>
      <tr><td>0b0001</td><td><code>ReadOnceCleanInvalid</code></td><td>Read-once; clean+invalidate others</td></tr>
      <tr><td>0b0100</td><td><code>ReadOnce</code></td><td>Read-once, not allocated</td></tr>
      <tr><td>0b0101</td><td><code>ReadOnceMakeInvalid</code></td><td>Read-once; invalidate others, no writeback</td></tr>
      <tr><td>0b1000</td><td><code>ReadClean</code></td><td>Linefill; data must not be dirty</td></tr>
      <tr><td>0b1001</td><td><code>ReadShared</code></td><td>Linefill, allocating Shared</td></tr>
      <tr><td>0b1010</td><td><code>CleanShared</code></td><td>CMO: clean all copies</td></tr>
      <tr><td>0b1011</td><td><code>MakeUnique</code></td><td>Invalidate others; requester owns the line</td></tr>
      <tr><td>0b1100</td><td><code>ReadNotSharedDirty</code></td><td>Linefill; not Shared-Dirty</td></tr>
      <tr><td>0b1101</td><td><code>ReadUnique</code></td><td>Linefill allocating Unique</td></tr>
      <tr><td>0b1110</td><td><code>CleanInvalid</code></td><td>CMO: clean + invalidate</td></tr>
      <tr><td>0b1111</td><td><code>MakeInvalid</code></td><td>CMO: invalidate all copies</td></tr>
    </table>
    <h3>Coherent writes (AWSNOOP, 3 bits)</h3>
    <table>
      <tr><th>Value</th><th>Transaction</th><th>Meaning</th></tr>
      <tr><td>0b000</td><td><code>WriteNoSnoop</code></td><td>Non-coherent write</td></tr>
      <tr><td>0b001</td><td><code>WriteUnique</code></td><td>Coherent write, write-through / no-allocate</td></tr>
      <tr><td>0b010</td><td><code>WriteLineUnique</code></td><td>Full-line coherent write, allocates Unique</td></tr>
      <tr><td>0b011</td><td><code>WriteBack</code></td><td>Evict a Dirty Shareable line</td></tr>
      <tr><td>0b100</td><td><code>WriteClean</code></td><td>Clean a Clean Shareable line</td></tr>
    </table>
    <p><b>ACSNOOP reuses the ARSNOOP opcode space</b> (read/clean/invalidate commands toward the snooped cache). AMBA 5 renames <code>WriteUnique→WriteUniquePtl</code>, <code>WriteLineUnique→WriteUniqueFull</code>, re-encodes the reads, and removes the barriers; the encodings above are AMBA 4 ACE.</p>
  </div>

  <h2>Timing</h2>
  <div class="card">
    <h3>ReadUnique</h3>
    <div class="diagram">${seqSVG(
      ["RN","ICN","Peer","MEM"],
      [
        [0,1,"AR: ReadUnique","ARSNOOP=ReadUnique"],
        [1,2,"Snoop: MakeInvalid","ACSNOOP=MakeInvalid"],
        [2,1,"Snoop resp","CRRESP (CD if dirty)"],
        [1,0,"R: data + RACK","RACK=1 → RN owns Unique"]
      ],
      { title:"ReadUnique", h:300, w:820 }
    )}</div>
    <h3>ReadShared</h3>
    <div class="diagram">${seqSVG(
      ["RN","ICN","Peer","MEM"],
      [
        [0,1,"AR: ReadShared","ARSNOOP=ReadShared"],
        [1,2,"Snoop: ReadClean","ACSNOOP=ReadClean"],
        [2,1,"Snoop resp","CRRESP (CD if dirty)"],
        [1,0,"R: data","RACK → RN keeps Shared"]
      ],
      { title:"ReadShared", h:300, w:820 }
    )}</div>
    <h3>WriteBack / WriteClean</h3>
    <div class="diagram">${seqSVG(
      ["RN (cache)","ICN","MEM",""],
      [
        [0,1,"AW: WriteBack/WriteClean","AWSNOOP"],
        [0,1,"W: data","WLAST"],
        [1,2,"WriteNoSnoop","write to memory"],
        [2,1,"B: BRESP","OKAY"],
        [1,0,"B + WACK","complete"]
      ],
      { title:"WriteBack / WriteClean", h:360, w:760 }
    )}</div>
    <p>Waveform rules: data transfers on the edge where <code>VALID && READY</code>; <code>VALID</code> stays until the handshake completes; <code>RDATA/WDATA/WSTRB</code> accompany their <code>VALID</code>; snoop traffic runs in parallel with the data channels.</p>
  </div>

  <h2>WriteUnique</h2>
  <div class="card">
    <p><b>WriteUnique</b> is an <b>exclusive write</b>: the interconnect must snoop every other cache to invalidate its copy before the write, so the requester obtains exclusivity — the ACE analogue of CHI's <code>WriteUniquePtl</code>. Issued on <code>AW</code> with <code>AWSNOOP=WriteUnique</code>; write-through/no-allocate.</p>
    <div class="diagram">${writeUniqueSVG()}</div>
    <ol>
      <li>RN asserts <code>AWVALID</code> with <code>AWSNOOP=WriteUnique</code>.</li>
      <li>ICN issues <code>ACSNOOP=MakeInvalid</code> to the peer caches.</li>
      <li>The peer replies on <code>CR</code>; if dirty, returns the line on <code>CD</code>.</li>
      <li>RN sends <code>WDATA/WSTRB/WLAST</code> (pipelined with the snoop).</li>
      <li>ICN merges the dirty writeback and issues <code>WriteNoSnoop</code> downstream.</li>
      <li>ICN returns <code>B + WACK</code> → transaction completes.</li>
    </ol>
    <h3>ACE vs CHI</h3>
    <table>
      <tr><th>Concept</th><th>AMBA ACE</th><th>AMBA CHI</th></tr>
      <tr><td>Transport</td><td>AXI4 channels + AC/CR/CD</td><td>Packet transport (REQ/RSP/DAT/SNP)</td></tr>
      <tr><td>Exclusive write</td><td><code>AWSNOOP=WriteUnique</code></td><td><code>WriteUniquePtl</code></td></tr>
      <tr><td>Buffer grant</td><td>—</td><td><code>DBIDResp</code></td></tr>
      <tr><td>Invalidating snoop</td><td><code>ACSNOOP=MakeInvalid</code></td><td><code>SnpCleanInvalid</code></td></tr>
      <tr><td>Completion</td><td><code>B + WACK</code></td><td><code>Comp</code></td></tr>
    </table>
    <div class="diagram">${seqSVG(
      ["RN","HN (Home)","SN","Peer RN"],
      [
        [0,1,"WriteUniquePtl","address + control"],
        [1,0,"DBIDResp","buffer ID granted"],
        [1,3,"SnpCleanInvalid","invalidate others"],
        [3,1,"SnpResp","SnpRespData_I_PD"],
        [0,1,"NCBWrData","write data"],
        [1,2,"WriteNoSnp","merged data"],
        [2,1,"CompDBIDResp","complete"],
        [1,0,"Comp","global completion"]
      ],
      { title:"AMBA CHI — WriteUniquePtl", h:520, w:820 }
    )}</div>
  </div>`;

  S.c910 = () => `<h1>C910 Implementation and RTL Walkthrough</h1>

  <h2>1. The C910MP cluster</h2>
  <div class="card">
    <p>The open-source <code>openc910</code> repository is a <b>two-core cluster (C910MP)</b>:</p>
    <div class="diagram">${c910SVG()}</div>
    <ul>
      <li><code>openC910.v</code> instantiates two cores <code>ct_top x0/x1</code>, one <code>ct_ciu_top</code> (CIU, Coherence Interconnect Unit), one <code>ct_l2c_top</code> (shared L2).</li>
      <li><b>L1</b>: 64 KB I + 64 KB D, 2-way, 64 B line.</li>
      <li><b>L2</b>: 1 MB, 16-way, two sub-banks, 64 B line, inclusive.</li>
      <li><b>External</b>: plain AXI4-128 master + ACE-Lite low-power signals; <b>no external ACE snoop port</b>.</li>
    </ul>
    <div class="note warn"><b>Key conclusion (verified against RTL + manuals)</b>: openc910's coherence is <b>MOESI</b> (MESI in L1, MOESI in L2), and the ACE snoop signals appear <b>between the core BIU and the CIU</b>; the SoC top-level exposes only plain AXI4.</div>
  </div>

  <h2>2. The coherence path: core ↔ CIU ↔ L2</h2>
  <div class="card">
    <table>
      <tr><th>Level</th><th>Module</th><th>Role</th></tr>
      <tr><td>L1</td><td><code>ct_lsu_top / ct_lsu_dcache_top</code></td><td>D-cache MOESI state; snoop queues</td></tr>
      <tr><td>Core BIU</td><td><code>biu/rtl/ct_biu_top.v + ct_biu_snoop_channel.v</code></td><td>ACE-style transactions (<code>arsnoop/awsnoop/awunique/domain</code>)</td></tr>
      <tr><td>CIU</td><td><code>ciu/rtl/ct_ciu_top.v + ct_ciu_snb*.v</code></td><td>Snoop buffers; AC snoops; CR/CD collection</td></tr>
      <tr><td>L2</td><td><code>l2c/rtl/ct_l2c_top.v + ct_l2c_icc.v</code></td><td>MOESI state, writeback, inclusive</td></tr>
      <tr><td>External</td><td><code>ciu/rtl/ct_ebiu_*.v</code></td><td>Converts to plain AXI4-128</td></tr>
    </table>
    <p><b>Coherence is enclosed within the CIU</b> — above it is ACE-style snooping, below it non-coherent AXI4.</p>
  </div>

  <h2>3. Key RTL files</h2>
  <div class="card">
    <p>Repository root <code>C910_RTL_FACTORY/gen_rtl/</code>:</p>
    <ul>
      <li><b>BIU</b>: <code>biu/rtl/ct_biu_top.v</code> (<code>_arsnoop[3:0]/_awsnoop[2:0]/_awunique/_ardomain[1:0]/_awdomain[1:0]</code>), <code>ct_biu_snoop_channel.v</code>, <code>ct_biu_read_channel.v</code>, <code>ct_biu_write_channel.v</code>, <code>ct_biu_req_arbiter.v</code>.</li>
      <li><b>CIU</b>: <code>ciu/rtl/ct_ciu_top.v</code>, <code>ct_ciu_snb.v/ct_ciu_snb_arb.v/ct_ciu_snb_sab.v</code>, <code>ct_ciu_l2cif.v</code>, <code>ct_ciu_ncq.v/ct_ciu_vb.v</code>, <code>ct_ebiu_*.v</code> (incl. <code>ct_ebiu_snoop_channel_dummy.v</code>).</li>
      <li><b>L2</b>: <code>l2c/rtl/ct_l2c_top.v</code>, <code>ct_l2c_sub_bank.v</code>, <code>ct_l2c_icc.v</code>, <code>ct_l2c_tag.v/ct_l2c_data.v/ct_l2c_wb.v/ct_l2c_prefetch.v</code>.</li>
      <li><b>L1 snoop</b>: <code>lsu/rtl/ct_lsu_snoop_snq.v(+entry)</code>, <code>ct_lsu_snoop_ctcq.v(+entry)</code>, <code>ct_lsu_snoop_req_arbiter.v</code>, <code>ct_lsu_snoop_resp.v</code>, <code>ct_lsu_icc.v</code>, <code>ct_lsu_wmb.v</code>, <code>ct_lsu_bus_arb.v</code>.</li>
    </ul>
  </div>

  <h2>4. A WriteUnique inside the C910</h2>
  <div class="card">
    <ol>
      <li>Core 0 asserts <code>AWSNOOP=WriteUnique</code> on AW.</li>
      <li>The CIU snoops core 1 on AC (<code>ACSNOOP=MakeInvalid</code>).</li>
      <li>Core 1 replies on CR or returns dirty data on CD.</li>
      <li>The CIU marks the line Unique for core 0; the merged result is written to memory via <code>ct_ebiu_*</code>.</li>
    </ol>
  </div>

  <div class="note"><b>Scope</b>: the open-source openC910 is fixed at two cores + external AXI4; cross-cluster coherence (e.g. the four-core TH1520) is not in this open RTL. ACE signal widths match AMBA ACE; per-snoop encodings were not re-derived.</div>
  <p>Reference: <a href="https://github.com/T-head-Semi/openc910">github.com/T-head-Semi/openc910</a>, TH1520 paper arXiv:2311.12808.</p>`;

  S.formal = () => `<h1>Formal Verification of ACE</h1>

  <h2>1. Formal Analysis of the ACE Specification (FMICS 2013)</h2>
  <div class="card">
    <p><b>Kriouile &amp; Serwe</b> (INRIA / Verimag), FMICS 2013, LNCS 8137, DOI <code>10.1007/978-3-642-41010-9_8</code>. <a href="https://inria.hal.science/hal-00858521v1">hal</a></p>
    <p>Verifies the ACE <b>specification</b>: deadlock/livelock freedom, global-ordering requirements, and the snoop (AC/CR) path. The ACE text is translated into <b>LNT</b> and model-checked with <b>CADP</b> (Evaluator/MCL, modal μ-calculus), as concurrent agents (masters + a single coherency point) over the AXI + AC + CR + DVM channels.</p>
    <p><b>Key insight</b>: decompose ACE into named channels plus a single coherency point; build a configuration-independent reference model parameterized by the number of agents. <b>Result</b>: a naive reading of ACE is not automatically deadlock-free.</p>
  </div>

  <h2>2. Using the Formal Model on a Real SoC (TACAS 2015)</h2>
  <div class="card">
    <p><b>Kriouile &amp; Serwe</b>, TACAS 2015, LNCS 9035, DOI <code>10.1007/978-3-662-46681-0_62</code>. <a href="https://rd.springer.com/chapter/10.1007/978-3-662-46681-0_62">springer</a></p>
    <p>Uses the FMICS'13 model as a <b>reference oracle</b> to verify data integrity/coherence, deadlock-freedom, and ordering of a real cache-coherent SoC via <b>compositional verification</b>. The insight: verify each component against abstract assumed behavior, then compose; the model supplies the correctness criteria.</p>
  </div>

  <h2>3. ADVOCAT: automated cross-layer deadlock verification (DATE 2016)</h2>
  <div class="card">
    <p><b>Verbeek, Yaghini, Eghbal, Bagherzadeh</b>, DATE 2016, DOI <code>10.5555/2971808.2972190</code>; journal <b>IEEE Trans. Computers</b> DOI <code>10.1109/TC.2016.2584060</code>. <a href="https://dl.acm.org/doi/10.5555/2971808.2972190">acm</a></p>
    <p>Checks <b>deadlock</b> cross-layer (coherence protocol + NoC buffering) by modelling message-type dependencies and hunting wait-for cycles with <b>SAT/SMT</b>. Insight: a protocol can be deadlock-free on an ideal interconnect yet deadlock on a buffered NoC. Found real deadlocks missed by standard checkers.</p>
  </div>

  <h2>Related work and methodology</h2>
  <div class="card">
    <table>
      <tr><th>Direction</th><th>Work</th></tr>
      <tr><td>Early AMBA formalization</td><td>Roychoudhury &amp; Mitra, DATE 2003</td></tr>
      <tr><td>AMBA in HOL</td><td>Cambridge <a href="https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-602.html">UCAM-CL-TR-602</a></td></tr>
      <tr><td>Modern successor</td><td><a href="https://arxiv.org/abs/2410.15908">Formalising CXL Cache Coherence</a> (ASPLOS 2025)</td></tr>
      <tr><td>RISC-V</td><td>TileLink Murphi model checking (ICCD 2023)</td></tr>
      <tr><td>Industrial VIP</td><td>Cadence / Oski / SmartDV ACE formal VIP (not peer-reviewed)</td></tr>
    </table>
    <ul>
      <li><b>Formalize the specification first</b>: named channels + single coherency point, parameterized reference model.</li>
      <li><b>Then check the implementation</b>: compositional verification with the reference model as oracle.</li>
      <li><b>Treat deadlock separately</b>: dependency-cycle + SAT/SMT, modelling the NoC buffering.</li>
      <li><b>Snoop-filter correctness</b> has no strong standalone paper — it is folded into the coherency-point model or delegated to assertion VIPs.</li>
    </ul>
  </div>`;

  const ROUTES = ["overview","protocol","c910","formal"];
  function route(){
    let h = location.hash.replace(/^#\/?/, "") || "overview";
    if(!ROUTES.includes(h)) h = "overview";
    const fn = S[h];
    document.getElementById("app").innerHTML = fn ? fn() : S.overview();
    document.querySelectorAll("#nav a").forEach(a => {
      a.classList.toggle("active", a.getAttribute("data-nav") === h);
    });
    window.scrollTo(0,0);
  }
  window.addEventListener("hashchange", route);
  route();
})();

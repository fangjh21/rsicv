/* AMBA ACE protocol reference — content + hash router (self-contained, no build step). */
(function(){
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------------- sequence-diagram SVG helper (lifelines + arrows) ---------------- */
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
      { title:"AMBA ACE — WriteUnique transaction (exclusive write, snoop-based invalidate)", h:560, w:820 }
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

  /* ---------------- content sections ---------------- */
  const S = {};

  S.overview = () => `<h1>AMBA ACE Protocol Reference</h1>
  <div class="card">
    <p>AMBA <b>ACE</b> (AXI Coherency Extensions) adds <b>three snoop channels</b> — <code>AC</code> (snoop address), <code>CR</code> (snoop response), <code>CD</code> (snoop data) — to the five AXI4 channels (<code>AW/W/B/AR/R</code>), adds coherent signals such as <code>AWSNOOP/ARSNOOP</code> on the address channels and <code>RACK/WACK</code> on the response channels, and thereby lets multiple cache-capable masters maintain cache coherence over shared memory.</p>
    <p>It targets the SoC arrangement in which several caches share one memory — precisely the scenario a multi-core RISC-V cluster such as the Xuantie C910 must attach to.</p>
  </div>
  <div class="note warn"><b>Note: <code>WriteUniquePtl / DBIDResp / SnpCleanInvalid / NCBWrData / CompDBIDResp</code> are AMBA <u>CHI</u> terms, not ACE.</b>
  ACE is channel-based (AXI + snoop) and has no DBID allocation or Comp completion message; its exclusive write uses <code>AWSNOOP=WriteUnique</code> plus an <code>MakeInvalid</code> snoop on the AC channel. The two are semantically equivalent but mechanically different; this reference covers ACE, with a CHI comparison under <a href="#/writeunique">WriteUnique</a>.</div>
  <div class="diagram">${writeUniqueSVG()}</div>`;

  S.principles = () => `<h1>Principles</h1>

  <h2>1. The problem: multiple cores, private caches</h2>
  <div class="card">
    <p>Each core has private L1/L2 caches over one shared memory. The same address <code>A</code> may be cached by several cores simultaneously; if core 0 writes A while core 1 still holds a stale copy, core 1 reads <b>stale data</b>. Coherence protocols exist to prevent exactly this.</p>
    <p>A single core is correct with simple cache hit/miss logic; multiple cores additionally require that <b>a write by one core becomes observable to the others</b>.</p>
  </div>

  <h2>2. The coherence invariant (single-writer / multiple-reader)</h2>
  <div class="card">
    <p>For any memory location, at any moment exactly one of the following holds:</p>
    <ul>
      <li><b>Single writer (SW)</b>: exactly one core holds a writable copy, and no other read copy exists; or</li>
      <li><b>Multiple readers (MR)</b>: several cores hold read-only copies and none may write.</li>
    </ul>
    <p>Every coherence protocol (MESI, MOESI, ACE, CHI, …) ultimately maintains this invariant: a write must first reclaim all other copies (invalidate them or write back dirty data), and a read must first confirm the copy is current.</p>
  </div>

  <h2>3. Cache-line state model</h2>
  <div class="card">
    <p>ACE classifies each cache line into five states:</p>
    <table>
      <tr><th>State</th><th>Meaning</th><th>Silently modifiable</th></tr>
      <tr><td><code>I</code> (Invalid)</td><td>Line absent / invalid</td><td>—</td></tr>
      <tr><td><code>UC</code> (Unique Clean)</td><td>Only copy in the system, matches memory</td><td>Yes</td></tr>
      <tr><td><code>UD</code> (Unique Dirty)</td><td>Only copy, newer than memory</td><td>Yes</td></tr>
      <tr><td><code>SC</code> (Shared Clean)</td><td>Multiple copies, matches memory</td><td>No</td></tr>
      <tr><td><code>SD</code> (Shared Dirty)</td><td>Multiple copies, one holds the dirty data</td><td>No</td></tr>
    </table>
    <p><b>Unique</b> means only one cache holds it (modifiable locally); <b>Shared</b> means others hold it too (must notify before modifying); <b>Dirty</b> means newer than memory (must hand over the data on eviction).</p>
  </div>

  <h2>4. Two mechanisms: snoop vs directory</h2>
  <div class="card">
    <table>
      <tr><th></th><th>Snoop (used by ACE)</th><th>Directory (used by CHI Home)</th></tr>
      <tr><td>Who coordinates</td><td>The interconnect broadcasts/directs a transaction to all cache masters</td><td>A central Home node tracks the sharer directory per line</td></tr>
      <tr><td>Scalability</td><td>Suits small-to-medium systems</td><td>Suits large systems (no broadcast)</td></tr>
      <tr><td>In ACE</td><td>Snoop on <code>AC</code>, reply on <code>CR/CD</code></td><td>CHI SNP messages, not ACE</td></tr>
    </table>
    <p>ACE is a snoop protocol: on a coherent request the interconnect issues snoops over <code>AC</code> to the other caches, making them invalidate or write back, so the line can be reclaimed as Unique and handed to the requester.</p>
  </div>

  <h2>5. Barriers and domains</h2>
  <div class="card">
    <p>ACE defines two barrier transactions: <code>MemoryBarrier</code> (transactions before the barrier become globally observable before those after it) and <code>SyncBarrier</code> (a synchronization point among all participants). The <code>AWDOMAIN/ARDOMAIN</code> signals partition the system into shareability domains, within which coherence is maintained.</p>
  </div>`;

  S.protocol = () => `<h1>Protocol</h1>

  <h2>1. Channel overview</h2>
  <div class="card">
    <p>ACE has eight unidirectional channels — the five AXI4 channels plus the three snoop channels:</p>
    <table>
      <tr><th>Channel</th><th>Direction</th><th>Purpose</th></tr>
      <tr><td><code>AW</code> write address</td><td>master → interconnect</td><td>Write address/attributes (ACE adds <code>AWSNOOP/AWDOMAIN/AWUNIQUE</code>)</td></tr>
      <tr><td><code>W</code> write data</td><td>master → interconnect</td><td>Write data + <code>WSTRB</code> + <code>WLAST</code></td></tr>
      <tr><td><code>B</code> write response</td><td>interconnect → master</td><td>Write completion (ACE adds <code>WACK</code>)</td></tr>
      <tr><td><code>AR</code> read address</td><td>master → interconnect</td><td>Read address/attributes (ACE adds <code>ARSNOOP/ARDOMAIN</code>)</td></tr>
      <tr><td><code>R</code> read data</td><td>interconnect → master</td><td>Read data + response (ACE adds <code>RACK</code>)</td></tr>
      <tr><td><code>AC</code> snoop address</td><td>interconnect → cache</td><td>Snoop request (<code>ACADDR/ACSNOOP/ACPROT</code>)</td></tr>
      <tr><td><code>CR</code> snoop response</td><td>cache → interconnect</td><td>Snoop result (<code>CRRESP</code>)</td></tr>
      <tr><td><code>CD</code> snoop data</td><td>cache → interconnect</td><td>Dirty line returned during a snoop (<code>CDDATA/CDLAST</code>)</td></tr>
    </table>
    <p><b>AW/W/B</b> form the write path, <b>AR/R</b> the read path, <b>AC/CR/CD</b> the snoop path — a snoop enters the master over AC, and the master returns the result over CR and the dirty data over CD.</p>
  </div>

  <h2>2. VALID / READY handshake</h2>
  <div class="card">
    <p>Each channel uses <code>VALID</code> (sender has data) and <code>READY</code> (receiver can accept). A transfer occurs on the clock edge where both are high; either side may wait independently.</p>
    <ul>
      <li>The sender must not change the payload while <code>VALID</code> is high and it is waiting for <code>READY</code>.</li>
      <li>Once <code>VALID</code> is asserted it must stay asserted until the handshake completes; <code>READY</code> may be asserted or deasserted at any time.</li>
    </ul>
    <p>At transaction level, a burst consists of one address handshake plus <code>AXLEN+1</code> data beats, the last marked by <code>WLAST</code> (write) or <code>RLAST</code> (read).</p>
  </div>

  <h2>3. How a transaction spans channels</h2>
  <div class="card">
    <p>Write: <code>AW</code> address → <code>W</code> data (may overlap) → <code>B</code> response.<br>Read: <code>AR</code> address → <code>R</code> data (last beat with <code>RLAST</code>).<br>Coherent transactions add: the interconnect snoops on <code>AC</code> and the cache replies on <code>CR/CD</code>, in parallel with the data channels.</p>
    <ul>
      <li><code>AWSNOOP / ARSNOOP</code>: whether the transaction is coherent, and of which type.</li>
      <li><code>RACK / WACK</code>: a separate completion handshake telling the interconnect the transaction state may be retired.</li>
      <li><code>AWDOMAIN / ARDOMAIN</code>: shareability domains.</li>
    </ul>
  </div>

  <h2>4. Transaction IDs and ordering</h2>
  <div class="card">
    <p>A master may have several outstanding transactions distinguished by <code>AWID/ARID</code>. The interconnect may return <code>B/R</code> out of order for different IDs but must preserve order within the same ID. Snoops are identified by the AC channel addressing, independent of the master's read/write IDs.</p>
  </div>`;

  S.signals = () => `<h1>Signals</h1>
  <p>Per-channel, per-signal. The prefix <code>AW/W/B/AR/R/AC/CR/CD</code> names the channel; <code>xVALID/xREADY</code> are the handshakes. This page follows <b>AMBA 4 ACE</b>.</p>

  <h2>1. AXI4 base channels</h2>
  <div class="card">
    <table>
      <tr><th>Channel</th><th>Key signals</th><th>Meaning</th></tr>
      <tr><td><code>AW</code></td><td><code>AWVALID/AWREADY/AWID/AWADDR/AWLEN/AWSIZE/AWBURST/AWLOCK/AWCACHE/AWPROT/AWQOS</code></td><td>Write address and attributes; AWLEN = burst length, AWSIZE = bytes per beat</td></tr>
      <tr><td><code>W</code></td><td><code>WVALID/WREADY/WDATA/WSTRB/WLAST</code></td><td>Write data + WSTRB byte strobes + WLAST last beat</td></tr>
      <tr><td><code>B</code></td><td><code>BVALID/BREADY/BID/BRESP[1:0]</code></td><td>Write completion; BRESP = OKAY/EXOKAY/SLVERR/DECERR</td></tr>
      <tr><td><code>AR</code></td><td><code>ARVALID/ARREADY/ARID/ARADDR/ARLEN/ARSIZE/ARBURST/ARLOCK/ARCACHE/ARPROT/ARQOS</code></td><td>Read address and attributes</td></tr>
      <tr><td><code>R</code></td><td><code>RVALID/RREADY/RID/RDATA/RRESP/RLAST</code></td><td>Read data + response; RLAST marks the last beat</td></tr>
    </table>
  </div>

  <h2>2. ACE coherence-extension signals</h2>
  <div class="card">
    <table>
      <tr><th>Signal</th><th>Channel</th><th>Width</th><th>Meaning</th></tr>
      <tr><td><code>AWSNOOP</code></td><td>AW</td><td>3b</td><td>Coherent write type (WriteNoSnoop/WriteUnique/WriteLineUnique/WriteBack/WriteClean)</td></tr>
      <tr><td><code>AWUNIQUE</code></td><td>AW</td><td>1b</td><td>For WriteLineUnique: =1 means already Unique, the snoop may be skipped</td></tr>
      <tr><td><code>AWDOMAIN</code></td><td>AW</td><td>2b</td><td>Shareability domain (0b00 Non-shareable / 0b01 Inner / 0b10 Outer / 0b11 System)</td></tr>
      <tr><td><code>ARSNOOP</code></td><td>AR</td><td>4b</td><td>Coherent read type</td></tr>
      <tr><td><code>ARDOMAIN</code></td><td>AR</td><td>2b</td><td>Read shareability domain</td></tr>
      <tr><td><code>RACK</code></td><td>R</td><td>1b</td><td>Read-type completion: asserted the cycle after the master accepts the last beat (RLAST)</td></tr>
      <tr><td><code>WACK</code></td><td>B</td><td>1b</td><td>Write-type completion: asserted the cycle after the master accepts the write response</td></tr>
      <tr><td><code>RRESP</code></td><td>R</td><td>4b</td><td>Read response widened by ACE to 4 bits: <code>RRESP[2]=PassDirty</code>, <code>RRESP[3]=IsShared</code>; the low two bits remain the standard AXI response</td></tr>
    </table>
    <p><b>RACK/WACK are completion acknowledgements, not extra data.</b> The interconnect relies on them to retire transaction state, and they must be produced purely from channel handshakes (no internal stalls), otherwise the system deadlocks.</p>
  </div>

  <h2>3. Snoop channels (AC / CR / CD)</h2>
  <div class="card">
    <table>
      <tr><th>Signal</th><th>Channel</th><th>Width</th><th>Meaning</th></tr>
      <tr><td><code>ACVALID/ACREADY</code></td><td>AC</td><td>1b</td><td>Snoop address handshake (interconnect → cache)</td></tr>
      <tr><td><code>ACADDR</code></td><td>AC</td><td>addr</td><td>Address being snooped</td></tr>
      <tr><td><code>ACSNOOP</code></td><td>AC</td><td>4b</td><td>Snoop command — reuses the 4-bit ARSNOOP opcode space</td></tr>
      <tr><td><code>ACPROT</code></td><td>AC</td><td>3b</td><td>Protection attributes</td></tr>
      <tr><td><code>CRVALID/CRREADY</code></td><td>CR</td><td>1b</td><td>Snoop response handshake (cache → interconnect)</td></tr>
      <tr><td><code>CRRESP</code></td><td>CR</td><td>5b</td><td>Snoop result, fields <code>ERROR / PASSDIRTY / ISSHARED / WASUNIQUE</code> (bit positions per IHI 0022)</td></tr>
      <tr><td><code>CDVALID/CDREADY</code></td><td>CD</td><td>1b</td><td>Snoop data handshake</td></tr>
      <tr><td><code>CDDATA</code></td><td>CD</td><td>data</td><td>Dirty line returned during a snoop</td></tr>
      <tr><td><code>CDLAST</code></td><td>CD</td><td>1b</td><td>Last beat of the dirty data</td></tr>
    </table>
  </div>

  <h2>4. Barriers and the low-power channel</h2>
  <div class="card">
    <p><code>MemoryBarrier</code> / <code>SyncBarrier</code> are <b>transaction types</b> issued on AR/AW — there is <b>no dedicated AWBAR/ARBAR signal</b>. AMBA 5 has removed the barrier transaction encodings.</p>
    <p><b>Low-power C-channel (ACE-Lite):</b> <code>CACTIVE</code> (master has outstanding transactions), <code>CSYSREQ</code> (system requests entry/exit of low power), <code>CSYSACK</code> (master acknowledges). On the C910 these are <code>biu_pad_cactive / pad_biu_csysreq / biu_pad_csysack</code>.</p>
  </div>`;

  S.transactions = () => `<h1>Transactions</h1>
  <p>Three classes — coherent reads (ARSNOOP), coherent writes (AWSNOOP), snoop commands (ACSNOOP) — plus two barrier types. The encodings below are <b>AMBA 4 ACE</b>.</p>

  <h2>1. Coherent reads (ARSNOOP, 4 bits)</h2>
  <div class="card">
    <table>
      <tr><th>Value</th><th>Transaction</th><th>Meaning</th></tr>
      <tr><td>0b0000</td><td><code>ReadNoSnoop</code></td><td>Non-coherent read; no snoop</td></tr>
      <tr><td>0b0001</td><td><code>ReadOnceCleanInvalid</code></td><td>Read-once; other copies clean+invalidate</td></tr>
      <tr><td>0b0100</td><td><code>ReadOnce</code></td><td>Read-once, not allocated</td></tr>
      <tr><td>0b0101</td><td><code>ReadOnceMakeInvalid</code></td><td>Read-once; other copies invalidated without writeback</td></tr>
      <tr><td>0b1000</td><td><code>ReadClean</code></td><td>Linefill; data must not be dirty</td></tr>
      <tr><td>0b1001</td><td><code>ReadShared</code></td><td>Linefill, allocating Shared</td></tr>
      <tr><td>0b1010</td><td><code>CleanShared</code></td><td>CMO: clean all copies, data-less</td></tr>
      <tr><td>0b1011</td><td><code>MakeUnique</code></td><td>Invalidate others; requester owns the line, data-less</td></tr>
      <tr><td>0b1100</td><td><code>ReadNotSharedDirty</code></td><td>Linefill; requester must not end Shared-Dirty</td></tr>
      <tr><td>0b1101</td><td><code>ReadUnique</code></td><td>Linefill allocating Unique (prepares a store)</td></tr>
      <tr><td>0b1110</td><td><code>CleanInvalid</code></td><td>CMO: clean + invalidate all copies</td></tr>
      <tr><td>0b1111</td><td><code>MakeInvalid</code></td><td>CMO: invalidate all copies</td></tr>
    </table>
    <p><b>00xx = ReadOnce family (may skip the snoop) → 10xx = Read/Clean/Make family (snoop) → 11xx = Unique/Invalid family (exclusive / invalidate)</b>.</p>
  </div>

  <h2>2. Coherent writes (AWSNOOP, 3 bits)</h2>
  <div class="card">
    <table>
      <tr><th>Value</th><th>Transaction</th><th>Meaning</th></tr>
      <tr><td>0b000</td><td><code>WriteNoSnoop</code></td><td>Non-coherent write</td></tr>
      <tr><td>0b001</td><td><code>WriteUnique</code></td><td>Coherent write to a Shareable line the requester does not hold; write-through / no-allocate; the interconnect snoops and merges dirty data</td></tr>
      <tr><td>0b010</td><td><code>WriteLineUnique</code></td><td><b>Full-line</b> coherent write that allocates the line Unique; <code>AWUNIQUE=1</code> skips the snoop</td></tr>
      <tr><td>0b011</td><td><code>WriteBack</code></td><td>Evicting a <b>Dirty</b> Shareable line</td></tr>
      <tr><td>0b100</td><td><code>WriteClean</code></td><td>Cleaning a <b>Clean</b> Shareable line</td></tr>
    </table>
    <p>AMBA 5 rename: <code>WriteUnique → WriteUniquePtl</code>, <code>WriteLineUnique → WriteUniqueFull</code>.</p>
  </div>

  <h2>3. Snoop commands (ACSNOOP, 4 bits)</h2>
  <div class="card">
    <p><b>ACSNOOP reuses the ARSNOOP 4-bit opcode space</b> (the interconnect issues a snoop using the same read/clean/invalidate opcodes, but with command semantics toward the snooped cache):</p>
    <table>
      <tr><th>Value</th><th>Snoop command</th><th>What the snooped cache must do</th></tr>
      <tr><td>0b0100</td><td><code>ReadOnce</code></td><td>Return data if present</td></tr>
      <tr><td>0b0001 / 0b0101</td><td><code>ReadOnceCleanInvalid / ReadOnceMakeInvalid</code></td><td>Return data and clean/invalidate</td></tr>
      <tr><td>0b1000</td><td><code>ReadClean</code></td><td>Return data, line becomes Clean</td></tr>
      <tr><td>0b1001</td><td><code>ReadShared</code></td><td>Return data, line becomes Shared</td></tr>
      <tr><td>0b1010</td><td><code>CleanShared</code></td><td>Return data, keep Shared</td></tr>
      <tr><td>0b1011</td><td><code>MakeUnique</code></td><td>Invalidate; return dirty data; requester becomes Unique</td></tr>
      <tr><td>0b1100</td><td><code>ReadNotSharedDirty</code></td><td>Return data but do not share with the requester</td></tr>
      <tr><td>0b1101</td><td><code>ReadUnique</code></td><td>Return data, invalidate; requester becomes Unique</td></tr>
      <tr><td>0b1110</td><td><code>CleanInvalid</code></td><td>Invalidate the line (clean, no data)</td></tr>
      <tr><td>0b1111</td><td><code>MakeInvalid</code></td><td>Invalidate; return dirty data on CD</td></tr>
    </table>
  </div>

  <h2>4. Barriers</h2>
  <div class="card">
    <table>
      <tr><th>Transaction</th><th>Carried on</th><th>Meaning</th></tr>
      <tr><td><code>MemoryBarrier</code></td><td>Transaction type on AR/AW</td><td>Transactions before the barrier become observable before those after it</td></tr>
      <tr><td><code>SyncBarrier</code></td><td>Transaction type on AR/AW</td><td>A synchronization point across all participating masters</td></tr>
    </table>
    <p>Barriers are <b>not</b> carried on dedicated ARBAR/AWBAR wires; AMBA 5 removed them.</p>
  </div>

  <h2>AMBA 4 vs AMBA 5</h2>
  <div class="card">
    <p>The current AMBA AXI specification (IHI 0022 <b>Issue L</b>, Aug 2025) is AMBA 5, which <b>re-encoded the read opcodes</b> (ReadShared moved to 0b0001, ReadClean to 0b0010) and <b>removed the barrier transactions</b>. This page follows classic <b>AMBA 4 ACE</b>.</p>
  </div>`;

  S.timing = () => `<h1>Timing</h1>
  <p>Each transaction is "request → (snoop) → data → response/completion". Participants: requester RN, interconnect ICN, peer cache, and memory.</p>

  <h2>1. ReadUnique (read and take ownership)</h2>
  <div class="card">
    <div class="diagram">${seqSVG(
      ["RN","ICN","Peer","MEM"],
      [
        [0,1,"AR: ReadUnique","ARSNOOP=ReadUnique, ARADDR"],
        [1,2,"Snoop: MakeInvalid","ACSNOOP=MakeInvalid"],
        [2,1,"Snoop resp","CRRESP (CD if dirty)"],
        [1,0,"R: data + RACK","RRESP, RACK=1 → RN owns Unique"]
      ],
      { title:"ReadUnique — read and take ownership (miss, invalidate peer)", h:330, w:820 }
    )}</div>
  </div>

  <h2>2. ReadShared (read, keep shared)</h2>
  <div class="card">
    <div class="diagram">${seqSVG(
      ["RN","ICN","Peer","MEM"],
      [
        [0,1,"AR: ReadShared","ARSNOOP=ReadShared, ARADDR"],
        [1,2,"Snoop: ReadClean","ACSNOOP=ReadClean"],
        [2,1,"Snoop resp","CRRESP (CD if dirty)"],
        [1,0,"R: data","RRESP, RACK → RN keeps Shared"]
      ],
      { title:"ReadShared — read, peer may retain a Shared copy", h:330, w:820 }
    )}</div>
  </div>

  <h2>3. WriteUnique (exclusive write)</h2>
  <div class="card">
    <div class="diagram">${writeUniqueSVG()}</div>
    <p>Step-by-step under <a href="#/writeunique">WriteUnique</a>.</p>
  </div>

  <h2>4. WriteBack / WriteClean (write back, no snoop)</h2>
  <div class="card">
    <div class="diagram">${seqSVG(
      ["RN (cache)","ICN","MEM",""],
      [
        [0,1,"AW: WriteBack/WriteClean","AWSNOOP=WriteBack or WriteClean"],
        [0,1,"W: data","WLAST last beat"],
        [1,2,"WriteNoSnoop","write to memory"],
        [2,1,"B: BRESP","BRESP=OKAY"],
        [1,0,"B + WACK","WACK=1 → complete"]
      ],
      { title:"WriteBack / WriteClean — dirty-line writeback, no snoop", h:400, w:760 }
    )}</div>
  </div>

  <h2>5. The waveform view of VALID/READY</h2>
  <div class="card">
    <ul>
      <li>Data transfers only on the rising edge where <code>VALID && READY</code> are both high.</li>
      <li><code>VALID</code> must stay asserted until the handshake completes; <code>READY</code> may change at any time.</li>
      <li><code>RDATA</code> accompanies <code>RVALID</code>; <code>WDATA/WSTRB</code> accompany <code>WVALID</code>; <code>WLAST</code> marks the last beat.</li>
      <li>Snoop traffic (AC/CR/CD) runs in parallel with the data channels.</li>
    </ul>
  </div>`;

  S.writeunique = () => `<h1>WriteUnique</h1>
  <div class="card">
    <h3>Semantics</h3>
    <p><b>WriteUnique</b> is an <b>exclusive write</b>: before writing, the interconnect must snoop every other cache to invalidate its copy, so the requester obtains exclusivity — the ACE analogue of CHI's <code>WriteUniquePtl</code>. It is issued on <code>AW</code> with <code>AWSNOOP=WriteUnique</code>. WriteUnique is write-through/no-allocate; its full-line sibling <code>WriteLineUnique</code> allocates the line Unique.</p>
  </div>
  <div class="diagram">${writeUniqueSVG()}</div>
  <div class="card">
    <h3>Steps</h3>
    <ol>
      <li><b>Request</b>: RN asserts <code>AWVALID</code> with <code>AWADDR</code> + <code>AWSNOOP=WriteUnique</code> + <code>AWCACHE</code>; ICN accepts with <code>AWREADY</code>.</li>
      <li><b>Coherence snoop</b>: ICN issues <code>ACSNOOP=MakeInvalid</code> (or CleanInvalid) to the other cache masters.</li>
      <li><b>Snoop response</b>: the peer replies on <code>CR</code> with <code>CRRESP</code>; if it holds the dirty line it also returns it on <code>CD</code>.</li>
      <li><b>Write data</b>: RN sends <code>WDATA/WSTRB/WLAST</code> on W (pipelined with the snoop).</li>
      <li><b>Write to memory</b>: ICN merges the dirty writeback with the write and issues <code>WriteNoSnoop</code> downstream.</li>
      <li><b>Memory response</b>: memory returns <code>BVALID/BRESP=OKAY</code>.</li>
      <li><b>Completion</b>: ICN returns <code>BVALID/BRESP=OKAY + WACK</code> to RN, which releases the transaction.</li>
    </ol>
  </div>
  <div class="card">
    <h3>ACE vs CHI</h3>
    <table>
      <tr><th>Concept</th><th>AMBA ACE</th><th>AMBA CHI</th></tr>
      <tr><td>Transport</td><td>AXI4 channels (AW/W/B/AR/R) + AC/CR/CD</td><td>Packet/flit transport (REQ/RSP/DAT/SNP)</td></tr>
      <tr><td>Exclusive write</td><td><code>AWSNOOP=WriteUnique</code></td><td><code>WriteUniquePtl</code></td></tr>
      <tr><td>Buffer grant</td><td>—</td><td><code>DBIDResp</code></td></tr>
      <tr><td>Invalidating snoop</td><td><code>ACSNOOP=MakeInvalid</code></td><td><code>SnpCleanInvalid</code></td></tr>
      <tr><td>Write data</td><td><code>W</code> channel</td><td><code>NCBWrData</code></td></tr>
      <tr><td>Completion</td><td><code>B + WACK</code></td><td><code>Comp</code> / <code>CompDBIDResp</code></td></tr>
    </table>
    <h3>The CHI flow (WriteUniquePtl)</h3>
    <div class="diagram">${seqSVG(
      ["RN","HN (Home)","SN","Peer RN"],
      [
        [0,1,"WriteUniquePtl","write address + control"],
        [1,0,"DBIDResp","data-buffer ID granted"],
        [1,3,"SnpCleanInvalid","invalidate other caches"],
        [3,1,"SnpResp","SnpResp_I / SnpRespData_I_PD"],
        [0,1,"NCBWrData","write data"],
        [1,2,"WriteNoSnp","merged data to subordinate"],
        [2,1,"CompDBIDResp","write-complete response"],
        [1,0,"Comp","global completion"]
      ],
      { title:"AMBA CHI — WriteUniquePtl", h:560, w:820 }
    )}</div>
    <p><b>ACE uses channel handshakes + snoop (AC/CR/CD); CHI uses messages + split responses (DBIDResp/Comp)</b>. The "invalidate other copies, then write exclusively" semantics are identical.</p>
  </div>`;

  S.c910 = () => `<h1>C910 Implementation and RTL Walkthrough</h1>

  <h2>1. The C910MP cluster (as shipped in openc910)</h2>
  <div class="card">
    <p>The open-source <code>openc910</code> repository is a <b>two-core cluster (C910MP)</b>:</p>
    <div class="diagram">${c910SVG()}</div>
    <ul>
      <li><code>openC910.v</code> instantiates two cores <code>ct_top x0/x1</code>, one <code>ct_ciu_top</code> (CIU, Coherence Interconnect Unit), and one <code>ct_l2c_top</code> (shared L2).</li>
      <li><b>L1</b>: 64 KB instruction + 64 KB data, 2-way, 64 B line.</li>
      <li><b>CIU</b>: the point of coherence between cores, with snoop buffers.</li>
      <li><b>L2</b>: 1 MB, 16-way, two sub-banks (512 KB each), 64 B line, inclusive, with prefetch.</li>
      <li><b>External</b>: a plain AXI4-128 master plus the ACE-Lite low-power signals; <b>no external ACE snoop port</b>.</li>
    </ul>
    <div class="note warn"><b>Key conclusion (verified against RTL + manuals)</b>: openc910's coherence protocol is <b>MOESI</b> (MESI in L1, MOESI in L2), and the ACE snoop signals appear <b>between the core BIU and the CIU</b>; the SoC top-level exposes only plain AXI4.</div>
  </div>

  <h2>2. The coherence path: core ↔ CIU ↔ L2</h2>
  <div class="card">
    <table>
      <tr><th>Level</th><th>Module</th><th>Coherence role</th></tr>
      <tr><td>L1 (per core)</td><td><code>ct_lsu_top</code> / <code>ct_lsu_dcache_top</code></td><td>Maintains D-cache MOESI state; issues and answers snoops</td></tr>
      <tr><td>Core bus interface</td><td><code>biu/rtl/ct_biu_top.v</code> + <code>ct_biu_snoop_channel.v</code></td><td>Turns core accesses into ACE-style transactions</td></tr>
      <tr><td>Coherent interconnect</td><td><code>ciu/rtl/ct_ciu_top.v</code> + <code>ct_ciu_snb*.v</code></td><td>Arbitrates; issues AC snoops; collects CR/CD responses</td></tr>
      <tr><td>Shared L2</td><td><code>l2c/rtl/ct_l2c_top.v</code> + <code>ct_l2c_icc.v</code></td><td>MOESI state, dirty writeback, inclusive maintenance</td></tr>
      <tr><td>External</td><td><code>ciu/rtl/ct_ebiu_*.v</code></td><td>Converts internal transactions into plain AXI4-128</td></tr>
    </table>
    <p><b>Coherence is enclosed within the CIU</b> — above it is ACE-style snooping, below it (at the L2 egress) the traffic becomes non-coherent AXI4.</p>
  </div>

  <h2>3. RTL walkthrough: key files</h2>
  <div class="card">
    <p>The repository root is <code>C910_RTL_FACTORY/gen_rtl/</code>:</p>
    <h3>3.1 Core bus interface (BIU)</h3>
    <ul>
      <li><code>biu/rtl/ct_biu_top.v</code> — carries <code>_arsnoop[3:0] / _awsnoop[2:0] / _awunique / _ardomain[1:0] / _awdomain[1:0]</code>, matching AMBA ACE widths.</li>
      <li><code>ct_biu_snoop_channel.v</code> — the snoop address channel (<code>acaddr/acprot/acsnoop/acvalid/acready</code>).</li>
      <li><code>ct_biu_read_channel.v / ct_biu_write_channel.v / ct_biu_req_arbiter.v</code>.</li>
    </ul>
    <h3>3.2 CIU</h3>
    <ul>
      <li><code>ciu/rtl/ct_ciu_top.v</code>; <code>ct_ciu_snb.v / ct_ciu_snb_arb.v / ct_ciu_snb_sab.v</code> (snoop buffers).</li>
      <li><code>ct_ciu_l2cif.v</code>; <code>ct_ciu_ncq.v / ct_ciu_vb.v</code>.</li>
      <li><code>ct_ebiu_*.v</code>; <code>ct_ebiu_snoop_channel_dummy.v</code> confirms no external snoop.</li>
    </ul>
    <h3>3.3 L2</h3>
    <ul>
      <li><code>l2c/rtl/ct_l2c_top.v / ct_l2c_sub_bank.v</code>; <code>ct_l2c_icc.v</code> (cache-coherence control).</li>
      <li><code>ct_l2c_tag.v / ct_l2c_data.v / ct_l2c_wb.v / ct_l2c_prefetch.v</code>.</li>
    </ul>
    <h3>3.4 L1 D-cache snoop side</h3>
    <ul>
      <li><code>lsu/rtl/ct_lsu_snoop_snq.v(+entry) / ct_lsu_snoop_ctcq.v(+entry) / ct_lsu_snoop_req_arbiter.v / ct_lsu_snoop_resp.v</code>.</li>
      <li><code>ct_lsu_icc.v / ct_lsu_wmb.v / ct_lsu_bus_arb.v</code>.</li>
    </ul>
  </div>

  <h2>4. A WriteUnique inside the C910</h2>
  <div class="card">
    <ol>
      <li>Core 0 wants to write a line exclusively → the BIU asserts <code>AWSNOOP=WriteUnique</code> on AW.</li>
      <li>The CIU snoops core 1 on AC (<code>ACSNOOP=MakeInvalid</code>); core 1's <code>ct_lsu_snoop_*</code> checks its D-cache.</li>
      <li>Core 1 replies on CR (<code>PassClean</code>) or returns dirty data on CD.</li>
      <li>The CIU marks the line Unique for core 0; core 0 writes; if needed the CIU writes the merged result back to memory via <code>ct_ebiu_*</code>.</li>
    </ol>
  </div>

  <div class="note"><b>Scope</b>: the open-source openC910 is fixed at two cores + external AXI4; <b>cross-cluster coherence (e.g. the four-core TH1520) is not present in this open RTL</b>. The ACE signal widths match AMBA ACE, but the per-snoop ARM-spec encodings were not re-derived; the C910 user manual references the AMBA AXI and ACE Protocol Specification.</div>
  <p>Reference: <a href="https://github.com/T-head-Semi/openc910">github.com/T-head-Semi/openc910</a>, TH1520 paper arXiv:2311.12808.</p>`;

  S.formal = () => `<h1>Formal Verification of ACE</h1>

  <h2>1. Formal Analysis of the ACE Specification (FMICS 2013)</h2>
  <div class="card">
    <p><b>Formal Analysis of the ACE Specification for Cache Coherent Systems-on-Chip</b> — A. Kriouile, W. Serwe (INRIA / Verimag &amp; LIG), FMICS 2013, LNCS 8137, DOI <code>10.1007/978-3-642-41010-9_8</code>. <a href="https://inria.hal.science/hal-00858521v1">hal</a> · <a href="http://cadp.inria.fr/case-studies/13-e-ace.html">case study</a></p>
    <h3>What it verifies</h3>
    <p>The ACE <b>specification</b>: deadlock/livelock freedom of the channel combination; the global-ordering requirements; the coherent snoop (AC/CR) path.</p>
    <h3>Method</h3>
    <p>The ACE text is translated into <b>LNT</b> (CADP toolbox) and model-checked with CADP's <b>Evaluator / MCL</b> (modal μ-calculus). The protocol is modelled as concurrent agents (masters + a single coherency point) over the AXI + AC + CR + DVM channels.</p>
    <h3>Key insight</h3>
    <p>Decompose ACE into its named channels plus a single coherency point, so ordering constraints can be stated precisely; build a configuration-independent reference model parameterized by the number of agents.</p>
    <h3>Result</h3>
    <p>A naive reading of ACE is <b>not automatically deadlock-free</b>; the contribution is making the implied ordering/coherency-point requirements explicit and checkable.</p>
  </div>

  <h2>2. Using the Formal Model on a Real SoC (TACAS 2015)</h2>
  <div class="card">
    <p><b>Using a Formal Model to Improve Verification of a Cache-Coherent System-on-Chip</b> — A. Kriouile, W. Serwe, TACAS 2015, LNCS 9035, DOI <code>10.1007/978-3-662-46681-0_62</code>. <a href="https://rd.springer.com/chapter/10.1007/978-3-662-46681-0_62">springer</a></p>
    <h3>What it verifies</h3>
    <p>Data integrity / coherence, deadlock-freedom, and ordering of a <b>real cache-coherent SoC design</b> against the formal ACE model.</p>
    <h3>Method</h3>
    <p>The FMICS'13 model is used as a <b>reference oracle</b>; the design is abstracted and compared component-wise using <b>compositional verification</b> (CADP).</p>
    <h3>Key insight</h3>
    <p>Compositional reasoning plus a formal reference model: verify each component against abstract assumed behavior, then compose.</p>
    <h3>Result</h3>
    <p>A formal protocol reference model measurably improves verification quality (more corner-case coverage, earlier detection of coherence/ordering violations).</p>
  </div>

  <h2>3. ADVOCAT: automated cross-layer deadlock verification (DATE 2016)</h2>
  <div class="card">
    <p><b>ADVOCAT: Automated deadlock verification for on-chip cache coherence and interconnects</b> — F. Verbeek, P. M. Yaghini, A. Eghbal, N. Bagherzadeh, DATE 2016, DOI <code>10.5555/2971808.2972190</code>; journal extension <b>IEEE Trans. Computers</b> DOI <code>10.1109/TC.2016.2584060</code>. <a href="https://dl.acm.org/doi/10.5555/2971808.2972190">acm</a></p>
    <h3>What it verifies</h3>
    <p><b>Deadlock</b> in coherent on-chip interconnects, treated <b>cross-layer</b>: the coherence protocol plus the underlying NoC buffering/ordering.</p>
    <h3>Method</h3>
    <p>Model the protocol as message types with sender/receiver/buffer dependencies, and check for a reachable state with no enabled transition (deadlock), framed as <b>wait-for dependency-cycle detection</b> and solved with SAT/SMT.</p>
    <h3>Key insight</h3>
    <p>Deadlock is a cross-layer dependency-cycle phenomenon: a protocol can be deadlock-free on an ideal interconnect yet deadlock on a real buffered NoC.</p>
    <h3>Result</h3>
    <p>Found real deadlocks in published protocol configurations, missed by standard checkers or visible only with NoC buffering. Limits: abstracts data values, scalability depends on the SMT encoding.</p>
  </div>

  <h2>Related work and industrial practice</h2>
  <div class="card">
    <table>
      <tr><th>Direction</th><th>Representative work</th></tr>
      <tr><td>Early AMBA AXI/AHB formalization</td><td>Roychoudhury &amp; Mitra, DATE 2003</td></tr>
      <tr><td>AMBA in HOL</td><td>Cambridge <a href="https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-602.html">UCAM-CL-TR-602</a> (2004)</td></tr>
      <tr><td>Modern coherent successor</td><td><a href="https://arxiv.org/abs/2410.15908">Formalising CXL Cache Coherence</a> (ASPLOS 2025)</td></tr>
      <tr><td>RISC-V ecosystem</td><td>TileLink coherence Murphi model checking (ICCD 2023)</td></tr>
      <tr><td>Industrial assertion VIP</td><td>Cadence / Oski / SmartDV ARM ACE formal VIP (not peer-reviewed)</td></tr>
    </table>
  </div>

  <h2>Methodology summary</h2>
  <div class="card">
    <ul>
      <li><b>Formalize the specification first</b>: decompose ACE into named channels + a single coherency point, and build a parameterized reference model.</li>
      <li><b>Then check the implementation</b>: compositional verification with the reference model as oracle.</li>
      <li><b>Treat deadlock separately</b>: dependency-cycle + SAT/SMT automation, modelling the underlying NoC buffering.</li>
      <li><b>Snoop-filter correctness</b> has no strong standalone academic paper — it is folded into the coherency-point / AC-ordering model or delegated to industrial assertion VIPs.</li>
    </ul>
  </div>`;

  /* ---------------- router ---------------- */
  const ROUTES = ["overview","principles","protocol","signals","transactions","timing","writeunique","c910","formal"];
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

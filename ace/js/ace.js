/* AMBA ACE learning site — content + hash router (self-contained, no build step). */
(function(){
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  /* ---------------- sequence-diagram SVG helper (lifelines + arrows) ---------------- */
  function seqSVG(participants, messages, opts){
    opts = opts || {};
    const top = 44, LH = opts.h || 560, gap = LH/(messages.length+1);
    const X = participants.map((p,i)=> 80 + i*((opts.w||760)-160)/(participants.length-1 || 1));
    let s = `<svg width="${opts.w||760}" height="${LH+30}" viewBox="0 0 ${opts.w||760} ${LH+30}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="sequence diagram">`;
    // title
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

  /* ---------------- WriteUnique ACE sequence (authoritative flow) ---------------- */
  function writeUniqueSVG(){
    return seqSVG(
      ["RN (Requester)", "ICN (Home/Interconnect)", "Peer cache", "Memory"],
      [
        [0,1,"AW: WriteUnique","AWSNOOP=WriteUnique, AWADDR, AWCACHE"],
        [1,2,"Snoop: MakeInvalid","ACVALID/ACADDR, ACSNOOP=MakeInvalid"],
        [2,1,"Snoop resp","CRVALID/CRRESP=PassClean (CD if dirty)"],
        [0,1,"W: write data","WVALID/WDATA/WSTRB/WLAST"],
        [1,3,"WriteNoSnoop","AW + W to memory (downstream)"],
        [3,1,"B: BRESP","BVALID/BRESP=OKAY"],
        [1,0,"B + WACK","BVALID/BRESP=OKAY, WACK=1 → complete"]
      ],
      { title:"AMBA ACE — WriteUnique transaction (exclusive write, snoop-based invalidate)", h:560, w:820 }
    );
  }

  /* ---------------- content sections ---------------- */
  const S = {};

  S.overview = () => `<h1>AMBA ACE 协议学习站</h1>
  <p class="lead">AXI Coherency Extensions（ACE）— 面向多核/多主机一致性系统的 AXI4 扩展，本页按「原理 → 协议 → 信号 → 访问分类 → 时序 → C910 实现 → 形式验证」递进。</p>
  <div class="card">
    <h3>一句话说明</h3>
    <p>AMBA <b>ACE</b> 在标准 AXI4 的 5 条通道（AW / W / B / AR / R）之上，增加了 <b>3 条监听通道</b>（<code>AC</code> 地址监听、<code>CR</code> 监听响应、<code>CD</code> 监听数据），并在 AW/AR 上增加 <code>AWSNOOP/ARSNOOP</code> 等一致性信号、在 R/B 上增加 <code>RACK/WACK</code>，使多个缓存型主机能在共享内存上维持缓存一致性。</p>
    <p>它服务于 <b>big.LITTLE / 多核簇</b> 这一类「带缓存的多个主设备共享同一内存」的 SoC 架构 —— 正是玄铁 C910 这类 RISC-V 多核处理器要接入的互连场景。</p>
  </div>
  <div class="card">
    <h3>本页结构（今天将迭代 ≥10 版）</h3>
    <ul class="toc">
      <li><a href="#/principles">① 原理：为什么需要一致性、MOESI/模型</a></li>
      <li><a href="#/protocol">② 协议内容：通道、握手、事务类</a></li>
      <li><a href="#/signals">③ 信号解释：逐通道逐信号表</a></li>
      <li><a href="#/transactions">④ 访问分类：读写/监听/屏障编码</a></li>
      <li><a href="#/timing">⑤ 事务时序图：Read/Write 系列</a></li>
      <li><a href="#/writeunique">⑥ WriteUnique 事务流程</a></li>
      <li><a href="#/c910">⑦ C910 具体实现与 RTL 解读</a></li>
      <li><a href="#/formal">⑧ ACE 形式验证论文精讲</a></li>
    </ul>
  </div>
  <div class="note warn"><b>⚠ 关键澄清：你贴的「WriteUniquePtl / DBIDResp / SnpCleanInvalid / NCBWrData / CompDBIDResp」是 AMBA <u>CHI</u> 的流程，不是 ACE。</b>
  ACE 基于 AXI 通道 + 监听（snoop），没有 DBID 分配、没有 Comp 完成报文；其独占写用 <code>AWSNOOP=WriteUnique</code> + AC 通道 <code>MakeInvalid</code> 监听实现。二者语义等价但机制不同，本站按 ACE 讲，并在 <a href="#/writeunique">WriteUnique</a> 一节对照 CHI。</div>
  <div class="diagram">${writeUniqueSVG()}</div>`;

  S.principles = () => `<h1>原理</h1>
  <div class="card"><p>本节（缓存一致性动机、MESI/MOESI 状态、ACE 的一致性模型与缓存行状态 I/UC/UD/SC/SD）正在撰写，将在第 2 版补齐。</p></div>`;

  S.protocol = () => `<h1>协议内容</h1>
  <div class="card"><p>通道与握手、事务结构正在撰写，将在第 3 版补齐。</p></div>`;

  S.signals = () => `<h1>信号解释</h1>
  <div class="card"><p>逐通道逐信号表正在撰写，将在第 4 版补齐。</p></div>`;

  S.transactions = () => `<h1>访问分类</h1>
  <div class="card"><p>读写/监听/屏障事务编码与含义正在撰写，将在第 5 版补齐。</p></div>`;

  S.timing = () => `<h1>事务时序图</h1>
  <div class="card"><p>Read/Write 系列时序图正在撰写，将在第 6 版补齐。</p></div>`;

  S.writeunique = () => `<h1>WriteUnique 事务流程（ACE）</h1>
  <div class="card">
    <h3>语义</h3>
    <p><b>WriteUnique</b>：主设备对一行做<b>独占写</b>。写入前互连必须通过监听把其他缓存里的该行副本<b>全部失效</b>，从而拿到独占权 —— 对应 CHI 的 <code>WriteUniquePtl</code>。它通过 <code>AW</code> 通道携带 <code>AWSNOOP=WriteUnique</code> 发起。</p>
  </div>
  <div class="diagram">${writeUniqueSVG()}</div>
  <div class="card">
    <h3>步骤解析（对应上图编号）</h3>
    <ol>
      <li><b>发起请求</b>：RN 在 <code>AW</code> 通道置 <code>AWVALID</code>，给出 <code>AWADDR</code> + <code>AWSNOOP=WriteUnique</code> + <code>AWCACHE</code> 等；ICN 以 <code>AWREADY</code> 接收。</li>
      <li><b>一致性监听</b>：ICN 在 <code>AC</code> 通道向其他缓存主机发 <code>ACSNOOP=MakeInvalid</code>（或 CleanInvalid），要求使其副本失效。</li>
      <li><b>监听响应</b>：Peer 在 <code>CR</code> 通道回 <code>CRRESP=PassClean/PassDirty/Fail</code>；若持有脏行，同时用 <code>CD</code> 通道回写脏数据。</li>
      <li><b>写数据</b>：RN 在 <code>W</code> 通道发 <code>WDATA/WSTRB/WLAST</code>（可与监听并行流水）。</li>
      <li><b>写入内存</b>：ICN 合并脏回写与本次写数据后，以 <code>WriteNoSnoop</code> 写下游内存。</li>
      <li><b>内存响应</b>：内存返回 <code>BVALID/BRESP=OKAY</code>。</li>
      <li><b>完成</b>：ICN 向 RN 回 <code>BVALID/BRESP=OKAY + WACK</code>，RN 释放事务资源 —— 全局一致点达成。</li>
    </ol>
  </div>
  <div class="card">
    <h3>ACE vs CHI 对照（你贴的那张图）</h3>
    <table>
      <tr><th>概念</th><th>AMBA ACE（本站）</th><th>AMBA CHI（你贴的例子）</th></tr>
      <tr><td>传输层</td><td>AXI4 通道（AW/W/B/AR/R）+ AC/CR/CD</td><td>报文 flit（REQ/RSP/DAT/SNP）</td></tr>
      <tr><td>独占写事务</td><td><code>AWSNOOP=WriteUnique</code></td><td><code>WriteUniquePtl</code></td></tr>
      <tr><td>缓冲分配响应</td><td>—（无此概念）</td><td><code>DBIDResp</code></td></tr>
      <tr><td>失效监听</td><td><code>ACSNOOP=MakeInvalid</code></td><td><code>SnpCleanInvalid</code></td></tr>
      <tr><td>写数据</td><td><code>W</code> 通道</td><td><code>NCBWrData</code></td></tr>
      <tr><td>完成</td><td><code>B + WACK</code></td><td><code>Comp</code> / <code>CompDBIDResp</code></td></tr>
    </table>
  </div>`;

  S.c910 = () => `<h1>C910 具体实现与 RTL 解读</h1>
  <div class="card"><p>玄铁 C910 的总线/一致性接口与 RTL 文件解读正在调研撰写（openc910 仓库），将在第 7 版补齐。</p></div>`;

  S.formal = () => `<h1>ACE 协议形式验证论文精讲</h1>
  <div class="card"><p>正在调研筛选最优论文，将在第 8~10 版补齐。</p></div>`;

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

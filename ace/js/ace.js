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

  function c910SVG(){
    // C910MP architecture: 2 cores -> BIU(ACE-style) -> CIU -> L2 -> external AXI4
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
  <p class="lead">为什么多核需要 ACE：从「私有缓存 + 共享内存」带来的数据一致性问题出发，理解一致性不变量、缓存状态模型，以及 ACE 采用的监听（snoop）机制。</p>

  <h2>1. 问题：多核与私有缓存</h2>
  <div class="card">
    <p>每个 CPU 核有自己的 L1/L2 私有缓存，共享同一个主存。同一地址 <code>A</code> 可能同时存在于多个核的缓存里。当核 0 写入 A 而核 1 缓存里还留着旧值，核 1 读到的就是<b>陈旧数据</b>。这就是一致性要解决的问题。</p>
    <p>单核里，写回缓存靠「命中/缺失」即可正确；多核里，必须额外保证<b>一个核的写能被其他核观察到</b>。</p>
  </div>

  <h2>2. 一致性不变量（Single-Writer / Multiple-Reader）</h2>
  <div class="card">
    <p>对任意一个内存位置，任何时刻只允许处于以下两者之一：</p>
    <ul>
      <li><b>单写者（SW）</b>：有且仅有一个核持有可写的副本（且此刻没有其他读副本）；或</li>
      <li><b>多读者（MR）</b>：多个核持有只读副本，谁都不能写。</li>
    </ul>
    <p>一切一致性协议（MESI/MOESI/ACE/CHI…）本质上都在<b>维护这个不变量</b>：写之前先「回收」所有其他副本（失效或回写脏数据），读之前先「确保」副本是最新的。</p>
  </div>

  <h2>3. 缓存行状态模型</h2>
  <div class="card">
    <p>ACE 把每条缓存行分为 5 个状态（不同于 MESI 的 4 态，ACE 明确区分 Unique 与 Shared、Clean 与 Dirty）：</p>
    <table>
      <tr><th>状态</th><th>含义</th><th>可否静默改</th><th>备注</th></tr>
      <tr><td><code>I</code> (Invalid)</td><td>该行无效/不在缓存</td><td>—</td><td>读/写都要发起事务</td></tr>
      <tr><td><code>UC</code> (Unique Clean)</td><td>全系统唯一副本，且与内存一致</td><td>✅</td><td>写可静默升级为 UD（不需通知互连）</td></tr>
      <tr><td><code>UD</code> (Unique Dirty)</td><td>唯一副本，比内存新（脏）</td><td>✅</td><td>独占脏行，可静默写</td></tr>
      <tr><td><code>SC</code> (Shared Clean)</td><td>多个副本，与内存一致</td><td>❌</td><td>要写必须先升级为 Unique</td></tr>
      <tr><td><code>SD</code> (Shared Dirty)</td><td>多个副本，其中一个持有脏数据</td><td>❌</td><td>写前需回写+失效其他副本</td></tr>
    </table>
    <p>直觉：<b>Unique = 只有我有</b>（可以自己改）；<b>Shared = 大家都有</b>（改之前要通知别人）；<b>Dirty = 我比内存新</b>（回写内存时要把脏数据交出来）。</p>
  </div>

  <h2>4. 两种实现机制：Snoop vs Directory</h2>
  <div class="card">
    <table>
      <tr><th></th><th>Snoop（监听，ACE 采用）</th><th>Directory（目录，CHI Home 采用）</th></tr>
      <tr><td>谁协调</td><td>互连把事务<b>广播/定向</b>给所有缓存主机</td><td>集中的 Home 节点记录每行的共享者目录</td></tr>
      <tr><td>扩展性</td><td>适合中小规模（核数少，总线/交叉开关）</td><td>适合大规模（避免广播）</td></tr>
      <tr><td>ACE 体现</td><td><code>AC</code> 通道发监听、<code>CR/CD</code> 回响应</td><td>（CHI 的 SNP 报文，非 ACE）</td></tr>
    </table>
    <p>ACE 属于 snoop 家族：互连（ICN）在收到一致性请求后，通过 <code>AC</code> 通道<b>向其他缓存主机发监听</b>，让它们失效/回写，从而把一行「收回」成 Unique 再交给请求者。</p>
  </div>

  <h2>5. 屏障与域（Barrier / Domain）</h2>
  <div class="card">
    <p>ACE 还定义了两种屏障事务：<code>MemoryBarrier</code>（保证屏障前的事务在屏障后的观测上全局可见）与 <code>SyncBarrier</code>（所有参与者的同步点）；并通过 <code>AWDOMAIN/ARDOMAIN</code> 把系统划分成「一致性域」，只有同域内才需要维持一致 —— 这也是 C910 这类多核簇接 SoC 时用到的边界概念。</p>
  </div>

  <div class="note"><b>下一步</b>：状态模型 + 事务类型如何联动，见 <a href="#/transactions">访问分类</a> 与 <a href="#/timing">时序图</a>。</div>`;

  S.protocol = () => `<h1>协议内容</h1>
  <p class="lead">ACE 在 AXI4 之上叠加一致性能力。先理解「通道」这个基本单元和 VALID/READY 握手，再理解一个事务如何跨多条通道展开。</p>

  <h2>1. 通道（Channel）总览</h2>
  <div class="card">
    <p>ACE 一共 8 条单向通道。前 5 条是 AXI4 本体，后 3 条是 ACE 新增的监听通道：</p>
    <table>
      <tr><th>通道</th><th>方向</th><th>作用</th></tr>
      <tr><td><code>AW</code> 写地址</td><td>主 → 互连</td><td>写事务的地址/属性（ACE 加 <code>AWSNOOP/AWDOMAIN/AWBAR</code>）</td></tr>
      <tr><td><code>W</code> 写数据</td><td>主 → 互连</td><td>写数据 + 字节选通 <code>WSTRB</code> + <code>WLAST</code></td></tr>
      <tr><td><code>B</code> 写响应</td><td>互连 → 主</td><td>写完成响应（ACE 加 <code>WACK</code>）</td></tr>
      <tr><td><code>AR</code> 读地址</td><td>主 → 互连</td><td>读事务的地址/属性（ACE 加 <code>ARSNOOP/ARDOMAIN/ARBAR</code>）</td></tr>
      <tr><td><code>R</code> 读数据</td><td>互连 → 主</td><td>读数据 + 响应（ACE 加 <code>RACK</code>）</td></tr>
      <tr><td><code>AC</code> 监听地址</td><td>互连 → 缓存主</td><td>一致性监听请求（<code>ACADDR/ACSNOOP/ACPROT</code>）</td></tr>
      <tr><td><code>CR</code> 监听响应</td><td>缓存主 → 互连</td><td>监听结果（<code>CRRESP</code>）</td></tr>
      <tr><td><code>CD</code> 监听数据</td><td>缓存主 → 互连</td><td>监听中交出的脏数据（<code>CDDATA/CDLAST</code>）</td></tr>
    </table>
    <p>记忆法：<b>AW/W/B</b> 是「写三件套」，<b>AR/R</b> 是「读两件套」，<b>AC/CR/CD</b> 是「监听三件套」—— 监听从互连<b>进</b>主设备（AC），主设备<b>回</b>结果（CR）和脏数据（CD）。</p>
  </div>

  <h2>2. VALID / READY 握手</h2>
  <div class="card">
    <p>每条通道用 <code>VALID</code>（发送方有数据）与 <code>READY</code>（接收方能收）握手。数据在 <b>VALID 与 READY 同时为高的时钟沿</b>传输，双方可各自等待，不阻塞。</p>
    <p>两条铁律：</p>
    <ul>
      <li>发送方<b>不得</b>在 VALID 拉高后等待 READY 时改变数据（保持稳定直到握手完成）。</li>
      <li>VALD 一旦拉高<b>必须保持到握手完成</b>；READY 可以随时拉高/拉低（甚至可以不等 VALID）。</li>
    </ul>
    <p>事务级：一个<b>突发（burst）</b>由 1 条地址握手 + N 次数据握手（N=AXLEN+1）组成，写以 <code>WLAST</code> 标记末拍，读以 <code>RLAST</code> 标记。</p>
  </div>

  <h2>3. 一个事务如何跨通道展开</h2>
  <div class="card">
    <p>写事务：<code>AW</code> 地址 →（可重叠）<code>W</code> 数据 → <code>B</code> 完成响应。<br>读事务：<code>AR</code> 地址 → <code>R</code> 数据（末拍带 <code>RLAST</code>）。<br>一致性事务：在上述读写之上，互连通过 <code>AC</code> 发监听、主设备经 <code>CR/CD</code> 响应 —— 三者时序上可与数据通道<b>并行流水</b>（例如 WriteUnique 的监听和 W 数据可以同时进行）。</p>
    <p>ACE 的关键增强信号：</p>
    <ul>
      <li><code>AWSNOOP / ARSNOOP</code>：本次事务是否一致、以及是哪种一致性类型（决定互连要不要发监听）。</li>
      <li><code>RACK / WACK</code>：分别指示「读事务的读响应已可安全释放」「写事务的写响应已可安全释放」—— 给一致性事务一个<b>独立的完成握手点</b>，允许后续事务超前流水。</li>
      <li><code>AWDOMAIN / ARDOMAIN / AC...</code>：域与屏障，见<a href="#/signals">信号解释</a>。</li>
    </ul>
  </div>

  <h2>4. 事务 ID 与乱序</h2>
  <div class="card">
    <p>同一主机可挂多个未完成事务，靠 <code>AWID/ARID/WID</code> 区分；互连对<b>不同 ID</b> 的事务可乱序返回 <code>B/R</code>，对<b>同 ID</b> 必须按序。ACE 的监听事务用 <code>AC</code> 通道自身的寻址与协议标识区分，不与主机的读写 ID 混淆。</p>
  </div>

  <div class="note"><b>下一节</b>：逐信号逐位的精确定义见 <a href="#/signals">信号解释</a>。</div>`;

  S.signals = () => `<h1>信号解释</h1>
  <p class="lead">逐通道、逐信号。ACE = AXI4 基础信号 + 一致性增强信号。信号名以下表为准（前缀 <code>AW/W/B/AR/R/AC/CR/CD</code> 对应通道，<code>xVALID/xREADY</code> 为各通道握手）。</p>

  <h2>1. AXI4 基础通道（先记住这些）</h2>
  <div class="card">
    <table>
      <tr><th>通道</th><th>关键信号</th><th>含义</th></tr>
      <tr><td><code>AW</code> 写地址</td><td><code>AWVALID/AWREADY/AWID/AWADDR/AWLEN/AWSIZE/AWBURST/AWLOCK/AWCACHE/AWPROT/AWQOS</code></td><td>写事务地址与属性；AWLEN 突发长度、AWSIZE 每拍字节数</td></tr>
      <tr><td><code>W</code> 写数据</td><td><code>WVALID/WREADY/WID/WDATA/WSTRB/WLAST</code></td><td>写数据 + 字节选通 WSTRB（每 bit 对应一字节）+ 末拍 WLAST</td></tr>
      <tr><td><code>B</code> 写响应</td><td><code>BVALID/BREADY/BID/BRESP</code></td><td>写完成；BRESP=OKAY/EXOKAY/SLVERR/DECERR</td></tr>
      <tr><td><code>AR</code> 读地址</td><td><code>ARVALID/ARREADY/ARID/ARADDR/ARLEN/ARSIZE/ARBURST/ARLOCK/ARCACHE/ARPROT/ARQOS</code></td><td>读事务地址与属性</td></tr>
      <tr><td><code>R</code> 读数据</td><td><code>RVALID/RREADY/RID/RDATA/RRESP/RLAST</code></td><td>读数据 + 响应；RLAST 标末拍</td></tr>
    </table>
  </div>

  <h2>2. ACE 一致性增强信号（核心）</h2>
  <div class="card">
    <table>
      <tr><th>信号</th><th>通道</th><th>位宽</th><th>含义</th></tr>
      <tr><td><code>AWSNOOP</code></td><td>AW</td><td>3b</td><td>本次写的一致性类型（WriteNoSnoop/WriteUnique/WriteLineUnique/WriteBack/WriteClean）</td></tr>
      <tr><td><code>AWUNIQUE</code></td><td>AW</td><td>1b</td><td>对 WriteLineUnique：=1 表示已是唯一副本、互连可省监听</td></tr>
      <tr><td><code>AWDOMAIN</code></td><td>AW</td><td>2b</td><td>写所属一致性域（Non-shareable / Inner / Outer / System）</td></tr>
      <tr><td><code>AWBAR</code></td><td>AW</td><td>2b</td><td>写屏障（=1 MemoryBarrier，=2 SyncBarrier）</td></tr>
      <tr><td><code>ARSNOOP</code></td><td>AR</td><td>4b</td><td>本次读的一致性类型（ReadNoSnoop/ReadOnce/ReadClean/ReadShared/ReadNotSharedDirty/ReadUnique/CleanInvalid/MakeInvalid/CleanShared/MakeUnique）</td></tr>
      <tr><td><code>ARDOMAIN</code></td><td>AR</td><td>2b</td><td>读所属一致性域</td></tr>
      <tr><td><code>ARBAR</code></td><td>AR</td><td>2b</td><td>读屏障</td></tr>
      <tr><td><code>RACK</code></td><td>R</td><td>1b</td><td>读事务的读响应「可安全释放」握手（一致性事务专用完成点）</td></tr>
      <tr><td><code>WACK</code></td><td>B</td><td>1b</td><td>写事务的写响应「可安全释放」握手</td></tr>
      <tr><td><code>RRESP</code></td><td>R</td><td>3b</td><td>扩展含 OKAY/EXOKAY（PassDirty/PassClean 语义经 RRESP[2] 表达）</td></tr>
    </table>
  </div>

  <h2>3. 监听三通道（AC / CR / CD）</h2>
  <div class="card">
    <table>
      <tr><th>信号</th><th>通道</th><th>位宽</th><th>含义</th></tr>
      <tr><td><code>ACVALID/ACREADY</code></td><td>AC</td><td>1b</td><td>监听地址握手</td></tr>
      <tr><td><code>ACADDR</code></td><td>AC</td><td>addr</td><td>被监听地址</td></tr>
      <tr><td><code>ACSNOOP</code></td><td>AC</td><td>4b</td><td>监听事务类型（ReadOnce/ReadClean/ReadShared/ReadNotSharedDirty/CleanInvalid/MakeInvalid/CleanShared/MakeUnique）</td></tr>
      <tr><td><code>ACPROT</code></td><td>AC</td><td>3b</td><td>保护属性</td></tr>
      <tr><td><code>CRVALID/CRREADY</code></td><td>CR</td><td>1b</td><td>监听响应握手</td></tr>
      <tr><td><code>CRRESP</code></td><td>CR</td><td>5b</td><td>监听结果：PassDirty / PassClean / Fail（+ 其他）</td></tr>
      <tr><td><code>CDVALID/CDREADY</code></td><td>CD</td><td>1b</td><td>监听数据握手</td></tr>
      <tr><td><code>CDDATA</code></td><td>CD</td><td>data</td><td>交出的脏缓存行数据</td></tr>
      <tr><td><code>CDLAST</code></td><td>CD</td><td>1b</td><td>脏数据末拍</td></tr>
    </table>
    <div class="note warn"><b>编码以 ARM IHI 0022 为准</b>：ARSNOOP 4b（0b0000 ReadNoSnoop … 0b1001 MakeUnique）、AWSNOOP 3b（0b000 WriteNoSnoop … 0b100 WriteClean）、ACSNOOP 4b（0b0000 ReadOnce … 0b0111 MakeUnique）的逐值含义见 <a href="#/transactions">访问分类</a>；完整 5b CRRESP 各值在下面给出主要三项，其余见规范附录。</div>
  </div>

  <h2>4. 低功耗通道（ACE-Lite / C-channel）</h2>
  <div class="card">
    <p>ACE-Lite 主设备（如 C910 对外侧）用三条信号表达「我是否处于可关时钟状态」：<code>CACTIVE</code>（主设备有无未完成事务）、<code>CSYSREQ</code>（系统请求主设备进入/退出低功耗）、<code>CSYSACK</code>（主设备确认进入低功耗）。C910 的 <code>biu_pad_cactive / pad_biu_csysreq / biu_pad_csysack</code> 即此通道 —— 注意它不是一致性，而是电源门控握手。</p>
  </div>

  <div class="note"><b>记忆</b>：一致性读写看 <code>AWSNOOP/ARSNOOP</code>（事务「想要什么一致性结果」）；互连据此在 <code>AC</code> 发监听、缓存经 <code>CR/CD</code> 回结果；<code>RACK/WACK</code> 是「资源可释放」的独立完成握手。</div>`;

  S.transactions = () => `<h1>访问分类</h1>
  <p class="lead">ACE 的事务按「<b>谁发起、要什么一致性结果</b>」分三类：一致性读（ARSNOOP）、一致性写（AWSNOOP）、监听事务（ACSNOOP），外加两类屏障。核心规律：<b>含 Unique 的 = 要独占；含 Invalid 的 = 让别处失效；含 Clean/Shared 的 = 读共享；含 Back/Clean 的写 = 自己回写内存</b>。</p>

  <h2>1. 一致性读（ARSNOOP，4 位）</h2>
  <div class="card">
    <table>
      <tr><th>值</th><th>事务</th><th>含义 / 互连要不要监听</th></tr>
      <tr><td>0b0000</td><td><code>ReadNoSnoop</code></td><td>普通读，不做一致性维护（NoSnoop）</td></tr>
      <tr><td>0b0001</td><td><code>ReadOnce</code></td><td>读一次；只有当结果是 Unique 时才允许缓存，互连可不监听</td></tr>
      <tr><td>0b0010</td><td><code>ReadClean</code></td><td>读且要干净数据；互连监听，把别处脏数据回写内存，本端得 Clean</td></tr>
      <tr><td>0b0011</td><td><code>ReadShared</code></td><td>读并可共享；互连监听，允许保持 Shared 副本</td></tr>
      <tr><td>0b0100</td><td><code>ReadNotSharedDirty</code></td><td>读但不要别处的脏数据（脏数据只回写内存），本端得干净副本</td></tr>
      <tr><td>0b0101</td><td><code>ReadUnique</code></td><td>读且要<b>独占</b>；互连监听使别处失效并取回脏数据，本端得 Unique —— 典型「读改写」前奏</td></tr>
      <tr><td>0b0110</td><td><code>CleanInvalid</code></td><td>让别处失效、无数据返回（本端已知数据干净，准备全行写）</td></tr>
      <tr><td>0b0111</td><td><code>MakeInvalid</code></td><td>让别处失效并把脏数据回写内存、无数据返回本端</td></tr>
      <tr><td>0b1000</td><td><code>CleanShared</code></td><td>把副本清理成共享状态（缓存维护/降级）</td></tr>
      <tr><td>0b1001</td><td><code>MakeUnique</code></td><td>把已有共享副本<b>升级为独占</b>，无数据返回</td></tr>
    </table>
    <p>直觉记忆：<b>ReadOnce 最省（可省监听）→ ReadShared/Clean 要监听取共享 → ReadUnique/MakeUnique 要独占 → CleanInvalid/MakeInvalid 只要别处失效不要数据</b>。</p>
  </div>

  <h2>2. 一致性写（AWSNOOP，3 位）</h2>
  <div class="card">
    <table>
      <tr><th>值</th><th>事务</th><th>含义</th></tr>
      <tr><td>0b000</td><td><code>WriteNoSnoop</code></td><td>普通写，无一致性（写内存）</td></tr>
      <tr><td>0b001</td><td><code>WriteUnique</code></td><td><b>部分行</b>独占写；互连监听使别处失效并合并脏数据 → 本站 <a href="#/writeunique">WriteUnique</a> 主角</td></tr>
      <tr><td>0b010</td><td><code>WriteLineUnique</code></td><td><b>整行</b>独占写；<code>AWUNIQUE=1</code> 表示本端已是 Unique（可省监听），否则互连监听</td></tr>
      <tr><td>0b011</td><td><code>WriteBack</code></td><td>缓存<b>淘汰脏行</b>，回写内存（不监听，数据不再保留）</td></tr>
      <tr><td>0b100</td><td><code>WriteClean</code></td><td>把脏行回写内存但<b>继续保留</b>（变 Clean）</td></tr>
    </table>
    <p>与读类的对应：<code>WriteUnique</code> ≈ 写侧「要独占」，<code>WriteBack/WriteClean</code> ≈ 写侧「自己交数据」，<code>WriteLineUnique</code> 用 <code>AWUNIQUE</code> 位省一次监听。</p>
  </div>

  <h2>3. 监听事务（ACSNOOP，4 位）</h2>
  <div class="card">
    <table>
      <tr><th>值</th><th>事务</th><th>被监听缓存要做什么</th></tr>
      <tr><td>0b0000</td><td><code>ReadOnce</code></td><td>交出数据（若有）；可能降级/失效</td></tr>
      <tr><td>0b0001</td><td><code>ReadClean</code></td><td>交出数据，行变 Clean</td></tr>
      <tr><td>0b0010</td><td><code>ReadShared</code></td><td>交出数据，行变 Shared</td></tr>
      <tr><td>0b0011</td><td><code>ReadNotSharedDirty</code></td><td>交出数据但不交给请求方共享（脏数据回写内存）</td></tr>
      <tr><td>0b0100</td><td><code>CleanInvalid</code></td><td>失效该行（无需交数据，因为干净）</td></tr>
      <tr><td>0b0101</td><td><code>MakeInvalid</code></td><td>失效该行；若脏则经 <code>CD</code> 交出数据</td></tr>
      <tr><td>0b0110</td><td><code>CleanShared</code></td><td>交出数据，保持 Shared</td></tr>
      <tr><td>0b0111</td><td><code>MakeUnique</code></td><td>失效该行；若脏则交出数据，使请求方成为 Unique</td></tr>
    </table>
    <p>监听事务与一致性读写是<b>成对</b>的：主设备发 <code>ReadUnique</code>，互连就向其他缓存发 <code>MakeInvalid</code> 监听；发 <code>WriteUnique</code>，互连发 <code>MakeInvalid</code>（或 CleanInvalid）。</p>
  </div>

  <h2>4. 屏障（Barrier）</h2>
  <div class="card">
    <table>
      <tr><th>事务</th><th>信号</th><th>含义</th></tr>
      <tr><td><code>MemoryBarrier</code></td><td><code>ARBAR/AWBAR</code> 的相应位</td><td>屏障前的事务须在屏障后的事务被观测前全局可见（保序）</td></tr>
      <tr><td><code>SyncBarrier</code></td><td><code>ARBAR/AWBAR</code></td><td>所有参与主设备的同步点（更强，需多方确认）</td></tr>
    </table>
    <p>屏障用 <code>ARBAR/AWBAR</code> 携带（不另占 snoop 编码），互连据此在不同事务流之间强加顺序。</p>
  </div>

  <div class="note"><b>说明</b>：编码表对应 ARM <b>IHI 0022</b>（AMBA AXI/ACE 规范附录 G）。若你手头规范版本较新，请以规范原文为准；本站编码已按 IHI0022H 核对。</div>`;

  S.timing = () => `<h1>事务时序图</h1>
  <p class="lead">每个事务都是「请求 →（可能监听）→ 数据 → 响应/完成」的流程。下面按访问类型给出时序图，参与者为：请求者 RN、互连 ICN、对端缓存 Peer、内存 MEM。</p>

  <h2>1. ReadUnique（读并取得独占，读改写前奏）</h2>
  <div class="card">
    <div class="diagram">${seqSVG(
      ["RN","ICN","Peer","MEM"],
      [
        [0,1,"AR: ReadUnique","ARSNOOP=ReadUnique, ARADDR"],
        [1,2,"Snoop: MakeInvalid","ACSNOOP=MakeInvalid"],
        [2,1,"Snoop resp","CRRESP=PassClean / PassDirty (CD if dirty)"],
        [1,0,"R: data + RACK","RRESP=EXOKAY, RACK=1 → RN owns Unique"]
      ],
      { title:"ReadUnique — 读并独占（miss 且需使对端失效）", h:330, w:820 }
    )}</div>
  </div>

  <h2>2. ReadShared（读共享，miss）</h2>
  <div class="card">
    <div class="diagram">${seqSVG(
      ["RN","ICN","Peer","MEM"],
      [
        [0,1,"AR: ReadShared","ARSNOOP=ReadShared, ARADDR"],
        [1,2,"Snoop: ReadClean","ACSNOOP=ReadClean"],
        [2,1,"Snoop resp","CRRESP=PassDirty/PassClean (CD if dirty)"],
        [1,0,"R: data","RRESP=OKAY, RACK → RN keeps Shared"]
      ],
      { title:"ReadShared — 读共享（对端可保留 Shared 副本）", h:330, w:820 }
    )}</div>
  </div>

  <h2>3. WriteUnique（独占写，本站重点）</h2>
  <div class="card">
    <div class="diagram">${writeUniqueSVG()}</div>
    <p>详细步骤见 <a href="#/writeunique">WriteUnique 事务流程</a>。</p>
  </div>

  <h2>4. WriteBack / WriteClean（自己交数据，无监听）</h2>
  <div class="card">
    <div class="diagram">${seqSVG(
      ["RN (cache)","ICN","MEM",""],
      [
        [0,1,"AW: WriteBack/WriteClean","AWSNOOP=WriteBack 或 WriteClean"],
        [0,1,"W: data","WLAST 末拍"],
        [1,2,"WriteNoSnoop","写内存"],
        [2,1,"B: BRESP","BRESP=OKAY"],
        [1,0,"B + WACK","WACK=1 → 完成（WriteBack 后行被丢弃，WriteClean 后保留为 Clean）"]
      ],
      { title:"WriteBack / WriteClean — 脏行回写，无监听", h:400, w:760 }
    )}</div>
  </div>

  <h2>5. 读/写握手的「波形」视角</h2>
  <div class="card">
    <p>时序图是「参与者视角」，而 RTL 里看到的是<b>时钟沿上的 VALID/READY 波形</b>。规则（贯穿所有 ACE 通道）：</p>
    <ul>
      <li>数据只在 <code>VALID && READY</code> 同时为 1 的上升沿传输。</li>
      <li><code>VALID</code> 一旦拉高必须保持到握手完成；<code>READY</code> 可随时变化。</li>
      <li>读数据 <code>RDATA</code> 与 <code>RVALID</code> 同步；写数据 <code>WDATA/WSTRB</code> 与 <code>WVALID</code> 同步；<code>WLAST</code> 标末拍。</li>
      <li>一致性监听（AC/CR/CD）与数据通道<b>可并行</b>，这正是 WriteUnique 里「监听 + 写数据同时进行」的来源。</li>
    </ul>
  </div>

  <div class="note"><b>下一节</b>：<a href="#/writeunique">WriteUnique 详解</a>（含与 CHI 的对照）。</div>`;

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
    <h3>附：你提供的 CHI 版流程（WriteUniquePtl）</h3>
    <p>下面是把它按同样画风重绘的 CHI 时序（报文名与你贴的一致，仅做可视化）：</p>
    <div class="diagram">${seqSVG(
      ["RN","HN (Home)","SN","Peer RN"],
      [
        [0,1,"WriteUniquePtl","写地址 + 控制信息"],
        [1,0,"DBIDResp","数据缓冲 ID 分配完成"],
        [1,3,"SnpCleanInvalid","要求其他缓存失效"],
        [3,1,"SnpResp","SnpResp_I / SnpRespData_I_PD（脏则带回写）"],
        [0,1,"NCBWrData","写数据"],
        [1,2,"WriteNoSnp","合并后的数据写从节点"],
        [2,1,"CompDBIDResp","写完成响应"],
        [1,0,"Comp","全局完成"]
      ],
      { title:"AMBA CHI — WriteUniquePtl（你贴的原始流程，可视化对照）", h:560, w:820 }
    )}</div>
    <p>对照看出两条主线：<b>ACE 用通道握手 + 监听（AC/CR/CD），CHI 用报文 + 分离响应（DBIDResp/Comp）</b>；「先失效别处副本再独占写」这个语义两者完全一致。</p>
  </div>`;

  S.c910 = () => `<h1>C910 具体实现与 RTL 解读</h1>
  <p class="lead">玄铁 C910（T-Head XuanTie C910）是开源的 RISC-V 64 位多核处理器。它最有价值的一点：<b>对外暴露的是普通 AXI4-128 主口，而 ACE 一致性发生在芯片内部</b>（core↔CIU↔L2 之间）。这一章按「架构 → 一致性通路 → 具体 RTL 文件」逐层解读。</p>

  <h2>1. C910MP 集群架构（openc910 实际结构）</h2>
  <div class="card">
    <p>开源的 <code>openc910</code> 仓库是一个 <b>2 核集群（C910MP）</b>：</p>
    <div class="diagram">${c910SVG()}</div>
    <ul>
      <li><code>openC910.v</code> 例化 2 个核 <code>ct_top x0/x1</code>、1 个 <code>ct_ciu_top</code>（CIU，一致性互连单元）、1 个 <code>ct_l2c_top</code>（共享 L2）。</li>
      <li><b>L1</b>：64KB 指令 + 64KB 数据，2 路组相联，64B 行。</li>
      <li><b>CIU</b>：核心之间的一致性点，含 snoop 缓冲与地址缓冲。</li>
      <li><b>L2</b>：1MB、16 路、2 个子 bank（各 512KB），64B 行，<b>inclusive</b>（含 L1 内容），带预取。</li>
      <li><b>对外</b>：仅 AXI4-128 主口（AR/W/B/AW/R）+ ACE-Lite 低功耗信号（CACTIVE/CSYSACK/CSYSREQ），<b>没有对外 ACE 监听口</b>。</li>
    </ul>
    <div class="note warn"><b>关键结论（已从 RTL + 手册核实）</b>：openc910 的一致性协议是 <b>MOESI</b>（L1 为 MESI、L2 为 MOESI），并且 ACE 的监听信号（ARSNOOP/AWSNOOP/AWUNIQUE/ARDOMAIN/AWDOMAIN + AC/CR/CD 通道）出现在 <b>core 的 BIU 与 CIU 之间</b>；而 SoC 顶层对外只接普通 AXI4。因此「C910 的 ACE」讲的是<b>内部一致性互连</b>，不是对外总线。</div>
  </div>

  <h2>2. 一致性通路：core ↔ CIU ↔ L2</h2>
  <div class="card">
    <table>
      <tr><th>层次</th><th>模块</th><th>一致性角色</th></tr>
      <tr><td>L1（每核）</td><td><code>ct_lsu_top</code> / <code>ct_lsu_dcache_top</code></td><td>维护 D 缓存 MOESI 状态；接收/发起 snoop</td></tr>
      <tr><td>核总线接口</td><td><code>biu/rtl/ct_biu_top.v</code> 及 <code>ct_biu_snoop_channel.v</code> / <code>read_channel</code> / <code>write_channel</code></td><td>把核的访存转成 ACE 风格事务，带 <code>arsnoop/awsnoop/awunique/ardomain/awdomain</code></td></tr>
      <tr><td>一致性互连</td><td><code>ciu/rtl/ct_ciu_top.v</code> + <code>ct_ciu_snb*.v</code>（snoop buffer）</td><td>仲裁、把一致性请求定向/广播成 AC 监听，收 CR/CD 响应</td></tr>
      <tr><td>共享 L2</td><td><code>l2c/rtl/ct_l2c_top.v</code> + <code>ct_l2c_icc.v</code>（cache-coherence control）+ <code>ct_l2c_sub_bank.v</code></td><td>MOESI 目录/状态、脏行回写、inclusive 维护</td></tr>
      <tr><td>对外</td><td><code>ciu/rtl/ct_ebiu_*.v</code>（external BIU，含 <code>ct_ebiu_snoop_channel_dummy.v</code>）</td><td>把内部事务转换成普通 AXI4-128；dummy snoop 通道证明「对外无 snoop」</td></tr>
    </table>
    <p>一句话理解：<b>一致性被封闭在 CIU 内部</b>，CIU 之上是 ACE 风格监听，CIU 之下（L2 出口）转成非一致 AXI4。这正是 ACE「把一致性域圈起来」的教科书式落点。</p>
  </div>

  <h2>3. RTL 走读：关键文件与要点</h2>
  <div class="card">
    <p>仓库根为 <code>C910_RTL_FACTORY/gen_rtl/</code>，下面是走读主线（模块名均已在仓库中核实存在）：</p>
    <h3>3.1 核总线接口 BIU（ACE 信号在这里出现）</h3>
    <ul>
      <li><code>biu/rtl/ct_biu_top.v</code>：核的总线出口，<code>_arsnoop[3:0] / _awsnoop[2:0] / _awunique / _ardomain[1:0] / _awdomain[1:0]</code> —— 位宽与 AMBA ACE 完全一致（ARSNOOP 4b、AWSNOOP 3b、AWUNIQUE 1b、DOMAIN 2b）。</li>
      <li><code>ct_biu_snoop_channel.v</code>：<code>acaddr/acprot/acsnoop/acvalid/acready</code> 监听地址通道。</li>
      <li><code>ct_biu_read_channel.v / ct_biu_write_channel.v / ct_biu_req_arbiter.v</code>：读写请求与仲裁。</li>
    </ul>
    <h3>3.2 CIU（一致性互连 + snoop 缓冲）</h3>
    <ul>
      <li><code>ciu/rtl/ct_ciu_top.v</code>：CIU 顶层。</li>
      <li><code>ct_ciu_snb.v / ct_ciu_snb_arb.v / ct_ciu_snb_sab.v</code>：snoop buffer 与 snoop address buffer —— 处理被监听的地址队列。</li>
      <li><code>ct_ciu_l2cif.v</code>：CIU↔L2 接口；<code>ct_ciu_ncq.v / ct_ciu_vb.v</code>：非缓存请求队列 / 写缓冲。</li>
      <li><code>ct_ebiu_*.v</code>：外部 AXI4 转换；<code>ct_ebiu_snoop_channel_dummy.v</code> 是「对外无 snoop」的直接证据。</li>
    </ul>
    <h3>3.3 L2（MOESI 状态机）</h3>
    <ul>
      <li><code>l2c/rtl/ct_l2c_top.v / ct_l2c_sub_bank.v</code>（两个子 bank）。</li>
      <li><code>ct_l2c_icc.v</code>：L2 的一致性控制（MOESI 状态推进、inclusive 维护）。</li>
      <li><code>ct_l2c_tag.v / ct_l2c_data.v / ct_l2c_wb.v / ct_l2c_prefetch.v</code>：标签/数据/回写/预取。</li>
    </ul>
    <h3>3.4 L1 数据缓存的 snoop 侧</h3>
    <ul>
      <li><code>lsu/rtl/ct_lsu_snoop_snq.v(+entry) / ct_lsu_snoop_ctcq.v(+entry) / ct_lsu_snoop_req_arbiter.v / ct_lsu_snoop_resp.v</code>：L1 监听队列与响应。</li>
      <li><code>ct_lsu_icc.v / ct_lsu_wmb.v / ct_lsu_bus_arb.v</code>：L1 一致性控制 / 写合并缓冲 / 总线仲裁。</li>
    </ul>
  </div>

  <h2>4. 一个 WriteUnique 在 C910 内部如何走</h2>
  <div class="card">
    <ol>
      <li>核 0 要独占写一行 → BIU 在 <code>AW</code> 上给出 <code>AWSNOOP=WriteUnique</code>（3b 编码）。</li>
      <li>CIU 收到后，向核 1 发 <code>AC</code> 监听（<code>ACSNOOP=MakeInvalid</code>），核 1 的 <code>ct_lsu_snoop_*</code> 查自己的 D 缓存。</li>
      <li>核 1 经 <code>CR</code> 回 <code>PassClean</code>（干净）或经 <code>CD</code> 交出脏数据。</li>
      <li>CIU 把该行标记为核 0 Unique，核 0 写数据；必要时 CIU 把合并结果经 <code>ct_ebiu_*</code> 转 AXI4 写回内存（对外就是一次普通 AXI 写，无 snoop）。</li>
    </ol>
    <p>这正是本站 <a href="#/writeunique">WriteUnique</a> 时序图在 C910 内部逻辑上的具体落地。</p>
  </div>

  <div class="note"><b>诚实声明</b>：开源的 openC910 固定为 2 核 + 对外 AXI4；<b>多簇（如 TH1520 的 4 核）跨簇一致性不在此开源 RTL 内</b>。我核对了 ACE 信号位宽与 AMBA ACE 一致，但未逐一复推每条 snoop 事务的 ARM 规范编码 —— C910 用户手册明确「参考 AMBA AXI/ACE Protocol Specification」。</div>
  <p class="lead" style="margin-top:16px">参考：<a href="https://github.com/T-head-Semi/openc910">github.com/T-head-Semi/openc910</a>（<code>C910_RTL_FACTORY/gen_rtl/</code>）、TH1520 论文 arXiv:2311.12808。</p>`;

  S.formal = () => `<h1>ACE 协议形式验证论文精讲</h1>
  <p class="lead">这一章调研「用形式方法验证 ACE」的文献，优中选优讲 3 篇，再给相关方向与工业现状。先说结论：<b>ACE 的学术形式验证基本是一个小组（INRIA/Verimag，CADP 工具链）的高质量成果 + 工业断言 VIP</b>，可复现、可引用的核心就那几篇。</p>

  <h2>文献格局：两类问题</h2>
  <div class="card">
    <ul>
      <li><b>验证协议规范本身</b>：ACE 的通道组合会不会死锁？规范里隐含的全局排序、一致性点（coherency point）要求是否成立？</li>
      <li><b>验证用 ACE 实现出来的具体 SoC</b>：数据一致性、死锁、顺序是否满足规范。</li>
    </ul>
    <p>前者是「把一篇散文规格变成可机器检查的模型」，后者是「拿这个模型当裁判去查实现」。</p>
  </div>

  <h2>🏆 论文一：ACE 规范本身的形式分析（FMICS 2013）</h2>
  <div class="card">
    <p><b>Formal Analysis of the ACE Specification for Cache Coherent Systems-on-Chip</b> — A. Kriouile, W. Serwe（INRIA / Verimag &amp; LIG），FMICS 2013，LNCS 8137，DOI <code>10.1007/978-3-642-41010-9_8</code>。论文：<a href="https://inria.hal.science/hal-00858521v1">inria.hal.science/hal-00858521v1</a> · 案例：<a href="http://cadp.inria.fr/case-studies/13-e-ace.html">cadp.inria.fr ACE case study</a></p>
    <h3>验证什么</h3>
    <p>ACE <b>规范本身</b>：(i) 通道组合的死锁/活锁；(ii) 事务间的<b>全局排序要求</b>（互连上 ACE 假设的、通道机制隐含的顺序）；(iii) 一致性监听（AC/CR）路径的序/一致性。</p>
    <h3>方法（核心）</h3>
    <p>把非形式化的 AMBA ACE 文本，手工翻译成 <b>LNT</b>（CADP 工具链的过程代数语言），再用 CADP 的 <b>Evaluator / MCL</b>（模态 μ 演算）做模型检查。把协议建模成「主设备 + 单一监听/一致性点」在 AXI + AC + CR + DVM 通道上通信的<b>并发 agent</b>，每个通道刻画消息类型与排序保证。</p>
    <h3>关键洞察</h3>
    <p>① 把 ACE <b>按命名通道分解 + 一个一致性点</b>，排序约束才能被精确陈述；② 构造<b>与配置无关、按 agent 数参数化</b>的参考模型，直接把 ACE 的「公理」编码进去 —— 这样同一模型对 1 核到 N 核拓扑通用。</p>
    <h3>结果</h3>
    <p>模型检查揭示：按朴素读法，ACE 规范<b>并非自动无死锁</b>—— 某些看似允许的顺序会走到死锁态。贡献不是「ACE 有 bug」，而是<b>把隐含的全局排序/一致性点要求显式化、可检查化</b>。</p>
  </div>

  <h2>🏆 论文二：拿形式模型去查真实 SoC（TACAS 2015）</h2>
  <div class="card">
    <p><b>Using a Formal Model to Improve Verification of a Cache-Coherent System-on-Chip</b> — A. Kriouile, W. Serwe，TACAS 2015，LNCS 9035，DOI <code>10.1007/978-3-662-46681-0_62</code>。<a href="https://rd.springer.com/chapter/10.1007/978-3-662-46681-0_62">springer</a> · <a href="https://inria.hal.science/hal-01104747v1">hal</a></p>
    <h3>验证什么</h3>
    <p>一个<b>真实缓存一致 SoC 设计</b>的数据完整性/一致性、无死锁、顺序 —— 也就是「这个实现的一致性逻辑是否符合 ACE 模型」。</p>
    <h3>方法（核心）</h3>
    <p>把论文一的 ACE 形式模型当作<b>高层参考模型 / 规格 oracle</b>；对被验设计做抽象，用 <b>compositional（组合式）验证</b>（CADP）逐组件对照参考模型。性质集合<b>从参考模型导出</b>，而不是临时手写。</p>
    <h3>关键洞察</h3>
    <p><b>组合式推理 + 形式参考模型当 oracle</b>：不可能全 SoC 穷举，就每个组件对照抽象假设行为分别验证再组合；模型提供正确性判据，努力集中在「设计偏离模型的点」——状态空间比全系统穷举小得多。</p>
    <h3>结果</h3>
    <p>证明「形式协议参考模型」能<b>可度量地提升验证质量</b>（覆盖更多角点交错、更早发现一致性/顺序违例）。这是 ACE 计划的「落地」半篇。</p>
  </div>

  <h2>🏆 论文三：跨层死锁自动化检测 ADVOCAT（DATE 2016）</h2>
  <div class="card">
    <p><b>ADVOCAT: Automated deadlock verification for on-chip cache coherence and interconnects</b> — F. Verbeek, P. M. Yaghini, A. Eghbal, N. Bagherzadeh，DATE 2016，DOI <code>10.5555/2971808.2972190</code>；期刊扩展 <b>IEEE Trans. Computers</b> DOI <code>10.1109/TC.2016.2584060</code>。<a href="https://dl.acm.org/doi/10.5555/2971808.2972190">acm</a> · <a href="https://www.cs.ru.nl/~freekver/ADVOCAT/">项目页</a></p>
    <h3>验证什么</h3>
    <p>缓存一致片上互连里的<b>死锁</b>，且按<b>跨层</b>处理：一致性协议（消息类型、缓冲）与底层 NoC/路由（缓冲、顺序、通道）的相互作用 —— 正是 ACE/CHI 所生活的协议类。</p>
    <h3>方法（核心）</h3>
    <p>给定「消息类型 + 收发方 + 缓冲依赖」描述的协议，检查状态图能否到达<b>无使能转移</b>（死锁）态；把问题建模成 <b>等待依赖环检测 / 可达性</b>，用 <b>SAT/SMT</b>（Z3 一族）求解，而非枚举状态；可选有界以控制规模。</p>
    <h3>关键洞察</h3>
    <p><b>死锁是跨层的依赖环现象</b>：协议在理想互连上无死锁，在真实有缓冲/有限信用的 NoC 上却可能死锁（反之亦然）。显式建模消息传递依赖图、找环，使死锁检测<b>自动化、配置驱动</b>（不用每个协议手写不变量）。</p>
    <h3>结果</h3>
    <p>在已发表的协议配置里检出真实死锁 bug（被标准检查器漏掉、或只有计入 NoC 顺序/缓冲才出现）。局限：抽象掉数据值（只看控制/流死锁），规模受 SMT 编码/界限制。</p>
  </div>

  <h2>相关方向与工业现状</h2>
  <div class="card">
    <table>
      <tr><th>方向</th><th>代表工作</th><th>要点</th></tr>
      <tr><td>AMBA AXI/AHB 早期形式化</td><td>Roychoudhury &amp; Mitra，DATE 2003（AMBA 总线模型检查找 bug）</td><td>ACE 类总线形式验证的经典先例</td></tr>
      <tr><td>AMBA 在 HOL 里建模</td><td>Cambridge <a href="https://www.cl.cam.ac.uk/techreports/UCAM-CL-TR-602.html">UCAM-CL-TR-602</a>（2004）</td><td>定理证明路线</td></tr>
      <tr><td>现代相干后继</td><td><a href="https://arxiv.org/abs/2410.15908">Formalising CXL Cache Coherence</a>（ASPLOS 2025）</td><td>CXL.cachemem（源自 CHI）的规范形式化 + 模型检查</td></tr>
      <tr><td>RISC-V 生态</td><td>TileLink 一致性 Murphi 模型检查（ICCD 2023）</td><td>显式状态模型检查的现代范本</td></tr>
      <tr><td>工业断言 VIP</td><td>Cadence / Oski / SmartDV 的 ARM ACE 形式 VIP</td><td>覆盖死锁/顺序/snoop 完整性，但<b>非同行评审</b></td></tr>
    </table>
  </div>

  <h2>给你的方法论总结</h2>
  <div class="card">
    <ul>
      <li><b>先形式化「规范」</b>：把 ACE 拆成命名通道 + 单一一致性点，用 LNT/CADP（或等价的进程代数）建立<b>参数化参考模型</b> —— 这是可复用、可扩展的核心。</li>
      <li><b>再拿模型查「实现」</b>：组合式验证 + 参考模型当 oracle，把精力放在「实现偏离模型」的点。</li>
      <li><b>死锁单独拆出来查</b>：用依赖环 + SAT/SMT 的自动化方法（ADVOCAT 思路），尤其要<b>连同底层 NoC 缓冲/顺序一起</b>建模，不能只看协议层。</li>
      <li><b>snoop filter 的正确性</b>没有独立强学术论文 —— 它被并入「一致性点/AC 通道排序模型」，或交给工业断言 VIP；写材料时别去引不存在的「snoop filter 最佳论文」。</li>
    </ul>
  </div>

  <div class="note"><b>引用的严谨性</b>：论文一/二/三的书目信息已核对（DOI 见上）。相关工作中的次要作者名单与 ADVOCAT 的精确求解器，建议在正式引用前按链接再核一遍（我已在上面标注）。</div>`;

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

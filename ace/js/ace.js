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

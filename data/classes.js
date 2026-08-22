/* RISC-V encoding-space classification + protection-domain data (English). */
window.RISCV = window.RISCV || {};
(function(){
  const R = window.RISCV;

  /* ---------- 32-bit major-opcode space (opcode[6:0]) ---------- */
  R.OPCODE_MAP = [
    {op:"0000011",nm:"LOAD",      cat:"std",  note:"Integer loads"},
    {op:"0000111",nm:"LOAD-FP",   cat:"fp",   note:"FP / vector loads"},
    {op:"0001011",nm:"custom-0",  cat:"custom", note:"Custom"},
    {op:"0001111",nm:"MISC-MEM",  cat:"misc", note:"FENCE / FENCE.I"},
    {op:"0010011",nm:"OP-IMM",    cat:"std",  note:"Immediate arithmetic"},
    {op:"0010111",nm:"AUIPC",     cat:"std",  note:"PC-relative upper"},
    {op:"0011011",nm:"OP-IMM-32", cat:"std",  note:"Word immediate (RV64)"},
    {op:"0011111",nm:"48-bit",    cat:"reserved", note:"Reserved"},
    {op:"0100011",nm:"STORE",     cat:"std",  note:"Integer stores"},
    {op:"0100111",nm:"STORE-FP",  cat:"fp",   note:"FP / vector stores"},
    {op:"0101011",nm:"custom-1",  cat:"custom", note:"Custom"},
    {op:"0101111",nm:"AMO",       cat:"std",  note:"Atomic memory ops"},
    {op:"0110011",nm:"OP",        cat:"std",  note:"Register arithmetic"},
    {op:"0110111",nm:"LUI",       cat:"std",  note:"Load upper immediate"},
    {op:"0111011",nm:"OP-32",     cat:"std",  note:"Word register ops (RV64)"},
    {op:"0111111",nm:"64-bit",    cat:"reserved", note:"Reserved"},
    {op:"1000011",nm:"FMADD",     cat:"fp",   note:"Fused multiply-add"},
    {op:"1000111",nm:"FMSUB",     cat:"fp",   note:"Fused multiply-sub"},
    {op:"1001011",nm:"FNMSUB",    cat:"fp",   note:"Fused neg-mul-sub"},
    {op:"1001111",nm:"FNMADD",    cat:"fp",   note:"Fused neg-mul-add"},
    {op:"1010011",nm:"OP-FP",     cat:"fp",   note:"FP arithmetic / convert"},
    {op:"1010111",nm:"OP-V",      cat:"fp",   note:"Vector arithmetic"},
    {op:"1011011",nm:"custom-2",  cat:"custom", note:"Custom"},
    {op:"1011111",nm:"48-bit",    cat:"reserved", note:"Reserved"},
    {op:"1100011",nm:"BRANCH",    cat:"std",  note:"Conditional branches"},
    {op:"1100111",nm:"JALR",      cat:"std",  note:"Jump and link register"},
    {op:"1101011",nm:"reserved",  cat:"reserved", note:"Reserved"},
    {op:"1101111",nm:"JAL",       cat:"std",  note:"Jump and link"},
    {op:"1110011",nm:"SYSTEM",    cat:"std",  note:"CSR / trap / fence.vma"},
    {op:"1110111",nm:"reserved",  cat:"reserved", note:"Reserved"},
    {op:"1111011",nm:"custom-3",  cat:"custom", note:"Custom"},
    {op:"1111111",nm:"80-bit",    cat:"reserved", note:"Reserved"},
  ];

  /* ---------- 32-bit instruction format families (bit-field layout) ---------- */
  R.FORMATS = [
    {name:"R",   row:"funct7 · rs2 · rs1 · funct3 · rd · opcode", desc:"Register-register arithmetic/logic"},
    {name:"I",   row:"imm[11:0] · rs1 · funct3 · rd · opcode",    desc:"Immediate / load / JALR / CSR"},
    {name:"S",   row:"imm[11:5] · rs2 · rs1 · funct3 · imm[4:0] · opcode", desc:"Store (immediate split in two)"},
    {name:"B",   row:"imm[12|10:5] · rs2 · rs1 · funct3 · imm[4:1|11] · opcode", desc:"Branch (immediate scattered)"},
    {name:"U",   row:"imm[31:12] · rd · opcode",                  desc:"LUI / AUIPC upper immediate"},
    {name:"J",   row:"imm[20|10:1|11|19:12] · rd · opcode",       desc:"JAL (immediate scattered)"},
    {name:"R4",  row:"rs3 · fmt · rs2 · rs1 · rm · rd · opcode",  desc:"Fused multiply-add (3 sources + rm)"},
    {name:"AMO", row:"funct5 · aq · rl · rs2 · rs1 · funct3 · rd · opcode", desc:"Atomic memory operation"},
    {name:"CSR", row:"csr[11:0] · rs1/uimm · funct3 · rd · opcode", desc:"Control-status-register access"},
    {name:"V",   row:"funct6 · vm · vs2 · vs1/rs1/imm · funct3 · vd · opcode", desc:"Vector arithmetic (OP-V)"},
    {name:"VLD", row:"nf · mew · mop · vm · lumop/sumop · rs1 · width · vd/vs3 · opcode", desc:"Vector load/store"},
  ];

  /* ---------- protection domains: privilege levels ---------- */
  R.PRIV_LEVELS = [
    {key:"U",enc:"00",name:"User (U)",css:"u",desc:"Runs applications; accesses only U-level CSRs and pages with PTE.U=1."},
    {key:"S",enc:"01",name:"Supervisor (S)",css:"s",desc:"Runs the OS kernel; page tables, S-level CSRs, trap delegation, SFENCE.VMA."},
    {key:"H",enc:"10",name:"(reserved / Hypervisor)",css:"h",desc:"Encoding reserved; used by the H (hypervisor) extension."},
    {key:"M",enc:"11",name:"Machine (M)",css:"m",desc:"Highest privilege; PMP, interrupts, M-level CSRs, physical resource control."},
  ];

  /* ---------- protection domains: CSR address-space convention ---------- */
  R.CSR_ADDR = [
    {bits:"11–10",name:"Read/write attribute",desc:"00/01 = read-write, 10/11 = read-only (bit 11 = RO).",css:"ro"},
    {bits:"9–8",name:"Minimum privilege",desc:"00 = U, 01 = S, 10 = H, 11 = M.",css:"priv"},
    {bits:"7–0",name:"CSR number",desc:"Register number within the privilege level.",css:"num"},
  ];
  R.CSR_EXAMPLES = [
    {name:"fflags / frm / fcsr",priv:"U",ro:false,desc:"Floating-point status: exception flags / rounding mode / combined."},
    {name:"sstatus / sie / stvec / sepc / satp",priv:"S",ro:false,desc:"Supervisor state, interrupt enable, trap vector, exception PC, page-table base."},
    {name:"mstatus / mie / mtvec / mepc / mcause / mtval",priv:"M",ro:false,desc:"Machine core trap and state registers."},
    {name:"mcycle / minstret / cycle / time",priv:"M",ro:true,desc:"Counters/timers (read-only CSRs with bit 11 = 1)."},
    {name:"pmpcfg0–15 / pmpaddr0–63",priv:"M",ro:false,desc:"Physical Memory Protection configuration/address registers."},
  ];

  /* ---------- protection domains: PMP ---------- */
  R.PMP_MODES = [
    {a:"000",name:"OFF",desc:"Region disabled — no access (default)."},
    {a:"001",name:"TOR",desc:"Top-of-Range: address in [pmpaddr[i-1], pmpaddr[i])."},
    {a:"010",name:"NA4",desc:"Naturally-aligned 4-byte region."},
    {a:"011",name:"NAPOT",desc:"Naturally-aligned power-of-two region (≥ 8 bytes)."},
  ];
  R.PMP_FIELDS = [
    {f:"L",desc:"Locked: pmpcfg/pmpaddr writes are refused until reset."},
    {f:"R/W/X",desc:"Read/write/execute permission. W=1,R=0 reserved; R/W/X normally set together."},
    {f:"A",desc:"Address-matching mode (OFF/TOR/NA4/NAPOT)."},
  ];
  R.PMP_NOTES = [
    "M-mode accesses are only constrained by PMP when a region has L=1; otherwise M-mode bypasses PMP.",
    "sPMP delegates PMP to S-mode; ePMP/Smepmp forces M-mode to also obey PMP (anti-ROP).",
    "PMA (Physical Memory Attributes) complements PMP: PMP grants permission, PMA describes intrinsic memory properties.",
  ];

  /* ---------- protection domains: Sv39 paging ---------- */
  R.PAGING = {
    name:"Sv39 (39-bit virtual → 56-bit physical address)",
    levels:[
      {name:"VPN[2]",bits:"38–30",tbl:"L2 page table (root, pointed by satp.PPN)"},
      {name:"VPN[1]",bits:"29–21",tbl:"L1 page table"},
      {name:"VPN[0]",bits:"20–12",tbl:"L0 page table → leaf PTE provides PPN[2:0]"},
      {name:"offset",bits:"11–0",tbl:"In-page offset, passed through to the physical address"},
    ],
    pte:"PTE flags: V(alid) R(ead) W(rite) eX(ecute) U(ser) G(lobal) A(ccessed) D(irty). U=0 ⇒ S/M accessible; U=1 requires sstatus.SUM=1 for S-mode access to user pages.",
    notes:[
      "Under Sv39 the U bit separates user vs kernel pages: kernel pages PTE.U=0, user pages PTE.U=1.",
      "sstatus.MXR lets executable pages (PTE.X=1) be read, for execute-read sharing.",
      "M-mode bypasses paging entirely (unless the H extension's two-stage translation is active).",
    ],
  };

  /* ---------- protection domains: privileged instructions ---------- */
  R.PRIV_INST = [
    {ins:"ECALL",u:true,s:true,m:true,note:"Environment call: trap to a higher privilege level."},
    {ins:"EBREAK",u:true,s:true,m:true,note:"Breakpoint: debug exception."},
    {ins:"WFI",u:"*",s:"*",m:true,note:"Wait for interrupt; lower levels may trap (TW bit)."},
    {ins:"SRET",u:false,s:true,m:true,note:"S-mode (and above): return to sepc."},
    {ins:"MRET",u:false,s:false,m:true,note:"M-mode only: return to mepc."},
    {ins:"SFENCE.VMA",u:false,s:true,m:true,note:"S/M only: TLB invalidate (TVM-controlled)."},
    {ins:"CSR access",u:"U CSRs",s:"U+S",m:"All",note:"CSR address bits 9–8 set the minimum privilege."},
  ];

  R.MODE_MATRIX = [
    {row:"Integer / FP / atomic arithmetic",u:"✓",s:"✓",m:"✓"},
    {row:"Loads / stores",u:"✓",s:"✓",m:"✓"},
    {row:"FENCE / FENCE.I",u:"✓",s:"✓",m:"✓"},
    {row:"ECALL / EBREAK",u:"✓",s:"✓",m:"✓"},
    {row:"WFI / SFENCE.VMA",u:"restricted",s:"✓",m:"✓"},
    {row:"SRET",u:"—",s:"✓",m:"✓"},
    {row:"MRET",u:"—",s:"—",m:"✓"},
    {row:"CSR (U-level)",u:"✓",s:"✓",m:"✓"},
    {row:"CSR (S-level)",u:"—",s:"✓",m:"✓"},
    {row:"CSR (M-level) / PMP",u:"—",s:"—",m:"✓"},
  ];
})();

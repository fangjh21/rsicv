/*
 * RISC-V scalar instruction database.
 * Encodings follow the RISC-V Instruction Set Manual.
 * Golden models follow Spike (riscv-isa-sim) — riscv/insns/*.h + Berkeley SoftFloat.
 */
window.RISCV = window.RISCV || {};
(function(){
  const I = [];
  const add = o => I.push(o);

  function R(n,e,asm,f7,f3,op,g,d,sail){ add({name:n,ext:e,type:"R",asm,values:{funct7:f7,funct3:f3,opcode:op},group:g,desc:d,sail}); }
  function Ii(n,e,asm,f3,op,g,d,sail){ add({name:n,ext:e,type:"I",asm,values:{funct3:f3,opcode:op},group:g,desc:d,sail}); }
  function Is(n,e,asm,f7,f3,op,g,d,sail){ add({name:n,ext:e,type:"Is",asm,values:{funct7:f7,funct3:f3,opcode:op},group:g,desc:d,sail}); }
  function S(n,e,asm,f3,op,g,d,sail){ add({name:n,ext:e,type:"S",asm,values:{funct3:f3,opcode:op},group:g,desc:d,sail}); }
  function B(n,e,asm,f3,op,g,d,sail){ add({name:n,ext:e,type:"B",asm,values:{funct3:f3,opcode:op},group:g,desc:d,sail}); }
  function U(n,e,asm,op,g,d,sail){ add({name:n,ext:e,type:"U",asm,values:{opcode:op},group:g,desc:d,sail}); }
  function J(n,e,asm,op,g,d,sail){ add({name:n,ext:e,type:"J",asm,values:{opcode:op},group:g,desc:d,sail}); }
  function R4(n,e,asm,fmt,op,g,d,sail){ add({name:n,ext:e,type:"R4",asm,values:{fmt,opcode:op},group:g,desc:d,sail}); }
  function FPR(n,e,asm,f7,op,g,d,sail,rs2){ const v={funct7:f7,opcode:op}; if(rs2)v.rs2=rs2; add({name:n,ext:e,type:"FPR",asm,values:v,group:g,desc:d,sail}); }
  function FPC(n,e,asm,f7,f3,op,g,d,sail,rs2){ const v={funct7:f7,funct3:f3,opcode:op}; if(rs2)v.rs2=rs2; add({name:n,ext:e,type:"FPC",asm,values:v,group:g,desc:d,sail}); }
  function AMO(n,e,asm,f5,f3,g,d,sail){ add({name:n,ext:e,type:"AMO",asm,values:{funct5:f5,funct3:f3,opcode:"0101111"},group:g,desc:d,sail}); }
  function CSR(n,e,asm,f3,g,d,sail){ add({name:n,ext:e,type:"CSR",asm,values:{funct3:f3,opcode:"1110011"},group:g,desc:d,sail}); }
  function SYS(n,e,asm,vals,g,d,sail){ add({name:n,ext:e,type:"SYS",asm,values:Object.assign({opcode:"1110011"},vals),group:g,desc:d,sail}); }

  /* ============================ RV32I ============================ */
  U("LUI","RV32I","LUI rd, imm[31:12]","0110111","U",
    "Place the 20-bit upper immediate into the high 20 bits of rd; low 12 bits cleared.",
    "WRITE_RD(insn.u_imm());");
  U("AUIPC","RV32I","AUIPC rd, imm[31:12]","0010111","U",
    "Add imm<<12 to the PC and write the result to rd.",
    "WRITE_RD(insn.u_imm() + pc);");
  J("JAL","RV32I","JAL rd, offset[20:1]","1101111","J",
    "Jump and link: save PC+4 in rd, jump to PC + offset.",
    "reg_t tmp = npc;\nset_pc(insn.j_imm() + pc);\nWRITE_RD(tmp);");
  Ii("JALR","RV32I","JALR rd, rs1, imm[11:0]","000","1100111","J",
    "Jump and link register: save PC+4 in rd, jump to rs1 + imm (LSB cleared).",
    "reg_t tmp = npc;\nset_pc((RS1 + insn.i_imm()) & ~reg_t(1));\nWRITE_RD(tmp);");
  B("BEQ","RV32I","BEQ rs1, rs2, offset","000","1100011","B","Branch if rs1 == rs2.",
    "if (RS1 == RS2) set_pc(insn.b_imm() + pc);\nelse npc = pc + 4;");
  B("BNE","RV32I","BNE rs1, rs2, offset","001","1100011","B","Branch if rs1 != rs2.",
    "if (RS1 != RS2) set_pc(insn.b_imm() + pc);\nelse npc = pc + 4;");
  B("BLT","RV32I","BLT rs1, rs2, offset","100","1100011","B","Branch if rs1 < rs2 (signed).",
    "if (sreg_t(RS1) < sreg_t(RS2)) set_pc(insn.b_imm() + pc);\nelse npc = pc + 4;");
  B("BGE","RV32I","BGE rs1, rs2, offset","101","1100011","B","Branch if rs1 >= rs2 (signed).",
    "if (sreg_t(RS1) >= sreg_t(RS2)) set_pc(insn.b_imm() + pc);\nelse npc = pc + 4;");
  B("BLTU","RV32I","BLTU rs1, rs2, offset","110","1100011","B","Branch if rs1 < rs2 (unsigned).",
    "if (RS1 < RS2) set_pc(insn.b_imm() + pc);\nelse npc = pc + 4;");
  B("BGEU","RV32I","BGEU rs1, rs2, offset","111","1100011","B","Branch if rs1 >= rs2 (unsigned).",
    "if (RS1 >= RS2) set_pc(insn.b_imm() + pc);\nelse npc = pc + 4;");
  Ii("LB","RV32I","LB rd, imm[11:0](rs1)","000","0000011","LOAD","Load signed byte, sign-extend to XLEN.",
    "WRITE_RD(MMU.load<int8_t>(RS1 + insn.i_imm()));");
  Ii("LH","RV32I","LH rd, imm[11:0](rs1)","001","0000011","LOAD","Load signed halfword, sign-extend to XLEN.",
    "WRITE_RD(MMU.load<int16_t>(RS1 + insn.i_imm()));");
  Ii("LW","RV32I","LW rd, imm[11:0](rs1)","010","0000011","LOAD","Load 32-bit word, sign-extend to XLEN.",
    "WRITE_RD(MMU.load<int32_t>(RS1 + insn.i_imm()));");
  Ii("LBU","RV32I","LBU rd, imm[11:0](rs1)","100","0000011","LOAD","Load unsigned byte, zero-extend.",
    "WRITE_RD(MMU.load<uint8_t>(RS1 + insn.i_imm()));");
  Ii("LHU","RV32I","LHU rd, imm[11:0](rs1)","101","0000011","LOAD","Load unsigned halfword, zero-extend.",
    "WRITE_RD(MMU.load<uint16_t>(RS1 + insn.i_imm()));");
  S("SB","RV32I","SB rs2, imm[11:0](rs1)","000","0100011","STORE","Store the low 8 bits of rs2.",
    "MMU.store<uint8_t>(RS1 + insn.s_imm(), RS2);");
  S("SH","RV32I","SH rs2, imm[11:0](rs1)","001","0100011","STORE","Store the low 16 bits of rs2.",
    "MMU.store<uint16_t>(RS1 + insn.s_imm(), RS2);");
  S("SW","RV32I","SW rs2, imm[11:0](rs1)","010","0100011","STORE","Store the low 32 bits of rs2.",
    "MMU.store<uint32_t>(RS1 + insn.s_imm(), RS2);");
  Ii("ADDI","RV32I","ADDI rd, rs1, imm[11:0]","000","0010011","OP-IMM","Add sign-extended immediate.",
    "WRITE_RD(sext_xlen(RS1 + insn.i_imm()));");
  Ii("SLTI","RV32I","SLTI rd, rs1, imm[11:0]","010","0010011","OP-IMM","rd = rs1 < imm (signed).",
    "WRITE_RD(sreg_t(RS1) < sreg_t(insn.i_imm()));");
  Ii("SLTIU","RV32I","SLTIU rd, rs1, imm[11:0]","011","0010011","OP-IMM","rd = rs1 < imm (unsigned).",
    "WRITE_RD(ureg_t(RS1) < ureg_t(insn.i_imm()));");
  Ii("XORI","RV32I","XORI rd, rs1, imm[11:0]","100","0010011","OP-IMM","Bitwise XOR with sign-extended immediate.",
    "WRITE_RD(RS1 ^ insn.i_imm());");
  Ii("ORI","RV32I","ORI rd, rs1, imm[11:0]","110","0010011","OP-IMM","Bitwise OR with sign-extended immediate.",
    "WRITE_RD(RS1 | insn.i_imm());");
  Ii("ANDI","RV32I","ANDI rd, rs1, imm[11:0]","111","0010011","OP-IMM","Bitwise AND with sign-extended immediate.",
    "WRITE_RD(RS1 & insn.i_imm());");
  Is("SLLI","RV32I","SLLI rd, rs1, shamt","0000000","001","0010011","OP-IMM","Logical left shift by immediate.",
    "WRITE_RD(sext_xlen(RS1 << insn.shamt()));");
  Is("SRLI","RV32I","SRLI rd, rs1, shamt","0000000","101","0010011","OP-IMM","Logical right shift by immediate.",
    "WRITE_RD(sext_xlen(zext_xlen(RS1) >> insn.shamt()));");
  Is("SRAI","RV32I","SRAI rd, rs1, shamt","0100000","101","0010011","OP-IMM","Arithmetic right shift by immediate.",
    "WRITE_RD(sext_xlen(sreg_t(RS1) >> insn.shamt()));");
  R("ADD","RV32I","ADD rd, rs1, rs2","0000000","000","0110011","OP","Add.",
    "WRITE_RD(sext_xlen(RS1 + RS2));");
  R("SUB","RV32I","SUB rd, rs1, rs2","0100000","000","0110011","OP","Subtract.",
    "WRITE_RD(sext_xlen(RS1 - RS2));");
  R("SLL","RV32I","SLL rd, rs1, rs2","0000000","001","0110011","OP","Logical left shift by rs2.",
    "WRITE_RD(sext_xlen(RS1 << (RS2 & (xlen-1))));");
  R("SLT","RV32I","SLT rd, rs1, rs2","0000000","010","0110011","OP","rd = rs1 < rs2 (signed).",
    "WRITE_RD(sreg_t(RS1) < sreg_t(RS2));");
  R("SLTU","RV32I","SLTU rd, rs1, rs2","0000000","011","0110011","OP","rd = rs1 < rs2 (unsigned).",
    "WRITE_RD(ureg_t(RS1) < ureg_t(RS2));");
  R("XOR","RV32I","XOR rd, rs1, rs2","0000000","100","0110011","OP","Bitwise XOR.",
    "WRITE_RD(RS1 ^ RS2);");
  R("SRL","RV32I","SRL rd, rs1, rs2","0000000","101","0110011","OP","Logical right shift by rs2.",
    "WRITE_RD(sext_xlen(zext_xlen(RS1) >> (RS2 & (xlen-1))));");
  R("SRA","RV32I","SRA rd, rs1, rs2","0100000","101","0110011","OP","Arithmetic right shift by rs2.",
    "WRITE_RD(sext_xlen(sreg_t(RS1) >> (RS2 & (xlen-1))));");
  R("OR","RV32I","OR rd, rs1, rs2","0000000","110","0110011","OP","Bitwise OR.",
    "WRITE_RD(RS1 | RS2);");
  R("AND","RV32I","AND rd, rs1, rs2","0000000","111","0110011","OP","Bitwise AND.",
    "WRITE_RD(RS1 & RS2);");
  add({name:"FENCE",ext:"RV32I",type:"FENCE",asm:"FENCE pred, succ",
       values:{funct3:"000",opcode:"0001111",rs1:"00000",rd:"00000"}, group:"FENCE",
       desc:"Memory-ordering fence: order the predecessor set before the successor set.",
       sail:"MMU.fence();"});
  add({name:"FENCE.I",ext:"Zifencei",type:"I",asm:"FENCE.I",
       values:{funct3:"001",opcode:"0001111","imm[11:0]":"000000000000",rs1:"00000",rd:"00000"}, group:"FENCE",
       desc:"Instruction-fetch fence: make prior stores visible to subsequent fetches.",
       sail:"MMU.fence_i();"});
  add({name:"ECALL",ext:"RV32I",type:"I",asm:"ECALL",
       values:{funct3:"000",opcode:"1110011",funct7:"0000000","imm[11:0]":"000000000000",rs2:"00000",rs1:"00000",rd:"00000"}, group:"SYSTEM",
       desc:"Environment call: trap to the execution environment.",
       sail:"throw trap_user_ecall();"});
  add({name:"EBREAK",ext:"RV32I",type:"I",asm:"EBREAK",
       values:{funct3:"000",opcode:"1110011",funct7:"0000000","imm[11:0]":"000000000001",rs2:"00001",rs1:"00000",rd:"00000"}, group:"SYSTEM",
       desc:"Breakpoint: raise a debugger breakpoint exception.",
       sail:"throw trap_breakpoint();"});

  /* ============================ RV64I ============================ */
  Ii("LWU","RV64I","LWU rd, imm[11:0](rs1)","110","0000011","LOAD","Load 32-bit word, zero-extend to 64 bits.",
    "WRITE_RD(MMU.load<uint32_t>(RS1 + insn.i_imm()));");
  Ii("LD","RV64I","LD rd, imm[11:0](rs1)","011","0000011","LOAD","Load 64-bit doubleword.",
    "WRITE_RD(MMU.load<int64_t>(RS1 + insn.i_imm()));");
  S("SD","RV64I","SD rs2, imm[11:0](rs1)","011","0100011","STORE","Store 64-bit doubleword.",
    "MMU.store<uint64_t>(RS1 + insn.s_imm(), RS2);");
  Ii("ADDIW","RV64I","ADDIW rd, rs1, imm[11:0]","000","0011011","OP-IMM-32","Add immediate (32-bit), sign-extend result.",
    "WRITE_RD(sext32(insn.i_imm() + RS1));");
  Is("SLLIW","RV64I","SLLIW rd, rs1, shamt","0000000","001","0011011","OP-IMM-32","Word logical left shift immediate.",
    "WRITE_RD(sext32(RS1 << insn.shamt()));");
  Is("SRLIW","RV64I","SRLIW rd, rs1, shamt","0000000","101","0011011","OP-IMM-32","Word logical right shift immediate.",
    "WRITE_RD(sext32((uint32_t)RS1 >> insn.shamt()));");
  Is("SRAIW","RV64I","SRAIW rd, rs1, shamt","0100000","101","0011011","OP-IMM-32","Word arithmetic right shift immediate.",
    "WRITE_RD(sext32(int32_t(RS1) >> insn.shamt()));");
  R("ADDW","RV64I","ADDW rd, rs1, rs2","0000000","000","0111011","OP-32","Add low 32 bits, sign-extend.",
    "WRITE_RD(sext32(RS1 + RS2));");
  R("SUBW","RV64I","SUBW rd, rs1, rs2","0100000","000","0111011","OP-32","Subtract low 32 bits, sign-extend.",
    "WRITE_RD(sext32(RS1 - RS2));");
  R("SLLW","RV64I","SLLW rd, rs1, rs2","0000000","001","0111011","OP-32","Word logical left shift.",
    "WRITE_RD(sext32(RS1 << (RS2 & 0x1F)));");
  R("SRLW","RV64I","SRLW rd, rs1, rs2","0000000","101","0111011","OP-32","Word logical right shift.",
    "WRITE_RD(sext32((uint32_t)RS1 >> (RS2 & 0x1F)));");
  R("SRAW","RV64I","SRAW rd, rs1, rs2","0100000","101","0111011","OP-32","Word arithmetic right shift.",
    "WRITE_RD(sext32(int32_t(RS1) >> (RS2 & 0x1F)));");

  /* ============================ M extension ============================ */
  R("MUL","M","MUL rd, rs1, rs2","0000001","000","0110011","M","Multiply (low XLEN bits).",
    "WRITE_RD(sext_xlen(RS1 * RS2));");
  R("MULH","M","MULH rd, rs1, rs2","0000001","001","0110011","M","Signed multiply-high.",
    "WRITE_RD(mulh(RS1, RS2));");
  R("MULHSU","M","MULHSU rd, rs1, rs2","0000001","010","0110011","M","Signed x unsigned multiply-high.",
    "WRITE_RD(mulhsu(RS1, RS2));");
  R("MULHU","M","MULHU rd, rs1, rs2","0000001","011","0110011","M","Unsigned multiply-high.",
    "WRITE_RD(mulhu(RS1, RS2));");
  R("DIV","M","DIV rd, rs1, rs2","0000001","100","0110011","M","Signed division (div-by-zero → -1, overflow → dividend).",
    "if (RS2 == 0) WRITE_RD(-1);\nelse if (RS1 == INT64_MIN && RS2 == -1) WRITE_RD(RS1);\nelse WRITE_RD(sreg_t(RS1) / sreg_t(RS2));");
  R("DIVU","M","DIVU rd, rs1, rs2","0000001","101","0110011","M","Unsigned division (div-by-zero → -1).",
    "WRITE_RD(RS2 == 0 ? -1 : RS1 / RS2);");
  R("REM","M","REM rd, rs1, rs2","0000001","110","0110011","M","Signed remainder.",
    "if (RS2 == 0) WRITE_RD(RS1);\nelse if (RS1 == INT64_MIN && RS2 == -1) WRITE_RD(0);\nelse WRITE_RD(sreg_t(RS1) % sreg_t(RS2));");
  R("REMU","M","REMU rd, rs1, rs2","0000001","111","0110011","M","Unsigned remainder.",
    "WRITE_RD(RS2 == 0 ? RS1 : RS1 % RS2);");
  R("MULW","M","MULW rd, rs1, rs2","0000001","000","0111011","M","Word multiply (sign-extend).",
    "WRITE_RD(sext32(RS1 * RS2));");
  R("DIVW","M","DIVW rd, rs1, rs2","0000001","100","0111011","M","Word signed division.",
    "WRITE_RD(sext32(RS2 == 0 ? -1 : (RS1 == INT32_MIN && RS2 == -1 ? RS1 : int32_t(RS1) / int32_t(RS2))));");
  R("DIVUW","M","DIVUW rd, rs1, rs2","0000001","101","0111011","M","Word unsigned division.",
    "WRITE_RD(sext32(RS2 == 0 ? UINT32_MAX : uint32_t(RS1) / uint32_t(RS2)));");
  R("REMW","M","REMW rd, rs1, rs2","0000001","110","0111011","M","Word signed remainder.",
    "WRITE_RD(sext32(RS2 == 0 ? RS1 : (RS1 == INT32_MIN && RS2 == -1 ? 0 : int32_t(RS1) % int32_t(RS2))));");
  R("REMUW","M","REMUW rd, rs1, rs2","0000001","111","0111011","M","Word unsigned remainder.",
    "WRITE_RD(sext32(RS2 == 0 ? uint32_t(RS1) : uint32_t(RS1) % uint32_t(RS2)));");

  /* ============================ A extension ============================ */
  const AMO_D = {"AMOADD":"Atomically add","AMOSWAP":"Atomically swap","AMOXOR":"Atomically XOR","AMOOR":"Atomically OR","AMOAND":"Atomically AND","AMOMIN":"Atomic signed minimum","AMOMAX":"Atomic signed maximum","AMOMINU":"Atomic unsigned minimum","AMOMAXU":"Atomic unsigned maximum"};
  const AMO_OP = {"AMOADD":"RS2 + lhs","AMOSWAP":"RS2","AMOXOR":"RS2 ^ lhs","AMOOR":"RS2 | lhs","AMOAND":"RS2 & lhs","AMOMIN":"std::min(sreg_t(RS2), sreg_t(lhs))","AMOMAX":"std::max(sreg_t(RS2), sreg_t(lhs))","AMOMINU":"std::min(RS2, lhs)","AMOMAXU":"std::max(RS2, lhs)"};
  const F5 = {AMOADD:"00000",AMOSWAP:"00001",LR:"00010",SC:"00011",AMOXOR:"00100",AMOOR:"01000",AMOAND:"01100",AMOMIN:"10000",AMOMAX:"10100",AMOMINU:"11000",AMOMAXU:"11100"};
  AMO("LR.W","A","LR.W rd, (rs1)",F5.LR,"010","AMO","Load-reserved (word).",
    "require_align(RS1, 4);\nWRITE_RD(MMU.load_reserved<int32_t>(RS1));");
  AMO("SC.W","A","SC.W rd, rs2, (rs1)",F5.SC,"010","AMO","Store-conditional (word); rd=0 on success.",
    "require_align(RS1, 4);\nbool ok = MMU.store_conditional<uint32_t>(RS1, RS2);\nWRITE_RD(!ok);");
  for(const k of ["AMOADD","AMOSWAP","AMOXOR","AMOOR","AMOAND","AMOMIN","AMOMAX","AMOMINU","AMOMAXU"]){
    AMO(k+".W","A",k+".W rd, rs2, (rs1)",F5[k],"010","AMO",`${AMO_D[k]} (word).`,
      `require_align(RS1, 4);\nWRITE_RD(MMU.amo<uint32_t>(RS1, [&](uint32_t lhs){ return ${AMO_OP[k]}; }));`);
    AMO(k+".D","A",k+".D rd, rs2, (rs1)",F5[k],"011","AMO",`${AMO_D[k]} (doubleword, RV64).`,
      `require_align(RS1, 8);\nWRITE_RD(MMU.amo<uint64_t>(RS1, [&](uint64_t lhs){ return ${AMO_OP[k]}; }));`);
  }
  AMO("LR.D","A","LR.D rd, (rs1)",F5.LR,"011","AMO","Load-reserved (doubleword, RV64).",
    "require_align(RS1, 8);\nWRITE_RD(MMU.load_reserved<int64_t>(RS1));");
  AMO("SC.D","A","SC.D rd, rs2, (rs1)",F5.SC,"011","AMO","Store-conditional (doubleword, RV64).",
    "require_align(RS1, 8);\nbool ok = MMU.store_conditional<uint64_t>(RS1, RS2);\nWRITE_RD(!ok);");

  /* ============================ F extension ============================ */
  Ii("FLW","RV32F","FLW rd, imm[11:0](rs1)","010","0000111","FP-LD-ST","Load single-precision.",
    "require_fp;\nWRITE_FRD(f32(MMU.load<uint32_t>(RS1 + insn.i_imm())));");
  S("FSW","RV32F","FSW rs2, imm[11:0](rs1)","010","0100111","FP-LD-ST","Store single-precision.",
    "require_fp;\nMMU.store<uint32_t>(RS1 + insn.s_imm(), FRS1.v[0]);");
  R4("FMADD.S","RV32F","FMADD.S rd, rs1, rs2, rs3","00","1000011","R4","Fused multiply-add: rd = (rs1 x rs2) + rs3, single rounding.",
    "require_fp;\nWRITE_FRD(f32_mulAdd(f32(FRS1), f32(FRS2), f32(FRS3), RM));\nset_fp_exceptions;");
  R4("FMSUB.S","RV32F","FMSUB.S rd, rs1, rs2, rs3","00","1000111","R4","Fused multiply-subtract: rd = (rs1 x rs2) - rs3.",
    "require_fp;\nWRITE_FRD(f32_mulAdd(f32(FRS1), f32(FRS2), f32(FRS3.bits ^ 0x80000000U), RM));\nset_fp_exceptions;");
  R4("FNMSUB.S","RV32F","FNMSUB.S rd, rs1, rs2, rs3","00","1001011","R4","Fused negate-multiply-subtract: rd = -(rs1 x rs2) + rs3.",
    "require_fp;\nWRITE_FRD(f32_mulAdd(f32(FRS1.bits ^ 0x80000000U), f32(FRS2), f32(FRS3), RM));\nset_fp_exceptions;");
  R4("FNMADD.S","RV32F","FNMADD.S rd, rs1, rs2, rs3","00","1001111","R4","Fused negate-multiply-add: rd = -(rs1 x rs2) - rs3.",
    "require_fp;\nWRITE_FRD(f32_mulAdd(f32(FRS1.bits ^ 0x80000000U), f32(FRS2), f32(FRS3.bits ^ 0x80000000U), RM));\nset_fp_exceptions;");
  FPR("FADD.S","RV32F","FADD.S rd, rs1, rs2","0000000","1010011","FP-ARITH","Single-precision add.",
    "require_fp;\nWRITE_FRD(f32_add(f32(FRS1), f32(FRS2), RM));\nset_fp_exceptions;");
  FPR("FSUB.S","RV32F","FSUB.S rd, rs1, rs2","0000100","1010011","FP-ARITH","Single-precision subtract.",
    "require_fp;\nWRITE_FRD(f32_sub(f32(FRS1), f32(FRS2), RM));\nset_fp_exceptions;");
  FPR("FMUL.S","RV32F","FMUL.S rd, rs1, rs2","0001000","1010011","FP-ARITH","Single-precision multiply.",
    "require_fp;\nWRITE_FRD(f32_mul(f32(FRS1), f32(FRS2), RM));\nset_fp_exceptions;");
  FPR("FDIV.S","RV32F","FDIV.S rd, rs1, rs2","0001100","1010011","FP-ARITH","Single-precision divide.",
    "require_fp;\nWRITE_FRD(f32_div(f32(FRS1), f32(FRS2), RM));\nset_fp_exceptions;");
  FPR("FSQRT.S","RV32F","FSQRT.S rd, rs1","0101100","1010011","FP-ARITH","Single-precision square root.",
    "require_fp;\nWRITE_FRD(f32_sqrt(f32(FRS1), RM));\nset_fp_exceptions;","00000");
  FPC("FSGNJ.S","RV32F","FSGNJ.S rd, rs1, rs2","0010000","000","1010011","FP-SGN","Sign injection (rs2 sign).",
    "require_fp;\nWRITE_FRD(fsgnj32(FRS1, FRS2, false, false));");
  FPC("FSGNJN.S","RV32F","FSGNJN.S rd, rs1, rs2","0010000","001","1010011","FP-SGN","Sign injection (~rs2 sign).",
    "require_fp;\nWRITE_FRD(fsgnj32(FRS1, FRS2, true, false));");
  FPC("FSGNJX.S","RV32F","FSGNJX.S rd, rs1, rs2","0010000","010","1010011","FP-SGN","Sign injection (sign XOR).",
    "require_fp;\nWRITE_FRD(fsgnj32(FRS1, FRS2, false, true));");
  FPC("FMIN.S","RV32F","FMIN.S rd, rs1, rs2","0010100","000","1010011","FP-SGN","Single-precision minimum.",
    "require_fp;\nWRITE_FRD(f32_min(f32(FRS1), f32(FRS2)));\nset_fp_exceptions;");
  FPC("FMAX.S","RV32F","FMAX.S rd, rs1, rs2","0010100","001","1010011","FP-SGN","Single-precision maximum.",
    "require_fp;\nWRITE_FRD(f32_max(f32(FRS1), f32(FRS2)));\nset_fp_exceptions;");
  FPC("FEQ.S","RV32F","FEQ.S rd, rs1, rs2","1010000","010","1010011","FP-CMP","rd = (rs1 == rs2).",
    "require_fp;\nWRITE_RD(f32_eq(f32(FRS1), f32(FRS2)));\nset_fp_exceptions;");
  FPC("FLT.S","RV32F","FLT.S rd, rs1, rs2","1010000","001","1010011","FP-CMP","rd = (rs1 < rs2).",
    "require_fp;\nWRITE_RD(f32_lt(f32(FRS1), f32(FRS2)));\nset_fp_exceptions;");
  FPC("FLE.S","RV32F","FLE.S rd, rs1, rs2","1010000","000","1010011","FP-CMP","rd = (rs1 <= rs2).",
    "require_fp;\nWRITE_RD(f32_le(f32(FRS1), f32(FRS2)));\nset_fp_exceptions;");
  FPC("FCLASS.S","RV32F","FCLASS.S rd, rs1","1110000","001","1010011","FP-CLASS","Classify: 10-bit class mask.",
    "require_fp;\nWRITE_RD(f32_classify(f32(FRS1)));","00000");
  FPC("FMV.X.W","RV32F","FMV.X.W rd, rs1","1110000","000","1010011","FP-MV","Move FP bits to integer register.",
    "require_fp;\nWRITE_RD(sext32(FRS1.v[0]));","00000");
  FPC("FMV.W.X","RV32F","FMV.W.X rd, rs1","1111000","000","1010011","FP-MV","Move integer bits to FP register.",
    "require_fp;\nWRITE_FRD(f32(RS1));","00000");
  FPR("FCVT.W.S","RV32F","FCVT.W.S rd, rs1","1100000","1010011","FP-CVT","Convert SP → signed 32-bit int.",
    "require_fp;\nWRITE_RD(sext32(f32_to_i32(f32(FRS1), RM, true)));\nset_fp_exceptions;","00000");
  FPR("FCVT.WU.S","RV32F","FCVT.WU.S rd, rs1","1100000","1010011","FP-CVT","Convert SP → unsigned 32-bit int.",
    "require_fp;\nWRITE_RD(sext32(f32_to_ui32(f32(FRS1), RM, true)));\nset_fp_exceptions;","00001");
  FPR("FCVT.S.W","RV32F","FCVT.S.W rd, rs1","1101000","1010011","FP-CVT","Convert signed 32-bit int → SP.",
    "require_fp;\nWRITE_FRD(i32_to_f32(RS1, RM));\nset_fp_exceptions;","00000");
  FPR("FCVT.S.WU","RV32F","FCVT.S.WU rd, rs1","1101000","1010011","FP-CVT","Convert unsigned 32-bit int → SP.",
    "require_fp;\nWRITE_FRD(ui32_to_f32(RS1, RM));\nset_fp_exceptions;","00001");
  FPR("FCVT.L.S","RV64F","FCVT.L.S rd, rs1","1100000","1010011","FP-CVT","Convert SP → signed 64-bit int (RV64).",
    "require_fp;\nWRITE_RD(f32_to_i64(f32(FRS1), RM, true));\nset_fp_exceptions;","00010");
  FPR("FCVT.LU.S","RV64F","FCVT.LU.S rd, rs1","1100000","1010011","FP-CVT","Convert SP → unsigned 64-bit int (RV64).",
    "require_fp;\nWRITE_RD(f32_to_ui64(f32(FRS1), RM, true));\nset_fp_exceptions;","00011");
  FPR("FCVT.S.L","RV64F","FCVT.S.L rd, rs1","1101000","1010011","FP-CVT","Convert signed 64-bit int → SP (RV64).",
    "require_fp;\nWRITE_FRD(i64_to_f32(RS1, RM));\nset_fp_exceptions;","00010");
  FPR("FCVT.S.LU","RV64F","FCVT.S.LU rd, rs1","1101000","1010011","FP-CVT","Convert unsigned 64-bit int → SP (RV64).",
    "require_fp;\nWRITE_FRD(ui64_to_f32(RS1, RM));\nset_fp_exceptions;","00011");

  /* ============================ D extension ============================ */
  Ii("FLD","RV32D","FLD rd, imm[11:0](rs1)","011","0000111","FP-LD-ST","Load double-precision.",
    "require_fp;\nWRITE_FRD(f64(MMU.load<uint64_t>(RS1 + insn.i_imm())));");
  S("FSD","RV32D","FSD rs2, imm[11:0](rs1)","011","0100111","FP-LD-ST","Store double-precision.",
    "require_fp;\nMMU.store<uint64_t>(RS1 + insn.s_imm(), FRS1.v[0]);");
  R4("FMADD.D","RV32D","FMADD.D rd, rs1, rs2, rs3","01","1000011","R4","Fused multiply-add (double).",
    "require_fp;\nWRITE_FRD(f64_mulAdd(f64(FRS1), f64(FRS2), f64(FRS3), RM));\nset_fp_exceptions;");
  R4("FMSUB.D","RV32D","FMSUB.D rd, rs1, rs2, rs3","01","1000111","R4","Fused multiply-subtract (double).",
    "require_fp;\nWRITE_FRD(f64_mulAdd(f64(FRS1), f64(FRS2), f64(FRS3.bits ^ 0x8000000000000000ULL), RM));\nset_fp_exceptions;");
  R4("FNMSUB.D","RV32D","FNMSUB.D rd, rs1, rs2, rs3","01","1001011","R4","Fused negate-multiply-subtract (double).",
    "require_fp;\nWRITE_FRD(f64_mulAdd(f64(FRS1.bits ^ 0x8000000000000000ULL), f64(FRS2), f64(FRS3), RM));\nset_fp_exceptions;");
  R4("FNMADD.D","RV32D","FNMADD.D rd, rs1, rs2, rs3","01","1001111","R4","Fused negate-multiply-add (double).",
    "require_fp;\nWRITE_FRD(f64_mulAdd(f64(FRS1.bits ^ 0x8000000000000000ULL), f64(FRS2), f64(FRS3.bits ^ 0x8000000000000000ULL), RM));\nset_fp_exceptions;");
  FPR("FADD.D","RV32D","FADD.D rd, rs1, rs2","0000001","1010011","FP-ARITH","Double-precision add.",
    "require_fp;\nWRITE_FRD(f64_add(f64(FRS1), f64(FRS2), RM));\nset_fp_exceptions;");
  FPR("FSUB.D","RV32D","FSUB.D rd, rs1, rs2","0000101","1010011","FP-ARITH","Double-precision subtract.",
    "require_fp;\nWRITE_FRD(f64_sub(f64(FRS1), f64(FRS2), RM));\nset_fp_exceptions;");
  FPR("FMUL.D","RV32D","FMUL.D rd, rs1, rs2","0001001","1010011","FP-ARITH","Double-precision multiply.",
    "require_fp;\nWRITE_FRD(f64_mul(f64(FRS1), f64(FRS2), RM));\nset_fp_exceptions;");
  FPR("FDIV.D","RV32D","FDIV.D rd, rs1, rs2","0001101","1010011","FP-ARITH","Double-precision divide.",
    "require_fp;\nWRITE_FRD(f64_div(f64(FRS1), f64(FRS2), RM));\nset_fp_exceptions;");
  FPR("FSQRT.D","RV32D","FSQRT.D rd, rs1","0101101","1010011","FP-ARITH","Double-precision square root.",
    "require_fp;\nWRITE_FRD(f64_sqrt(f64(FRS1), RM));\nset_fp_exceptions;","00000");
  FPC("FSGNJ.D","RV32D","FSGNJ.D rd, rs1, rs2","0010001","000","1010011","FP-SGN","Sign injection (double).",
    "require_fp;\nWRITE_FRD(fsgnj64(FRS1, FRS2, false, false));");
  FPC("FSGNJN.D","RV32D","FSGNJN.D rd, rs1, rs2","0010001","001","1010011","FP-SGN","Sign injection, negated (double).",
    "require_fp;\nWRITE_FRD(fsgnj64(FRS1, FRS2, true, false));");
  FPC("FSGNJX.D","RV32D","FSGNJX.D rd, rs1, rs2","0010001","010","1010011","FP-SGN","Sign injection, XOR (double).",
    "require_fp;\nWRITE_FRD(fsgnj64(FRS1, FRS2, false, true));");
  FPC("FMIN.D","RV32D","FMIN.D rd, rs1, rs2","0010101","000","1010011","FP-SGN","Double-precision minimum.",
    "require_fp;\nWRITE_FRD(f64_min(f64(FRS1), f64(FRS2)));\nset_fp_exceptions;");
  FPC("FMAX.D","RV32D","FMAX.D rd, rs1, rs2","0010101","001","1010011","FP-SGN","Double-precision maximum.",
    "require_fp;\nWRITE_FRD(f64_max(f64(FRS1), f64(FRS2)));\nset_fp_exceptions;");
  FPC("FEQ.D","RV32D","FEQ.D rd, rs1, rs2","1010001","010","1010011","FP-CMP","rd = (rs1 == rs2) (double).",
    "require_fp;\nWRITE_RD(f64_eq(f64(FRS1), f64(FRS2)));\nset_fp_exceptions;");
  FPC("FLT.D","RV32D","FLT.D rd, rs1, rs2","1010001","001","1010011","FP-CMP","rd = (rs1 < rs2) (double).",
    "require_fp;\nWRITE_RD(f64_lt(f64(FRS1), f64(FRS2)));\nset_fp_exceptions;");
  FPC("FLE.D","RV32D","FLE.D rd, rs1, rs2","1010001","000","1010011","FP-CMP","rd = (rs1 <= rs2) (double).",
    "require_fp;\nWRITE_RD(f64_le(f64(FRS1), f64(FRS2)));\nset_fp_exceptions;");
  FPC("FCLASS.D","RV32D","FCLASS.D rd, rs1","1110001","001","1010011","FP-CLASS","Classify (double).",
    "require_fp;\nWRITE_RD(f64_classify(f64(FRS1)));","00000");
  FPC("FMV.X.D","RV64D","FMV.X.D rd, rs1","1110001","000","1010011","FP-MV","Move double bits to integer register.",
    "require_fp;\nWRITE_RD(FRS1.v[0]);","00000");
  FPC("FMV.D.X","RV64D","FMV.D.X rd, rs1","1111001","000","1010011","FP-MV","Move integer bits to double register.",
    "require_fp;\nWRITE_FRD(f64(RS1));","00000");
  FPR("FCVT.S.D","RV32D","FCVT.S.D rd, rs1","0100000","1010011","FP-CVT","Convert double → single.",
    "require_fp;\nWRITE_FRD(f64_to_f32(f64(FRS1), RM));\nset_fp_exceptions;","00001");
  FPR("FCVT.D.S","RV32D","FCVT.D.S rd, rs1","0100001","1010011","FP-CVT","Convert single → double.",
    "require_fp;\nWRITE_FRD(f32_to_f64(f32(FRS1)));","00000");
  FPR("FCVT.W.D","RV32D","FCVT.W.D rd, rs1","1100001","1010011","FP-CVT","Convert double → signed 32-bit int.",
    "require_fp;\nWRITE_RD(sext32(f64_to_i32(f64(FRS1), RM, true)));\nset_fp_exceptions;","00000");
  FPR("FCVT.WU.D","RV32D","FCVT.WU.D rd, rs1","1100001","1010011","FP-CVT","Convert double → unsigned 32-bit int.",
    "require_fp;\nWRITE_RD(sext32(f64_to_ui32(f64(FRS1), RM, true)));\nset_fp_exceptions;","00001");
  FPR("FCVT.D.W","RV32D","FCVT.D.W rd, rs1","1101001","1010011","FP-CVT","Convert signed 32-bit int → double.",
    "require_fp;\nWRITE_FRD(i32_to_f64(RS1, RM));\nset_fp_exceptions;","00000");
  FPR("FCVT.D.WU","RV32D","FCVT.D.WU rd, rs1","1101001","1010011","FP-CVT","Convert unsigned 32-bit int → double.",
    "require_fp;\nWRITE_FRD(ui32_to_f64(RS1, RM));\nset_fp_exceptions;","00001");
  FPR("FCVT.L.D","RV64D","FCVT.L.D rd, rs1","1100001","1010011","FP-CVT","Convert double → signed 64-bit int (RV64).",
    "require_fp;\nWRITE_RD(f64_to_i64(f64(FRS1), RM, true));\nset_fp_exceptions;","00010");
  FPR("FCVT.LU.D","RV64D","FCVT.LU.D rd, rs1","1100001","1010011","FP-CVT","Convert double → unsigned 64-bit int (RV64).",
    "require_fp;\nWRITE_RD(f64_to_ui64(f64(FRS1), RM, true));\nset_fp_exceptions;","00011");
  FPR("FCVT.D.L","RV64D","FCVT.D.L rd, rs1","1101001","1010011","FP-CVT","Convert signed 64-bit int → double (RV64).",
    "require_fp;\nWRITE_FRD(i64_to_f64(RS1, RM));\nset_fp_exceptions;","00010");
  FPR("FCVT.D.LU","RV64D","FCVT.D.LU rd, rs1","1101001","1010011","FP-CVT","Convert unsigned 64-bit int → double (RV64).",
    "require_fp;\nWRITE_FRD(ui64_to_f64(RS1, RM));\nset_fp_exceptions;","00011");

  /* ============================ Zicsr ============================ */
  CSR("CSRRW","Zicsr","CSRRW rd, csr, rs1","001","CSR","Atomic read/write: write rs1, old value → rd.",
    "reg_t old = READ_CSR(insn.csr());\nWRITE_CSR(insn.csr(), RS1);\nWRITE_RD(old);");
  CSR("CSRRS","Zicsr","CSRRS rd, csr, rs1","010","CSR","Atomic read-and-set bits.",
    "reg_t old = READ_CSR(insn.csr());\nif (insn.rs1()) WRITE_CSR(insn.csr(), old | RS1);\nWRITE_RD(old);");
  CSR("CSRRC","Zicsr","CSRRC rd, csr, rs1","011","CSR","Atomic read-and-clear bits.",
    "reg_t old = READ_CSR(insn.csr());\nif (insn.rs1()) WRITE_CSR(insn.csr(), old & ~RS1);\nWRITE_RD(old);");
  CSR("CSRRWI","Zicsr","CSRRWI rd, csr, uimm[4:0]","101","CSR","Atomic read/write immediate.",
    "reg_t old = READ_CSR(insn.csr());\nWRITE_CSR(insn.csr(), insn.zimm());\nWRITE_RD(old);");
  CSR("CSRRSI","Zicsr","CSRRSI rd, csr, uimm[4:0]","110","CSR","Atomic read-and-set immediate.",
    "reg_t old = READ_CSR(insn.csr());\nif (insn.zimm()) WRITE_CSR(insn.csr(), old | insn.zimm());\nWRITE_RD(old);");
  CSR("CSRRCI","Zicsr","CSRRCI rd, csr, uimm[4:0]","111","CSR","Atomic read-and-clear immediate.",
    "reg_t old = READ_CSR(insn.csr());\nif (insn.zimm()) WRITE_CSR(insn.csr(), old & ~insn.zimm());\nWRITE_RD(old);");

  /* ============================ Privileged / system ============================ */
  SYS("SRET","Priv","SRET",{funct7:"0001000",rs2:"00010",rs1:"00000",funct3:"000",rd:"00000"},"SYSTEM",
    "Supervisor trap return: PC = sepc, restore sstatus.",
    "set_pc(STATE.sepc);\nSTATE.sstatus->SPIE = 1; STATE.sstatus->SPP = PRV_U;\nset_privilege(STATE.sstatus->SPP);");
  SYS("MRET","Priv","MRET",{funct7:"0011000",rs2:"00010",rs1:"00000",funct3:"000",rd:"00000"},"SYSTEM",
    "Machine trap return: PC = mepc, restore mstatus.",
    "set_pc(STATE.mepc);\nSTATE.mstatus->MPIE = 1; STATE.mstatus->MPP = PRV_U;\nset_privilege(STATE.mstatus->MPP);");
  SYS("WFI","Priv","WFI",{funct7:"0001000",rs2:"00101",rs1:"00000",funct3:"000",rd:"00000"},"SYSTEM",
    "Wait for interrupt: stall the hart until a pending interrupt.",
    "wfi();");
  SYS("SFENCE.VMA","Priv","SFENCE.VMA rs1, rs2",{funct7:"0001001",funct3:"000",rd:"00000"},"SYSTEM",
    "Supervisor memory-management fence: invalidate TLB entries.",
    "MMU.flush_tlb();");

  /* ============================ C extension ============================ */
  function C(n,asm,enc,desc,sail){ add({name:n,ext:"C",type:"C",asm,cenc:enc,bit16:true,group:"C",desc,sail}); }
  C("C.ADDI4SPN","C.ADDI4SPN rd', nzuimm","000 | nzuimm[5:4|9:6|2|3] | rd' | 00","Add a non-zero multiple of 16 to sp (Q0).","WRITE_RD(sp + insn.nzuimm());");
  C("C.FLD","C.FLD rd', uimm(rs1')","001 | uimm[5:3] rs1' uimm[7:6] rd' | 00","Compressed double load (Q0).","require_fp;\nWRITE_FRD(f64(MMU.load<uint64_t>(RS1 + insn.ld_imm())));");
  C("C.LW","C.LW rd', uimm(rs1')","010 | uimm[5:3] rs1' uimm[2|6] rd' | 00","Compressed word load (Q0).","WRITE_RD(MMU.load<int32_t>(RS1 + insn.lw_imm()));");
  C("C.FLW","C.FLW rd', uimm(rs1')","011 | uimm[5:3] rs1' uimm[2|6] rd' | 00","Compressed single load (RV32, Q0).","require_fp;\nWRITE_FRD(f32(MMU.load<uint32_t>(RS1 + insn.lw_imm())));");
  C("C.LD","C.LD rd', uimm(rs1')","011 | uimm[5:3] rs1' uimm[7:6] rd' | 00","Compressed doubleword load (RV64, Q0).","WRITE_RD(MMU.load<int64_t>(RS1 + insn.ld_imm()));");
  C("C.FSD","C.FSD rs2', uimm(rs1')","101 | uimm[5:3] rs1' uimm[7:6] rs2' | 00","Compressed double store (Q0).","require_fp;\nMMU.store<uint64_t>(RS1 + insn.ld_imm(), FRS2.v[0]);");
  C("C.SW","C.SW rs2', uimm(rs1')","110 | uimm[5:3] rs1' uimm[2|6] rs2' | 00","Compressed word store (Q0).","MMU.store<uint32_t>(RS1 + insn.lw_imm(), RS2);");
  C("C.FSW","C.FSW rs2', uimm(rs1')","111 | uimm[5:3] rs1' uimm[2|6] rs2' | 00","Compressed single store (RV32, Q0).","require_fp;\nMMU.store<uint32_t>(RS1 + insn.lw_imm(), FRS2.v[0]);");
  C("C.SD","C.SD rs2', uimm(rs1')","111 | uimm[5:3] rs1' uimm[7:6] rs2' | 00","Compressed doubleword store (RV64, Q0).","MMU.store<uint64_t>(RS1 + insn.ld_imm(), RS2);");
  C("C.NOP","C.NOP","000 0 00000 00000 01","No operation (Q1).","/* no operation */");
  C("C.ADDI","C.ADDI rd, nzimm","000 imm[5] rd imm[4:0] 01","Compressed add immediate (Q1).","WRITE_RD(RS1 + insn.i_imm());");
  C("C.JAL","C.JAL offset","001 imm[11|4|9:8|10|6|7|3:1|5] 01","Compressed jump-and-link (RV32, Q1).","WRITE_RD(pc + 2);\nset_pc(pc + insn.j_imm());");
  C("C.ADDIW","C.ADDIW rd, imm","001 imm[5] rd imm[4:0] 01","Compressed word add immediate (RV64, Q1).","WRITE_RD(sext32(RS1 + insn.i_imm()));");
  C("C.LI","C.LI rd, imm","010 imm[5] rd imm[4:0] 01","Load 6-bit sign-extended immediate (Q1).","WRITE_RD(insn.i_imm());");
  C("C.ADDI16SP","C.ADDI16SP nzimm","011 imm[9] 00010 imm[4|6|8:7|5] 01","Add multiple of 16 to sp (Q1).","WRITE_RD(sp + insn.nzuimm());");
  C("C.LUI","C.LUI rd, nzimm","011 imm[17] rd imm[16:12] 01","Load upper immediate (Q1).","WRITE_RD(insn.u_imm());");
  C("C.SRLI","C.SRLI rd', shamt","100 0 00 rd' shamt[4:0] 01","Compressed logical right shift imm (Q1).","WRITE_RD((uint32_t)RS1 >> insn.shamt());");
  C("C.SRAI","C.SRAI rd', shamt","100 0 01 rd' shamt[4:0] 01","Compressed arithmetic right shift imm (Q1).","WRITE_RD(int32_t(RS1) >> insn.shamt());");
  C("C.ANDI","C.ANDI rd', imm","100 0 10 rd' imm[4:0] 01","Compressed AND immediate (Q1).","WRITE_RD(RS1 & insn.i_imm());");
  C("C.SUB","C.SUB rd', rs2'","100 0 11 rd' 00 rs2' 01","Compressed subtract (Q1).","WRITE_RD(RS1 - RS2);");
  C("C.XOR","C.XOR rd', rs2'","100 0 11 rd' 01 rs2' 01","Compressed XOR (Q1).","WRITE_RD(RS1 ^ RS2);");
  C("C.OR","C.OR rd', rs2'","100 0 11 rd' 10 rs2' 01","Compressed OR (Q1).","WRITE_RD(RS1 | RS2);");
  C("C.AND","C.AND rd', rs2'","100 0 11 rd' 11 rs2' 01","Compressed AND (Q1).","WRITE_RD(RS1 & RS2);");
  C("C.SUBW","C.SUBW rd', rs2'","100 1 11 rd' 00 rs2' 01","Compressed word subtract (RV64, Q1).","WRITE_RD(sext32(RS1 - RS2));");
  C("C.ADDW","C.ADDW rd', rs2'","100 1 11 rd' 01 rs2' 01","Compressed word add (RV64, Q1).","WRITE_RD(sext32(RS1 + RS2));");
  C("C.J","C.J offset","101 imm[11|4|9:8|10|6|7|3:1|5] 01","Compressed unconditional jump (Q1).","set_pc(pc + insn.j_imm());");
  C("C.BEQZ","C.BEQZ rs1', offset","110 imm[8|4:3] rs1' imm[7:6|2:1|5] 01","Branch if zero (Q1).","if (RS1 == 0) set_pc(pc + insn.b_imm());");
  C("C.BNEZ","C.BNEZ rs1', offset","111 imm[8|4:3] rs1' imm[7:6|2:1|5] 01","Branch if non-zero (Q1).","if (RS1 != 0) set_pc(pc + insn.b_imm());");
  C("C.SLLI","C.SLLI rd, nzuimm","000 nzuimm[5] rd nzuimm[4:0] 10","Compressed logical left shift imm (Q2).","WRITE_RD(RS1 << insn.shamt());");
  C("C.FLDSP","C.FLDSP rd, uimm","001 uimm[5] rd uimm[4:3|8:6] 10","Compressed double load, SP-relative (Q2).","require_fp;\nWRITE_FRD(f64(MMU.load<uint64_t>(sp + insn.ld_imm())));");
  C("C.LWSP","C.LWSP rd, uimm","010 uimm[5] rd uimm[4:2|7:6] 10","Compressed word load, SP-relative (Q2).","WRITE_RD(MMU.load<int32_t>(sp + insn.lw_imm()));");
  C("C.FLWSP","C.FLWSP rd, uimm","011 uimm[5] rd uimm[4:2|7:6] 10","Compressed single load, SP-relative (RV32, Q2).","require_fp;\nWRITE_FRD(f32(MMU.load<uint32_t>(sp + insn.lw_imm())));");
  C("C.LDSP","C.LDSP rd, uimm","011 uimm[5] rd uimm[4:3|8:6] 10","Compressed doubleword load, SP-relative (RV64, Q2).","WRITE_RD(MMU.load<int64_t>(sp + insn.ld_imm()));");
  C("C.JR","C.JR rs1","100 0 rs1 00000 10","Compressed register jump (Q2).","set_pc(RS1 & ~(reg_t)1);");
  C("C.MV","C.MV rd, rs2","100 0 rd rs2 10","Compressed register move (Q2).","WRITE_RD(RS2);");
  C("C.EBREAK","C.EBREAK","100 1 00000 00000 10","Compressed breakpoint (Q2).","throw trap_breakpoint();");
  C("C.JALR","C.JALR rs1","100 1 rs1 00000 10","Compressed jump-and-link register (Q2).","WRITE_RD(pc + 2);\nset_pc(RS1 & ~(reg_t)1);");
  C("C.ADD","C.ADD rd, rs2","100 1 rd rs2 10","Compressed add (Q2).","WRITE_RD(RS1 + RS2);");
  C("C.FSDSP","C.FSDSP rs2, uimm","101 uimm[5:3|8:6] rs2 10","Compressed double store, SP-relative (Q2).","require_fp;\nMMU.store<uint64_t>(sp + insn.ld_imm(), FRS2.v[0]);");
  C("C.SWSP","C.SWSP rs2, uimm","110 uimm[5:2|7:6] rs2 10","Compressed word store, SP-relative (Q2).","MMU.store<uint32_t>(sp + insn.lw_imm(), RS2);");
  C("C.FSWSP","C.FSWSP rs2, uimm","111 uimm[5:2|7:6] rs2 10","Compressed single store, SP-relative (RV32, Q2).","require_fp;\nMMU.store<uint32_t>(sp + insn.lw_imm(), FRS2.v[0]);");
  C("C.SDSP","C.SDSP rs2, uimm","111 uimm[5:3|8:6] rs2 10","Compressed doubleword store, SP-relative (RV64, Q2).","MMU.store<uint64_t>(sp + insn.ld_imm(), RS2);");

  ["FLW","FLD","FSW","FSD"].forEach(n => { const x = I.find(i=>i.name===n); if(x){ x.values.mop="00"; x.values.lumop="00000"; } });
  /* Mark the example instruction */
  const fmadd = I.find(x => x.name === "FMADD.S");
  fmadd.example = true;
  fmadd.diagram = "fmadd";
  fmadd.detail = "FMADD.S computes (rs1 × rs2) + rs3 exactly and rounds ONCE to single precision per rm. Spike calls the SoftFloat fused primitive f32_mulAdd, which keeps the full unrounded product+sum and rounds only the final result (unlike FMUL.S then FADD.S). Signaling-NaN inputs and overflow/underflow/inexact are reported through softfloat_exceptionFlags into fflags.";

  window.RISCV.INSTRUCTIONS = I;
})();

// SuperDepth - tables recovered verbatim from the SWF's ActionScript bytecode.
// Sources: jp.bio100.flash.superdepth.BitmapConst (sprite atlas), BitmapResource
// (palette), GameInstance (game constants). Do not hand-edit: see tools/sd_eval.py.
const SD = {};

// ---------------------------------------------------------------- sprite atlas
// SD.CONV[id] = [flags, wCells, hCells, nFrames, animSpeed, cell0,var0, cell1,var1, ...]
//   flags & 3   -> source sheet index (0=c08 8px, 1=c16 16px, 2=c32 32px, 3=boss 32px)
//   flags >> 8  -> horizontal tile repeat (clamped to >= 1), used by scenery strips
// Each frame is a (cell, paletteVariant) pair; cells run left-to-right then top-to-
// bottom through a single-column strip, `wCells * hCells` cells per frame.
SD.SHEETS = ['c08','c16','c32','boss'];
SD.KSZ = [8,16,32,32];
// Cells for a multi-row sprite step by the sheet's authored width, not by
// the sprite's. The 32px sheets were laid out 8 cells wide before being
// serialised into a single column; c08/c16 sprites are never both multi-row
// and multi-column, so consecutive indexing is correct for them.
SD.STRIDE = [1,1,8,8];
SD.CONV = [[2,2,1,1,1,0,0],[2,2,1,1,1,2,0],[2,2,1,1,1,40,0],[2,2,1,2,1,4,0,4,1],[2,2,1,2,1,8,0,8,1],[2,1,1,2,1,48,0,48,1],[1,4,1,2,1,68,0,68,1],[1,4,1,2,1,72,0,72,1],[1,4,1,2,1,76,0,76,1],[1,4,1,2,1,80,0,80,1],[1,4,1,2,1,84,0,84,1],[1,4,1,2,1,88,0,88,1],[2,1,1,2,1,22,0,23,1],[2,1,1,2,1,24,0,25,1],[2,1,1,2,1,26,0,27,1],[2,1,1,2,1,28,0,29,1],[2,1,1,2,1,30,0,31,1],[2,2,1,2,1,36,0,36,1],[2,2,1,4,1,12,0,14,1,12,2,14,3],[2,2,1,4,1,52,0,52,1,52,2,52,3],[2,1,1,8,1,35,0,35,1,35,2,35,3,35,4,35,5,35,6,35,7],[2,2,1,4,1,42,0,42,1,42,2,42,3],[1,1,1,2,1,56,0,57,1],[2,2,1,2,1,56,0,58,1],[2,1,1,2,1,46,0,46,1],[2,1,1,2,1,50,0,51,1],[1,1,1,1,2,0,0],[1,1,1,2,2,1,0,2,0],[1,1,1,2,1,3,0,3,1],[1,1,1,4,1,4,0,4,1,5,0,5,1],[1,1,1,2,1,6,0,6,1],[1,1,1,4,1,7,0,7,1,8,0,8,1],[1,1,1,2,1,16,0,16,1],[1,1,1,2,1,17,0,17,1],[1,1,1,2,1,18,0,18,1],[1,1,1,2,1,19,0,19,1],[1,1,1,2,1,20,0,20,1],[1,1,1,2,1,21,0,21,1],[1,1,1,2,1,22,0,22,1],[1,1,1,2,1,23,0,23,1],[1,1,1,2,1,24,0,24,1],[1,1,1,4,1,32,0,32,1,32,2,32,3],[1,1,1,4,1,33,0,33,1,33,2,33,3],[1,1,1,4,1,34,0,34,1,34,2,34,3],[1,1,1,4,1,35,0,35,1,35,2,35,3],[1,1,1,4,1,36,0,36,1,36,2,36,3],[1,1,1,4,1,37,0,37,1,37,2,37,3],[1,1,1,4,1,38,0,38,1,38,2,38,3],[1,1,1,4,1,39,0,39,1,39,2,39,3],[1,1,1,4,1,40,0,40,1,40,2,40,3],[65,1,1,1,1,41,0],[65,1,1,2,1,42,0,42,1],[65,1,1,2,1,43,0,43,1],[65,1,1,4,1,44,0,44,1,44,2,44,3],[65,1,1,4,1,45,0,45,1,45,2,45,3,45,4,45,5,45,6,45,7],[65,1,1,1,1,46,0],[65,1,1,1,1,47,0],[1,1,1,2,1,9,0,9,1],[1,1,1,2,1,10,0,10,1],[1,1,1,2,1,11,0,11,1],[1,1,1,2,1,12,0,12,1],[1,1,1,2,1,13,0,13,1],[1,1,1,2,1,14,0,14,1],[1,1,1,2,1,15,0,15,1],[1,1,1,3,2,25,0,26,0,27,0],[1,1,1,4,1,28,0,29,0,30,0,31,0],[0,1,1,2,2,0,0,1,0],[1,2,1,4,1,52,0,52,1,52,2,52,3],[1,2,1,4,1,48,0,48,1,48,2,48,3],[0,1,1,4,1,2,0,2,1,3,2,3,3],[1,6,1,1,1,-1,0,54,92,92,92,92,55],[1,11,1,1,1,-1,0,54,92,92,92,92,92,92,92,92,92,55],[0,1,1,2,2,4,0,5,0],[1,1,1,4,1,58,0,58,1,59,2,59,3],[2,2,1,4,1,16,0,16,1,16,2,16,3],[2,2,1,4,1,18,0,18,1,18,2,18,3],[2,2,1,4,1,20,0,20,1,20,2,20,3],[2,1,1,4,1,32,0,32,1,32,2,32,3],[2,1,1,4,1,33,0,33,1,33,2,33,3],[2,1,1,4,1,34,0,34,1,34,2,34,3],[3,4,4,1,1,28,12],[3,4,3,2,1,0,0,0,1],[3,1,1,2,1,4,0,4,1],[3,1,1,2,1,5,0,5,1],[3,1,1,2,1,6,0,6,1],[3,1,1,4,1,7,0,7,1,7,2,7,3],[3,2,2,4,1,12,0,12,1,12,2,12,3],[3,2,1,2,1,24,0,24,1],[3,2,1,2,1,48,0,48,1],[19,1,2,4,1,33,0,33,1,33,2,33,3],[3,2,4,4,1,26,0,26,1,26,2,26,3],[9473,1,2,1,1,64,0],[9473,1,2,2,1,66,0,66,1],[9473,1,1,1,1,105,0],[9473,1,1,1,1,106,0],[4867,1,1,1,1,32,0],[9473,1,1,1,1,97,0],[9473,1,1,1,1,103,0],[49,1,1,1,1,96,0],[49,1,1,1,1,97,0],[49,1,1,1,1,98,0],[49,1,1,1,1,99,0],[49,1,1,1,1,100,0],[49,1,1,1,1,101,0],[49,1,1,1,1,102,0],[49,1,1,1,1,103,0],[49,1,1,1,1,104,0],[1,2,1,1,1,60,0],[1,1,1,4,2,93,0,94,0,95,0,94,0],[1,1,1,3,2,109,0,110,0,111,0],[1,1,1,1,1,108,0],[5,1,1,1,1,109,0],[6,1,1,1,1,110,0],[7,1,1,1,1,111,0]];

// Sprite id constants, e.g. SD.S.Yamaboku_DEEP === 0
SD.S = {
  Yamaboku_DEEP: 0,
  Yamaboku_SKY: 1,
  Yamaboku_SPACE: 2,
  Tiddler: 3,
  Asthmatic: 4,
  Coypu: 5,
  Wigwam_B: 6,
  Wigwam_T1: 7,
  Wigwam_T2: 8,
  Wigwam_T3: 9,
  Wigwam_T4: 10,
  Wigwam_T5: 11,
  Eyewash_LL: 12,
  Eyewash_L: 13,
  Eyewash_M: 14,
  Eyewash_R: 15,
  Eyewash_RR: 16,
  Spooky: 17,
  Fratricide: 18,
  Scourge: 19,
  Mean: 20,
  Chirstie: 21,
  Poppy: 22,
  Rob: 23,
  Hoot: 24,
  Strayed_Brain: 25,
  Bomb_Blu_M: 26,
  Bomb_Blu_LR: 27,
  Bomb_Red_M: 28,
  Bomb_Red_LR: 29,
  Bomb_Grn_M: 30,
  Bomb_Grn_LR: 31,
  Missile1_UL: 32,
  Missile1_UM: 33,
  Missile1_UR: 34,
  Missile1_LU: 35,
  Missile1_LM: 36,
  Missile1_LB: 37,
  Missile1_RU: 38,
  Missile1_RM: 39,
  Missile1_RB: 40,
  Missile2_UL: 41,
  Missile2_UM: 42,
  Missile2_UR: 43,
  Missile2_LU: 44,
  Missile2_LM: 45,
  Missile2_LB: 46,
  Missile2_RU: 47,
  Missile2_RM: 48,
  Missile2_RB: 49,
  PowerUp_Blu: 50,
  PowerUp_Red: 51,
  PowerUp_Grn: 52,
  PowerUp_Ora: 53,
  PowerUp_Pur: 54,
  PowerUp_Cya: 55,
  PowerUp_Whi: 56,
  MissileE_L3: 57,
  MissileE_L2: 58,
  MissileE_L1: 59,
  MissileE_M: 60,
  MissileE_R1: 61,
  MissileE_R2: 62,
  MissileE_R3: 63,
  Mine: 64,
  Bomb: 65,
  Bullet1: 66,
  Laser_Beam: 67,
  Fire_Breath: 68,
  Bullet2: 69,
  Energy_Beam_S: 70,
  Energy_Beam_L: 71,
  Bullet3: 72,
  Barner: 73,
  ExplosionL_1: 74,
  ExplosionL_2: 75,
  ExplosionL_3: 76,
  ExplosionS_1: 77,
  ExplosionS_2: 78,
  ExplosionS_3: 79,
  Earth: 80,
  Eerie_Core: 81,
  Lunatic_Noddle1: 82,
  Lunatic_Noddle2: 83,
  Lunatic_Noddle3: 84,
  Lunatic_NoddleS: 85,
  Lunatic_NoddleH: 86,
  BPSM_ArmT: 87,
  BPSM_ArmB: 88,
  BPSM_Core: 89,
  BPSM_Body: 90,
  Bottom1: 91,
  Bottom2: 92,
  Align1: 93,
  Align2: 94,
  Horizon: 95,
  WakuU36: 96,
  WakuB36: 97,
  WakuUL: 98,
  WakuUM: 99,
  WakuUR: 100,
  WakuML: 101,
  WakuMM: 102,
  WakuMR: 103,
  WakuBL: 104,
  WakuBM: 105,
  WakuBR: 106,
  Cloud: 107,
  Human1: 108,
  Human2: 109,
  Human3: 110,
  Logo: 111,
  Super: 112,
  Rader: 113,
};
SD.SPRITE_NAMES = ["Yamaboku_DEEP","Yamaboku_SKY","Yamaboku_SPACE","Tiddler","Asthmatic","Coypu","Wigwam_B","Wigwam_T1","Wigwam_T2","Wigwam_T3","Wigwam_T4","Wigwam_T5","Eyewash_LL","Eyewash_L","Eyewash_M","Eyewash_R","Eyewash_RR","Spooky","Fratricide","Scourge","Mean","Chirstie","Poppy","Rob","Hoot","Strayed_Brain","Bomb_Blu_M","Bomb_Blu_LR","Bomb_Red_M","Bomb_Red_LR","Bomb_Grn_M","Bomb_Grn_LR","Missile1_UL","Missile1_UM","Missile1_UR","Missile1_LU","Missile1_LM","Missile1_LB","Missile1_RU","Missile1_RM","Missile1_RB","Missile2_UL","Missile2_UM","Missile2_UR","Missile2_LU","Missile2_LM","Missile2_LB","Missile2_RU","Missile2_RM","Missile2_RB","PowerUp_Blu","PowerUp_Red","PowerUp_Grn","PowerUp_Ora","PowerUp_Pur","PowerUp_Cya","PowerUp_Whi","MissileE_L3","MissileE_L2","MissileE_L1","MissileE_M","MissileE_R1","MissileE_R2","MissileE_R3","Mine","Bomb","Bullet1","Laser_Beam","Fire_Breath","Bullet2","Energy_Beam_S","Energy_Beam_L","Bullet3","Barner","ExplosionL_1","ExplosionL_2","ExplosionL_3","ExplosionS_1","ExplosionS_2","ExplosionS_3","Earth","Eerie_Core","Lunatic_Noddle1","Lunatic_Noddle2","Lunatic_Noddle3","Lunatic_NoddleS","Lunatic_NoddleH","BPSM_ArmT","BPSM_ArmB","BPSM_Core","BPSM_Body","Bottom1","Bottom2","Align1","Align2","Horizon","WakuU36","WakuB36","WakuUL","WakuUM","WakuUR","WakuML","WakuMM","WakuMR","WakuBL","WakuBM","WakuBR","Cloud","Human1","Human2","Human3","Logo","Super","Rader"];

// ------------------------------------------------------------------- palette
// 16 ARGB entries. Indices 2,3,4 and 6 are re-derived every frame from the Myu2 /
// Myu4 / Myu8 counters (GameStage.drawframe), which is what makes the reds and
// greens throb; SD.paletteFor() in gfx.js reproduces those formulas.
SD.PALS = [0x00000000,0xFF0000FF,0xFFFF0000,0xFF7F7FFF,0xFF00FF48,0xFF00BBDD,0xFFFF9200,0xFFFF9200,0xFF000000,0xFF333333,0xFF444444,0xFF555555,0xFF777777,0xFF999999,0xFFDDDDDD,0xFFFFFFFF];

// --------------------------------------------------------- game constants
SD.C = {
  X_MIN: -320,   // stored as 4294966976 (uint32) in the bytecode
  INFOLINE: 10,
  BOMBMAX: 16,
  INIT_BOMB: 4,
  INIT_SPEED: 4,
  ENEMY_STAGE_SPEED: 6,
  X_MAX: 960,
  WX_MIN: 32,
  WX_MAX: 608,
  SHIP_DEEP_Y: 16,
  SHIP_SKY_Y: 288,
  BOMB_RET_LINE: 304,
  ENEMY_BOSS: 15,
  SCREEN_W: 640, SCREEN_H: 400, FPS: 30,
  N_ENEMY: 16,   // entity slot count; slot 0 is the player
  N_SHOT: 16, N_MISSILE: 8,
};

// Scene ids (GameInstance.SCN_*)
SD.SCN = {
  BIOLOGO: 0,
  OPENING: 1,
  RECORD: 2,
  RESULT: 3,
  NAMEIN: 4,
  DEEP: 5,
  DEEP2SKY: 6,
  SKY: 7,
  SKY2SPACE: 8,
  SPACE: 9,
  SPACE2BOSS: 10,
  BOSS: 11,
  ENDING: 12,
  ENDCAST: 13,
  BLACKOUT: 14,
};

// BGM slot ids -> assets/sounds/SndBGM##.mp3 (GameInstance.BGM_*)
SD.BGM = {
  BIO100: 0,
  OPENNING: 1,
  DEEP: 2,
  DEEP2SKY: 3,
  SKY: 4,
  SKY2SPACE: 5,
  SPACE: 6,
  ALARM: 7,
  BOSS: 8,
  BOSSCLEAR1: 9,
  BOSSCLEAR2: 10,
  BOSSCLEAR3: 11,
  ENDING: 12,
  NAMEINN: 13,
  GAMEOVER: 14,
};

// Sound-effect slots (GameInstance.EFS_*) -> assets/sounds/SndSE0#.mp3
SD.SE = {
  BOMB: 0,
  MISSILE: 1,
  HIT: 2,
  DEAD: 3,
  FIRE: 4,
  ITEM: 5,
};

// Item roulette (GameInstance.Item_put), indexed by random(16).
SD.ITEM_PUT = [1,1,1,1,2,2,2,2,3,3,4,4,5,5,6,7,0];
// Item ids 1..7 map onto PowerUp_Blu..PowerUp_Whi and mean:
//   1 speed up, 2 bombs, 3 power shot, 4 score, 5 3-way, 6 full power, 7 1UP
SD.SCORE_PTS = [[0,1,2,3,4,5,6,7,8,9],[1,50,300,200,500,0,0,0,0,100],[2,50,200,300,500,0,0,0,0,100],[3,50,200,300,500,0,0,0,0,100],[4,100,5000,200,5000,200,10000,0,0,0]];
SD.BOMB_PT = [0,0,1,1,2,2,1,1,0,0];   // depth-charge spread offsets
SD.MIS_PT = [-3,-3,-2,-2,-2,-1,-1,0,0,0,1,1,2,2,2,3,3,5];    // enemy missile lateral drift table
SD.WAKU = [0,3,6,0,3,3,3,3,3,3,3,3,3,3,3,3,3,6,0,3,3,3,3,6];      // border tile row descriptor

export const BOARD_SIZE = 12;

export type Race = 'dragon' | 'swarm';
export type Player = 0 | 1;
export type Terrain = 'plain' | 'forest' | 'river' | 'highland';
export type CardType = 'unit' | 'building' | 'skill' | 'environment';
export type PieceKind = 'core' | 'unit' | 'building';
export type BuildingRole = 'core' | 'functional' | 'defense' | 'none';

export interface Coord {
  x: number;
  y: number;
}

export interface Tile extends Coord {
  terrain: Terrain;
  creep: boolean;
}

export interface PieceDef {
  name: string;
  race: Race;
  kind: PieceKind;
  role: BuildingRole;
  hp: number;
  attack: number;
  range: number;
  move: number;
  flying?: boolean;
  area?: boolean;
  description: string;
}

export interface Piece extends Coord {
  id: string;
  defId: string;
  owner: Player;
  race: Race;
  kind: PieceKind;
  hp: number;
  maxHp: number;
  acted: boolean;
}

export interface CardDef {
  name: string;
  race: Race;
  type: CardType;
  cost: number;
  description: string;
  pieceId?: string;
  target: 'deploy' | 'enemy' | 'tile';
}

export interface CardInstance {
  uid: string;
  cardId: string;
}

export interface GameState {
  tiles: Tile[];
  pieces: Piece[];
  hands: [CardInstance[], CardInstance[]];
  decks: [CardInstance[], CardInstance[]];
  discards: [CardInstance[], CardInstance[]];
  activePlayer: Player;
  turn: number;
  command: number;
  winner: Player | null;
  surrounded: string[];
  log: string[];
}

export interface CardTargets {
  tiles: Coord[];
  pieceIds: string[];
}

export const RACE_INFO: Record<Race, { name: string; short: string; color: string; passive: string }> = {
  dragon: {
    name: '烬翼龙族',
    short: '龙族',
    color: '#f2a65a',
    passive: '飞行越过河流；被围仍保留完整移动。巨龙攻击会波及目标周围敌军。',
  },
  swarm: {
    name: '幽殖异潮',
    short: '异潮',
    color: '#69e0b6',
    passive: '菌毯提供额外通路；位于菌毯上的异潮单位被围时不受攻防削弱。',
  },
};

export const PIECE_DEFS: Record<string, PieceDef> = {
  dragonCore: { name: '烬翼主巢', race: 'dragon', kind: 'core', role: 'core', hp: 16, attack: 0, range: 0, move: 0, description: '龙族核心。被摧毁即落败。' },
  drake: { name: '烬翼幼龙', race: 'dragon', kind: 'unit', role: 'none', hp: 5, attack: 2, range: 1, move: 3, flying: true, description: '飞行突击单位，可越过河流。' },
  elder: { name: '曜鳞巨龙', race: 'dragon', kind: 'unit', role: 'none', hp: 9, attack: 3, range: 2, move: 2, flying: true, area: true, description: '远程龙息，对目标相邻敌军造成 1 点波及伤害。' },
  roost: { name: '星火龙巢', race: 'dragon', kind: 'building', role: 'functional', hp: 7, attack: 0, range: 0, move: 0, description: '建成时注入陨火与幼龙卡；未被围时每回合 +1 指挥点。' },
  dragonTower: { name: '晶鳞箭塔', race: 'dragon', kind: 'building', role: 'defense', hp: 8, attack: 2, range: 2, move: 0, description: '回合结束自动攻击；被围时射程由 2 降为 1。' },
  swarmCore: { name: '幽殖主母巢', race: 'swarm', kind: 'core', role: 'core', hp: 16, attack: 0, range: 0, move: 0, description: '异潮核心。被摧毁即落败。' },
  stalker: { name: '潜猎体', race: 'swarm', kind: 'unit', role: 'none', hp: 4, attack: 2, range: 1, move: 3, description: '快速地面近战单位。' },
  spitter: { name: '酸射体', race: 'swarm', kind: 'unit', role: 'none', hp: 6, attack: 2, range: 2, move: 2, description: '地面远程单位，适合维持封锁。' },
  hatchling: { name: '孵游体', race: 'swarm', kind: 'unit', role: 'none', hp: 3, attack: 1, range: 1, move: 3, description: '由孵育腔解锁的低消耗单位。' },
  brood: { name: '脉动孵育腔', race: 'swarm', kind: 'building', role: 'functional', hp: 7, attack: 0, range: 0, move: 0, description: '建成时注入菌毯与孵游体卡；未被围时每回合 +1 指挥点。' },
  spineTower: { name: '骨刺防御塔', race: 'swarm', kind: 'building', role: 'defense', hp: 8, attack: 2, range: 2, move: 0, description: '回合结束自动攻击；被围时射程由 2 降为 1。' },
};

export const CARD_DEFS: Record<string, CardDef> = {
  drake: { name: '烬翼幼龙', race: 'dragon', type: 'unit', cost: 2, pieceId: 'drake', target: 'deploy', description: '部署飞行单位。移动 3，攻击 2。' },
  elder: { name: '曜鳞巨龙', race: 'dragon', type: 'unit', cost: 4, pieceId: 'elder', target: 'deploy', description: '部署范围攻击飞行单位。' },
  roost: { name: '星火龙巢', race: 'dragon', type: 'building', cost: 3, pieceId: 'roost', target: 'deploy', description: '扩充牌库；未被围时提供指挥点。' },
  dragonTower: { name: '晶鳞箭塔', race: 'dragon', type: 'building', cost: 3, pieceId: 'dragonTower', target: 'deploy', description: '自动防御建筑，可参与包围。' },
  flame: { name: '灼焰印记', race: 'dragon', type: 'skill', cost: 2, target: 'enemy', description: '对任意敌方棋子造成 2 点伤害。' },
  meteor: { name: '陨火抬升', race: 'dragon', type: 'environment', cost: 2, target: 'tile', description: '将非河流地块变为高地，先对当地敌军造成 1 点伤害。' },
  stalker: { name: '潜猎体', race: 'swarm', type: 'unit', cost: 2, pieceId: 'stalker', target: 'deploy', description: '部署快速近战单位。' },
  spitter: { name: '酸射体', race: 'swarm', type: 'unit', cost: 3, pieceId: 'spitter', target: 'deploy', description: '部署远程封锁单位。' },
  hatchling: { name: '孵游体', race: 'swarm', type: 'unit', cost: 1, pieceId: 'hatchling', target: 'deploy', description: '低消耗快速单位，由孵育腔解锁。' },
  brood: { name: '脉动孵育腔', race: 'swarm', type: 'building', cost: 3, pieceId: 'brood', target: 'deploy', description: '扩充牌库；未被围时提供指挥点。' },
  spineTower: { name: '骨刺防御塔', race: 'swarm', type: 'building', cost: 3, pieceId: 'spineTower', target: 'deploy', description: '自动防御建筑，可参与包围。' },
  acid: { name: '蚀甲酸液', race: 'swarm', type: 'skill', cost: 1, target: 'enemy', description: '对任意敌方棋子造成 2 点伤害。' },
  creep: { name: '蔓延菌毯', race: 'swarm', type: 'environment', cost: 1, target: 'tile', description: '在目标及相邻非河流格铺设菌毯。' },
};

const key = (x: number, y: number) => `${x},${y}`;
const distance = (a: Coord, b: Coord) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const otherPlayer = (player: Player): Player => player === 0 ? 1 : 0;

export class GameEngine {
  state: GameState;
  private seed = 73421;
  private cardSerial = 0;
  private pieceSerial = 0;

  constructor(mode: 'normal' | 'demo' = 'normal') {
    this.state = this.createState();
    this.setupBoard();
    this.setupCards();
    if (mode === 'demo') this.setupDemo();
    this.state.command = this.commandFor(this.state.activePlayer);
    this.recomputeSurround();
    this.log(mode === 'demo' ? '包围演示：移动潜猎体至发光的缺口。' : '对局开始：烬翼龙族先手。');
  }

  private createState(): GameState {
    return {
      tiles: [], pieces: [],
      hands: [[], []], decks: [[], []], discards: [[], []],
      activePlayer: 0, turn: 1, command: 0, winner: null,
      surrounded: [], log: [],
    };
  }

  private setupBoard() {
    const rivers = new Set(['3,0', '3,1', '4,2', '4,3', '5,4', '6,5', '7,6', '8,7', '8,8', '9,9']);
    const forests = new Set(['1,3', '2,3', '5,1', '6,2', '8,3', '9,4', '2,7', '3,8', '6,8', '7,9', '9,10']);
    const highlands = new Set(['1,6', '5,6', '6,6', '10,5', '6,10']);
    for (let y = 0; y < BOARD_SIZE; y++) {
      for (let x = 0; x < BOARD_SIZE; x++) {
        const id = key(x, y);
        const terrain: Terrain = rivers.has(id) ? 'river' : highlands.has(id) ? 'highland' : forests.has(id) ? 'forest' : 'plain';
        this.state.tiles.push({ x, y, terrain, creep: false });
      }
    }
    this.addPiece('dragonCore', 0, 2, 9);
    this.addPiece('swarmCore', 1, 9, 2);
  }

  private setupCards() {
    const starting: [string[], string[]] = [
      ['drake', 'roost', 'dragonTower', 'flame', 'elder'],
      ['stalker', 'brood', 'spineTower', 'acid', 'creep'],
    ];
    const libraries: [string[], string[]] = [
      ['drake', 'elder', 'roost', 'dragonTower', 'flame', 'meteor', 'drake', 'flame', 'meteor', 'dragonTower'],
      ['stalker', 'spitter', 'brood', 'spineTower', 'acid', 'creep', 'stalker', 'spitter', 'acid', 'creep'],
    ];
    for (const player of [0, 1] as Player[]) {
      this.state.hands[player] = starting[player].map(id => this.card(id));
      this.state.decks[player] = libraries[player].map(id => this.card(id));
      this.shuffle(this.state.decks[player]);
    }
  }

  private setupDemo() {
    this.state.pieces = [];
    this.tileAt(5, 4)!.terrain = 'plain';
    this.addPiece('dragonCore', 0, 1, 10);
    this.addPiece('swarmCore', 1, 10, 1);
    this.addPiece('dragonTower', 0, 5, 5);
    this.addPiece('roost', 0, 6, 5);
    this.addPiece('stalker', 1, 4, 5).acted = true;
    this.addPiece('stalker', 1, 5, 6).acted = true;
    this.addPiece('stalker', 1, 7, 5).acted = true;
    this.addPiece('stalker', 1, 6, 4).acted = true;
    this.addPiece('stalker', 1, 6, 6).acted = true;
    this.addPiece('stalker', 1, 5, 2);
    this.state.activePlayer = 1;
    this.state.turn = 4;
    this.state.hands[1] = ['creep', 'acid', 'spitter'].map(id => this.card(id));
  }

  private card(cardId: string): CardInstance {
    return { uid: `c${++this.cardSerial}`, cardId };
  }

  private addPiece(defId: string, owner: Player, x: number, y: number): Piece {
    const def = PIECE_DEFS[defId];
    const piece: Piece = {
      id: `p${++this.pieceSerial}`, defId, owner, race: def.race, kind: def.kind,
      x, y, hp: def.hp, maxHp: def.hp, acted: false,
    };
    this.state.pieces.push(piece);
    return piece;
  }

  private random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private shuffle(cards: CardInstance[]) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
  }

  private draw(player: Player, count: number) {
    for (let i = 0; i < count; i++) {
      if (this.state.decks[player].length === 0) {
        this.state.decks[player] = this.state.discards[player].splice(0);
        this.shuffle(this.state.decks[player]);
      }
      const next = this.state.decks[player].pop();
      if (next) this.state.hands[player].push(next);
    }
  }

  tileAt(x: number, y: number) {
    return this.state.tiles.find(tile => tile.x === x && tile.y === y);
  }

  pieceAt(x: number, y: number) {
    return this.state.pieces.find(piece => piece.x === x && piece.y === y);
  }

  pieceById(id: string) {
    return this.state.pieces.find(piece => piece.id === id);
  }

  isSurrounded(id: string) {
    return this.state.surrounded.includes(id);
  }

  private commandFor(player: Player) {
    const bonus = this.state.pieces.filter(piece => {
      const def = PIECE_DEFS[piece.defId];
      return piece.owner === player && def.role === 'functional' && !this.isSurrounded(piece.id);
    }).length;
    return 6 + bonus;
  }

  private neighbors(coord: Coord) {
    return [
      { x: coord.x + 1, y: coord.y }, { x: coord.x - 1, y: coord.y },
      { x: coord.x, y: coord.y + 1 }, { x: coord.x, y: coord.y - 1 },
    ].filter(pos => pos.x >= 0 && pos.y >= 0 && pos.x < BOARD_SIZE && pos.y < BOARD_SIZE);
  }

  recomputeSurround() {
    const visited = new Set<string>();
    const surrounded = new Set<string>();
    for (const start of this.state.pieces) {
      if (visited.has(start.id)) continue;
      const group: Piece[] = [];
      const queue = [start];
      let liberty = false;
      while (queue.length) {
        const piece = queue.shift()!;
        if (visited.has(piece.id)) continue;
        visited.add(piece.id);
        group.push(piece);
        for (const pos of this.neighbors(piece)) {
          const occupant = this.pieceAt(pos.x, pos.y);
          if (occupant?.owner === piece.owner) {
            if (!visited.has(occupant.id)) queue.push(occupant);
            continue;
          }
          if (occupant) continue;
          const tile = this.tileAt(pos.x, pos.y)!;
          if (tile.creep && start.race === 'swarm') liberty = true;
          if (tile.terrain !== 'river') liberty = true;
        }
      }
      const allFlying = group.every(piece => piece.kind === 'unit' && PIECE_DEFS[piece.defId].flying);
      if (!liberty && allFlying) {
        liberty = group.some(piece => this.neighbors(piece).some(pos => !this.pieceAt(pos.x, pos.y)));
      }
      if (!liberty) group.forEach(piece => surrounded.add(piece.id));
    }
    this.state.surrounded = [...surrounded];
  }

  private ignoresSurroundPenalty(piece: Piece) {
    return piece.race === 'swarm' && this.tileAt(piece.x, piece.y)?.creep === true;
  }

  moveRange(piece: Piece) {
    const base = PIECE_DEFS[piece.defId].move;
    if (this.isSurrounded(piece.id) && !PIECE_DEFS[piece.defId].flying && !this.ignoresSurroundPenalty(piece)) return Math.max(1, base - 1);
    return base;
  }

  attackValue(piece: Piece) {
    const base = PIECE_DEFS[piece.defId].attack;
    if (this.isSurrounded(piece.id) && !this.ignoresSurroundPenalty(piece)) return Math.max(1, base - 1);
    return base;
  }

  defenseRange(piece: Piece) {
    const base = PIECE_DEFS[piece.defId].range;
    return this.isSurrounded(piece.id) ? Math.max(1, base - 1) : base;
  }

  getMoves(pieceId: string): Coord[] {
    const piece = this.pieceById(pieceId);
    if (!piece || piece.owner !== this.state.activePlayer || piece.kind !== 'unit' || piece.acted || this.state.winner !== null) return [];
    const def = PIECE_DEFS[piece.defId];
    const maxMove = this.moveRange(piece);
    const result: Coord[] = [];
    const visited = new Map<string, number>([[key(piece.x, piece.y), 0]]);
    const queue: Coord[] = [{ x: piece.x, y: piece.y }];
    while (queue.length) {
      const current = queue.shift()!;
      const steps = visited.get(key(current.x, current.y))!;
      if (steps >= maxMove) continue;
      for (const next of this.neighbors(current)) {
        if (visited.has(key(next.x, next.y)) || this.pieceAt(next.x, next.y)) continue;
        if (this.tileAt(next.x, next.y)?.terrain === 'river' && !def.flying) continue;
        visited.set(key(next.x, next.y), steps + 1);
        result.push(next);
        queue.push(next);
      }
    }
    return result;
  }

  getAttacks(pieceId: string): string[] {
    const piece = this.pieceById(pieceId);
    if (!piece || piece.owner !== this.state.activePlayer || piece.kind !== 'unit' || piece.acted || this.state.winner !== null) return [];
    const range = PIECE_DEFS[piece.defId].range;
    return this.state.pieces.filter(target => target.owner !== piece.owner && distance(piece, target) <= range).map(target => target.id);
  }

  getDeploymentTiles(player: Player): Coord[] {
    const anchors = this.state.pieces.filter(piece => piece.owner === player && piece.kind !== 'unit');
    return this.state.tiles.filter(tile => {
      if (tile.terrain === 'river' || this.pieceAt(tile.x, tile.y)) return false;
      return anchors.some(anchor => distance(anchor, tile) <= 2);
    }).map(({ x, y }) => ({ x, y }));
  }

  getCardTargets(uid: string): CardTargets {
    const player = this.state.activePlayer;
    const instance = this.state.hands[player].find(card => card.uid === uid);
    if (!instance || this.state.winner !== null) return { tiles: [], pieceIds: [] };
    const def = CARD_DEFS[instance.cardId];
    if (def.cost > this.state.command) return { tiles: [], pieceIds: [] };
    if (def.target === 'deploy') return { tiles: this.getDeploymentTiles(player), pieceIds: [] };
    if (def.target === 'enemy') return { tiles: [], pieceIds: this.state.pieces.filter(piece => piece.owner !== player).map(piece => piece.id) };
    const tiles = this.state.tiles.filter(tile => instance.cardId === 'creep' || tile.terrain !== 'river').map(({ x, y }) => ({ x, y }));
    return { tiles, pieceIds: [] };
  }

  playCard(uid: string, target: Coord & { pieceId?: string }): boolean {
    const player = this.state.activePlayer;
    const instance = this.state.hands[player].find(card => card.uid === uid);
    if (!instance) return false;
    const def = CARD_DEFS[instance.cardId];
    const legal = this.getCardTargets(uid);
    const valid = def.target === 'enemy'
      ? target.pieceId !== undefined && legal.pieceIds.includes(target.pieceId)
      : legal.tiles.some(pos => pos.x === target.x && pos.y === target.y);
    if (!valid) return false;

    this.state.command -= def.cost;
    this.state.hands[player] = this.state.hands[player].filter(card => card.uid !== uid);
    this.state.discards[player].push(instance);

    if (def.target === 'deploy' && def.pieceId) {
      const piece = this.addPiece(def.pieceId, player, target.x, target.y);
      piece.acted = true;
      const pieceDef = PIECE_DEFS[def.pieceId];
      if (pieceDef.role === 'functional') {
        const additions = player === 0 ? ['meteor', 'drake'] : ['creep', 'hatchling'];
        this.state.decks[player].push(...additions.map(id => this.card(id)));
        this.shuffle(this.state.decks[player]);
        this.log(`${def.name}建成：新卡已加入牌库，下回合提供额外指挥点。`);
      } else {
        this.log(`${RACE_INFO[player === 0 ? 'dragon' : 'swarm'].short}部署了${def.name}。`);
      }
    } else if (instance.cardId === 'flame' || instance.cardId === 'acid') {
      const piece = this.pieceById(target.pieceId!)!;
      this.applyDamage(piece, 2, player);
      this.log(`${def.name}命中${PIECE_DEFS[piece.defId].name}。`);
    } else if (instance.cardId === 'meteor') {
      const occupant = this.pieceAt(target.x, target.y);
      if (occupant && occupant.owner !== player) this.applyDamage(occupant, 1, player);
      const tile = this.tileAt(target.x, target.y)!;
      tile.terrain = 'highland';
      tile.creep = false;
      this.log('陨火改变地形：新的高地形成。');
    } else if (instance.cardId === 'creep') {
      const affected = [{ x: target.x, y: target.y }, ...this.neighbors(target)];
      affected.forEach(pos => {
        const tile = this.tileAt(pos.x, pos.y);
        if (tile && tile.terrain !== 'river') tile.creep = true;
      });
      this.log('菌毯蔓延：异潮获得新的通路。');
    }
    this.recomputeSurround();
    this.cleanupDead();
    return true;
  }

  movePiece(pieceId: string, target: Coord): boolean {
    const piece = this.pieceById(pieceId);
    if (!piece || !this.getMoves(pieceId).some(pos => pos.x === target.x && pos.y === target.y)) return false;
    piece.x = target.x;
    piece.y = target.y;
    piece.acted = true;
    this.recomputeSurround();
    this.log(`${PIECE_DEFS[piece.defId].name}移动至 ${target.x + 1}-${target.y + 1}。`);
    return true;
  }

  attackPiece(pieceId: string, targetId: string): boolean {
    const piece = this.pieceById(pieceId);
    const target = this.pieceById(targetId);
    if (!piece || !target || !this.getAttacks(pieceId).includes(targetId)) return false;
    const damage = this.attackValue(piece);
    this.applyDamage(target, damage, piece.owner);
    this.log(`${PIECE_DEFS[piece.defId].name}攻击${PIECE_DEFS[target.defId].name}，造成 ${damage} 点基础伤害。`);
    if (PIECE_DEFS[piece.defId].area) {
      const adjacent = this.state.pieces.filter(other => other.id !== target.id && other.owner !== piece.owner && distance(other, target) === 1);
      adjacent.forEach(other => this.applyDamage(other, 1, piece.owner));
      if (adjacent.length) this.log('龙息波及相邻敌军。');
    }
    piece.acted = true;
    this.recomputeSurround();
    this.cleanupDead();
    return true;
  }

  private applyDamage(target: Piece, amount: number, source: Player) {
    const highlandGuard = this.tileAt(target.x, target.y)?.terrain === 'highland' && !this.isSurrounded(target.id);
    const actual = Math.max(0, amount - (highlandGuard ? 1 : 0));
    target.hp -= actual;
    if (target.hp <= 0 && target.kind === 'core') this.state.winner = source;
  }

  private cleanupDead() {
    const dead = this.state.pieces.filter(piece => piece.hp <= 0);
    if (!dead.length) return;
    this.state.pieces = this.state.pieces.filter(piece => piece.hp > 0);
    dead.forEach(piece => this.log(`${PIECE_DEFS[piece.defId].name}被摧毁。`));
    this.recomputeSurround();
  }

  endTurn() {
    if (this.state.winner !== null) return;
    const player = this.state.activePlayer;
    const towers = this.state.pieces.filter(piece => piece.owner === player && PIECE_DEFS[piece.defId].role === 'defense');
    for (const tower of towers) {
      const range = this.defenseRange(tower);
      const targets = this.state.pieces
        .filter(piece => piece.owner !== player && distance(tower, piece) <= range)
        .sort((a, b) => distance(tower, a) - distance(tower, b) || a.id.localeCompare(b.id));
      if (targets[0]) {
        const target = targets[0];
        this.applyDamage(target, PIECE_DEFS[tower.defId].attack, player);
        this.log(`${PIECE_DEFS[tower.defId].name}自动攻击${PIECE_DEFS[target.defId].name}${this.isSurrounded(tower.id) ? '（被围近程）' : ''}。`);
      }
    }
    this.cleanupDead();
    if (this.state.winner !== null) return;
    this.state.activePlayer = otherPlayer(player);
    this.state.turn += 1;
    this.state.pieces.forEach(piece => {
      if (piece.owner === this.state.activePlayer) piece.acted = false;
    });
    this.recomputeSurround();
    this.state.command = this.commandFor(this.state.activePlayer);
    this.draw(this.state.activePlayer, 1);
    this.log(`轮到${RACE_INFO[this.state.activePlayer === 0 ? 'dragon' : 'swarm'].name}。`);
  }

  private log(message: string) {
    this.state.log.push(message);
    if (this.state.log.length > 30) this.state.log.shift();
  }
}

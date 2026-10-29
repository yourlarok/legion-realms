import './style.css';
import { BoardScene, type SceneHighlights, type ScenePick } from './scene';
import { CARD_DEFS, PIECE_DEFS, RACE_INFO, GameEngine, type CardType, type Piece } from './game';

const viewport = document.querySelector<HTMLElement>('#viewport')!;
const statusElement = document.querySelector<HTMLElement>('#match-status')!;
const selectionElement = document.querySelector<HTMLElement>('#selection-info')!;
const logElement = document.querySelector<HTMLElement>('#battle-log')!;
const handElement = document.querySelector<HTMLElement>('#hand')!;
const codexElement = document.querySelector<HTMLElement>('#race-codex')!;
const endTurnButton = document.querySelector<HTMLButtonElement>('#end-turn')!;
const styleButton = document.querySelector<HTMLButtonElement>('#style-toggle')!;

let engine = new GameEngine();
let selectedPieceId: string | undefined;
let selectedCardUid: string | undefined;
let hint = '选择一张卡牌部署，或选择己方单位行动。';
let painted = true;

const scene = new BoardScene(viewport, handlePick);
const cardTypeNames: Record<CardType, string> = { unit: '兵种', building: '建筑', skill: '技能', environment: '环境' };

function currentHighlights(): SceneHighlights {
  if (selectedCardUid) {
    const targets = engine.getCardTargets(selectedCardUid);
    const card = engine.state.hands[engine.state.activePlayer].find(item => item.uid === selectedCardUid);
    if (card && CARD_DEFS[card.cardId].target === 'tile') return { targetTiles: targets.tiles };
    return { deployments: targets.tiles, attackIds: targets.pieceIds };
  }
  if (selectedPieceId) {
    return { selectedPieceId, moves: engine.getMoves(selectedPieceId), attackIds: engine.getAttacks(selectedPieceId) };
  }
  return {};
}

function render() {
  const state = engine.state;
  const race = state.activePlayer === 0 ? 'dragon' : 'swarm';
  const info = RACE_INFO[race];
  const surrounded = state.pieces.filter(piece => piece.owner === state.activePlayer && state.surrounded.includes(piece.id)).length;
  statusElement.innerHTML = `
    <div class="eyebrow">回合 ${state.turn} · 本地双人</div>
    <div class="active-race" style="--race-color:${info.color}"><span class="race-gem"></span><div><small>当前指挥</small><strong>${info.name}</strong></div></div>
    <div class="resource-row"><div><small>指挥点</small><strong>${state.command}</strong></div><div><small>手牌</small><strong>${state.hands[state.activePlayer].length}</strong></div><div><small>被围</small><strong>${surrounded}</strong></div></div>
    ${state.winner !== null ? `<div class="winner-banner">${RACE_INFO[state.winner === 0 ? 'dragon' : 'swarm'].name}获胜<br><small>敌方核心已被摧毁</small></div>` : ''}
  `;

  renderSelection();
  handElement.replaceChildren();
  state.hands[state.activePlayer].forEach(instance => {
    const def = CARD_DEFS[instance.cardId];
    const button = document.createElement('button');
    button.className = `game-card ${def.race} ${selectedCardUid === instance.uid ? 'selected' : ''}`;
    button.disabled = def.cost > state.command || state.winner !== null;
    button.innerHTML = `<span class="card-top"><span class="card-cost">${def.cost}</span><span class="card-type">${cardTypeNames[def.type]}</span></span><strong>${def.name}</strong><small>${def.description}</small><span class="card-race">${RACE_INFO[def.race].short}</span>`;
    button.addEventListener('click', () => {
      selectedCardUid = selectedCardUid === instance.uid ? undefined : instance.uid;
      selectedPieceId = undefined;
      hint = selectedCardUid ? `选择${def.name}的目标，Esc 取消。` : '已取消卡牌选择。';
      render();
    });
    handElement.appendChild(button);
  });

  logElement.innerHTML = `<h2>战斗记录</h2>${state.log.slice(-6).reverse().map(message => `<p>${message}</p>`).join('')}`;
  endTurnButton.disabled = state.winner !== null;
  endTurnButton.innerHTML = `结束${info.short}回合<span>↵</span>`;
  scene.sync(state, currentHighlights());
}

function renderSelection() {
  const card = selectedCardUid ? engine.state.hands[engine.state.activePlayer].find(item => item.uid === selectedCardUid) : undefined;
  if (card) {
    const def = CARD_DEFS[card.cardId];
    selectionElement.innerHTML = `<div class="eyebrow">已选卡牌 · ${cardTypeNames[def.type]}</div><h2>${def.name}</h2><p>${def.description}</p><p class="hint">${hint}</p>`;
    return;
  }
  const piece = selectedPieceId ? engine.pieceById(selectedPieceId) : undefined;
  if (piece) {
    const def = PIECE_DEFS[piece.defId];
    const surrounded = engine.isSurrounded(piece.id);
    const role = def.role === 'functional' ? '功能建筑' : def.role === 'defense' ? '防御建筑' : piece.kind === 'unit' ? '兵种棋子' : '核心';
    selectionElement.innerHTML = `
      <div class="eyebrow">${RACE_INFO[piece.race].short} · ${role}</div>
      <h2>${def.name}</h2>
      <div class="stat-line"><span>生命 ${piece.hp}/${piece.maxHp}</span>${piece.kind === 'unit' ? `<span>攻击 ${engine.attackValue(piece)}</span><span>移动 ${engine.moveRange(piece)}</span>` : ''}</div>
      ${def.role === 'defense' ? `<p>当前自动防御射程：${engine.defenseRange(piece)}</p>` : ''}
      <p>${def.description}</p>
      ${surrounded ? '<p class="warning">◆ 被围：出口封闭，能力受限。</p>' : ''}
      ${piece.acted && piece.kind === 'unit' ? '<p>本单位本回合已行动。</p>' : ''}
      <p class="hint">${hint}</p>
    `;
    return;
  }
  const race = RACE_INFO[engine.state.activePlayer === 0 ? 'dragon' : 'swarm'];
  selectionElement.innerHTML = `<div class="eyebrow">统帅指南</div><h2>${race.name}</h2><p>${race.passive}</p><p class="hint">${hint}</p>`;
}

function selectPiece(piece: Piece) {
  selectedPieceId = piece.id;
  selectedCardUid = undefined;
  if (piece.owner === engine.state.activePlayer && piece.kind === 'unit') hint = '点击绿色格移动，或点击红色标记敌军攻击。';
  else hint = '正在查看棋子状态。';
}

function handlePick(pick: ScenePick) {
  if (engine.state.winner !== null) return;
  if (selectedCardUid) {
    if (engine.playCard(selectedCardUid, pick)) {
      selectedCardUid = undefined;
      selectedPieceId = undefined;
      hint = '卡牌已结算，可继续出牌或选择单位。';
    } else {
      hint = '该目标不合法，请选择高亮目标或按 Esc 取消。';
    }
    render();
    return;
  }

  if (selectedPieceId && pick.pieceId && engine.getAttacks(selectedPieceId).includes(pick.pieceId)) {
    if (engine.attackPiece(selectedPieceId, pick.pieceId)) {
      selectedPieceId = undefined;
      hint = '攻击已结算。';
    }
    render();
    return;
  }
  if (selectedPieceId && !pick.pieceId && engine.getMoves(selectedPieceId).some(pos => pos.x === pick.x && pos.y === pick.y)) {
    if (engine.movePiece(selectedPieceId, pick)) {
      selectedPieceId = undefined;
      hint = '移动已结算，包围状态已更新。';
    }
    render();
    return;
  }
  if (pick.pieceId) {
    const piece = engine.pieceById(pick.pieceId);
    if (piece) selectPiece(piece);
  } else {
    selectedPieceId = undefined;
    hint = '选择一张卡牌部署，或选择己方单位行动。';
  }
  render();
}

function newGame(mode: 'normal' | 'demo') {
  engine = new GameEngine(mode);
  selectedPieceId = undefined;
  selectedCardUid = undefined;
  hint = mode === 'demo' ? '选择位于北方的潜猎体，移动到龙族建筑群唯一的绿色缺口。' : '选择一张卡牌部署，或选择己方单位行动。';
  scene.resetCamera();
  render();
}

endTurnButton.addEventListener('click', () => {
  engine.endTurn();
  selectedPieceId = undefined;
  selectedCardUid = undefined;
  hint = '新回合开始：已抽牌并重置单位行动。';
  render();
});
document.querySelector('#restart')!.addEventListener('click', () => newGame('normal'));
document.querySelector('#demo-load')!.addEventListener('click', () => newGame('demo'));
document.querySelector('#camera-reset')!.addEventListener('click', () => scene.resetCamera());
styleButton.addEventListener('click', () => {
  painted = !painted;
  scene.setMode(painted ? 'painted' : 'clay');
  styleButton.textContent = `材质：${painted ? '彩绘' : '素模'}`;
  render();
});
window.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    selectedCardUid = undefined;
    selectedPieceId = undefined;
    hint = '已取消选择。';
    render();
  }
  if (event.key === 'Enter' && !(document.activeElement instanceof HTMLButtonElement)) endTurnButton.click();
});

codexElement.innerHTML = `
  <h2>种族档案</h2>
  <div class="codex dragon"><strong>烬翼龙族</strong><p>${RACE_INFO.dragon.passive}</p></div>
  <div class="codex swarm"><strong>幽殖异潮</strong><p>${RACE_INFO.swarm.passive}</p></div>
`;

(window as unknown as { __legion: unknown }).__legion = {
  getState: () => engine.state,
  getEngine: () => engine,
  project: (x: number, y: number) => scene.project({ x, y }),
  render,
  newGame,
};

render();

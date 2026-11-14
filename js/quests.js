import { QUESTS } from './data.js';

export class QuestSystem {
  constructor(player) {
    this.player = player;
    this.states = {};
  }

  startQuest(id) {
    if (!QUESTS[id] || this.states[id]) return false;
    this.states[id] = { status: 'active', progress: 0 };
    return true;
  }

  isComplete(id) {
    const state = this.states[id];
    const quest = QUESTS[id];
    if (!state || !quest || state.status === 'turnedIn') return false;
    if (state.progress >= quest.qty) state.status = 'completed';
    return state.status === 'completed';
  }

  addProgress(id, amount = 1) {
    const state = this.states[id];
    const quest = QUESTS[id];
    if (!state || state.status !== 'active') return false;
    state.progress = Math.min(quest.qty, state.progress + amount);
    if (state.progress >= quest.qty) state.status = 'completed';
    return true;
  }

  onKill(target) {
    for (const [id, quest] of Object.entries(QUESTS)) {
      if (quest.type === 'kill' && quest.target === target) this.addProgress(id, 1);
    }
  }

  onGather(target, qty = 1) {
    for (const [id, quest] of Object.entries(QUESTS)) {
      if (quest.type === 'gather' && quest.target === target) this.addProgress(id, qty);
    }
  }

  turnIn(id) {
    const quest = QUESTS[id];
    if (!quest || !this.isComplete(id)) return null;
    const { reward } = quest;
    this.player.gold += reward.gold || 0;
    if (reward.xp) this.player.gainXp(reward.xp);
    Object.entries(reward.items || {}).forEach(([itemId, qty]) => this.player.addItem(itemId, qty));
    this.states[id].status = 'turnedIn';
    return reward;
  }

  getActiveList() {
    return Object.entries(this.states)
      .filter(([, state]) => state.status !== 'turnedIn')
      .map(([id, state]) => ({ id, ...QUESTS[id], ...state, complete: this.isComplete(id) }));
  }

  toSave() {
    return JSON.parse(JSON.stringify(this.states));
  }

  loadSave(states) {
    this.states = states && typeof states === 'object' ? JSON.parse(JSON.stringify(states)) : {};
  }
}

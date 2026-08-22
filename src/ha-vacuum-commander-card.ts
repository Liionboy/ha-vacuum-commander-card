import { LitElement, html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';

const CARD = 'ha-vacuum-commander-card';
console.info(`%c 🤖 VACUUM-COMMANDER %c v1.1.0 `,'color:#fff;background:#10b981;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px;','color:#fff;background:#6b7280;font-weight:700;border-radius:0 4px 4px 0;padding:2px 6px;');

interface Room { id: string; name: string; icon?: string; segments?: number[] | string; }
interface VacuumConfig { type: string; title?: string; entity?: string; rooms?: Room[]; }

// `segments` = ID-urile numerice reale ale segmentelor din harta vacuumului
// (din aplicația Xiaomi/Dreame). Dacă lipsește, se trimite `id` ca fallback.
const DEFAULT_ROOMS = [
  { id: 'living', name: 'Living', icon: 'mdi:sofa', segments: [1] },
  { id: 'bucatarie', name: 'Bucătărie', icon: 'mdi:silverware', segments: [2] },
  { id: 'dormitor', name: 'Dormitor', icon: 'mdi:bed', segments: [3] },
  { id: 'baie', name: 'Baie', icon: 'mdi:shower', segments: [4] },
  { id: 'birou', name: 'Birou', icon: 'mdi:desk', segments: [5] },
  { id: 'hol', name: 'Hol', icon: 'mdi:door', segments: [6] },
];

@customElement(CARD)
export class VacuumCommanderCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: VacuumConfig;

  public static getStubConfig(): VacuumConfig {
    return { type: CARD, title: '🤖 Vacuum', entity: 'vacuum.my_vacuum', rooms: DEFAULT_ROOMS };
  }

  setConfig(config: VacuumConfig): void {
    if (!config) throw new Error('Invalid config');
    this.config = { type: CARD, title: '🤖 Vacuum', entity: 'vacuum.my_vacuum', rooms: DEFAULT_ROOMS, ...config };
  }

  private _getEntity() { return this.hass?.states[this.config.entity || 'vacuum.my_vacuum']; }
  private _getState() { return this._getEntity()?.state || 'unknown'; }
  private _getAttr(attr: string) { return (this._getEntity()?.attributes as Record<string, unknown>)?.[attr]; }
  private _getBattery() { return this._getAttr('battery_level') as number || 0; }
  private _getFanSpeed() { return this._getAttr('fan_speed') as string || 'unknown'; }
  private _getFriendlyName() { return (this._getEntity()?.attributes as Record<string, unknown>)?.friendly_name as string || 'Vacuum'; }

  private _callService(service: string, data?: Record<string, unknown>) {
    this.hass.callService('vacuum', service, { entity_id: this.config.entity || 'vacuum.my_vacuum', ...data });
  }

  private _cleanRoom(room: Room) {
    const segments = room.segments ?? room.id;
    const segmentIds = Array.isArray(segments)
      ? segments
      : segments.split(',').map((s) => s.trim()).filter(Boolean);
    this._callService('send_command', { command: 'app_segment_clean', params: { segment_ids: segmentIds } });
  }

  private _stateLabel(state: string): string {
    const labels: Record<string, string> = { cleaning: 'Curăță', docked: 'La bază', returning: 'Se întoarce', paused: 'Pauză', error: 'Eroare', idle: 'Inactiv' };
    return labels[state] || state;
  }

  private _stateIcon(state: string): string {
    const icons: Record<string, string> = { cleaning: 'mdi:robot-vacuum', docked: 'mdi:robot-vacuum', returning: 'mdi:robot-vacuum', paused: 'mdi:pause-circle', error: 'mdi:alert-circle', idle: 'mdi:robot-vacuum' };
    return icons[state] || 'mdi:robot-vacuum';
  }

  getCardSize() { return 4; }

  protected render(): TemplateResult | typeof nothing {
    if (!this.config || !this.hass) return nothing;
    const state = this._getState();
    const battery = this._getBattery();
    const fanSpeed = this._getFanSpeed();
    const isCleaning = state === 'cleaning';

    return html`
      <ha-card>
        <div class="header state-${state}">
          <div class="header-icon"><ha-icon .icon=${this._stateIcon(state)}></ha-icon></div>
          <div class="header-text">
            <div class="header-title">${this.config.title || this._getFriendlyName()}</div>
            <div class="header-sub">${this._stateLabel(state)} · ${fanSpeed}</div>
          </div>
          <div class="battery ${battery < 20 ? 'low' : ''}">
            <ha-icon icon="mdi:battery${battery < 20 ? '-alert' : ''}"></ha-icon>
            <span>${battery}%</span>
          </div>
        </div>

        <div class="content">
          <!-- Controls -->
          <div class="controls">
            ${state === 'cleaning' ? html`
              <button class="ctrl-btn" @click=${() => this._callService('pause')}><ha-icon icon="mdi:pause"></ha-icon><span>Pauză</span></button>
              <button class="ctrl-btn stop" @click=${() => this._callService('stop')}><ha-icon icon="mdi:stop"></ha-icon><span>Stop</span></button>
              <button class="ctrl-btn" @click=${() => this._callService('return_to_base')}><ha-icon icon="mdi:home"></ha-icon><span>Bază</span></button>
            ` : html`
              <button class="ctrl-btn start" @click=${() => this._callService('start')}><ha-icon icon="mdi:play"></ha-icon><span>Start</span></button>
              ${state === 'paused' ? html`
                <button class="ctrl-btn" @click=${() => this._callService('start')}><ha-icon icon="mdi:play"></ha-icon><span>Resume</span></button>
              ` : nothing}
              <button class="ctrl-btn" @click=${() => this._callService('return_to_base')}><ha-icon icon="mdi:home"></ha-icon><span>Bază</span></button>
            `}
          </div>

          <!-- Rooms -->
          ${(this.config.rooms || []).length > 0 ? html`
            <div class="rooms-title">Camere</div>
            <div class="rooms">
              ${(this.config.rooms || []).map(room => html`
                <button class="room-btn" @click=${() => this._cleanRoom(room)}>
                  <ha-icon .icon=${room.icon || 'mdi:room'}></ha-icon>
                  <span>${room.name}</span>
                </button>
              `)}
            </div>
          ` : nothing}

          <!-- Quick clean -->
          <div class="quick-clean">
            <button class="quick-btn" @click=${() => this._callService('clean_spot')}><ha-icon icon="mdi:broom"></ha-icon><span>Curățare rapidă</span></button>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host { display: block; }
      ha-card { border-radius: 16px; overflow: hidden; }
      .header { display: flex; align-items: center; gap: 12px; padding: 18px 20px; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .header.state-cleaning { background: linear-gradient(135deg, rgba(16,185,129,0.08), rgba(34,197,94,0.06)); }
      .header.state-docked { background: rgba(255,255,255,0.02); }
      .header.state-error { background: linear-gradient(135deg, rgba(239,68,68,0.08), rgba(245,158,11,0.06)); }
      .header-icon ha-icon { --mdc-icon-size: 28px; color: var(--primary-text-color); }
      .header-text { flex: 1; }
      .header-title { font-size: 16px; font-weight: 600; color: var(--primary-text-color); }
      .header-sub { font-size: 12px; color: var(--secondary-text-color); }
      .battery { display: flex; align-items: center; gap: 4px; padding: 4px 10px; border-radius: 10px; background: rgba(34,197,94,0.1); }
      .battery ha-icon { --mdc-icon-size: 16px; color: #22c55e; }
      .battery span { font-size: 13px; font-weight: 600; color: #22c55e; }
      .battery.low { background: rgba(239,68,68,0.1); }
      .battery.low ha-icon, .battery.low span { color: #ef4444; }
      .content { padding: 16px; }
      .controls { display: flex; gap: 8px; margin-bottom: 16px; justify-content: center; }
      .ctrl-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: var(--primary-text-color); cursor: pointer; transition: all 0.2s; }
      .ctrl-btn:hover { background: rgba(255,255,255,0.08); }
      .ctrl-btn ha-icon { --mdc-icon-size: 22px; }
      .ctrl-btn span { font-size: 11px; }
      .ctrl-btn.start ha-icon { color: #22c55e; }
      .ctrl-btn.stop ha-icon { color: #ef4444; }
      .rooms-title { font-size: 13px; font-weight: 600; color: var(--secondary-text-color); margin-bottom: 8px; }
      .rooms { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
      .room-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 12px 8px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.02); color: var(--primary-text-color); cursor: pointer; transition: all 0.2s; }
      .room-btn:hover { background: rgba(16,185,129,0.1); border-color: rgba(16,185,129,0.2); }
      .room-btn ha-icon { --mdc-icon-size: 20px; }
      .room-btn span { font-size: 12px; }
      .quick-clean { text-align: center; }
      .quick-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: var(--primary-text-color); cursor: pointer; font-size: 13px; }
      .quick-btn:hover { background: rgba(255,255,255,0.06); }
      .quick-btn ha-icon { --mdc-icon-size: 16px; }
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'ha-vacuum-commander-card': VacuumCommanderCard; } }

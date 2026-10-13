import { LitElement, html, css, CSSResultGroup, TemplateResult, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { HomeAssistant, fireEvent } from 'custom-card-helpers';

const CARD = 'ha-vacuum-commander-card';
console.info(`%c 🤖 VACUUM-COMMANDER %c v1.3.0 `,'color:#fff;background:#10b981;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px;','color:#fff;background:#6b7280;font-weight:700;border-radius:0 4px 4px 0;padding:2px 6px;');

interface Room { id: string | number; name: string; icon?: string; segments?: number[] | string; }
type Palette = 'aurora' | 'ocean' | 'sunset' | 'lavender';
interface VacuumConfig { type: string; title?: string; entity?: string; rooms?: Room[]; map_entity?: string; battery_entity?: string; palette?: Palette; }

@customElement(CARD)
export class VacuumCommanderCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: VacuumConfig;
  private _holdTimer?: ReturnType<typeof setTimeout>;
  private _holdStart?: { x: number; y: number };
  private _longPressTriggered = false;

  public static getStubConfig(): VacuumConfig {
    return { type: CARD, title: '🤖 Vacuum', entity: 'vacuum.my_vacuum', palette: 'aurora' };
  }

  setConfig(config: VacuumConfig): void {
    if (!config) throw new Error('Invalid config');
    const palette = ['aurora', 'ocean', 'sunset', 'lavender'].includes(config.palette || '') ? config.palette : 'aurora';
    this.config = { ...config, type: CARD, title: config.title || '🤖 Vacuum', entity: config.entity || 'vacuum.my_vacuum', palette };
  }

  private _getEntity() { return this.hass?.states[this.config.entity || 'vacuum.my_vacuum']; }
  private _getState() { return this._getEntity()?.state || 'unknown'; }
  private _getAttr(attr: string) { return (this._getEntity()?.attributes as Record<string, unknown>)?.[attr]; }
  private _getBattery(): number | undefined {
    const entityId = this.config.battery_entity || `sensor.${(this.config.entity || 'vacuum.my_vacuum').split('.')[1]}_battery_level`;
    const sensorState = this.hass?.states[entityId]?.state;
    const value = this._getAttr('battery_level') ?? (sensorState && !['unknown', 'unavailable'].includes(sensorState) ? sensorState : undefined);
    const battery = Number(value);
    return Number.isFinite(battery) && battery >= 0 && battery <= 100 ? battery : undefined;
  }
  private _getFanSpeed() { return this._getAttr('fan_speed') as string || 'unknown'; }
  private _getFriendlyName() { return (this._getEntity()?.attributes as Record<string, unknown>)?.friendly_name as string || 'Vacuum'; }

  private _getRooms(): Room[] {
    if (this.config.rooms !== undefined) return this.config.rooms;
    const roomMaps = this._getAttr('rooms') as Record<string, Array<Record<string, unknown>>> | undefined;
    if (!roomMaps || typeof roomMaps !== 'object') return [];
    const selectedMap = String(this._getAttr('selected_map') || '');
    const rooms = roomMaps[selectedMap] || Object.values(roomMaps)[0] || [];
    return rooms.filter((room) => room && room.id !== undefined && room.name)
      .map((room) => ({ id: room.id as string | number, name: this._roomLabel(String(room.name)), icon: String(room.icon || 'mdi:door') }));
  }

  private _roomLabel(name: string): string {
    const labels: Record<string, string> = {
      'office': 'Birou', 'living room': 'Living', 'hallway': 'Hol',
      'bathroom': 'Baie', 'kitchen': 'Bucătărie',
      'secondary bedroom': 'Dormitor secundar', 'master bedroom': 'Dormitor matrimonial',
      'room 4': 'Cameră 4 · verifică',
    };
    return labels[name.trim().toLowerCase()] || name;
  }

  private _onPointerDown(event: PointerEvent): void {
    if (event.button !== 0 || event.composedPath().some((node) => node instanceof HTMLElement && node.matches('button, a, input, select, textarea, ha-slider'))) return;
    this._holdStart = { x: event.clientX, y: event.clientY };
    this._holdTimer = setTimeout(() => {
      this._longPressTriggered = true;
      fireEvent(this, 'hass-more-info', { entityId: this.config.entity || 'vacuum.my_vacuum' });
    }, 600);
  }

  private _onPointerMove(event: PointerEvent): void {
    if (this._holdStart && Math.hypot(event.clientX - this._holdStart.x, event.clientY - this._holdStart.y) > 10) this._onPointerEnd();
  }

  private _onPointerEnd(): void {
    if (this._holdTimer) clearTimeout(this._holdTimer);
    this._holdTimer = undefined;
    this._holdStart = undefined;
  }

  private _onContextMenu(event: Event): void {
    if (!this._longPressTriggered) return;
    event.preventDefault();
    this._longPressTriggered = false;
  }

  private _isDreameVacuum(): boolean {
    return Boolean(this._getAttr('rooms') && this._getAttr('selected_map'));
  }

  private _getMapIndex(): number | undefined {
    const entityId = this.config.map_entity || `camera.${(this.config.entity || 'vacuum.my_vacuum').split('.')[1]}_map`;
    const index = Number(this.hass?.states[entityId]?.attributes?.map_index);
    return Number.isInteger(index) && index >= 0 ? index : undefined;
  }

  private _callService(service: string, data?: Record<string, unknown>) {
    this.hass.callService('vacuum', service, { entity_id: this.config.entity || 'vacuum.my_vacuum', ...data });
  }

  private _cleanRoom(room: Room) {
    const segments = room.segments ?? room.id;
    const segmentIds = (Array.isArray(segments)
      ? segments
      : String(segments).split(',').map((s) => s.trim()).filter(Boolean)).map(String);
    if (this._isDreameVacuum()) {
      const mapIndex = this._getMapIndex();
      if (mapIndex === undefined) return;
      const dreameSegments = segmentIds.map((segment) => segment.includes('_') ? segment : `${mapIndex}_${segment}`);
      this.hass.callService('dreame_vacuum', 'vacuum_clean_segment', {
        entity_id: this.config.entity || 'vacuum.my_vacuum',
        segments: dreameSegments,
      });
      return;
    }
    // Compatibility path for other vacuum integrations that implement the legacy command.
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
    const rooms = this._getRooms();
    const hasUnidentifiedRoom = rooms.some((room) => room.name.includes('· verifică'));
    const batteryAvailable = battery !== undefined;
    const mapUnavailable = this._isDreameVacuum() && this._getMapIndex() === undefined;

    return html`
      <ha-card data-palette=${this.config.palette || 'aurora'} @pointerdown=${(event: PointerEvent) => this._onPointerDown(event)} @pointermove=${(event: PointerEvent) => this._onPointerMove(event)} @pointerup=${this._onPointerEnd} @pointercancel=${this._onPointerEnd} @pointerleave=${this._onPointerEnd} @contextmenu=${(event: Event) => this._onContextMenu(event)}>
        <div class="shell">
          <div class="header">
            <div class="identity">
              <div class="icon-wrap state-${state}"><ha-icon .icon=${this._stateIcon(state)}></ha-icon></div>
              <div class="header-text">
                <div class="eyebrow">Vacuum Commander</div>
                <div class="header-title">${this.config.title || this._getFriendlyName()}</div>
              </div>
            </div>
            <div class="header-meta">
              <div class="pill ${state === 'cleaning' ? 'active' : state === 'error' ? 'error' : ''}"><span class="dot"></span>${this._stateLabel(state)}</div>
              ${batteryAvailable ? html`<div class="battery ${battery! < 20 ? 'low' : ''}"><ha-icon icon="mdi:battery"></ha-icon><span>${battery}%</span></div>` : nothing}
            </div>
          </div>
          <div class="subline">${fanSpeed}</div>
          <div class="content">
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
          ${rooms.length > 0 ? html`
            <div class="rooms-title">Camere</div>
            <div class="rooms">
              ${rooms.map(room => html`
                <button class="room-btn" ?disabled=${mapUnavailable} title=${mapUnavailable ? 'Harta vacuumului nu este disponibilă.' : ''} @click=${() => this._cleanRoom(room)}>
                  <ha-icon .icon=${room.icon || 'mdi:room'}></ha-icon>
                  <span>${room.name}</span>
                </button>
              `)}
            </div>
            ${hasUnidentifiedRoom ? html`<div class="map-warning">„Cameră 4 · verifică” are numele implicit din hartă. Identific-o și redenumește-o în aplicația Dreame.</div>` : nothing}
            ${mapUnavailable ? html`<div class="map-warning">Harta selectată nu este disponibilă; curățarea pe camere este dezactivată.</div>` : nothing}
          ` : nothing}

          <!-- Quick clean -->
          <div class="quick-clean">
            <button class="quick-btn" @click=${() => this._callService('clean_spot')}><ha-icon icon="mdi:broom"></ha-icon><span>Curățare rapidă</span></button>
          </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return css`
      :host { display:block; min-width:0; max-width:100%; }
      ha-card { box-sizing:border-box; width:100%; min-width:0; max-width:100%; container-type:inline-size; container-name:vacuum-card; overflow:hidden; border:1px solid color-mix(in srgb,var(--divider-color) 58%,transparent); border-radius:24px; background:var(--ha-card-background,var(--card-background-color,#fff)); box-shadow:var(--ha-card-box-shadow,0 12px 34px rgba(20,35,55,.1)); touch-action:pan-y; }
      ha-card[data-palette="aurora"] { --vac-a:#078f72; --vac-b:#27b7b0; --vac-c:#54a9db; }
      ha-card[data-palette="ocean"] { --vac-a:#1477c9; --vac-b:#22a7c7; --vac-c:#6b68d8; }
      ha-card[data-palette="sunset"] { --vac-a:#df5d42; --vac-b:#ee973f; --vac-c:#cf5d9e; }
      ha-card[data-palette="lavender"] { --vac-a:#8059c7; --vac-b:#b56cc8; --vac-c:#4c9bc7; }
      .shell { --glow:var(--vac-a); position:relative; padding:clamp(16px,3cqi,22px); background:radial-gradient(ellipse at 0% 0%,color-mix(in srgb,var(--vac-a) 13%,transparent),transparent 54%),radial-gradient(ellipse at 100% 100%,color-mix(in srgb,var(--vac-b) 9%,transparent),transparent 48%); }
      .shell::before { position:absolute; top:0; right:22px; left:22px; height:3px; border-radius:0 0 4px 4px; background:linear-gradient(90deg,var(--vac-a),var(--vac-b),var(--vac-c)); content:""; }
      .header { display:flex; justify-content:space-between; align-items:center; gap:12px; min-width:0; }
      .identity { display:flex; align-items:center; gap:12px; min-width:0; }
      .icon-wrap { display:grid; place-items:center; flex:0 0 48px; width:48px; height:48px; border:1px solid color-mix(in srgb,var(--vac-a) 25%,transparent); border-radius:17px; color:#fff; background:linear-gradient(145deg,var(--vac-a),var(--vac-b)); box-shadow:0 7px 18px color-mix(in srgb,var(--vac-a) 24%,transparent); }
      .icon-wrap ha-icon { --mdc-icon-size:25px; }
      .icon-wrap.state-cleaning { color:var(--success-color,#168b68); background:color-mix(in srgb,var(--success-color,#168b68) 14%,var(--card-background-color)); }
      .icon-wrap.state-error { color:var(--error-color,#d34444); background:color-mix(in srgb,var(--error-color,#d34444) 13%,var(--card-background-color)); }
      .header-text { min-width:0; }
      .eyebrow { color:var(--vac-a); font-size:9px; font-weight:800; letter-spacing:.13em; text-transform:uppercase; }
      .header-title { overflow:hidden; color:var(--primary-text-color); font-size:19px; font-weight:750; line-height:1.2; text-overflow:ellipsis; white-space:nowrap; }
      .header-meta { display:flex; align-items:center; gap:7px; flex:0 0 auto; }
      .pill { display:flex; align-items:center; gap:7px; padding:8px 11px; border-radius:999px; color:var(--secondary-text-color); background:var(--secondary-background-color); font-size:11px; font-weight:750; white-space:nowrap; }
      .pill.active { color:var(--success-color,#218a72); }
      .pill.error { color:var(--error-color,#d34444); }
      .dot { width:8px; height:8px; border-radius:50%; background:currentColor; }
      .pill.active .dot { box-shadow:0 0 0 4px color-mix(in srgb,currentColor 17%,transparent); }
      .battery { display:flex; align-items:center; gap:4px; padding:7px 9px; border-radius:999px; color:var(--success-color,#218a72); background:color-mix(in srgb,var(--success-color,#218a72) 10%,var(--card-background-color)); font-size:11px; font-weight:750; }
      .battery ha-icon { --mdc-icon-size:15px; }
      .battery.low { color:var(--error-color,#d34444); background:color-mix(in srgb,var(--error-color,#d34444) 10%,var(--card-background-color)); }
      .subline { margin:3px 0 0 60px; color:var(--secondary-text-color); font-size:11px; }
      .content { margin-top:18px; }
      .controls { display:flex; justify-content:center; gap:8px; margin-bottom:17px; }
      .ctrl-btn,.room-btn,.quick-btn { min-width:0; border:1px solid color-mix(in srgb,var(--divider-color) 60%,transparent); background:color-mix(in srgb,var(--secondary-background-color) 62%,transparent); color:var(--primary-text-color); font:inherit; cursor:pointer; transition:background .18s,border-color .18s,transform .18s; }
      .ctrl-btn { display:flex; flex:1 1 0; flex-direction:column; align-items:center; justify-content:center; gap:5px; min-height:62px; max-width:140px; padding:9px 10px; border-radius:16px; }
      .ctrl-btn:hover,.room-btn:hover,.quick-btn:hover { border-color:color-mix(in srgb,var(--vac-a) 36%,var(--divider-color)); background:color-mix(in srgb,var(--vac-a) 9%,var(--secondary-background-color)); }
      .ctrl-btn:active,.room-btn:active,.quick-btn:active { transform:scale(.98); }
      .ctrl-btn ha-icon { --mdc-icon-size:21px; }
      .ctrl-btn span { font-size:11px; font-weight:700; }
      .ctrl-btn.start ha-icon { color:var(--success-color,#218a72); }
      .ctrl-btn.stop ha-icon { color:var(--error-color,#d34444); }
      .rooms-title { margin-bottom:9px; color:var(--primary-text-color); font-size:13px; font-weight:750; }
      .rooms { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-bottom:13px; }
      .room-btn { display:flex; align-items:center; justify-content:flex-start; gap:8px; min-height:46px; padding:8px 10px; border-radius:14px; text-align:left; }
      .room-btn ha-icon { flex:0 0 auto; --mdc-icon-size:19px; color:var(--vac-a); }
      .room-btn:nth-child(3n + 2) ha-icon { color:var(--vac-b); }
      .room-btn:nth-child(3n) ha-icon { color:var(--vac-c); }
      .room-btn:nth-child(3n + 1) { background:linear-gradient(135deg,color-mix(in srgb,var(--vac-a) 8%,var(--card-background-color,#fff)),var(--card-background-color,#fff)); }
      .room-btn:nth-child(3n + 2) { background:linear-gradient(135deg,color-mix(in srgb,var(--vac-b) 9%,var(--card-background-color,#fff)),var(--card-background-color,#fff)); }
      .room-btn:nth-child(3n) { background:linear-gradient(135deg,color-mix(in srgb,var(--vac-c) 9%,var(--card-background-color,#fff)),var(--card-background-color,#fff)); }
      .room-btn:hover { background:color-mix(in srgb,var(--vac-a) 13%,var(--card-background-color,#fff)); }
      .room-btn span { overflow:hidden; font-size:11px; font-weight:650; text-overflow:ellipsis; white-space:nowrap; }
      .room-btn:disabled { opacity:.45; cursor:not-allowed; }
      .map-warning { margin:0 0 12px; color:var(--error-color,#d34444); font-size:11px; }
      .quick-clean { display:flex; justify-content:center; }
      .quick-btn { display:inline-flex; align-items:center; justify-content:center; gap:7px; min-height:40px; padding:0 15px; border-radius:13px; font-size:12px; font-weight:700; }
      .quick-btn { border-color:color-mix(in srgb,var(--vac-a) 24%,var(--divider-color)); background:linear-gradient(110deg,color-mix(in srgb,var(--vac-a) 10%,var(--card-background-color,#fff)),color-mix(in srgb,var(--vac-b) 12%,var(--card-background-color,#fff))); }
      .quick-btn ha-icon { --mdc-icon-size:17px; color:var(--vac-a); }
      @container vacuum-card (max-width:480px) { .shell{padding:15px}.header{gap:8px}.identity{gap:9px}.icon-wrap{flex-basis:40px;width:40px;height:40px;border-radius:14px}.icon-wrap ha-icon{--mdc-icon-size:22px}.header-title{font-size:17px}.pill{gap:5px;padding:7px 9px;font-size:10px}.battery{padding:6px 8px}.subline{margin-left:49px}.content{margin-top:14px}.controls{gap:6px;margin-bottom:13px}.ctrl-btn{min-height:53px;padding:7px 6px;border-radius:14px}.rooms{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.room-btn{min-height:42px;padding:7px 9px} }
      @container vacuum-card (max-width:360px) { .shell{padding:12px}.header-meta{gap:4px}.pill{gap:4px;padding:6px 7px;font-size:9px}.battery{gap:2px;padding:5px 6px;font-size:10px}.header-title{font-size:16px}.subline{margin-left:45px;font-size:10px}.rooms{gap:6px}.room-btn{gap:6px;padding:6px 7px}.room-btn span{font-size:10px} }
      @media (prefers-reduced-motion:reduce) { *,*::before,*::after { transition:none !important; } }
    `;
  }
}

declare global { interface HTMLElementTagNameMap { 'ha-vacuum-commander-card': VacuumCommanderCard; } }

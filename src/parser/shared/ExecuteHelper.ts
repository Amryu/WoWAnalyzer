import Events, { ApplyBuffEvent, DamageEvent, FightEndEvent, RemoveBuffEvent } from 'parser/core/Events';
import Analyzer from 'parser/core/Analyzer';
import { formatDuration } from 'common/format';

const debug = false;

const MS_BUFFER = 500;

class ExecuteHelper extends Analyzer {

  //region IMPLEMENTME statics
  /**
   * Array of objects from common/SPELLS
   * This should contain any execute spells such as Kill Shot, Execute etc.
   */
  static executeSpells: { id: number, name: string, icon: string }[] = [];

  /**
   * SELECTED_PLAYER or SELECTED_PLAYER_PET for usage in the eventfilter
   */
  static executeSources: number;

  /**
   * Array of objects from common/SPELLS
   * This should contain any SPELLS object that allows execute to be used outside normal execute range
   */
  static executeOutsideRangeEnablers: { id: number, name: string, icon: string }[] = [];

  /**
   * The lower threshold where execute is enabled, shown in decimals.
   */
  static lowerThreshold: number;

  /**
   * The upper threshold where an execute can be enabled immediately at a pull, shown in decimals.
   */
  static upperThreshold: number;
  //endregion

  //region Generic Variables
  /**
   * Is true if we're in an execute window either because of a buff giving access to execute spells or because of health windows
   */
  inExecuteWindow: boolean = false;

  /**
   * Is true if we're in an execute window due to health on a target, so a buff granting access to execute is pointless at this point
   */
  inHealthExecuteWindow: boolean = false;

  /**
   * A variable marking the timestamp of the start of the current execute window
   */
  executeWindowStart: number = 0;

  /**
   * A variable marking the timestamp of the last damage event within the execute window
   */
  lastExecuteHitTimestamp: number = 0;

  /**
   * The amount of time spent inside executewindows, either caused by health or by buffs giving access to execute
   */
  totalExecuteWindowDuration: number = 0;

  /**
   * Amount of damage done by the spells defined in executeSpells
   */
  damage: number = 0;
  //endregion

  //region Execute helpers
  /**
   * Returns true if the event has less HP than the threshold.
   * This is useful for any generic execute.
   * @param event
   */
  isTargetInExecuteRange(event: DamageEvent) {
    if (!event.hitPoints || !event.maxHitPoints) {
      return false;
    }
    return (event.hitPoints / event.maxHitPoints) < this.lowerThreshold;
  }

  /**
   * Returns true if the event has more HP than the threshold.
   * This is useful for things like Firestarter and Flashpoint.
   * @param event
   */
  isTargetInReverseExecuteRange(event: DamageEvent) {
    if (!event.hitPoints || !event.maxHitPoints) {
      return false;
    }
    return (event.hitPoints / event.maxHitPoints) > this.upperThreshold;
  }

  /**
   * Returns true if either isTargetInExecuteRange() or isTargetInReverseExecuteRange() is true.
   * @param event
   */
  isTargetInHealthExecuteWindow(event: DamageEvent) {
    if (!event.hitPoints || !event.maxHitPoints) {
      return false;
    }
    return (this.isTargetInExecuteRange(event) || this.isTargetInReverseExecuteRange(event));
  }

  /**
   * Returns true if the combatant has one of the buffs that enable execute to be used outside of the regular execute windows
   */
  isExecuteUsableOutsideExecuteRange() {
    let usable: boolean = false;
    this.executeOutsideRangeEnablers.forEach(spell => {
      if (this.selectedCombatant.hasBuff(spell.id)) {
        usable = true;
      }
    });
    return usable;
  }

  //endregion

  constructor(options: any) {
    super(options);
    this.addEventListener(Events.damage.by(this.executeSources), this.onGeneralDamage);
    this.addEventListener(Events.damage.by(this.executeSources).spell(this.executeSpells), this.onExecuteDamage);
    this.addEventListener(Events.applybuff.to(this.executeSources).spell(this.executeOutsideRangeEnablers), this.applyExecuteEnablerBuff);
    this.addEventListener(Events.removebuff.to(this.executeSources).spell(this.executeOutsideRangeEnablers), this.removeExecuteEnablerBuff);
    this.addEventListener(Events.fightend, this.onFightEnd);
  }

  //region Static Getters
  get executeSources() {
    const ctor = this.constructor as typeof ExecuteHelper;
    return ctor.executeSources;
  }

  get executeSpells() {
    const ctor = this.constructor as typeof ExecuteHelper;
    return ctor.executeSpells;
  }

  get executeOutsideRangeEnablers() {
    const ctor = this.constructor as typeof ExecuteHelper;
    return ctor.executeOutsideRangeEnablers;
  }

  get lowerThreshold() {
    const ctor = this.constructor as typeof ExecuteHelper;
    return ctor.lowerThreshold;
  }

  get upperThreshold() {
    const ctor = this.constructor as typeof ExecuteHelper;
    return ctor.upperThreshold;
  }

  //endregion

  //region Generic Getters
  get executeDamage() {
    return this.damage;
  }

  get totalExecuteDuration() {
    return this.totalExecuteWindowDuration;
  }

  //endregion

  //region Event Listener functions
  onGeneralDamage(event: DamageEvent) {
    if (event.targetIsFriendly) {
      return;
    }
    if (this.isExecuteUsableOutsideExecuteRange || this.isTargetInHealthExecuteWindow(event)) {
      this.lastExecuteHitTimestamp = event.timestamp;
      if (!this.inExecuteWindow) {
        this.inExecuteWindow = true;
        this.inHealthExecuteWindow = true;
        this.executeWindowStart = event.timestamp;
        debug && console.log('Execute window started');
      }
    } else {
      if (this.inExecuteWindow && event.timestamp > this.lastExecuteHitTimestamp + MS_BUFFER) {
        this.inExecuteWindow = false;
        this.inHealthExecuteWindow = false;
        this.totalExecuteWindowDuration += event.timestamp - this.executeWindowStart;
        debug && console.log('Execute window ended, current total: ', this.totalExecuteDuration);
      }
    }
  }

  onExecuteDamage(event: DamageEvent) {
    this.damage += event.amount + (event.absorbed || 0);
  }

  applyExecuteEnablerBuff(event: ApplyBuffEvent) {
    if (!this.inExecuteWindow && !this.inHealthExecuteWindow) {
      this.executeWindowStart = event.timestamp;
    }
    this.inExecuteWindow = true;
    this.lastExecuteHitTimestamp = event.timestamp;
    debug && console.log(event.ability.name, ' was applied starting the execute window');
  }

  removeExecuteEnablerBuff(event: RemoveBuffEvent) {
    if (!this.inHealthExecuteWindow) {
      this.inExecuteWindow = false;
      this.totalExecuteWindowDuration += event.timestamp - this.executeWindowStart;
      debug && console.log(event.ability.name, ' was removed ending the execute window, current total: ', this.totalExecuteDuration);
    } else {
      debug && console.log('Execute enabler buff ended, but inside execute health window so window still ongoing.');
    }
  }

  onFightEnd(event: FightEndEvent) {
    if (this.inExecuteWindow) {
      this.totalExecuteWindowDuration += event.timestamp - this.executeWindowStart;
      this.inExecuteWindow = false;
    }
    debug && console.log('Fight ended, total duration of execute: ' + this.totalExecuteDuration + ' | ' + formatDuration(this.totalExecuteDuration));
  }

  //endregion
}

export default ExecuteHelper;

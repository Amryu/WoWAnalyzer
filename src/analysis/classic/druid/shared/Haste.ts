import CoreHaste from 'parser/shared/modules/Haste';
import SPELLS from 'common/SPELLS/classic/druid';

class Haste extends CoreHaste {
  hasteBuffs = {
    ...super.hasteBuffs,
    [SPELLS.NATURES_GRACE_BUFF.id]: 0.2,
    [SPELLS.MOONKIN_AURA.id]: 0.03,
  };
}

export default Haste;

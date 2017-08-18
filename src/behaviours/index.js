import DirectCloseBehaviour from './direct-close';
import RandomTimeoutBehaviour from './random-timeout';
import RedirectBehaviour from './redirect';

export const BEHAVIOUR_EVENT_ON_PRESET_FAILED = 'on-preset-failed';

const mapping = {
  'direct-close': DirectCloseBehaviour,
  'random-timeout': RandomTimeoutBehaviour,
  'redirect': RedirectBehaviour
};

const behaviours = Object.keys(mapping);
const behaviourEvents = [BEHAVIOUR_EVENT_ON_PRESET_FAILED];

function getBehaviourClassByName(name) {
  const clazz = mapping[name];
  if (clazz === undefined) {
    throw Error(`cannot find behaviour: "${name}"`);
  }
  return clazz;
}

export {getBehaviourClassByName, behaviourEvents, behaviours};

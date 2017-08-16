import DirectCloseBehaviour from './direct-close';

const mapping = {
  'direct-close': DirectCloseBehaviour
};

function getBehaviourClassByName(name) {
  const clazz = mapping[name];
  if (clazz === undefined) {
    throw Error(`cannot find behaviour: "${name}"`);
  }
  return clazz;
}

const behaviours = Object.keys(mapping);

export {getBehaviourClassByName, behaviours};

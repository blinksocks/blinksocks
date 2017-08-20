import {getBehaviourClassByName} from '..';

describe('getBehaviourClassByName', () => {

  it('should throw when no behaviour found', () => {
    expect(() => getBehaviourClassByName('')).toThrow();
  });

});

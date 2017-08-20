import RandomTimeoutBehaviour from '../random-timeout';

describe('RandomTimeoutBehaviour#new', () => {

  it('should throw when passing invalid params', () => {
    expect(() => new RandomTimeoutBehaviour()).toThrow();
    expect(() => new RandomTimeoutBehaviour({min: ''})).toThrow();
    expect(() => new RandomTimeoutBehaviour({min: -1})).toThrow();
    expect(() => new RandomTimeoutBehaviour({max: ''})).toThrow();
    expect(() => new RandomTimeoutBehaviour({max: -1})).toThrow();
    expect(() => new RandomTimeoutBehaviour({min: 1, max: 0})).toThrow();
    expect(() => new RandomTimeoutBehaviour({})).not.toThrow();
  });

  it('should set min and max to default', () => {
    const behaviour = new RandomTimeoutBehaviour({});
    expect(behaviour.min).toBe(10);
    expect(behaviour.max).toBe(40);
  });

});

describe('RandomTimeoutBehaviour#run', () => {

  it('should call onClose()', async () => {
    const fn = jest.fn();
    const behaviour = new RandomTimeoutBehaviour({min: 0, max: 0});
    await behaviour.run({
      remoteHost: 'test.com',
      remotePort: 443,
      onClose: fn
    });
    expect(fn).toHaveBeenCalled();
  });

});

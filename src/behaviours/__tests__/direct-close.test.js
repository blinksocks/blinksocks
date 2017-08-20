import DirectCloseBehaviour from '../direct-close';

describe('DirectCloseBehaviour#run', () => {

  it('should call onClose()', async () => {
    const fn = jest.fn();
    const behaviour = new DirectCloseBehaviour();
    await behaviour.run({
      remoteHost: 'test.com',
      remotePort: 443,
      onClose: fn
    });
    expect(fn).toHaveBeenCalled();
  });

});

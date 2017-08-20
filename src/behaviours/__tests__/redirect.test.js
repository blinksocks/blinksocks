import RedirectBehaviour from '../redirect';

describe('RedirectBehaviour#new', () => {

  it('should throw when pass invalid params', () => {
    expect(() => new RedirectBehaviour({})).toThrow();
    expect(() => new RedirectBehaviour({host: ''})).toThrow();
    expect(() => new RedirectBehaviour({host: 'test.com'})).toThrow();
    expect(() => new RedirectBehaviour({host: 'test.com', port: -1})).toThrow();
  });

});

describe('RedirectBehaviour#run', () => {

  it('should call connect() and setPresets()', async () => {
    const mockWrite = jest.fn();
    const mockConnect = jest.fn().mockImplementation(async () => {
      return {
        writable: true,
        write: mockWrite
      }
    });
    const mockSetPresets = jest.fn();

    const behaviour = new RedirectBehaviour({host: 'test.com', port: 443});
    await behaviour.run({
      action: {payload: {}},
      remoteHost: '',
      remotePort: 0,
      connect: mockConnect,
      setPresets: mockSetPresets
    });

    expect(mockConnect).toHaveBeenCalled();
    expect(mockSetPresets).toHaveBeenCalled();
    expect(mockWrite).toHaveBeenCalled();
  });

});

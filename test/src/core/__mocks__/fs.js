const fs = jest.genMockFromModule('fs');

fs.statSync = function () {
  return {
    isFile: () => true
  };
};

fs.lstatSync = function () {
  const err = new Error();
  err.code = 'ENOENT';
  throw err;
};

fs.readFileSync = function () {
  return Buffer.alloc(0);
};

module.exports = fs;

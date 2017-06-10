const fs = jest.genMockFromModule('fs');

fs.lstatSync = function () {
  const err = new Error();
  err.code = 'ENOENT';
  throw err;
};

module.exports = fs;

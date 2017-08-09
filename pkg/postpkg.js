const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const utils = require('util');
const zlib = require('zlib');

const {version} = require('../package.json');

const readdir = utils.promisify(fs.readdir);
const remove = utils.promisify(fs.unlink);
const appendFile = utils.promisify(fs.appendFile);
const readFile = utils.promisify(fs.readFile);

async function sha256sum(file) {
  const sha256 = crypto.createHash('sha256');
  const input = await readFile(file);
  return sha256.update(input).digest('hex');
}

(async function main() {
  try {
    let files = await readdir(path.resolve(__dirname));
    files = files.filter((f) => f.startsWith('blinksocks-'));
    for (const file of files) {
      const name = path.basename(file, '.exe');
      const ext = path.extname(file);
      const newName = `${name}-x64-v${version}${ext}.gz`;

      const input = path.join(__dirname, file);
      const output = path.join(__dirname, newName);
      const hashFile = path.join(__dirname, 'sha256sum.txt');

      // compress into .gz
      const stream = fs.createReadStream(input).pipe(zlib.createGzip()).pipe(fs.createWriteStream(output));

      stream.on('finish', async () => {
        // calc sha256sum
        await appendFile(hashFile, `${path.basename(output)} ${await sha256sum(output)}\n`);
        // remove original
        await remove(input);
      });
    }
  } catch (err) {
    console.error(err.message);
  }
})();

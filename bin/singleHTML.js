#! /usr/bin/env node

var fs = require('fs');
var path = require('path');

function getScriptPath(scriptLine) {
  var srcFileTxt = scriptLine.split('src=')[1];
  return srcFileTxt.split(srcFileTxt[0])[1];
}

function getFullpath(filePath) {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.join(process.cwd(), filePath);
}

function mergeFiles(htmlFilePath, outputPath) {
  var htmlContent = fs.readFileSync(htmlFilePath, { encoding: 'utf8', flag: 'r' });
  var basePath = path.dirname(htmlFilePath);

  var lines = htmlContent.split('\n');
  var count = lines.length;
  while (count--) {
    if (lines[count].indexOf('<script ') !== -1 && lines[count].indexOf(' src=') !== -1) {
      var jsCode = fs.readFileSync(path.join(basePath, getScriptPath(lines[count])), { encoding: 'utf8', flag: 'r' });
      jsCode += (lines[count].indexOf('</script>') === -1) ? '' : '\n</script>';
      lines[count] = [
        '<script type="text/javascript">',
        jsCode,
      ].join('\n');
    }
  }
  fs.writeFileSync(outputPath, lines.join('\n'));
}

if (process.argv.length === 4) {
  var htmlFilePath = getFullpath(process.argv[2]);
  var destFilePath = getFullpath(process.argv[3]);
  mergeFiles(htmlFilePath, destFilePath);
} else {
  module.exports = mergeFiles;
}

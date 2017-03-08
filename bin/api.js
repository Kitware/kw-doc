var shell = require('shelljs'),
    path = require('path');

function processModule(basePath, mPath, templateData) {
  templateData.__en__.push(templateData.TAB + templateData.TAB + mPath + ': ' + mPath);
  templateData.__sidebar__.push(templateData.TAB + mPath + ':');

  var bPath = path.join(basePath, mPath);
  var filePrefix = mPath.replace(/\/|\\/g, '_');
  var classes = shell.ls(bPath)
    .filter( function (f) {
      return shell.test('-d', path.join(bPath,f));
    });

  classes.forEach(function(className) {
    templateData.__en__.push(templateData.TAB + templateData.TAB + className + ': ' + className);
    templateData.__sidebar__.push(templateData.TAB + templateData.TAB + className + ': ' + filePrefix + '_' + className + '.html');
    processClass(bPath, className, templateData, filePrefix);
  });
}

function processClass(bPath, className, templateData, filePrefix) {
  var files = shell.ls(path.join(bPath, className))
        .filter(function(f) {
          // Do not include images
          if (['.jpeg', '.png', '.jpg', '.svg'].filter(ext => f.endsWith(ext)).length) {
            return false;
          }
          return shell.test('-f', path.join(bPath, className, f));
        }),
      apiIdx = files.indexOf('api.md'),
      newPath = path.join(templateData.directories.work, 'source/api', filePrefix + '_' + className + '.md');

  if(apiIdx !== -1) {
    files.splice(apiIdx, 1);
    templateData.apiFound.push(className);
    console.log('  +', className);

    // Create MD file
    shell.ShellString('title: ' + className + '\n---\n').to(newPath);
    shell.cat(path.join(bPath, className, 'api.md')).toEnd(newPath);
  } else {
    console.log('  -', className);
    shell.ShellString('title: ' + className + '\n---\n').to(newPath);
  }

  shell.ShellString('\n\n# Source\n\n').toEnd(newPath);
  files.forEach(function(sFile) {
    shell.ShellString('``` js ' + sFile + '\n').toEnd(newPath);
    shell.cat(path.join(bPath, className, sFile)).toEnd(newPath);
    shell.ShellString('```\n').toEnd(newPath);
  });
}

module.exports = processModule;

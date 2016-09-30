var shell = require('shelljs'),
    path = require('path');

function processModule(basePath, mPath, templateData) {
  templateData.__en__.push(templateData.TAB + templateData.TAB + mPath + ': ' + mPath);
  templateData.__sidebar__.push(templateData.TAB + mPath + ':');

  var bPath = path.join(basePath, mPath);
  var classes = shell.ls(bPath)
    .filter( function (f) {
      return shell.test('-d', path.join(bPath,f));
    });

  classes.forEach(function(className) {
    templateData.__en__.push(templateData.TAB + templateData.TAB + className + ': ' + className);
    templateData.__sidebar__.push(templateData.TAB + templateData.TAB + className + ': ' + className + '.html');
    processClass(bPath, className, templateData);
  });
}

function processClass(bPath, className, templateData) {
  var files = shell.ls(path.join(bPath, className))
        .filter(function(f) {
          // Do not include images
          if (['.jpeg', '.png', '.jpg', '.svg'].filter(ext => f.endsWith(ext)).length) {
            return false;
          }
          return shell.test('-f', path.join(bPath, className, f));
        }),
      apiIdx = files.indexOf('api.md'),
      newPath = path.join(templateData.directories.work, 'source/api', className + '.md');

  if(apiIdx !== -1) {
    files.splice(apiIdx, 1);
    templateData.apiFound.push(className);
    console.log('  +', className);

    // Create MD file
    ('title: ' + className + '\n---\n').to(newPath);
    shell.cat(path.join(bPath, className, 'api.md')).toEnd(newPath);
  } else {
    console.log('  -', className);
    ('title: ' + className + '\n---\n').to(newPath);
  }

  ('\n\n# Source\n\n').toEnd(newPath);
  files.forEach(function(sFile) {
    ('``` js ' + sFile + '\n').toEnd(newPath);
    shell.cat(path.join(bPath, className, sFile)).toEnd(newPath);
    ('```\n').toEnd(newPath);
  });
}

module.exports = processModule;

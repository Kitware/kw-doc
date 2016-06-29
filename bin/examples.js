var path = require('path');
var shell = require('shelljs');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var templatePath = path.resolve(__dirname, './template.html');

function getSplitedPath(filePath) {
  var a = filePath.split('/');
  var b = filePath.split('\\');
  return a.length > b.length ? a : b;
}

function buildWebpackConfiguration(defaultConfig, name, baseURL, sourcePath, destPath) {
  var examplePlugins = [
    new HtmlWebpackPlugin({
        template: templatePath,
        inject: 'body',
        title: name,
    }),
    new webpack.DefinePlugin({
        __BASE_PATH__: "'" + baseURL + "'",
    }),
  ];

  var config = Object.assign(
    {
      plugins: []
    },
    defaultConfig,
    {
      entry: sourcePath,
      output: {
        path: destPath,
        filename: name + '.js',
      },
    }
  );

  // Add our plugins
  config.plugins = [].concat(config.plugins, examplePlugins);
  return config;
}

module.exports = function(templateData, done) {
  const baseExampleDirectory = path.join(templateData.directories.work, 'public/examples');
  const markdownBaseExample = path.join(templateData.directories.work, 'source/examples');
  const examplesToBuild = [];

  templateData.__en__.push('  examples:');
  templateData.__sidebar__.push('examples:');
  var exampleGroups = {};
  var sourceMap = {};

  Object.keys(templateData.examples).forEach(function(fullPath) {
    Object.keys(templateData.examples[fullPath]).forEach(function(className) {
      var destPath = path.join(baseExampleDirectory, className);
      var sourcePath = path.join(fullPath, templateData.examples[fullPath][className]);
      sourceMap[className] = sourcePath;
      shell.mkdir('-p', destPath);
      shell.rm('-rf', destPath + '/*');
      examplesToBuild.push({ name: className, destPath: destPath, sourcePath: sourcePath });

      var fullSplittedPath = getSplitedPath(sourcePath);
      while(fullSplittedPath.pop() !== className) {
        // pop is in condition
      }
      // Cut the front (FIXME should know what is the start path)
      while(fullSplittedPath.length > 2) {
        fullSplittedPath.shift();
      }

      var pathName = fullSplittedPath.join('/');
      if(exampleGroups[pathName]) {
        exampleGroups[pathName].push(className);
        templateData.__en__.push(templateData.TAB + templateData.TAB + className + ': ' + className);
      } else {
        templateData.__en__.push(templateData.TAB + templateData.TAB + pathName + ': ' + pathName);
        templateData.__en__.push(templateData.TAB + templateData.TAB + className + ': ' + className);
        exampleGroups[pathName] = [ className ];
      }
    });
  });

  // Process exampleGroups
  Object.keys(exampleGroups).forEach(function(gName) {
    templateData.__sidebar__.push(templateData.TAB + gName + ':');
    exampleGroups[gName].forEach( function(exampleName) {
      templateData.__sidebar__.push(templateData.TAB + templateData.TAB + exampleName + ': ' + exampleName + '.html');
      var destMdFile = path.join(markdownBaseExample, exampleName + '.md');
      (exampleName + '\n----\n### [Live example](./' + exampleName + '/index.html)\n\n').to(destMdFile);
      ('<iframe src="./'+ exampleName +'/index.html" width="100%" height="500px"></iframe>\n\n### Source\n\n```js\n').toEnd(destMdFile);
      shell.cat(sourceMap[exampleName]).toEnd(destMdFile);
      '\n```\n\n'.toEnd(destMdFile);
    });
  });

  var defaultConfig = templateData.webpack;
  var baseURL = templateData.baseUrl;

  function buildExample(list, done) {
    if (list.length) {
      var example = list.pop();
      var config = buildWebpackConfiguration(defaultConfig, example.name, baseURL, example.sourcePath, example.destPath);
      webpack(config, function(err, stats){
          if (err) {
              console.error(example.name + ' has errors.');
              throw err;
          }
          var jsonStats = stats.toJson();
          if (stats.hasErrors()) {
              console.error(' --> Error building ' + example.name + ', at ' + example.destPath);
              throw jsonStats.errors;
          } else if (stats.hasWarnings()) {
              console.warn(' --> ' + example.name + ' built with warnings.');
              console.warn(jsonStats.warnings);
          } else {
              console.log(' --> ok');
              buildExample(list, done);
          }
      });
    } else {
      done();
    }
  }

  buildExample(examplesToBuild, done);
}

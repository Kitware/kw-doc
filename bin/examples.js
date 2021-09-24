/* eslint-disable */

var path = require('path');
var shell = require('shelljs');
var fs = require('fs');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var parallelRun = require('parallel-webpack').run;

var templatePath = path.resolve(__dirname, './template.html');
var examplesConfigPath = path.resolve(
  __dirname,
  './examples.webpack.config.js'
);

// escapes windows paths
// for use when inserting windows path literals in codegen
function escPath(p) {
  return p.replace(/\\/g, '\\\\');
}

function getSplitedPath(filePath) {
  var a = filePath.split('/');
  var b = filePath.split('\\');
  return a.length > b.length ? a : b;
}

function addToList(src, dst) {
  if (src) {
    for (let i = 0; i < src.length; i++) {
      dst.push(src[i]);
    }
  }
}

function buildParallelWebpackConfigurationHeader(pConfig) {
  const textContent = [];
  textContent.push(`const rootPath = '${escPath(pConfig.rootPath)}';`);
  textContent.push(`const webpack = require('webpack');`);
  textContent.push(`const HtmlWebpackPlugin = require('html-webpack-plugin');`);
  textContent.push(`const path = require('path');`);

  // Header handling
  const headers = pConfig.headers || [];
  addToList(headers, textContent);

  return textContent.join('\n');
}

function buildParallelWebpackConfiguration(
  pConfig,
  name,
  baseURL,
  sourcePath,
  destPath,
  compress
) {
  const textContent = [];

  // Config object
  textContent.push('{');
  // textContent.push(`  devtool: '${compress ? 'nosources-source-map' : 'cheap-source-map'}',`);
  textContent.push(`  mode: '${compress ? 'production' : 'development'}',`);
  textContent.push(`  entry: '${escPath(sourcePath)}',`);
  textContent.push(`  output: {`);
  textContent.push(`    path: '${escPath(destPath)}',`);
  textContent.push(`    filename: '${escPath(name)}.js',`);
  if (pConfig.output) {
    if ('publicPath' in pConfig.output) {
      textContent.push(`    publicPath: '${pConfig.output.publicPath}',`);
    }
  }
  textContent.push(`  },`);
  textContent.push('  plugins: [');
  textContent.push('    new HtmlWebpackPlugin({');
  textContent.push(`      template: '${escPath(pConfig.templatePath || templatePath)}',`);
  textContent.push('      inject: "body",');
  textContent.push(`      title: '${name}',`);
  textContent.push('    }),');
  textContent.push('    new webpack.DefinePlugin({');
  textContent.push(`      __BASE_PATH__: '"${baseURL}"',`);
  textContent.push('    }),');
  addToList(pConfig.plugins, textContent);
  textContent.push('  ],');
  textContent.push('  module: {');
  textContent.push('    rules: [');
  textContent.push(
    `      { test: '${escPath(sourcePath)}', loader: 'expose-loader', options: { exposes: '${name}' } },`
  );
  addToList(pConfig.rules, textContent);
  textContent.push('    ],');
  textContent.push('  },');
  textContent.push('  resolve: {');
  textContent.push('    fallback: {');
  textContent.push('      stream: require.resolve(\'stream-browserify\'),');
  textContent.push('    },');
  textContent.push('    alias: {');
  addToList(pConfig.alias, textContent);
  textContent.push('    },');
  textContent.push('  },');
  textContent.push('},');

  return textContent.join('\n');
}

function buildWebpackConfiguration(
  defaultConfig,
  name,
  baseURL,
  sourcePath,
  destPath,
  compress
) {
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

  // if (compress) {
  //   examplePlugins.push(new webpack.optimize.UglifyJsPlugin({
  //     compress: {
  //       warnings: false,
  //     },
  //     output: {
  //       comments: false,
  //     },
  //   }));
  // }

  var config = Object.assign(
    {
      plugins: [],
    },
    defaultConfig,
    {
      mode: compress ? 'production' : 'development',
      entry: sourcePath,
      output: {
        path: destPath,
        filename: name + '.js',
      },
    }
  );

  // Add our plugins
  config.plugins = [].concat(config.plugins, examplePlugins);

  // Expose build module
  if (config.module.loaders) {
    config.module.loaders.unshift({
      test: sourcePath,
      loader: 'expose-loader',
      options: {
        exposes: name,
      },
    });
  } else if (config.module.rules) {
    config.module.rules.unshift({
      test: sourcePath,
      loader: 'expose-loader',
      options: {
        exposes: name,
      },
    });
  }

  return config;
}

module.exports = function(templateData, done, compress) {
  const baseExampleDirectory = path.join(
    templateData.directories.work,
    'public/examples'
  );
  const markdownBaseExample = path.join(
    templateData.directories.work,
    'source/examples'
  );
  const examplesToBuild = [];

  templateData.__en__.push('  examples:');
  templateData.__sidebar__.push('examples:');
  var exampleGroups = {};
  var sourceMap = {};
  var addonContentMap = {};

  Object.keys(templateData.examples).forEach(function(fullPath) {
    Object.keys(templateData.examples[fullPath]).forEach(function(className) {
      var destPath = path.join(baseExampleDirectory, className);
      var sourcePath = path.join(
        fullPath,
        templateData.examples[fullPath][className]
      );
      sourceMap[className] = sourcePath;
      const addOnFilePath = path.join(path.dirname(sourcePath), 'index.md');
      if (shell.test('-f', addOnFilePath)) {
        addonContentMap[className] = addOnFilePath;
      }
      shell.mkdir('-p', destPath);
      shell.rm('-rf', destPath + '/*');
      examplesToBuild.push({
        name: className,
        destPath: destPath,
        sourcePath: sourcePath,
        compress: compress,
      });

      var fullSplittedPath = getSplitedPath(sourcePath);
      while (fullSplittedPath.pop() !== className) {
        // pop is in condition
      }
      // Cut the front (FIXME should know what is the start path)
      while (fullSplittedPath.length > 2) {
        fullSplittedPath.shift();
      }

      var pathName = fullSplittedPath.join('/');
      if (exampleGroups[pathName]) {
        exampleGroups[pathName].push(className);
        templateData.__en__.push(
          templateData.TAB + templateData.TAB + className + ': ' + className
        );
      } else {
        templateData.__en__.push(
          templateData.TAB + templateData.TAB + pathName + ': ' + pathName
        );
        templateData.__en__.push(
          templateData.TAB + templateData.TAB + className + ': ' + className
        );
        exampleGroups[pathName] = [className];
      }
    });
  });

  // Process exampleGroups
  Object.keys(exampleGroups).forEach(function(gName) {
    templateData.__sidebar__.push(templateData.TAB + gName + ':');
    exampleGroups[gName].forEach(function(exampleName) {
      templateData.__sidebar__.push(
        templateData.TAB +
          templateData.TAB +
          exampleName +
          ': ' +
          exampleName +
          '.html'
      );
      var destMdFile = path.join(markdownBaseExample, exampleName + '.md');
      shell
        .ShellString(
          exampleName +
            '\n----\n### [Live example](./' +
            exampleName +
            '/index.html)\n\n'
        )
        .to(destMdFile);
      shell
        .ShellString(
          '<iframe src="./' +
            exampleName +
            '/index.html" width="100%" height="500px"></iframe>\n'
        )
        .toEnd(destMdFile);
      if (addonContentMap[exampleName]) {
        shell.cat(addonContentMap[exampleName]).toEnd(destMdFile);
      }
      shell.ShellString('\n### Source\n\n```js\n').toEnd(destMdFile);
      shell.cat(sourceMap[exampleName]).toEnd(destMdFile);
      shell.ShellString('\n```\n\n').toEnd(destMdFile);
    });
  });

  var defaultConfig = templateData.webpack;
  var parallelConfig = templateData.parallelWebpack;
  var baseURL = templateData.baseUrl;

  function bundleIntoSingleHtml(example) {
    var htmlTemplate = fs.readFileSync(templatePath, {
      encoding: 'utf8',
      flag: 'r',
    });
    var jsCode = fs.readFileSync(
      path.join(example.destPath, example.name + '.js'),
      { encoding: 'utf8', flag: 'r' }
    );

    var lines = htmlTemplate.split('\n');
    var count = lines.length;
    while (count--) {
      if (lines[count].indexOf('</body>') !== -1) {
        lines[count] = [
          '<script type="text/javascript">',
          jsCode,
          '</script>',
          '</body>',
        ].join('\n');
      }
    }

    shell
      .ShellString(lines.join('\n'))
      .to(path.join(example.destPath, example.name + '.html'));
  }

  function buildExample(list, done) {
    if (list.length) {
      var example = list.pop();
      var config = buildWebpackConfiguration(
        defaultConfig,
        example.name,
        baseURL,
        example.sourcePath,
        example.destPath,
        example.compress
      );
      webpack(config, function(err, stats) {
        if (err) {
          console.error(example.name + ' has errors.');
          throw err;
        }
        var jsonStats = stats.toJson();
        if (stats.hasErrors()) {
          console.error(
            ' --> Error building ' + example.name + ', at ' + example.destPath
          );
          throw jsonStats.errors;
        } else if (stats.hasWarnings()) {
          console.warn(' --> ' + example.name + ' built with warnings.');
          console.warn(jsonStats.warnings);
          console.log(' --> ok (with warning)', example.name);
          bundleIntoSingleHtml(example);
          buildExample(list, done);
        } else {
          console.log(' --> ok', example.name);
          bundleIntoSingleHtml(example);
          buildExample(list, done);
        }
      });
    } else {
      done();
    }
  }

  function writeParallelWebpackConfig(list, destFilePath) {
    const outputContent = [
      buildParallelWebpackConfigurationHeader(parallelConfig),
      'module.exports = [',
    ];

    for (let i = 0; i < list.length; i++) {
      const example = list[i];
      outputContent.push(
        buildParallelWebpackConfiguration(
          parallelConfig,
          example.name,
          baseURL,
          example.sourcePath,
          example.destPath,
          example.compress
        )
      );
    }
    outputContent.push('];');

    fs.writeFileSync(destFilePath, outputContent.join('\n'));
  }

  function bundleExamples(list) {
    for (let i = 0; i < list.length; i++) {
      bundleIntoSingleHtml(list[i]);
    }
  }

  function parallelBuildExamples(list, done) {
    var configPath = examplesConfigPath;
    writeParallelWebpackConfig(list, configPath);
    console.log('configPath', configPath);
    parallelRun(
      configPath,
      {
        watch: false,
        maxRetries: 1,
        stats: true,
        maxConcurrentWorkers: parallelConfig.maxConcurrentWorkers || 2, // use 2 workers
      },
      function() {
        bundleExamples(list);
        done();
      }
    );
  }

  if (parallelConfig) {
    parallelBuildExamples(examplesToBuild, done);
  } else {
    buildExample(examplesToBuild, done);
  }
};

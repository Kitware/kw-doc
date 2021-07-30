#! /usr/bin/env node

/* eslint-disable */
var { Command } = require('commander');
var shell = require('shelljs');
var path = require('path');
var api = require('./api.js');

const program = new Command();
program
  .option('-c, --config [file.js]', 'Configuration file')
  .option('-p, --publish', 'Publish documentation to github.io/gh-pages')
  .option(
    '-s, --serve',
    'Serve documentation at http://localhost:3000/{baseURL}'
  )
  .option('-f, --filter [names...]', 'Filter examples to generate')
  .option('-m, --minify', 'Minify examples')
  .parse(process.argv);

// ----------------------------------------------------------------------------
// Need argument otherwise print help/usage
// ----------------------------------------------------------------------------

if (!process.argv.slice(2).length) {
  program.outputHelp();
  return 0;
}

// ----------------------------------------------------------------------------
// Load configuration
// ----------------------------------------------------------------------------

var configFilePath = path.join(
  process.cwd(),
  program.config.replace(/\//g, path.sep)
);
var basePath = path.dirname(configFilePath);
var configuration = require(configFilePath);
var compress = !!program.minify;

if (!configuration.config.authorLink) {
  configuration.config.authorLink = 'https://www.kitware.com/';
}

// Variable extraction
var workDir = path.join(basePath, configuration.work.replace(/\//g, path.sep));
var targetDir = configuration.target
  ? path.join(basePath, configuration.target.replace(/\//g, path.sep))
  : null;

// Shared variables
var copyPool = [];

// Data for template
var templateData = {
  // Template
  __en__: [],
  __sidebar__: [],
  TAB: '  ',
  baseUrl: configuration.baseUrl,
  webpack: configuration.webpack,
  parallelWebpack: configuration.parallelWebpack,
  // Directories
  directories: {
    work: workDir,
    destination: targetDir,
  },
  // Dynamic data
  apiFound: [],
  examples: {},
};

// ----------------------------------------------------------------------------
// Initialization
// ----------------------------------------------------------------------------

shell.mkdir('-p', workDir);
shell.cd(basePath);

// ----------------------------------------------------------------------------
// Copy files to work directory
// ----------------------------------------------------------------------------

// Template
copyPool.push({ src: path.join(__dirname, '../template/*'), dest: workDir });

// User data
copyPool.push({
  src: path.join(basePath, 'data/*'),
  dest: path.join(workDir, 'source/_data/'),
});

// User content
copyPool.push({
  src: path.join(basePath, 'content/*'),
  dest: path.join(workDir, 'source/'),
});

// User theme
copyPool.push({
  src: path.join(basePath, 'themes/*'),
  dest: path.join(workDir, 'themes/'),
});

// ----------------------------------------------------------------------------
// Add copy from config
// ----------------------------------------------------------------------------

if (configuration.copy) {
  configuration.copy.forEach((item) => {
    copyPool.push({
      src: path.join(basePath, item.src),
      dest: path.join(basePath, item.dest),
      destIsTarget: !!item.destIsTarget,
    });
  });
}

// ----------------------------------------------------------------------------
// Process copy pool
// ----------------------------------------------------------------------------

while (copyPool.length) {
  var srcDest = copyPool.shift();
  console.log(' - copy: ', srcDest.src, 'to', srcDest.dest);
  var dest = srcDest.dest;
  // if dest is target, make the parent dirs instead.
  // dest doesn't have to exist, since we copy SRC to DEST.
  if (srcDest.destIsTarget) {
    dest = path.dirname(dest);
  }
  shell.mkdir('-p', dest);
  shell.cp('-rf', srcDest.src, srcDest.dest);
}

// ----------------------------------------------------------------------------
// Generate API
// ----------------------------------------------------------------------------

function getSplitedPath(filePath) {
  var a = filePath.split('/');
  var b = filePath.split('\\');
  return a.length > b.length ? a : b;
}

if (configuration.api) {
  console.log('\n=> Build API\n');

  templateData.__en__.push('  api:');
  templateData.__sidebar__.push('api:');

  configuration.api.forEach(function(apiDir) {
    var fullPath = path.join(basePath, apiDir);
    shell.cd(fullPath);
    shell
      .find('.')
      .filter(function(file) {
        // FIXME expect {base}/[{module}/{package}]/{classname}
        return getSplitedPath(file).length === 2 && shell.test('-d', file);
      })
      .forEach(function(module) {
        api(fullPath, module, templateData);
      });
  });
  console.log('\n-----------------\n');

  templateData.__en__ = [
    templateData.__en__
      .filter(function(item, index) {
        return templateData.__en__.indexOf(item) === index;
      })
      .join('\n'),
  ];
}

// ----------------------------------------------------------------------------
// Extract examples
// ----------------------------------------------------------------------------

if (
  (configuration.examples && configuration.webpack) ||
  configuration.parallelWebpack
) {
  var filterExamples = []
    .concat(program.filter, program.args)
    .filter((i) => !!i);
  var buildAll = filterExamples.length === 0 || program.filter === true;
  var exampleCount = 0;

  console.log('\n=> Extract examples\n');
  configuration.examples.forEach(function(entry) {
    const regexp = entry.regexp
      ? new RegExp(entry.regexp)
      : /example\/index.js$/;
    var fullPath = path.join(basePath, entry.path ? entry.path : entry);

    // Single example use case
    templateData.examples[fullPath] = {};
    var currentExamples = templateData.examples[fullPath];
    shell.cd(fullPath);
    shell
      .find('.')
      .filter(function(file) {
        return file.match(regexp);
      })
      .forEach(function(file) {
        var fullPath = getSplitedPath(file),
          exampleName = fullPath.pop();

        while (['index.js', 'example'].indexOf(exampleName) !== -1) {
          exampleName = fullPath.pop();
        }

        if (buildAll || filterExamples.indexOf(exampleName) !== -1) {
          currentExamples[exampleName] = './' + file;
          console.log(' -', exampleName, ':', file);
          exampleCount++;
        } else {
          console.log(' -', exampleName, ': SKIPPED');
        }
      });
  });

  if (exampleCount === 0) {
    templateData.examples = null;
  }

  templateData.__en__ = [
    templateData.__en__
      .filter(function(item, index) {
        return templateData.__en__.indexOf(item) === index;
      })
      .join('\n'),
  ];
}

// ----------------------------------------------------------------------------
// Build examples
// ----------------------------------------------------------------------------

// This is a long process
if (
  (templateData.examples && configuration.webpack) ||
  configuration.parallelWebpack
) {
  require('./examples.js')(templateData, doneWithProcessing, compress);
} else {
  doneWithProcessing();
}

// ----------------------------------------------------------------------------

function doneWithProcessing() {
  // ----------------------------------------------------------------------------
  // Generate sidebar and traduction for Hexo
  // ----------------------------------------------------------------------------

  shell.mkdir('-p', path.join(workDir, 'source/_data'));
  var destSideBar = path.join(workDir, 'source/_data/sidebar.yml');
  var srcSideBar = path.join(basePath, 'tpl/__sidebar__');
  shell.cat(srcSideBar).to(destSideBar);
  shell.ShellString(templateData.__sidebar__.join('\n')).toEnd(destSideBar);
  shell.ShellString('\n\n').toEnd(destSideBar);

  shell.mkdir('-p', path.join(workDir, 'themes/navy/languages'));
  var destTraduction = path.join(workDir, 'themes/navy/languages/en.yml');
  var srcTraduction = path.join(basePath, 'tpl/__en__');
  shell.cat(srcTraduction).to(destTraduction);
  shell.ShellString(templateData.__en__.join('\n')).toEnd(destTraduction);
  shell.ShellString('\n\n').toEnd(destTraduction);

  if (configuration.cname) {
    shell.echo(configuration.cname).to(path.join(workDir, 'public/CNAME'));
  }

  // ----------------------------------------------------------------------------
  // Generate _config.yml
  // ----------------------------------------------------------------------------

  var destConfig = path.join(workDir, '_config.yml');
  shell.cat(path.join(workDir, '__config__')).to(destConfig);
  var ymlConf = configuration.config;
  Object.keys(ymlConf).forEach(function(key) {
    shell
      .ShellString([key, ': ', ymlConf[key], '\n'].join(''))
      .toEnd(destConfig);
  });
  shell.ShellString('\n').toEnd(destConfig);

  // ----------------------------------------------------------------------------
  // Fix CSS from style
  // ----------------------------------------------------------------------------

  var file = path.join(workDir, 'themes/navy/source/css/_variables.styl');
  shell.sed('-i', 'BASE_PATH', configuration.baseUrl, file);

  // ----------------------------------------------------------------------------
  // Generate website using Hexo
  // ----------------------------------------------------------------------------

  shell.cd(workDir);
  shell.exec('npm install');
  shell.exec('npm run generate');

  // ----------------------------------------------------------------------------
  // Copy generated data to target if any
  // ----------------------------------------------------------------------------

  if (targetDir) {
    shell.mkdir('-p', targetDir);
    shell.cp('-rf', workDir + '/public/*', targetDir);
  }

  // ----------------------------------------------------------------------------
  // Github pages
  // ----------------------------------------------------------------------------

  if (program.publish) {
    console.log('\n=> Publish\n');
    var options = {};

    if (process.env.GIT_PUBLISH_URL) {
      console.log('Use custom URL');
      options.repo = process.env.GIT_PUBLISH_URL;
    }

    require('gh-pages').publish(workDir + '/public', options, function(err) {
      if (err) {
        console.log('Error while publishing');
        console.log(err);
      }
      console.log(' - Web site published to github.io');
    });
  }

  // ----------------------------------------------------------------------------
  // Serve local pages
  // ----------------------------------------------------------------------------

  if (program.serve) {
    console.log('\n=> Serve documentation:\n');
    shell.cd(workDir);
    shell.exec('npm run server');
  }
}

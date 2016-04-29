#! /usr/bin/env node

/* eslint-disable */
var program = require('commander'),
    shell = require('shelljs'),
    // Hexo = require('hexo'),
    path = require('path'),
    api = require('./api.js'),
    examples = require('./examples.js');

program
  .option('-c, --config [file.js]', 'Configuration file')
  .option('-p, --publish',          'Publish documentation to github.io/gh-pages')
  .option('-s, --serve',            'Serve documentation at http://localhost:3000/{baseURL}')
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

var configFilePath = path.join(process.env.PWD, program.config);
var basePath = path.dirname(configFilePath);
var configuration = require(configFilePath);

// Variable extraction
var workDir = path.join(basePath, configuration.work);
var targetDir = path.join(basePath, configuration.target);

// Shared variables
var copyPool = [];

// Data for template
var templateData = {
  // Template
  __en__: [],
  __sidebar__: [],
  TAB: '  ',
  // Directories
  directories: {
    work: workDir,
    destination: targetDir,
  },
  // Dynamic data
  apiFound: [],
  examples: {},
}

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
copyPool.push({ src: path.join(basePath, 'data/*'), dest: path.join(workDir, 'source/_data/') });

// User content
copyPool.push({ src: path.join(basePath, 'content/*'), dest: path.join(workDir, 'source/') });

// ----------------------------------------------------------------------------
// Process copy pool
// ----------------------------------------------------------------------------

while (copyPool.length) {
  var srcDest = copyPool.shift();
  console.log(' - copy: ', srcDest.src, 'to', srcDest.dest);
  shell.cp('-rf', srcDest.src, srcDest.dest);
}

// ----------------------------------------------------------------------------
// Generate API
// ----------------------------------------------------------------------------

if (configuration.api) {
  console.log('\n=> Build API\n');

  templateData.__en__.push('  api:');
  templateData.__sidebar__.push('api:');

  configuration.api.forEach(function (apiDir) {
    var fullPath = path.join(basePath, apiDir);
    shell.cd(fullPath);
    shell.find('.')
      .filter( function(file) {
        // FIXME expect {base}/[{module}/{package}]/{classname}
        return file.split('/').length === 2 && shell.test('-d', file);
      })
      .forEach( function(module) {
        api(fullPath, module, templateData);
      });
  });
  console.log('\n-----------------\n');
}

// ----------------------------------------------------------------------------
// Extract examples
// ----------------------------------------------------------------------------

if (configuration.examples) {
  console.log('\n=> Extract examples\n');
  configuration.api.forEach(function (directory) {
    var fullPath = path.join(basePath, directory);

    // Single example use case
    templateData.examples[fullPath] = {};
    var currentExamples = templateData.examples[fullPath];
    shell.cd(fullPath);
    shell.find('.')
      .filter( function(file) {
        return file.match(/example\/index.js$/);
      })
      .forEach( function(file) {
        var fullPath =  file.split('/'),
          exampleName;

        exampleName = fullPath.pop(); // index.js
        exampleName = fullPath.pop(); // example
        exampleName = fullPath.pop(); // className

        currentExamples[exampleName] = './' + file;
        console.log(' -', exampleName, ':', file)
      });
  });
}

// ----------------------------------------------------------------------------
// Build examples
// ----------------------------------------------------------------------------

// This is a long process
examples(templateData, doneWithProcessing);

// ----------------------------------------------------------------------------

function doneWithProcessing() {

  // ----------------------------------------------------------------------------
  // Generate sidebar and traduction for Hexo
  // ----------------------------------------------------------------------------

  var destSideBar = path.join(workDir, 'source/_data/sidebar.yml');
  var srcSideBar = path.join(basePath, 'tpl/__sidebar__');
  shell.cat(srcSideBar).to(destSideBar);
  templateData.__sidebar__.join('\n').toEnd(destSideBar);
  ('\n\n').toEnd(destSideBar);

  var destTraduction = path.join(workDir, 'themes/navy/languages/en.yml');
  var srcTraduction = path.join(basePath, 'tpl/__en__');
  shell.cat(srcTraduction).to(destTraduction);
  templateData.__en__.join('\n').toEnd(destTraduction);
  ('\n\n').toEnd(destTraduction);

  shell.echo(configuration.cname).to(path.join(workDir, 'CNAME'));

  // ----------------------------------------------------------------------------
  // Generate _config.yml
  // ----------------------------------------------------------------------------

  var destConfig = path.join(workDir, '_config.yml');
  shell.cat(path.join(workDir, '__config__')).to(destConfig);
  var ymlConf = configuration.config;
  Object.keys(ymlConf).forEach(function(key) {
    [ key, ': ', ymlConf[key], '\n'].join('').toEnd(destConfig);
  });
  '\n'.toEnd(destConfig);

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
  // Github pages
  // ----------------------------------------------------------------------------

  if(program.publish) {
      console.log('\n=> Publish', publishBaseURL, '\n');
      var options = {};

      if(process.env.GIT_PUBLISH_URL) {
          console.log('Use custom URL');
          options.repo = process.env.GIT_PUBLISH_URL;
      }

      require('gh-pages').publish(workDir + '/public', options, function(err) {
          if(err) {
              console.log('Error while publishing');
              console.log(err);
          }
          console.log(' - Web site published to github.io');
      });
  }

  // ----------------------------------------------------------------------------
  // Serve local pages
  // ----------------------------------------------------------------------------

  if(program.serve) {
      console.log('\n=> Serve documentation:\n');
      shell.cd(workDir);
      shell.exec('npm run server');
  }
}

// if(program.examples) {
//     var examples = [].concat(program.examples, program.args);
//     var buildAll = program.examples === !!program.examples;
//     console.log('\n=> Build Examples: ', buildAll ? '(All)' : examples.join(', '));
//     console.log();

//     // Copy data
//     shell.cd(process.env.PWD);
//     shell.cp('-r', path.join(process.env.PWD, 'node_modules/tonic-arctic-sample-data/data'), rootWWW + '/public');

//     // Build examples
//     buildHelper.addDoneListener(doneWithProcessing);
//     if(!buildAll) {
//         buildHelper.buildList(examples, baseUrl);
//     } else {
//         buildHelper.buildAll(baseUrl);
//     }
// } else {
//     doneWithProcessing();
// }

    // // ----------------------------------------------------------------------------
    // // Generate examples Markdown for Hexo
    // // ----------------------------------------------------------------------------

    // traduction.push('  examples:');
    // sideBar.push('examples:');
    // var exampleGroups = {};
    // for(var exampleName in buildHelper.examples) {
    //   var pathName = buildHelper.examples[exampleName].split('/').splice(2,2).join('/');

    //   if(exampleGroups[pathName]) {
    //     exampleGroups[pathName].push(exampleName);
    //     traduction.push(tabSpace + tabSpace + exampleName + ': ' + exampleName);
    //   } else {
    //     traduction.push(tabSpace + tabSpace + pathName + ': ' + pathName);
    //     traduction.push(tabSpace + tabSpace + exampleName + ': ' + exampleName);
    //     exampleGroups[pathName] = [ exampleName ];
    //   }
    // }
    // for(var gName in exampleGroups) {
    //   sideBar.push(tabSpace + gName + ':');
    //   exampleGroups[gName].forEach( function(exampleName) {
    //     sideBar.push(tabSpace + tabSpace + exampleName + ': ' + exampleName + '.html');
    //     var destMdFile = path.join(process.env.PWD, 'documentation/www/source/examples', exampleName + '.md');
    //     (exampleName + '\n----\n### [Live example](./' + exampleName + ')\n\n').to(destMdFile);
    //     ('<iframe src="./'+ exampleName +'" width="100%" height="500px"></iframe>\n\n### Source\n\n```js\n').toEnd(destMdFile);
    //     shell.cat(buildHelper.examples[exampleName]).toEnd(destMdFile);
    //     '\n```\n\n'.toEnd(destMdFile);
    //   });
    // }

module.exports = function(templateData, done) {
  done();
}

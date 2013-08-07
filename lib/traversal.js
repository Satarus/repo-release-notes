exports.findRepositories = function(dir, callback){
    walk(process.cwd(), function(result){
        callback(result);
    });
}

function walk(startDir, callback){
    var fs = require('fs');
    fs.readdir(startDir, function(err, list){
        checkIfRepoOrGitRepository(list, function(result, type){
            if(result){
                callback({path: startDir, type: type});
            }else{
                list.forEach(function (file) {
                    file = startDir + '/' + file; 
                    fs.stat(file, function(err, stat){
                        if (stat && stat.isDirectory()){
                            walk(file, function(result){
                                callback(result);
                            });
                        }  
                   });
                });
            }
        });
    });
}

function checkIfRepoOrGitRepository(dir, callback){
    if (dir.indexOf('.repo') >= 0){
        callback(true, 'repo');
    } else if (dir.indexOf('.git') >= 0){
        callback(true, 'git');
    } else {
        callback(false);
    }
}


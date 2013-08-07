exports.getReposAndCommitLogs = function (path, options, callback){

    var newCommit = "___";
    var formatOptions = [
        newCommit, "sha1:%H", "authorName:%an", "authorEmail:%ae", "authorDate:%aD",
        "committerName:%cn", "committerEmail:%ce", "committerDate:%cD",
        "title:%s", "%w(80,1,1)%b"
    ].join("%n");

    var spawn = require('child_process').spawn;
    var gitLog = "git log --no-color --no-merges --format=\"" + formatOptions + "\" " + options.range;
    var gitRepoCommand = "git remote show -n origin | grep Fetch | cut -d: -f2-"
    var repoArgs = ["forall", "-c", "echo \"$(" + gitRepoCommand + ") :: $(" + gitLog + ")\""]

    var repo = spawn('repo', repoArgs, {
        cwd : path
        });

    var retVal = [];
    repo.stdout.on('data', function (data){ 
        var out = "";
        out = data.toString().split('::');

        if(out[1] != ' \n'){
            retVal.push({
                fetchRepo: out[0],
                logOutput: out.slice(1)
            });
        }
    });

    repo.on('close', function(code) {
        if(code !== 0){
            throw "Repo returned " + code;
        }
        callback(retVal);
    });
}

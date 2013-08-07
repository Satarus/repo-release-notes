var newCommit = "___";
var formatOptions = [
    newCommit, "sha1:%H", "authorName:%an", "authorEmail:%ae", "authorDate:%aD",
    "committerName:%cn", "committerEmail:%ce", "committerDate:%cD",
    "title:%s", "%w(80,1,1)%b"
].join("%n");

var splitString = ";----;"
var endOfCommand = ":----:"

exports.getReposAndCommitLogs = function (path, options, callback){


    var spawn = require('child_process').spawn;
    var gitLog = "git log --no-color --no-merges --format=\"" + formatOptions + "\" " + options.range;
    var gitRepoCommand = "git remote show -n origin | grep Fetch | cut -d: -f2-"
    var repoArgs = ["forall", "-c", "echo \"$(" + gitRepoCommand + ") " + splitString + " $(" + gitLog + ") " + endOfCommand + "\""]

    var repo = spawn('repo', repoArgs, {
        cwd : path
        });

    var retVal = [];
    var out = "";
    repo.stdout.on('data', function (data){ 
        if(data.toString().match(/:----:/)){
            var processedOutput = processOutput(out);

            if(typeof processedOutput !== 'undefined'){
                retVal.push(processedOutput);
            }

            out = "";
        }else{
            out += data;
        }
    });

    repo.on('close', function(code) {
        if(code !== 0){
            throw "Repo returned " + code;
        }
        callback(retVal);
    });
} 

function processOutput(output){
    output = output.split(splitString);

    if(output.length === 2){
        return {
            fetchRepo: output[0],
            logOutput: output[1]
        };
    }
}

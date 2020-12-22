import simpleGit from 'simple-git';
import {} from 'aws-sdk';

const git = simpleGit('../')

const log = (data: any) => console.log(data)
const logErr = (err: any) => console.log(err)

git.init()
    .then(log)
    .catch(logErr)

console.log("Yoyoyoyo")
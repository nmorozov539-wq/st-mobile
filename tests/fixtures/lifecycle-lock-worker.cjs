const fs=require('node:fs');
const path=require('node:path');
const {acquireLifecycleLock}=require('../../phone-package/update-core.cjs');

const [target,kind,signal,resume,hold,result,pauseStage,mode]=process.argv.slice(2);
const wait=milliseconds=>Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,milliseconds);
const waitFor=file=>{while(file&&!fs.existsSync(file))wait(5);};

try{
    const release=acquireLifecycleLock(target,kind,{onState(stage,detail){
        if(stage!==pauseStage)return;
        if(mode==='partial'&&detail.fd!==undefined)fs.writeSync(detail.fd,'{"pid":');
        fs.writeFileSync(signal,JSON.stringify({stage,pid:process.pid,temporary:detail.temporary??null}));
        waitFor(resume);
    }});
    fs.writeFileSync(`${result}.acquired`,JSON.stringify({pid:process.pid,claimPath:release.claimPath,actor:release.actor}));
    waitFor(hold);
    const removed=release();
    fs.writeFileSync(result,JSON.stringify({status:'released',removed}));
}catch(error){
    fs.writeFileSync(result,JSON.stringify({status:'failed',message:error.message}));
}

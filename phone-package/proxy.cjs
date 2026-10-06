#!/usr/bin/env node
const http = require('node:http');
const { Readable } = require('node:stream');
const HOP = new Set(['connection','keep-alive','proxy-authenticate','proxy-authorization','te','trailer','transfer-encoding','upgrade','host','content-length']);
function createProxy(fetchUpstream) {
    return http.createServer(async (req,res) => {
        const controller=new AbortController();
        res.once('close',()=>{if(!res.writableFinished)controller.abort();});
        try {
            const route=new URL(req.url,'http://localhost');
            if(!route.pathname.startsWith('/api/v1/')) {res.writeHead(404);res.end();return;}
            const chunks=[];for await(const chunk of req)chunks.push(chunk);
            const body=chunks.length?Buffer.concat(chunks):undefined;
            const headers={};for(const [key,value] of Object.entries(req.headers))if(!HOP.has(key.toLowerCase()))headers[key]=value;
            const upstream=await fetchUpstream('https://openrouter.ai'+route.pathname+route.search,{method:req.method,headers,body,impersonate:'chrome',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(300000)])});
            const responseHeaders={};for(const [key,value] of upstream.headers)if(!HOP.has(key.toLowerCase()))responseHeaders[key]=value;
            res.writeHead(upstream.status,responseHeaders);
            if(!upstream.body){res.end();return;}
            const stream=Readable.fromWeb(upstream.body);
            stream.on('error',()=>res.destroy());
            res.once('close',()=>stream.destroy());
            stream.pipe(res);
        }catch(error){
            if(controller.signal.aborted)return;
            // Never print upstream request headers, credentials, or response bodies.
            console.error('OpenRouter proxy request failed:',error.name || 'Error');
            if(!res.headersSent&&!res.destroyed){res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'proxy_error',message:'The local proxy could not reach OpenRouter.'}));}
            else if(!res.destroyed)res.destroy();
        }
    });
}
module.exports={createProxy};
if(require.main===module){
    try{
        const {fetch}=require('wreq-js');
        const server=createProxy(fetch);
        server.on('clientError',(_error,socket)=>socket.destroy());
        server.on('error',error=>{console.error('OpenRouter proxy startup failed:',error.code || error.name);process.exitCode=1;});
        server.listen(8001,'127.0.0.1',()=>console.log('OpenRouter TLS-proxy listening on http://127.0.0.1:8001'));
    }catch{console.error('Cannot load proxy dependencies. Run setup-proxy.cjs using a working or-proxy folder on this same phone.');process.exitCode=1;}
}

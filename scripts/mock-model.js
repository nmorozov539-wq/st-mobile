import http from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

let requests = 0, lastRequest = null;const recentRequests=[];
const server = http.createServer(async (req, res) => {
    if (req.method === 'GET' && req.url === '/health') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ model: 'st-mobile-mock', requests, lastRequest, recentRequests }));
    }
    if (req.method === 'GET' && req.url === '/v1/models') {
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ object: 'list', data: ['st-mobile-mock','st-mobile-mock-alt',...(process.argv.includes('--many-models')?Array.from({length:48},(_,i)=>`st-mobile-mock-${i+1}`):[])].map(id=>({id,object:'model',owned_by:'local-test'})) }));
    }
    const chat=req.url==='/v1/chat/completions',completion=req.url==='/v1/completions';
    if (req.method !== 'POST' || (!chat&&!completion)) { res.writeHead(404); return res.end(); }
    let body = '';
    try {
        for await (const chunk of req) {
            body += chunk;
            if (body.length > 2_000_000) { res.writeHead(413); return res.end(); }
        }
        const input = JSON.parse(body);
        const text = String(chat?input.messages?.findLast(message => message.role === 'user')?.content ?? '':input.prompt??'');
        if (!text.trim()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: { message: 'The mock received no user message. Check the engine session and tokenizer errors.', type: 'empty_prompt' } }));
        }
        requests++;
        const prompt = chat?JSON.stringify(input.messages):String(input.prompt??'');
        lastRequest = {family:chat?'chat-completion':'text-completion',model:input.model,temperature:input.temperature,stream:!!input.stream,maxTokens:input.max_tokens??input.max_new_tokens,n:input.n,testMessage:chat&&input.messages?.length===1&&text==='Reply with OK.',summaryFixture:prompt.includes('auto_injected_historical_context'),personaFixture:prompt.includes('STM_PERSONA_SENTINEL'),loreFixture:prompt.includes('STM_LORE_SENTINEL')};
        recentRequests.push({...lastRequest});if(recentRequests.length>8)recentRequests.shift();
        if (/\[fail\]/i.test(text)) {
            res.writeHead(503, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: { message: 'Intentional local mock failure.', type: 'test_error' } }));
        }
        const reasoning = /\[think\]/i.test(text) ? 'This is visible mock reasoning, separate from the final answer.' : '';
        const slow = /\[slow\]/i.test(text) || /^slow\b/i.test(text.trim());
        console.log(`Mock request ${requests}: ${slow ? 'SLOW (about 27 seconds)' : 'normal'}, streaming=${!!input.stream}`);
        const answer = slow
            ? 'This is a slow local test reply. You can stop it while it is arriving. '.repeat(6)
            : 'The PC bridge works! This reply came from the local mock model through SillyTavern’s normal generation pipeline.';
        if (!input.stream) {
            if(slow){const controller=new AbortController();res.on('close',()=>controller.abort());await delay(10000,undefined,{signal:controller.signal});}
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify(chat?{ id: `mock-${requests}`, object: 'chat.completion', choices: [{ index: 0, message: { role: 'assistant', content: answer, reasoning_content: reasoning }, finish_reason: 'stop' }] }:{id:`mock-${requests}`,object:'text_completion',model:input.model,choices:[{index:0,text:answer,finish_reason:'stop'}]}));
        }
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
        res.flushHeaders();
        const controller = new AbortController();
        res.on('close', () => controller.abort());
        const write = (delta, finish_reason = null) => res.write(`data: ${JSON.stringify(chat?{ id: `mock-${requests}`, object: 'chat.completion.chunk', choices: [{ index: 0, delta, finish_reason }] }:{id:`mock-${requests}`,object:'text_completion',choices:[{index:0,text:delta.content??'',finish_reason}]})}\n\n`);
        write({ role: 'assistant', content: '' });
        for (const piece of reasoning.match(/.{1,8}/gs) ?? []) {
            if (controller.signal.aborted) return;
            await delay(250, undefined, { signal: controller.signal });
            if(chat)write({ reasoning_content: piece });
        }
        for (const piece of answer.match(/.{1,8}/gs)) {
            if (controller.signal.aborted) return;
            await delay(slow ? 500 : 100, undefined, { signal: controller.signal });
            write({ content: piece });
        }
        write({}, 'stop');
        res.end('data: [DONE]\n\n');
    } catch (error) {
        if (error.name === 'AbortError') return;
        if (!res.headersSent) res.writeHead(400);
        res.end();
    }
});
server.listen(8124, '127.0.0.1', () => console.log('Local mock model: http://127.0.0.1:8124/v1 (no keys or external requests)'));

const {default:makeWASocket,useMultiFileAuthState,downloadMediaMessage,DisconnectReason}=require('@whiskeysockets/baileys')
const P=require('pino')
const fs=require('fs')
const axios=require('axios')
const express=require('express')
const app=express()
const PORT=process.env.PORT||3000
const OWNER='555182215198'

let db={allowed:[],protect:[],blockedAdmin:[],config:{botOn:true,antiSticker:false,antiLink:false,welcome:false,pt:false,style:"😈",pro:false,godmode:false,commands:{}},stats:{msgs:0}}
try{let r=JSON.parse(fs.readFileSync('./data.json'));db={...db,...r,config:{...db.config,...(r.config||{})}}}catch{}
const save=()=>fs.writeFileSync('./data.json',JSON.stringify(db,null,2))

const S="😈"
let pairingCode=null
let isConnected=false
let sockGlobal=null

const isOwner=(jid)=>jid?jid.replace(/\D/g,'').includes(OWNER):false
const isAllowed=(jid,fromMe)=>{if(fromMe||isOwner(jid)) return true;try{let a=JSON.parse(fs.readFileSync('./autorises.json'));if(a.includes(jid)) return true}catch{};return db.allowed.includes(jid)}

const ALL_CMDS=["ban","kick","add","promote","demote","admin","groupinfo","mute","unmute","chut","unchut","tagall","hidetag","godmode","antilink","antisticker","welcome","save","unsave","blockadmin","unblockadmin","vq","ghost","rdm","sticker","minhaquerida","mode","style","config","black","info","pt","bot","amis","noami","pro"]
ALL_CMDS.forEach(c=>{if(db.config.commands[c]==undefined) db.config.commands[c]=true})

const getMenu=()=>`Black Goku 😈
PREFIX: ₩
╭────────────────
│ 👥 GESTION GROUPE
│ • ₩ban / ₩kick
│ • ₩add [num]
│ • ₩promote / ₩demote
│ • ₩admin
│ • ₩groupinfo
│ 🚫 MODÉRATION
│ • ₩mute / ₩unmute
│ • ₩chut / ₩unchut
│ • ₩tagall [msg]
│ • ₩hidetag [msg]
│ • ₩godmode
│ • ₩antilink on/off
│ • ₩antisticker on/off
│ • ₩welcome on/off
│ 🛡️ PROTECTION
│ • ₩save / ₩unsave
│ • ₩blockadmin / ₩unblockadmin
│ 👁️ SECRET & FUN
│ • ₩vq [rep vue unique]
│ • ₩ghost
│ • ₩rdm
│ • ₩sticker
│ PERSO
│ • ₩minhaquerida
│ ⚙️ STYLE & CONFIG
│ • ₩mode / ₩style
│ • ₩config / ₩black / ₩info
│ • ₩pt on/off
│ 🔒 OWNER ONLY
│ • ₩bot on/off
│ • ₩amis / ₩noami
│ • ₩pro
╰────────────────
BLACK GOKU 24/24 🔥`

// PANEL WEB
app.get('/',(req,res)=>{
res.send(`
<html><head><meta name="viewport" content="width=device-width"><meta charset="utf-8">
<style>
body{background:#0a1414;color:#fff;font-family:Arial;padding:15px}
.card{background:#122626;border-radius:12px;padding:15px;margin-bottom:15px;border:1px solid #1a3a3a;text-align:center}
.green{background:#7ed321;color:#000;border:none;padding:12px;border-radius:20px;width:100%;font-weight:bold;margin:5px 0}
.red{background:#ff3b30;color:#fff;border:none;padding:12px;border-radius:20px;width:100%;font-weight:bold}
.code{font-size:32px;letter-spacing:5px;background:#000;color:#7ed321;padding:20px;border-radius:10px;border:2px dashed #7ed321;margin:15px 0}
h2{color:#7ed321;text-align:center}
.item{display:flex;justify-content:space-between;background:#0d1f1f;margin:5px 0;padding:8px 12px;border-radius:20px}
</style></head><body>
<h2>🤖 BLACK GOKU PANEL</h2>
<div class="card">
<h3>${isConnected?'ONLINE 🟢':'OFFLINE 🔴'}</h3>
${isConnected?`<p>✅ Bot Connecté</p>`:pairingCode?`<p>CODE 8 CHIFFRES:</p><div class="code">${pairingCode}</div><p>WhatsApp > Appareils liés > Lier avec numéro</p><button class="green" onclick="location.reload()">Actualiser</button>`:`<p>⏳ Génération...</p><button class="green" onclick="location.reload()">Actualiser</button>`}
</div>
<div class="card"><button class="green" onclick="fetch('/api/bot/on',{method:'POST'}).then(()=>location.reload())">🟢 Bot ON</button><button class="red" onclick="fetch('/api/bot/off',{method:'POST'}).then(()=>location.reload())">🔴 Bot OFF</button></div>
<div class="card" style="text-align:left"><h3 style="text-align:center">COMMANDES - ON/OFF</h3>
${ALL_CMDS.map(c=>`<div class="item"><span>₩${c}</span><button class="${db.config.commands[c]?'green':'red'}" style="width:60px;border-radius:20px" onclick="fetch('/api/toggle?name=${c}',{method:'POST'}).then(()=>location.reload())">${db.config.commands[c]?'✅':'❌'}</button></div>`).join('')}
</div>
</body></html>`)
})
app.post('/api/bot/:s',(req,res)=>{db.config.botOn=req.params.s==='on';save();res.send('ok')})
app.post('/api/toggle',(req,res)=>{let n=req.query.name;db.config.commands[n]=!db.config.commands[n];save();res.send('ok')})
app.listen(PORT,()=>console.log('Panel '+PORT))

async function start(){
const {state,saveCreds}=await useMultiFileAuthState('./auth')
const sock=makeWASocket({auth:state,logger:P({level:'silent'}),browser:["BLACK GOKU","Chrome","1.0"]})
sockGlobal=sock
sock.ev.on('creds.update',saveCreds)
if(!state.creds.registered){
  setTimeout(async()=>{try{pairingCode=await sock.requestPairingCode(OWNER);console.log(`\nCODE: ${pairingCode}\n`)}catch(e){console.log(e.message)}},4000)
}
sock.ev.on('connection.update',u=>{
if(u.connection==='open'){isConnected=true;pairingCode=null;console.log('✅ ONLINE')}
if(u.connection==='close'){let c=u.lastDisconnect?.error?.output?.statusCode;if(c!==DisconnectReason.loggedOut) setTimeout(()=>start(),3000)}
})
sock.ev.on('group-participants.update',async(a)=>{
try{if(!db.config.welcome) return;if(a.action==='add'){for(let j of a.participants){await sock.sendMessage(a.id,{text:`${S} Bienvenue @${j.split('@')[0]} 😈`,mentions:[j]})}}}catch{}
})
sock.ev.on('messages.upsert',async({messages})=>{
try{
const m=messages[0];if(!m.message) return
const from=m.key.remoteJid
const isGroup=from.endsWith('@g.us')
const sender=isGroup?m.key.participant:from
let txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||""
let low=txt.toLowerCase().trim()
if(isGroup &&!isOwner(sender) &&!m.key.fromMe){
 if(db.config.antiLink && /(https?:\/\/|www\.|chat\.whatsapp\.com|wa\.me)/i.test(low)){await sock.sendMessage(from,{delete:m.key}).catch(()=>{});await sock.sendMessage(from,{text:`${S} 🚫 Lien interdit @${sender.split('@')[0]}`,mentions:[sender]});return}
 if(db.config.antiSticker && m.message.stickerMessage){await sock.sendMessage(from,{delete:m.key}).catch(()=>{});return}
}
if(!low.startsWith('₩')) return
if(!db.config.botOn) return
if(!isAllowed(sender,m.key.fromMe)) return sock.sendMessage(from,{text:`${S} ⛔ Seul Black Goku 😈`,mentions:[sender]})

let cmd=low.replace(/^₩+/,'').split(' ')[0]
let arg=txt.slice(txt.indexOf(' ')+1).trim();if(txt.indexOf(' ')===-1) arg=""
let ctx=m.message.extendedTextMessage?.contextInfo
let targets=ctx?.mentionedJid||[]
let quoted=ctx?.participant||null
if(db.config.commands[cmd]===false) return sock.sendMessage(from,{text:`${S} ❌ ₩${cmd} désactivé depuis panel`})

// MENU
if(['black','menu','info','config'].includes(cmd)){await sock.sendMessage(from,{text:getMenu()});return}
if(['mode','style'].includes(cmd)){await sock.sendMessage(from,{text:`${S} STYLE:${db.config.style} GOD:${db.config.godmode?'ON':'OFF'} LINK:${db.config.antiLink?'ON':'OFF'} STICK:${db.config.antiSticker?'ON':'OFF'} WELC:${db.config.welcome?'ON':'OFF'} PRO:${db.config.pro?'ON':'OFF'}`});return}

// OWNER
if(cmd==='bot'){if(!isOwner(sender)&&!m.key.fromMe) return;db.config.botOn=arg.includes('on');save();await sock.sendMessage(from,{text:db.config.botOn?"✅ ONLINE":"❌ OFF"});return}
if(cmd==='amis'||cmd==='ami'){if(!isOwner(sender)&&!m.key.fromMe) return;let t=targets[0]||quoted||(!isGroup?from:null);if(!t) return;if(!db.allowed.includes(t)){db.allowed.push(t);save()}try{let a=JSON.parse(fs.readFileSync('./autorises.json'));if(!a.includes(t)){a.push(t);fs.writeFileSync('./autorises.json',JSON.stringify(a,null,2))}}catch{fs.writeFileSync('./autorises.json',JSON.stringify([t],null,2))};await sock.sendMessage(from,{text:`${S} ✅ @${t.split('@')[0]} autorisé`,mentions:[t]});return}
if(cmd==='noami'||cmd==='noamis'){if(!isOwner(sender)&&!m.key.fromMe) return;let t=targets[0]||quoted||from;db.allowed=db.allowed.filter(x=>x!==t);save();try{let a=JSON.parse(fs.readFileSync('./autorises.json'));a=a.filter(x=>x!==t);fs.writeFileSync('./autorises.json',JSON.stringify(a,null,2))}catch{};await sock.sendMessage(from,{text:`${S} ❌ Retiré`});return}

// PROTECTION & CONFIG
if(cmd==='antilink'){db.config.antiLink=arg.includes('on');save();await sock.sendMessage(from,{text:db.config.antiLink?`${S} 🚫 ANTILINK ON`:`${S} ✅ OFF`});return}
if(cmd==='antisticker'){db.config.antiSticker=arg.includes('on');save();await sock.sendMessage(from,{text:db.config.antiSticker?`${S} 🚫 ANTISTICKER ON`:`${S} ✅ OFF`});return}
if(cmd==='welcome'){db.config.welcome=arg.includes('on');save();await sock.sendMessage(from,{text:db.config.welcome?`${S} ✅ WELCOME ON`:`${S} ❌ OFF`});return}
if(cmd==='godmode'){db.config.godmode=!db.config.godmode;save();await sock.sendMessage(from,{text:db.config.godmode?`${S} 💀 GODMODE ON - Protection max`:`${S} GODMODE OFF`});return}
if(cmd==='pro'){db.config.pro=!db.config.pro;save();await sock.sendMessage(from,{text:db.config.pro?`${S} 💎 PRO ON`:`${S} PRO OFF`});return}
if(cmd==='pt'){db.config.pt=arg.includes('on');save();await sock.sendMessage(from,{text:db.config.pt?"✅ PT ON":"❌ PT OFF"});return}

// GROUPE
if(cmd==='ban'||cmd==='kick'){let j=targets[0]||quoted;if(!j) return;if(isOwner(j)){await sock.sendMessage(from,{text:`${S} BOOMERANG!`,mentions:[sender]});try{await sock.groupParticipantsUpdate(from,[sender],'remove')}catch{};return}if(db.protect.includes(j)) return sock.sendMessage(from,{text:`${S} 🛡️ Protégé`});await sock.groupParticipantsUpdate(from,[j],'remove');await sock.sendMessage(from,{text:`${S} 💥 @${j.split('@')[0]} banni`,mentions:[j]});return}
if(cmd==='add'){let num=arg.replace(/[^0-9 ]/g,'').trim();if(!num) return sock.sendMessage(from,{text:`${S} Ex: ₩add 55518...`});let jids=num.split(' ').map(n=>n+'@s.whatsapp.net');await sock.groupParticipantsUpdate(from,jids,'add');return}
if(cmd==='promote'){let j=targets[0]||quoted;if(!j) return;await sock.groupParticipantsUpdate(from,[j],'promote');await sock.sendMessage(from,{text:`${S} 👑 Promu @${j.split('@')[0]}`,mentions:[j]});return}
if(cmd==='demote'){let j=targets[0]||quoted;if(!j) return;if(isOwner(j)) return;await sock.groupParticipantsUpdate(from,[j],'demote');await sock.sendMessage(from,{text:`${S} 👎 Rétrogradé`});return}
if(cmd==='admin'){let meta=await sock.groupMetadata(from);let admins=meta.participants.filter(p=>p.admin).map(p=>`@${p.id.split('@')[0]}`).join('\n');await sock.sendMessage(from,{text:`${S} 👑 ADMINS:\n${admins}`,mentions:meta.participants.filter(p=>p.admin).map(p=>p.id)});return}
if(cmd==='groupinfo'){let meta=await sock.groupMetadata(from);await sock.sendMessage(from,{text:`${S} 📊 ${meta.subject}\nMembres: ${meta.participants.length}\nCréé: ${new Date(meta.creation*1000).toLocaleDateString()}`});return}
if(cmd==='mute'||cmd==='chut'){await sock.groupSettingUpdate(from,'announcement');await sock.sendMessage(from,{text:`${S} 🔒 Groupe fermé (admins only)`});return}
if(cmd==='unmute'||cmd==='unchut'){await sock.groupSettingUpdate(from,'not_announcement');await sock.sendMessage(from,{text:`${S} 🔓 Groupe ouvert`});return}
if(cmd==='tagall'){let meta=await sock.groupMetadata(from);await sock.sendMessage(from,{text:`${arg||"📢 BLACK GOKU"}\n${meta.participants.map(p=>`@${p.id.split('@')[0]}`).join(' ')}`,mentions:meta.participants.map(p=>p.id)});return}
if(cmd==='hidetag'){let meta=await sock.groupMetadata(from);await sock.sendMessage(from,{text:arg||`${S}`,mentions:meta.participants.map(p=>p.id)});return}
if(cmd==='save'){let j=targets[0]||quoted||sender;if(!db.protect.includes(j)){db.protect.push(j);save()}await sock.sendMessage(from,{text:`${S} 🛡️ @${j.split('@')[0]} protégé`,mentions:[j]});return}
if(cmd==='unsave'){let j=targets[0]||quoted||sender;db.protect=db.protect.filter(x=>x!==j);save();await sock.sendMessage(from,{text:`${S} ❌ Plus protégé`});return}
if(cmd==='blockadmin'){let j=targets[0]||quoted;if(!j) return;if(!db.blockedAdmin.includes(j)){db.blockedAdmin.push(j);save()}await sock.sendMessage(from,{text:`${S} 🚫 Admin bloqué`});return}
if(cmd==='unblockadmin'){let j=targets[0]||quoted||from;db.blockedAdmin=db.blockedAdmin.filter(x=>x!==j);save();await sock.sendMessage(from,{text:`${S} ✅ Débloqué`});return}

// FUN & SECRET
if(cmd==='vq'){try{let q=ctx?.quotedMessage;if(!q) return sock.sendMessage(from,{text:`${S} Réponds à une vue unique`});if(q.viewOnceMessageV2) q=q.viewOnceMessageV2.message;if(q.viewOnceMessage) q=q.viewOnceMessage.message;let buf=await downloadMediaMessage({message:q,key:m.key},'buffer',{},{logger:P({level:'silent'}),reuploadRequest:sock.updateMediaMessage});if(q.imageMessage) await sock.sendMessage(from,{image:buf,caption:`${S} 😈`});else if(q.videoMessage) await sock.sendMessage(from,{video:buf,caption:`${S} 😈`});else await sock.sendMessage(from,{text:`${S} Trouvé!`})}catch{};return}
if(cmd==='ghost'){let sent=await sock.sendMessage(from,{text:`👻 ${arg||'BOO!'}`});setTimeout(()=>sock.sendMessage(from,{delete:sent.key}).catch(()=>{}),5000);return}
if(cmd==='rdm'){try{let r=await axios.get('https://api.waifu.pics/sfw/waifu');await sock.sendMessage(from,{image:{url:r.data.url},caption:`${S} ✨ Random`})}catch{await sock.sendMessage(from,{text:`${S} ✨ ${Math.floor(Math.random()*100)}%`})};return}
if(['sticker','s'].includes(cmd)){try{let q=ctx?.quotedMessage;let msgToDl=q?{message:q,key:{remoteJid:from,fromMe:false,id:m.key.id,participant:quoted}}:m;let buf=await downloadMediaMessage(msgToDl,'buffer',{},{logger:P({level:'silent'}),reuploadRequest:sock.updateMediaMessage});if(buf) await sock.sendMessage(from,{sticker:buf})}catch{};return}
if(cmd==='minhaquerida'){await sock.sendMessage(from,{text:"Je t'aime Eliela mon cœur ❤️ - Ton BLACK GOKU 😈 pour toujours!"});return}

}catch(e){console.log(e.message)}
})
}
start()

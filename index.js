const express=require('express')
const fs=require('fs')
const {default:makeWASocket,useMultiFileAuthState,DisconnectReason,fetchLatestBaileysVersion}=require('@whiskeysockets/baileys')
const P=require('pino')
const app=express()
const PORT=process.env.PORT||3000
app.use(express.json())
const OWNER=process.env.OWNER||'555182215198'
let sockGlobal=null, pairingCode=null, isConnected=false, lastCodeTime=0
const DB='./db.json'
let db={config:{botOn:true,mode:'public',style:'BLACK GOKU',antilink:false,antisticker:false,welcome:true,godmode:false,pt:true,pro:false,blockadmin:false}}
try{if(fs.existsSync(DB))db=JSON.parse(fs.readFileSync(DB))}catch(e){}
const save=()=>{try{fs.writeFileSync(DB,JSON.stringify(db,null,2))}catch(e){}}

async function genNewCode(){
 if(!sockGlobal || isConnected) return
 try{
  pairingCode=await sockGlobal.requestPairingCode(OWNER.replace(/[^0-9]/g,''))
  lastCodeTime=Date.now()
  console.log("NOUVEAU CODE:",pairingCode," pour ",OWNER)
 }catch(e){console.log("Erreur:",e.message)}
}
async function start(){
 const {state,saveCreds}=await useMultiFileAuthState('./auth')
 const {version}=await fetchLatestBaileysVersion()
 const sock=makeWASocket({version,auth:state,logger:P({level:'silent'}),browser:["BLACK GOKU","Chrome","1.0.0"]})
 sockGlobal=sock
 sock.ev.on('creds.update',saveCreds)
 if(!state.creds.registered){ await new Promise(r=>setTimeout(r,2000)); await genNewCode() }
 sock.ev.on('connection.update',a=>{
  const {connection,lastDisconnect}=a
  if(connection=='close'){ isConnected=false; pairingCode=null; if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(start,3000) }
  if(connection=='open'){isConnected=true; pairingCode=null; console.log("ONLINE")}
 })
 sock.ev.on('messages.upsert',async({messages})=>{
  const m=messages[0]; if(!m.message) return
  const from=m.key.remoteJid; const isGroup=from.endsWith('@g.us')
  const sender=isGroup?m.key.participant:from
  const isOwner=sender.includes(OWNER)
  let txt=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||""
  if(!txt.startsWith('/')) return
  let cmd=txt.toLowerCase().replace('/','').split(' ')[0].split('@')[0]
  let args=txt.slice(txt.indexOf(' ')+1).trim(); if(txt.indexOf(' ')===-1) args=""
  const reply=t=>sock.sendMessage(from,{text:t},{quoted:m})
  const mentions=()=>m.message.extendedTextMessage?.contextInfo?.mentionedJid||[]
  const qPart=()=>m.message.extendedTextMessage?.contextInfo?.participant
  if(['black','config','info','menu'].includes(cmd)){
   return reply(`*BLACK GOKU 24/24 🔥*\nOwner: ${OWNER}\n`+
`| 👥 GESTION GROUPE\n• /ban / /kick\n• /add\n• /promote / /demote\n• /admin\n• /groupinfo\n`+
`| 🚫 MODÉRATION\n• /mute / /unmute\n• /chut / /unchut\n• /tagall\n• /hidetag\n• /godmode\n• /antilink on/off\n• /antisticker on/off\n• /welcome on/off\n`+
`| 🛡️ PROTECTION\n• /save / /unsave\n• /blockadmin / /unblockadmin\n`+
`| 👁️ SECRET & FUN\n• /vq\n• /ghost\n• /rdm\n• /sticker\n`+
`| PERSO\n• /minhaquerida\n`+
`| ⚙️ STYLE\n• /mode / /style\n• /config / /black / /info\n• /pt on/off\n`+
`| 🔒 OWNER ONLY\n• /bot on/off\n• /amis / /noami\n• /pro`)
  }
  if(cmd=='ban'||cmd=='kick'){ let t=mentions(); if(qPart()) t=[qPart()]; for(let u of t){try{await sock.groupParticipantsUpdate(from,[u],"remove")}catch(e){}} return reply("✅ Ban") }
  if(cmd=='add'){ let n=args.replace(/[^0-9]/g,''); try{await sock.groupParticipantsUpdate(from,[n+"@s.whatsapp.net"],"add"); reply("✅")}catch(e){reply(e.message)} return }
  if(cmd=='promote'){ let t=mentions(); if(qPart()) t=[qPart()]; await sock.groupParticipantsUpdate(from,t,"promote"); return reply("✅ Promote") }
  if(cmd=='demote'){ let t=mentions(); if(qPart()) t=[qPart()]; await sock.groupParticipantsUpdate(from,t,"demote"); return reply("✅ Demote") }
  if(cmd=='admin'){ const meta=await sock.groupMetadata(from); let ad=meta.participants.filter(p=>p.admin).map(p=>`@${p.id.split('@')[0]}`); await sock.sendMessage(from,{text:"👑 Admins:\n"+ad.join("\n"),mentions:meta.participants.filter(p=>p.admin).map(p=>p.id)}); return }
  if(cmd=='groupinfo'){ const meta=await sock.groupMetadata(from); return reply(`*${meta.subject}*\n${meta.participants.length} membres`) }
  if(cmd=='mute'||cmd=='chut'){ await sock.groupSettingUpdate(from,'announcement'); return reply("🔇 Fermé") }
  if(cmd=='unmute'||cmd=='unchut'){ await sock.groupSettingUpdate(from,'not_announcement'); return reply("🔊 Ouvert") }
  if(cmd=='tagall'){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:args||"📢",mentions:meta.participants.map(p=>p.id)}); return }
  if(cmd=='hidetag'){ const meta=await sock.groupMetadata(from); await sock.sendMessage(from,{text:args||" ",mentions:meta.participants.map(p=>p.id)}); return }
  if(cmd=='godmode'||cmd=='antilink'||cmd=='antisticker'||cmd=='welcome'){ db.config[cmd]=args=='on'; save(); return reply(`${cmd} ${args}`) }
  if(cmd=='blockadmin'){ db.config.blockadmin=true; save(); return reply("ON") }
  if(cmd=='unblockadmin'){ db.config.blockadmin=false; save(); return reply("OFF") }
  if(cmd=='vq'){ let q=m.message.extendedTextMessage?.contextInfo?.quotedMessage; if(q?.viewOnceMessageV2||q?.viewOnceMessage){ let v=q.viewOnceMessageV2?.message||q.viewOnceMessage?.message; await sock.sendMessage(from,{forward:v},{quoted:m}); } return }
  if(cmd=='ghost'){ return reply("👻") }
  if(cmd=='rdm'){ return reply(Math.random()>0.5?"Oui":"Non") }
  if(cmd=='sticker'){ try{ const b=await sock.downloadMediaMessage(m); await sock.sendMessage(from,{sticker:b},{quoted:m}) }catch(e){reply("Img + /sticker")} return }
  if(cmd=='minhaquerida'){ return reply("💖 Minha querida, você é meu tudo! 🌹") }
  if(cmd=='bot'){ db.config.botOn=args=='on'; save(); return reply(`Bot ${db.config.botOn?'ON':'OFF'}`) }
  if(cmd=='pro'||cmd=='pt'||cmd=='mode'||cmd=='style'){ if(args) db.config[cmd]=args; save(); return reply(`${cmd}: ${args}`) }
 })
}
start()

app.get('/',async(req,res)=>{
 // ICI = NOUVEAU CODE A CHAQUE ACTUALISATION
 if(!isConnected && sockGlobal){
  try{ await genNewCode() }catch(e){}
 }
 res.send(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>
 body{background:#0a1414;color:#fff;font-family:monospace;padding:10px}
.card{background:#122626;border-radius:10px;padding:12px;margin:10px 0;border-left:3px solid #7ed321}
.code{font-size:36px;letter-spacing:6px;background:#000;padding:18px;border-radius:10px;text-align:center;color:#7ed321;font-weight:bold}
.green{background:#7ed321;color:#000;border:none;padding:14px 22px;border-radius:8px;font-weight:bold;font-size:16px}
 h2{color:#7ed321;text-align:center}
 </style></head><body>
 <h2>🤖 BLACK GOKU PANEL</h2>
 <div class="card">
 <h3>${isConnected?'ONLINE 🟢 '+OWNER:'OFFLINE 🔴 '+OWNER}</h3>
 ${isConnected?`<p>✅ Connecté sur ${OWNER}</p><a href="/refresh"><button class="green">Deconnecter</button></a>`:`<div class="code">${pairingCode||'...'}</div><p style="text-align:center">Nouveau code à chaque Actualisation!<br>Expire 40s | SANS tiret</p><center><a href="/refresh"><button class="green">🔄 Nouveau Code</button></a> <button class="green" onclick="location.reload()">Actualiser</button></center><p style="text-align:center;color:#7ed321;font-size:11px">Dernier: ${new Date(lastCodeTime).toLocaleTimeString()}</p>`}
 </div>
 <div class="card" style="text-align:left;white-space:pre-line">
 | 👥 GESTION GROUPE
 | • /ban / /kick
 | • /add [num]
 | • /promote / /demote
 | • /admin
 | • /groupinfo
 | 🚫 MODÉRATION
 | • /mute / /unmute
 | • /chut / /unchut
 | • /tagall [msg]
 | • /hidetag [msg]
 | • /godmode
 | • /antilink on/off
 | • /antisticker on/off
 | • /welcome on/off
 | 🛡️ PROTECTION
 | • /save / /unsave
 | • /blockadmin / /unblockadmin
 | 👁️ SECRET & FUN
 | • /vq [rep vue unique]
 | • /ghost
 | • /rdm
 | • /sticker
 | PERSO
 | • /minhaquerida
 | ⚙️ STYLE & CONFIG
 | • /mode / /style
 | • /config / /black / /info
 | • /pt on/off
 | 🔒 OWNER ONLY
 | • /bot on/off
 | • /amis / /noami
 | • /pro

 BLACK GOKU 24/24 🔥
 OWNER: ${OWNER}
 </div>
 </body></html>`)
})
app.get('/refresh',async(req,res)=>{
 try{fs.rmSync('./auth',{recursive:true,force:true})}catch(e){}
 pairingCode=null; isConnected=false; lastCodeTime=0
 try{sockGlobal?.end()}catch(e){}
 setTimeout(()=>start(),1500)
 res.redirect('/')
})
app.listen(PORT,()=>console.log('Panel '+PORT+' OWNER '+OWNER))

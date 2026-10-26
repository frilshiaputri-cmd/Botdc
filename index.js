require("dotenv").config();
const fs=require("node:fs"),path=require("node:path");
const {Client,GatewayIntentBits,EmbedBuilder,ActionRowBuilder,StringSelectMenuBuilder,ButtonBuilder,ButtonStyle,PermissionFlagsBits,AttachmentBuilder,ActivityType}=require("discord.js");
if(!process.env.DISCORD_TOKEN){console.error("Isi DISCORD_TOKEN di .env");process.exit(1)}
const root=__dirname,configPath=path.join(root,"data","config.json"),cfg=JSON.parse(fs.readFileSync(configPath,"utf8"));
const save=()=>fs.writeFileSync(configPath,JSON.stringify(cfg,null,2));
const validUrl=s=>{try{return ["https:","http:"].includes(new URL(s).protocol)}catch{return false}};
const getId=s=>(s.match(/\d{15,22}/)||[])[0]||"";
const color=s=>/^#[0-9a-f]{6}$/i.test(s||"")?s:"#8B35FF";
const ownerIds=()=> (process.env.BOT_OWNER_IDS||"").split(",").map(id=>id.trim()).filter(Boolean);
const admin=m=>ownerIds().includes(m.author.id)||Boolean(m.memberPermissions?.has(PermissionFlagsBits.Administrator));
const welcomePath=path.join(root,"assets","welcome.png"),storePath=path.join(root,"assets","script-panel.png");
const welcomeEmbed=m=>{const w=cfg.welcome,e=new EmbedBuilder().setColor(color(w.color)).setTitle(w.title).setDescription(w.description.replaceAll("{mention}",m.toString()).replaceAll("{username}",m.user.username).replaceAll("{server}",m.guild.name)).setThumbnail(m.user.displayAvatarURL({size:256})).setFooter({text:w.footer}).setTimestamp();if(validUrl(w.imageUrl))e.setImage(w.imageUrl);else if(fs.existsSync(welcomePath))e.setImage("attachment://welcome.png");return e};
const storeEmbed=()=>{const s=cfg.store,e=new EmbedBuilder().setColor(color(s.color)).setTitle(s.title).setDescription(s.description+"\n\n📜 Free — **"+s.scripts.filter(x=>x.type==="free").length+" script**\n💎 Donatur — **"+s.scripts.filter(x=>x.type==="donor").length+" script**").setFooter({text:s.footer});if(validUrl(s.imageUrl))e.setImage(s.imageUrl);else if(fs.existsSync(storePath))e.setImage("attachment://script-panel.png");return e};
const components=()=>[new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("k5_get").setLabel("Get Script").setEmoji("📜").setStyle(ButtonStyle.Primary),new ButtonBuilder().setCustomId("k5_role").setLabel("Get Role").setEmoji("🎭").setStyle(ButtonStyle.Secondary))];
const scriptPicker=()=>new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId("k5_select").setPlaceholder("Pilih nama game/script...").setMinValues(1).setMaxValues(1).addOptions(cfg.store.scripts.slice(0,25).map((s,i)=>({label:s.name.slice(0,100),description:(s.type==="donor"?"Donatur":"Free")+" • "+(s.description||"Script").slice(0,70),value:String(i),emoji:s.type==="donor"?"💎":"📜"}))));
const panelPayload=()=>({embeds:[storeEmbed()],components:components(),files:!validUrl(cfg.store.imageUrl)&&fs.existsSync(storePath)?[new AttachmentBuilder(storePath,{name:"script-panel.png"})]:[]});
const updateStorePanel=async guild=>{if(!cfg.store.channelId)return false;const ch=guild.channels.cache.get(cfg.store.channelId)||await guild.channels.fetch(cfg.store.channelId).catch(()=>null);if(!ch?.isTextBased())return false;let msg=null;if(cfg.store.messageId)msg=await ch.messages.fetch(cfg.store.messageId).catch(()=>null);if(msg){await msg.edit(panelPayload());return true;}msg=await ch.send(panelPayload());cfg.store.messageId=msg.id;save();return true;};
const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent]});
client.once("ready",()=>{client.user.setPresence({status:"online",activities:[{name:"K5-HUB Development",state:"Mengembangkan script dan bot",type:ActivityType.Streaming,url:process.env.STREAM_URL||"https://www.twitch.tv/discord"}]});console.log("K5-HUB aktif: "+client.user.tag+" — Streaming K5-HUB Development")});
client.on("guildMemberAdd",async m=>{if(!cfg.welcome.enabled||!cfg.welcome.channelId)return;const ch=m.guild.channels.cache.get(cfg.welcome.channelId);if(ch?.isTextBased())ch.send({embeds:[welcomeEmbed(m)],files:!validUrl(cfg.welcome.imageUrl)&&fs.existsSync(welcomePath)?[new AttachmentBuilder(welcomePath,{name:"welcome.png"})]:[]}).catch(console.error)});
client.on("interactionCreate",async i=>{
if(i.isButton()&&i.customId==="k5_get"){if(!cfg.store.enabled)return i.reply({content:"Script sedang dinonaktifkan admin.",ephemeral:true});if(!cfg.store.scripts.length)return i.reply({content:"Belum ada script tersedia.",ephemeral:true});return i.reply({content:"Pilih nama game/script yang ingin kamu ambil:",components:[scriptPicker()],ephemeral:true});}
if(i.isButton()&&i.customId==="k5_role")return i.reply({content:"Untuk role Donatur, hubungi admin server.",ephemeral:true});
if(!i.isStringSelectMenu()||i.customId!=="k5_select")return;
const s=cfg.store.scripts[Number(i.values[0])];
if(!s)return i.reply({content:"Script tidak ditemukan. Minta admin menjalankan !poststore lagi.",ephemeral:true});
const roles=i.member?.roles?.cache,donor=roles?.some(r=>/donatur|donor|supporter/i.test(r.name));
if(s.type==="donor"&&!donor&&!i.memberPermissions?.has(PermissionFlagsBits.Administrator))return i.reply({content:"💎 Script ini khusus role Donatur.",ephemeral:true});
const loader="loadstring(game:HttpGet("+JSON.stringify(s.url)+"))()";
return i.reply({content:"**"+s.name+"**\n```lua\n"+loader+"\n```",ephemeral:true});
});
client.on("messageCreate",async m=>{if(!m.guild||m.author.bot||!m.content.startsWith(cfg.prefix))return;const raw=m.content.slice(cfg.prefix.length).trim(),idx=raw.indexOf(" "),cmd=(idx<0?raw:raw.slice(0,idx)).toLowerCase(),arg=idx<0?"":raw.slice(idx+1).trim();const protectedCmd=["clear","setwelcomechannel","welcometitle","welcomedesc","welcomeimage","welcomefooter","welcomeon","welcomeoff","testwelcome","setstorechannel","setstoretitle","setstoredesc","storeimage","addscript","removescript","scripts","post","storeon","storeoff","setprefix","setcolor"];if(protectedCmd.includes(cmd)&&!admin(m))return m.reply("⛔ Perintah ini khusus Administrator.");try{switch(cmd){
case"clear":{if(!m.guild.members.me?.permissionsIn(m.channel).has(PermissionFlagsBits.ManageMessages))return m.reply("⛔ Bot perlu izin Manage Messages di channel ini.");const n=Number.parseInt(arg||"50",10);if(!Number.isInteger(n)||n<1||n>100)return m.reply("Format: !clear [jumlah 1-100]");const sent=await m.channel.send("🧹 Membersihkan "+n+" pesan...");try{const deleted=await m.channel.bulkDelete(n,true);await sent.edit("✅ Berhasil menghapus "+deleted.size+" pesan (pesan lebih dari 14 hari otomatis dilewati).");}catch(e){await sent.edit("❌ Gagal menghapus pesan. Pastikan bot memiliki izin Manage Messages.");}return;}
case"help":return m.reply("**K5-HUB Commands**\n!clear [jumlah 1-100] — hapus pesan di channel\n!setwelcomechannel #welcome\n!welcometitle teks · !welcomedesc teks\n!welcomeimage URL/off · !welcomefooter teks\n!welcomeon / !welcomeoff · !testwelcome\n!setstorechannel #get-script\n!setstoretitle teks · !setstoredesc teks · !storeimage URL/off\n!addscript — bot menanyakan nama, kategori, deskripsi, lalu URL/kode loadstring\n!removescript Nama · !scripts · !post\n!storeon / !storeoff · !setprefix ? · !setcolor #8B35FF");
case"setwelcomechannel":{const id=getId(arg);if(!id)return m.reply("Contoh: !setwelcomechannel #welcome");cfg.welcome.channelId=id;save();return m.reply("✅ Channel welcome disetel.")}
case"welcometitle":cfg.welcome.title=arg.slice(0,256);save();return m.reply("✅ Judul welcome diubah.");
case"welcomedesc":cfg.welcome.description=arg.replace(/\\n/g,"\n").slice(0,4000);save();return m.reply("✅ Pesan welcome diubah.");
case"welcomeimage":if(arg.toLowerCase()==="off")cfg.welcome.imageUrl="";else if(validUrl(arg))cfg.welcome.imageUrl=arg;else return m.reply("Masukkan URL gambar atau off.");save();return m.reply("✅ Banner welcome diubah.");
case"welcomefooter":cfg.welcome.footer=arg.slice(0,2048);save();return m.reply("✅ Footer diubah.");
case"welcomeon":cfg.welcome.enabled=true;save();return m.reply("✅ Welcome aktif.");
case"welcomeoff":cfg.welcome.enabled=false;save();return m.reply("✅ Welcome nonaktif.");
case"testwelcome":return m.channel.send({embeds:[welcomeEmbed(m.member)],files:!validUrl(cfg.welcome.imageUrl)&&fs.existsSync(welcomePath)?[new AttachmentBuilder(welcomePath,{name:"welcome.png"})]:[]});
case"setstorechannel":{const id=getId(arg);if(!id)return m.reply("Contoh: !setstorechannel #get-script");cfg.store.channelId=id;save();return m.reply("✅ Channel store disetel.")}
case"setstoretitle":cfg.store.title=arg.slice(0,256);save();await updateStorePanel(m.guild).catch(console.error);return m.reply("✅ Judul panel diubah.");
case"setstoredesc":cfg.store.description=arg.slice(0,3000);save();await updateStorePanel(m.guild).catch(console.error);return m.reply("✅ Deskripsi panel diubah.");
case"storeimage":if(arg.toLowerCase()==="off")cfg.store.imageUrl="";else if(validUrl(arg))cfg.store.imageUrl=arg;else return m.reply("Masukkan URL gambar atau off.");save();await updateStorePanel(m.guild).catch(console.error);return m.reply("✅ Banner panel diubah.");
case"addscript":{
if(cfg.store.scripts.length>=25)return m.reply("Maksimal 25 script.");
const ask=async prompt=>{await m.reply(prompt);const collected=await m.channel.awaitMessages({filter:x=>x.author.id===m.author.id&&x.channelId===m.channelId&&!x.author.bot,max:1,time:120000,errors:["time"]}).catch(()=>null);return collected?.first()?.content?.trim()||null};
let name=arg.trim();
if(!name)name=await ask("📝 Tambah Script — 1/4\nKetik nama script yang ingin ditampilkan:");
if(!name||name.toLowerCase()==="batal")return m.reply("Penambahan script dibatalkan atau waktu habis.");
if(name.length>100)return m.reply("Nama maksimal 100 karakter.");
if(cfg.store.scripts.some(s=>s.name.toLowerCase()===name.toLowerCase()))return m.reply("Nama script sudah ada.");
const categoryRow=new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("addscript_free_"+m.author.id).setLabel("Free").setEmoji("📜").setStyle(ButtonStyle.Success),new ButtonBuilder().setCustomId("addscript_donor_"+m.author.id).setLabel("Donatur").setEmoji("💎").setStyle(ButtonStyle.Primary));
const categoryMsg=await m.reply({content:"🏷️ Tambah Script — 2/4\nPilih salah satu kategori:",components:[categoryRow]});
const picked=await categoryMsg.awaitMessageComponent({filter:i=>i.user.id===m.author.id&&i.customId.endsWith("_"+m.author.id),time:120000,componentType:2}).catch(()=>null);
if(!picked)return m.reply("Waktu habis. Jalankan !addscript untuk mencoba lagi.");
const type=picked.customId.includes("_donor_")?"donor":"free";
await picked.update({content:"Kategori dipilih: "+(type==="donor"?"Donatur":"Free"),components:[]});
const description=await ask("📝 Tambah Script — 3/4\nKetik deskripsi script:");
if(!description||description.toLowerCase()==="batal")return m.reply("Penambahan script dibatalkan atau waktu habis.");
const input=await ask("💬 Tambah Script — 4/4\nKirim respons/kode script yang ingin bot tampilkan, misalnya kode loadstring lengkap. Kamu bisa mengetik atau menempelkan sendiri:");
if(!input||input.toLowerCase()==="batal")return m.reply("Penambahan script dibatalkan atau waktu habis.");
const match=input.match(/game\s*:\s*HttpGet\s*\(\s*(["'])(https?:\/\/[^"']+)\1\s*\)/i);
let url=input;
if(/^loadstring\s*\(/i.test(input)){
if(!match)return m.reply("Kode loadstring tidak terbaca. Jalankan !addscript lagi dan kirim kode dengan format loadstring(game:HttpGet(\"URL\"))().");
url=match[2];
}
if(!validUrl(url))return m.reply("Respons harus berupa URL http/https atau kode loadstring yang berisi URL http/https.");
cfg.store.scripts.push({name,type,description,url});
save();
await updateStorePanel(m.guild).catch(console.error);
return m.reply("✅ Script "+name+" ditambahkan dan panel Get Script diperbarui otomatis.");
}
case"removescript":{const n=cfg.store.scripts.findIndex(s=>s.name.toLowerCase()===arg.toLowerCase());if(n<0)return m.reply("Script tidak ditemukan.");cfg.store.scripts.splice(n,1);save();await updateStorePanel(m.guild).catch(console.error);return m.reply("🗑️ Script dihapus dan panel Get Script diperbarui otomatis.")}
case"scripts":return m.reply(cfg.store.scripts.length?cfg.store.scripts.map((s,i)=>(i+1)+". "+s.name+" — "+s.type).join("\n"):"Belum ada script.");
case"post":{if(!cfg.store.channelId){cfg.store.channelId=m.channel.id;save();}const ok=await updateStorePanel(m.guild);return m.reply(ok?"✅ Panel K5-HUB diperbarui/dikirim.":"❌ Channel panel tidak valid. Gunakan !setstorechannel #channel.");}
case"storeon":cfg.store.enabled=true;save();await updateStorePanel(m.guild).catch(console.error);return m.reply("✅ Panel aktif.");
case"storeoff":cfg.store.enabled=false;save();await updateStorePanel(m.guild).catch(console.error);return m.reply("✅ Panel dinonaktifkan.");
case"setprefix":if(!arg||arg.length>3||/\s/.test(arg))return m.reply("Prefix 1–3 karakter tanpa spasi.");cfg.prefix=arg;save();return m.reply("✅ Prefix baru: "+arg);
case"setcolor":if(!/^#[0-9a-f]{6}$/i.test(arg))return m.reply("Contoh: !setcolor #8B35FF");cfg.welcome.color=cfg.store.color=arg;save();return m.reply("✅ Warna diubah.");
}}catch(e){console.error(e);return m.reply("Terjadi error. Periksa log bot dan izin channel.")}});
client.login(process.env.DISCORD_TOKEN);

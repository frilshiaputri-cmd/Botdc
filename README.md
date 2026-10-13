# K5-HUB Discord Bot

Bot Discord Node.js + discord.js v14 dengan prefix `!`, Welcome System dan Script Store.

## Setup
1. Install Node.js 18.17+.
2. Di Discord Developer Portal, aktifkan **Server Members Intent** dan **Message Content Intent**.
3. Salin `.env.example` menjadi `.env`, isi `DISCORD_TOKEN`.
4. Jalankan `npm install` lalu `npm start`.

## Admin commands
- `!help`
- `!setwelcomechannel #welcome`
- `!welcometitle teks` / `!welcomedesc teks`
- `!welcomeimage URL` / `!welcomeimage off`
- `!welcomeon` / `!welcomeoff` / `!testwelcome`
- `!setstorechannel #get-script`
- `!setstoretitle teks` / `!setstoredesc teks`
- `!storeimage URL` / `!storeimage off`
- `!addscript Nama | free/donor | deskripsi | URL`
- `!removescript Nama` / `!scripts` / `!poststore`
- `!storeon` / `!storeoff` / `!setprefix ?` / `!setcolor #8B35FF`

Jangan commit file `.env` atau token bot. Role Donatur diperiksa dari nama role yang mengandung `donatur`, `donor`, atau `supporter`.

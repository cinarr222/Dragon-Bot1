const Discord = require('discord.js');
const client = new Discord.Client({
  fetchAllMembers: true,
  partials: ["MESSAGE", "USER", "REACTION"]
});
const ayarlar = require('./ayarlar.json');
const fs = require('fs');
const db = require("orio.db");
const data = require('orio.db');
const express = require("express");
const moment = require('moment');
const { join } = require("path");
const fetch = require("node-fetch");
require('./util/eventLoader')(client);

var prefix = ayarlar.prefix;
  
  
const log = message => {
    console.log(`[Dragon Bot] ${message}`);
  };
  
  
  
 // - - - - - - Komut Yükleme - - - - - - //
  
  

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir('./komutlar/', (err, files) => {
  if (err) console.error(err);
  log(`${files.length} komut yüklenecek.`);
  files.forEach(f => {
    let props = require(`./komutlar/${f}`);
    log(`Yüklenen komut: ${props.help.name}.`);
    client.commands.set(props.help.name, props);
    props.conf.aliases.forEach(alias => {
      client.aliases.set(alias, props.help.name);
    });
  });
});


client.elevation = message => {
  if(!message.guild) {
	return; }
  let permlvl = 0;
  if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
  if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
  if (message.author.id === ayarlar.author) permlvl = 4;
  return permlvl;
};

client.reload = command => {
    return new Promise((resolve, reject) => {
      try {
        delete require.cache[require.resolve(`./komutlar/${command}`)];
        let cmd = require(`./komutlar/${command}`);
        client.commands.delete(command);
        client.aliases.forEach((cmd, alias) => {
          if (cmd === command) client.aliases.delete(alias);
        });
        client.commands.set(command, cmd);
        cmd.conf.aliases.forEach(alias => {
          client.aliases.set(alias, cmd.help.name);
        });
        resolve();
      } catch (e){
        reject(e);
      }
    });
  };
  
  client.load = command => {
    return new Promise((resolve, reject) => {
      try {
        let cmd = require(`./komutlar/${command}`);
        client.commands.set(command, cmd);
        cmd.conf.aliases.forEach(alias => {
          client.aliases.set(alias, cmd.help.name);
        });
        resolve();
      } catch (e){
        reject(e);
      }
    });
  };
  
  client.unload = command => {
    return new Promise((resolve, reject) => {
      try {
        delete require.cache[require.resolve(`./komutlar/${command}`)];
        let cmd = require(`./komutlar/${command}`);
        client.commands.delete(command);
        client.aliases.forEach((cmd, alias) => {
          if (cmd === command) client.aliases.delete(alias);
        });
        resolve();
      } catch (e){
        reject(e);
      }
    });
  };

  

 // - - - - - - Ses Kanalı - - - - - - //
 
 

client.on("ready", async () => {
  let botVoiceChannel = client.channels.cache.get("1233889309950476309");
  console.log("Dragon : Ses kanalı girişi başarılı!");
  if (botVoiceChannel)
    botVoiceChannel
      .join()
      .catch(err => console.error("Kanal Hatası!"));
});



 // - - - - - - Sunucuya Eklenme / Çıkarılma - - - - - - //
 
 

client.on("guildDelete", guild => {
  let Crewembed = new Discord.MessageEmbed()

    .setColor("RED")
    .setTitle("☃️ Dragon Çıkış Log ☃️")
    .addField("Atıldığım Sunucu:", guild.name)
    .addField("Sunucunun Sahibi:", guild.owner)
	.addField("Sunucudaki Kişi Sayısı:", guild.memberCount)
	.setImage(
      "https://i.hizliresim.com/411xc6s.gif"
    )
	.setFooter('DragonNetwork 💜  2020 © 2024');
});

client.on("guildCreate", guild => {
  var channel;
    guild.channels.cache.forEach(c => {
        if (c.type === "text" && !channel) channel = c;
    });
    channel.createInvite({ maxAge: 0 }).then(invite => {

  let Crewembed = new Discord.MessageEmbed()

    .setColor("GREEN")
    .setTitle("☃️ Dragon Giriş Log ☃️")
    .addField("Eklendiğim Sunucu:", guild.name)
    .addField("Sunucunun Sahibi:", guild.owner)
    .addField("Sunucunun Davet Linki:", invite.code, true)
	.addField("Sunucudaki Kişi Sayısı:", guild.memberCount)
	.setImage(
      "https://i.hizliresim.com/411xc6s.gif"
    )
	.setFooter('DragonNetwork 💜  2020 © 2024');

  client.channels.cache.get("829070751780175920").send(Crewembed);
   });
});
  
   // - - - - - - Oto-Rol Sistemi - - - - - - //
  
  

client.on("guildMemberAdd", async member => {
  let kanal = await data.fetch(`otoRK_${member.guild.id}`);
  let rol = await data.fetch(`otoRL_${member.guild.id}`);
  let mesaj = data.fetch(`otoRM_${member.guild.id}`);
  if (!rol) return;

  if (!mesaj) {
    client.channels.cache.get(kanal).send(":inbox_tray: `" + member.user.username + "` Sunucuya hoşgeldin, rollerini verdim seninle birlikte `" + member.guild.memberCount + "` kişi olduk.");
    return member.roles.add(rol);
  }

  if (mesaj) {
    var mesajs = mesaj.replace("-uye-", `${member}`).replace("-uyetag-", `${member.user.tag}`).replace("-rol-", `${member.guild.roles.cache.get(rol).name}`).replace("-server-", `${member.guild.name}`).replace("-uyesayisi-", `${member.guild.memberCount}`).replace("-botsayisi-", `${member.guild.members.cache.filter(m => m.user.bot).size}`).replace("-bolge-", `${member.guild.region}`).replace("-kanalsayisi-", `${member.guild.channels.cache.size}`);
    member.roles.add(rol);
    return client.channels.cache.get(kanal).send(mesajs);
     }
});

client.on('message', async msg => {
  let ozelkomut = await data.fetch(`sunucuKomut_${msg.guild.id}`);
  let ozelkomutYazi;
  if (ozelkomut == null) ozelkomutYazi = 'Burayı silme yoksa hatalı olur'
  else ozelkomutYazi = ''+ ozelkomut +''
  if (msg.content.toLowerCase() === ozelkomutYazi) {
      let mesaj = await data.fetch(`sunucuMesaj_${msg.guild.id}`);
  let mesajYazi;
  if (mesaj == null) mesajYazi = 'Burayı silme yoksa hatalı olur'
  else mesajYazi = ''+ mesaj +''
    msg.channel.send(mesajYazi)
  }
});
  
  
  
   // - - - - - - Sayaç Sistemi - - - - - - //
  
  
  
  client.on("guildMemberRemove", async member => {
  const channel = data.fetch(`sayaçKanal_${member.guild.id}`);
  if (data.has(`sayacsayı_${member.guild.id}`) == false) return;
  if (data.has(`sayaçKanal_${member.guild.id}`) == false) return;

  member.guild.channels.cache
    .get(channel)
    .send(
      `<a:cikis:871801602321813574> ${member} adlı kullanıcı sunucudan ayrıldı. \`${data.fetch(`sayacsayı_${member.guild.id}`)}\` kişi olmaya son \`${data.fetch(`sayacsayı_${member.guild.id}`) - member.guild.memberCount}\` kişi kaldı, toplam \`${member.guild.memberCount}\` kişiyiz!`
    );
});
client.on("guildMemberAdd", async member => {
  const channel = data.fetch(`sayaçKanal_${member.guild.id}`);
  if (data.has(`sayacsayı_${member.guild.id}`) == false) return;
  if (data.has(`sayaçKanal_${member.guild.id}`) == false) return;

  member.guild.channels.cache
    .get(channel)
    .send(
      `<a:giris:871801602112102501> ${member} adlı kullanıcı sunucuya katıldı. \`${data.fetch(`sayacsayı_${member.guild.id}`)}\` kişi olmaya son \`${data.fetch(`sayacsayı_${member.guild.id}`) - member.guild.memberCount}\` kişi kaldı, toplam \`${member.guild.memberCount}\` kişiyiz!`
    );
});

  
  
  
   // - - - - - - Küfür Engel - - - - - - //


const küfür = [
        "engellenecek küfürleri",
		"engellenecek küfürleri",
		"engellenecek küfürleri",
		"engellenecek küfürleri",
		"engellenecek küfürleri",
		"engellenecek küfürleri",
		"engellenecek küfürleri",
		"buraya alt alta ekleyin"
      ];
client.on("messageUpdate", async (old, nev) => {
  
    if (old.content != nev.content) {
    let i = await data.fetch(`küfür.${nev.member.guild.id}.durum`);
    let y = await data.fetch(`küfür.${nev.member.guild.id}.kanal`);
   if (i) {
      
      if (küfür.some(word => nev.content.includes(word))) {
      if (nev.member.hasPermission("BAN_MEMBERS")) return ;
       //if (ayarlar.gelistiriciler.includes(nev.author.id)) return ;
 const embed = new Discord.MessageEmbed() .setColor("ORANGE")
            .addField("Mesajı:",nev)
        .setColor("ORANGE")
		.setDescription(`asdadas "${nev.author}"`)
	.setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ")
            nev.delete();
            const embeds = new Discord.MessageEmbed() .setColor("ORANGE") .setDescription(` ${nev.author} , **Mesajı editleyerek küfür etmene izin veremem!**`) 
          client.channels.cache.get(y).send(embed)
            nev.channel.send(embeds).then(msg => msg.delete({timeout:5000}));
          
      }
    } else {
    }
    if (!i) return;
  }
});


client.on("message", async msg => {

     
    if(msg.author.bot) return;
    if(msg.channel.type === "dm") return;
         let y = await data.fetch(`küfür.${msg.member.guild.id}.kanal`);
   
    let i = await data.fetch(`küfür.${msg.member.guild.id}.durum`);
          if (i) {
              if (küfür.some(word => msg.content.toLowerCase().includes(word))) {
                try {
                 if (!msg.member.hasPermission("MANAGE_GUILD")) {
     msg.delete({timeout:750});
                    const embeds = new Discord.MessageEmbed() 
					        .setColor("ORANGE")
				 .setDescription(`Bir kullanıcı küfür etmeye çalıştı kullanıcının mesajını engelledim ve log kanalına detaylı bilgiyi gönderdim.`)
	.setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ")
      msg.channel.send(embeds).then(msg => msg.delete({timeout: 5000}));
                const embed = new Discord.MessageEmbed() .setColor("ORANGE") .setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ") .setDescription(`Bir kullanıcı küfür etmeye çalıştı kullanıcının mesajını engelledim ve log kanalına detaylı bilgiyi gönderdim.\n\n**» Kullanıcının Adı :** <@${msg.author.id}>`) .addField("**» Kullanıcının Mesajı :**",msg)
               client.channels.cache.get(y).send(embed)
                  }              
                } catch(err) {
                  console.log(err);
                }
              }
          }
         if(!i) return ;
});



   // - - - - - - Reklam Engel - - - - - - //



const reklam = [
  "engellenecek reklamları",
  "engellenecek reklamları",
  "engellenecek reklamları",
  "engellenecek reklamları",
  "engellenecek reklamları",
  "engellenecek reklamları",
  "engellenecek reklamları",
  "buraya alt alta ekleyin"
];
client.on("messageUpdate", async (old, nev) => {

if (old.content != nev.content) {
let i = await data.fetch(`reklam.${nev.member.guild.id}.durum`);
let y = await data.fetch(`reklam.${nev.member.guild.id}.kanal`);
if (i) {


if (reklam.some(word => nev.content.includes(word))) {
if (nev.member.hasPermission("BAN_MEMBERS")) return ;
const embed = new Discord.MessageEmbed() .setColor("ORANGE") .setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ") .setDescription(`Bir kullanıcı reklam yapmaya çalıştı kullanıcının mesajını engelledim.\n\n**» Kullanıcının Adı :** ${nev.author}`) 
.addField("**» Kullanıcının Mesajı :**",nev)
  
      nev.delete();
      const embeds = new Discord.MessageEmbed() 					        .setColor("ORANGE")
				 .setDescription(`Bir kullanıcı reklam yapmaya çalıştı kullanıcının mesajını engelledim ve log kanalına detaylı bilgiyi gönderdim.\n\n**» Kullanıcının Adı :** ${nev.author}`)
	.setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ")
    client.channels.cache.get(y).send(embed)
      nev.channel.send(embeds).then(msg => msg.delete({timeout:5000}));
    
}
} else {
}
if (!i) return;
}
});

client.on("message", async msg => {


if(msg.author.bot) return;
if(msg.channel.type === "dm") return;
   let y = await data.fetch(`reklam.${msg.member.guild.id}.kanal`);

let i = await data.fetch(`reklam.${msg.member.guild.id}.durum`);
    if (i) {
        if (reklam.some(word => msg.content.toLowerCase().includes(word))) {
          try {
           if (!msg.member.hasPermission("MANAGE_GUILD")) {
msg.delete({timeout:750});
              const embeds = new Discord.MessageEmbed() .setColor("ORANGE") .setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ") .setDescription(`Bir kullanıcı reklam yapmaya çalıştı kullanıcının mesajını engelledim ve log kanalına detaylı bilgiyi gönderdim.\n\n**» Kullanıcının Adı :** <@${msg.author.id}>`)
msg.channel.send(embeds).then(msg => msg.delete({timeout: 5000}));
          const embed = new Discord.MessageEmbed()
		.setColor("ORANGE")
		.setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ")
		.setColor("ORANGE") .setTitle(":flag_tr:  Sohbet Sistemi :flag_tr: ") .setDescription(`Bir kullanıcı reklam yapmaya çalıştı kullanıcının mesajını engelledim.\n\n**» Kullanıcının Adı :** <@${msg.author.id}>`) 
.addField("**» Kullanıcının Mesajı :**",msg)
         client.channels.cache.get(y).send(embed)
            }              
          } catch(err) {
            console.log(err);
          }
        }
    }
   if(!i) return ;
});



  
   // - - - - - - Kayıt Sistemi - - - - - - //



client.on("guildMemberAdd", member => {
  let guild = member.guild;
  let kanal = data.fetch(`kayıthg_${member.guild.id}`);
  let kayıtçı = data.fetch(`kayıtçırol_${member.guild.id}`);
  let aylartoplam = {
    "01": "Ocak",
    "02": "Şubat",
    "03": "Mart",
    "04": "Nisan",
    "05": "Mayıs",
    "06": "Haziran",
    "07": "Temmuz",
    "08": "Ağustos",
    "09": "Eylül",
    "10": "Ekim",
    "11": "Kasım",
    "12": "Aralık"
  };
  let aylar = aylartoplam;

  let user = client.users.cache.get(member.id);
  require("moment-duration-format");

  const kurulus = new Date().getTime() - user.createdAt.getTime();
  const ayyy = moment.duration(kurulus).format("M");
  var kontrol = [];

  if (ayyy < 1) {
    kontrol = "**Şüpheli!** ";
  }
  if (ayyy > 1) {
    kontrol = "**Güvenilir** ";
  }

  if (!kanal) return;

  ///////////////////////

  let randomgif = ["https://i.pinimg.com/originals/e7/ab/03/e7ab03bac23eb9b3f5bd67ba27ca7b08.gif","https://i.pinimg.com/originals/e7/ab/03/e7ab03bac23eb9b3f5bd67ba27ca7b08.gif"];

  ///////////////////
  const embed = new Discord.MessageEmbed()
    .setColor("ORANGE")
	.setTitle(":flag_tr:  Kullanıcı Girişi :flag_tr: ")
    .setImage(randomgif[Math.floor(Math.random() * randomgif.length)])
    .setThumbnail(
      user.avatarURL({
        dynamic: true,
        format: "gif",
        format: "png",
        format: "jpg",
        size: 2048
      })
    )

 
  .setDescription(`\n **Hoşgeldin,** ${
        member.user
}\n Kaydınızı tamamlayabilmemiz için **İsim** & **Yaş** belirtmeniz gerekmektedir.\n \n  Hesap kuruluş tarihi: **${moment(
        user.createdAt
      ).format("DD")} ${aylar[moment(user.createdAt).format("MM")]} ${moment(
        user.createdAt
      ).format(
        "YYYY HH:mm:ss"
       )}** \n  Bu kullanıcının hesap durumu : ${kontrol} \n\n  Kayıt yetkilileri birazdan sizinle ilgilenecektir.`);
  
  client.channels.cache.get(kanal).send(embed);
  client.channels.cache.get(kanal).send(`<@&${kayıtçı}> Bir arkadaş aramıza katıldı kayıt olmak için bekliyor, ilgilenirmisiniz lütfen.`);
});
  
  
   // - - - - - - Seviye Sistemi - - - - - - //
   
   
  
  
 // - - - - - - Destek Talebi - - - - - - //


client.on("ready", function() {
  if(db.get("csticket")){
  Object.entries(db.get("csticket")).map(e => {
    const sunucu = client.guilds.cache.get(e[1].sunucuID)
       if(!sunucu){
      db.delete("csticket."+e[1].sunucuID)
    } else {
    const kanal = sunucu.channels.cache.get(e[1].kanal)
       if(!kanal){
      db.delete("csticket."+e[1].sunucuID)
    } else {
    const data = kanal.messages.fetch(e[1].mesajID)
    if(!data){
      db.delete("csticket."+e[1].sunucuID)
    } else {
  
      data.then(mr => {
        if(mr){
          mr.reactions.removeAll()
        mr.react("📨");
        }
      })
    }
    }
    }
  });
}
});

client.on("messageReactionAdd", (messageReaction, user) => {
  if (!user.bot) {
    let member = messageReaction.message.guild.members.cache.get(user.id);
  const data = db.get("csticket."+messageReaction.message.guild.id)
  
  if(data){
      if (data.mesajID === messageReaction.message.id) {
        if (messageReaction.emoji.name === "📨") {
     messageReaction.users.remove(user.id)
            const prefixx = ayarlar.prefix
let csrol = messageReaction.message.guild.roles.cache.get(data.rolID)
    let onl;
          let listedChannels = []
    messageReaction.message.guild.members.cache.forEach(p => {
      if (p.roles.cache.has(csrol.id)) {
        if (messageReaction.message.guild.members.cache.get(p.id).user.presence.status === "idle") onl = ":orange_circle:" 
        if (messageReaction.message.guild.members.cache.get(p.id).user.presence.status === "dnd") onl = ":red_circle:"
        if (messageReaction.message.guild.members.cache.get(p.id).user.presence.status === "online") onl = ":green_circle:"
        if (messageReaction.message.guild.members.cache.get(p.id).user.presence.status === "offline") onl = ":white_circle:"

        listedChannels.push(`\`${p.user.tag}` + "\` " + onl );
      }
    });
    if (!messageReaction.message.guild.channels.cache.find(xx => xx.name === "DESTEK")) {
       messageReaction.message.guild.channels.create(`DESTEK`, { type: 'category'});
    }
    let a = messageReaction.message.guild.channels.cache.find(xxx => xxx.name === "DESTEK");
    if (messageReaction.message.guild.channels.cache.some(
        kk =>
          kk.name ===
          `destek-${messageReaction.message.guild.members.cache.get(member.id).user.username.toLowerCase() +
            messageReaction.message.guild.members.cache.get(member.id).user.discriminator}`
      ) == true
    )
      return messageReaction.message.channel.send(`**<@${user.id}>, Destek Sistemi Açma İşlemi Başarısız!\nSebep: \`Açılmış Zaten 1 Tane Destek Talebiniz Var.\`**`).then(mr => mr.delete({timeout:10000}))
    messageReaction.message.guild.channels.create(`destek-${member.user.tag}`)
      .then(async c => {
      if(a){
        c.setParent(a)
      }
      const gdl = client.guilds.cache.get(messageReaction.message.guild.id)
    if(gdl.roles.cache.get(data.rolID)){
      await c.createOverwrite(gdl.roles.cache.get(data.rolID), {
          SEND_MESSAGES: true,
          VIEW_CHANNEL: true
      });
    }
      await c.createOverwrite(gdl.roles.cache.find(r => r.name === '@everyone'), {
          SEND_MESSAGES: false,
          VIEW_CHANNEL: false
      });
      await c.createOverwrite(member, {
          SEND_MESSAGES: true,
          VIEW_CHANNEL: true
      });
    
    
        const embed = new Discord.MessageEmbed()
          .setColor("ORANGE")
          .setTitle(":flag_tr:  Destek Sistemi :flag_tr: ")
          .addField(
            `Merhaba ${user.username}!`,
            `Destek Yetkilileri Burada Seninle İlgilenecektir!\nDestek Talebini Kapatmak İçin \`${prefixx}kapat\` Yazabilirsin!`
          )
          .addField(`» Kullanıcı:`, `<@${user.id}>`)
          .addField(
            `**Destek Rolündeki Yetkililer;**`,          
`${listedChannels.join(`\n`) || "KİMSE YOK"}`
          )
          .setFooter('DragonNetwork 💜  2020 © 2024');
        c.send(embed);

        
      })
      .catch(console.error);
  }
          
        }
      }
 
  }
});



client.on("message", message => {
  const cprefix = ayarlar.prefix
  if (message.content.toLowerCase().startsWith(cprefix + `kapat`)) {
    if (!message.channel.name.startsWith(`destek-`))
      return message.channel.send(
        `Bu Komut Sadece Destek Talebi Kanallarında Kullanılabilir!`
      );

    var deneme = new Discord.MessageEmbed()
      .setColor("ORANGE")
      .setTitle(":flag_tr:  Destek Sistemi :flag_tr: ")
      .setDescription(
        `Destek Talebini Kapatmayı Onaylamak İçin 8 Saniye İçinde \`evet\` Yazınız!`
      )
      .setFooter('DragonNetwok 💜  2020 © 2024');
    message.channel.send(deneme).then(m => {
      message.channel
        .awaitMessages(response => response.content === "evet", {
          max: 1,
          time: 8000,
          errors: ["time"]
        })
        .then(collected => {
          message.channel.delete(); 
        })
        .catch(() => {
          m.edit("Destek Talebi Kapatma İsteğin Zaman Aşımına Uğradı!").then(
            m2 => {
              m2.delete({timeout:100});
            },
            5000
          );
        });
    });
  }
});



 // - - - - - - Moderasyon Log - - - - - - //
 
 

client.on("messageDelete", async message => {
  if (message.author.bot || message.channel.type == "dm") return;

  let log = message.guild.channels.cache.get(
    await data.fetch(`log_${message.guild.id}`)
  );

  if (!log) return;

  const embed = new Discord.MessageEmbed()

    .setTitle("☃️ Dragon Moderasyon Log ☃️")

    .setColor("ORANGE")

    .addField("Kullanıcı Adı : ", message.author)

    .addField("Mesaj Kanalı : ", message.channel)

    .addField("Silinen Eski Mesaj : ", "" + message.content + "")

    .setFooter('DragonNetwork 💜  2020 © 2024');

  log.send(embed);
});

client.on("channelCreate", async channel => {
  let modlog = await data.fetch(`log_${channel.guild.id}`);

  if (!modlog) return;

  const entry = await channel.guild
    .fetchAuditLogs({ type: "CHANNEL_CREATE" })
    .then(audit => audit.entries.first());

  let kanal;

  if (channel.type === "text") kanal = `<#${channel.id}>`;

  if (channel.type === "voice") kanal = `\`${channel.name}\``;

  let embed = new Discord.MessageEmbed()


    .setTitle("☃️ Dragon Moderasyon Log ☃️")

    .setColor("ORANGE")

    .addField(`Yapılan İşlem : **Kanal Oluşturma**`)

    .addField(`İşlemi Gerçekleştiren : `, `<@${entry.executor.id}>`)

    .addField(`Oluşturulan Kanal : `, `${kanal}`)

    .setFooter('DragonNetwork 💜  2020 © 2024');

  client.channels.cache.get(modlog).send(embed);
  
});

client.on("channelDelete", async channel => {
  let modlog = await data.fetch(`log_${channel.guild.id}`);

  if (!modlog) return;

  const entry = await channel.guild
    .fetchAuditLogs({ type: "CHANNEL_DELETE" })
    .then(audit => audit.entries.first());

  let embed = new Discord.MessageEmbed()

  .setTitle("☃️ Dragon Moderasyon Log ☃️")

  .setColor("ORANGE")

  .addField(`Yapılan İşlem : **Kanal Silme**`)

  .addField(`İşlemi Gerçekleştiren : `, `<@${entry.executor.id}>`)

  .addField(`Silinen Kanal : `, `${channel.name}`)

  .setFooter('DragonNetwork 💜  2020 © 2024');

  client.channels.cache.get(modlog).send(embed);
});

client.on("roleCreate", async role => {
  let modlog = await data.fetch(`log_${role.guild.id}`);

  if (!modlog) return;

  const entry = await role.guild
    .fetchAuditLogs({ type: "ROLE_CREATE" })
    .then(audit => audit.entries.first());

  let embed = new Discord.MessageEmbed()

  .setTitle("☃️ Dragon Moderasyon Log ☃️")

  .setColor("ORANGE")

  .addField(`Yapılan İşlem : **Kullanıcı Grubu Oluşturma**`)

  .addField(`İşlemi Gerçekleştiren : `, `<@${entry.executor.id}>`)

  .addField(`Oluşturulan Grup : `, `\`${role.name}\` **=** \`${role.id}\``)

  .setFooter('DragonNetwork 💜  2020 © 2024');

  client.channels.cache.get(modlog).send(embed);
});

client.on("roleDelete", async role => {
  let modlog = await data.fetch(`log_${role.guild.id}`);

  if (!modlog) return;

  const entry = await role.guild
    .fetchAuditLogs({ type: "ROLE_DELETE" })
    .then(audit => audit.entries.first());

  let embed = new Discord.MessageEmbed()

  .setTitle("☃️ Dragon Moderasyon Log ☃️")

  .setColor("ORANGE")

  .addField(`Yapılan İşlem : **Kullanıcı Grubu Silme**`)

  .addField(`İşlemi Gerçekleştiren : `, `<@${entry.executor.id}>`)

  .addField(`Silinen Grup : `, `\`${role.name}\` **=** \`${role.id}\``)

  .setFooter('DragonNetwork 💜  2020 © 2024');

  client.channels.cache.get(modlog).send(embed);
});

client.on("guildBanAdd", async (guild, user) => {
  let modlog = await data.fetch(`log_${guild.id}`);

  if (!modlog) return;

  const entry = await guild
    .fetchAuditLogs({ type: "MEMBER_BAN_ADD" })
    .then(audit => audit.entries.first());

  let embed = new Discord.MessageEmbed()

    .setTitle("☃️ Dragon Moderasyon Log ☃️")

	.setColor("RED")
	
	.addField(`Yapılan İşlem : **Kullanıcı Yasaklama**`)

	.addField(`Yasaklanan Kullanıcı : `, `**${user.tag}** - **${user.id}**`)
	
	.addField(`Yasaklayan Yetkili : `, `<@${entry.executor.id}>`)

	.addField(`Yasaklama Sebebi : `, `${entry.reason}`)

	.setFooter('DragonNetwok 💜  2020 © 2024');

  client.channels.cache.get(modlog).send(embed);
});

client.on("guildBanRemove", async (guild, user) => {
  let modlog = await data.fetch(`log_${guild.id}`);

  if (!modlog) return;

  const entry = await guild
    .fetchAuditLogs({ type: "MEMBER_BAN_REMOVE" })
    .then(audit => audit.entries.first());

  let embed = new Discord.MessageEmbed()

    .setAuthor(entry.executor.username, entry.executor.avatarURL())

    .setTitle("☃️ Dragon Moderasyon Log ☃️")

	.setColor("RED")
	
	.addField(`Yapılan İşlem : **Yasak Kaldırma**`)

	.addField(`Yasağı Kaldırılan Kullanıcı : `, `**${user.tag}** - **${user.id}**`)
	
	.addField(`Kaldıran Yetkili : `, `<@${entry.executor.id}>`)

	.addField(`Kaldırma Sebebi : `, `${entry.reason}`)

	.setFooter('DragonNetwork 💜  2020 © 2024');

  client.channels.cache.get(modlog).send(embed);
});

 
 
 
  
 // - - - - - - Burayı Ellemeyin - - - - - - //
  

  var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;

client.on('warn', e => {
  console.log(chalk.bgORANGE(e.replace(regToken, 'that was redacted')));
});

client.on('error', e => {
  console.log(chalk.bgRed(e.replace(regToken, 'that was redacted')));
});

client.login(ayarlar.token);
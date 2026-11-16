# 🌬️ Stribog Discord Bot

<div align="center">

![Discord.js](https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-Database-003B57?style=for-the-badge&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Moderasyon, sunucuya özel ekonomi, seviye sistemi, çekilişler ve ticket sistemi.** Token değişkeni `TOKEN` (`DISCORD_TOKEN` değil). Hava durumu Open-Meteo kullanır, API anahtarı gerekmez. Güvenlik için [SECURITY.md](./SECURITY.md) dosyasına bakın.

<p align="center">
  <strong>Bu README'yi kendi dilinizde okuyun</strong><br/>
  <a href="./README.md">English</a> ·
  <a href="./README.tr.md">Türkçe</a>
</p>

</div>

> Bu sayfa İngilizce [README](./README.md) dosyasının Türkçe hızlı başlangıcıdır. Komutların,
> ortam değişkenlerinin ve yapılandırmanın tam referansı için her zaman İngilizce sürüm geçerlidir.

---

## ✨ Özellikler

- **Moderasyon:** ban, kick, timeout, uyarı geçmişi, toplu silme, slowmode, kanal kilidi, softban, nuke ve rol yönetimi.
- **Ekonomi:** sunucuya özel bakiye ve banka, günlük ödül, çalışma, güvenli `/give`, market ve sıralama.
- **Seviye:** mesaj başına XP, `/rank` ve XP sıralaması.
- **Çekiliş ve ticket:** butonla katılım, otomatik çekiliş/reroll; destek rollü ticket panelleri.
- **AutoMod:** anti-link, anti-spam, küfür filtresi, büyük harf ve toplu etiket koruması.
- **Loglama:** mesaj, üye, kanal ve moderasyon olaylarını seçtiğiniz kanallara gönderir.
- **İzin sistemi:** rol bazlı izinler, komutları kanal veya sunucu genelinde kapatma.
- **Yedekleme ve önek:** `/config export` / `/config import`; ekonomi, eğlence, bilgi, seviye, yönetici ve çekiliş komutları `PREFIX` ile de çalışır.

---

## 📦 Gereksinimler

| Gereksinim | Açıklama |
|------------|----------|
| **Node.js** | 22.0.0 veya üzeri (LTS sürümü önerilir) |
| **npm** | Node.js ile birlikte gelir |
| **Discord hesabı** | Bot uygulaması oluşturmak için |
| **Metin düzenleyici** | `.env` dosyasını düzenlemek için |

---

## 🚀 Hızlı Başlangıç

### 1. Botu indirin

```bash
git clone https://github.com/KodYazicam/Stribog-Bot.git
cd Stribog-Bot
```

Git kullanmıyorsanız depo sayfasındaki **Code → Download ZIP** seçeneğini kullanıp arşivi açın.

### 2. Node.js kurun

[nodejs.org](https://nodejs.org/) adresinden LTS sürümünü kurun ve doğrulayın:

```bash
node --version
npm --version
```

### 3. Discord uygulamasını oluşturun

1. [Discord Developer Portal](https://discord.com/developers/applications) üzerinde **New Application** ile uygulama oluşturun.
2. **Bot** sekmesinde token oluşturun; token'ı kimseyle paylaşmayın ve depoya commit etmeyin.
3. **Presence Intent**, **Server Members Intent** ve **Message Content Intent** seçeneklerini açın.
4. **OAuth2 → General** bölümünden **Client ID** değerini kopyalayın.
5. **OAuth2 → URL Generator** bölümünde `bot` ve `applications.commands` kapsamlarını seçin. **Administrator vermeyin**; bunun yerine şu izinleri işaretleyin:

   `Manage Channels`, `Manage Roles`, `Kick Members`, `Ban Members`, `Manage Messages`, `Send Messages`, `Embed Links`, `Attach Files`, `Read Message History`, `Add Reactions`, `Use External Emojis`

6. Oluşan davet bağlantısıyla botu sunucunuza ekleyin.

### 4. `.env` dosyasını oluşturun

`.env.example` dosyasını `.env` olarak kopyalayıp doldurun:

```env
TOKEN=bot_tokeniniz
CLIENT_ID=client_id_degeriniz
GUILD_ID=test_sunucu_idniz
OWNER_ID=discord_kullanici_idniz
PREFIX=!
```

| Değişken | Varsayılan | Zorunlu | Açıklama |
|---|---|---|---|
| `TOKEN` | — | evet | Discord Developer Portal'dan alınan bot token'ı. |
| `CLIENT_ID` | — | evet | Uygulamanın Client ID değeri; komutları kaydetmek için kullanılır. |
| `GUILD_ID` | — | hayır | Ayarlanırsa komutlar yalnızca bu sunucuya kaydedilir ve hemen görünür. |
| `OWNER_ID` | — | hayır | Bot sahibinin Discord kullanıcı kimliği. |
| `PREFIX` | `!` | hayır | Önekli komutlar için önek. En fazla 5 karakter; harf, rakam veya `/ @ # < >` ile başlayamaz. |

Sunucu kimliği için Discord'da **Kullanıcı Ayarları → Gelişmiş → Geliştirici Modu** seçeneğini açıp sunucuya sağ tıklayın ve **Sunucu ID'sini Kopyala** deyin.

### 5. Bağımlılıkları kurun

`package-lock.json` ile birebir uyumlu kurulum için depo kökünde:

```bash
npm ci
```

### 6. Slash komutlarını kaydedin

```bash
npm run deploy
```

`GUILD_ID` tanımlıysa komutlar o sunucuya kaydedilir. Tanımlı değilse global komutlar kaydedilir ve Discord önbelleği nedeniyle görünmesi birkaç dakika sürebilir. Komutları değiştirdikçe bu adımı tekrarlayın.

### 7. Botu başlatın

```bash
npm start
```

Konsolda `Logged in as ...` ve `Ready! Serving ... guilds` satırlarını görürseniz bot çevrimiçidir.

---

## 📜 Komutlar

Slash komutları her zaman kullanılabilir. `PREFIX` (varsayılan `!`) ile ekonomi, eğlence, bilgi, seviye, yönetici ve çekiliş grupları da çalışır; iki biçim aynı handler, izin ve bekleme süresini kullanır. Moderasyon, ticket ve yardımcı komutlar şimdilik yalnızca slash komutudur.

| Grup | Örnek | Gerekli izin |
|------|-------|--------------|
| Yönetici | `/automod antilink enabled:true` | Administrator |
| Moderasyon | `/ban target:@user reason:Spam days:0` | Ban Members |
| Ekonomi | `/balance user:@user` · `!balance @user` | Everyone |
| Seviye | `/rank user:@user` | Everyone |
| Çekiliş | `/giveaway start prize:Nitro duration:1h winners:1` | Manage Guild |
| Ticket | `/ticket setup category:#Tickets log_channel:#ticket-logs support_role:@Staff` | Manage Channels |
| Eğlence | `/8ball question:Will I win?` | Everyone |
| Yardımcı | `/reminder set time:30m message:Meeting` | Everyone |

Komut, alt komut ve seçenek adları Discord'da göründüğü gibi İngilizce kalır. Tüm komutlar, izinleri ve örnekleri için İngilizce [komut referansına](./README.md#-commands) bakın; kayıtlı komutları `npm run commands:list`, doküman uyumunu `npm run docs:check` ile denetleyin.

---

## 💰 Ekonomi ve seviye varsayılanları

Ekonomi **sunucuya özeldir**; her sunucunun bakiyesi ayrı tutulur. `/give` tek bir SQLite işlemi içinde çalışır, bu yüzden bakiye iki kez harcanamaz.

| Ayar | Varsayılan |
|------|------------|
| Günlük ödül | 100 coin |
| Çalışma kazancı | 50–200 coin |
| Çalışma bekleme süresi | 30 dakika |
| Günlük ödül bekleme süresi | 24 saat |
| Mesaj başına XP | 10–20 |
| XP bekleme süresi | 60 saniye |
| Seviye eğrisi | `100 × 1.5^(seviye - 1)` XP |

Değerler `src/config/config.js` içindeki `economy` ve `leveling` bölümlerinden değiştirilir; ardından botu yeniden başlatın.

---

## 🔐 İzinler ve intent'ler

- Üç ayrıcalıklı intent zorunludur: **Presence**, **Server Members** ve **Message Content**. Eksikse bot açılmaz veya mesajlara yanıt vermez.
- Botu **Administrator** izniyle davet etmeyin; yukarıdaki izin listesi normal kullanım için yeterlidir.
- Moderasyon komutları rol hiyerarşisini ve kendine/bota karşı işlem kurallarını uygular; botun rolü yöneteceği rolün üzerinde olmalıdır.
- `/ticket setup` komutunda `support_role` tanımlayın; aksi halde Administrator izni olmayan ekip üyeleri kanalı göremez.
- `/invite` komutu Administrator izni istemez.

---

## 💾 Veritabanı ve yedekleme

Bot, SQLite veritabanını `data/bot.db` dosyasında tutar (WAL modu açıktır). Yedek için botu durdurun ve `data/bot.db` dosyasını kopyalayın; `bot.db-wal` ve `bot.db-shm` dosyaları varsa onları da kopyalayın.

Yalnızca sunucu ayarları için `/config export` kullanın. `/config import` önce doğrulama ve deneme çalıştırması yapar; `confirm:true` eklenmeden değişiklik uygulamaz ve yalnızca aynı sunucudaki kimliklerle çalışır.

---

## 🔧 Sorun giderme

| Belirti | Çözüm |
|---------|-------|
| `Cannot find module 'discord.js'` | Depo kökünde `npm ci` çalıştırın. |
| `An invalid token was provided` | Developer Portal'dan token'ı yenileyin ve `.env` içindeki `TOKEN` değerini güncelleyin. |
| `Used disallowed intents` | Presence, Server Members ve Message Content intent'lerini açıp kaydedin. |
| `Unknown interaction` veya komutlar görünmüyor | `npm run deploy` çalıştırın, birkaç dakika bekleyin ve Discord'u yeniden başlatın. |
| `SQLITE_CANTOPEN` | Botun klasöründe ve `data/` dizininde yazma izni olduğundan emin olun. |
| Bot çevrimiçi ama yanıt vermiyor | Komutları yeniden kaydedin ve Message Content Intent'in açık olduğunu doğrulayın. |

Hata ayıklarken konsoldaki dosya adı, satır numarası ve yığın izini (stack trace) ilk bakılacak yerlerdir. Daha fazlası için İngilizce [README](./README.md#-troubleshooting) dosyasına bakın.

---

## 🤝 Katkı ve güvenlik

Katkı kuralları için [CONTRIBUTING.md](./CONTRIBUTING.md), güvenlik açığı bildirimi için [SECURITY.md](./SECURITY.md) dosyasına bakın. Bir güvenlik açığını herkese açık issue olarak değil, SECURITY.md içindeki yöntemle bildirin.

## 📝 Lisans

Bu proje MIT lisansı ile lisanslanmıştır. Ayrıntılar için [LICENSE](./LICENSE) dosyasına bakın.

---

<div align="center">

**Made with ❤️ by [KodYazicam](https://github.com/KodYazicam)**

⭐ Bu depo işinize yaradıysa yıldız vermeyi düşünün!

</div>

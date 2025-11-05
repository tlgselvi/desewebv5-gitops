# Docker Hub Login - Adım Adım Kılavuz

## Yöntem 1: Interaktif Login (En Kolay)

### Terminal'de Komut:
```powershell
docker login -u deseh
```

### Ne Olacak:
1. Komutu çalıştırdığınızda şu mesaj görünecek:
   ```
   Password:
   ```

2. Docker Hub şifrenizi yazın
   - ⚠️ **ÖNEMLİ:** Şifre yazarken görünmez (normal, güvenlik için)
   - Sadece yazın ve Enter'a basın

3. Başarılı olursa:
   ```
   Login Succeeded
   ```

4. Hata olursa:
   ```
   Error: incorrect username or password
   ```
   - Şifrenizi kontrol edin
   - Docker Hub'da şifre sıfırlama yapabilirsiniz

---

## Yöntem 2: Token ile Login

Eğer token kullanmak istiyorsanız:

### Adım 1: Token Oluştur
1. https://hub.docker.com/settings/security adresine gidin
2. "New Access Token" butonuna tıklayın
3. Token adı: `desewebv5-deployment`
4. Permissions: `Read, Write, Delete` seçin
5. "Generate" butonuna tıklayın
6. **Token'ı kopyalayın** (bir daha gösterilmez!)

### Adım 2: Token ile Login
```powershell
# Yöntem A: Direkt (güvenli değil, token terminal geçmişinde kalır)
docker login -u deseh -p YOUR_TOKEN_HERE

# Yöntem B: Secure (önerilen)
echo "YOUR_TOKEN_HERE" | docker login -u deseh --password-stdin
```

---

## Yöntem 3: Docker Desktop ile Login

1. Docker Desktop'ı açın
2. Settings (⚙️) → Docker Hub
3. "Sign in" butonuna tıklayın
4. Docker Hub bilgilerinizi girin
5. Terminal'den kontrol edin:
   ```powershell
   docker info | Select-String "Username"
   ```

---

## Login Durumunu Kontrol Etme

```powershell
# Login durumunu kontrol et
docker info | Select-String "Username"

# veya
docker login -u deseh --password-stdin < nul
```

---

## Sorun Giderme

### "unauthorized: incorrect username or password"
- Şifrenizi kontrol edin
- Docker Hub'da şifre sıfırlama yapın: https://hub.docker.com/reset-password
- Token kullanıyorsanız, token'ın geçerli olduğundan emin olun

### "network error" veya bağlantı hatası
- İnternet bağlantınızı kontrol edin
- Docker Hub erişilebilirliğini test edin: `curl https://hub.docker.com`

### Token çalışmıyor
- Token'ın permissions'larını kontrol edin (Read, Write, Delete gerekli)
- Token'ın süresi dolmamış olmalı
- Yeni bir token oluşturmayı deneyin

---

## Login Sonrası

Login başarılı olduktan sonra:

1. **Image push yapabilirsiniz:**
   ```powershell
   docker push docker.io/deseh/dese-ea-plan-v5:6.8.0
   ```

2. **Login bilgileri kaydedilir:**
   - Windows: `C:\Users\<username>\.docker\config.json`
   - Bu dosya otomatik oluşturulur

3. **Bir sonraki sefer otomatik login:**
   - Login bilgileri kaydedildiği için tekrar login yapmanıza gerek yok
   - Sadece `docker push` komutunu çalıştırabilirsiniz

---

## Hızlı Başlangıç (Özet)

```powershell
# 1. Login
docker login -u deseh
# Şifrenizi girin

# 2. Login başarılı mı kontrol et
docker info | Select-String "Username"

# 3. Push yap
docker push docker.io/deseh/dese-ea-plan-v5:6.8.0
```

---

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- Şifrenizi terminal'de görünür şekilde yazmayın
- Token'ları `.env` dosyasına koymayın
- Git'e commit etmeyin
- Login bilgileri `~/.docker/config.json` dosyasında saklanır (güvenli)


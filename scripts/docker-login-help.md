# Docker Hub Login Yardım Kılavuzu

## Şifrenizi Hatırlamıyorsanız

### Seçenek 1: Şifre Sıfırlama (En Kolay)

1. **Docker Hub'a gidin:**
   - https://hub.docker.com
   - "Sign In" butonuna tıklayın

2. **Şifre Sıfırlama:**
   - "Forgot Password?" linkine tıklayın
   - Email adresinizi girin (deseh hesabına kayıtlı email)
   - Email'inize gelen link ile şifrenizi sıfırlayın

3. **Login:**
   ```powershell
   docker login -u deseh
   # Yeni şifrenizi girin
   ```

### Seçenek 2: Personal Access Token (PAT) - Önerilen

PAT kullanmak daha güvenlidir çünkü:
- Şifre yerine token kullanılır
- Token'ları iptal edebilirsiniz
- Daha iyi güvenlik kontrolü

**Adımlar:**

1. **Token Oluştur:**
   - https://hub.docker.com/settings/security adresine gidin
   - "New Access Token" butonuna tıklayın
   - **Token Name:** `desewebv5-deployment-v6.8.0`
   - **Permissions:** `Read, Write, Delete` seçin
   - "Generate" butonuna tıklayın

2. **Token'ı Kopyalayın:**
   - ⚠️ **ÖNEMLİ:** Token sadece bir kez gösterilir!
   - Token'ı güvenli bir yere kaydedin

3. **Login ile Token:**
   ```powershell
   # Token ile login
   $token = "YOUR_TOKEN_HERE"
   echo $token | docker login -u deseh --password-stdin
   
   # Veya interaktif olarak
   docker login -u deseh -p YOUR_TOKEN_HERE
   ```

4. **Güvenlik Notu:**
   - Token'ı `.env` dosyasına koymayın
   - Git'e commit etmeyin
   - Sadece deployment için kullanın

### Seçenek 3: Mevcut Oturumu Kontrol

Docker zaten login olmuş olabilir:

```powershell
# Mevcut login durumunu kontrol et
docker info | Select-String "Username"

# Eğer login varsa, direkt push yapabilirsiniz
docker push docker.io/deseh/dese-ea-plan-v5:6.8.0
```

### Seçenek 4: Docker Desktop Kullanıyorsanız

Docker Desktop ile Docker Hub'a login olmuşsanız:

1. Docker Desktop'ı açın
2. Settings → Docker Hub
3. Login durumunu kontrol edin
4. Eğer login varsa, terminal'den direkt push yapabilirsiniz

## Login Sonrası

Login başarılı olduktan sonra:

```powershell
# Image push
docker push docker.io/deseh/dese-ea-plan-v5:6.8.0

# Deployment
kubectl apply -f k8s/
```

## Sorun Giderme

### "unauthorized: authentication required" hatası
- Docker Hub'a login olun: `docker login -u deseh`
- Token kullanıyorsanız, token'ın geçerli olduğundan emin olun

### "denied: requested access to the resource is denied" hatası
- Repository adını kontrol edin: `docker.io/deseh/dese-ea-plan-v5:6.8.0`
- `deseh` kullanıcı adının doğru olduğundan emin olun

### "network error" hatası
- İnternet bağlantınızı kontrol edin
- Docker Hub erişilebilirliğini test edin: `curl https://hub.docker.com`


# Docker Hub Repository Kurulum Kılavuzu

## Adım 1: Repository Oluşturma

1. **Docker Hub'a gidin:**
   - https://hub.docker.com/repository/create

2. **Repository ayarları:**
   - **Namespace:** `deseh`
   - **Repository Name:** `dese-ea-plan-v5`
   - **Visibility:** 
     - `Public` (herkes görebilir) - Önerilen test için
     - `Private` (sadece siz görebilirsiniz) - Production için

3. **"Create" butonuna tıklayın**

## Adım 2: Token Kontrolü

1. **Security Settings:**
   - https://hub.docker.com/settings/security

2. **Token'ı kontrol edin:**
   - Token adı: `desewebv5-deployment-v6.8.0`
   - Permissions: `Read, Write, Delete` olmalı

3. **Eğer token yoksa veya yetersizse:**
   - "New Access Token" butonuna tıklayın
   - Permissions: `Read, Write, Delete` seçin
   - Token'ı kopyalayın

## Adım 3: Login

### Token ile Login (Önerilen):
```powershell
docker login -u deseh -p YOUR_TOKEN_HERE
```

### veya Secure Method:
```powershell
echo "YOUR_TOKEN_HERE" | docker login -u deseh --password-stdin
```

### Normal Şifre ile Login:
```powershell
docker login -u deseh
# Şifrenizi girin
```

## Adım 4: Image Push

Repository oluşturduktan ve login olduktan sonra:

```powershell
docker push docker.io/deseh/dese-ea-plan-v5:6.8.0
```

## Sorun Giderme

### "unauthorized: incorrect username or password"
- Token'ı tekrar kontrol edin
- Token'ın permissions'larını kontrol edin
- Repository'nin oluşturulduğundan emin olun

### "push access denied, repository does not exist"
- Repository'yi Docker Hub'da oluşturun
- Repository adının doğru olduğundan emin olun: `dese-ea-plan-v5`

### "insufficient_scope: authorization failed"
- Token'ın `Write` permission'ı olduğundan emin olun
- Yeni bir token oluşturun ve tekrar deneyin

## Hızlı Kontrol

```powershell
# Login durumunu kontrol et
docker info | Select-String "Username"

# Image'ı kontrol et
docker images | Select-String "dese-ea-plan-v5"

# Push'u test et
docker push docker.io/deseh/dese-ea-plan-v5:6.8.0
```


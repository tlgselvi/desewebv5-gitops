# PowerShell'de Heredoc/Here-String Kullanımı

PowerShell'de Unix/Bash tarzı `<<` heredoc syntax'ı çalışmaz. Bunun yerine PowerShell'in **Here-String** özelliğini kullanmalısınız.

## ❌ Hatalı (Unix/Bash Syntax)
```powershell
python - <<'PY'
print('test')
PY
```

## ✅ Doğru Yöntemler

### Yöntem 1: Here-String Değişken ile (Önerilen)

```powershell
$script = @'
print('test')
'@
python -c $script
```

### Yöntem 2: Pipeline ile

```powershell
@'
print('test')
'@ | python -
```

### Yöntem 3: Çok Satırlı Komut

```powershell
$script = @"
print('test')
print('hello')
"@
python -c $script
```

**Not:** 
- `@'...'@` - Literal string (variable expansion yok)
- `@"..."@` - Expandable string (variable expansion var)

### Yöntem 4: Python Script Dosyası Kullan (En Güvenli)

```powershell
# script.py dosyası oluştur
@'
print('test')
'@ | Out-File -FilePath script.py -Encoding utf8

# Çalıştır
python script.py

# Temizle
Remove-Item script.py
```

### Yöntem 5: Geçici Dosya ile

```powershell
$tempFile = New-TemporaryFile
@'
print('test')
'@ | Out-File -FilePath $tempFile.FullName -Encoding utf8
python $tempFile.FullName
Remove-Item $tempFile.FullName
```

## Örnek: GitHub Actions Workflow Düzenleme

```powershell
# Python script ile workflow dosyasını düzenle
$pythonScript = @'
from pathlib import Path
path = Path('.github/workflows/deploy.yml')
text = path.read_text(encoding='utf-8')
# ... işlemler ...
path.write_text(text, encoding='utf-8')
print('Done!')
'@

python -c $pythonScript
```

## PowerShell Here-String Kuralları

1. **Here-String başlangıcı** satırın başında olmalı (indent yok)
2. **Kapanış marker'ı** (`'@` veya `"@`) satırın başında olmalı
3. **Aynı satırda** başka karakter olmamalı

### ✅ Doğru
```powershell
$text = @'
Hello
World
'@
```

### ❌ Hatalı
```powershell
$text = @'Hello  # <- Burada başka karakter var
World
'@
```

## Alternatif: Python Script Dosyası Kullan

Eğer heredoc karmaşık geliyorsa, Python script dosyası oluşturun:

```powershell
# create-script.ps1
python -c @'
from pathlib import Path
# ... kod ...
'@
```

Veya doğrudan script dosyası:

```powershell
# fix-workflow.py
from pathlib import Path
# ... kod ...

# Çalıştır
python fix-workflow.py
```

---

**Özet:** PowerShell'de `<<` syntax'ı yok. `@'...'@` veya `@"..."@` kullanın, ya da script dosyası oluşturun.


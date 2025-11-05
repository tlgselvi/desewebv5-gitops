# DESE JARVIS Context Load Prompt

## Yeni Sohbette Kullanım

Yeni bir Cursor sohbeti başlattığınızda, proje context'ini yüklemek için şu seçeneklerden birini kullanabilirsiniz:

### Seçenek 1: Direkt Başlayın (Önerilen)
```
Sadece projeyi açın, Cursor otomatik olarak context'i yükler.
Direkt işinize başlayabilirsiniz!
```

### Seçenek 2: Context Dosyasını Referans Edin
```
@.cursor/context.json
```
veya
```
@.cursor/jarvis-config.json
```

### Seçenek 3: Memory Dosyalarını Referans Edin
```
@.cursor/memory/backend.json
@.cursor/memory/finbot.json
@.cursor/memory/frontend.json
@.cursor/memory/mubot.json
```

### Seçenek 4: Doğal Dil Komutu (AI anlayacaktır)
```
Load DESE JARVIS context
```
veya
```
DESE JARVIS context yükle
```
veya
```
Proje context'ini yükle
```

## Mevcut Context Dosyaları

- ✅ `.cursor/context.json` - Ana context dosyası
- ✅ `.cursor/jarvis-config.json` - DESE JARVIS yapılandırması
- ✅ `.cursor/memory/backend.json` - Backend memory
- ✅ `.cursor/memory/finbot.json` - FinBot memory
- ✅ `.cursor/memory/frontend.json` - Frontend memory
- ✅ `.cursor/memory/mubot.json` - MuBot memory
- ✅ `.cursor/rules/` - 11 kural dosyası
- ✅ `.cursor/upgrade-protocol-v1.2.yaml` - Protocol v1.2

## Önerilen Yaklaşım

**En pratik yöntem:** Yeni sohbette direkt işinize başlayın. Cursor AI otomatik olarak `.cursor/` klasöründeki tüm dosyaları okur ve context'i yükler.

Eğer spesifik bir dosyaya referans vermek isterseniz, `@dosya-adı` formatını kullanın.

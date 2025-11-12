# Python Servisleri Çalıştırma Rehberi

FinBot ve MuBot servisleri; Prophet, Pandas, TensorFlow gibi ML odaklı paketler
gerektirdiği için global Python kurulumunda farklı projelerle çakışabilecek
bağımlılıklar (örn. `tensorflow`, `onnx`, `ml-dtypes`, `protobuf`) oluşabilir.
Bu rehber, her servis için izole bir sanal ortam (virtualenv) oluşturarak
bağımlılık yönetimini güvenli hâle getirmeyi amaçlar.

## 1. Temel Gereksinimler

- Python 3.11.x
- `pip` ve `venv` modülleri
- Git ile proje köküne klonlanmış depo (`deploy/finbot-v2`, `deploy/mubot-v2` dizinleri)

## 2. FinBot Sanal Ortamı

```bash
cd deploy/finbot-v2
python -m venv .venv
source .venv/bin/activate      # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Testleri / uygulamayı çalıştır
uvicorn finbot-forecast:app --host 0.0.0.0 --port 8000

# İşiniz bittiğinde sanal ortamı kapatın
deactivate
```

## 3. MuBot Sanal Ortamı

```bash
cd deploy/mubot-v2
python -m venv .venv
source .venv/bin/activate      # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt

# Servisi çalıştır
uvicorn mubot-ingestion:app --host 0.0.0.0 --port 8000

deactivate
```

## 4. Bağımlılık Çakışmalarını Önleme

- Sanal ortamlar içinde **yalnızca servislerin ihtiyaç duyduğu paketleri** kurun.
- Proje kökünde `pip list --outdated` komutuyla global paketleri güncellemeden
önce, platformun gereksinimlerini kontrol edin. TensorFlow / ONNX gibi paketler
aynı anda farklı sürümler talep edebilir.
- CI/CD pipeline’larında da aynı dizin yapısını kullanarak container build
adımlarında `python -m venv` üzerinden izole ortam kurabilirsiniz.

## 5. Bağımlılık Güncelleme Süreci

1. Sanal ortamı aktive edin.
2. Gerekli paketleri `pip install --upgrade` ile yükseltin.
3. `pip freeze > requirements.txt` (veya `requirements.lock`) komutu ile yeni
   sürümleri kaydedin.
4. Birim testleri (`pytest`, `uvicorn --reload`) çalıştırarak fonksiyonel
   doğrulamayı yapın.
5. Pull Request içerisinde yeni `requirements.txt` dosyasını paylaşın.

Bu adımlar FinBot ve MuBot servislerinin global Python kurulumundan bağımsız
şekilde yönetilmesine olanak tanır. Eğer container tabanlı dağıtım kullanıyorsanız,
Dockerfile içinde de benzer şekilde virtualenv kurulumu yapabilir (ya da
multi-stage imajda sadece gerekli wheel dosyalarını kopyalayabilirsiniz).


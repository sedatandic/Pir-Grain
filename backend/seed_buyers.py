"""Seed buyer counterparties into the database."""
import os
from datetime import datetime
from pymongo import MongoClient

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "pir_grain_pulses")

client = MongoClient(MONGO_URL)
db = client[DB_NAME]
partners_col = db["partners"]

BUYERS = [
    {"companyName": "Abalıoğlu Yem San. A.Ş.", "companyCode": "Abalıoğlu Yem", "address": "10006/1 Sokak No:19 A.O.S.B. Çiğli", "city": "İzmir", "country": "Türkiye"},
    {"companyName": "ADM Turkey Tarım Ticaret A.Ş.", "companyCode": "ADM Turkey", "address": "Reşitpaşa Mah. Eski Büyükdere Cad. Park Plaza Blok No:14 İç Kapı No:17 Sarıyer", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Agora Yem ve Tarım Gıda Tur. İnş. ve Tic. Ltd. Şti.", "companyCode": "Agora Yem", "address": "Yalı Mahallesi 6523 Sokak No:32/B Kat:3 Daire:312 Park Yaşam Ticaret Merkezi Karşıyaka", "city": "İzmir", "country": "Türkiye"},
    {"companyName": "Agro Maps Dış Tic. Ltd. Şti.", "companyCode": "Agro Maps", "address": "Paşabayır Mah. Mehmetçik Cad. No:20/4 My Sweet Home Apt. Bandırma", "city": "Balıkesir", "country": "Türkiye"},
    {"companyName": "Agromda Gıda Tar. Nak. Pet. İnş. San. ve Tic. Ltd. Şti.", "companyCode": "Agromda Gıda", "address": "Ofis OSB Mah. OSB 48 Sok. No:7, Artuklu", "city": "Mardin", "country": "Türkiye"},
    {"companyName": "Agron Tarım Ürünleri Tic. A.Ş.", "companyCode": "Agron Tarım", "address": "Akat Mah. Yıldırım Oğuz Göker Sok. Park Maya Sitesi Carlton 17 No:1 İç Kapı No:10", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "AK Nişasta San. ve Tic. A.Ş.", "companyCode": "AK Nişasta", "address": "Gündoğdu Mahallesi Evrensekiz Caddesi No:17 Evrensekiz Beldesi, Lüleburgaz", "city": "Kırklareli", "country": "Türkiye"},
    {"companyName": "Allegro Tarımsal Faaliyetler San. ve Tic. AŞ", "companyCode": "Allegro Tarımsal", "address": "Limonluk Mah. 2415 Sk. No:1 Semt Yenikoy Faz-D B Blok Kat:11 No:55 Yenişehir", "city": "Mersin", "country": "Türkiye"},
    {"companyName": "Arasa Gıda Par. Yat. ve İşl. San. ve Tic. A.Ş.", "companyCode": "Arasa Gıda", "address": "Çömlekçi SB Mah. Rıhtım Sok. No:4, Ortahisar Blok No:4 İç Kapı No:Z1", "city": "Trabzon", "country": "Türkiye"},
    {"companyName": "Arietis LTD", "companyCode": "Arietis LTD", "address": "3 Nikola Vaprsarov Std, Floor:4 Office:6 9000", "city": "Varna", "country": "Bulgaria"},
    {"companyName": "Arion Tarım Tic. Ltd. Şti.", "companyCode": "Arion Tarım", "address": "Acıbadem Mah. Çeçen Sok. No:25 Akasya A2 Blok Kat:41 No:259B 34660, Üsküdar", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Armada Gıda Tic. San. A.Ş.", "companyCode": "Armada Gıda", "address": "Toroslar Mah. Atatürk 12 Bulv. No:17, Akdeniz", "city": "Mersin", "country": "Türkiye"},
    {"companyName": "Arman Emea Gıda Tarım Dış Tic. San. ve Tic. A.Ş.", "companyCode": "Arman Emea", "address": "Yeni Mah. İncirlik Blv. No:313/B-1 Sarıçam", "city": "Adana", "country": "Türkiye"},
    {"companyName": "Aves Enerji Yağ ve Gıda San. A.Ş.", "companyCode": "Aves Enerji", "address": "Toroslar Mahallesi Gizem Sokak No:19 Akdeniz", "city": "Mersin", "country": "Türkiye"},
    {"companyName": "Ayazlar Tohumculuk Tarım Ürünleri İç ve Dış Tic. San. Ltd. Şti.", "companyCode": "Ayazlar Tohumculuk", "address": "Cami Atik Mahallesi, Fethiye Özver Caddesi No:31/C 59310, Malkara", "city": "Tekirdağ", "country": "Türkiye"},
    {"companyName": "Azul Tarım Gıda ve Yem İth. İhr. San. Tic. Ltd. Şti.", "companyCode": "Azul Tarım", "address": "Altınşehir Mahallesi Uğur Mumcu Bulvarı Taşyakan No:76E İç Kapı No:2, Nilüfer", "city": "Bursa", "country": "Türkiye"},
    {"companyName": "Baha Tarımsal Faaliyetler San. Tic. A.Ş.", "companyCode": "Baha Tarımsal", "address": "Akçapınar Mah. Akçapınar 23 Sok. No:13, Bandırma", "city": "Balıkesir", "country": "Türkiye"},
    {"companyName": "Ballıpınar Tarım Ticaret A.Ş.", "companyCode": "Ballıpınar Tarım", "address": "Dörtyol Mahallesi Kütahya Yolu Bulvarı No:160 Merkez", "city": "Afyonkarahisar", "country": "Türkiye"},
    {"companyName": "Bancotti Global Danışmanlık ve Tic. Ltd. Şti.", "companyCode": "Bancotti Global", "address": "Küçükbakkalköy Mahallesi, Selvili Sokak No:4/20, Ataşehir", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Bek Tarım Ltd. Şti.", "companyCode": "Bek Tarım", "address": "Akkent Mah. 1. Gimat Sok. No:111", "city": "Çorum", "country": "Türkiye"},
    {"companyName": "Birlik Çeltik Yağ Gıda Akaryakıt İnş. San. ve Ltd. Şti.", "companyCode": "Birlik Gıda", "address": "Kavacık Köyü Küme Evleri No:412/1 İç Kapı No:1 Kavacık, Uzunköprü", "city": "Edirne", "country": "Türkiye"},
    {"companyName": "Blue Danube DMCC", "companyCode": "Blue Danube", "address": "Unit 4541, DMCC Business Centre Level 1, Jewellery & Gemplex 3", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "BT Agro San. ve Tic. A.Ş.", "companyCode": "BT Agro", "address": "Kebazlı Mah. Kabazlı Sok. F Blok No:849/1, Salihli", "city": "Manisa", "country": "Türkiye"},
    {"companyName": "Candarlar Tarım Ürün. Mad. Nak. İç ve Dış Tic. Ltd. Şti.", "companyCode": "Candarlar Tarım", "address": "Camiatik Mah. Zahireciler Sok. Ticaret Borsası Tesisleri No:29/C, Malkara", "city": "Tekirdağ", "country": "Türkiye"},
    {"companyName": "Casillo SPA Societa Benefit", "companyCode": "Casillo SPA", "address": "Via Sant'elia - Zona Industriale 70033 Corato, BA", "city": "Corato", "country": "Italy"},
    {"companyName": "Cosecha Yem ve Tarım Ürünleri Tic. A.Ş.", "companyCode": "Cosecha Yem", "address": "Onur Mah. Turhan Cemal Beriker Bulv. Kiza İş Merkezi A3 Blok No:437/2 İç Kapı No:312 Seyhan", "city": "Adana", "country": "Türkiye"},
    {"companyName": "Çamlı Yem Besicilik San. ve Tic. A.Ş.", "companyCode": "Çamlı Yem", "address": "Turgutlu 1. Organize Sanayi Bölgesi Selvilitepe Mahallesi 1453. Caddesi No:7 45400, Turgutlu", "city": "Manisa", "country": "Türkiye"},
    {"companyName": "Danem Gıda San. ve Tic. A.Ş.", "companyCode": "Danem Gıda", "address": "Altunizade Mah. Mahir İz Cad. No:41/2 Üsküdar", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Demir Hububat Nakliye Metal İnş. Tur. Petrol. Ürün. Dış Tic. San. Ltd. Şti.", "companyCode": "Demir Hububat", "address": "Tahtakale Mah. Mahmur Çiçeği Sk. 4/59", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "DMC Agro Hububat Bakliyat Ltd. Şti.", "companyCode": "DMC Agro", "address": "Karacailyas Emek Mah. Atatürk 12 Blv. Özpet No:10A Akdeniz", "city": "Mersin", "country": "Türkiye"},
    {"companyName": "Doruk Un Sanayi A.Ş.", "companyCode": "Doruk Un", "address": "İstiklal Mah. Dumansız 4. Sok. No:13/3 59100 Süleymanpaşa", "city": "Tekirdağ", "country": "Türkiye"},
    {"companyName": "Duyan Gap Yem Gıda Tarım İnş. Nak. San. Tic. A.Ş.", "companyCode": "Duyan Gap", "address": "Yukarıazıklı OSB Mah. 39. Sok. No:12 Kızıltepe", "city": "Mardin", "country": "Türkiye"},
    {"companyName": "Efor Gübre Madencilik San. Tic. A.Ş.", "companyCode": "Efor Gübre", "address": "İçerenköy Mahallesi Destan Sokak Efor Plaza No:6 D:15 Ataşehir", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Eksun Gıda Tarım Sanayi ve Tic. A.Ş.", "companyCode": "Eksun Gıda", "address": "Fahrettin Kerem Gökay Caddesi No:36 Altunizade, Üsküdar", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Elin Agro Tarım Ürünleri Ltd. Şti.", "companyCode": "Elin Agro", "address": "Haydar Çavuş Mahallesi Haydar Çavuş Sokak No:4 Kapı No:4, Bandırma", "city": "Balıkesir", "country": "Türkiye"},
    {"companyName": "Er Makina Elk. Elktr. Gıda Teks. İns. Tar. Ürn. Hayv. Yem Nak. İth. İhr. San. Tic. ve Paz. Ltd. Şti.", "companyCode": "Er Makina", "address": "Resetbey Mah. Turkkusu Cad. Gunep Panoroma Sitesi, B Blok Kat:9 Daire:904, Seyhan", "city": "Adana", "country": "Türkiye"},
    {"companyName": "Er Yem Gıda Tarım Ürünleri San ve Tic. A.Ş.", "companyCode": "Er Yem", "address": "Emmioğlu Mahallesi Fakülte Caddesi No:23/1 35750, Ödemiş", "city": "İzmir", "country": "Türkiye"},
    {"companyName": "Erişler Yem Sanayi ve Ticaret A.Ş.", "companyCode": "Eriş Yem", "address": "Merkez Mahallesi Kadıköy Bağları Caddesi No:7/20 Ortaköy Silivri", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Erser Grup Tarım Ürünleri San ve Tic. A.Ş.", "companyCode": "Erser Grup", "address": "Fevzi Çakmak Mahallesi 10521 Sokak No:80 42050, Karatay", "city": "Konya", "country": "Türkiye"},
    {"companyName": "Ertan Yem ve Gıda San. Tic. A.Ş.", "companyCode": "Ertan Yem", "address": "Atatürk Mahallesi Eski Manisa Yolu Caddesi Ertan Yem Apartmanı No:272, Turgutlu", "city": "Manisa", "country": "Türkiye"},
    {"companyName": "GFT Agro Nak. San. Tic. Ltd. Şti.", "companyCode": "GFT Agro", "address": "Kalenderhane Mah. Kahraman Cad. Enntepe Ofis A Blok No:1/601", "city": "Konya", "country": "Türkiye"},
    {"companyName": "Global Grain Ltd.", "companyCode": "Global Grain", "address": "P.O. Box: 3174 Road Town", "city": "Tortola", "country": "British Virgin Islands"},
    {"companyName": "Grains Gate DMCC", "companyCode": "Grains Gate", "address": "Unit No:BA94 DMCC Business Centre Level No:1 Jewellery & Gemplex 3", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Hansın Gıda Ambalaj Mak. Enr. İmalat İhr. San. ve Tic. A.Ş.", "companyCode": "Hansın Gıda", "address": "Hüseyin Okan Merzeci Mahallesi 97017 Sokak Modaları Apt. No:4 İç Kapı No:8 Toroslar", "city": "Mersin", "country": "Türkiye"},
    {"companyName": "Hastavuk Gıda Tarım Hayvancılık San. ve Tic. A.Ş.", "companyCode": "Hastavuk", "address": "Balkan Mahallesi Hasanağa Caddesi No:8/1, Nilüfer", "city": "Bursa", "country": "Türkiye"},
    {"companyName": "Hitit AG", "companyCode": "Hitit AG", "address": "Turmstrasse 28, 6312", "city": "Steinhausen", "country": "Switzerland"},
    {"companyName": "İlke Madencilik Tarım Ürün. Hay. San. ve Tic. Ltd. Şti.", "companyCode": "İlke Madencilik", "address": "İstiklal Mah. Yeni Ticaret Borsası Simge Sok. No:4 Polatlı", "city": "Ankara", "country": "Türkiye"},
    {"companyName": "İmisk İth. İhr. Tic. ve Nak. A.Ş.", "companyCode": "İmisk A.Ş.", "address": "Rüzgarlıbahçe Mah. Ardıç Sok. Acarlar İş Merkezi, F Blok, Kat:7/17 Kavacık, Beykoz", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "İpek Agro Gıda San. ve Tic. A.Ş.", "companyCode": "İpek Agro", "address": "Aydınlar Mahallesi 03044 Nolu Cadde No:15 27580, Şehitkamil", "city": "Gaziantep", "country": "Türkiye"},
    {"companyName": "Keskinoğlu Tavukçuluk ve Damızlık İşletmeleri San. Tic. A.Ş.", "companyCode": "Keskinoğlu", "address": "Panayır Yanı 602 Sokak İş Merkezi Sitesi Matlı Plaza No:14 İç Kapı No:5 Osmangazi", "city": "Bursa", "country": "Türkiye"},
    {"companyName": "Klas Gıda Dış Ticaret ve Pazarlama Ltd. Şti.", "companyCode": "Klas Gıda", "address": "Yeşilköy Mah. Atatürk Cad. İstanbul Dünya Ticaret Merkezi A2 Blok. Kat:14 Daire:42, Bakırköy", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Kozlu Gıda İmalat San. Tic. ve Taş. A.Ş.", "companyCode": "Kozlu Gıda", "address": "Macun Mah. 204. Cadde A Blok Apartmanı No:141 A/17", "city": "Ankara", "country": "Türkiye"},
    {"companyName": "Lermioğlu Un Gıda San. ve Tic. Ltd. Şti.", "companyCode": "Lermioğlu Un", "address": "Karamusul Köyü Çiftlikköy Yol Sapağı Karşısı Mercimektepe Mevkii, Lüleburgaz", "city": "Kırklareli", "country": "Türkiye"},
    {"companyName": "Mangimi Leone S.P.A.", "companyCode": "Mangimi Leone", "address": "Via Penninazzo, 56 95025 Aci S.Antonio, CT", "city": "Aci S.Antonio", "country": "Italy"},
    {"companyName": "Mediterra Agro Tarım Ticaret A.Ş.", "companyCode": "Mediterra Agro", "address": "Maltepe Mahallesi, Eski Çırpıcı Yolu Sokak No:8 Parima Plaza Kat:12, Ofis:147, 34010, Zeytinburnu", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Mnasek for Import & Export Trading DMCC", "companyCode": "Mnasek for Imp. & Exp.", "address": "Unit No:30-01-3412, Jewellery & Gemplex 3 Plot No: DMCC-PH2-J&Gplexs P.O.Box:340505 Dubai Multi Commodities Center", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Mono Global Tarım Taş. İnş. Tic. ve San. Ltd. Şti.", "companyCode": "Mono Global", "address": "Haydar Çavuş Mah. Haydar Çavuş Sok. No:4 İç Kapı No:7 Bandırma", "city": "Balıkesir", "country": "Türkiye"},
    {"companyName": "Mutlu Makarnacılık San. ve Tic. A.Ş.", "companyCode": "Mutlu Makarna", "address": "2. OSB. Vali Muammer Güler Bulvarı No:44, Şehitkamil", "city": "Gaziantep", "country": "Türkiye"},
    {"companyName": "Neva Un Tarım Gıda Denizcilik San. ve Tic. Ltd. Şti.", "companyCode": "Neva Un", "address": "Alsancak Mah. Kıbrıs Şehitleri Cad. Hümeyra Çiftçi İş Hanı 148 303 Kordon", "city": "İzmir", "country": "Türkiye"},
    {"companyName": "Ninova Agro Gıda Paz. Tic. İth. İhr. A.Ş.", "companyCode": "Ninova Agro", "address": "Tatlısu Mahallesi Pakdil Sokak No:5 İç Kapı No:5, Ümraniye", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Oba Makarnacılık San. ve Tic. A.Ş.", "companyCode": "Oba Makarnacılık", "address": "4. Organize Sanayi Bölgesi 83422 Nolu Cadde No:1 27600, Başpınar", "city": "Gaziantep", "country": "Türkiye"},
    {"companyName": "Odrin Tarım Ürünleri San. ve Tic. A.Ş.", "companyCode": "Odrin Tarım", "address": "Osmanlı Köyü Tilkidere Mevkii Havsa", "city": "Edirne", "country": "Türkiye"},
    {"companyName": "Ofis Yem Gıda San. Tic. A.Ş.", "companyCode": "Ofis Yem", "address": "Sünlü Mah. Yayla 2 Sok. No:1/B Çubuk", "city": "Ankara", "country": "Türkiye"},
    {"companyName": "Orallar Zirai Ürünler Üretim Paz. San. ve Tic A.Ş.", "companyCode": "Orallar Zirai", "address": "Serifali Mahallesi Miras Sokak No:29 Ümraniye", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Önal Yem San. ve Tic. A.Ş.", "companyCode": "Önal Yem", "address": "Güllüce Mahallesi Güllüce Sokak No:495 16500, Mustafakemalpaşa", "city": "Bursa", "country": "Türkiye"},
    {"companyName": "Özçağ Freeport Ltd", "companyCode": "Özçağ Freeport", "address": "Organize Sanayi Bölgesi 3. Sokak No:6 Mersin 10", "city": "Mersin", "country": "Türkiye"},
    {"companyName": "Paxton Trading DMCC", "companyCode": "Paxton Trading", "address": "Unit No:4509, DMCC Business Centre Level No:1 Jewellery and Gemplex 3", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Pro Yem Sanayi ve Tic. A.Ş.", "companyCode": "Pro Yem", "address": "Tavşanlı Mahallesi Bandırma Yolu Caddesi No:43/A 16700, Karacabey", "city": "Bursa", "country": "Türkiye"},
    {"companyName": "Promaksgrain Endüstri Tarım Ürünleri ve Gıda San. Tic. A.Ş.", "companyCode": "Promaksgrain", "address": "Turgut Özal Bulvarı, Sarma Sok. No:4 Daire:3, 06070 Altındağ", "city": "Ankara", "country": "Türkiye"},
    {"companyName": "Quadra Commodities SA", "companyCode": "Quadra Comm.", "address": "Rue Albert Gos 10, 1206", "city": "Geneva", "country": "Switzerland"},
    {"companyName": "Samancı Gıda Tarım ve Hayvancılık Ürünleri San. ve Tic. Ltd. Şti.", "companyCode": "Samancı Gıda", "address": "Alaşar Mahallesi, Akarsu Sokak, No:52, 16250, Osmangazi", "city": "Bursa", "country": "Türkiye"},
    {"companyName": "Samsun Tarsam Tarım Ürünleri San. ve Tic. A.Ş.", "companyCode": "Samsun Tarsam", "address": "Kılıcdede Mah. Ülkem Sok. Borkonut Niş Plaza A Blok No:8 Kat:5 D:48, Ilkadım", "city": "Samsun", "country": "Türkiye"},
    {"companyName": "Sayer Gıda İç ve Dış Tic. A.Ş.", "companyCode": "Sayer Gıda", "address": "Kazımdirik Mahallesi 296 Sokak No:8 Folkart Time 1. Blok Kat:2/205, Bornova", "city": "İzmir", "country": "Türkiye"},
    {"companyName": "Seçer Tarım Gıda Yağ San. ve Tic. A.Ş.", "companyCode": "Seçer Tarım", "address": "Beydeğirmeni Mah. Kasim Gulek Bulv. No:4 Tarsus", "city": "Mersin", "country": "Türkiye"},
    {"companyName": "Seyf Tarım Gıda Hayvancılık İth. İhr. San. ve Tic. Ltd. Şti.", "companyCode": "Seyf Tarım", "address": "Orta Mahallesi Kavaklar Caddesi No:15/103, Adapazarı", "city": "Sakarya", "country": "Türkiye"},
    {"companyName": "Sibirya Agro Trading LLC", "companyCode": "Sibirya Agro", "address": "Office F20, Ahmed Building, Hor Al Naz", "city": "Dubai", "country": "United Arab Emirates"},
    {"companyName": "Soylu Yem Tarım San. Tic. A.Ş.", "companyCode": "Soylu Yem", "address": "İstiklal Kurtpınar OSB Mah. Atatürk Cad. No:7/1 Muratlı", "city": "Tekirdağ", "country": "Türkiye"},
    {"companyName": "Synapse Grain Service Ltd.", "companyCode": "Synapse Grain", "address": "Yeşilköy Mah. Atatürk Cad. Dünya Ticaret Merkezi No:10 İç Kapı No:425 Bakırköy", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Tarfaş Tarımsal Faaliyetler Üretim San. ve Tic. A.Ş.", "companyCode": "Tarfaş Tarımsal", "address": "Uluabat Mahallesi 16700, Karacabey", "city": "Bursa", "country": "Türkiye"},
    {"companyName": "Tarımex İç ve Dış Ticaret A.Ş.", "companyCode": "Tarımex", "address": "Organize Sanayi Bölgesi 11. Cad. No:27, Merkez", "city": "Çorum", "country": "Türkiye"},
    {"companyName": "Team Agro Gıda San. ve Tic. A.Ş.", "companyCode": "Team Agro", "address": "Marmara Mahallesi Sadakat Sokak No:3 34524, Beylikdüzü", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Tekkelioğlu Yumurta Gıda San. Tic. Ltd. Şti.", "companyCode": "Tekkelioğlu Yumurta", "address": "Mücahitler Mahallesi 52083 Nolu Sokak No:42 Yasem İş Merkezi Kat:2 No:206, 27090 Şehitkamil", "city": "Gaziantep", "country": "Türkiye"},
    {"companyName": "Tiryaki Tahıl ve Yem Tic. A.Ş.", "companyCode": "Tiryaki Tahıl", "address": "Başpınar (Organize) OSB 3. Bölge 83313 Nolu Cadde No:6 Şehitkamil", "city": "Gaziantep", "country": "Türkiye"},
    {"companyName": "Toprak Tarım Hay. Gıda İlet. Nak. Paz. San. Tic. Ltd. Şti.", "companyCode": "Toprak Tarım", "address": "Fetih Mahallesi Şeyh Ulema Caddesi No:204 Karatay", "city": "Konya", "country": "Türkiye"},
    {"companyName": "Torunlar Gıda San. ve Tic. AŞ", "companyCode": "Torunlar Gıda", "address": "Kavacık Rüzgarlı Bahçe Mah. Özalp Çıkmazı No:4, Beykoz", "city": "İstanbul", "country": "Türkiye"},
    {"companyName": "Ulaş Gıda Un Tekstil Nakliye Tic. ve San. A.Ş.", "companyCode": "Ulaş Gıda", "address": "Eski İstanbul Caddesi Büyükkarıştıran 39780, Lüleburgaz", "city": "Kırklareli", "country": "Türkiye"},
    {"companyName": "Ünkan Tarım Nak. Gıda Oto. Paz. San. Tic. Ltd. Şti.", "companyCode": "Ünkan Tarım", "address": "Fevzi Çakmak Mahallesi, 10521. Sokak No:9, Karatay", "city": "Konya", "country": "Türkiye"},
    {"companyName": "Vamos Tarım San. ve Tic. A.Ş.", "companyCode": "Vamos Tarım", "address": "Mansuroğlu Mah. 288/4 Sok. No:9/1 İç Kapı:85 Bayraklı", "city": "İzmir", "country": "Türkiye"},
    {"companyName": "Viterra B.V.", "companyCode": "Viterra B.V.", "address": "Blaak 31 3011 GA", "city": "Rotterdam", "country": "Netherlands"},
    {"companyName": "Vivalon AG", "companyCode": "Vivalon AG", "address": "General Guisan Strasse 6, 6300", "city": "Zug", "country": "Switzerland"},
    {"companyName": "VTC Tarım Ürünleri Gıda San. ve Tic. Ltd Şti.", "companyCode": "VTC Tarım", "address": "Kuruköprü Mahallesi M. Sefa Özler Caddesi Arpacı Apartmanı Kat:2 İç Kapı No:5 01060, Seyhan", "city": "Adana", "country": "Türkiye"},
    {"companyName": "Yadex International GmbH", "companyCode": "Yadex Intl.", "address": "Mainzer Landstraße 69/71, 60329 Frankfurt am Main", "city": "Frankfurt", "country": "Germany"},
    {"companyName": "Yayla Agro Gıda San. ve Tic. A.Ş.", "companyCode": "Yayla Agro", "address": "Saray Mahallesi Fatih Sultan Mehmet Bulvarı No:327, 06980, Kazan", "city": "Ankara", "country": "Türkiye"},
    {"companyName": "Yüksel Tezcan Gıda San. ve Tic. A.Ş.", "companyCode": "Yüksel Tezcan", "address": "Sanayi Caddesi No:23, Bornova", "city": "İzmir", "country": "Türkiye"},
    {"companyName": "Zennunlar Gıda Tarım Hayv. Paz. San. ve Tic. A.Ş.", "companyCode": "Zennunlar Gıda", "address": "Köyün Kendisi Köy Sokağı Kurnaz Köyü No:87, Suluova", "city": "Amasya", "country": "Türkiye"},
]

def seed_buyers():
    inserted = 0
    skipped = 0
    for b in BUYERS:
        existing = partners_col.find_one({"companyName": b["companyName"]})
        if existing:
            skipped += 1
            continue
        doc = {
            "companyName": b["companyName"],
            "companyCode": b["companyCode"],
            "contactPerson": "",
            "address": b["address"],
            "city": b["city"],
            "country": b["country"],
            "email": "",
            "phone": "",
            "whatsapp": "",
            "type": "buyer",
            "tradeContacts": [],
            "executionContacts": [],
            "departments": [],
            "notes": "",
            "createdAt": datetime.utcnow(),
            "updatedAt": datetime.utcnow(),
        }
        partners_col.insert_one(doc)
        inserted += 1
    print(f"Seed complete: {inserted} buyers inserted, {skipped} skipped (already existed)")
    print(f"Total partners in DB: {partners_col.count_documents({})}")
    print(f"Total buyers in DB: {partners_col.count_documents({'type': 'buyer'})}")

if __name__ == "__main__":
    seed_buyers()
